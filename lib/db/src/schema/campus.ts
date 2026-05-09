import {
  pgTable, serial, text, doublePrecision, integer,
  timestamp, jsonb, real, date, boolean, uniqueIndex, index
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
  managerId: integer("manager_id").references(() => usersTable.id, { onDelete: "set null" }),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  polygon: jsonb("polygon").$type<{ lat: number; lng: number }[]>().notNull().default([]),
  osmName: text("osm_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("locations_campus_id_idx").on(table.campusId),
]);

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

// ─── Events ───────────────────────────────────────────────────────────────
export const eventCategoryEnum = ["study_group", "party", "sports", "club_meeting", "food", "other"] as const;
export type EventCategory = typeof eventCategoryEnum[number];

export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  creatorId: integer("creator_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  locationId: integer("location_id").references(() => locationsTable.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").$type<EventCategory>().notNull().default("other"),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  startsAt: timestamp("starts_at").notNull(),
  maxParticipants: integer("max_participants"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Event = typeof eventsTable.$inferSelect;

export const eventRsvpsTable = pgTable("event_rsvps", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => eventsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("event_rsvps_event_user_unique").on(table.eventId, table.userId),
]);

export type EventRsvp = typeof eventRsvpsTable.$inferSelect;

// ─── Users ─────────────────────────────────────────────────────────────────
export const visibilityEnum = ["campus", "ghost"] as const;
export type Visibility = typeof visibilityEnum[number];

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull().unique(),
  displayName: text("display_name").notNull().default(""),
  title: text("title"),
  avatarUrl: text("avatar_url"),
  bannerUrl: text("banner_url"),
  bannerColor: text("banner_color").notNull().default("#1a2a3a"),
  visibility: text("visibility").$type<Visibility>().notNull().default("campus"),
  sessionToken: text("session_token").unique(),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  lastSeen: timestamp("last_seen").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("users_session_token_idx").on(table.sessionToken),
  index("users_visibility_idx").on(table.visibility),
]);

export type User = typeof usersTable.$inferSelect;

// ─── OTP ───────────────────────────────────────────────────────────────────
export const userOtpsTable = pgTable("user_otps", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull(),
  otp: text("otp").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("user_otps_phone_idx").on(table.phone),
]);

// ─── Messages ──────────────────────────────────────────────────────────────
export const invitationTypeEnum = ["smoke", "carpool", "phone_game", "food_order", "football"] as const;
export type InvitationType = typeof invitationTypeEnum[number];

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  content: text("content").notNull(),
  type: text("type").$type<"regular" | "invitation">().notNull().default("regular"),
  invitationType: text("invitation_type").$type<InvitationType>(),
  maxParticipants: integer("max_participants"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("messages_user_id_idx").on(table.userId),
  index("messages_created_at_idx").on(table.createdAt),
  index("messages_lat_lng_idx").on(table.lat, table.lng),
]);

export type Message = typeof messagesTable.$inferSelect;

// ─── Conversations (DM & Group Chat) ──────────────────────────────────────
export const conversationTypeEnum = ["direct", "group"] as const;
export type ConversationType = typeof conversationTypeEnum[number];

export const conversationsTable = pgTable("conversations", {
  id: serial("id").primaryKey(),
  type: text("type").$type<ConversationType>().notNull().default("direct"),
  name: text("name"),
  creatorId: integer("creator_id").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Conversation = typeof conversationsTable.$inferSelect;

export const conversationMembersTable = pgTable("conversation_members", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversationsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  lastReadMessageId: integer("last_read_message_id"),
}, (table) => [
  uniqueIndex("conv_member_unique").on(table.conversationId, table.userId),
]);

export type ConversationMember = typeof conversationMembersTable.$inferSelect;

export const chatMessagesTable = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversationsTable.id, { onDelete: "cascade" }),
  senderId: integer("sender_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  messageType: text("message_type").$type<"text" | "location">().notNull().default("text"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("chat_messages_conversation_id_idx").on(table.conversationId),
  index("chat_messages_created_at_idx").on(table.createdAt),
]);

export type ChatMessage = typeof chatMessagesTable.$inferSelect;

// ─── Notifications ─────────────────────────────────────────────────────────
export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type").$type<"reaction" | "reply" | "event_join" | "nearby_event" | "chat_message">().notNull(),
  referenceId: integer("reference_id"),
  referenceType: text("reference_type").$type<"message" | "event" | "conversation">(),
  content: text("content").notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("notifications_user_id_read_idx").on(table.userId, table.read),
  index("notifications_user_id_idx").on(table.userId),
]);

export type Notification = typeof notificationsTable.$inferSelect;

// ─── Message Reactions ──────────────────────────────────────────────────────
export const messageReactionsTable = pgTable("message_reactions", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull().references(() => messagesTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type").$type<"yes" | "no" | "emoji">().notNull(),
  emoji: text("emoji"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("message_reactions_message_id_idx").on(table.messageId),
]);

// ─── Message Replies ────────────────────────────────────────────────────────
export const messageRepliesTable = pgTable("message_replies", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull().references(() => messagesTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("message_replies_message_id_idx").on(table.messageId),
]);
