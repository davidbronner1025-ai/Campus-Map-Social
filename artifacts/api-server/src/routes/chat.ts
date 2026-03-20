import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  conversationsTable, conversationMembersTable, chatMessagesTable, usersTable
} from "@workspace/db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { requireAuth } from "./users";

const router: IRouter = Router();

function parseId(val: string): number | null {
  const n = parseInt(val, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// GET /conversations — list user's conversations with last message + other members
router.get("/conversations", requireAuth, async (req: Request, res: Response) => {
  const user = (req as Record<string, unknown>).user as { id: number };

  const memberships = await db
    .select({ conversationId: conversationMembersTable.conversationId })
    .from(conversationMembersTable)
    .where(eq(conversationMembersTable.userId, user.id));

  if (!memberships.length) {
    res.json([]);
    return;
  }

  const convIds = memberships.map(m => m.conversationId);

  const convs = await db
    .select()
    .from(conversationsTable)
    .where(inArray(conversationsTable.id, convIds))
    .orderBy(desc(conversationsTable.updatedAt));

  const enriched = await Promise.all(
    convs.map(async (conv) => {
      const members = await db
        .select({
          userId: conversationMembersTable.userId,
          displayName: usersTable.displayName,
          avatarUrl: usersTable.avatarUrl,
          bannerColor: usersTable.bannerColor,
        })
        .from(conversationMembersTable)
        .leftJoin(usersTable, eq(conversationMembersTable.userId, usersTable.id))
        .where(eq(conversationMembersTable.conversationId, conv.id));

      const lastMsg = await db
        .select({
          id: chatMessagesTable.id,
          content: chatMessagesTable.content,
          messageType: chatMessagesTable.messageType,
          senderId: chatMessagesTable.senderId,
          createdAt: chatMessagesTable.createdAt,
        })
        .from(chatMessagesTable)
        .where(eq(chatMessagesTable.conversationId, conv.id))
        .orderBy(desc(chatMessagesTable.createdAt))
        .limit(1);

      return {
        ...conv,
        members,
        lastMessage: lastMsg[0] || null,
      };
    })
  );

  res.json(enriched);
});

// POST /conversations — create or find a direct chat, or create a group
router.post("/conversations", requireAuth, async (req: Request, res: Response) => {
  const user = (req as Record<string, unknown>).user as { id: number };
  const { type, name, memberIds } = req.body as {
    type?: "direct" | "group"; name?: string; memberIds?: number[];
  };

  const convType = type || "direct";

  if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
    res.status(400).json({ error: "memberIds required" });
    return;
  }

  if (!memberIds.every(id => typeof id === "number" && Number.isFinite(id) && id > 0)) {
    res.status(400).json({ error: "All memberIds must be positive integers" });
    return;
  }

  if (convType !== "direct" && convType !== "group") {
    res.status(400).json({ error: "type must be 'direct' or 'group'" });
    return;
  }

  const allMembers = Array.from(new Set([user.id, ...memberIds]));

  if (convType === "direct") {
    if (allMembers.length !== 2) {
      res.status(400).json({ error: "Direct chat requires exactly one other user" });
      return;
    }

    const otherId = allMembers.find(id => id !== user.id)!;
    const existing = await db.execute(sql`
      SELECT cm1.conversation_id FROM conversation_members cm1
      JOIN conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
      JOIN conversations c ON c.id = cm1.conversation_id
      WHERE cm1.user_id = ${user.id} AND cm2.user_id = ${otherId} AND c.type = 'direct'
      LIMIT 1
    `);

    if (existing.rows.length > 0) {
      const existingConvId = (existing.rows[0] as { conversation_id: number }).conversation_id;
      const conv = await db.select().from(conversationsTable).where(eq(conversationsTable.id, existingConvId)).limit(1);
      res.json(conv[0]);
      return;
    }
  }

  if (convType === "group" && (!name || !name.trim())) {
    res.status(400).json({ error: "Group name required" });
    return;
  }

  const created = await db
    .insert(conversationsTable)
    .values({
      type: convType,
      name: convType === "group" ? name!.trim() : null,
      creatorId: user.id,
    })
    .returning();

  const conv = created[0];

  await db.insert(conversationMembersTable).values(
    allMembers.map(uid => ({ conversationId: conv.id, userId: uid }))
  );

  res.status(201).json(conv);
});

// GET /conversations/:id/messages?before=&limit=
router.get("/conversations/:id/messages", requireAuth, async (req: Request, res: Response) => {
  const user = (req as Record<string, unknown>).user as { id: number };
  const convId = parseId(req.params.id);
  if (!convId) { res.status(400).json({ error: "Invalid conversation id" }); return; }
  const limitRaw = parseInt(req.query.limit as string, 10);
  const limit = Math.min(Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 50, 100);

  const membership = await db
    .select()
    .from(conversationMembersTable)
    .where(and(
      eq(conversationMembersTable.conversationId, convId),
      eq(conversationMembersTable.userId, user.id)
    ))
    .limit(1);

  if (!membership.length) {
    res.status(403).json({ error: "Not a member" });
    return;
  }

  const beforeRaw = req.query.before ? parseInt(req.query.before as string, 10) : undefined;
  const beforeId = beforeRaw && Number.isFinite(beforeRaw) && beforeRaw > 0 ? beforeRaw : undefined;
  let query = db
    .select({
      id: chatMessagesTable.id,
      conversationId: chatMessagesTable.conversationId,
      senderId: chatMessagesTable.senderId,
      content: chatMessagesTable.content,
      messageType: chatMessagesTable.messageType,
      lat: chatMessagesTable.lat,
      lng: chatMessagesTable.lng,
      createdAt: chatMessagesTable.createdAt,
      senderName: usersTable.displayName,
      senderAvatar: usersTable.avatarUrl,
      senderBannerColor: usersTable.bannerColor,
    })
    .from(chatMessagesTable)
    .leftJoin(usersTable, eq(chatMessagesTable.senderId, usersTable.id))
    .where(
      beforeId
        ? and(eq(chatMessagesTable.conversationId, convId), sql`${chatMessagesTable.id} < ${beforeId}`)
        : eq(chatMessagesTable.conversationId, convId)
    )
    .orderBy(desc(chatMessagesTable.id))
    .limit(limit);

  const messages = await query;
  res.json(messages.reverse());
});

// POST /conversations/:id/messages — send a message
router.post("/conversations/:id/messages", requireAuth, async (req: Request, res: Response) => {
  const user = (req as Record<string, unknown>).user as { id: number };
  const convId = parseId(req.params.id);
  if (!convId) { res.status(400).json({ error: "Invalid conversation id" }); return; }
  const { content, messageType, lat, lng } = req.body as {
    content: string; messageType?: "text" | "location"; lat?: number; lng?: number;
  };

  const membership = await db
    .select()
    .from(conversationMembersTable)
    .where(and(
      eq(conversationMembersTable.conversationId, convId),
      eq(conversationMembersTable.userId, user.id)
    ))
    .limit(1);

  if (!membership.length) {
    res.status(403).json({ error: "Not a member" });
    return;
  }

  if (!content || typeof content !== "string" || !content.trim()) {
    res.status(400).json({ error: "content required" });
    return;
  }

  const msgType = messageType || "text";
  if (msgType === "location" && (lat === undefined || lng === undefined)) {
    res.status(400).json({ error: "lat/lng required for location messages" });
    return;
  }

  const created = await db
    .insert(chatMessagesTable)
    .values({
      conversationId: convId,
      senderId: user.id,
      content: content.trim(),
      messageType: msgType,
      lat: msgType === "location" ? lat : null,
      lng: msgType === "location" ? lng : null,
    })
    .returning();

  await db
    .update(conversationsTable)
    .set({ updatedAt: new Date() })
    .where(eq(conversationsTable.id, convId));

  const msg = created[0];
  const sender = await db.select({
    displayName: usersTable.displayName,
    avatarUrl: usersTable.avatarUrl,
    bannerColor: usersTable.bannerColor,
  }).from(usersTable).where(eq(usersTable.id, user.id)).limit(1);

  res.status(201).json({
    ...msg,
    senderName: sender[0]?.displayName || "",
    senderAvatar: sender[0]?.avatarUrl || null,
    senderBannerColor: sender[0]?.bannerColor || "#1e293b",
  });
});

// POST /conversations/:id/members — add member to group
router.post("/conversations/:id/members", requireAuth, async (req: Request, res: Response) => {
  const user = (req as Record<string, unknown>).user as { id: number };
  const convId = parseId(req.params.id);
  if (!convId) { res.status(400).json({ error: "Invalid conversation id" }); return; }
  const { userId } = req.body as { userId: number };

  const conv = await db.select().from(conversationsTable).where(eq(conversationsTable.id, convId)).limit(1);
  if (!conv.length || conv[0].type !== "group") {
    res.status(400).json({ error: "Can only add members to group chats" });
    return;
  }

  const membership = await db
    .select()
    .from(conversationMembersTable)
    .where(and(eq(conversationMembersTable.conversationId, convId), eq(conversationMembersTable.userId, user.id)))
    .limit(1);

  if (!membership.length) {
    res.status(403).json({ error: "Not a member" });
    return;
  }

  try {
    await db.insert(conversationMembersTable).values({ conversationId: convId, userId });
    res.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof Error && "code" in e && (e as { code: string }).code === "23505") {
      res.json({ ok: true, status: "already_member" });
    } else {
      throw e;
    }
  }
});

// DELETE /conversations/:id/members — leave group
router.delete("/conversations/:id/members", requireAuth, async (req: Request, res: Response) => {
  const user = (req as Record<string, unknown>).user as { id: number };
  const convId = parseId(req.params.id);
  if (!convId) { res.status(400).json({ error: "Invalid conversation id" }); return; }

  await db
    .delete(conversationMembersTable)
    .where(and(
      eq(conversationMembersTable.conversationId, convId),
      eq(conversationMembersTable.userId, user.id)
    ));

  res.json({ ok: true });
});

export default router;
