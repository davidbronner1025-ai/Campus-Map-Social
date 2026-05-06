import { motion } from "framer-motion";

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
  const now = new Date();
  const timeStr = now.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = now.toLocaleDateString("he-IL");

  return (
    <>
      <div style={{
        position: "absolute",
        top: 16,
        left: 16,
        zIndex: 900,
        fontFamily: "monospace",
        pointerEvents: "none",
      }}>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{
            background: "rgba(0,0,0,0.82)",
            border: "1px solid #00f5ff30",
            borderRadius: 4,
            padding: "10px 16px",
            marginBottom: 8,
          }}
        >
          <div style={{ color: "#00f5ff", fontSize: 14, fontWeight: "bold", letterSpacing: 2 }}>
            ◈ CAMPUS MAP
          </div>
          <div style={{ color: "#00f5ff60", fontSize: 10, marginTop: 2 }}>
            אשקלון קולג׳ · מערכת שכבות
          </div>
          <div style={{ color: "#444", fontSize: 9, marginTop: 6 }}>
            {dateStr} {timeStr}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            background: "rgba(0,0,0,0.82)",
            border: "1px solid #1a1a2e",
            borderRadius: 4,
            padding: "10px 14px",
          }}
        >
          <div style={{ color: "#333", fontSize: 9, marginBottom: 6 }}>שכבות פעילות</div>
          {[
            { label: "נקודות עניין", count: pointCount, color: "#ff0080", active: showPoints, toggle: onTogglePoints },
            { label: "אזורים", count: zoneCount, color: "#00f5ff", active: showZones, toggle: onToggleZones },
            { label: "מבנים", count: buildingCount, color: "#ff9000", active: showBuildings, toggle: onToggleBuildings },
          ].map(({ label, count, color, active, toggle }) => (
            <div
              key={label}
              onClick={toggle}
              style={{
                pointerEvents: "all",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 4,
                opacity: active ? 1 : 0.35,
                transition: "opacity 0.2s",
              }}
            >
              <div style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: active ? color : "#333",
                boxShadow: active ? `0 0 6px ${color}` : "none",
                transition: "all 0.2s",
              }} />
              <span style={{ color: active ? "#ccc" : "#444", fontSize: 11 }}>{label}</span>
              <span style={{ color: active ? color : "#333", fontSize: 11, marginLeft: "auto" }}>
                {count}
              </span>
            </div>
          ))}
        </motion.div>
      </div>

      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        background: "linear-gradient(90deg, transparent, #00f5ff40, transparent)",
        pointerEvents: "none",
        zIndex: 900,
      }} />
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 2,
        background: "linear-gradient(90deg, transparent, #ff008040, transparent)",
        pointerEvents: "none",
        zIndex: 900,
      }} />
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        bottom: 0,
        width: 2,
        background: "linear-gradient(180deg, transparent, #00f5ff40, transparent)",
        pointerEvents: "none",
        zIndex: 900,
      }} />
      <div style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        width: 2,
        background: "linear-gradient(180deg, transparent, #ff008040, transparent)",
        pointerEvents: "none",
        zIndex: 900,
      }} />
    </>
  );
}
