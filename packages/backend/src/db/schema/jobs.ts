import { pgTable, uuid, varchar, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { projects } from './projects';

export const analysisJobs = pgTable('analysis_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  jobType: varchar('job_type', { length: 100 }).notNull(), // 'full_analysis', 'embeddings', 'dependencies'
  status: varchar('status', { length: 50 }).default('queued').notNull(), // queued, processing, completed, failed
  priority: integer('priority').default(0),
  progress: integer('progress').default(0), // 0-100
  errorMessage: text('error_message'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type AnalysisJob = typeof analysisJobs.$inferSelect;
export type NewAnalysisJob = typeof analysisJobs.$inferInsert;
