import { sql, type SQL } from "drizzle-orm";

/**
 * Haversine distance (meters) in TypeScript
 */
export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * SQL snippet for distance calculation in Drizzle queries
 */
export function getDistanceSql(
  lat: number,
  lng: number,
  latCol: SQL | SQL.Aliased | any,
  lngCol: SQL | SQL.Aliased | any
): SQL {
  return sql`(6371000 * acos(
    cos(radians(${lat})) * cos(radians(${latCol})) *
    cos(radians(${lngCol}) - radians(${lng})) +
    sin(radians(${lat})) * sin(radians(${latCol}))
  ))`;
}
