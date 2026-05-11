import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { campusTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { SetCampusBody } from "@workspace/api-zod";

const router: IRouter = Router();

// 🔐 PIN check middleware for campus updates
const requirePin = (req: any, res: any, next: any) => {
  const pinHeader = req.headers["x-admin-pin"] as string;
  const authHeader = req.headers.authorization?.replace("Bearer ", "");
  const pin = pinHeader || authHeader;
  
  const expectedPin = process.env.VITE_ADMIN_PIN || "1234";
  if (!pin || pin.trim() !== expectedPin.trim()) {
    console.warn(`[campus] Unauthorized write attempt. Received PIN: [${pin}], Expected: [${expectedPin}]`);
    res.status(401).json({ error: "Unauthorized — invalid admin PIN" });
    return;
  }
  next();
};

// GET /campus — public
router.get("/campus", async (_req, res) => {
  try {
    const campuses = await db.select().from(campusTable).limit(1);
    if (campuses.length === 0) {
      res.status(404).json({ error: "No campus configured yet" });
      return;
    }
    res.json(campuses[0]);
  } catch (err) {
    console.error("[campus] fetch failed:", err);
    res.status(500).json({ error: "Failed to fetch campus" });
  }
});

// POST /campus — PROTECTED
router.post("/campus", requirePin, async (req, res) => {
  try {
    console.log("[campus] Setup request received:", JSON.stringify(req.body));
    const body = SetCampusBody.parse(req.body);
    const existing = await db.select().from(campusTable).limit(1);
    
    if (existing.length > 0) {
      const updated = await db
        .update(campusTable)
        .set({
          name: body.name,
          lat: body.lat,
          lng: body.lng,
          defaultZoom: body.defaultZoom,
          updatedAt: new Date(),
        })
        .where(eq(campusTable.id, existing[0].id))
        .returning();
      console.log("[campus] Successfully updated existing campus.");
      res.json(updated[0]);
    } else {
      const created = await db
        .insert(campusTable)
        .values({
          name: body.name,
          lat: body.lat,
          lng: body.lng,
          defaultZoom: body.defaultZoom,
        })
        .returning();
      console.log("[campus] Successfully created new campus configuration.");
      res.status(201).json(created[0]);
    }
  } catch (err: any) {
    console.error("[campus] save failed:", err);
    const msg = err.name === "ZodError" ? "Validation failed" : String(err);
    res.status(err.name === "ZodError" ? 400 : 500).json({ error: msg });
  }
});

export default router;
