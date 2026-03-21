import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { usersTable, userOtpsTable, messagesTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

const ADMIN_PHONE = "+972000000000";

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("972")) return "+" + digits;
  if (digits.startsWith("0")) return "+972" + digits.slice(1);
  if (!phone.startsWith("+")) return "+" + digits;
  return phone;
}

async function getOrCreateAdminUser(): Promise<number> {
  const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.phone, ADMIN_PHONE)).limit(1);
  if (existing.length) return existing[0].id;
  const [u] = await db.insert(usersTable).values({
    phone: ADMIN_PHONE,
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

  const formatted = formatPhone(phone.trim());

  try {
    const existing = await db.select().from(usersTable).where(eq(usersTable.phone, formatted)).limit(1);
    let userId: number;
    if (existing.length) {
      userId = existing[0].id;
    } else {
      const [u] = await db.insert(usersTable).values({ phone: formatted }).returning({ id: usersTable.id });
      userId = u.id;
    }

    const otp = generateOtp();
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
  const id = parseInt(req.params.id);
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
    const adminId = await getOrCreateAdminUser();
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
    const adminId = await getOrCreateAdminUser();
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
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    await db.delete(messagesTable).where(eq(messagesTable.id, id));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to delete message" });
  }
});

export default router;
