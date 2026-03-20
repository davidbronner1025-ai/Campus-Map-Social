import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

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
  const { displayName, title, avatarUrl, bannerUrl, bannerColor } = req.body;
  const updated = await db
    .update(usersTable)
    .set({
      ...(displayName !== undefined && { displayName }),
      ...(title !== undefined && { title }),
      ...(avatarUrl !== undefined && { avatarUrl }),
      ...(bannerUrl !== undefined && { bannerUrl }),
      ...(bannerColor !== undefined && { bannerColor }),
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

export { requireAuth };
export default router;
