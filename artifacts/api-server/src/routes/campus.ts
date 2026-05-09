import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { campusTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { SetCampusBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/campus", async (_req, res) => {
  try {
    const campuses = await db.select().from(campusTable).limit(1);
    if (campuses.length === 0) {
      res.status(404).json({ error: "No campus configured yet" });
      return;
    }
    res.json(campuses[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 🔐 PIN check middleware
const requirePin = (req: any, res: any, next: any) => {
  const pinHeader = req.headers["x-admin-pin"] as string;
  const authHeader = req.headers.authorization?.replace("Bearer ", "");
  const pin = pinHeader || authHeader;
  const expectedPin = process.env.VITE_ADMIN_PIN || "1234";
  if (!pin || pin !== expectedPin) {
    return res.status(401).json({ error: "Unauthorized — valid admin PIN required" });
  }
  next();
};

router.post("/campus", requirePin, async (req, res) => {
  try {
    const body = SetCampusBody.parse(req.body);
    const existing = await db.select().from(campusTable).limit(1);
    if (existing.length > 0) {
      const updated = await db
        .update(campusTable)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(campusTable.id, existing[0].id))
        .returning();
      res.json(updated[0]);
    } else {
      const created = await db.insert(campusTable).values(body).returning();
      res.json(created[0]);
    }
  } catch (err) {
    console.error("[campus] set failed:", err);
    res.status(400).json({ error: String(err) });
  }
});

export default router;
