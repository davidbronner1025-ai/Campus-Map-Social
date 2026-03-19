import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { campusTable, zonesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import {
  SetCampusBody,
  CreateZoneBody,
  UpdateZoneBody,
  GetZoneParams,
  UpdateZoneParams,
  DeleteZoneParams,
} from "@workspace/api-zod";

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

router.post("/campus", async (req, res) => {
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
    console.error(err);
    res.status(400).json({ error: String(err) });
  }
});

router.get("/campus/zones", async (_req, res) => {
  try {
    const zones = await db.select().from(zonesTable);
    res.json(zones);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/campus/zones", async (req, res) => {
  try {
    const body = CreateZoneBody.parse(req.body);
    const campuses = await db.select().from(campusTable).limit(1);
    if (campuses.length === 0) {
      res.status(400).json({ error: "Campus not configured yet. Set up campus first." });
      return;
    }
    const created = await db
      .insert(zonesTable)
      .values({ ...body, campusId: campuses[0].id })
      .returning();
    res.status(201).json(created[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: String(err) });
  }
});

router.get("/campus/zones/:zoneId", async (req, res) => {
  try {
    const { zoneId } = GetZoneParams.parse({ zoneId: Number(req.params.zoneId) });
    const zones = await db.select().from(zonesTable).where(eq(zonesTable.id, zoneId));
    if (zones.length === 0) {
      res.status(404).json({ error: "Zone not found" });
      return;
    }
    res.json(zones[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: String(err) });
  }
});

router.put("/campus/zones/:zoneId", async (req, res) => {
  try {
    const { zoneId } = UpdateZoneParams.parse({ zoneId: Number(req.params.zoneId) });
    const body = UpdateZoneBody.parse(req.body);
    const updated = await db
      .update(zonesTable)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(zonesTable.id, zoneId))
      .returning();
    if (updated.length === 0) {
      res.status(404).json({ error: "Zone not found" });
      return;
    }
    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: String(err) });
  }
});

router.delete("/campus/zones/:zoneId", async (req, res) => {
  try {
    const { zoneId } = DeleteZoneParams.parse({ zoneId: Number(req.params.zoneId) });
    const deleted = await db.delete(zonesTable).where(eq(zonesTable.id, zoneId)).returning();
    if (deleted.length === 0) {
      res.status(404).json({ error: "Zone not found" });
      return;
    }
    res.json({ success: true, message: "Zone deleted" });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: String(err) });
  }
});

export default router;
