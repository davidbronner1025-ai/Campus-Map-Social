// Central API helper for the admin panel.
//
// Auth is now handled by Replit Auth (cookie-based OIDC session via /api/login).
// This module only handles:
//   - adminFetch: a thin fetch wrapper that sends the session cookie and
//     handles 401 by invoking the registered unauthorized handler.
//   - setUnauthorizedHandler: lets App.tsx wire in a global bounce-to-login.
//   - The generated react-query client (@workspace/api-client-react) is also
//     wired here so its hooks send the same cookie automatically.
import {
  setAuthTokenProvider,
  setUnauthorizedHandler as setReactQueryUnauthorizedHandler,
} from "@workspace/api-client-react";

// Admin panel uses cookie-based Replit Auth — no bearer token needed.
// Register a null provider so the generated client doesn't try to attach one.
setAuthTokenProvider(null);

// ── Global 401 handler ────────────────────────────────────────────────────────
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(fn: (() => void) | null): void {
  unauthorizedHandler = fn;
  setReactQueryUnauthorizedHandler(fn);
}

// ── Fetch wrapper ─────────────────────────────────────────────────────────────
export async function adminFetch<T = any>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type") && typeof init.body === "string") {
    headers.set("content-type", "application/json");
  }
  const url = path.startsWith("http") ? path : path.startsWith("/api") ? path : `/api${path}`;
  const res = await fetch(url, { ...init, headers, credentials: "include" });
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
