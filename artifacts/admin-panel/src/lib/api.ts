// Central API helper for the admin panel.
import {
  setAuthTokenProvider,
  setUnauthorizedHandler as setReactQueryUnauthorizedHandler,
} from "@workspace/api-client-react";

// Admin PIN — set VITE_ADMIN_PIN env var to override. Default: 1234
function getAdminPin(): string {
  return (import.meta as any).env?.VITE_ADMIN_PIN || "1234";
}

// ── Auth wiring ───────────────────────────────────────────────────────────────
// Provide the PIN to the auto-generated api-client-react hooks
setAuthTokenProvider(() => getAdminPin());

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
  headers.set("x-admin-pin", getAdminPin());
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
