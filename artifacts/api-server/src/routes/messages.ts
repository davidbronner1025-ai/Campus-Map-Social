import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { messagesTable, messageReactionsTable, messageRepliesTable, usersTable } from "@workspace/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth } from "./users";
import { createNotification } from "../lib/notify";
import { haversine } from "../lib/utils";

const router: IRouter = Router();

// GET /messages/nearby?lat=&lng=&radius= (default 300m)
router.get("/messages/nearby", requireAuth, async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  const radius = parseFloat(req.query.radius as string) || 300;

  if (isNaN(lat) || isNaN(lng)) {
    res.status(400).json({ error: "lat and lng required" });
    return;
  }

  // Filter expired messages and get all active ones
  const now = new Date();
  const allMessages = await db
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
    .orderBy(desc(messagesTable.createdAt));

  // Filter by radius and expiry in JS (avoids needing PostGIS)
  const filtered = allMessages.filter((row) => {
    if (row.message.expiresAt && row.message.expiresAt < now) return false;
    const dist = haversine(lat, lng, row.message.lat, row.message.lng);
    return dist <= radius;
  });

  // Attach reactions and reply counts
  const enriched = await Promise.all(
    filtered.map(async (row) => {
      const reactions = await db
        .select()
        .from(messageReactionsTable)
        .where(eq(messageReactionsTable.messageId, row.message.id));
      const replyCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(messageRepliesTable)
        .where(eq(messageRepliesTable.messageId, row.message.id));
      return {
        ...row.message,
        author: row.user,
        reactions,
        replyCount: Number(replyCount[0]?.count ?? 0),
      };
    })
  );

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
  const msgId = parseInt(req.params.id);

  const msg = await db.select().from(messagesTable).where(eq(messagesTable.id, msgId)).limit(1);
  if (!msg.length) { res.status(404).json({ error: "Not found" }); return; }
  if (msg[0].userId !== user.id) { res.status(403).json({ error: "Forbidden" }); return; }

  await db.delete(messagesTable).where(eq(messagesTable.id, msgId));
  res.json({ ok: true });
});

// POST /messages/:id/react
router.post("/messages/:id/react", requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const msgId = parseInt(req.params.id);
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
  const msgId = parseInt(req.params.id);
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
  const msgId = parseInt(req.params.id);
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
