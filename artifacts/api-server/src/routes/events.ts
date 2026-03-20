import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { eventsTable, eventRsvpsTable, usersTable } from "@workspace/db/schema";
import { eq, and, desc, sql, gte } from "drizzle-orm";
import { requireAuth } from "./users";
import { createNotification } from "../lib/notify";

const router: IRouter = Router();

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// GET /events/nearby?lat=&lng=&radius= (default 1000m, upcoming only)
router.get("/events/nearby", requireAuth, async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  const radius = Math.min(parseFloat(req.query.radius as string) || 1000, 5000);

  if (isNaN(lat) || isNaN(lng)) {
    res.status(400).json({ error: "lat and lng required" });
    return;
  }

  const now = new Date();
  const allEvents = await db
    .select({
      event: eventsTable,
      creator: {
        id: usersTable.id,
        displayName: usersTable.displayName,
        avatarUrl: usersTable.avatarUrl,
        bannerColor: usersTable.bannerColor,
      },
    })
    .from(eventsTable)
    .leftJoin(usersTable, eq(eventsTable.creatorId, usersTable.id))
    .where(gte(eventsTable.startsAt, now))
    .orderBy(eventsTable.startsAt);

  const filtered = allEvents.filter((row) => {
    const dist = haversine(lat, lng, row.event.lat, row.event.lng);
    return dist <= radius;
  });

  const enriched = await Promise.all(
    filtered.map(async (row) => {
      const rsvps = await db
        .select({
          id: eventRsvpsTable.id,
          userId: eventRsvpsTable.userId,
          displayName: usersTable.displayName,
          avatarUrl: usersTable.avatarUrl,
        })
        .from(eventRsvpsTable)
        .leftJoin(usersTable, eq(eventRsvpsTable.userId, usersTable.id))
        .where(eq(eventRsvpsTable.eventId, row.event.id));

      return {
        ...row.event,
        creator: row.creator,
        rsvpCount: rsvps.length,
        rsvps,
        distance: Math.round(haversine(lat, lng, row.event.lat, row.event.lng)),
      };
    })
  );

  res.json(enriched);
});

// POST /events
router.post("/events", requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { title, description, category, lat, lng, startsAt, maxParticipants, locationId } = req.body;

  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);
  if (!title || typeof title !== "string" || title.trim().length === 0) {
    res.status(400).json({ error: "title required" });
    return;
  }
  if (isNaN(parsedLat) || isNaN(parsedLng) || parsedLat < -90 || parsedLat > 90 || parsedLng < -180 || parsedLng > 180) {
    res.status(400).json({ error: "Valid lat and lng required" });
    return;
  }
  if (!startsAt) {
    res.status(400).json({ error: "startsAt required" });
    return;
  }
  const parsedStartsAt = new Date(startsAt);
  if (isNaN(parsedStartsAt.getTime()) || parsedStartsAt.getTime() <= Date.now()) {
    res.status(400).json({ error: "startsAt must be a valid future date" });
    return;
  }

  const validCategories = ["study_group", "party", "sports", "club_meeting", "food", "other"];
  if (category && !validCategories.includes(category)) {
    res.status(400).json({ error: "Invalid category" });
    return;
  }

  const parsedMax = maxParticipants ? parseInt(maxParticipants) : null;
  if (parsedMax !== null && (isNaN(parsedMax) || parsedMax < 2 || parsedMax > 500)) {
    res.status(400).json({ error: "maxParticipants must be 2-500" });
    return;
  }

  const created = await db
    .insert(eventsTable)
    .values({
      creatorId: user.id,
      locationId: locationId || null,
      title: title.trim(),
      description: description?.trim() || null,
      category: category || "other",
      lat: parsedLat,
      lng: parsedLng,
      startsAt: parsedStartsAt,
      maxParticipants: parsedMax,
    })
    .returning();

  // Auto-RSVP the creator
  await db.insert(eventRsvpsTable).values({
    eventId: created[0].id,
    userId: user.id,
  });

  const creatorUser = await db.select({ displayName: usersTable.displayName }).from(usersTable).where(eq(usersTable.id, user.id)).limit(1);
  const creatorName = creatorUser[0]?.displayName || "Someone";
  const allUsers = await db.select({ id: usersTable.id, lat: usersTable.lat, lng: usersTable.lng }).from(usersTable).where(
    and(
      sql`${usersTable.lat} IS NOT NULL`,
      sql`${usersTable.lng} IS NOT NULL`
    )
  );
  const nearbyRadius = 2000;
  for (const u of allUsers) {
    if (u.id !== user.id && u.lat !== null && u.lng !== null && haversine(parsedLat, parsedLng, u.lat, u.lng) <= nearbyRadius) {
      createNotification(u.id, "nearby_event", `${creatorName} created "${title.trim()}" nearby`, created[0].id, "event");
    }
  }

  res.status(201).json(created[0]);
});

// DELETE /events/:id
router.delete("/events/:id", requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const eventId = parseInt(req.params.id);

  const evt = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
  if (!evt.length) { res.status(404).json({ error: "Not found" }); return; }
  if (evt[0].creatorId !== user.id) { res.status(403).json({ error: "Forbidden" }); return; }

  await db.delete(eventsTable).where(eq(eventsTable.id, eventId));
  res.json({ ok: true });
});

// POST /events/:id/rsvp
router.post("/events/:id/rsvp", requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const eventId = parseInt(req.params.id);

  const evt = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
  if (!evt.length) { res.status(404).json({ error: "Not found" }); return; }

  if (evt[0].maxParticipants) {
    const count = await db
      .select({ count: sql<number>`count(*)` })
      .from(eventRsvpsTable)
      .where(eq(eventRsvpsTable.eventId, eventId));
    if (Number(count[0]?.count ?? 0) >= evt[0].maxParticipants) {
      res.status(400).json({ error: "Event is full" });
      return;
    }
  }

  try {
    await db.insert(eventRsvpsTable).values({ eventId, userId: user.id });

    if (evt[0].creatorId !== user.id) {
      const joiner = await db.select({ displayName: usersTable.displayName }).from(usersTable).where(eq(usersTable.id, user.id)).limit(1);
      const name = joiner[0]?.displayName || "Someone";
      createNotification(evt[0].creatorId, "event_join", `${name} joined your event "${evt[0].title}"`, eventId, "event");
    }

    res.json({ ok: true, status: "joined" });
  } catch (e: unknown) {
    if (e instanceof Error && "code" in e && (e as { code: string }).code === "23505") {
      res.json({ ok: true, status: "already_joined" });
    } else {
      throw e;
    }
  }
});

// DELETE /events/:id/rsvp
router.delete("/events/:id/rsvp", requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const eventId = parseInt(req.params.id);

  await db
    .delete(eventRsvpsTable)
    .where(and(eq(eventRsvpsTable.eventId, eventId), eq(eventRsvpsTable.userId, user.id)));

  res.json({ ok: true, status: "left" });
});

// GET /events/:id — single event detail
router.get("/events/:id", requireAuth, async (req: Request, res: Response) => {
  const eventId = parseInt(req.params.id);

  const rows = await db
    .select({
      event: eventsTable,
      creator: {
        id: usersTable.id,
        displayName: usersTable.displayName,
        avatarUrl: usersTable.avatarUrl,
        bannerColor: usersTable.bannerColor,
      },
    })
    .from(eventsTable)
    .leftJoin(usersTable, eq(eventsTable.creatorId, usersTable.id))
    .where(eq(eventsTable.id, eventId))
    .limit(1);

  if (!rows.length) { res.status(404).json({ error: "Not found" }); return; }

  const rsvps = await db
    .select({
      id: eventRsvpsTable.id,
      userId: eventRsvpsTable.userId,
      displayName: usersTable.displayName,
      avatarUrl: usersTable.avatarUrl,
    })
    .from(eventRsvpsTable)
    .leftJoin(usersTable, eq(eventRsvpsTable.userId, usersTable.id))
    .where(eq(eventRsvpsTable.eventId, eventId));

  res.json({
    ...rows[0].event,
    creator: rows[0].creator,
    rsvpCount: rsvps.length,
    rsvps,
  });
});

export default router;
