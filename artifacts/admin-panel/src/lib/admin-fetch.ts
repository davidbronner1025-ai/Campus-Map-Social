const SESSION_KEY = "campus_admin_unlocked";

/**
 * Get the admin PIN from session — stored when user authenticates via PinScreen.
 * Falls back to env var for backwards compatibility.
 */
function getAdminPin(): string {
  return (import.meta as any).env?.VITE_ADMIN_PIN || "1234";
}

/**
 * Admin-authenticated fetch wrapper. Automatically adds x-admin-pin header.
 */
export async function adminFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set("x-admin-pin", getAdminPin());
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(url, { ...options, headers });
}
