import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  locationsTable, announcementsTable, schedulesTable,
  menusTable, menuRatingsTable, gameSessionsTable, gameVotesTable,
  usersTable, messagesTable,
} from "@workspace/db/schema";
import { eq, desc, avg, and, gte, sql } from "drizzle-orm";
import {
  CreateLocationBody, UpdateLocationBody, GetLocationParams,
  UpdateLocationParams, DeleteLocationParams,
  GetAnnouncementsParams, CreateAnnouncementParams, CreateAnnouncementBody, DeleteAnnouncementParams,
  GetSchedulesParams, CreateScheduleEntryParams, CreateScheduleEntryBody, DeleteScheduleEntryParams,
  GetMenusParams, CreateMenuParams, CreateMenuBody, RateMenuParams, RateMenuBody,
  GetGamesParams, CreateGameParams, CreateGameBody, DeleteGameParams, VoteForGameParams, VoteForGameBody,
} from "@workspace/api-zod";
import { campusTable } from "@workspace/db/schema";

const router: IRouter = Router();

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getCampusId(): Promise<number | null> {
  try {
    const c = await db.select({ id: campusTable.id }).from(campusTable).limit(1);
    return c.length ? c[0].id : null;
  } catch (err) {
    console.error("[locations] getCampusId failed:", err);
    return null;
  }
}

// Helper to ensure managers have names
async function enrichLocationsWithManager(locations: any[]) {
  return Promise.all(locations.map(async (loc) => {
    if (loc.managerId) {
      try {
        const [mgr] = await db.select({ displayName: usersTable.displayName })
          .from(usersTable).where(eq(usersTable.id, loc.managerId));
        if (mgr) return { ...loc, managerName: mgr.displayName || "Assigned" };
      } catch (err) {
        console.error(`[locations] Failed to enrich manager for loc ${loc.id}:`, err);
      }
    }
    return loc;
  }));
}

// 🔐 PIN check middleware for location writes
const requirePin = (req: any, res: any, next: any) => {
  const pinHeader = req.headers["x-admin-pin"] as string;
  const authHeader = req.headers.authorization?.replace("Bearer ", "");
  const pin = pinHeader || authHeader;
  const expectedPin = process.env.VITE_ADMIN_PIN || "1234";
  if (!pin || pin.trim() !== expectedPin.trim()) {
    console.warn(`[locations] Unauthorized write attempt. Received PIN: [${pin}], Expected: [${expectedPin}]`);
    return res.status(401).json({ error: "Unauthorized — valid admin PIN required" });
  }
  next();
};

// ─── Locations ──────────────────────────────────────────────────────────────

router.get("/locations", async (_req, res) => {
  try {
    const locations = await db.select().from(locationsTable).orderBy(desc(locationsTable.createdAt));
    res.json(await enrichLocationsWithManager(locations));
  } catch (err) {
    console.error("[locations] fetch failed:", err);
    res.status(500).json({ error: String(err) });
  }
});

router.post("/locations", requirePin, async (req, res) => {
  try {
    console.log("[locations] Create request body:", JSON.stringify(req.body));
    const body = CreateLocationBody.parse(req.body);
    const campusId = await getCampusId();
    if (!campusId) {
      console.error("[locations] Create failed: No campus configured.");
      res.status(400).json({ error: "Campus not configured yet. Please go to Setup page first." });
      return;
    }
    const managerId = body.managerId != null ? Number(body.managerId) : null;
    
    const insertObj = {
      campusId,
      name: body.name,
      description: body.description || null,
      type: body.type,
      color: body.color,
      adminName: body.adminName || null,
      managerId,
      lat: body.lat,
      lng: body.lng,
      polygon: body.polygon || [],
      osmName: body.osmName || null,
      updatedAt: new Date(),
    };

    const created = await db.insert(locationsTable).values(insertObj).returning();
    console.log("[locations] Successfully created location:", created[0].id);
    const enriched = await enrichLocationsWithManager(created);
    res.status(201).json(enriched[0]);
  } catch (err: any) {
    console.error("[locations] create failed:", err);
    const msg = err.name === "ZodError" ? "Validation failed: " + JSON.stringify(err.errors) : String(err);
    res.status(err.name === "ZodError" ? 400 : 500).json({ error: msg });
  }
});

router.get("/locations/:locationId", async (req, res) => {
  try {
    const { locationId } = GetLocationParams.parse({ locationId: Number(req.params.locationId) });
    const rows = await db.select().from(locationsTable).where(eq(locationsTable.id, locationId));
    if (!rows.length) { res.status(404).json({ error: "Location not found" }); return; }
    const enriched = await enrichLocationsWithManager(rows);
    res.json(enriched[0]);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

router.put("/locations/:locationId", requirePin, async (req, res) => {
  const locationId = Number(req.params.locationId);
  try {
    const body = UpdateLocationBody.parse(req.body);
    const managerId = body.managerId !== undefined ? (body.managerId != null ? Number(body.managerId) : null) : undefined;
    
    const setObj: any = {
      ...body,
      updatedAt: new Date()
    };
    if (managerId !== undefined) setObj.managerId = managerId;

    const updated = await db.update(locationsTable)
      .set(setObj)
      .where(eq(locationsTable.id, locationId))
      .returning();

    if (!updated.length) { res.status(404).json({ error: "Location not found" }); return; }
    console.log("[locations] Successfully updated location:", locationId);
    const enriched = await enrichLocationsWithManager(updated);
    res.json(enriched[0]);
  } catch (err: any) {
    console.error("[locations] update failed:", err);
    const msg = err.name === "ZodError" ? "Validation failed" : String(err);
    res.status(err.name === "ZodError" ? 400 : 500).json({ error: msg });
  }
});

router.delete("/locations/:locationId", requirePin, async (req, res) => {
  try {
    const { locationId } = DeleteLocationParams.parse({ locationId: Number(req.params.locationId) });
    const deleted = await db.delete(locationsTable).where(eq(locationsTable.id, locationId)).returning();
    if (!deleted.length) { res.status(404).json({ error: "Location not found" }); return; }
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error("[locations] delete failed:", err);
    res.status(400).json({ error: String(err) });
  }
});


// GET /locations/:locationId/crowd — returns message count in last 2h as crowd proxy
router.get("/locations/:locationId/crowd", async (req, res) => {
  try {
    const locationId = Number(req.params.locationId);
    const loc = await db.select().from(locationsTable).where(eq(locationsTable.id, locationId)).limit(1);
    if (!loc.length) { res.status(404).json({ error: "Not found" }); return; }
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const { lat, lng } = loc[0];
    const radius = 150; // metres
    const haversine = sql`(6371000 * acos(
      cos(radians(${lat})) * cos(radians(${messagesTable.lat})) *
      cos(radians(${messagesTable.lng}) - radians(${lng})) +
      sin(radians(${lat})) * sin(radians(${messagesTable.lat}))
    ))`;
    const rows = await db.select({ count: sql<number>`count(*)::int` })
      .from(messagesTable)
      .where(and(gte(messagesTable.createdAt, twoHoursAgo), sql`${haversine} < ${radius}`));
    const count = rows[0]?.count ?? 0;
    const density = count === 0 ? 0 : count < 3 ? 0.25 : count < 7 ? 0.55 : count < 15 ? 0.8 : 1.0;
    res.json({ count, density });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ─── Announcements ──────────────────────────────────────────────────────────

router.get("/locations/:locationId/announcements", async (req, res) => {
  try {
    const { locationId } = GetAnnouncementsParams.parse({ locationId: Number(req.params.locationId) });
    const rows = await db.select().from(announcementsTable)
      .where(eq(announcementsTable.locationId, locationId))
      .orderBy(desc(announcementsTable.createdAt));
    res.json(rows);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

router.post("/locations/:locationId/announcements", requirePin, async (req, res) => {
  try {
    const { locationId } = CreateAnnouncementParams.parse({ locationId: Number(req.params.locationId) });
    const body = CreateAnnouncementBody.parse(req.body);
    const created = await db.insert(announcementsTable).values({ ...body, locationId }).returning();
    res.status(201).json(created[0]);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

router.delete("/announcements/:announcementId", requirePin, async (req, res) => {
  try {
    const { announcementId } = DeleteAnnouncementParams.parse({ announcementId: Number(req.params.announcementId) });
    await db.delete(announcementsTable).where(eq(announcementsTable.id, announcementId));
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// ─── Schedules ──────────────────────────────────────────────────────────────

router.get("/locations/:locationId/schedules", async (req, res) => {
  try {
    const { locationId } = GetSchedulesParams.parse({ locationId: Number(req.params.locationId) });
    const rows = await db.select().from(schedulesTable)
      .where(eq(schedulesTable.locationId, locationId));
    res.json(rows);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

router.post("/locations/:locationId/schedules", requirePin, async (req, res) => {
  try {
    const { locationId } = CreateScheduleEntryParams.parse({ locationId: Number(req.params.locationId) });
    const body = CreateScheduleEntryBody.parse(req.body);
    const created = await db.insert(schedulesTable).values({ ...body, locationId }).returning();
    res.status(201).json(created[0]);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

router.delete("/schedules/:scheduleId", requirePin, async (req, res) => {
  try {
    const { scheduleId } = DeleteScheduleEntryParams.parse({ scheduleId: Number(req.params.scheduleId) });
    await db.delete(schedulesTable).where(eq(schedulesTable.id, scheduleId));
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// ─── Menus ──────────────────────────────────────────────────────────────────

router.get("/locations/:locationId/menus", async (req, res) => {
  try {
    const { locationId } = GetMenusParams.parse({ locationId: Number(req.params.locationId) });
    const menus = await db.select().from(menusTable)
      .where(eq(menusTable.locationId, locationId))
      .orderBy(desc(menusTable.date));

    const result = await Promise.all(menus.map(async (menu) => {
      const ratings = await db.select().from(menuRatingsTable).where(eq(menuRatingsTable.menuId, menu.id));
      const avg = ratings.length ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length : 0;
      return {
        ...menu,
        averageRating: Math.round(avg * 10) / 10,
        ratingCount: ratings.length,
      };
    }));
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

router.post("/locations/:locationId/menus", requirePin, async (req, res) => {
  try {
    const { locationId } = CreateMenuParams.parse({ locationId: Number(req.params.locationId) });
    const body = CreateMenuBody.parse(req.body);
    const created = await db.insert(menusTable).values({ ...body, locationId }).returning();
    res.status(201).json({ ...created[0], averageRating: 0, ratingCount: 0 });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

router.post("/menus/:menuId/rate", async (req, res) => {
  try {
    const { menuId } = RateMenuParams.parse({ menuId: Number(req.params.menuId) });
    const body = RateMenuBody.parse(req.body);
    await db.insert(menuRatingsTable).values({ menuId, ...body });
    res.json({ success: true, message: "Rating saved" });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// ─── Games ──────────────────────────────────────────────────────────────────

router.get("/locations/:locationId/games", async (req, res) => {
  try {
    const { locationId } = GetGamesParams.parse({ locationId: Number(req.params.locationId) });
    const games = await db.select().from(gameSessionsTable)
      .where(eq(gameSessionsTable.locationId, locationId))
      .orderBy(desc(gameSessionsTable.scheduledAt));

    const result = await Promise.all(games.map(async (game) => {
      const votes = await db.select().from(gameVotesTable).where(eq(gameVotesTable.gameId, game.id));
      return {
        ...game,
        votes: votes.map(v => ({ playerName: v.playerName, votedAt: v.votedAt })),
      };
    }));
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

router.post("/locations/:locationId/games", requirePin, async (req, res) => {
  try {
    const { locationId } = CreateGameParams.parse({ locationId: Number(req.params.locationId) });
    const body = CreateGameBody.parse(req.body);
    const scheduledAt = new Date(body.scheduledAt);
    const created = await db.insert(gameSessionsTable).values({ ...body, scheduledAt, locationId }).returning();
    res.status(201).json({ ...created[0], votes: [] });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

router.delete("/games/:gameId", requirePin, async (req, res) => {
  try {
    const { gameId } = DeleteGameParams.parse({ gameId: Number(req.params.gameId) });
    await db.delete(gameSessionsTable).where(eq(gameSessionsTable.id, gameId));
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

router.post("/games/:gameId/vote", async (req, res) => {
  try {
    const { gameId } = VoteForGameParams.parse({ gameId: Number(req.params.gameId) });
    const body = VoteForGameBody.parse(req.body);
    await db.insert(gameVotesTable).values({ gameId, playerName: body.playerName });
    res.json({ success: true, message: "Vote recorded" });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

export default router;
