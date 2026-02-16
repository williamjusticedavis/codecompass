import simpleGit, { SimpleGit } from 'simple-git';
import path from 'path';
import fs from 'fs/promises';
import { logger } from '../utils/logger';

export interface CloneOptions {
  url: string;
  branch?: string;
  destinationPath: string;
}

export interface GitHubRepoInfo {
  name: string;
  owner: string;
  url: string;
  branch: string;
}

export class GitHubService {
  private git: SimpleGit;
  private readonly uploadsDir: string;

  constructor() {
    this.git = simpleGit();
    this.uploadsDir = path.join(process.cwd(), 'uploads');
  }

  /**
   * Parse GitHub URL and extract repository information
   */
  parseGitHubUrl(url: string): GitHubRepoInfo {
    try {
      // Support both HTTPS and SSH formats
      // HTTPS: https://github.com/owner/repo.git or https://github.com/owner/repo
      // SSH: git@github.com:owner/repo.git

      let repoPath: string;

      if (url.includes('github.com/')) {
        // HTTPS format
        const match = url.match(/github\.com\/([^/]+)\/([^/]+?)(\.git)?$/);
        if (!match) {
          throw new Error('Invalid GitHub URL format');
        }
        repoPath = `${match[1]}/${match[2]}`;
      } else if (url.includes('git@github.com:')) {
        // SSH format
        const match = url.match(/git@github\.com:([^/]+)\/(.+?)(\.git)?$/);
        if (!match) {
          throw new Error('Invalid GitHub SSH URL format');
        }
        repoPath = `${match[1]}/${match[2]}`;
      } else {
        throw new Error('URL must be a GitHub repository');
      }

      const [owner, name] = repoPath.split('/');

      return {
        name: name.replace('.git', ''),
        owner,
        url,
        branch: 'main', // Default branch, will be updated during clone
      };
    } catch (error) {
      logger.error('Failed to parse GitHub URL', { url, error });
      throw new Error('Invalid GitHub repository URL');
    }
  }

  /**
   * Ensure uploads directory exists
   */
  private async ensureUploadsDir(): Promise<void> {
    try {
      await fs.access(this.uploadsDir);
    } catch {
      logger.info('Creating uploads directory', { path: this.uploadsDir });
      await fs.mkdir(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Clone a GitHub repository
   */
  async cloneRepository(options: CloneOptions): Promise<string> {
    await this.ensureUploadsDir();

    const { url, branch, destinationPath } = options;
    const fullPath = path.join(this.uploadsDir, destinationPath);

    try {
      // Check if directory already exists
      try {
        await fs.access(fullPath);
        logger.warn('Directory already exists, removing', { path: fullPath });
        await fs.rm(fullPath, { recursive: true, force: true });
      } catch {
        // Directory doesn't exist, which is what we want
      }

      logger.info('Cloning repository', { url, branch, destination: fullPath });

      // Clone with depth 1 for faster cloning (shallow clone)
      const cloneOptions = [
        '--depth',
        '1',
        '--single-branch',
        ...(branch ? ['--branch', branch] : []),
      ];

      await this.git.clone(url, fullPath, cloneOptions);

      logger.info('Repository cloned successfully', { path: fullPath });
      return fullPath;
    } catch (error) {
      logger.error('Failed to clone repository', { url, error });

      // Clean up partial clone if it exists
      try {
        await fs.rm(fullPath, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }

      throw new Error(
        `Failed to clone repository: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get the default branch of a remote repository
   */
  async getDefaultBranch(url: string): Promise<string> {
    try {
      const result = await this.git.listRemote(['--symref', url, 'HEAD']);
      const match = result.match(/ref: refs\/heads\/([^\s]+)/);
      return match ? match[1] : 'main';
    } catch (error) {
      logger.error('Failed to get default branch', { url, error });
      return 'main'; // Fallback to main
    }
  }

  /**
   * Validate that a GitHub URL is accessible
   */
  async validateRepository(url: string): Promise<boolean> {
    try {
      await this.git.listRemote([url]);
      return true;
    } catch (error) {
      logger.error('Repository validation failed', { url, error });
      return false;
    }
  }

  /**
   * Delete a cloned repository
   */
  async deleteRepository(projectId: string): Promise<void> {
    const repoPath = path.join(this.uploadsDir, projectId);

    try {
      await fs.rm(repoPath, { recursive: true, force: true });
      logger.info('Repository deleted', { path: repoPath });
    } catch (error) {
      logger.error('Failed to delete repository', { path: repoPath, error });
      throw new Error('Failed to delete repository files');
    }
  }
}

export const githubService = new GitHubService();
