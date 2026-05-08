import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

// ── Replit Auth users ─────────────────────────────────────────────────────────
// Stores the identity returned by Replit's OIDC provider. Sub claim → id.
export const replitUsersTable = pgTable("replit_users", {
  id: text("id").primaryKey(),
  email: text("email"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ReplitUser = typeof replitUsersTable.$inferSelect;

// ── Server-side sessions ───────────────────────────────────────────────────────
// Opaque session records keyed by random 32-byte hex SID, stored in a cookie.
// `sess` is a JSON blob containing the full SessionData (user + tokens).
export const sessionsTable = pgTable("sessions", {
  sid: text("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

export type Session = typeof sessionsTable.$inferSelect;
