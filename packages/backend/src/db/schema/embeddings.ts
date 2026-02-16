import { pgTable, uuid, varchar, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { projects } from './projects';

export const embeddings = pgTable('embeddings', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(), // 'file', 'function', 'chunk'
  entityId: uuid('entity_id').notNull(),
  contentPreview: text('content_preview'),
  // Note: Using text for now, will migrate to vector type in Phase 5
  embedding: text('embedding'), // Will store as JSON array for now
  metadata: jsonb('metadata'), // { path, name, language, etc }
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Embedding = typeof embeddings.$inferSelect;
export type NewEmbedding = typeof embeddings.$inferInsert;
