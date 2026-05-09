import { useCallback, useEffect, useState } from "react";
import * as Location from "expo-location";
import { updateLocation } from "../api/client";

export type CampusCoords = { lat: number; lng: number };

const FALLBACK_COORDS: CampusCoords = { lat: 31.8, lng: 35.2 };

export function useCampusLocation() {
  const [coords, setCoords] = useState<CampusCoords>(FALLBACK_COORDS);
  const [status, setStatus] = useState<"loading" | "ready" | "denied">("loading");

  const refresh = useCallback(async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") {
      setStatus("denied");
      return;
    }

    const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const next = { lat: current.coords.latitude, lng: current.coords.longitude };
    setCoords(next);
    setStatus("ready");
    await updateLocation(next.lat, next.lng).catch(() => undefined);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { coords, status, refresh };
}
