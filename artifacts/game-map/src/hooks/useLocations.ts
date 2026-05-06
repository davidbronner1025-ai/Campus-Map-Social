import { useState, useEffect } from "react";
import type { ZonePolygon } from "../types/map";
import { ZONE_COLORS } from "../data/campusData";

interface ApiLocation {
  id: number;
  name: string;
  lat: number;
  lng: number;
  type: string;
  polygon: Array<{ lat: number; lng: number }> | null;
}

export function useLocations() {
  const [zones, setZones] = useState<ZonePolygon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const base = window.location.origin;
    fetch(`${base}/api/locations`)
      .then(r => r.json())
      .then((data: ApiLocation[]) => {
        const parsed: ZonePolygon[] = data
          .filter(loc => loc.polygon && loc.polygon.length >= 3)
          .map(loc => ({
            id: String(loc.id),
            name: loc.name,
            color: ZONE_COLORS[loc.type] ?? ZONE_COLORS.other,
            coordinates: (loc.polygon as Array<{ lat: number; lng: number }>).map(
              p => [p.lat, p.lng] as [number, number]
            ),
            state: "neutral" as const,
            activityScore: 0,
            userCount: 0,
            messageCount: 0,
          }));
        setZones(parsed);
        setLoading(false);
      })
      .catch(e => {
        console.error("[useLocations]", e);
        setError("שגיאה בטעינת מיקומים");
        setLoading(false);
      });
  }, []);

  return { zones, setZones, loading, error };
}
