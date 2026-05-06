import type { MapBounds } from "../types/map";

export const CAMPUS_NAME = "ישיבת דרך חיים";
export const MAP_CENTER: [number, number] = [31.782484615441792, 34.699199438127842];
export const MAP_ZOOM = 18;

export const MAP_BOUNDS: MapBounds = {
  north: 31.782484 + 0.014,
  south: 31.782484 - 0.014,
  east:  34.699199 + 0.018,
  west:  34.699199 - 0.018,
};

export const ZONE_COLORS: Record<string, string> = {
  building:    "#2563eb",
  dining_hall: "#ca8a04",
  sports_field:"#16a34a",
  library:     "#7c3aed",
  other:       "#64748b",
  admin:       "#dc2626",
};

export const HOT_THRESHOLD = 5;
export const ACTIVE_THRESHOLD = 2;
export const ACTIVITY_TICK_MS = 10_000;
export const PLAYER_UPDATE_MS = 30_000;
