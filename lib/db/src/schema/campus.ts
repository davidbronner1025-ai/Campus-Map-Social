import { pgTable, serial, text, doublePrecision, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

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

export const zoneTypeEnum = ["academic", "dining", "sports", "social", "admin", "parking", "green", "other"] as const;
export type ZoneType = typeof zoneTypeEnum[number];

const latLngSchema = z.object({ lat: z.number(), lng: z.number() });

export const zonesTable = pgTable("zones", {
  id: serial("id").primaryKey(),
  campusId: integer("campus_id").notNull().references(() => campusTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").$type<ZoneType>().notNull().default("other"),
  color: text("color").notNull().default("#3B82F6"),
  polygon: jsonb("polygon").$type<{ lat: number; lng: number }[]>().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertZoneSchema = createInsertSchema(zonesTable).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  polygon: z.array(latLngSchema),
});
export type InsertZone = z.infer<typeof insertZoneSchema>;
export type Zone = typeof zonesTable.$inferSelect;
