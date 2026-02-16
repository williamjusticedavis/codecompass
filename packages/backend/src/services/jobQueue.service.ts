import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type JobType = 'analyze_repository' | 'generate_embeddings';

export interface Job {
  id: string;
  type: JobType;
  projectId: string;
  status: JobStatus;
  progress: number; // 0-100
  data?: any;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

type JobHandler = (job: Job) => Promise<void>;

/**
 * Simple in-memory job queue
 * For MVP - will be replaced with Bull/Redis in production
 */
export class JobQueueService extends EventEmitter {
  private jobs: Map<string, Job> = new Map();
  private handlers: Map<JobType, JobHandler> = new Map();
  private processing: boolean = false;
  private readonly maxConcurrentJobs = 2;
  private activeJobs: number = 0;

  constructor() {
    super();
  }

  /**
   * Register a job handler
   */
  registerHandler(type: JobType, handler: JobHandler): void {
    this.handlers.set(type, handler);
    logger.info('Job handler registered', { type });
  }

  /**
   * Add a job to the queue
   */
  addJob(job: Omit<Job, 'id' | 'status' | 'progress' | 'createdAt'>): string {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const newJob: Job = {
      ...job,
      id: jobId,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
    };

    this.jobs.set(jobId, newJob);
    logger.info('Job added to queue', { jobId, type: job.type, projectId: job.projectId });

    this.emit('job:added', newJob);

    // Start processing if not already processing
    if (!this.processing) {
      this.processQueue();
    }

    return jobId;
  }

  /**
   * Get job status
   */
  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs for a project
   */
  getProjectJobs(projectId: string): Job[] {
    return Array.from(this.jobs.values()).filter((job) => job.projectId === projectId);
  }

  /**
   * Update job progress
   */
  updateJobProgress(jobId: string, progress: number, data?: any): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.progress = Math.min(100, Math.max(0, progress));
    if (data) {
      job.data = { ...job.data, ...data };
    }

    this.emit('job:progress', job);
  }

  /**
   * Mark job as completed
   */
  private completeJob(jobId: string, error?: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = error ? 'failed' : 'completed';
    job.progress = error ? job.progress : 100;
    job.completedAt = new Date();
    if (error) {
      job.error = error;
    }

    this.emit(error ? 'job:failed' : 'job:completed', job);
    logger.info(`Job ${error ? 'failed' : 'completed'}`, {
      jobId,
      type: job.type,
      duration: job.completedAt.getTime() - job.createdAt.getTime(),
    });
  }

  /**
   * Process the job queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;

    this.processing = true;

    while (true) {
      // Wait for available slots
      while (this.activeJobs >= this.maxConcurrentJobs) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Find next pending job
      const pendingJob = Array.from(this.jobs.values()).find((job) => job.status === 'pending');

      if (!pendingJob) {
        // No more pending jobs
        break;
      }

      // Process job (don't await - let it run in parallel)
      this.processJob(pendingJob).catch((error) => {
        logger.error('Job processing error', { jobId: pendingJob.id, error });
      });
    }

    this.processing = false;
  }

  /**
   * Process a single job
   */
  private async processJob(job: Job): Promise<void> {
    this.activeJobs++;

    try {
      const handler = this.handlers.get(job.type);
      if (!handler) {
        throw new Error(`No handler registered for job type: ${job.type}`);
      }

      logger.info('Processing job', { jobId: job.id, type: job.type });

      job.status = 'processing';
      job.startedAt = new Date();
      this.emit('job:started', job);

      await handler(job);

      this.completeJob(job.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Job failed', { jobId: job.id, error: errorMessage });
      this.completeJob(job.id, errorMessage);
    } finally {
      this.activeJobs--;
    }
  }

  /**
   * Cancel a job
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'pending') {
      return false;
    }

    job.status = 'failed';
    job.error = 'Cancelled by user';
    job.completedAt = new Date();

    this.emit('job:cancelled', job);
    logger.info('Job cancelled', { jobId });

    return true;
  }

  /**
   * Clear completed jobs (cleanup)
   */
  clearCompletedJobs(olderThan: number = 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let cleared = 0;

    for (const [jobId, job] of this.jobs.entries()) {
      if (
        (job.status === 'completed' || job.status === 'failed') &&
        job.completedAt &&
        now - job.completedAt.getTime() > olderThan
      ) {
        this.jobs.delete(jobId);
        cleared++;
      }
    }

    if (cleared > 0) {
      logger.info('Cleared completed jobs', { count: cleared });
    }

    return cleared;
  }

  /**
   * Get queue stats
   */
  getStats() {
    const jobs = Array.from(this.jobs.values());

    return {
      total: jobs.length,
      pending: jobs.filter((j) => j.status === 'pending').length,
      processing: jobs.filter((j) => j.status === 'processing').length,
      completed: jobs.filter((j) => j.status === 'completed').length,
      failed: jobs.filter((j) => j.status === 'failed').length,
      activeJobs: this.activeJobs,
    };
  }
}

// Singleton instance
export const jobQueue = new JobQueueService();

// Auto-cleanup every hour
setInterval(
  () => {
    jobQueue.clearCompletedJobs();
  },
  60 * 60 * 1000
);
