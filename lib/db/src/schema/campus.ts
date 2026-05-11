import {
  pgTable, serial, text, doublePrecision, integer,
  timestamp, jsonb, real, date, boolean, uniqueIndex, index
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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

// Floor data type for a single floor
export type FloorRoom = { name: string; room: string; type: "class" | "lab" | "admin" | "quiet" | "service" | "wc" | "other" };
export type FloorEntry = {
  floor: number;
  label: string;
  rooms: FloorRoom[];
  notes?: string;
  available?: number;   // e.g. library seats
  waitTime?: number;    // e.g. cafeteria wait minutes
};

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
  floorData: jsonb("floor_data").$type<FloorEntry[]>().default([]),
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

export const userRoleEnum = ["user", "moderator", "admin"] as const;
export type UserRole = typeof userRoleEnum[number];

export const accountStatusEnum = ["active", "suspended", "deleted"] as const;
export type AccountStatus = typeof accountStatusEnum[number];

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull().unique(),
  displayName: text("display_name").notNull().default(""),
  title: text("title"),
  avatarUrl: text("avatar_url"),
  bannerUrl: text("banner_url"),
  bannerColor: text("banner_color").notNull().default("#1a2a3a"),
  visibility: text("visibility").$type<Visibility>().notNull().default("campus"),
  role: text("role").$type<UserRole>().notNull().default("user"),
  accountStatus: text("account_status").$type<AccountStatus>().notNull().default("active"),
  // Legacy single-token field — kept for backward compat during migration; new code uses userSessionsTable.
  sessionToken: text("session_token").unique(),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  lastSeen: timestamp("last_seen").defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("users_role_idx").on(table.role),
]);

export type User = typeof usersTable.$inferSelect;

// ─── OTP ───────────────────────────────────────────────────────────────────
export const userOtpsTable = pgTable("user_otps", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull(),
  otp: text("otp").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("user_otps_phone_created_idx").on(table.phone, table.createdAt),
]);

// ─── User Sessions (multi-device) ──────────────────────────────────────────
export const userSessionsTable = pgTable("user_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  deviceId: text("device_id"),
  platform: text("platform"),       // "web" | "ios" | "android"
  appVersion: text("app_version"),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
}, (table) => [
  index("sessions_user_id_idx").on(table.userId),
  index("sessions_token_idx").on(table.token),
]);

export type UserSession = typeof userSessionsTable.$inferSelect;

// ─── Trusted Devices ───────────────────────────────────────────────────────
export const deviceTrustEnum = ["unverified", "trusted", "revoked"] as const;
export type DeviceTrust = typeof deviceTrustEnum[number];

export const userDevicesTable = pgTable("user_devices", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  deviceId: text("device_id").notNull(),
  platform: text("platform"),
  appVersion: text("app_version"),
  trustStatus: text("trust_status").$type<DeviceTrust>().notNull().default("unverified"),
  firstSeenAt: timestamp("first_seen_at").defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("user_devices_user_device_unique").on(table.userId, table.deviceId),
]);

export type UserDevice = typeof userDevicesTable.$inferSelect;

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
  index("messages_created_at_idx").on(table.createdAt),
  index("messages_user_id_idx").on(table.userId),
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
  index("chat_msgs_conv_created_idx").on(table.conversationId, table.createdAt),
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
  index("notifications_user_created_idx").on(table.userId, table.createdAt),
  index("notifications_user_read_idx").on(table.userId, table.read),
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
});

// ─── Message Replies ────────────────────────────────────────────────────────
export const messageRepliesTable = pgTable("message_replies", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull().references(() => messagesTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Issue Reports ──────────────────────────────────────────────────────────
export const issueStatusEnum = ["open", "in_progress", "resolved"] as const;
export type IssueStatus = typeof issueStatusEnum[number];

export const issueReportsTable = pgTable("issue_reports", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").references(() => locationsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  floor: integer("floor"),
  category: text("category").notNull(),
  description: text("description"),
  status: text("status").$type<IssueStatus>().notNull().default("open"),
  isPublic: boolean("is_public").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertIssueReportSchema = createInsertSchema(issueReportsTable).omit({ id: true, createdAt: true, updatedAt: true, status: true });
export type IssueReport = typeof issueReportsTable.$inferSelect;

// ─── Campus Shops ───────────────────────────────────────────────────────────
export type ShopMenuItem = { name: string; price: string; tag?: string };

export const campusShopsTable = pgTable("campus_shops", {
  id: serial("id").primaryKey(),
  campusId: integer("campus_id").notNull().references(() => campusTable.id, { onDelete: "cascade" }),
  locationId: integer("location_id").references(() => locationsTable.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("🏪"),
  description: text("description"),
  hours: text("hours"),
  discount: text("discount"),
  color: text("color").notNull().default("#6366f1"),
  menuItems: jsonb("menu_items").$type<ShopMenuItem[]>().default([]),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertShopSchema = createInsertSchema(campusShopsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type CampusShop = typeof campusShopsTable.$inferSelect;

// ─── Bulletin Board ────────────────────────────────────────────────────────
export const bulletinCategoryEnum = ["social", "lostfound", "market"] as const;
export type BulletinCategory = typeof bulletinCategoryEnum[number];

// subType usage:
//   social    -> null
//   lostfound -> "lost" | "found"
//   market    -> free-form item tag (e.g. "ספרים", "ריהוט", "שירותים")
export const bulletinPostsTable = pgTable("bulletin_posts", {
  id: serial("id").primaryKey(),
  campusId: integer("campus_id").notNull().references(() => campusTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  category: text("category").$type<BulletinCategory>().notNull(),
  subType: text("sub_type"),
  text: text("text").notNull(),
  price: text("price"),
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  likesCount: integer("likes_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("bulletin_category_created_idx").on(table.category, table.createdAt),
  index("bulletin_user_idx").on(table.userId),
]);

export type BulletinPost = typeof bulletinPostsTable.$inferSelect;

export const bulletinPostLikesTable = pgTable("bulletin_post_likes", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => bulletinPostsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("bulletin_likes_post_user_unique").on(table.postId, table.userId),
]);

export type BulletinPostLike = typeof bulletinPostLikesTable.$inferSelect;
