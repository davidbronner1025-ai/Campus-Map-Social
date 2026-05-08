import { useState, useCallback, useMemo } from "react";
import { MapContainer, TileLayer, ZoomControl, Polygon, CircleMarker, Polyline, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ZonePolygon, PlayerMarker, DrawingState, SelectedItem } from "../types/map";
import { MAP_CENTER, MAP_ZOOM, MAP_BOUNDS } from "../data/campusData";

// Carto Voyager — clean street map like Waze (free, no API key)
const VOYAGER_TILES = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

const COLOR_PALETTE: Record<string, { border: string }> = {
  "#2563eb": { border: "#2563eb" },
  "#ca8a04": { border: "#ca8a04" },
  "#16a34a": { border: "#16a34a" },
  "#7c3aed": { border: "#7c3aed" },
  "#dc2626": { border: "#dc2626" },
  "#64748b": { border: "#64748b" },
};

function getCentroid(coords: [number, number][]): [number, number] {
  return [
    coords.reduce((s, c) => s + c[0], 0) / coords.length,
    coords.reduce((s, c) => s + c[1], 0) / coords.length,
  ];
}

const leafletBounds = L.latLngBounds(
  [MAP_BOUNDS.south, MAP_BOUNDS.west],
  [MAP_BOUNDS.north, MAP_BOUNDS.east]
);

interface LeafletStreetViewProps {
  zones: ZonePolygon[];
  players: PlayerMarker[];
  campusBoundary: [number, number][];
  drawing: DrawingState;
  onPointAdd: (lat: number, lng: number) => void;
  onSelect: (item: SelectedItem) => void;
}

function MapClickHandler({ drawing, onPointAdd, onSelect, zones }: {
  drawing: DrawingState;
  onPointAdd: (lat: number, lng: number) => void;
  onSelect: (item: SelectedItem) => void;
  zones: ZonePolygon[];
}) {
  useMapEvents({
    click(e) {
      if (drawing.mode !== "none") {
        onPointAdd(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

function BuildingPolygon({ zone, onSelect }: { zone: ZonePolygon; onSelect: (item: SelectedItem) => void }) {
  const [hovered, setHovered] = useState(false);
  const [breathe, setBreathe] = useState(false);
  const pal = COLOR_PALETTE[zone.color] ?? { border: zone.color };
  const isHot    = zone.state === "hot";
  const isActive = zone.state === "active";

  const fillOpacity = isHot ? 0.30 : isActive ? 0.20 : hovered ? 0.22 : 0.10;
  const weight      = hovered || isActive || isHot ? 2.5 : 1.8;
  const borderOp    = hovered ? 1 : isHot ? 0.85 : isActive ? 0.75 : 0.55;

  const stateEmoji = isHot ? "🔥" : isActive ? "⚡" : "";

  const centroid = useMemo(() => getCentroid(zone.coordinates), [zone.coordinates]);

  const labelIcon = useMemo(() => {
    const glowStyle = isHot
      ? `box-shadow:0 2px 16px rgba(0,0,0,0.11),0 0 20px ${pal.border}44;`
      : `box-shadow:0 2px 10px rgba(0,0,0,0.09);`;
    const w = Math.max(80, zone.name.length * 12 + 36);
    const h = 28;
    return L.divIcon({
      className: "",
      html: `<div style="
        display:inline-flex;align-items:center;gap:4px;
        background:rgba(255,255,255,0.95);
        backdrop-filter:blur(10px);
        border:1.5px solid ${pal.border}cc;
        border-radius:10px;
        padding:4px 10px;
        font-size:12px;font-weight:700;color:#0f172a;
        white-space:nowrap;
        ${glowStyle}
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;
        direction:rtl;pointer-events:none;
      ">${stateEmoji ? `<span style="font-size:11px">${stateEmoji}</span>` : ""}<span>${zone.name}</span></div>`,
      iconSize: [w, h],
      iconAnchor: [w / 2, h / 2],
    });
  }, [zone.name, pal, stateEmoji, isHot]);

  return (
    <>
      <Polygon
        positions={zone.coordinates}
        pathOptions={{
          color: pal.border,
          weight,
          opacity: borderOp,
          fillColor: pal.border,
          fillOpacity,
          lineCap: "round",
          lineJoin: "round",
        }}
        eventHandlers={{
          click: () => onSelect({ kind: "zone", data: zone }),
          mouseover: () => setHovered(true),
          mouseout: () => setHovered(false),
        }}
      />
      <Marker position={centroid} icon={labelIcon} interactive={false} zIndexOffset={100} />
    </>
  );
}

function CampusBoundaryLayer({ coords }: { coords: [number, number][] }) {
  if (coords.length < 3) return null;
  return (
    <>
      <Polygon
        positions={coords}
        pathOptions={{ color: "#dc2626", weight: 0, fillColor: "#dc2626", fillOpacity: 0.04, interactive: false }}
      />
      <Polygon
        positions={coords}
        pathOptions={{ color: "#dc2626", weight: 2.5, opacity: 0.60, fillColor: "transparent", fillOpacity: 0, dashArray: "8 5", interactive: false }}
      />
    </>
  );
}

function DrawingPreview({ drawing }: { drawing: DrawingState }) {
  if (drawing.mode === "none" || drawing.points.length === 0) return null;
  return (
    <>
      {drawing.points.length > 1 && (
        <Polyline positions={drawing.points} pathOptions={{ color: "#dc2626", weight: 2, dashArray: "8 5" }} />
      )}
      {drawing.points.map(([lat, lng], i) => (
        <CircleMarker key={i} center={[lat, lng]} radius={5}
          pathOptions={{ color: "#dc2626", fillColor: "#ffffff", fillOpacity: 1, weight: 2 }} />
      ))}
    </>
  );
}

export function LeafletStreetView({
  zones, players, campusBoundary, drawing, onPointAdd, onSelect,
}: LeafletStreetViewProps) {
  return (
    <>
      <style>{`
        .leaflet-container { background: #e8ecf2 !important; }
        .leaflet-control-attribution { display: none !important; }
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 2px 16px rgba(0,0,0,0.10) !important;
          border-radius: 12px !important;
          overflow: hidden !important;
        }
        .leaflet-control-zoom a {
          background: rgba(255,255,255,0.92) !important;
          border-color: rgba(0,0,0,0.06) !important;
          color: #374151 !important;
          font-weight: 600 !important;
          width: 36px !important; height: 36px !important; line-height: 36px !important;
        }
        .leaflet-tooltip { background:transparent!important;border:none!important;box-shadow:none!important;padding:0!important; }
        ${drawing.mode !== "none" ? ".leaflet-container { cursor: crosshair !important; }" : ""}
      `}</style>

      <MapContainer
        center={MAP_CENTER}
        zoom={MAP_ZOOM}
        maxBounds={leafletBounds}
        maxBoundsViscosity={0.85}
        minZoom={14}
        maxZoom={20}
        zoomControl={false}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer url={VOYAGER_TILES} attribution="" />
        <ZoomControl position="bottomright" />

        <MapClickHandler drawing={drawing} onPointAdd={onPointAdd} onSelect={onSelect} zones={zones} />

        <CampusBoundaryLayer coords={campusBoundary} />

        {zones.map(z => (
          <BuildingPolygon key={z.id} zone={z} onSelect={onSelect} />
        ))}

        {/* Presence dots */}
        {players.filter(p => p.online).map(p => (
          <CircleMarker
            key={p.id}
            center={[p.lat, p.lng]}
            radius={4}
            pathOptions={{
              color: "white", weight: 1.5,
              fillColor: p.avatarColor, fillOpacity: 0.92,
            }}
          />
        ))}

        <DrawingPreview drawing={drawing} />
      </MapContainer>
    </>
  );
}
