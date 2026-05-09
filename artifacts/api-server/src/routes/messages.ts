import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { messagesTable, messageReactionsTable, messageRepliesTable, usersTable } from "@workspace/db/schema";
import { eq, and, desc, sql, gte, lte, inArray, or, isNull } from "drizzle-orm";
import { requireAuth } from "./users";
import { createNotification } from "../lib/notify";

const router: IRouter = Router();

// Haversine distance (meters)
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Bounding box helper — prefilter rows in SQL before Haversine
function latLngBounds(lat: number, lng: number, radiusMeters: number) {
  const latDelta = radiusMeters / 111_320;
  const lngDelta = radiusMeters / (111_320 * Math.cos((lat * Math.PI) / 180));
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}

// GET /messages/nearby?lat=&lng=&radius= (default 300m)
router.get("/messages/nearby", requireAuth, async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  const radius = Math.min(parseFloat(req.query.radius as string) || 300, 2000);

  if (isNaN(lat) || isNaN(lng)) {
    res.status(400).json({ error: "lat and lng required" });
    return;
  }

  const now = new Date();
  const bounds = latLngBounds(lat, lng, radius);

  // Step 1: SQL bounding-box pre-filter + non-expired, joined with user
  const candidates = await db
    .select({
      message: messagesTable,
      user: {
        id: usersTable.id,
        displayName: usersTable.displayName,
        title: usersTable.title,
        avatarUrl: usersTable.avatarUrl,
        bannerColor: usersTable.bannerColor,
      },
    })
    .from(messagesTable)
    .leftJoin(usersTable, eq(messagesTable.userId, usersTable.id))
    .where(
      and(
        gte(messagesTable.lat, bounds.minLat),
        lte(messagesTable.lat, bounds.maxLat),
        gte(messagesTable.lng, bounds.minLng),
        lte(messagesTable.lng, bounds.maxLng),
        or(isNull(messagesTable.expiresAt), gte(messagesTable.expiresAt, now))
      )
    )
    .orderBy(desc(messagesTable.createdAt))
    .limit(100);

  // Step 2: Precise Haversine filter on the small candidate set
  const filtered = candidates.filter(
    (row) => haversine(lat, lng, row.message.lat, row.message.lng) <= radius
  );

  if (filtered.length === 0) {
    res.json([]);
    return;
  }

  // Step 3: Batch fetch reactions + reply counts (2 queries instead of 2N)
  const msgIds = filtered.map((r) => r.message.id);

  const [allReactions, replyCounts] = await Promise.all([
    db.select().from(messageReactionsTable).where(inArray(messageReactionsTable.messageId, msgIds)),
    db
      .select({
        messageId: messageRepliesTable.messageId,
        count: sql<number>`count(*)::int`,
      })
      .from(messageRepliesTable)
      .where(inArray(messageRepliesTable.messageId, msgIds))
      .groupBy(messageRepliesTable.messageId),
  ]);

  const reactionsMap = new Map<number, typeof allReactions>();
  for (const r of allReactions) {
    const arr = reactionsMap.get(r.messageId) || [];
    arr.push(r);
    reactionsMap.set(r.messageId, arr);
  }
  const replyCountMap = new Map(replyCounts.map((r) => [r.messageId, r.count]));

  const enriched = filtered.map((row) => ({
    ...row.message,
    author: row.user,
    reactions: reactionsMap.get(row.message.id) || [],
    replyCount: replyCountMap.get(row.message.id) || 0,
  }));

  res.json(enriched);
});

// POST /messages
router.post("/messages", requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { lat, lng, content, type, invitationType, maxParticipants, expiresInMinutes } = req.body;

  if (!lat || !lng || !content) {
    res.status(400).json({ error: "lat, lng, content required" });
    return;
  }

  const expiresAt = expiresInMinutes
    ? new Date(Date.now() + expiresInMinutes * 60 * 1000)
    : new Date(Date.now() + 4 * 60 * 60 * 1000); // default 4h

  const created = await db
    .insert(messagesTable)
    .values({
      userId: user.id,
      lat,
      lng,
      content,
      type: type || "regular",
      invitationType: invitationType || null,
      maxParticipants: maxParticipants || null,
      expiresAt,
    })
    .returning();

  res.status(201).json(created[0]);
});

// DELETE /messages/:id
router.delete("/messages/:id", requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const msgId = parseInt(req.params.id as string);

  const msg = await db.select().from(messagesTable).where(eq(messagesTable.id, msgId)).limit(1);
  if (!msg.length) { res.status(404).json({ error: "Not found" }); return; }
  if (msg[0].userId !== user.id) { res.status(403).json({ error: "Forbidden" }); return; }

  await db.delete(messagesTable).where(eq(messagesTable.id, msgId));
  res.json({ ok: true });
});

// POST /messages/:id/react
router.post("/messages/:id/react", requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const msgId = parseInt(req.params.id as string);
  const { type, emoji } = req.body;

  if (!["yes", "no", "emoji"].includes(type)) {
    res.status(400).json({ error: "type must be yes, no, or emoji" });
    return;
  }

  // Remove existing reaction from same user
  await db
    .delete(messageReactionsTable)
    .where(and(eq(messageReactionsTable.messageId, msgId), eq(messageReactionsTable.userId, user.id)));

  const created = await db
    .insert(messageReactionsTable)
    .values({ messageId: msgId, userId: user.id, type, emoji: emoji || null })
    .returning();

  const msg = await db.select().from(messagesTable).where(eq(messagesTable.id, msgId)).limit(1);
  if (msg.length && msg[0].userId !== user.id) {
    const reactor = await db.select({ displayName: usersTable.displayName }).from(usersTable).where(eq(usersTable.id, user.id)).limit(1);
    const name = reactor[0]?.displayName || "Someone";
    const reactionEmoji = type === "yes" ? "👍" : type === "no" ? "👎" : (emoji || "😀");
    createNotification(msg[0].userId, "reaction", `${name} reacted ${reactionEmoji} to your message`, msgId, "message");
  }

  res.json(created[0]);
});

// GET /messages/:id/replies
router.get("/messages/:id/replies", requireAuth, async (req: Request, res: Response) => {
  const msgId = parseInt(req.params.id as string);
  const replies = await db
    .select({
      reply: messageRepliesTable,
      user: {
        id: usersTable.id,
        displayName: usersTable.displayName,
        avatarUrl: usersTable.avatarUrl,
      },
    })
    .from(messageRepliesTable)
    .leftJoin(usersTable, eq(messageRepliesTable.userId, usersTable.id))
    .where(eq(messageRepliesTable.messageId, msgId))
    .orderBy(messageRepliesTable.createdAt);

  res.json(replies.map((r) => ({ ...r.reply, author: r.user })));
});

// POST /messages/:id/replies
router.post("/messages/:id/replies", requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const msgId = parseInt(req.params.id as string);
  const { content } = req.body;

  if (!content) { res.status(400).json({ error: "content required" }); return; }

  const created = await db
    .insert(messageRepliesTable)
    .values({ messageId: msgId, userId: user.id, content })
    .returning();

  const msg = await db.select().from(messagesTable).where(eq(messagesTable.id, msgId)).limit(1);
  if (msg.length && msg[0].userId !== user.id) {
    const replier = await db.select({ displayName: usersTable.displayName }).from(usersTable).where(eq(usersTable.id, user.id)).limit(1);
    const name = replier[0]?.displayName || "Someone";
    createNotification(msg[0].userId, "reply", `${name} replied to your message`, msgId, "message");
  }

  res.status(201).json(created[0]);
});

export default router;
