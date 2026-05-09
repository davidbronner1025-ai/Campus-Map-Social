import app from "./app";
import { pool } from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = app.listen(port, () => {
  console.log(`[server] listening on port ${port}`);
  console.log(`[server] DB pool max=${(pool as any).options?.max || 10}`);
});

// ─── Graceful shutdown ─────────────────────────────────────────────────────
async function shutdown(signal: string) {
  console.log(`[server] ${signal} received — shutting down gracefully...`);
  server.close(async () => {
    try {
      await pool.end();
      console.log("[server] DB pool closed");
    } catch (err) {
      console.error("[server] Error closing DB pool:", err);
    }
    process.exit(0);
  });
  // Force exit after 10s if graceful shutdown hangs
  setTimeout(() => {
    console.error("[server] Forced exit after timeout");
    process.exit(1);
  }, 10_000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Prevent silent crashes
process.on("unhandledRejection", (reason) => {
  console.error("[server] Unhandled rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[server] Uncaught exception:", err);
  process.exit(1);
});
