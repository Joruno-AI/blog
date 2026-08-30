import { sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Query-only mapping for the existing FTS5 virtual table. It deliberately
 * lives outside schema.ts so drizzle-kit never tries to replace the virtual
 * table with a regular SQLite table during migration generation.
 */
export const resourceSearchTable = sqliteTable("resource_search", {
  resourceId: text("resource_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  content: text("content").notNull(),
  tokens: text("tokens").notNull(),
});
