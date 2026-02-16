import { Request, Response } from 'express';
import { z } from 'zod';
import { repositoryService } from '../services/repository.service';
import { uploadService } from '../services/upload.service';
import { jobQueue } from '../services/jobQueue.service';
import { logger } from '../utils/logger';

// Validation schemas
const createGitHubProjectSchema = z.object({
  url: z.string().url('Invalid GitHub URL'),
  branch: z.string().optional(),
});

const createUploadProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Project name too long'),
});

export class ProjectsController {
  /**
   * Create a project from GitHub URL
   */
  async createGitHubProject(req: Request, res: Response) {
    try {
      const validation = createGitHubProjectSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.error.errors,
        });
      }

      const { url, branch } = validation.data;
      const userId = req.user!.userId;

      const result = await repositoryService.createGitHubProject({
        userId,
        url,
        branch,
      });

      res.status(201).json({
        success: true,
        project: result.project,
        jobId: result.jobId,
      });
    } catch (error) {
      logger.error('Failed to create GitHub project', { error });
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create project',
      });
    }
  }

  /**
   * Create a project from uploaded zip file
   */
  async createUploadProject(req: Request, res: Response) {
    try {
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
      }

      // Validate file type
      if (!uploadService.validateZipFile(req.file.originalname, req.file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid file type. Only .zip files are allowed',
        });
      }

      const validation = createUploadProjectSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.error.errors,
        });
      }

      const { name } = validation.data;
      const userId = req.user!.userId;

      const result = await repositoryService.createUploadProject({
        userId,
        name,
        zipFilePath: req.file.path,
      });

      res.status(201).json({
        success: true,
        project: result.project,
        jobId: result.jobId,
      });
    } catch (error) {
      logger.error('Failed to create upload project', { error });
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create project',
      });
    }
  }

  /**
   * Get all projects for the authenticated user
   */
  async getProjects(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const projects = await repositoryService.getUserProjects(userId);

      res.json({
        success: true,
        projects,
      });
    } catch (error) {
      logger.error('Failed to get projects', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve projects',
      });
    }
  }

  /**
   * Get a single project by ID
   */
  async getProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const project = await repositoryService.getProject(id);

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found',
        });
      }

      // Check ownership
      if (project.userId !== req.user!.userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      res.json({
        success: true,
        project,
      });
    } catch (error) {
      logger.error('Failed to get project', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve project',
      });
    }
  }

  /**
   * Delete a project
   */
  async deleteProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const project = await repositoryService.getProject(id);

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found',
        });
      }

      // Check ownership
      if (project.userId !== req.user!.userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      await repositoryService.deleteProject(id);

      res.json({
        success: true,
        message: 'Project deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete project', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to delete project',
      });
    }
  }

  /**
   * Get project analysis status
   */
  async getProjectStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const project = await repositoryService.getProject(id);

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found',
        });
      }

      // Check ownership
      if (project.userId !== req.user!.userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      // Get job status
      const jobs = jobQueue.getProjectJobs(id);
      const activeJob = jobs.find((j) => j.status === 'processing' || j.status === 'pending');

      res.json({
        success: true,
        project: {
          id: project.id,
          name: project.name,
          status: project.status,
          errorMessage: project.errorMessage,
        },
        job: activeJob || null,
      });
    } catch (error) {
      logger.error('Failed to get project status', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve project status',
      });
    }
  }
}

export const projectsController = new ProjectsController();
