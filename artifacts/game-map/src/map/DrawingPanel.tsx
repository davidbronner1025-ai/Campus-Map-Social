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

const ZONE_COLORS = ["#2563eb", "#dc2626", "#16a34a", "#ea580c", "#7c3aed", "#ca8a04"];

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
      });
    } else if (drawing.mode === "point" && drawing.points.length > 0) {
      const [lat, lng] = drawing.points[0];
      onFinishPoint({
        id: `gp-${Date.now()}`,
        name: drawing.name || "נקודה חדשה",
        type: pointType,
        lat,
        lng,
        priority: 3,
      });
    }
  }

  const card: React.CSSProperties = {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 1000,
    width: 224,
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: "14px 16px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.10)",
    fontFamily: "system-ui, sans-serif",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "#f9fafb",
    border: "1px solid #e2e8f0",
    borderRadius: 6,
    color: "#111827",
    padding: "6px 10px",
    fontSize: 13,
    direction: "rtl",
    outline: "none",
    boxSizing: "border-box",
  };

  const btnPrimary: React.CSSProperties = {
    flex: 1,
    background: "#2563eb",
    border: "none",
    color: "#fff",
    padding: "7px 12px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
  };

  const btnGhost: React.CSSProperties = {
    flex: 1,
    background: "#f1f5f9",
    border: "1px solid #e2e8f0",
    color: "#374151",
    padding: "7px 12px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 13,
  };

  const modeBtn = (label: string, mode: DrawingMode, color: string) => (
    <button
      onClick={() => onModeChange(mode)}
      style={{
        width: "100%",
        background: "#f8fafc",
        border: `1px solid ${color}40`,
        color: color,
        padding: "8px 12px",
        borderRadius: 7,
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 600,
        textAlign: "right" as const,
        marginBottom: 6,
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={card}>
      <div style={{ color: "#111827", fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
        ✏️ עורך מפה
      </div>

      {drawing.mode === "none" ? (
        <>
          {modeBtn("+ הוסף אזור / פוליגון", "zone", "#2563eb")}
          {modeBtn("+ הוסף מבנה", "building", "#059669")}
          {modeBtn("+ הוסף נקודת עניין", "point", "#ea580c")}
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ color: "#6b7280", fontSize: 12, background: "#f1f5f9", borderRadius: 6, padding: "6px 10px" }}>
            {drawing.mode === "zone" && "לחץ על המפה להוסיף נקודות לפוליגון (מינ׳ 3)"}
            {drawing.mode === "building" && "לחץ על המפה למיקום המבנה"}
            {drawing.mode === "point" && "לחץ על המפה למיקום הנקודה"}
          </div>

          <input
            placeholder="שם..."
            value={drawing.name}
            onChange={e => onUpdateDrawing({ name: e.target.value })}
            style={inputStyle}
          />

          {drawing.mode === "zone" && (
            <div>
              <div style={{ color: "#6b7280", fontSize: 11, marginBottom: 6 }}>צבע אזור</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {ZONE_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => onUpdateDrawing({ color: c })}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 4,
                      background: c,
                      border: drawing.color === c ? "2px solid #111" : "2px solid transparent",
                      cursor: "pointer",
                      boxShadow: drawing.color === c ? `0 0 0 1px ${c}` : "none",
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {drawing.mode === "point" && (
            <div>
              <div style={{ color: "#6b7280", fontSize: 11, marginBottom: 6 }}>סוג נקודה</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {(["event", "post", "zone", "npc"] as GamePoint["type"][]).map(t => (
                  <button
                    key={t}
                    onClick={() => setPointType(t)}
                    style={{
                      background: pointType === t ? `${POINT_TYPE_COLORS[t]}18` : "#f8fafc",
                      border: `1px solid ${pointType === t ? POINT_TYPE_COLORS[t] : "#e2e8f0"}`,
                      color: pointType === t ? POINT_TYPE_COLORS[t] : "#6b7280",
                      padding: "4px 8px",
                      borderRadius: 5,
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: pointType === t ? 700 : 400,
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {drawing.mode === "building" && (
            <select
              value={drawing.type}
              onChange={e => onUpdateDrawing({ type: e.target.value })}
              style={{ ...inputStyle }}
            >
              <option value="academic">אקדמי</option>
              <option value="admin">מינהל</option>
              <option value="sports">ספורט</option>
              <option value="dining">אוכל</option>
              <option value="parking">חניה</option>
              <option value="other">אחר</option>
            </select>
          )}

          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={handleFinish}
              disabled={drawing.points.length === 0}
              style={{ ...btnPrimary, opacity: drawing.points.length === 0 ? 0.45 : 1 }}
            >
              ✓ שמור
            </button>
            <button onClick={onCancel} style={btnGhost}>ביטול</button>
          </div>

          <div style={{ color: "#9ca3af", fontSize: 11 }}>
            {drawing.points.length} נקודות נבחרו
          </div>
        </div>
      )}
    </div>
  );
}
