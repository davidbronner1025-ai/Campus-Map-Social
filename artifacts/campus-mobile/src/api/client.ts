import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppNotification, CampusLocation, ChatMsg, ConversationListItem, NearbyEvent, NearbyMessage, NearbyUser, UserProfile } from "./types";

const TOKEN_KEY = "campus_token";

const extraApiUrl = Constants.expoConfig?.extra?.apiUrl as string | undefined;
export const API_BASE = process.env.EXPO_PUBLIC_API_URL || extraApiUrl || "http://localhost:5000/api";

export async function getStoredToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function storeToken(token: string | null) {
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getStoredToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }

  return res.json();
}

export const requestOtp = (phone: string) =>
  apiFetch<{ success: boolean; otp: string }>("/auth/request-otp", { method: "POST", body: JSON.stringify({ phone }) });

export const verifyOtp = (phone: string, otp: string) =>
  apiFetch<{ token: string; userId: number; isNew: boolean }>("/auth/verify-otp", { method: "POST", body: JSON.stringify({ phone, otp }) });

export const getMe = () => apiFetch<UserProfile>("/me");
export const updateMe = (data: Partial<Omit<UserProfile, "id" | "phone" | "lat" | "lng" | "lastSeen">>) =>
  apiFetch<UserProfile>("/me", { method: "PUT", body: JSON.stringify(data) });
export const updateLocation = (lat: number, lng: number) =>
  apiFetch<{ ok: boolean }>("/me/location", { method: "PUT", body: JSON.stringify({ lat, lng }) });
export const getNearbyUsers = (lat: number, lng: number, radius = 500) =>
  apiFetch<NearbyUser[]>(`/users/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);

export const getNearbyMessages = (lat: number, lng: number, radius = 300) =>
  apiFetch<NearbyMessage[]>(`/messages/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
export const pinMessage = (data: { lat: number; lng: number; content: string; type?: "regular" | "invitation"; invitationType?: string; maxParticipants?: number; expiresInMinutes?: number }) =>
  apiFetch<NearbyMessage>("/messages", { method: "POST", body: JSON.stringify(data) });
export const deleteMessage = (id: number) => apiFetch<{ ok: boolean }>(`/messages/${id}`, { method: "DELETE" });
export const reactToMessage = (id: number, type: "yes" | "no" | "emoji", emoji?: string) =>
  apiFetch<{ id: number }>(`/messages/${id}/react`, { method: "POST", body: JSON.stringify({ type, emoji }) });

export const getNearbyEvents = (lat: number, lng: number, radius = 1000) =>
  apiFetch<NearbyEvent[]>(`/events/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
export const createEvent = (data: { title: string; description?: string; category?: string; lat: number; lng: number; startsAt: string; maxParticipants?: number; locationId?: number }) =>
  apiFetch<{ id: number }>("/events", { method: "POST", body: JSON.stringify(data) });
export const rsvpEvent = (id: number) => apiFetch<{ ok: boolean; status: string }>(`/events/${id}/rsvp`, { method: "POST" });
export const unrsvpEvent = (id: number) => apiFetch<{ ok: boolean; status: string }>(`/events/${id}/rsvp`, { method: "DELETE" });

export const getLocations = () => apiFetch<CampusLocation[]>("/locations");
export const getConversations = () => apiFetch<ConversationListItem[]>("/conversations");
export const createConversation = (data: { type?: "direct" | "group"; name?: string; memberIds: number[] }) =>
  apiFetch<{ id: number; type: string; name: string | null }>("/conversations", { method: "POST", body: JSON.stringify(data) });
export const getChatMessages = (convId: number, before?: number, limit = 50) =>
  apiFetch<ChatMsg[]>(`/conversations/${convId}/messages?limit=${limit}${before ? `&before=${before}` : ""}`);
export const sendChatMessage = (convId: number, data: { content: string; messageType?: "text" | "location"; lat?: number; lng?: number }) =>
  apiFetch<ChatMsg>(`/conversations/${convId}/messages`, { method: "POST", body: JSON.stringify(data) });

export const getNotifications = (limit = 30, before?: number) =>
  apiFetch<{ notifications: AppNotification[]; unreadCount: number }>(`/notifications?limit=${limit}${before ? `&before=${before}` : ""}`);

export const markNotificationRead = (id: number) =>
  apiFetch<{ ok: boolean }>(`/notifications/${id}/read`, { method: "PUT" });

export const markAllNotificationsRead = () =>
  apiFetch<{ ok: boolean }>(`/notifications/read-all`, { method: "PUT" });
