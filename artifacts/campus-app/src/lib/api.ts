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
