const API_BASE = "/api";

export const TOKEN_KEY = "campus_token";
const DEVICE_ID_KEY = "campus_device_id";
const APP_VERSION = "1.0.0";

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

// Stable per-browser device ID (created once, persisted in localStorage).
// This is a pseudonymous identifier — NOT linked to phone-level identifiers.
export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    const random = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    id = `web-${random}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function platformLabel(): string {
  return "web";
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

// 401 handler: when the server rejects our token (revoked / expired / blocked),
// clear local state and force the user back to /auth. Single chokepoint avoids
// stale-token zombies on the dashboard.
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) { onUnauthorized = fn; }

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) },
  });
  if (res.status === 401 && getToken()) {
    // Token was rejected — clear and redirect.
    localStorage.removeItem(TOKEN_KEY);
    onUnauthorized?.();
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

// ─── Auth ─────────────────────────────────────────────────────────────────
export const requestOtp = (phone: string) =>
  apiFetch<{ success: boolean; otp?: string }>("/auth/request-otp", {
    method: "POST", body: JSON.stringify({ phone }),
  });

export type VerifyOtpResponse = {
  token: string;
  sessionId: number;
  expiresAt: string;
  userId: number;
  role: "user" | "moderator" | "admin";
  isNew: boolean;
  isNewDevice: boolean;
};

export const verifyOtp = (phone: string, otp: string) =>
  apiFetch<VerifyOtpResponse>("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({
      phone, otp,
      deviceId: getDeviceId(),
      platform: platformLabel(),
      appVersion: APP_VERSION,
    }),
  });

export type AuthMe = {
  id: number;
  phone: string;
  displayName: string;
  role: "user" | "moderator" | "admin";
  accountStatus: "active" | "suspended" | "deleted";
  avatarUrl: string | null;
  bannerColor: string;
};

export const getAuthMe = () => apiFetch<AuthMe>("/auth/me");

export const logoutCurrentSession = () =>
  apiFetch<{ success: boolean }>("/auth/logout", { method: "POST" });

export const logoutAllSessions = () =>
  apiFetch<{ success: boolean }>("/auth/logout-all", { method: "POST" });

export type ActiveSession = {
  id: number;
  deviceId: string | null;
  platform: string | null;
  appVersion: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  isCurrent: boolean;
};

export const listSessions = () => apiFetch<ActiveSession[]>("/auth/sessions");
export const revokeSession = (id: number) =>
  apiFetch<{ success: boolean }>(`/auth/sessions/${id}`, { method: "DELETE" });

// User
export type UserProfile = {
  id: number;
  phone: string;
  displayName: string;
  title: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bannerColor: string;
  visibility: "campus" | "ghost";
  role: "user" | "moderator" | "admin";
  accountStatus: "active" | "suspended" | "deleted";
  lat: number | null;
  lng: number | null;
  lastSeen: string | null;
  lastLoginAt: string | null;
};

export type NearbyUser = {
  id: number;
  displayName: string;
  title: string | null;
  avatarUrl: string | null;
  bannerColor: string;
  visibility: string;
  lat: number;
  lng: number;
  lastSeen: string | null;
  active: boolean;
};

export const getMe = () => apiFetch<UserProfile>("/me");
export const updateMe = (data: Partial<Omit<UserProfile, "id" | "phone" | "lat" | "lng" | "lastSeen">>) =>
  apiFetch<UserProfile>("/me", { method: "PUT", body: JSON.stringify(data) });
export const updateLocation = (lat: number, lng: number) =>
  apiFetch<{ ok: boolean }>("/me/location", { method: "PUT", body: JSON.stringify({ lat, lng }) });

export const getNearbyUsers = (lat: number, lng: number, radius = 500) =>
  apiFetch<NearbyUser[]>(`/users/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);

// Messages
export type Author = { id: number; displayName: string; title: string | null; avatarUrl: string | null; bannerColor: string };
export type Reaction = { id: number; userId: number; type: "yes" | "no" | "emoji"; emoji: string | null };
export type NearbyMessage = {
  id: number; userId: number; lat: number; lng: number;
  content: string; type: "regular" | "invitation";
  invitationType: "smoke" | "carpool" | "phone_game" | "food_order" | "football" | null;
  maxParticipants: number | null; expiresAt: string | null; createdAt: string;
  author: Author | null; reactions: Reaction[]; replyCount: number;
};
export type Reply = { id: number; messageId: number; userId: number; content: string; createdAt: string; author: { id: number; displayName: string; avatarUrl: string | null } | null };

export const getNearbyMessages = (lat: number, lng: number, radius = 300) =>
  apiFetch<NearbyMessage[]>(`/messages/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);

export const pinMessage = (data: {
  lat: number; lng: number; content: string;
  type?: "regular" | "invitation";
  invitationType?: string; maxParticipants?: number; expiresInMinutes?: number;
}) => apiFetch<NearbyMessage>("/messages", { method: "POST", body: JSON.stringify(data) });

export const deleteMessage = (id: number) =>
  apiFetch<{ ok: boolean }>(`/messages/${id}`, { method: "DELETE" });

export const reactToMessage = (id: number, type: "yes" | "no" | "emoji", emoji?: string) =>
  apiFetch<Reaction>(`/messages/${id}/react`, { method: "POST", body: JSON.stringify({ type, emoji }) });

export const getReplies = (id: number) =>
  apiFetch<Reply[]>(`/messages/${id}/replies`);

export const postReply = (id: number, content: string) =>
  apiFetch<Reply>(`/messages/${id}/replies`, { method: "POST", body: JSON.stringify({ content }) });

// Events
export type EventCreator = { id: number; displayName: string; avatarUrl: string | null; bannerColor: string };
export type EventRsvpUser = { id: number; userId: number; displayName: string | null; avatarUrl: string | null };
export type NearbyEvent = {
  id: number; creatorId: number; locationId: number | null;
  title: string; description: string | null;
  category: "study_group" | "party" | "sports" | "club_meeting" | "food" | "other";
  lat: number; lng: number; startsAt: string;
  maxParticipants: number | null; createdAt: string;
  creator: EventCreator | null;
  rsvpCount: number; rsvps: EventRsvpUser[];
  distance: number;
};

export const getNearbyEvents = (lat: number, lng: number, radius = 1000) =>
  apiFetch<NearbyEvent[]>(`/events/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);

export const createEvent = (data: {
  title: string; description?: string; category?: string;
  lat: number; lng: number; startsAt: string;
  maxParticipants?: number; locationId?: number;
}) => apiFetch<{ id: number; title: string; category: string; lat: number; lng: number; startsAt: string }>("/events", { method: "POST", body: JSON.stringify(data) });

export const deleteEvent = (id: number) =>
  apiFetch<{ ok: boolean }>(`/events/${id}`, { method: "DELETE" });

export const rsvpEvent = (id: number) =>
  apiFetch<{ ok: boolean; status: string }>(`/events/${id}/rsvp`, { method: "POST" });

export const unrsvpEvent = (id: number) =>
  apiFetch<{ ok: boolean; status: string }>(`/events/${id}/rsvp`, { method: "DELETE" });

// Chat
export type ConversationMemberInfo = {
  userId: number; displayName: string | null; avatarUrl: string | null; bannerColor: string | null;
};
export type LastMessage = {
  id: number; content: string; messageType: "text" | "location"; senderId: number; createdAt: string;
};
export type ConversationListItem = {
  id: number; type: "direct" | "group"; name: string | null;
  creatorId: number | null; createdAt: string; updatedAt: string;
  members: ConversationMemberInfo[];
  lastMessage: LastMessage | null;
  unreadCount: number;
};
export type ChatMsg = {
  id: number; conversationId: number; senderId: number;
  content: string; messageType: "text" | "location";
  lat: number | null; lng: number | null; createdAt: string;
  senderName: string; senderAvatar: string | null; senderBannerColor: string;
};

export const getConversations = () =>
  apiFetch<ConversationListItem[]>("/conversations");

export const createConversation = (data: { type?: "direct" | "group"; name?: string; memberIds: number[] }) =>
  apiFetch<{ id: number; type: string; name: string | null }>("/conversations", { method: "POST", body: JSON.stringify(data) });

export const getChatMessages = (convId: number, before?: number, limit = 50) =>
  apiFetch<ChatMsg[]>(`/conversations/${convId}/messages?limit=${limit}${before ? `&before=${before}` : ""}`);

export const sendChatMessage = (convId: number, data: { content: string; messageType?: "text" | "location"; lat?: number; lng?: number }) =>
  apiFetch<ChatMsg>(`/conversations/${convId}/messages`, { method: "POST", body: JSON.stringify(data) });

export const addGroupMember = (convId: number, userId: number) =>
  apiFetch<{ ok: boolean }>(`/conversations/${convId}/members`, { method: "POST", body: JSON.stringify({ userId }) });

export const markConversationRead = (convId: number) =>
  apiFetch<{ ok: boolean; lastReadMessageId: number }>(`/conversations/${convId}/read`, { method: "POST" });

export const leaveGroup = (convId: number) =>
  apiFetch<{ ok: boolean }>(`/conversations/${convId}/members`, { method: "DELETE" });

export const removeGroupMember = (convId: number, userId: number) =>
  apiFetch<{ ok: boolean }>(`/conversations/${convId}/members?userId=${userId}`, { method: "DELETE" });

// Locations
export type FloorRoom = { name: string; room: string; type: string };
export type FloorEntry = {
  floor: number;
  label: string;
  rooms: FloorRoom[];
  notes?: string;
  available?: number;
  waitTime?: number;
};

export type CampusLocation = {
  id: number;
  name: string;
  description: string | null;
  type: string;
  color: string;
  lat: number;
  lng: number;
  polygon: { lat: number; lng: number }[];
  adminName: string | null;
  managerName: string | null;
  floorData?: FloorEntry[] | null;
};

export type LocationAnnouncement = {
  id: number;
  title: string;
  content: string;
  priority: "normal" | "important" | "urgent";
  createdAt: string;
};

export type LocationSchedule = {
  id: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  label: string;
  instructor: string | null;
};

export type LocationMenu = {
  id: number;
  date: string;
  items: { name: string; category: string }[];
  averageRating: number;
  ratingCount: number;
};

export type LocationGame = {
  id: number;
  sport: string;
  scheduledAt: string;
  description: string | null;
  maxPlayers: number;
  votes: { playerName: string }[];
};

export const getLocations = () =>
  apiFetch<CampusLocation[]>("/locations");

export const getLocationAnnouncements = (locationId: number) =>
  apiFetch<LocationAnnouncement[]>(`/locations/${locationId}/announcements`);

export const getLocationSchedules = (locationId: number) =>
  apiFetch<LocationSchedule[]>(`/locations/${locationId}/schedules`);

export const getLocationMenus = (locationId: number) =>
  apiFetch<LocationMenu[]>(`/locations/${locationId}/menus`);

export const getLocationGames = (locationId: number) =>
  apiFetch<LocationGame[]>(`/locations/${locationId}/games`);

// Notifications
export type AppNotification = {
  id: number;
  userId: number;
  type: "reaction" | "reply" | "event_join" | "nearby_event" | "chat_message";
  referenceId: number | null;
  referenceType: "message" | "event" | "conversation" | null;
  content: string;
  read: boolean;
  createdAt: string;
};

export const getNotifications = (limit = 30, before?: number) =>
  apiFetch<{ notifications: AppNotification[]; unreadCount: number }>(`/notifications?limit=${limit}${before ? `&before=${before}` : ""}`);

export const markNotificationRead = (id: number) =>
  apiFetch<{ ok: boolean }>(`/notifications/${id}/read`, { method: "PUT" });

export const markAllNotificationsRead = () =>
  apiFetch<{ ok: boolean }>(`/notifications/read-all`, { method: "PUT" });

// Issue Reports
export type IssueReport = {
  id: number;
  locationId: number | null;
  floor: number | null;
  category: string;
  description: string | null;
  status: "open" | "in_progress" | "resolved";
  isPublic: boolean;
  createdAt: string;
  locationName: string | null;
  reporterName: string | null;
};

export const getLocationIssues = (locationId: number) =>
  apiFetch<IssueReport[]>(`/issues?locationId=${locationId}`);

export const submitIssue = (data: {
  locationId?: number;
  floor?: number;
  category: string;
  description?: string;
  isPublic?: boolean;
}) => apiFetch<IssueReport>("/issues", { method: "POST", body: JSON.stringify(data) });

// Shops / Deals
export type ShopMenuItem = { name: string; price: string; description?: string };
export type CampusShop = {
  id: number;
  name: string;
  icon: string;
  description: string | null;
  hours: string | null;
  discount: string | null;
  color: string;
  menuItems: ShopMenuItem[];
  active: boolean;
  sortOrder: number;
};

export const getShops = () =>
  apiFetch<CampusShop[]>("/shops");

// Crowd Density
export type CrowdData = { count: number; density: number };

export const getLocationCrowd = (locationId: number) =>
  apiFetch<CrowdData>(`/locations/${locationId}/crowd`);

// User Activity Stats
export type UserStats = {
  messagesPosted: number;
  eventsJoined: number;
  issuesReported: number;
};

export const getMyStats = () =>
  apiFetch<UserStats>("/users/me/stats");

// Bulletin Board
export type BulletinCategory = "social" | "lostfound" | "market";

export type BulletinPost = {
  id: number;
  campusId: number;
  userId: number;
  category: BulletinCategory;
  subType: string | null;
  text: string;
  price: string | null;
  isAnonymous: boolean;
  likesCount: number;
  createdAt: string;
  authorName: string | null;
  authorAvatarUrl: string | null;
  authorBannerColor: string | null;
  likedByMe: boolean;
  isMine: boolean;
};

export const getBulletinPosts = (category?: BulletinCategory) =>
  apiFetch<BulletinPost[]>(`/bulletin${category ? `?category=${category}` : ""}`);

export const createBulletinPost = (data: {
  category: BulletinCategory;
  subType?: string | null;
  text: string;
  price?: string | null;
  isAnonymous?: boolean;
}) => apiFetch<BulletinPost>("/bulletin", { method: "POST", body: JSON.stringify(data) });

export const deleteBulletinPost = (id: number) =>
  apiFetch<{ ok: boolean }>(`/bulletin/${id}`, { method: "DELETE" });

export const toggleBulletinLike = (id: number) =>
  apiFetch<{ ok: boolean; liked: boolean; likesCount: number }>(`/bulletin/${id}/like`, { method: "POST" });
