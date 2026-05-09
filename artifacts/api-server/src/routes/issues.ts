import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { issueReportsTable, usersTable, locationsTable } from "@workspace/db/schema";
import { eq, desc, and, isNotNull } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

// GET /issues?locationId=  — list public issues (or all for admin)
router.get("/issues", requireAuth, async (req: Request, res: Response) => {
  try {
    const locationId = req.query.locationId ? Number(req.query.locationId) : null;
    const conditions = locationId
      ? [eq(issueReportsTable.locationId, locationId)]
      : [];
    const rows = await db
      .select({
        id: issueReportsTable.id,
        locationId: issueReportsTable.locationId,
        floor: issueReportsTable.floor,
        category: issueReportsTable.category,
        description: issueReportsTable.description,
        status: issueReportsTable.status,
        isPublic: issueReportsTable.isPublic,
        createdAt: issueReportsTable.createdAt,
        updatedAt: issueReportsTable.updatedAt,
        locationName: locationsTable.name,
        reporterName: usersTable.displayName,
      })
      .from(issueReportsTable)
      .leftJoin(locationsTable, eq(issueReportsTable.locationId, locationsTable.id))
      .leftJoin(usersTable, eq(issueReportsTable.userId, usersTable.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(issueReportsTable.createdAt));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /issues — submit a new issue report
router.post("/issues", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { locationId, floor, category, description, isPublic } = req.body;
    if (!category || typeof category !== "string") {
      res.status(400).json({ error: "category is required" });
      return;
    }
    const created = await db.insert(issueReportsTable).values({
      userId: user.id,
      locationId: locationId ? Number(locationId) : null,
      floor: floor ? Number(floor) : null,
      category: String(category),
      description: description ? String(description) : null,
      isPublic: isPublic !== false,
    }).returning();
    res.status(201).json(created[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PATCH /issues/:id/status — admin updates status
router.patch("/issues/:id/status", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id as string);
    const { status } = req.body;
    if (!["open", "in_progress", "resolved"].includes(status)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }
    const updated = await db.update(issueReportsTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(issueReportsTable.id, id))
      .returning();
    if (!updated.length) { res.status(404).json({ error: "Not found" }); return; }
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// DELETE /issues/:id
router.delete("/issues/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id as string);
    await db.delete(issueReportsTable).where(eq(issueReportsTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
