import { Router, type IRouter, type Request, type Response } from "express";
import type { AuthedRequest } from "../middleware/auth";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db/schema";
import { eq, and, desc, sql, lt } from "drizzle-orm";
import { requireAuth } from "./users";

const router: IRouter = Router();

function parseId(val: string): number | null {
  const n = parseInt(val, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

router.get("/notifications", requireAuth, async (req: Request, res: Response) => {
  const user = (req as unknown as AuthedRequest).user as { id: number };
  const limitRaw = parseInt(req.query.limit as string, 10);
  const limit = Math.min(Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 30, 100);
  const beforeRaw = req.query.before ? parseInt(req.query.before as string, 10) : undefined;
  const beforeId = beforeRaw && Number.isFinite(beforeRaw) && beforeRaw > 0 ? beforeRaw : undefined;

  const where = beforeId
    ? and(eq(notificationsTable.userId, user.id), lt(notificationsTable.id, beforeId))
    : eq(notificationsTable.userId, user.id);

  const notifs = await db
    .select()
    .from(notificationsTable)
    .where(where)
    .orderBy(desc(notificationsTable.id))
    .limit(limit);

  const unreadCountResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notificationsTable)
    .where(and(eq(notificationsTable.userId, user.id), eq(notificationsTable.read, false)));

  res.json({
    notifications: notifs,
    unreadCount: unreadCountResult[0]?.count || 0,
  });
});

router.put("/notifications/:id/read", requireAuth, async (req: Request, res: Response) => {
  const user = (req as unknown as AuthedRequest).user as { id: number };
  const notifId = parseId(req.params.id as string);
  if (!notifId) { res.status(400).json({ error: "Invalid notification id" }); return; }

  await db
    .update(notificationsTable)
    .set({ read: true })
    .where(and(eq(notificationsTable.id, notifId), eq(notificationsTable.userId, user.id)));

  res.json({ ok: true });
});

router.put("/notifications/read-all", requireAuth, async (req: Request, res: Response) => {
  const user = (req as unknown as AuthedRequest).user as { id: number };

  await db
    .update(notificationsTable)
    .set({ read: true })
    .where(and(eq(notificationsTable.userId, user.id), eq(notificationsTable.read, false)));

  res.json({ ok: true });
});

export default router;
