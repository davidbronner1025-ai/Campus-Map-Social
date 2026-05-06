import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import type { ZonePolygon, PlayerMarker } from "../types/map";
import { CAMPUS_NAME } from "../data/campusData";

interface GameHUDProps {
  zones: ZonePolygon[];
  players: PlayerMarker[];
  showZones: boolean;
  showPlayers: boolean;
  showNodes: boolean;
  onToggleZones: () => void;
  onTogglePlayers: () => void;
  onToggleNodes: () => void;
  isDrawing: boolean;
}

export function GameHUD({
  zones, players,
  showZones, showPlayers, showNodes,
  onToggleZones, onTogglePlayers, onToggleNodes,
  isDrawing,
}: GameHUDProps) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hotZones = zones.filter(z => z.state === "hot").length;
  const activeZones = zones.filter(z => z.state === "active").length;
  const onlinePlayers = players.filter(p => p.online).length;
  const totalScore = zones.reduce((s, z) => s + (z.activityScore ?? 0), 0);

  return (
    <div style={{ position: "absolute", top: 16, left: 16, zIndex: 900, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={card}
      >
        <div style={{ fontWeight: 800, fontSize: 14, color: "#111827" }}>{CAMPUS_NAME}</div>
        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>
          {time.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
          {isDrawing && <span style={{ color: "#ea580c", fontWeight: 600 }}> · עורך פעיל</span>}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        style={card}
      >
        <div style={{ color: "#9ca3af", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 }}>
          פעילות חיה
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <StatBadge value={hotZones} label="לוהט" color="#ef4444" emoji="🔥" />
          <StatBadge value={activeZones} label="פעיל" color="#22c55e" emoji="⚡" />
          <StatBadge value={onlinePlayers} label="מחוברים" color="#2563eb" emoji="👤" />
          <StatBadge value={totalScore} label="ציון כולל" color="#7c3aed" emoji="★" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        style={{ ...card, pointerEvents: "all" }}
      >
        <div style={{ color: "#9ca3af", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 }}>
          שכבות
        </div>
        <LayerToggle label="אזורים" count={zones.length} color="#2563eb" active={showZones} onToggle={onToggleZones} />
        <LayerToggle label="שחקנים" count={onlinePlayers} color="#22c55e" active={showPlayers} onToggle={onTogglePlayers} />
        <LayerToggle label="אירועים" count={3} color="#ea580c" active={showNodes} onToggle={onToggleNodes} />
      </motion.div>
    </div>
  );
}

function StatBadge({ value, label, color, emoji }: { value: number; label: string; color: string; emoji: string }) {
  return (
    <div style={{
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      borderRadius: 7,
      padding: "7px 8px",
      textAlign: "center",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
        <span style={{ fontSize: 11 }}>{emoji}</span>
        <span style={{ color, fontSize: 18, fontWeight: 800 }}>{value}</span>
      </div>
      <div style={{ color: "#9ca3af", fontSize: 10 }}>{label}</div>
    </div>
  );
}

function LayerToggle({ label, count, color, active, onToggle }: {
  label: string; count: number; color: string; active: boolean; onToggle: () => void;
}) {
  return (
    <div
      onClick={onToggle}
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
      <span style={{ color: active ? color : "#9ca3af", fontSize: 11, fontWeight: 700 }}>{count}</span>
    </div>
  );
}

const card: React.CSSProperties = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  padding: "10px 14px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
};
