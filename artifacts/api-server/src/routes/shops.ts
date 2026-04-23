import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { campusShopsTable, usersTable, campusTable } from "@workspace/db/schema";
import { eq, asc } from "drizzle-orm";

const router: IRouter = Router();

async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await db.select().from(usersTable).where(eq(usersTable.sessionToken, token)).limit(1);
  if (!user.length) { res.status(401).json({ error: "Invalid token" }); return; }
  (req as any).user = user[0];
  next();
}

async function getCampusId(): Promise<number | null> {
  const c = await db.select().from(campusTable).limit(1);
  return c.length ? c[0].id : null;
}

// GET /shops — list active shops
router.get("/shops", async (_req: Request, res: Response) => {
  try {
    const rows = await db.select().from(campusShopsTable)
      .where(eq(campusShopsTable.active, true))
      .orderBy(asc(campusShopsTable.sortOrder), asc(campusShopsTable.id));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /shops/all — admin: list all including inactive
router.get("/shops/all", requireAuth, async (_req: Request, res: Response) => {
  try {
    const rows = await db.select().from(campusShopsTable)
      .orderBy(asc(campusShopsTable.sortOrder), asc(campusShopsTable.id));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /shops — create shop
router.post("/shops", requireAuth, async (req: Request, res: Response) => {
  try {
    const campusId = await getCampusId();
    if (!campusId) { res.status(400).json({ error: "Campus not configured" }); return; }
    const { name, icon, description, hours, discount, color, menuItems, active, sortOrder, locationId } = req.body;
    if (!name) { res.status(400).json({ error: "name required" }); return; }
    const created = await db.insert(campusShopsTable).values({
      campusId,
      locationId: locationId ? Number(locationId) : null,
      name: String(name),
      icon: icon ? String(icon) : "🏪",
      description: description ? String(description) : null,
      hours: hours ? String(hours) : null,
      discount: discount ? String(discount) : null,
      color: color ? String(color) : "#6366f1",
      menuItems: Array.isArray(menuItems) ? menuItems : [],
      active: active !== false,
      sortOrder: sortOrder ? Number(sortOrder) : 0,
    }).returning();
    res.status(201).json(created[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PATCH /shops/:id — update shop
router.patch("/shops/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { name, icon, description, hours, discount, color, menuItems, active, sortOrder, locationId } = req.body;
    const updated = await db.update(campusShopsTable).set({
      ...(name !== undefined && { name: String(name) }),
      ...(icon !== undefined && { icon: String(icon) }),
      ...(description !== undefined && { description: description || null }),
      ...(hours !== undefined && { hours: hours || null }),
      ...(discount !== undefined && { discount: discount || null }),
      ...(color !== undefined && { color: String(color) }),
      ...(menuItems !== undefined && { menuItems: Array.isArray(menuItems) ? menuItems : [] }),
      ...(active !== undefined && { active: Boolean(active) }),
      ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
      ...(locationId !== undefined && { locationId: locationId ? Number(locationId) : null }),
      updatedAt: new Date(),
    }).where(eq(campusShopsTable.id, id)).returning();
    if (!updated.length) { res.status(404).json({ error: "Not found" }); return; }
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// DELETE /shops/:id
router.delete("/shops/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await db.delete(campusShopsTable).where(eq(campusShopsTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
