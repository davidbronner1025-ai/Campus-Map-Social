import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { readJson, writeJson } from "./storage";

const TOKEN_KEY = "campus_mobile_token";
const PROFILE_KEY = "campus_mobile_profile";
const MESSAGES_KEY = "campus_mobile_messages";
const DEMO_OTP = "123456";

export type UserProfile = {
  id: number;
  phone: string;
  displayName: string;
  title: string | null;
  avatarUrl: string | null;
  bannerColor: string;
  visibility: "campus" | "ghost";
  lat: number | null;
  lng: number | null;
  lastSeen: string | null;
};

export type NearbyMessage = {
  id: number;
  userId: number;
  lat: number;
  lng: number;
  content: string;
  type: "regular" | "invitation";
  invitationType: string | null;
  createdAt: string;
  author: { id: number; displayName: string; title: string | null; avatarUrl: string | null; bannerColor: string } | null;
  replyCount: number;
  reactions: { id: number; userId: number; type: "yes" | "no" | "emoji"; emoji: string | null }[];
};

export type NearbyEvent = {
  id: number;
  title: string;
  description: string | null;
  category: string;
  lat: number;
  lng: number;
  startsAt: string;
  rsvpCount: number;
};

export type NearbyUser = {
  id: number;
  displayName: string;
  title: string | null;
  avatarUrl: string | null;
  bannerColor: string;
  lat: number;
  lng: number;
  active: boolean;
};

export type Conversation = {
  id: number;
  name: string;
  lastMessage: string;
  updatedAt: string;
  unreadCount: number;
};

const extraApiUrl = Constants.expoConfig?.extra?.apiUrl as string | undefined;
const API_BASE = process.env.EXPO_PUBLIC_API_URL || extraApiUrl || "http://localhost:5000/api";

function demoProfile(phone = "+972501234567"): UserProfile {
  return {
    id: 1,
    phone,
    displayName: "Campus Student",
    title: "Student",
    avatarUrl: null,
    bannerColor: "#2f7ad7",
    visibility: "campus",
    lat: 31.8,
    lng: 35.2,
    lastSeen: new Date().toISOString()
  };
}

async function tokenHeaders() {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = await tokenHeaders();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...headers,
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err.error || "Request failed");
  }

  return response.json();
}

export async function getStoredToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function storeToken(token: string | null) {
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function requestOtp(phone: string) {
  try {
    return await apiFetch<{ success: boolean; otp: string }>("/auth/request-otp", {
      method: "POST",
      body: JSON.stringify({ phone })
    });
  } catch {
    await writeJson(PROFILE_KEY, demoProfile(phone));
    return { success: true, otp: DEMO_OTP };
  }
}

export async function verifyOtp(phone: string, otp: string) {
  try {
    return await apiFetch<{ token: string; userId: number; isNew: boolean }>("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ phone, otp })
    });
  } catch {
    if (otp !== DEMO_OTP) throw new Error(`Use demo OTP ${DEMO_OTP}`);
    await writeJson(PROFILE_KEY, demoProfile(phone));
    return { token: `demo:${phone}`, userId: 1, isNew: true };
  }
}

export async function getMe() {
  const token = await getStoredToken();
  if (!token) throw new Error("No token");
  if (!token.startsWith("demo:")) return apiFetch<UserProfile>("/me");
  const phone = token.replace("demo:", "");
  return readJson(PROFILE_KEY, demoProfile(phone));
}

export async function updateMe(data: Partial<UserProfile>) {
  const current = await getMe();
  const next = { ...current, ...data };
  await writeJson(PROFILE_KEY, next);
  return next;
}

export async function updateLocation(lat: number, lng: number) {
  const current = await getMe().catch(() => null);
  if (current) await writeJson(PROFILE_KEY, { ...current, lat, lng, lastSeen: new Date().toISOString() });
  return { ok: true };
}

export async function getNearbyMessages(lat: number, lng: number): Promise<NearbyMessage[]> {
  const stored = await readJson<NearbyMessage[]>(MESSAGES_KEY, []);
  if (stored.length) return stored;
  return [
    {
      id: 1,
      userId: 1,
      lat,
      lng,
      content: "Welcome to the mobile Campus preview.",
      type: "regular",
      invitationType: null,
      createdAt: new Date().toISOString(),
      author: { id: 1, displayName: "Campus Student", title: "Student", avatarUrl: null, bannerColor: "#2f7ad7" },
      replyCount: 0,
      reactions: []
    }
  ];
}

export async function pinMessage(data: { lat: number; lng: number; content: string; type?: "regular" | "invitation"; invitationType?: string }) {
  const current = await getNearbyMessages(data.lat, data.lng);
  const next: NearbyMessage = {
    id: Date.now(),
    userId: 1,
    lat: data.lat,
    lng: data.lng,
    content: data.content,
    type: data.type || "regular",
    invitationType: data.invitationType || null,
    createdAt: new Date().toISOString(),
    author: { id: 1, displayName: "Campus Student", title: "Student", avatarUrl: null, bannerColor: "#2f7ad7" },
    replyCount: 0,
    reactions: []
  };
  await writeJson(MESSAGES_KEY, [next, ...current]);
  return next;
}

export async function getNearbyEvents(lat: number, lng: number): Promise<NearbyEvent[]> {
  return [
    {
      id: 1,
      title: "Study meetup",
      description: "Demo event near your campus center.",
      category: "study_group",
      lat,
      lng,
      startsAt: new Date(Date.now() + 3600000).toISOString(),
      rsvpCount: 3
    }
  ];
}

export async function getNearbyUsers(lat: number, lng: number): Promise<NearbyUser[]> {
  return [
    { id: 2, displayName: "Dana", title: "Design club", avatarUrl: null, bannerColor: "#35c887", lat: lat + 0.001, lng: lng + 0.001, active: true },
    { id: 3, displayName: "Noam", title: "Computer science", avatarUrl: null, bannerColor: "#ffb545", lat: lat - 0.001, lng: lng - 0.001, active: false }
  ];
}

export async function getConversations(): Promise<Conversation[]> {
  return [
    { id: 1, name: "Dana", lastMessage: "See you near the library.", updatedAt: new Date().toISOString(), unreadCount: 1 },
    { id: 2, name: "Campus group", lastMessage: "Football later today?", updatedAt: new Date(Date.now() - 1800000).toISOString(), unreadCount: 0 }
  ];
}
