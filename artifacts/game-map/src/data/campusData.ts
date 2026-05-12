import type { MapBounds } from "../types/map";
export const CAMPUS_NAME = "ישיבת דרך חיים";
export const MAP_CENTER: [number, number] = [31.782484615441792, 34.699199438127842];
/** When the user draws a campus boundary, anchor the GLB to its centroid; otherwise use {@link MAP_CENTER}. */
export function getCampusAnchorLatLng(
  boundaryLatLng: [number, number][] | undefined | null,
): { lat: number; lng: number } {
  if (boundaryLatLng && boundaryLatLng.length >= 3) {
    let sumLat = 0;
    let sumLng = 0;
    for (const [lat, lng] of boundaryLatLng) {
      sumLat += lat;
      sumLng += lng;
    }
    const n = boundaryLatLng.length;
    return { lat: sumLat / n, lng: sumLng / n };
  }
  return { lat: MAP_CENTER[0], lng: MAP_CENTER[1] };
}
function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}
/**
 * Rough span (meters) of the drawn campus polygon: twice the max distance from centroid to a vertex.
 * Used to scale the GLB so it better matches the marked area on the map.
 */
export function getCampusPolygonSpanMeters(boundaryLatLng: [number, number][] | undefined | null): number | null {
  if (!boundaryLatLng || boundaryLatLng.length < 3) return null;
  const c = getCampusAnchorLatLng(boundaryLatLng);
  let maxM = 0;
  for (const [lat, lng] of boundaryLatLng) {
    maxM = Math.max(maxM, haversineMeters(c, { lat, lng }));
  }
  return maxM * 2;
}
/** Reference diameter (m) for GLB scale when polygon span is applied; tune with {@link CAMPUS_GLTF_SCALE_MULTIPLIER}. */
export const CAMPUS_GLTF_REFERENCE_SPAN_M = 320;
export const MAP_ZOOM = 18;
/** Extra scale for GLB assets that are not authored in real-world meters. */
export const CAMPUS_GLTF_SCALE_MULTIPLIER = 1;
export const MAP_BOUNDS: MapBounds = {
  north: 31.782484 + 0.014,
  south: 31.782484 - 0.014,
  east: 34.699199 + 0.018,
  west: 34.699199 - 0.018,
};
export const ZONE_COLORS: Record<string, string> = {
  building: "#2563eb",
  dining_hall: "#ca8a04",
  sports_field: "#16a34a",
  library: "#7c3aed",
  other: "#64748b",
  admin: "#dc2626",
};
export const HOT_THRESHOLD = 5;
export const ACTIVE_THRESHOLD = 2;
export const ACTIVITY_TICK_MS = 10_000;
export const PLAYER_UPDATE_MS = 30_000;
