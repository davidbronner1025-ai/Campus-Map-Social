import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";

const router: IRouter = Router();
const startTime = Date.now();

router.get("/healthz", async (_req, res) => {
  let dbOk = false;
  try {
    await pool.query("SELECT 1");
    dbOk = true;
  } catch {}

  const status = dbOk ? "ok" : "degraded";
  const code = dbOk ? 200 : 503;

  res.status(code).json({
    status,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    db: dbOk ? "connected" : "unreachable",
    pool: {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
    },
  });
});

export default router;
