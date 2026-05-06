import { useState } from "react";
import type { DrawingMode, DrawingState, ZonePolygon, Building, GamePoint } from "../types/map";
import { POINT_TYPE_COLORS } from "./utils";

interface DrawingPanelProps {
  drawing: DrawingState;
  onModeChange: (mode: DrawingMode) => void;
  onUpdateDrawing: (updates: Partial<DrawingState>) => void;
  onFinishZone: (zone: ZonePolygon) => void;
  onFinishBuilding: (building: Building) => void;
  onFinishPoint: (point: GamePoint) => void;
  onCancel: () => void;
}

const ZONE_COLORS = ["#00f5ff", "#ff0080", "#7fff00", "#ff9000", "#aa44ff", "#ffff00"];

export function DrawingPanel({
  drawing,
  onModeChange,
  onUpdateDrawing,
  onFinishZone,
  onFinishBuilding,
  onFinishPoint,
  onCancel,
}: DrawingPanelProps) {
  const [pointType, setPointType] = useState<GamePoint["type"]>("event");

  function handleFinish() {
    if (drawing.mode === "zone" && drawing.points.length >= 3) {
      onFinishZone({
        id: `zone-${Date.now()}`,
        name: drawing.name || "אזור חדש",
        color: drawing.color,
        coordinates: drawing.points,
      });
    } else if (drawing.mode === "building" && drawing.points.length > 0) {
      const [lat, lng] = drawing.points[0];
      onFinishBuilding({
        id: `bld-${Date.now()}`,
        name: drawing.name || "מבנה חדש",
        type: (drawing.type as Building["type"]) || "other",
        lat,
        lng,
        description: "",
      });
    } else if (drawing.mode === "point" && drawing.points.length > 0) {
      const [lat, lng] = drawing.points[0];
      onFinishPoint({
        id: `gp-${Date.now()}`,
        name: drawing.name || "נקודה חדשה",
        type: pointType,
        lat,
        lng,
        description: "",
        priority: 3,
      });
    }
  }

  const btnStyle = (active: boolean, color = "#00f5ff") => ({
    background: active ? `${color}22` : "rgba(0,0,0,0.6)",
    border: `1px solid ${active ? color : "#333"}`,
    color: active ? color : "#555",
    padding: "6px 12px",
    borderRadius: 3,
    cursor: "pointer",
    fontSize: 12,
    fontFamily: "monospace",
    transition: "all 0.15s",
    boxShadow: active ? `0 0 8px ${color}40` : "none",
  });

  return (
    <div style={{
      position: "absolute",
      top: 16,
      right: 16,
      zIndex: 1000,
      width: 220,
      background: "rgba(0,0,0,0.88)",
      border: "1px solid #333",
      borderRadius: 6,
      padding: "14px 16px",
      fontFamily: "monospace",
      backdropFilter: "blur(10px)",
    }}>
      <div style={{ color: "#00f5ff", fontSize: 11, marginBottom: 12, opacity: 0.8 }}>
        ◈ עורך מפה
      </div>

      {drawing.mode === "none" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={() => onModeChange("zone")} style={btnStyle(false, "#00f5ff")}>
            + אזור / פוליגון
          </button>
          <button onClick={() => onModeChange("building")} style={btnStyle(false, "#ff9000")}>
            + מבנה
          </button>
          <button onClick={() => onModeChange("point")} style={btnStyle(false, "#ff0080")}>
            + נקודת עניין
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ color: "#00f5ff", fontSize: 11 }}>
            {drawing.mode === "zone" && "לחץ על המפה להוסיף נקודות לפוליגון"}
            {drawing.mode === "building" && "לחץ על המפה למיקום המבנה"}
            {drawing.mode === "point" && "לחץ על המפה למיקום הנקודה"}
          </div>

          <input
            placeholder="שם..."
            value={drawing.name}
            onChange={e => onUpdateDrawing({ name: e.target.value })}
            style={{
              background: "rgba(0,0,0,0.6)",
              border: "1px solid #333",
              color: "#fff",
              padding: "5px 8px",
              borderRadius: 3,
              fontSize: 12,
              fontFamily: "monospace",
              direction: "rtl",
            }}
          />

          {drawing.mode === "zone" && (
            <div>
              <div style={{ color: "#555", fontSize: 10, marginBottom: 4 }}>צבע</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {ZONE_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => onUpdateDrawing({ color: c })}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 3,
                      background: c,
                      border: drawing.color === c ? "2px solid #fff" : "2px solid transparent",
                      cursor: "pointer",
                      boxShadow: drawing.color === c ? `0 0 6px ${c}` : "none",
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {drawing.mode === "point" && (
            <div>
              <div style={{ color: "#555", fontSize: 10, marginBottom: 4 }}>סוג נקודה</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {(["event", "post", "zone", "npc"] as GamePoint["type"][]).map(t => (
                  <button
                    key={t}
                    onClick={() => setPointType(t)}
                    style={btnStyle(pointType === t, POINT_TYPE_COLORS[t])}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {drawing.mode === "building" && (
            <div>
              <div style={{ color: "#555", fontSize: 10, marginBottom: 4 }}>סוג מבנה</div>
              <select
                value={drawing.type}
                onChange={e => onUpdateDrawing({ type: e.target.value })}
                style={{
                  background: "rgba(0,0,0,0.8)",
                  border: "1px solid #333",
                  color: "#aaa",
                  padding: "4px 6px",
                  borderRadius: 3,
                  fontSize: 12,
                  fontFamily: "monospace",
                  width: "100%",
                }}
              >
                <option value="academic">אקדמי</option>
                <option value="admin">מינהל</option>
                <option value="sports">ספורט</option>
                <option value="dining">אוכל</option>
                <option value="parking">חניה</option>
                <option value="other">אחר</option>
              </select>
            </div>
          )}

          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={handleFinish}
              disabled={drawing.points.length === 0}
              style={{
                ...btnStyle(true, "#00f5ff"),
                flex: 1,
                opacity: drawing.points.length === 0 ? 0.4 : 1,
              }}
            >
              ✓ שמור
            </button>
            <button onClick={onCancel} style={{ ...btnStyle(false), flex: 1 }}>
              ✕
            </button>
          </div>

          <div style={{ color: "#444", fontSize: 10 }}>
            {drawing.points.length} נקודות
          </div>
        </div>
      )}
    </div>
  );
}
