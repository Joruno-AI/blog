import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  // D1 uses SQLite semantics. Generation is intentionally connection-free;
  // local/remote application is handled by Wrangler so schema generation can
  // never mutate production implicitly.
  dialect: "sqlite",
});
