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
  console.log(`Server listening on port ${port}`);
});

// ── Graceful shutdown ──
let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[server] received ${signal}, shutting down gracefully...`);
  // Stop accepting new connections; finish in-flight requests
  server.close((err) => {
    if (err) console.error("[server] http close error", err);
  });
  // Give in-flight requests up to 10s
  const forceTimer = setTimeout(() => {
    console.warn("[server] force exit after timeout");
    process.exit(1);
  }, 10_000);
  forceTimer.unref();
  try {
    await pool.end();
    console.log("[server] db pool closed");
  } catch (e) {
    console.error("[server] db pool close error", e);
  }
  process.exit(0);
}

process.on("SIGTERM", () => { void shutdown("SIGTERM"); });
process.on("SIGINT", () => { void shutdown("SIGINT"); });

process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err);
});
