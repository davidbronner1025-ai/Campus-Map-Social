import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Pool sized for ~100 concurrent users behind a single API instance.
// Postgres on Neon/Replit defaults to 100 max_connections; keep below that.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  allowExitOnIdle: false,
});

pool.on("error", (err) => {
  // A pooled client errored unexpectedly. Log it; pool will replace the client.
  console.error("[db pool] unexpected client error", err);
});

export const db = drizzle(pool, { schema });

export * from "./schema";
