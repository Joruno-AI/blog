import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";

import * as schema from "./schema";

type Database = ReturnType<typeof drizzle<typeof schema>>;

function getDatabase(): Database {
  const { env } = getCloudflareContext();
  if (!env.DB) {
    throw new Error("Cloudflare D1 binding DB is not configured");
  }
  return drizzle(env.DB, { schema });
}

// Resolve the binding lazily. Importing a route during `next build` must not
// access request-scoped Cloudflare context, while every runtime query must use
// the binding associated with the current request.
export const db = new Proxy({} as Database, {
  get(_, prop) {
    const instance = getDatabase();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
