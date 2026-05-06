import { useState, useCallback } from "react";
import { MapContainer, TileLayer, ZoomControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { DrawingState, DrawingMode, ZonePolygon, Building, GamePoint, SelectedItem } from "../types/map";
import { MAP_CENTER, MAP_ZOOM, MAP_BOUNDS } from "../data/campusData";
import { useLocations } from "../hooks/useLocations";
import { useActivityEngine } from "../hooks/useActivityEngine";
import { GameZoneLayer } from "./GameZoneLayer";
import { PlayerLayer } from "./PlayerLayer";
import { NodeLayer } from "./NodeLayer";
import { DrawingLayer } from "./DrawingLayer";
import { BottomSheet } from "./BottomSheet";
import { GameHUD } from "./GameHUD";
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
  color: "#2563eb",
};

const leafletBounds = L.latLngBounds(
  [MAP_BOUNDS.south, MAP_BOUNDS.west],
  [MAP_BOUNDS.north, MAP_BOUNDS.east]
);

export function MapView() {
  const { zones, setZones, loading, error } = useLocations();
  const { players, nodes } = useActivityEngine(zones, setZones);

  const [selected, setSelected] = useState<SelectedItem>(null);
  const [drawing, setDrawing] = useState<DrawingState>(DEFAULT_DRAWING);
  const [showZones, setShowZones] = useState(true);
  const [showPlayers, setShowPlayers] = useState(true);
  const [showNodes, setShowNodes] = useState(true);
  const [userZones, setUserZones] = useState<ZonePolygon[]>([]);

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
    setUserZones(prev => [...prev, zone]);
    setDrawing(DEFAULT_DRAWING);
  }, []);

  const handleFinishBuilding = useCallback((b: Building) => {
    setDrawing(DEFAULT_DRAWING);
  }, []);

  const handleFinishPoint = useCallback((p: GamePoint) => {
    setDrawing(DEFAULT_DRAWING);
  }, []);

  const allZones = [...zones, ...userZones];

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", background: "#e2e8f0" }}>
      <style>{`
        .leaflet-container { background: #e2e8f0; }
        .leaflet-tile { filter: saturate(0.88) brightness(1.04) contrast(1.02); }
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 1px 6px rgba(0,0,0,0.13) !important;
          border-radius: 8px !important;
          overflow: hidden;
        }
        .leaflet-control-zoom a {
          background: white !important;
          border-color: #e2e8f0 !important;
          color: #374151 !important;
          font-weight: 700 !important;
          width: 32px !important;
          height: 32px !important;
          line-height: 32px !important;
          font-size: 18px !important;
        }
        .leaflet-control-zoom a:hover { background: #f1f5f9 !important; }
        .leaflet-control-attribution { display: none; }
        .leaflet-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .zone-label-tooltip { pointer-events: none !important; }
        ${drawing.mode !== "none" ? "* { cursor: crosshair !important; }" : ""}
      `}</style>

      <MapContainer
        center={MAP_CENTER}
        zoom={MAP_ZOOM}
        maxBounds={leafletBounds}
        maxBoundsViscosity={0.92}
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

        {showZones && <GameZoneLayer zones={allZones} onSelect={handleSelect} />}
        {showPlayers && <PlayerLayer players={players} onSelect={handleSelect} />}
        {showNodes && <NodeLayer nodes={nodes} onSelect={handleSelect} />}

        <DrawingLayer drawing={drawing} onPointAdd={handlePointAdd} />
      </MapContainer>

      <GameHUD
        zones={allZones}
        players={players}
        showZones={showZones}
        showPlayers={showPlayers}
        showNodes={showNodes}
        onToggleZones={() => setShowZones(v => !v)}
        onTogglePlayers={() => setShowPlayers(v => !v)}
        onToggleNodes={() => setShowNodes(v => !v)}
        isDrawing={drawing.mode !== "none"}
      />

      <DrawingPanel
        drawing={drawing}
        onModeChange={handleModeChange}
        onUpdateDrawing={(u) => setDrawing(prev => ({ ...prev, ...u }))}
        onFinishZone={handleFinishZone}
        onFinishBuilding={handleFinishBuilding}
        onFinishPoint={handleFinishPoint}
        onCancel={() => setDrawing(DEFAULT_DRAWING)}
      />

      <BottomSheet selected={selected} onClose={() => setSelected(null)} />

      {loading && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          background: "white",
          borderRadius: 12,
          padding: "16px 24px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
          fontSize: 14,
          color: "#374151",
          zIndex: 1100,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <span style={{ fontSize: 20 }}>🗺️</span>
          טוען מיקומים...
        </div>
      )}

      {error && (
        <div style={{
          position: "absolute",
          bottom: 80,
          left: "50%",
          transform: "translateX(-50%)",
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: 8,
          padding: "10px 16px",
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
