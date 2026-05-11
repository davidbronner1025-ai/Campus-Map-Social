import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { campusShopsTable, usersTable, campusTable } from "@workspace/db/schema";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

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

export default router;
