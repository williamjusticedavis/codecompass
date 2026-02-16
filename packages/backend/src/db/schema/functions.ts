import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  boolean,
} from 'drizzle-orm/pg-core';
import { projects } from './projects';
import { files } from './files';

export const functions = pgTable('functions', {
  id: uuid('id').primaryKey().defaultRandom(),
  fileId: uuid('file_id')
    .references(() => files.id, { onDelete: 'cascade' })
    .notNull(),
  projectId: uuid('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }), // 'function', 'class', 'component', 'method'
  signature: text('signature'),
  docComment: text('doc_comment'),
  startLine: integer('start_line'),
  endLine: integer('end_line'),
  complexity: integer('complexity'), // cyclomatic complexity
  parameters: jsonb('parameters'),
  returnType: varchar('return_type', { length: 255 }),
  isExported: boolean('is_exported').default(false),
  isAsync: boolean('is_async').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Function = typeof functions.$inferSelect;
export type NewFunction = typeof functions.$inferInsert;
