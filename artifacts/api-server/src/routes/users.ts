import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable, messagesTable, eventRsvpsTable, issueReportsTable } from "@workspace/db/schema";
import { eq, and, ne, isNotNull, gte, sql } from "drizzle-orm";

const router: IRouter = Router();

// Auth middleware
async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await db.select().from(usersTable).where(eq(usersTable.sessionToken, token)).limit(1);
  if (!user.length) { res.status(401).json({ error: "Invalid token" }); return; }
  (req as any).user = user[0];
  next();
}

// GET /me
router.get("/me", requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { sessionToken, ...safe } = user;
  res.json(safe);
});

// PUT /me
router.put("/me", requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { displayName, title, avatarUrl, bannerUrl, bannerColor, visibility } = req.body;
  const updated = await db
    .update(usersTable)
    .set({
      ...(displayName !== undefined && { displayName }),
      ...(title !== undefined && { title }),
      ...(avatarUrl !== undefined && { avatarUrl }),
      ...(bannerUrl !== undefined && { bannerUrl }),
      ...(bannerColor !== undefined && { bannerColor }),
      ...(visibility !== undefined && ["campus", "ghost"].includes(visibility) && { visibility }),
    })
    .where(eq(usersTable.id, user.id))
    .returning();
  const { sessionToken, ...safe } = updated[0];
  res.json(safe);
});

// PUT /me/location - battery-optimized: accept coarse location
router.put("/me/location", requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { lat, lng } = req.body;
  if (typeof lat !== "number" || typeof lng !== "number") {
    res.status(400).json({ error: "lat and lng required" });
    return;
  }
  await db
    .update(usersTable)
    .set({ lat, lng, lastSeen: new Date() })
    .where(eq(usersTable.id, user.id));
  res.json({ ok: true });
});

// Rate limiter for /users/nearby — per-user sliding window
const nearbyRateMap = new Map<number, number[]>();
const NEARBY_RATE_WINDOW = 60_000;
const NEARBY_RATE_LIMIT = 20;
function checkNearbyRate(userId: number): boolean {
  const now = Date.now();
  const timestamps = (nearbyRateMap.get(userId) || []).filter(t => now - t < NEARBY_RATE_WINDOW);
  if (timestamps.length >= NEARBY_RATE_LIMIT) return false;
  timestamps.push(now);
  nearbyRateMap.set(userId, timestamps);
  return true;
}

// GET /users/nearby — get visible users within radius (Haversine)
router.get("/users/nearby", requireAuth, async (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  if (!checkNearbyRate(currentUser.id)) {
    res.status(429).json({ error: "Too many requests. Try again shortly." });
    return;
  }
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  const radius = Math.min(parseFloat(req.query.radius as string) || 500, 2000);

  if (isNaN(lat) || isNaN(lng)) {
    res.status(400).json({ error: "lat and lng required" });
    return;
  }

  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

  const haversine = sql`(
    6371000 * acos(
      cos(radians(${lat})) * cos(radians(${usersTable.lat})) *
      cos(radians(${usersTable.lng}) - radians(${lng})) +
      sin(radians(${lat})) * sin(radians(${usersTable.lat}))
    )
  )`;

  const rows = await db
    .select({
      id: usersTable.id,
      displayName: usersTable.displayName,
      title: usersTable.title,
      avatarUrl: usersTable.avatarUrl,
      bannerColor: usersTable.bannerColor,
      visibility: usersTable.visibility,
      lat: usersTable.lat,
      lng: usersTable.lng,
      lastSeen: usersTable.lastSeen,
    })
    .from(usersTable)
    .where(
      and(
        ne(usersTable.id, currentUser.id),
        eq(usersTable.visibility, "campus"),
        isNotNull(usersTable.lat),
        isNotNull(usersTable.lng),
        sql`${haversine} < ${radius}`
      )
    );

  const result = rows.map(u => ({
    ...u,
    active: u.lastSeen ? new Date(u.lastSeen) >= fiveMinAgo : false,
  }));

  res.json(result);
});

// GET /users/me/stats — activity stats (messages posted, events rsvped, issues reported)
router.get("/users/me/stats", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const [msgCount, rsvpCount, issueCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(messagesTable).where(eq(messagesTable.userId, user.id)),
      db.select({ count: sql<number>`count(*)::int` }).from(eventRsvpsTable).where(eq(eventRsvpsTable.userId, user.id)),
      db.select({ count: sql<number>`count(*)::int` }).from(issueReportsTable).where(eq(issueReportsTable.userId, user.id)),
    ]);
    res.json({
      messagesPosted: msgCount[0]?.count ?? 0,
      eventsJoined: rsvpCount[0]?.count ?? 0,
      issuesReported: issueCount[0]?.count ?? 0,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export { requireAuth };
export default router;
