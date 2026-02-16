import { db } from '../db';
import { projects, files } from '../db/schema';
import { eq } from 'drizzle-orm';
import { githubService } from './github.service';
import { uploadService } from './upload.service';
import { fileDiscoveryService } from './fileDiscovery.service';
import { jobQueue, type Job } from './jobQueue.service';
import { logger } from '../utils/logger';

export interface CreateGitHubProjectInput {
  userId: string;
  url: string;
  branch?: string;
}

export interface CreateUploadProjectInput {
  userId: string;
  name: string;
  zipFilePath: string;
}

export class RepositoryService {
  constructor() {
    // Register job handler for repository analysis
    jobQueue.registerHandler('analyze_repository', this.handleAnalyzeJob.bind(this));
  }

  /**
   * Create a project from a GitHub repository
   */
  async createGitHubProject(input: CreateGitHubProjectInput) {
    const { userId, url, branch } = input;

    try {
      // Parse and validate GitHub URL
      const repoInfo = githubService.parseGitHubUrl(url);

      logger.info('Creating GitHub project', { userId, repoInfo });

      // Validate repository is accessible
      const isValid = await githubService.validateRepository(url);
      if (!isValid) {
        throw new Error('Repository is not accessible. Please check the URL and permissions.');
      }

      // Get default branch if not specified
      const targetBranch = branch || (await githubService.getDefaultBranch(url));

      // Create project record
      const [project] = await db
        .insert(projects)
        .values({
          userId,
          name: repoInfo.name,
          sourceType: 'github',
          githubUrl: url,
          githubBranch: targetBranch,
          status: 'pending',
        })
        .returning();

      logger.info('Project created', { projectId: project.id, name: project.name });

      // Add analysis job to queue
      const jobId = jobQueue.addJob({
        type: 'analyze_repository',
        projectId: project.id,
        data: {
          sourceType: 'github',
          url,
          branch: targetBranch,
        },
      });

      return {
        project,
        jobId,
      };
    } catch (error) {
      logger.error('Failed to create GitHub project', { url, error });
      throw error;
    }
  }

  /**
   * Create a project from an uploaded zip file
   */
  async createUploadProject(input: CreateUploadProjectInput) {
    const { userId, name, zipFilePath } = input;

    try {
      logger.info('Creating upload project', { userId, name });

      // Create project record
      const [project] = await db
        .insert(projects)
        .values({
          userId,
          name,
          sourceType: 'upload',
          status: 'pending',
        })
        .returning();

      logger.info('Project created', { projectId: project.id, name: project.name });

      // Add analysis job to queue
      const jobId = jobQueue.addJob({
        type: 'analyze_repository',
        projectId: project.id,
        data: {
          sourceType: 'upload',
          zipFilePath,
        },
      });

      return {
        project,
        jobId,
      };
    } catch (error) {
      logger.error('Failed to create upload project', { name, error });
      throw error;
    }
  }

  /**
   * Handle repository analysis job
   */
  private async handleAnalyzeJob(job: Job): Promise<void> {
    const { projectId, data } = job;

    try {
      // Update project status
      await db.update(projects).set({ status: 'processing' }).where(eq(projects.id, projectId));

      jobQueue.updateJobProgress(job.id, 10);

      let projectPath: string;

      // Step 1: Get repository files (clone or extract)
      if (data.sourceType === 'github') {
        logger.info('Cloning GitHub repository', { projectId, url: data.url });

        projectPath = await githubService.cloneRepository({
          url: data.url,
          branch: data.branch,
          destinationPath: projectId,
        });

        logger.info('Repository cloned', { projectId, path: projectPath });
      } else {
        logger.info('Extracting uploaded zip', { projectId });

        projectPath = await uploadService.extractZipFile({
          zipFilePath: data.zipFilePath,
          destinationPath: projectId,
        });

        logger.info('Zip extracted', { projectId, path: projectPath });
      }

      jobQueue.updateJobProgress(job.id, 30);

      // Step 2: Discover files
      logger.info('Discovering files', { projectId });
      const discovery = await fileDiscoveryService.discoverFiles(projectPath);

      logger.info('Files discovered', {
        projectId,
        totalFiles: discovery.stats.totalFiles,
        languages: Object.keys(discovery.stats.languageBreakdown),
      });

      jobQueue.updateJobProgress(job.id, 50);

      // Step 3: Store files in database
      logger.info('Storing files in database', { projectId, count: discovery.files.length });

      const batchSize = 100;
      for (let i = 0; i < discovery.files.length; i += batchSize) {
        const batch = discovery.files.slice(i, i + batchSize);

        // Read content and prepare file records
        const fileRecords = await Promise.all(
          batch.map(async (fileInfo) => {
            try {
              const content = await fileDiscoveryService.readFileContent(fileInfo.path);

              return {
                projectId,
                path: fileInfo.relativePath,
                content,
                language: fileInfo.language,
                size: fileInfo.size,
              };
            } catch (error) {
              logger.warn('Failed to read file content', {
                projectId,
                path: fileInfo.relativePath,
                error,
              });
              return null;
            }
          })
        );

        // Filter out failed reads and insert
        const validRecords = fileRecords.filter((r) => r !== null);
        if (validRecords.length > 0) {
          await db.insert(files).values(validRecords);
        }

        const progress = 50 + Math.floor((i / discovery.files.length) * 40);
        jobQueue.updateJobProgress(job.id, progress);
      }

      // Step 4: Update project with metadata
      const primaryLanguage = fileDiscoveryService.getPrimaryLanguage(
        discovery.stats.languageBreakdown
      );

      await db
        .update(projects)
        .set({
          status: 'completed',
          storagePath: projectPath,
          primaryLanguage,
          totalFiles: discovery.stats.totalFiles,
          totalSize: discovery.stats.totalSize,
          languages: discovery.stats.languageBreakdown,
        })
        .where(eq(projects.id, projectId));

      logger.info('Project analysis completed', {
        projectId,
        totalFiles: discovery.stats.totalFiles,
        primaryLanguage,
      });

      jobQueue.updateJobProgress(job.id, 100);
    } catch (error) {
      logger.error('Repository analysis failed', { projectId, error });

      // Update project status to failed
      await db
        .update(projects)
        .set({
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        })
        .where(eq(projects.id, projectId));

      throw error;
    }
  }

  /**
   * Get project by ID
   */
  async getProject(projectId: string) {
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    return project;
  }

  /**
   * Get user's projects
   */
  async getUserProjects(userId: string) {
    return db.select().from(projects).where(eq(projects.userId, userId));
  }

  /**
   * Delete project
   */
  async deleteProject(projectId: string) {
    try {
      const project = await this.getProject(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      // Delete files from disk
      if (project.storagePath) {
        if (project.sourceType === 'github') {
          await githubService.deleteRepository(projectId);
        } else {
          await uploadService.deleteUpload(projectId);
        }
      }

      // Delete from database (cascade will handle related records)
      await db.delete(projects).where(eq(projects.id, projectId));

      logger.info('Project deleted', { projectId });
    } catch (error) {
      logger.error('Failed to delete project', { projectId, error });
      throw error;
    }
  }
}

export const repositoryService = new RepositoryService();
