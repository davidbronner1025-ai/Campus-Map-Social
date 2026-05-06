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
  color: "#2563eb",
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

  const handlePointClick = useCallback((p: GamePoint) => setSelected({ kind: "point", data: p }), []);
  const handleZoneClick = useCallback((z: ZonePolygon) => setSelected({ kind: "zone", data: z }), []);
  const handleBuildingClick = useCallback((b: Building) => setSelected({ kind: "building", data: b }), []);

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

  const handleCancel = useCallback(() => setDrawing(DEFAULT_DRAWING), []);

  const isDrawing = drawing.mode !== "none";

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", background: "#f8fafc" }}>
      <style>{`
        .leaflet-container { background: #e2e8f0; }
        .leaflet-tile { filter: saturate(0.85) brightness(1.05) contrast(1.02); }
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 1px 4px rgba(0,0,0,0.15) !important;
        }
        .leaflet-control-zoom a {
          background: #ffffff !important;
          border-color: #e2e8f0 !important;
          color: #374151 !important;
          font-weight: 600 !important;
          width: 30px !important;
          height: 30px !important;
          line-height: 30px !important;
        }
        .leaflet-control-zoom a:hover {
          background: #f1f5f9 !important;
          color: #111827 !important;
        }
        .leaflet-control-attribution { display: none; }
        .leaflet-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        ${isDrawing ? "* { cursor: crosshair !important; }" : ""}
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
    </div>
  );
}
