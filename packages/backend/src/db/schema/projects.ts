import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  bigint,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  sourceType: varchar('source_type', { length: 50 }).notNull(), // 'github' or 'upload'
  githubUrl: text('github_url'),
  githubBranch: varchar('github_branch', { length: 255 }).default('main'),
  storagePath: text('storage_path'), // Optional - set during processing
  status: varchar('status', { length: 50 }).default('pending').notNull(), // pending, processing, completed, failed
  totalFiles: integer('total_files').default(0),
  totalLines: integer('total_lines').default(0),
  totalSize: bigint('total_size', { mode: 'number' }), // Total size in bytes
  primaryLanguage: varchar('primary_language', { length: 100 }),
  languages: jsonb('languages'), // { typescript: 45, javascript: 30, python: 25 }
  errorMessage: text('error_message'), // Error message if status is failed
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastAnalyzedAt: timestamp('last_analyzed_at'),
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
