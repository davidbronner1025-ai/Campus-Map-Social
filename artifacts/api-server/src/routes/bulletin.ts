import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import {
  bulletinPostsTable,
  bulletinPostLikesTable,
  usersTable,
  campusTable,
  bulletinCategoryEnum,
  type BulletinCategory,
} from "@workspace/db/schema";
import { eq, desc, and, sql, inArray } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

async function getCampusId(): Promise<number | null> {
  const rows = await db.select({ id: campusTable.id }).from(campusTable).limit(1);
  return rows.length ? rows[0].id : null;
}

function isValidCategory(c: unknown): c is BulletinCategory {
  return typeof c === "string" && (bulletinCategoryEnum as readonly string[]).includes(c);
}

const MAX_TEXT_LEN = 1000;
const MAX_TAG_LEN = 40;
const MAX_PRICE_LEN = 40;

// GET /bulletin?category=  — list posts (joined with author)
router.get("/bulletin", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id as number;
    const categoryParam = typeof req.query.category === "string" ? req.query.category : null;
    const limit = Math.min(Number(req.query.limit) || 50, 200);

    const conditions = [];
    if (categoryParam && isValidCategory(categoryParam)) {
      conditions.push(eq(bulletinPostsTable.category, categoryParam));
    }

    const rows = await db
      .select({
        id: bulletinPostsTable.id,
        campusId: bulletinPostsTable.campusId,
        userId: bulletinPostsTable.userId,
        category: bulletinPostsTable.category,
        subType: bulletinPostsTable.subType,
        text: bulletinPostsTable.text,
        price: bulletinPostsTable.price,
        isAnonymous: bulletinPostsTable.isAnonymous,
        likesCount: bulletinPostsTable.likesCount,
        createdAt: bulletinPostsTable.createdAt,
        authorName: usersTable.displayName,
        authorAvatarUrl: usersTable.avatarUrl,
        authorBannerColor: usersTable.bannerColor,
      })
      .from(bulletinPostsTable)
      .leftJoin(usersTable, eq(bulletinPostsTable.userId, usersTable.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(bulletinPostsTable.createdAt))
      .limit(limit);

    // Fetch which posts the current user has liked, in one query
    const ids = rows.map(r => r.id);
    let likedSet = new Set<number>();
    if (ids.length) {
      const likedRows = await db
        .select({ postId: bulletinPostLikesTable.postId })
        .from(bulletinPostLikesTable)
        .where(and(eq(bulletinPostLikesTable.userId, userId), inArray(bulletinPostLikesTable.postId, ids)));
      likedSet = new Set(likedRows.map(r => r.postId));
    }

    const result = rows.map(r => ({
      ...r,
      authorName: r.isAnonymous ? null : r.authorName,
      authorAvatarUrl: r.isAnonymous ? null : r.authorAvatarUrl,
      authorBannerColor: r.isAnonymous ? null : r.authorBannerColor,
      likedByMe: likedSet.has(r.id),
      isMine: r.userId === userId,
    }));

    res.json(result);
  } catch (err) {
    console.error("[bulletin GET]", err);
    res.status(500).json({ error: String(err) });
  }
});

// POST /bulletin — create new post
router.post("/bulletin", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { category, subType, text, price, isAnonymous } = req.body ?? {};

    if (!isValidCategory(category)) {
      res.status(400).json({ error: "Invalid category" });
      return;
    }
    if (typeof text !== "string" || !text.trim()) {
      res.status(400).json({ error: "text is required" });
      return;
    }
    if (text.length > MAX_TEXT_LEN) {
      res.status(400).json({ error: `text too long (max ${MAX_TEXT_LEN})` });
      return;
    }

    let normalizedSubType: string | null = null;
    if (subType != null && subType !== "") {
      if (typeof subType !== "string" || subType.length > MAX_TAG_LEN) {
        res.status(400).json({ error: "Invalid subType" });
        return;
      }
      if (category === "lostfound" && subType !== "lost" && subType !== "found") {
        res.status(400).json({ error: "subType must be 'lost' or 'found' for lostfound" });
        return;
      }
      normalizedSubType = subType;
    } else if (category === "lostfound") {
      res.status(400).json({ error: "subType ('lost' or 'found') required for lostfound" });
      return;
    }

    let normalizedPrice: string | null = null;
    if (price != null && price !== "") {
      if (typeof price !== "string" || price.length > MAX_PRICE_LEN) {
        res.status(400).json({ error: "Invalid price" });
        return;
      }
      if (category !== "market") {
        res.status(400).json({ error: "price only allowed for market" });
        return;
      }
      normalizedPrice = price;
    }

    const campusId = await getCampusId();
    if (campusId == null) {
      res.status(400).json({ error: "No campus configured" });
      return;
    }

    const created = await db.insert(bulletinPostsTable).values({
      campusId,
      userId: user.id,
      category,
      subType: normalizedSubType,
      text: text.trim(),
      price: normalizedPrice,
      isAnonymous: !!isAnonymous,
    }).returning();

    res.status(201).json(created[0]);
  } catch (err) {
    console.error("[bulletin POST]", err);
    res.status(500).json({ error: String(err) });
  }
});

// DELETE /bulletin/:id — delete own post
router.delete("/bulletin/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id as number;
    const id = Number(req.params.id as string);
    if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const found = await db.select().from(bulletinPostsTable).where(eq(bulletinPostsTable.id, id)).limit(1);
    if (!found.length) { res.status(404).json({ error: "Not found" }); return; }
    if (found[0].userId !== userId) { res.status(403).json({ error: "Not your post" }); return; }

    await db.delete(bulletinPostsTable).where(eq(bulletinPostsTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    console.error("[bulletin DELETE]", err);
    res.status(500).json({ error: String(err) });
  }
});

// POST /bulletin/:id/like — toggle like
router.post("/bulletin/:id/like", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id as number;
    const id = Number(req.params.id as string);
    if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const post = await db.select({ id: bulletinPostsTable.id }).from(bulletinPostsTable).where(eq(bulletinPostsTable.id, id)).limit(1);
    if (!post.length) { res.status(404).json({ error: "Not found" }); return; }

    const existing = await db.select().from(bulletinPostLikesTable)
      .where(and(eq(bulletinPostLikesTable.postId, id), eq(bulletinPostLikesTable.userId, userId)))
      .limit(1);

    let liked: boolean;
    if (existing.length) {
      await db.delete(bulletinPostLikesTable)
        .where(and(eq(bulletinPostLikesTable.postId, id), eq(bulletinPostLikesTable.userId, userId)));
      await db.update(bulletinPostsTable)
        .set({ likesCount: sql`GREATEST(${bulletinPostsTable.likesCount} - 1, 0)` })
        .where(eq(bulletinPostsTable.id, id));
      liked = false;
    } else {
      await db.insert(bulletinPostLikesTable).values({ postId: id, userId });
      await db.update(bulletinPostsTable)
        .set({ likesCount: sql`${bulletinPostsTable.likesCount} + 1` })
        .where(eq(bulletinPostsTable.id, id));
      liked = true;
    }

    const updated = await db.select({ likesCount: bulletinPostsTable.likesCount })
      .from(bulletinPostsTable).where(eq(bulletinPostsTable.id, id)).limit(1);

    res.json({ ok: true, liked, likesCount: updated[0]?.likesCount ?? 0 });
  } catch (err) {
    console.error("[bulletin like]", err);
    res.status(500).json({ error: String(err) });
  }
});

export default router;
