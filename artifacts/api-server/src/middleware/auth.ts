import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable, userSessionsTable, userDevicesTable, type User, type UserRole } from "@workspace/db/schema";
import { eq, and, isNull, gt, ne } from "drizzle-orm";
import crypto from "crypto";

// ─── Types ────────────────────────────────────────────────────────────────
export interface AuthedRequest extends Request {
  user: User;
  session: { id: number; token: string; deviceId: string | null };
}

// ─── Token helpers ────────────────────────────────────────────────────────
export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

const SESSION_TTL_DAYS = 30;

export function sessionExpiry(): Date {
  return new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
}

// ─── Session creation (multi-device) ──────────────────────────────────────
export async function createSession(opts: {
  userId: number;
  deviceId?: string | null;
  platform?: string | null;
  appVersion?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
}): Promise<{ token: string; sessionId: number; expiresAt: Date }> {
  const token = generateToken();
  const expiresAt = sessionExpiry();
  const inserted = await db.insert(userSessionsTable).values({
    userId: opts.userId,
    token,
    deviceId: opts.deviceId ?? null,
    platform: opts.platform ?? null,
    appVersion: opts.appVersion ?? null,
    userAgent: opts.userAgent ?? null,
    ipAddress: opts.ipAddress ?? null,
    expiresAt,
  }).returning({ id: userSessionsTable.id });
  // Mirror token onto users.session_token for legacy clients during the migration window.
  // (Last-write-wins; not used for auth lookup anymore — sessions table is source of truth.)
  await db.update(usersTable).set({ sessionToken: token, lastLoginAt: new Date() }).where(eq(usersTable.id, opts.userId));
  return { token, sessionId: inserted[0].id, expiresAt };
}

// ─── Device registration ──────────────────────────────────────────────────
export async function registerDevice(opts: {
  userId: number;
  deviceId: string;
  platform?: string | null;
  appVersion?: string | null;
}): Promise<{ isNewDevice: boolean }> {
  const existing = await db.select().from(userDevicesTable)
    .where(and(eq(userDevicesTable.userId, opts.userId), eq(userDevicesTable.deviceId, opts.deviceId)))
    .limit(1);
  if (existing.length) {
    await db.update(userDevicesTable)
      .set({ lastSeenAt: new Date(), platform: opts.platform ?? existing[0].platform, appVersion: opts.appVersion ?? existing[0].appVersion })
      .where(eq(userDevicesTable.id, existing[0].id));
    return { isNewDevice: false };
  }
  await db.insert(userDevicesTable).values({
    userId: opts.userId,
    deviceId: opts.deviceId,
    platform: opts.platform ?? null,
    appVersion: opts.appVersion ?? null,
    trustStatus: "unverified",
  });
  return { isNewDevice: true };
}

// ─── requireAuth middleware (centralized) ─────────────────────────────────
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;
    if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }

    // Look up session by token, must be unrevoked and unexpired
    const now = new Date();
    const rows = await db
      .select({
        userId: userSessionsTable.userId,
        sessionId: userSessionsTable.id,
        sessionToken: userSessionsTable.token,
        sessionDeviceId: userSessionsTable.deviceId,
        user: usersTable,
      })
      .from(userSessionsTable)
      .innerJoin(usersTable, eq(usersTable.id, userSessionsTable.userId))
      .where(and(
        eq(userSessionsTable.token, token),
        isNull(userSessionsTable.revokedAt),
        gt(userSessionsTable.expiresAt, now),
      ))
      .limit(1);

    if (!rows.length) {
      res.status(401).json({ error: "Invalid or expired session" });
      return;
    }
    const row = rows[0];

    // Block suspended/deleted accounts
    if (row.user.accountStatus !== "active") {
      res.status(403).json({ error: "Account is not active" });
      return;
    }

    // Touch lastSeenAt on session and user (fire-and-forget)
    db.update(userSessionsTable).set({ lastSeenAt: now }).where(eq(userSessionsTable.id, row.sessionId)).catch(() => {});
    db.update(usersTable).set({ lastSeen: now }).where(eq(usersTable.id, row.userId)).catch(() => {});

    (req as AuthedRequest).user = row.user;
    (req as AuthedRequest).session = { id: row.sessionId, token: row.sessionToken, deviceId: row.sessionDeviceId };
    next();
  } catch (err) {
    console.error("[auth] requireAuth failed", err);
    res.status(500).json({ error: "Authentication error" });
  }
}

// ─── Role-based middleware ────────────────────────────────────────────────
export function requireRole(...allowed: UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // requireAuth must run first
    const user = (req as AuthedRequest).user;
    if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
    if (!allowed.includes(user.role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}

export const requireAdmin = requireRole("admin");
export const requireModerator = requireRole("admin", "moderator");

// ─── Session revocation ───────────────────────────────────────────────────
export async function revokeSession(sessionId: number): Promise<void> {
  await db.update(userSessionsTable)
    .set({ revokedAt: new Date() })
    .where(eq(userSessionsTable.id, sessionId));
}

export async function revokeSessionByToken(token: string): Promise<void> {
  await db.update(userSessionsTable)
    .set({ revokedAt: new Date() })
    .where(eq(userSessionsTable.token, token));
}

export async function revokeAllUserSessions(userId: number, exceptSessionId?: number): Promise<void> {
  // Build the WHERE clause. When exceptSessionId is provided we exclude that one
  // session from the revocation so the caller keeps an active session.
  const conditions: Parameters<typeof and> = [
    eq(userSessionsTable.userId, userId),
    isNull(userSessionsTable.revokedAt),
  ];
  if (exceptSessionId !== undefined) {
    conditions.push(ne(userSessionsTable.id, exceptSessionId));
  }
  await db.update(userSessionsTable)
    .set({ revokedAt: new Date() })
    .where(and(...conditions));
}
