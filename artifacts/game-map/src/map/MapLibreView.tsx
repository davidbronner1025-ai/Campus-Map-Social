import React, { useEffect, useRef } from "react";
import maplibregl, { type GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { ZonePolygon, PlayerMarker, DrawingState, SelectedItem } from "../types/map";
import {
  CAMPUS_GLTF_REFERENCE_SPAN_M,
  getCampusAnchorLatLng,
  getCampusPolygonSpanMeters,
  MAP_CENTER,
} from "../data/campusData";
import { computeCampusModelTransform, createCampusGltfCustomLayer } from "./campusGltfLayer";

const CAMPUS_GLB_PATH = "models/campus-solar-island.glb";

function campusGlbUrl(): string {
  const fromEnv = import.meta.env.VITE_CAMPUS_GLB_URL;
  if (typeof fromEnv === "string" && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }
  // Use relative path for better compatibility in Replit subfolders
  const url = CAMPUS_GLB_PATH; 
  console.log("[MapLibre] env.BASE_URL:", import.meta.env.BASE_URL);
  console.log("[MapLibre] Requested GLB URL:", url);
  return url;
}

function polygonScaleForGltf(boundary: [number, number][]): number {
  const spanM = getCampusPolygonSpanMeters(boundary);
  if (spanM == null || spanM < 5) return 1;
  const raw = spanM / CAMPUS_GLTF_REFERENCE_SPAN_M;
  return Math.min(15, Math.max(0.12, raw));
}

const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

const ZONE_3D_HEIGHTS: Record<string, number> = {
  "#2563eb": 14,
  "#ca8a04": 8,
  "#16a34a": 3,
  "#7c3aed": 12,
  "#dc2626": 10,
  "#64748b": 6,
};

function ll2geo(coords: [number, number][]): [number, number][] {
  return coords.map(([lat, lng]) => [lng, lat]);
}

function zonesToGeoJson(zones: ZonePolygon[]) {
  return {
    type: "FeatureCollection" as const,
    features: zones.map(z => ({
      type: "Feature" as const,
      properties: {
        id: z.id,
        name: z.name,
        color: z.color,
        height: ZONE_3D_HEIGHTS[z.color] ?? 6,
        state: z.state ?? "neutral",
        score: z.activityScore ?? 0,
      },
      geometry: {
        type: "Polygon" as const,
        coordinates: [ll2geo(z.coordinates)],
      },
    })),
  };
}

function playersToGeoJson(players: PlayerMarker[]) {
  return {
    type: "FeatureCollection" as const,
    features: players.filter(p => p.online).map(p => ({
      type: "Feature" as const,
      properties: { color: p.avatarColor },
      geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
    })),
  };
}

function boundaryToGeoJson(coords: [number, number][]) {
  if (coords.length < 3) return { type: "FeatureCollection" as const, features: [] };
  const ring = [...ll2geo(coords), ll2geo([coords[0]])[0]];
  return {
    type: "FeatureCollection" as const,
    features: [{ type: "Feature" as const, properties: {}, geometry: { type: "Polygon" as const, coordinates: [ring] } }],
  };
}

function drawingToGeoJson(points: [number, number][]) {
  const features: any[] = [];
  if (points.length > 1) {
    features.push({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: ll2geo(points) } });
  }
  points.forEach(([lat, lng]) => {
    features.push({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [lng, lat] } });
  });
  return { type: "FeatureCollection" as const, features };
}

interface MapLibreViewProps {
  zones: ZonePolygon[];
  players: PlayerMarker[];
  campusBoundary: [number, number][];
  drawing: DrawingState;
  onPointAdd: (lat: number, lng: number) => void;
  onSelect: (item: SelectedItem) => void;
  is3D: boolean;
  onWebGLFail: () => void;
}

export function MapLibreView({
  zones, players, campusBoundary, drawing,
  onPointAdd, onSelect, is3D, onWebGLFail,
}: MapLibreViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<maplibregl.Map | null>(null);
  const loadedRef    = useRef(false);
  const zonesRef     = useRef(zones);
  const drawingRef   = useRef(drawing);
  const campusBoundaryRef = useRef(campusBoundary);
  const labelsRef    = useRef<maplibregl.Marker[]>([]);
  zonesRef.current   = zones;
  drawingRef.current = drawing;
  campusBoundaryRef.current = campusBoundary;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: STYLE_URL,
        center: [MAP_CENTER[1], MAP_CENTER[0]],
        zoom: 17.5,
        pitch: is3D ? 52 : 0,
        bearing: is3D ? -12 : 0,
        attributionControl: false,
        maxZoom: 20,
        minZoom: 14,
        canvasContextAttributes: { antialias: true },
      });
    } catch (err) {
      console.warn("[MapLibre] WebGL init failed, switching to 2D fallback", err);
      onWebGLFail();
      return;
    }

    // Catch WebGL context loss
    map.on("error", (e: any) => {
      if (e?.error?.message?.includes("WebGL") || e?.error?.type === "webglcontextcreationerror") {
        console.warn("[MapLibre] WebGL error, switching to fallback");
        onWebGLFail();
      }
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "bottom-right");

    map.on("load", () => {
      map.addSource("campus-boundary", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addSource("campus-zones",    { type: "geojson", data: zonesToGeoJson(zonesRef.current) });
      map.addSource("presence",        { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addSource("drawing",         { type: "geojson", data: { type: "FeatureCollection", features: [] } });

      map.addLayer({ id: "boundary-fill", type: "fill", source: "campus-boundary",
        paint: { "fill-color": "#dc2626", "fill-opacity": 0.04 } });
      map.addLayer({ id: "boundary-line", type: "line", source: "campus-boundary",
        paint: { "line-color": "#dc2626", "line-width": 2.5, "line-dasharray": [5, 4], "line-opacity": 0.65 } });

      map.addLayer({ id: "buildings-3d", type: "fill-extrusion", source: "campus-zones",
        paint: {
          "fill-extrusion-color": ["coalesce", ["get", "color"], "#64748b"],
          "fill-extrusion-height": ["coalesce", ["get", "height"], 6],
          "fill-extrusion-base": 0,
          "fill-extrusion-opacity": ["interpolate", ["linear"], ["zoom"], 16, 0.0, 17, 0.62, 18, 0.78],
        },
      });
      map.addLayer({ id: "buildings-roof", type: "fill-extrusion", source: "campus-zones",
        paint: {
          "fill-extrusion-color": "#ffffff",
          "fill-extrusion-height": ["coalesce", ["get", "height"], 6],
          "fill-extrusion-base": ["max", 0, ["-", ["coalesce", ["get", "height"], 6], 0.4]],
          "fill-extrusion-opacity": 0.18,
        },
      });
      map.addLayer({ id: "buildings-flat", type: "fill", source: "campus-zones",
        paint: { "fill-color": ["coalesce", ["get", "color"], "#64748b"], "fill-opacity": ["interpolate", ["linear"], ["zoom"], 15, 0.18, 18, 0.0] },
      });
      map.addLayer({ id: "buildings-outline", type: "line", source: "campus-zones",
        paint: { "line-color": ["coalesce", ["get", "color"], "#64748b"], "line-width": 1.8, "line-opacity": 0.70 },
      });
      map.addLayer({ id: "presence-dots", type: "circle", source: "presence",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 15, 3, 19, 7],
          "circle-color": ["coalesce", ["get", "color"], "#3b82f6"],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.5,
          "circle-opacity": 0.92,
        },
      });
      map.addLayer({ id: "drawing-line", type: "line", source: "drawing",
        filter: ["==", "$type", "LineString"],
        paint: { "line-color": "#dc2626", "line-width": 2, "line-dasharray": [6, 4], "line-opacity": 0.85 },
      });
      map.addLayer({ id: "drawing-dots", type: "circle", source: "drawing",
        filter: ["==", "$type", "Point"],
        paint: { "circle-radius": 5, "circle-color": "#ffffff", "circle-stroke-color": "#dc2626", "circle-stroke-width": 2 },
      });

      
      try {
        const glbUrl = campusGlbUrl();
        
        map.addLayer(
          createCampusGltfCustomLayer(glbUrl, () => {
            const boundary = campusBoundaryRef.current;
            const anchor = getCampusAnchorLatLng(boundary);
            const bearingRad = (map.getBearing() * Math.PI) / 180;
            const polyScale = polygonScaleForGltf(boundary);
            
            return computeCampusModelTransform(anchor.lng, anchor.lat, 0.08, -bearingRad, polyScale);
          }),
        );
      } catch (err) {
        console.error("[MapLibre] Failed to add 3D model layer:", err);
      }
  
      loadedRef.current = true;
      syncLabels(map, zonesRef.current, labelsRef);
    });

    map.on("click", (e) => {
      const d = drawingRef.current;
      if (d.mode !== "none") { onPointAdd(e.lngLat.lat, e.lngLat.lng); return; }
      const features = map.queryRenderedFeatures(e.point, { layers: ["buildings-3d", "buildings-flat"] });
      if (features.length > 0) {
        const zoneId = String(features[0].properties?.id ?? "");
        const zone = zonesRef.current.find(z => z.id === zoneId);
        if (zone) { onSelect({ kind: "zone", data: zone }); return; }
      }
      onSelect(null);
    });

    map.on("mouseenter", "buildings-3d",    () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "buildings-3d",    () => { map.getCanvas().style.cursor = ""; });
    map.on("mouseenter", "buildings-flat",  () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "buildings-flat",  () => { map.getCanvas().style.cursor = ""; });

    mapRef.current = map;
    return () => {
      removeLabels(labelsRef);
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    mapRef.current?.easeTo({ pitch: is3D ? 52 : 0, bearing: is3D ? -12 : 0, duration: 600 });
  }, [is3D]);

  useEffect(() => {
    const map = mapRef.current; if (!map || !loadedRef.current) return;
    (map.getSource("campus-zones") as GeoJSONSource)?.setData(zonesToGeoJson(zones));
    syncLabels(map, zones, labelsRef);
  }, [zones]);

  useEffect(() => {
    const map = mapRef.current; if (!map || !loadedRef.current) return;
    (map.getSource("presence") as GeoJSONSource)?.setData(playersToGeoJson(players));
  }, [players]);

  useEffect(() => {
    const map = mapRef.current; if (!map || !loadedRef.current) return;
    (map.getSource("campus-boundary") as GeoJSONSource)?.setData(boundaryToGeoJson(campusBoundary));
    map.triggerRepaint();
  }, [campusBoundary]);

  useEffect(() => {
    const map = mapRef.current; if (!map || !loadedRef.current) return;
    (map.getSource("drawing") as GeoJSONSource)?.setData(drawingToGeoJson(drawing.points));
  }, [drawing.points]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", cursor: drawing.mode !== "none" ? "crosshair" : undefined }}
    />
  );
}

function syncLabels(map: maplibregl.Map, zones: ZonePolygon[], labelsRef: React.RefObject<maplibregl.Marker[]>) {
  removeLabels(labelsRef);
  const STATE_EMOJI: Record<string, string> = { hot: "🔥", active: "⚡", neutral: "" };
  const markers = zones.map(z => {
    const lat = z.coordinates.reduce((s, c) => s + c[0], 0) / z.coordinates.length;
    const lng = z.coordinates.reduce((s, c) => s + c[1], 0) / z.coordinates.length;
    const emoji = STATE_EMOJI[z.state ?? "neutral"] ?? "";
    const badge = (z.activityScore ?? 0) > 0
      ? `<span style="background:${z.color};color:#fff;border-radius:8px;padding:0 5px;font-size:10px;font-weight:800;line-height:15px;display:inline-block;margin-right:3px;">${z.activityScore}</span>`
      : "";
    const el = document.createElement("div");
    el.style.pointerEvents = "none";
    el.innerHTML = `<div style="
      display:inline-flex;align-items:center;gap:4px;
      background:rgba(255,255,255,0.94);backdrop-filter:blur(10px);
      border:1.5px solid ${z.color}bb;border-radius:10px;padding:4px 10px;
      font-size:12px;font-weight:700;color:#0f172a;white-space:nowrap;
      box-shadow:0 2px 10px rgba(0,0,0,0.09);
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;
      direction:rtl;transform:translateX(-50%);
    ">${emoji ? `<span style="font-size:11px">${emoji}</span>` : ""}${z.name}${badge}</div>`;
    return new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([lng, lat]).addTo(map);
  });
  if (labelsRef.current) {
    labelsRef.current.push(...markers);
  }
}

function removeLabels(labelsRef: React.RefObject<maplibregl.Marker[]>) {
  labelsRef.current?.forEach(m => m.remove());
  if (labelsRef.current) {
    labelsRef.current.length = 0;
  }
}
