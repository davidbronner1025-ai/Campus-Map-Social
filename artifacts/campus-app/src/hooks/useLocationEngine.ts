import { useState, useEffect, useRef, useCallback } from "react";
import { updateLocation } from "@/lib/api";

export interface GeoPosition { lat: number; lng: number; accuracy: number }

const UPDATE_INTERVAL_MS = 30_000; // push to server every 30s
const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: false, // battery-saving: use network/wifi instead of GPS
  maximumAge: 25_000,        // accept cached position up to 25s old
  timeout: 15_000,
};

export function useLocationEngine(enabled: boolean) {
  const [pos, setPos] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<"prompt" | "granted" | "denied" | "unknown">("unknown");
  const lastPushedAt = useRef<number>(0);
  const watchId = useRef<number | null>(null);
  const serverPushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushToServer = useCallback(async (lat: number, lng: number) => {
    const now = Date.now();
    if (now - lastPushedAt.current < UPDATE_INTERVAL_MS) return;
    lastPushedAt.current = now;
    try {
      await updateLocation(lat, lng);
    } catch {}
  }, []);

  const onPosition = useCallback((position: GeolocationPosition) => {
    const { latitude: lat, longitude: lng, accuracy } = position.coords;
    setPos({ lat, lng, accuracy });
    setError(null);
    // Debounced server push
    if (serverPushTimer.current) clearTimeout(serverPushTimer.current);
    serverPushTimer.current = setTimeout(() => pushToServer(lat, lng), 1000);
  }, [pushToServer]);

  const onError = useCallback((err: GeolocationPositionError) => {
    if (err.code === err.PERMISSION_DENIED) {
      setPermissionState("denied");
      setError("Location permission denied. Please enable in browser settings.");
    } else {
      setError("Location unavailable. Showing default campus area.");
    }
  }, []);

  useEffect(() => {
    if (!enabled || !("geolocation" in navigator)) return;

    // Check permission status if supported
    if ("permissions" in navigator) {
      navigator.permissions.query({ name: "geolocation" }).then((r) => {
        setPermissionState(r.state as any);
        r.addEventListener("change", () => setPermissionState(r.state as any));
      }).catch(() => {});
    }

    // Start watch
    watchId.current = navigator.geolocation.watchPosition(onPosition, onError, GEO_OPTIONS);

    // Pause when backgrounded, resume when foregrounded
    const onVisibility = () => {
      if (document.hidden) {
        if (watchId.current !== null) {
          navigator.geolocation.clearWatch(watchId.current);
          watchId.current = null;
        }
      } else {
        watchId.current = navigator.geolocation.watchPosition(onPosition, onError, GEO_OPTIONS);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      if (serverPushTimer.current) clearTimeout(serverPushTimer.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, onPosition, onError]);

  const requestPermission = useCallback(() => {
    navigator.geolocation.getCurrentPosition(onPosition, onError, { ...GEO_OPTIONS, timeout: 8000 });
  }, [onPosition, onError]);

  return { pos, error, permissionState, requestPermission };
}
