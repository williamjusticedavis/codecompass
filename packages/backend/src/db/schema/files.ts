import { pgTable, uuid, varchar, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { projects } from './projects';

export const files = pgTable('files', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
  path: text('path').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  extension: varchar('extension', { length: 50 }),
  language: varchar('language', { length: 100 }),
  sizeBytes: integer('size_bytes'),
  lineCount: integer('line_count'),
  content: text('content'),
  contentHash: varchar('content_hash', { length: 64 }),
  astData: jsonb('ast_data'),
  imports: jsonb('imports'), // array of import statements
  exports: jsonb('exports'), // array of export statements
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
