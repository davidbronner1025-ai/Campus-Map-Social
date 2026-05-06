import { motion } from "framer-motion";
import { CAMPUS_NAME } from "../data/campusData";

interface HUDOverlayProps {
  pointCount: number;
  zoneCount: number;
  buildingCount: number;
  showBuildings: boolean;
  showZones: boolean;
  showPoints: boolean;
  onToggleBuildings: () => void;
  onToggleZones: () => void;
  onTogglePoints: () => void;
}

export function HUDOverlay({
  pointCount,
  zoneCount,
  buildingCount,
  showBuildings,
  showZones,
  showPoints,
  onToggleBuildings,
  onToggleZones,
  onTogglePoints,
}: HUDOverlayProps) {
  return (
    <div style={{
      position: "absolute",
      top: 16,
      left: 16,
      zIndex: 900,
      display: "flex",
      flexDirection: "column",
      gap: 8,
      pointerEvents: "none",
    }}>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 10,
          padding: "10px 14px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
        }}
      >
        <div style={{ color: "#111827", fontSize: 13, fontWeight: 700, letterSpacing: 0.2 }}>
          {CAMPUS_NAME}
        </div>
        <div style={{ color: "#6b7280", fontSize: 11, marginTop: 1 }}>
          גן יבנה · מפת קמפוס אינטראקטיבית
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.07 }}
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 10,
          padding: "10px 14px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
          pointerEvents: "all",
        }}
      >
        <div style={{ color: "#9ca3af", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
          שכבות
        </div>
        {[
          { label: "נקודות עניין", count: pointCount, color: "#ea580c", active: showPoints, toggle: onTogglePoints },
          { label: "אזורים",       count: zoneCount,   color: "#2563eb", active: showZones,  toggle: onToggleZones  },
          { label: "מבנים",        count: buildingCount,color: "#059669", active: showBuildings, toggle: onToggleBuildings },
        ].map(({ label, count, color, active, toggle }) => (
          <div
            key={label}
            onClick={toggle}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 0",
              cursor: "pointer",
              opacity: active ? 1 : 0.4,
              transition: "opacity 0.18s",
              userSelect: "none",
            }}
          >
            <div style={{
              width: 10,
              height: 10,
              borderRadius: 3,
              background: active ? color : "#d1d5db",
              flexShrink: 0,
              transition: "background 0.18s",
            }} />
            <span style={{ color: "#374151", fontSize: 12, flex: 1 }}>{label}</span>
            <span style={{
              color: active ? color : "#9ca3af",
              fontSize: 11,
              fontWeight: 600,
              minWidth: 16,
              textAlign: "right",
            }}>{count}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
