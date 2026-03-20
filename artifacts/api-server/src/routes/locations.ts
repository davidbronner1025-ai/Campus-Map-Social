import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  locationsTable, announcementsTable, schedulesTable,
  menusTable, menuRatingsTable, gameSessionsTable, gameVotesTable,
  usersTable,
} from "@workspace/db/schema";
import { eq, desc, avg } from "drizzle-orm";
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
  const c = await db.select().from(campusTable).limit(1);
  return c.length ? c[0].id : null;
}

// ─── Locations ──────────────────────────────────────────────────────────────

async function enrichLocationsWithManager(locations: any[]) {
  return Promise.all(locations.map(async (loc) => {
    if (loc.managerId) {
      const [mgr] = await db.select({ displayName: usersTable.displayName })
        .from(usersTable).where(eq(usersTable.id, loc.managerId));
      if (mgr) return { ...loc, managerName: mgr.displayName || "Assigned" };
    }
    return loc;
  }));
}

router.get("/locations", async (_req, res) => {
  try {
    const locations = await db.select().from(locationsTable).orderBy(desc(locationsTable.createdAt));
    res.json(await enrichLocationsWithManager(locations));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/locations", async (req, res) => {
  try {
    const managerId = req.body.managerId != null ? Number(req.body.managerId) : null;
    const body = CreateLocationBody.parse(req.body);
    const campusId = await getCampusId();
    if (!campusId) {
      res.status(400).json({ error: "Campus not configured yet." });
      return;
    }
    const created = await db.insert(locationsTable).values({ ...body, campusId, managerId }).returning();
    const enriched = await enrichLocationsWithManager(created);
    res.status(201).json(enriched[0]);
  } catch (err) {
    res.status(400).json({ error: String(err) });
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

router.put("/locations/:locationId", async (req, res) => {
  try {
    const { locationId } = UpdateLocationParams.parse({ locationId: Number(req.params.locationId) });
    const managerId = req.body.managerId !== undefined ? (req.body.managerId != null ? Number(req.body.managerId) : null) : undefined;
    const body = UpdateLocationBody.parse(req.body);
    const setObj: any = { ...body, updatedAt: new Date() };
    if (managerId !== undefined) setObj.managerId = managerId;
    const updated = await db.update(locationsTable)
      .set(setObj)
      .where(eq(locationsTable.id, locationId))
      .returning();
    if (!updated.length) { res.status(404).json({ error: "Location not found" }); return; }
    const enriched = await enrichLocationsWithManager(updated);
    res.json(enriched[0]);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

router.delete("/locations/:locationId", async (req, res) => {
  try {
    const { locationId } = DeleteLocationParams.parse({ locationId: Number(req.params.locationId) });
    const deleted = await db.delete(locationsTable).where(eq(locationsTable.id, locationId)).returning();
    if (!deleted.length) { res.status(404).json({ error: "Location not found" }); return; }
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    res.status(400).json({ error: String(err) });
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

router.post("/locations/:locationId/announcements", async (req, res) => {
  try {
    const { locationId } = CreateAnnouncementParams.parse({ locationId: Number(req.params.locationId) });
    const body = CreateAnnouncementBody.parse(req.body);
    const created = await db.insert(announcementsTable).values({ ...body, locationId }).returning();
    res.status(201).json(created[0]);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

router.delete("/announcements/:announcementId", async (req, res) => {
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

router.post("/locations/:locationId/schedules", async (req, res) => {
  try {
    const { locationId } = CreateScheduleEntryParams.parse({ locationId: Number(req.params.locationId) });
    const body = CreateScheduleEntryBody.parse(req.body);
    const created = await db.insert(schedulesTable).values({ ...body, locationId }).returning();
    res.status(201).json(created[0]);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

router.delete("/schedules/:scheduleId", async (req, res) => {
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

router.post("/locations/:locationId/menus", async (req, res) => {
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

router.post("/locations/:locationId/games", async (req, res) => {
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

router.delete("/games/:gameId", async (req, res) => {
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
