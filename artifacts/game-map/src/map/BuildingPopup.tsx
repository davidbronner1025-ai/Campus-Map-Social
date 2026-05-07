import { motion, AnimatePresence } from "framer-motion";
import type { SelectedItem } from "../types/map";

const ZONE_ICONS: Record<string, string> = {
  "#2563eb": "📖",
  "#ca8a04": "🍽️",
  "#16a34a": "⚽",
  "#7c3aed": "📚",
  "#dc2626": "🏛️",
  "#64748b": "🏢",
};

const STATE_CONFIG = {
  hot:     { label: "לוהט",  emoji: "🔥", bg: "#fef2f2", text: "#dc2626" },
  active:  { label: "פעיל",  emoji: "⚡", bg: "#eff6ff", text: "#2563eb" },
  neutral: { label: "רגוע",  emoji: "😌", bg: "#f8fafc", text: "#64748b" },
};

interface BuildingPopupProps {
  selected: SelectedItem;
  onClose: () => void;
}

export function BuildingPopup({ selected, onClose }: BuildingPopupProps) {
  const isVisible = selected !== null;
  const data = selected?.kind === "zone" ? selected.data :
               selected?.kind === "node" ? selected.data :
               selected?.kind === "player" ? selected.data : null;

  return (
    <AnimatePresence>
      {isVisible && data && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 900,
              background: "transparent",
            }}
          />
          <motion.div
            key="card"
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 500, damping: 38, mass: 0.8 }}
            style={{
              position: "absolute",
              bottom: 24,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 1000,
              width: "min(380px, calc(100vw - 40px))",
              background: "rgba(255,255,255,0.96)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderRadius: 20,
              boxShadow: "0 8px 40px rgba(0,0,0,0.14), 0 1px 0 rgba(255,255,255,0.8) inset",
              border: "1px solid rgba(255,255,255,0.7)",
              overflow: "hidden",
            }}
          >
            {selected?.kind === "zone" && <ZoneCard data={selected.data} onClose={onClose} />}
            {selected?.kind === "node" && <NodeCard data={selected.data} onClose={onClose} />}
            {selected?.kind === "player" && <PlayerCard data={selected.data} onClose={onClose} />}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ZoneCard({ data, onClose }: { data: any; onClose: () => void }) {
  const state = STATE_CONFIG[data.state as keyof typeof STATE_CONFIG] ?? STATE_CONFIG.neutral;
  const icon = ZONE_ICONS[data.color] ?? "🏢";

  return (
    <div style={{ padding: "20px 20px 22px", direction: "rtl" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: `${data.color}15`,
          border: `1.5px solid ${data.color}30`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          flexShrink: 0,
        }}>{icon}</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", lineHeight: 1.2 }}>
            {data.name}
          </div>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            marginTop: 5,
            background: state.bg,
            color: state.text,
            borderRadius: 8,
            padding: "2px 8px",
            fontSize: 12,
            fontWeight: 700,
          }}>
            {state.emoji} {state.label}
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            border: "none",
            background: "#f1f5f9",
            color: "#9ca3af",
            cursor: "pointer",
            fontSize: 13,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >✕</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
        {[
          { label: "נוכחים", value: data.userCount ?? 0, icon: "👥" },
          { label: "הודעות", value: data.messageCount ?? 0, icon: "💬" },
          { label: "פעילות", value: data.activityScore ?? 0, icon: "⚡" },
        ].map(stat => (
          <div key={stat.label} style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: "10px 8px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 14 }}>{stat.icon}</div>
            <div style={{ color: "#0f172a", fontSize: 20, fontWeight: 800 }}>{stat.value}</div>
            <div style={{ color: "#94a3b8", fontSize: 10, fontWeight: 500 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {(data.activityScore ?? 0) === 0 && (
        <div style={{
          marginTop: 12,
          background: "#f8fafc",
          borderRadius: 10,
          padding: "10px 14px",
          color: "#94a3b8",
          fontSize: 13,
          textAlign: "center",
        }}>
          אין פעילות כרגע
        </div>
      )}
    </div>
  );
}

function NodeCard({ data, any, onClose }: { data: any; any?: any; onClose: () => void }) {
  const typeMap: Record<string, { color: string; label: string; icon: string }> = {
    event:   { color: "#ea580c", label: "אירוע",  icon: "🎯" },
    message: { color: "#2563eb", label: "הודעה",  icon: "💬" },
    pin:     { color: "#7c3aed", label: "פין",    icon: "📌" },
  };
  const t = typeMap[data.type] ?? typeMap.pin;
  const mins = Math.round((Date.now() - new Date(data.createdAt).getTime()) / 60000);

  return (
    <div style={{ padding: "20px 20px 22px", direction: "rtl" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: `${t.color}12`,
          border: `1.5px solid ${t.color}28`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          flexShrink: 0,
        }}>{t.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a" }}>{data.title}</div>
          <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 3 }}>
            {data.creator} · לפני {mins} דקות
          </div>
        </div>
        <button onClick={onClose} style={{ width:28,height:28,borderRadius:8,border:"none",background:"#f1f5f9",color:"#9ca3af",cursor:"pointer",fontSize:13 }}>✕</button>
      </div>

      {data.participants > 0 && (
        <div style={{
          background: `${t.color}10`,
          border: `1px solid ${t.color}25`,
          borderRadius: 12,
          padding: "10px 14px",
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "#374151",
          fontSize: 13,
        }}>
          <span>👥</span>
          <span><strong style={{ color: t.color }}>{data.participants}</strong> משתתפים</span>
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button style={{
          flex: 1,
          background: t.color,
          color: "white",
          border: "none",
          borderRadius: 12,
          padding: "12px",
          fontSize: 14,
          fontWeight: 700,
          cursor: "pointer",
        }}>
          {data.type === "event" ? "הצטרף לאירוע" : "פתח"}
        </button>
        <button style={{
          background: "#f1f5f9",
          color: "#374151",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: "12px 16px",
          fontSize: 14,
          cursor: "pointer",
        }}>שתף</button>
      </div>
    </div>
  );
}

function PlayerCard({ data, onClose }: { data: any; onClose: () => void }) {
  return (
    <div style={{ padding: "20px 20px 22px", direction: "rtl" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          background: data.avatarColor,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white", fontSize: 20, fontWeight: 800,
          flexShrink: 0,
        }}>{data.name[0]}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{data.name}</div>
          <div style={{ color: "#22c55e", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
            מחובר עכשיו
          </div>
        </div>
        <button onClick={onClose} style={{ width:28,height:28,borderRadius:8,border:"none",background:"#f1f5f9",color:"#9ca3af",cursor:"pointer",fontSize:13 }}>✕</button>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button style={{ flex:1, background: data.avatarColor, color:"white", border:"none", borderRadius:12, padding:12, fontSize:14, fontWeight:700, cursor:"pointer" }}>
          שלח הודעה
        </button>
        <button style={{ background:"#f1f5f9", color:"#374151", border:"1px solid #e2e8f0", borderRadius:12, padding:"12px 16px", fontSize:14, cursor:"pointer" }}>
          פרופיל
        </button>
      </div>
    </div>
  );
}
