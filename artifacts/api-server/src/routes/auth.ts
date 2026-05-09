import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { usersTable, userOtpsTable, userSessionsTable } from "@workspace/db/schema";
import { eq, and, gt, sql, desc, isNull } from "drizzle-orm";
import {
  requireAuth, type AuthedRequest,
  createSession, registerDevice,
  revokeSession, revokeSessionByToken, revokeAllUserSessions,
} from "../middleware/auth";

const router: IRouter = Router();

// ─── Helpers ───────────────────────────────────────────────────────────────
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function normalizePhone(input: string): string | null {
  if (!input || typeof input !== "string") return null;
  let digits = input.replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) digits = "+" + digits.slice(2);
  if (!digits.startsWith("+")) {
    if (digits.startsWith("0")) digits = "+972" + digits.slice(1);
    else digits = "+" + digits;
  }
  // E.164: + followed by 8-15 digits
  return /^\+\d{8,15}$/.test(digits) ? digits : null;
}

function clientIp(req: Request): string {
  const xf = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim();
  return xf || req.ip || "";
}

const MAX_OTP_REQUESTS_PER_HOUR = 5;
const MAX_OTP_VERIFY_ATTEMPTS = 5;
const OTP_TTL_MIN = 10;

const isProd = process.env["NODE_ENV"] === "production";

// ─── POST /auth/request-otp ────────────────────────────────────────────────
router.post("/auth/request-otp", async (req: Request, res: Response) => {
  try {
    const phone = normalizePhone(req.body?.phone);
    if (!phone) {
      res.status(400).json({ error: "Invalid phone number" });
      return;
    }

    // Per-phone rate limit: count OTP requests in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(userOtpsTable)
      .where(and(eq(userOtpsTable.phone, phone), gt(userOtpsTable.createdAt, oneHourAgo)));
    if ((recentCount[0]?.c ?? 0) >= MAX_OTP_REQUESTS_PER_HOUR) {
      res.status(429).json({ error: "Too many OTP requests. Try again later." });
      return;
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000);
    await db.insert(userOtpsTable).values({ phone, otp, expiresAt });

    // ── SMS delivery ────────────────────────────────────────────────────
    // PRODUCTION: integrate an SMS provider here (Twilio, MessageBird, etc.).
    // The OTP is currently logged server-side only. In production deployments,
    // configure the SMS_PROVIDER_* secrets and replace this log with an API call.
    // The OTP must NEVER be returned to the client in production.
    if (isProd) {
      console.log(`[auth] [PROD-TODO] Send SMS to ${phone}: code=${otp}`);
      res.json({ success: true, message: "קוד אימות נשלח" });
    } else {
      console.log(`[auth] [DEV] OTP for ${phone}: ${otp}`);
      res.json({ success: true, otp, message: "OTP generated (dev mode)" });
    }
  } catch (err) {
    console.error("[auth] request-otp failed", err);
    res.status(500).json({ error: "Failed to request OTP" });
  }
});

// ─── POST /auth/verify-otp ─────────────────────────────────────────────────
router.post("/auth/verify-otp", async (req: Request, res: Response) => {
  try {
    const phone = normalizePhone(req.body?.phone);
    const otp = typeof req.body?.otp === "string" ? req.body.otp.trim() : "";
    const deviceId = typeof req.body?.deviceId === "string" ? req.body.deviceId.slice(0, 128) : null;
    const platform = typeof req.body?.platform === "string" ? req.body.platform.slice(0, 32) : null;
    const appVersion = typeof req.body?.appVersion === "string" ? req.body.appVersion.slice(0, 32) : null;

    if (!phone || !otp || !/^\d{6}$/.test(otp)) {
      res.status(400).json({ error: "Phone and 6-digit OTP required" });
      return;
    }

    // Find the most recent unused, unexpired OTP for this phone
    const now = new Date();
    const otpRows = await db
      .select()
      .from(userOtpsTable)
      .where(and(
        eq(userOtpsTable.phone, phone),
        eq(userOtpsTable.used, false),
        gt(userOtpsTable.expiresAt, now),
      ))
      .orderBy(desc(userOtpsTable.createdAt))
      .limit(1);

    if (!otpRows.length) {
      res.status(401).json({ error: "OTP expired or not found" });
      return;
    }
    const otpRow = otpRows[0];

    // Bump attempts (atomic increment) BEFORE comparing to prevent timing-based abuse
    const updated = await db.update(userOtpsTable)
      .set({ attempts: (otpRow.attempts ?? 0) + 1 })
      .where(eq(userOtpsTable.id, otpRow.id))
      .returning({ attempts: userOtpsTable.attempts });
    const attempts = updated[0]?.attempts ?? otpRow.attempts + 1;

    if (otpRow.otp !== otp) {
      // Burn the OTP after too many wrong attempts
      if (attempts >= MAX_OTP_VERIFY_ATTEMPTS) {
        await db.update(userOtpsTable).set({ used: true }).where(eq(userOtpsTable.id, otpRow.id));
        res.status(429).json({ error: "Too many wrong attempts. Request a new code." });
        return;
      }
      res.status(401).json({ error: "Invalid OTP" });
      return;
    }

    // Mark OTP used
    await db.update(userOtpsTable).set({ used: true }).where(eq(userOtpsTable.id, otpRow.id));

    // Find or create user (preserve role if existing)
    const existing = await db.select().from(usersTable).where(eq(usersTable.phone, phone)).limit(1);
    let userId: number;
    let isNewUser = false;
    if (!existing.length) {
      // Bootstrap admin: env ADMIN_PHONE → first user matching gets role=admin
      const adminPhone = process.env["ADMIN_PHONE"]?.trim();
      const role = (adminPhone && normalizePhone(adminPhone) === phone) ? "admin" : "user";
      const created = await db.insert(usersTable).values({
        phone, displayName: "", role, accountStatus: "active",
      }).returning({ id: usersTable.id });
      userId = created[0].id;
      isNewUser = true;
    } else {
      userId = existing[0].id;
      if (existing[0].accountStatus !== "active") {
        res.status(403).json({ error: "Account is not active" });
        return;
      }
      // Promote to admin if env says so AND user wasn't admin already
      const adminPhone = process.env["ADMIN_PHONE"]?.trim();
      if (adminPhone && normalizePhone(adminPhone) === phone && existing[0].role !== "admin") {
        await db.update(usersTable).set({ role: "admin" }).where(eq(usersTable.id, userId));
      }
    }

    // Create new session for THIS device (multi-device safe)
    const ua = (req.headers["user-agent"] as string | undefined) ?? null;
    const ip = clientIp(req);
    const { token, sessionId, expiresAt } = await createSession({
      userId, deviceId, platform, appVersion, userAgent: ua, ipAddress: ip || null,
    });

    // Register the device (if provided)
    let isNewDevice = false;
    if (deviceId) {
      const r = await registerDevice({ userId, deviceId, platform, appVersion });
      isNewDevice = r.isNewDevice;
    }

    // Re-fetch user (possibly updated role)
    const user = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);

    res.json({
      token, sessionId, expiresAt,
      userId,
      role: user[0].role,
      isNew: isNewUser,
      isNewDevice,
    });
  } catch (err) {
    console.error("[auth] verify-otp failed", err);
    res.status(500).json({ error: "Failed to verify OTP" });
  }
});

// ─── POST /auth/logout — revoke current session ────────────────────────────
router.post("/auth/logout", requireAuth, async (req: Request, res: Response) => {
  try {
    const session = (req as any).session;
    await revokeSession(session.id);
    res.json({ success: true });
  } catch (err) {
    console.error("[auth] logout failed", err);
    res.status(500).json({ error: "Failed to logout" });
  }
});

// ─── POST /auth/logout-all — revoke ALL sessions for this user ────────────
router.post("/auth/logout-all", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    await revokeAllUserSessions(userId);
    res.json({ success: true });
  } catch (err) {
    console.error("[auth] logout-all failed", err);
    res.status(500).json({ error: "Failed to logout all sessions" });
  }
});

// ─── GET /auth/sessions — list this user's active sessions ────────────────
router.get("/auth/sessions", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const currentSessionId = (req as any).session.id;
    const rows = await db.select({
      id: userSessionsTable.id,
      deviceId: userSessionsTable.deviceId,
      platform: userSessionsTable.platform,
      appVersion: userSessionsTable.appVersion,
      userAgent: userSessionsTable.userAgent,
      ipAddress: userSessionsTable.ipAddress,
      createdAt: userSessionsTable.createdAt,
      lastSeenAt: userSessionsTable.lastSeenAt,
      expiresAt: userSessionsTable.expiresAt,
    })
      .from(userSessionsTable)
      .where(and(
        eq(userSessionsTable.userId, userId),
        isNull(userSessionsTable.revokedAt),
        gt(userSessionsTable.expiresAt, new Date()),
      ))
      .orderBy(desc(userSessionsTable.lastSeenAt));
    res.json(rows.map(s => ({ ...s, isCurrent: s.id === currentSessionId })));
  } catch (err) {
    console.error("[auth] list sessions failed", err);
    res.status(500).json({ error: "Failed to list sessions" });
  }
});

// ─── DELETE /auth/sessions/:id — revoke a specific session (own only) ─────
router.delete("/auth/sessions/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid session id" }); return; }
    // Verify ownership before revoking
    const sess = await db.select({ id: userSessionsTable.id, userId: userSessionsTable.userId })
      .from(userSessionsTable).where(eq(userSessionsTable.id, id)).limit(1);
    if (!sess.length || sess[0].userId !== userId) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    await revokeSession(id);
    res.json({ success: true });
  } catch (err) {
    console.error("[auth] revoke session failed", err);
    res.status(500).json({ error: "Failed to revoke session" });
  }
});

// ─── GET /auth/me — return current user info (used by client on app boot) ──
router.get("/auth/me", requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json({
    id: user.id,
    phone: user.phone,
    displayName: user.displayName,
    role: user.role,
    accountStatus: user.accountStatus,
    avatarUrl: user.avatarUrl,
    bannerColor: user.bannerColor,
  });
});

export default router;
