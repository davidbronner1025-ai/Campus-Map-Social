// Central API helper for the admin panel.
//
// - Stores the admin's auth token under a dedicated localStorage key so it
//   never collides with the campus-app's user token (different browser tab).
// - Wraps fetch with the Authorization header so every admin API call is
//   authenticated.
// - Installs the same token into the generated react-query client
//   (@workspace/api-client-react) via setAuthTokenProvider.
// - Centralises the 401 handler: if any request returns 401 we wipe the
//   stored token and reload, which sends the user back through the OTP
//   login flow.
import {
  setAuthTokenProvider,
  setUnauthorizedHandler as setReactQueryUnauthorizedHandler,
} from "@workspace/api-client-react";

const TOKEN_KEY = "campus_admin_token";
const DEVICE_KEY = "campus_admin_device_id";

export type AdminUser = {
  id: number;
  phone: string;
  displayName: string;
  role: "user" | "moderator" | "admin";
  accountStatus: "active" | "suspended" | "deleted";
  avatarUrl: string | null;
  bannerColor: string;
  visibility: "campus" | "ghost";
  lastLoginAt: string | null;
};

// ── Token storage ────────────────────────────────────────────────────────────
export function getAdminToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function setAdminToken(t: string | null): void {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* storage disabled */ }
}

// Stable per-browser device id so the server can list/revoke admin sessions.
export function getAdminDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = (crypto?.randomUUID?.() ?? `admin-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return `admin-${Date.now()}`;
  }
}

// ── Fetch wrapper ────────────────────────────────────────────────────────────
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(fn: (() => void) | null): void {
  unauthorizedHandler = fn;
  // Mirror into the generated client so its requests share the same handler.
  setReactQueryUnauthorizedHandler(fn);
}

// Expose the token to the generated react-query client so its hooks send the
// Authorization header automatically.
setAuthTokenProvider(() => getAdminToken());

export async function adminFetch<T = any>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = getAdminToken();
  const headers = new Headers(init.headers);
  if (token && !headers.has("authorization")) headers.set("authorization", `Bearer ${token}`);
  if (init.body && !headers.has("content-type") && typeof init.body === "string") {
    headers.set("content-type", "application/json");
  }
  const url = path.startsWith("http") ? path : path.startsWith("/api") ? path : `/api${path}`;
  const res = await fetch(url, { ...init, headers });
  if (res.status === 401) {
    if (unauthorizedHandler) try { unauthorizedHandler(); } catch { /* ignore */ }
  }
  if (!res.ok) {
    let detail = "";
    try { detail = (await res.json()).error || ""; } catch { /* not json */ }
    throw new Error(detail || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null as T;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return (await res.json()) as T;
  return (await res.text()) as unknown as T;
}

// ── Auth endpoints ───────────────────────────────────────────────────────────
export type RequestOtpResponse = { success: boolean; otp?: string };
export type VerifyOtpResponse = {
  token: string;
  userId: number;
  role: "user" | "moderator" | "admin";
  isNew: boolean;
  isNewDevice: boolean;
};

export async function requestOtp(phone: string): Promise<RequestOtpResponse> {
  return adminFetch<RequestOtpResponse>("/auth/request-otp", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

export async function verifyOtp(phone: string, otp: string): Promise<VerifyOtpResponse> {
  return adminFetch<VerifyOtpResponse>("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({
      phone, otp,
      deviceId: getAdminDeviceId(),
      platform: "admin-web",
      appVersion: "admin-1.0",
    }),
  });
}

export async function getMe(): Promise<AdminUser> {
  return adminFetch<AdminUser>("/me");
}

export async function logoutAdmin(): Promise<void> {
  try { await adminFetch("/auth/logout", { method: "POST" }); } catch { /* best-effort */ }
  setAdminToken(null);
}
