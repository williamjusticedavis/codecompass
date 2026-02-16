import { pgTable, uuid, varchar, jsonb, integer, timestamp } from 'drizzle-orm/pg-core';
import { projects } from './projects';

export const analyses = pgTable('analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  analysisType: varchar('analysis_type', { length: 100 }).notNull(), // 'overview', 'architecture', 'dependencies', 'onboarding'
  result: jsonb('result').notNull(),
  tokensUsed: integer('tokens_used'),
  processingTimeMs: integer('processing_time_ms'),
  version: integer('version').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'),
});

export type Analysis = typeof analyses.$inferSelect;
export type NewAnalysis = typeof analyses.$inferInsert;
