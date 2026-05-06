import { useState, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, ZoomControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type {
  GamePoint,
  ZonePolygon,
  Building,
  DrawingState,
  DrawingMode,
} from "../types/map";
import {
  INITIAL_GAME_POINTS,
  INITIAL_ZONES,
  INITIAL_BUILDINGS,
  MAP_CENTER,
  MAP_ZOOM,
  MAP_BOUNDS,
} from "../data/campusData";
import { resolveOverlaps } from "./utils";
import { CustomMarker } from "./CustomMarker";
import { ZoneLayer } from "./ZoneLayer";
import { BuildingLayer } from "./BuildingLayer";
import { DrawingLayer } from "./DrawingLayer";
import { InfoPanel } from "./InfoPanel";
import { DrawingPanel } from "./DrawingPanel";
import { HUDOverlay } from "./HUDOverlay";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

type SelectedItem =
  | { kind: "point"; data: GamePoint }
  | { kind: "zone"; data: ZonePolygon }
  | { kind: "building"; data: Building }
  | null;

const DEFAULT_DRAWING: DrawingState = {
  mode: "none",
  points: [],
  name: "",
  type: "academic",
  color: "#00f5ff",
};

const leafletBounds = L.latLngBounds(
  [MAP_BOUNDS.south, MAP_BOUNDS.west],
  [MAP_BOUNDS.north, MAP_BOUNDS.east]
);

export function MapView() {
  const [gamePoints, setGamePoints] = useState<GamePoint[]>(INITIAL_GAME_POINTS);
  const [zones, setZones] = useState<ZonePolygon[]>(INITIAL_ZONES);
  const [buildings, setBuildings] = useState<Building[]>(INITIAL_BUILDINGS);
  const [selected, setSelected] = useState<SelectedItem>(null);
  const [drawing, setDrawing] = useState<DrawingState>(DEFAULT_DRAWING);
  const [showBuildings, setShowBuildings] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [showPoints, setShowPoints] = useState(true);

  const visiblePoints = useMemo(
    () => resolveOverlaps(gamePoints.filter(p => typeof p.lat === "number" && typeof p.lng === "number")),
    [gamePoints]
  );

  const handlePointClick = useCallback((p: GamePoint) => {
    setSelected({ kind: "point", data: p });
  }, []);

  const handleZoneClick = useCallback((z: ZonePolygon) => {
    setSelected({ kind: "zone", data: z });
  }, []);

  const handleBuildingClick = useCallback((b: Building) => {
    setSelected({ kind: "building", data: b });
  }, []);

  const handleModeChange = useCallback((mode: DrawingMode) => {
    setDrawing({ ...DEFAULT_DRAWING, mode });
    setSelected(null);
  }, []);

  const handlePointAdd = useCallback((lat: number, lng: number) => {
    setDrawing(prev => ({
      ...prev,
      points: drawing.mode === "building" || drawing.mode === "point"
        ? [[lat, lng]]
        : [...prev.points, [lat, lng]],
    }));
  }, [drawing.mode]);

  const handleFinishZone = useCallback((zone: ZonePolygon) => {
    setZones(prev => [...prev, zone]);
    setDrawing(DEFAULT_DRAWING);
  }, []);

  const handleFinishBuilding = useCallback((building: Building) => {
    setBuildings(prev => [...prev, building]);
    setDrawing(DEFAULT_DRAWING);
  }, []);

  const handleFinishPoint = useCallback((point: GamePoint) => {
    setGamePoints(prev => [...prev, point]);
    setDrawing(DEFAULT_DRAWING);
  }, []);

  const handleCancel = useCallback(() => {
    setDrawing(DEFAULT_DRAWING);
  }, []);

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", background: "#000" }}>
      <style>{`
        .leaflet-container { background: #0a0a0f; }
        .leaflet-tile { filter: saturate(0.4) brightness(0.55) hue-rotate(185deg) contrast(1.1); }
        .leaflet-control-zoom a {
          background: rgba(0,0,0,0.85) !important;
          border-color: #1a1a2e !important;
          color: #00f5ff !important;
          font-family: monospace !important;
        }
        .leaflet-control-zoom a:hover {
          background: rgba(0,245,255,0.15) !important;
          color: #fff !important;
        }
        .leaflet-control-attribution { display: none; }
        .cyberpunk-tooltip { background: transparent !important; border: none !important; box-shadow: none !important; }
        .leaflet-tooltip { background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: translateX(-50%) scale(1); }
          50% { opacity: 0.4; transform: translateX(-50%) scale(1.5); }
        }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
      `}</style>

      <MapContainer
        center={MAP_CENTER}
        zoom={MAP_ZOOM}
        maxBounds={leafletBounds}
        maxBoundsViscosity={0.9}
        minZoom={16}
        maxZoom={20}
        zoomControl={false}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution=""
          keepBuffer={4}
          updateWhenIdle={false}
          updateWhenZooming={false}
        />

        <ZoomControl position="bottomright" />

        {showZones && <ZoneLayer zones={zones} onZoneClick={handleZoneClick} />}
        {showBuildings && <BuildingLayer buildings={buildings} onBuildingClick={handleBuildingClick} />}
        {showPoints && visiblePoints.map(p => (
          <CustomMarker key={p.id} point={p} onClick={handlePointClick} />
        ))}

        <DrawingLayer drawing={drawing} onPointAdd={handlePointAdd} />
      </MapContainer>

      <HUDOverlay
        pointCount={gamePoints.length}
        zoneCount={zones.length}
        buildingCount={buildings.length}
        showBuildings={showBuildings}
        showZones={showZones}
        showPoints={showPoints}
        onToggleBuildings={() => setShowBuildings(v => !v)}
        onToggleZones={() => setShowZones(v => !v)}
        onTogglePoints={() => setShowPoints(v => !v)}
      />

      <DrawingPanel
        drawing={drawing}
        onModeChange={handleModeChange}
        onUpdateDrawing={(u) => setDrawing(prev => ({ ...prev, ...u }))}
        onFinishZone={handleFinishZone}
        onFinishBuilding={handleFinishBuilding}
        onFinishPoint={handleFinishPoint}
        onCancel={handleCancel}
      />

      <InfoPanel selected={selected} onClose={() => setSelected(null)} />

      <div style={{
        position: "absolute",
        bottom: 70,
        right: 16,
        zIndex: 900,
        background: "rgba(0,0,0,0.7)",
        border: "1px solid #1a1a2e",
        padding: "4px 8px",
        fontFamily: "monospace",
        fontSize: 9,
        color: "#444",
        borderRadius: 3,
      }}>
        Esri World Imagery
      </div>
    </div>
  );
}
