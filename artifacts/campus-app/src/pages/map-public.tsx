import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Polygon, Marker, Popup } from "react-leaflet";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getLocations, type CampusLocation } from "@/lib/api";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const LOC_TYPES: Record<string, { emoji: string; label: string }> = {
  building: { emoji: "🏛️", label: "Building" },
  dining_hall: { emoji: "🍽️", label: "Dining Hall" },
  sports_field: { emoji: "⚽", label: "Sports Field" },
  parking: { emoji: "🚗", label: "Parking" },
  green: { emoji: "🌿", label: "Green Area" },
  other: { emoji: "📍", label: "Other" },
};

const ISRAEL_CENTER: [number, number] = [31.8, 35.2];

function polygonCentroid(pts: { lat: number; lng: number }[]): [number, number] {
  const lat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
  const lng = pts.reduce((s, p) => s + p.lng, 0) / pts.length;
  return [lat, lng];
}

function AutoCenter({ locations }: { locations: CampusLocation[] }) {
  const map = useMap();
  useEffect(() => {
    if (locations.length === 0) return;
    const allPts = locations.flatMap(l => l.polygon);
    const lat = allPts.reduce((s, p) => s + p.lat, 0) / allPts.length;
    const lng = allPts.reduce((s, p) => s + p.lng, 0) / allPts.length;
    if (!isNaN(lat) && !isNaN(lng)) {
      try { map.setView([lat, lng], 17, { animate: false }); } catch {}
    }
  }, [locations, map]);
  return null;
}

export default function PublicMapPage() {
  const [locations, setLocations] = useState<CampusLocation[]>([]);
  const [selected, setSelected] = useState<CampusLocation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLocations()
      .then(locs => setLocations(locs.filter(l => l.polygon && l.polygon.length >= 3)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ width: "100%", height: "100dvh", position: "relative", background: "#0f172a" }}>
      {loading && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 999,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "#0f172a", color: "#94a3b8", fontSize: 14
        }}>
          Loading campus map…
        </div>
      )}

      <MapContainer
        center={ISRAEL_CENTER}
        zoom={13}
        style={{ width: "100%", height: "100%" }}
        zoomControl={true}
      >
        <TileLayer
          attribution="&copy; Esri"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maxZoom={19}
        />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
          attribution=""
        />

        <AutoCenter locations={locations} />

        {locations.map(loc => {
          const positions = loc.polygon.map(p => [p.lat, p.lng] as [number, number]);
          const centroid = polygonCentroid(loc.polygon);
          const cfg = LOC_TYPES[loc.type] || LOC_TYPES.other;
          const labelIcon = L.divIcon({
            className: "",
            html: `<div style="
              background:rgba(0,0,0,0.78);color:#fff;
              border:1.5px solid ${loc.color}90;border-radius:10px;
              padding:3px 10px;font-size:12px;font-weight:700;
              white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.5);
              display:flex;align-items:center;gap:5px;
            ">${cfg.emoji} ${loc.name}</div>`,
            iconAnchor: [0, 0],
            iconSize: undefined as any,
          });

          return (
            <div key={loc.id}>
              <Polygon
                positions={positions}
                pathOptions={{
                  color: loc.color, fillColor: loc.color,
                  fillOpacity: 0.22, weight: 2.5, opacity: 0.8,
                }}
                eventHandlers={{ click: () => setSelected(loc) }}
              />
              <Marker
                position={centroid}
                icon={labelIcon}
                eventHandlers={{ click: () => setSelected(loc) }}
              />
            </div>
          );
        })}
      </MapContainer>

      {/* Selected location panel */}
      {selected && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 500,
          background: "rgba(15,23,42,0.96)", borderTop: `2px solid ${selected.color}60`,
          borderRadius: "16px 16px 0 0", padding: "16px 20px 24px",
          backdropFilter: "blur(12px)", boxShadow: "0 -4px 24px rgba(0,0,0,0.5)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, fontSize: 22,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: selected.color + "22", border: `1.5px solid ${selected.color}60`,
            }}>
              {(LOC_TYPES[selected.type] || LOC_TYPES.other).emoji}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 16 }}>{selected.name}</div>
              <div style={{ color: "#94a3b8", fontSize: 12 }}>
                {(LOC_TYPES[selected.type] || LOC_TYPES.other).label}
                {selected.managerName ? ` · ${selected.managerName}` : ""}
              </div>
            </div>
            <button onClick={() => setSelected(null)} style={{
              background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 10,
              color: "#94a3b8", width: 34, height: 34, cursor: "pointer", fontSize: 18,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>✕</button>
          </div>
          {selected.description && (
            <p style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
              {selected.description}
            </p>
          )}
          {selected.adminName && (
            <div style={{
              marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6,
              background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)",
              borderRadius: 20, padding: "4px 10px", fontSize: 11, color: "#a5b4fc",
            }}>
              🏫 {selected.adminName}
            </div>
          )}
        </div>
      )}

      {locations.length === 0 && !loading && (
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          zIndex: 400, background: "rgba(15,23,42,0.85)", borderRadius: 12,
          padding: "12px 20px", color: "#94a3b8", fontSize: 13, textAlign: "center",
          border: "1px solid rgba(255,255,255,0.08)",
        }}>
          No campus locations defined yet.<br />
          <span style={{ fontSize: 11 }}>Use the Admin Panel to draw location polygons.</span>
        </div>
      )}
    </div>
  );
}
