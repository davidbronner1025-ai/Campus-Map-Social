import {
  pgTable, serial, text, doublePrecision, integer,
  timestamp, jsonb, real, date
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

const latLngSchema = z.object({ lat: z.number(), lng: z.number() });

// ─── Campus ────────────────────────────────────────────────────────────────
export const campusTable = pgTable("campus", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  defaultZoom: integer("default_zoom").notNull().default(17),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCampusSchema = createInsertSchema(campusTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCampus = z.infer<typeof insertCampusSchema>;
export type Campus = typeof campusTable.$inferSelect;

// ─── Location ──────────────────────────────────────────────────────────────
export const locationTypeEnum = ["building", "dining_hall", "sports_field", "parking", "green", "other"] as const;
export type LocationType = typeof locationTypeEnum[number];

export const locationsTable = pgTable("locations", {
  id: serial("id").primaryKey(),
  campusId: integer("campus_id").notNull().references(() => campusTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").$type<LocationType>().notNull().default("other"),
  color: text("color").notNull().default("#6366f1"),
  adminName: text("admin_name"),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  polygon: jsonb("polygon").$type<{ lat: number; lng: number }[]>().notNull().default([]),
  osmName: text("osm_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertLocationSchema = createInsertSchema(locationsTable)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({ polygon: z.array(latLngSchema) });
export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type Location = typeof locationsTable.$inferSelect;

// ─── Announcements ─────────────────────────────────────────────────────────
export const priorityEnum = ["normal", "important", "urgent"] as const;
export type Priority = typeof priorityEnum[number];

export const announcementsTable = pgTable("announcements", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").notNull().references(() => locationsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  priority: text("priority").$type<Priority>().notNull().default("normal"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAnnouncementSchema = createInsertSchema(announcementsTable).omit({ id: true, createdAt: true });
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type Announcement = typeof announcementsTable.$inferSelect;

// ─── Schedules ─────────────────────────────────────────────────────────────
export const dayOfWeekEnum = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
export type DayOfWeek = typeof dayOfWeekEnum[number];

export const schedulesTable = pgTable("schedules", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").notNull().references(() => locationsTable.id, { onDelete: "cascade" }),
  dayOfWeek: text("day_of_week").$type<DayOfWeek>().notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  label: text("label").notNull(),
  instructor: text("instructor"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertScheduleSchema = createInsertSchema(schedulesTable).omit({ id: true, createdAt: true });
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type Schedule = typeof schedulesTable.$inferSelect;

// ─── Daily Menus ───────────────────────────────────────────────────────────
const menuItemSchema = z.object({
  name: z.string(),
  category: z.enum(["starter", "main", "side", "dessert", "drink"]),
});

export const menusTable = pgTable("menus", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").notNull().references(() => locationsTable.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  items: jsonb("items").$type<{ name: string; category: string }[]>().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const menuRatingsTable = pgTable("menu_ratings", {
  id: serial("id").primaryKey(),
  menuId: integer("menu_id").notNull().references(() => menusTable.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  raterName: text("rater_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMenuSchema = createInsertSchema(menusTable)
  .omit({ id: true, createdAt: true })
  .extend({ items: z.array(menuItemSchema) });
export type InsertMenu = z.infer<typeof insertMenuSchema>;
export type Menu = typeof menusTable.$inferSelect;

// ─── Game Sessions ─────────────────────────────────────────────────────────
export const sportEnum = ["football", "basketball", "volleyball", "tennis", "other"] as const;
export type Sport = typeof sportEnum[number];

export const gameSessionsTable = pgTable("game_sessions", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").notNull().references(() => locationsTable.id, { onDelete: "cascade" }),
  sport: text("sport").$type<Sport>().notNull().default("football"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  description: text("description"),
  maxPlayers: integer("max_players").default(10),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const gameVotesTable = pgTable("game_votes", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull().references(() => gameSessionsTable.id, { onDelete: "cascade" }),
  playerName: text("player_name").notNull(),
  votedAt: timestamp("voted_at").defaultNow().notNull(),
});

export const insertGameSchema = createInsertSchema(gameSessionsTable).omit({ id: true, createdAt: true });
export type InsertGame = z.infer<typeof insertGameSchema>;
export type GameSession = typeof gameSessionsTable.$inferSelect;
