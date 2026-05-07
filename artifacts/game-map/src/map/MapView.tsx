import { useState, useCallback, useEffect } from "react";
import { MapContainer, TileLayer, ZoomControl, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { DrawingState, DrawingMode, ZonePolygon, Building, GamePoint, SelectedItem } from "../types/map";
import { MAP_CENTER, MAP_ZOOM, MAP_BOUNDS } from "../data/campusData";
import { useLocations } from "../hooks/useLocations";
import { useActivityEngine } from "../hooks/useActivityEngine";
import { BuildingCard } from "./BuildingCard";
import { CampusBoundary } from "./CampusBoundary";
import { ActivityHalo } from "./ActivityHalo";
import { PresenceDots } from "./PresenceDots";
import { BuildingPopup } from "./BuildingPopup";
import { CampusHUD } from "./CampusHUD";
import { DrawingLayer } from "./DrawingLayer";
import { DrawingPanel } from "./DrawingPanel";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const DEFAULT_DRAWING: DrawingState = {
  mode: "none",
  points: [],
  name: "",
  type: "academic",
  color: "#dc2626",
};

const leafletBounds = L.latLngBounds(
  [MAP_BOUNDS.south, MAP_BOUNDS.west],
  [MAP_BOUNDS.north, MAP_BOUNDS.east]
);

function ZoomTracker({ onZoom }: { onZoom: (z: number) => void }) {
  const map = useMapEvents({
    zoom() { onZoom(map.getZoom()); },
  });
  return null;
}

export function MapView() {
  const { zones, setZones, loading, error } = useLocations();
  const { players, nodes } = useActivityEngine(zones, setZones);

  const [selected, setSelected] = useState<SelectedItem>(null);
  const [drawing, setDrawing] = useState<DrawingState>(DEFAULT_DRAWING);
  const [showZones, setShowZones] = useState(true);
  const [showNodes, setShowNodes] = useState(true);
  const [zoom, setZoom] = useState(MAP_ZOOM);
  const [userZones, setUserZones] = useState<ZonePolygon[]>([]);
  const [campusBoundary, setCampusBoundary] = useState<[number, number][]>([]);

  const handleSelect = useCallback((item: SelectedItem) => {
    if (drawing.mode !== "none") return;
    setSelected(item);
  }, [drawing.mode]);

  const handleModeChange = useCallback((mode: DrawingMode) => {
    setDrawing({ ...DEFAULT_DRAWING, mode });
    setSelected(null);
  }, []);

  const handlePointAdd = useCallback((lat: number, lng: number) => {
    setDrawing(prev => ({
      ...prev,
      points: prev.mode === "building" || prev.mode === "point"
        ? [[lat, lng]]
        : [...prev.points, [lat, lng]],
    }));
  }, []);

  const handleFinishZone = useCallback((zone: ZonePolygon) => {
    if (zone.color === "#dc2626" && drawing.name?.includes("קמפוס")) {
      setCampusBoundary(zone.coordinates);
    } else {
      setUserZones(prev => [...prev, zone]);
    }
    setDrawing(DEFAULT_DRAWING);
  }, [drawing.name]);

  const handleFinishBuilding = useCallback((_b: Building) => {
    setDrawing(DEFAULT_DRAWING);
  }, []);

  const handleFinishPoint = useCallback((_p: GamePoint) => {
    setDrawing(DEFAULT_DRAWING);
  }, []);

  const allZones = [...zones, ...userZones];

  const presenceByZone = zones.reduce((acc, z) => {
    const count = players.filter(p => {
      if (!p.online) return false;
      const [cLat, cLng] = z.coordinates[0];
      return Math.abs(p.lat - cLat) < 0.001 && Math.abs(p.lng - cLng) < 0.0012;
    }).length;
    acc[z.id] = count;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <style>{`
        ${drawing.mode !== "none" ? "* { cursor: crosshair !important; }" : ""}
      `}</style>

      <MapContainer
        center={MAP_CENTER}
        zoom={MAP_ZOOM}
        maxBounds={leafletBounds}
        maxBoundsViscosity={0.85}
        minZoom={16}
        maxZoom={20}
        zoomControl={false}
        style={{ width: "100%", height: "100%" }}
        preferCanvas={false}
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution=""
          keepBuffer={4}
          updateWhenIdle={false}
          updateWhenZooming={false}
        />

        <ZoomControl position="bottomright" />
        <ZoomTracker onZoom={setZoom} />

        {/* Campus boundary in red */}
        {campusBoundary.length >= 3 && (
          <CampusBoundary coordinates={campusBoundary} />
        )}

        {/* Activity halos behind buildings */}
        <ActivityHalo zones={allZones} />

        {/* Buildings as styled polygons */}
        {showZones && allZones.map(zone => (
          <BuildingCard
            key={zone.id}
            zone={zone}
            onSelect={handleSelect}
            presenceCount={presenceByZone[zone.id] ?? 0}
          />
        ))}

        {/* Presence dots */}
        <PresenceDots players={players} zoom={zoom} />

        {/* Drawing layer */}
        <DrawingLayer drawing={drawing} onPointAdd={handlePointAdd} />
      </MapContainer>

      {/* Glass HUD top-right */}
      <CampusHUD
        zones={allZones}
        players={players}
        showZones={showZones}
        showNodes={showNodes}
        isDrawing={drawing.mode !== "none"}
        onToggleZones={() => setShowZones(v => !v)}
        onToggleNodes={() => setShowNodes(v => !v)}
      />

      {/* Drawing panel top-right, below drawing header */}
      <DrawingPanel
        drawing={drawing}
        onModeChange={handleModeChange}
        onUpdateDrawing={(u) => setDrawing(prev => ({ ...prev, ...u }))}
        onFinishZone={handleFinishZone}
        onFinishBuilding={handleFinishBuilding}
        onFinishPoint={handleFinishPoint}
        onCancel={() => setDrawing(DEFAULT_DRAWING)}
      />

      {/* Floating popup card */}
      <BuildingPopup selected={selected} onClose={() => setSelected(null)} />

      {loading && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(16px)",
          borderRadius: 16,
          padding: "18px 28px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          fontSize: 14,
          color: "#374151",
          zIndex: 1100,
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontWeight: 600,
        }}>
          <span style={{ fontSize: 22 }}>🗺️</span>
          טוען מיקומים...
        </div>
      )}

      {error && (
        <div style={{
          position: "absolute",
          bottom: 100,
          left: "50%",
          transform: "translateX(-50%)",
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: 10,
          padding: "10px 18px",
          fontSize: 13,
          color: "#dc2626",
          zIndex: 1100,
        }}>
          {error}
        </div>
      )}
    </div>
  );
}
