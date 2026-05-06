import type { GamePoint } from "../types/map";

const GRID_SIZE_DEGREES = 0.0002;

export function resolveOverlaps(points: GamePoint[]): GamePoint[] {
  const grid = new Map<string, GamePoint[]>();

  for (const point of points) {
    const cellLat = Math.floor(point.lat / GRID_SIZE_DEGREES);
    const cellLng = Math.floor(point.lng / GRID_SIZE_DEGREES);
    const key = `${cellLat}:${cellLng}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key)!.push(point);
  }

  const visible: GamePoint[] = [];
  for (const [, cell] of grid) {
    const sorted = [...cell].sort((a, b) => a.priority - b.priority);
    visible.push(sorted[0]);
  }
  return visible;
}

export function isValidCoord(lat: number, lng: number): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export const POINT_TYPE_COLORS: Record<string, string> = {
  admin: "#ff2222",
  event: "#ff9000",
  post: "#00aaff",
  zone: "#aa44ff",
  npc: "#00ff99",
};

export const POINT_TYPE_ICONS: Record<string, string> = {
  admin: "★",
  event: "⚡",
  post: "💬",
  zone: "◈",
  npc: "◉",
};

export const POINT_TYPE_LABELS: Record<string, string> = {
  admin: "מערכת",
  event: "אירוע",
  post: "פוסט",
  zone: "אזור",
  npc: "דמות",
};

export const BUILDING_TYPE_COLORS: Record<string, string> = {
  academic: "#00f5ff",
  admin: "#ff4444",
  sports: "#ff9000",
  dining: "#ffff00",
  parking: "#888888",
  other: "#aaaaaa",
};
