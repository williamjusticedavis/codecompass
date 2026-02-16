import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { projects } from './projects';
import { files } from './files';

export const dependencies = pgTable('dependencies', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  sourceFileId: uuid('source_file_id').references(() => files.id, { onDelete: 'cascade' }).notNull(),
  targetFileId: uuid('target_file_id').references(() => files.id, { onDelete: 'cascade' }),
  targetExternal: varchar('target_external', { length: 255 }), // for external deps (npm packages)
  dependencyType: varchar('dependency_type', { length: 50 }), // 'import', 'require', 'extends', 'implements'
  importSpecifier: text('import_specifier'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Dependency = typeof dependencies.$inferSelect;
export type NewDependency = typeof dependencies.$inferInsert;
