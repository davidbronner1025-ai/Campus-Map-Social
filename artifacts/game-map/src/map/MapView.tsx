import { useState, useCallback, useEffect } from "react";
import type {
  DrawingState, DrawingMode,
  ZonePolygon, Building, GamePoint, SelectedItem,
} from "../types/map";
import { useLocations } from "../hooks/useLocations";
import { useActivityEngine } from "../hooks/useActivityEngine";
import { BuildingPopup } from "./BuildingPopup";
import { CampusHUD } from "./CampusHUD";
import { DrawingPanel } from "./DrawingPanel";

// Lazy-load renderers so Leaflet CSS doesn't conflict with MapLibre CSS
import { LeafletStreetView } from "./LeafletStreetView";
import { MapLibreView } from "./MapLibreView";

const DEFAULT_DRAWING: DrawingState = {
  mode: "none", points: [], name: "", type: "academic", color: "#dc2626",
};

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    return !!gl;
  } catch {
    return false;
  }
}

export function MapView() {
  const { zones, setZones, loading, error } = useLocations();
  const { players } = useActivityEngine(zones, setZones);

  const [webGLAvailable] = useState(() => detectWebGL());
  const [use3DRenderer, setUse3DRenderer] = useState(() => detectWebGL());

  const [selected, setSelected]             = useState<SelectedItem>(null);
  const [drawing, setDrawing]               = useState<DrawingState>(DEFAULT_DRAWING);
  const [showZones, setShowZones]           = useState(true);
  const [showNodes, setShowNodes]           = useState(true);
  const [is3D, setIs3D]                     = useState(true);
  const [userZones, setUserZones]           = useState<ZonePolygon[]>([]);
  const [campusBoundary, setCampusBoundary] = useState<[number, number][]>([]);

  // Automatically find campus boundary from zones based on name or color
  useEffect(() => {
    const campusZone = zones.find(z => z.name === "שטח הקמפוס" || z.color === "#dc2626");
    if (campusZone) {
      console.log("[MapView] Campus boundary detected:", campusZone.name);
      setCampusBoundary(campusZone.coordinates);
    }
  }, [zones]);

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
    if (zone.color === "#dc2626") {
      setCampusBoundary(zone.coordinates);
    } else {
      setUserZones(prev => [...prev, zone]);
    }
    setDrawing(DEFAULT_DRAWING);
  }, []);

  const handleWebGLFail = useCallback(() => {
    setUse3DRenderer(false);
  }, []);

  const visibleZones = showZones ? [...zones, ...userZones] : [];

  const mapProps = {
    zones: visibleZones,
    players,
    campusBoundary,
    drawing,
    onPointAdd: handlePointAdd,
    onSelect: handleSelect,
  };

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      {use3DRenderer ? (
        <MapLibreView
          {...mapProps}
          is3D={is3D}
          onWebGLFail={handleWebGLFail}
        />
      ) : (
        <LeafletStreetView {...mapProps} />
      )}

      <CampusHUD
        zones={visibleZones}
        players={players}
        showZones={showZones}
        showNodes={showNodes}
        isDrawing={drawing.mode !== "none"}
        is3D={is3D && use3DRenderer}
        webGLAvailable={webGLAvailable}
        onToggleZones={() => setShowZones(v => !v)}
        onToggleNodes={() => setShowNodes(v => !v)}
        onToggle3D={() => {
          if (!use3DRenderer && webGLAvailable) {
            setUse3DRenderer(true);
          }
          setIs3D(v => !v);
        }}
      />

      <DrawingPanel
        drawing={drawing}
        onModeChange={handleModeChange}
        onUpdateDrawing={u => setDrawing(prev => ({ ...prev, ...u }))}
        onFinishZone={handleFinishZone}
        onFinishBuilding={() => setDrawing(DEFAULT_DRAWING)}
        onFinishPoint={() => setDrawing(DEFAULT_DRAWING)}
        onCancel={() => setDrawing(DEFAULT_DRAWING)}
      />

      <BuildingPopup selected={selected} onClose={() => setSelected(null)} />

      {!use3DRenderer && webGLAvailable === false && (
        <div style={{
          position: "absolute", bottom: 80, left: "50%", transform: "translateX(-50%)",
          background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)",
          border: "1px solid #e2e8f0", borderRadius: 10,
          padding: "8px 16px", fontSize: 12, color: "#64748b", zIndex: 1100,
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <span>🖥️</span>
          מצב 3D זמין בדפדפן עם תמיכת GPU
        </div>
      )}

      {loading && (
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          background: "rgba(255,255,255,0.95)", backdropFilter: "blur(16px)",
          borderRadius: 16, padding: "18px 28px", boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          fontSize: 14, color: "#374151", zIndex: 1100,
          display: "flex", alignItems: "center", gap: 12, fontWeight: 600,
        }}>
          <span style={{ fontSize: 22 }}>🗺️</span> טוען מיקומים...
        </div>
      )}

      {error && (
        <div style={{
          position: "absolute", bottom: 100, left: "50%", transform: "translateX(-50%)",
          background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10,
          padding: "10px 18px", fontSize: 13, color: "#dc2626", zIndex: 1100,
        }}>
          {error}
        </div>
      )}
    </div>
  );
}
