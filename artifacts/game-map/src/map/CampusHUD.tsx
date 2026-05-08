import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import type { ZonePolygon, PlayerMarker } from "../types/map";
import { CAMPUS_NAME } from "../data/campusData";

interface CampusHUDProps {
  zones: ZonePolygon[];
  players: PlayerMarker[];
  showZones: boolean;
  showNodes: boolean;
  isDrawing: boolean;
  is3D: boolean;
  webGLAvailable: boolean;
  onToggleZones: () => void;
  onToggleNodes: () => void;
  onToggle3D: () => void;
}

export function CampusHUD({
  zones, players,
  showZones, showNodes,
  isDrawing, is3D, webGLAvailable,
  onToggleZones, onToggleNodes, onToggle3D,
}: CampusHUDProps) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hotZones    = zones.filter(z => z.state === "hot").length;
  const activeZones = zones.filter(z => z.state === "active").length;
  const online      = players.filter(p => p.online).length;

  return (
    <div style={{
      position: "absolute", top: 16, left: 16, zIndex: 900,
      display: "flex", flexDirection: "column", gap: 8,
      pointerEvents: "none", width: 182,
    }}>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={glass}>
        <div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a" }}>{CAMPUS_NAME}</div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
          <span>{time.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}</span>
          {isDrawing && (
            <span style={{ background: "#fff7ed", color: "#ea580c", borderRadius: 6, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>
              עורך פעיל
            </span>
          )}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }} style={glass}>
        <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, letterSpacing: 0.9, textTransform: "uppercase", marginBottom: 10 }}>
          פעילות חיה
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5 }}>
          <StatPill value={hotZones}    label="לוהט"   color="#ef4444" emoji="🔥" />
          <StatPill value={activeZones} label="פעיל"   color="#3b82f6" emoji="⚡" />
          <StatPill value={online}      label="נוכחים" color="#22c55e" emoji="👤" />
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
        style={{ ...glass, pointerEvents: "all" }}
      >
        <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, letterSpacing: 0.9, textTransform: "uppercase", marginBottom: 9 }}>
          אגדה
        </div>
        <LegendRow dot="#ef4444" label="עומס מאוד" />
        <LegendRow dot="#f59e0b" label="עומס" />
        <LegendRow dot="#22c55e" label="שקט" />

        <div style={{ borderTop: "1px solid #e8ecf0", margin: "9px 0" }} />

        <LayerToggle label="מבנים"   active={showZones} color="#2563eb" onToggle={onToggleZones} />
        <LayerToggle label="אירועים" active={showNodes} color="#ea580c" onToggle={onToggleNodes} />

        {webGLAvailable && (
          <>
            <div style={{ borderTop: "1px solid #e8ecf0", margin: "9px 0 6px" }} />
            <button
              onClick={onToggle3D}
              style={{
                width: "100%",
                background: is3D ? "#0f172a" : "#f8fafc",
                color: is3D ? "white" : "#374151",
                border: `1px solid ${is3D ? "#0f172a" : "#e2e8f0"}`,
                borderRadius: 8, padding: "7px 0", fontSize: 12, fontWeight: 700,
                cursor: "pointer", transition: "all 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              <span style={{ fontSize: 14 }}>{is3D ? "🏢" : "🗺️"}</span>
              {is3D ? "מצב 3D" : "מצב 2D"}
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}

function StatPill({ value, label, color, emoji }: { value: number; label: string; color: string; emoji: string }) {
  return (
    <div style={{ background: "#f8fafc", border: "1px solid #e8ecf0", borderRadius: 10, padding: "7px 4px", textAlign: "center" }}>
      <div style={{ fontSize: 13 }}>{emoji}</div>
      <div style={{ color, fontSize: 17, fontWeight: 800, lineHeight: 1.1 }}>{value}</div>
      <div style={{ color: "#94a3b8", fontSize: 9, marginTop: 1 }}>{label}</div>
    </div>
  );
}

function LegendRow({ dot, label }: { dot: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: dot, flexShrink: 0 }} />
      <span style={{ color: "#475569", fontSize: 11 }}>{label}</span>
    </div>
  );
}

function LayerToggle({ label, active, color, onToggle }: { label: string; active: boolean; color: string; onToggle: () => void }) {
  return (
    <div onClick={onToggle} style={{
      display: "flex", alignItems: "center", gap: 8, marginBottom: 5,
      cursor: "pointer", opacity: active ? 1 : 0.38, transition: "opacity 0.15s", userSelect: "none",
    }}>
      <div style={{ width: 10, height: 10, borderRadius: 3, background: active ? color : "#d1d5db", transition: "background 0.15s", flexShrink: 0 }} />
      <span style={{ color: "#374151", fontSize: 11 }}>{label}</span>
    </div>
  );
}

const glass: React.CSSProperties = {
  background: "rgba(255,255,255,0.90)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  border: "1px solid rgba(255,255,255,0.75)",
  borderRadius: 14, padding: "12px 14px",
  boxShadow: "0 2px 20px rgba(0,0,0,0.09), 0 1px 0 rgba(255,255,255,0.9) inset",
};
