import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "crypto";
import { db } from "@workspace/db";
import { usersTable, userOtpsTable, messagesTable, issueReportsTable, campusShopsTable, locationsTable, campusTable } from "@workspace/db/schema";
import { eq, desc, asc } from "drizzle-orm";

const router: IRouter = Router();

// 🔐 Hard authorization gate: every /admin/* route requires the admin PIN
router.use("/admin", (req: Request, res: Response, next) => {
  const pinHeader = req.headers["x-admin-pin"] as string;
  const authHeader = req.headers.authorization?.replace("Bearer ", "");
  const pin = pinHeader || authHeader;
  
  const expectedPin = process.env.VITE_ADMIN_PIN || "1234";
  if (!pin || pin.trim() !== expectedPin.trim()) {
    console.warn(`[admin] Unauthorized access attempt. Received PIN: [${pin}], Expected: [${expectedPin}]`);
    res.status(401).json({ error: "Unauthorized — invalid admin PIN" });
    return;
  }
  next();
});

// ── Bot identity ─────────────────────────────────────────────────────────────
// This is a synthetic phone number for a ghost "Campus Admin" bot account used
// to attribute admin-pinned map messages. It is NOT an authentication mechanism
// and has no relation to the ADMIN_PHONE environment variable used for bootstrap.
const ADMIN_BOT_PHONE = "+972000000000";

// ── Helpers ───────────────────────────────────────────────────────────────────
// Cryptographically random 6-digit OTP used for the admin invite flow.
function generateSecureOtp(): string {
  // crypto.randomInt is available in Node ≥ 14.10 and is cryptographically secure.
  return crypto.randomInt(100_000, 999_999).toString();
}

// Normalize a phone string to E.164. Mirrors the logic in routes/auth.ts.
function normalizePhoneForInvite(input: string): string | null {
  if (!input || typeof input !== "string") return null;
  let digits = input.replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) digits = "+" + digits.slice(2);
  if (!digits.startsWith("+")) {
    if (digits.startsWith("0")) digits = "+972" + digits.slice(1);
    else digits = "+" + digits;
  }
  return /^\+\d{8,15}$/.test(digits) ? digits : null;
}

async function getOrCreateAdminBotUser(): Promise<number> {
  const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.phone, ADMIN_BOT_PHONE)).limit(1);
  if (existing.length) return existing[0].id;
  const [u] = await db.insert(usersTable).values({
    phone: ADMIN_BOT_PHONE,
    displayName: "Campus Admin",
    visibility: "ghost" as const,
  }).returning({ id: usersTable.id });
  return u.id;
}

// GET /admin/users — list all users
router.get("/admin/users", async (_req: Request, res: Response) => {
  try {
    const users = await db
      .select({
        id: usersTable.id,
        phone: usersTable.phone,
        displayName: usersTable.displayName,
        title: usersTable.title,
        avatarUrl: usersTable.avatarUrl,
        bannerColor: usersTable.bannerColor,
        visibility: usersTable.visibility,
        lat: usersTable.lat,
        lng: usersTable.lng,
        lastSeen: usersTable.lastSeen,
      })
      .from(usersTable)
      .orderBy(usersTable.id);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// POST /admin/users — invite/create a user by phone number
router.post("/admin/users", async (req: Request, res: Response) => {
  const { phone } = req.body;
  if (!phone) { res.status(400).json({ error: "phone required" }); return; }

  const formatted = normalizePhoneForInvite(phone.trim());
  if (!formatted) { res.status(400).json({ error: "Invalid phone number" }); return; }

  try {
    const existing = await db.select().from(usersTable).where(eq(usersTable.phone, formatted)).limit(1);
    let userId: number;
    if (existing.length) {
      userId = existing[0].id;
    } else {
      const [u] = await db.insert(usersTable).values({ phone: formatted }).returning({ id: usersTable.id });
      userId = u.id;
    }

    const otp = generateSecureOtp();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await db.delete(userOtpsTable).where(eq(userOtpsTable.phone, formatted));
    await db.insert(userOtpsTable).values({ phone: formatted, otp, expiresAt });

    res.json({ userId, phone: formatted, otp, message: "User created. Share the OTP with them to log in." });
  } catch (err) {
    res.status(500).json({ error: "Failed to invite user" });
  }
});

// DELETE /admin/users/:id — remove a user
router.delete("/admin/users/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    await db.delete(usersTable).where(eq(usersTable.id, id));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// GET /admin/messages — list all admin-pinned map messages
router.get("/admin/messages", async (_req: Request, res: Response) => {
  try {
    const adminId = await getOrCreateAdminBotUser();
    const msgs = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.userId, adminId))
      .orderBy(desc(messagesTable.createdAt));
    res.json(msgs);
  } catch {
    res.status(500).json({ error: "Failed to fetch admin messages" });
  }
});

// POST /admin/messages — pin a new message on the map as Campus Admin
router.post("/admin/messages", async (req: Request, res: Response) => {
  const { lat, lng, content, type, expiresInMinutes } = req.body;
  if (!lat || !lng || !content) {
    res.status(400).json({ error: "lat, lng, content required" });
    return;
  }
  try {
    const adminId = await getOrCreateAdminBotUser();
    const expiresAt = expiresInMinutes
      ? new Date(Date.now() + expiresInMinutes * 60 * 1000)
      : null;
    const [created] = await db.insert(messagesTable).values({
      userId: adminId,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      content,
      type: type || "regular",
      expiresAt,
    }).returning();
    res.status(201).json(created);
  } catch {
    res.status(500).json({ error: "Failed to create admin message" });
  }
});

// DELETE /admin/messages/:id — remove an admin-pinned message
router.delete("/admin/messages/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    await db.delete(messagesTable).where(eq(messagesTable.id, id));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to delete message" });
  }
});

// ─── Admin Issues ────────────────────────────────────────────────────────────

// GET /admin/issues
router.get("/admin/issues", async (_req: Request, res: Response) => {
  try {
    const rows = await db.select({
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
    }).from(issueReportsTable)
      .leftJoin(locationsTable, eq(issueReportsTable.locationId, locationsTable.id))
      .leftJoin(usersTable, eq(issueReportsTable.userId, usersTable.id))
      .orderBy(desc(issueReportsTable.createdAt));
    res.json(rows);
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// PATCH /admin/issues/:id/status
router.patch("/admin/issues/:id/status", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  if (!["open","in_progress","resolved"].includes(status)) { res.status(400).json({ error: "Invalid status" }); return; }
  try {
    const updated = await db.update(issueReportsTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(issueReportsTable.id, id)).returning();
    if (!updated.length) { res.status(404).json({ error: "Not found" }); return; }
    res.json(updated[0]);
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// DELETE /admin/issues/:id
router.delete("/admin/issues/:id", async (req: Request, res: Response) => {
  try {
    await db.delete(issueReportsTable).where(eq(issueReportsTable.id, Number(req.params.id)));
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// ─── Admin Shops ─────────────────────────────────────────────────────────────

// GET /admin/shops
router.get("/admin/shops", async (_req: Request, res: Response) => {
  try {
    const rows = await db.select().from(campusShopsTable).orderBy(asc(campusShopsTable.sortOrder), asc(campusShopsTable.id));
    res.json(rows);
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// POST /admin/shops
router.post("/admin/shops", async (req: Request, res: Response) => {
  try {
    const campus = await db.select().from(campusTable).limit(1);
    if (!campus.length) { res.status(400).json({ error: "Campus not configured" }); return; }
    const { name, icon, description, hours, discount, color, menuItems, active, sortOrder, locationId } = req.body;
    if (!name) { res.status(400).json({ error: "name required" }); return; }
    const created = await db.insert(campusShopsTable).values({
      campusId: campus[0].id,
      locationId: locationId ? Number(locationId) : null,
      name: String(name),
      icon: icon ? String(icon) : "🏪",
      description: description || null,
      hours: hours || null,
      discount: discount || null,
      color: color || "#6366f1",
      menuItems: Array.isArray(menuItems) ? menuItems : [],
      active: active !== false,
      sortOrder: sortOrder ? Number(sortOrder) : 0,
    }).returning();
    res.status(201).json(created[0]);
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// PATCH /admin/shops/:id
router.patch("/admin/shops/:id", async (req: Request, res: Response) => {
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
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// DELETE /admin/shops/:id
router.delete("/admin/shops/:id", async (req: Request, res: Response) => {
  try {
    await db.delete(campusShopsTable).where(eq(campusShopsTable.id, Number(req.params.id)));
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// ─── Admin Floor Data ─────────────────────────────────────────────────────────

// PATCH /admin/locations/:id/floors
router.patch("/admin/locations/:id/floors", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { floorData } = req.body;
  if (!Array.isArray(floorData)) { res.status(400).json({ error: "floorData must be an array" }); return; }
  try {
    const updated = await db.update(locationsTable)
      .set({ floorData, updatedAt: new Date() })
      .where(eq(locationsTable.id, id)).returning();
    if (!updated.length) { res.status(404).json({ error: "Not found" }); return; }
    res.json(updated[0]);
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

export default router;
