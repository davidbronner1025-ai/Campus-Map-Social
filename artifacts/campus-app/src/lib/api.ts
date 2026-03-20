const API_BASE = "/api";

function getToken(): string | null {
  return localStorage.getItem("campus_token");
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

// Auth
export const requestOtp = (phone: string) =>
  apiFetch<{ success: boolean; otp: string }>("/auth/request-otp", {
    method: "POST", body: JSON.stringify({ phone }),
  });

export const verifyOtp = (phone: string, otp: string) =>
  apiFetch<{ token: string; userId: number; isNew: boolean }>("/auth/verify-otp", {
    method: "POST", body: JSON.stringify({ phone, otp }),
  });

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
  lat: number | null;
  lng: number | null;
  lastSeen: string | null;
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

export const leaveGroup = (convId: number) =>
  apiFetch<{ ok: boolean }>(`/conversations/${convId}/members`, { method: "DELETE" });
