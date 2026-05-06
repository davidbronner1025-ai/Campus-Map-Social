import { motion, AnimatePresence } from "framer-motion";
import type { SelectedItem } from "../types/map";

interface BottomSheetProps {
  selected: SelectedItem;
  onClose: () => void;
}

const NODE_COLORS = { event: "#ea580c", message: "#2563eb", pin: "#7c3aed" };
const ZONE_STATE_LABEL = { neutral: "רגוע", active: "פעיל", hot: "🔥 לוהט" };

export function BottomSheet({ selected, onClose }: BottomSheetProps) {
  return (
    <AnimatePresence>
      {selected && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 999,
              background: "rgba(0,0,0,0.08)",
              backdropFilter: "blur(0px)",
            }}
          />
          <motion.div
            key={String((selected.data as any).id ?? (selected.data as any).name)}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 40 }}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 1000,
              background: "white",
              borderRadius: "16px 16px 0 0",
              padding: "0 0 env(safe-area-inset-bottom)",
              boxShadow: "0 -4px 32px rgba(0,0,0,0.13)",
              maxHeight: "60vh",
              overflowY: "auto",
            }}
          >
            <div style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              background: "#e2e8f0",
              margin: "12px auto 0",
            }} />

            <div style={{ padding: "16px 20px 24px" }}>
              {selected.kind === "zone" && <ZoneSheet data={selected.data} onClose={onClose} />}
              {selected.kind === "node" && <NodeSheet data={selected.data} onClose={onClose} />}
              {selected.kind === "player" && <PlayerSheet data={selected.data} onClose={onClose} />}
              {selected.kind === "point" && (
                <GenericSheet
                  title={selected.data.name}
                  subtitle={selected.data.type}
                  description={selected.data.description}
                  color="#2563eb"
                  onClose={onClose}
                />
              )}
              {selected.kind === "building" && (
                <GenericSheet
                  title={selected.data.name}
                  subtitle={selected.data.type}
                  description={selected.data.description}
                  color="#059669"
                  onClose={onClose}
                />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ZoneSheet({ data, onClose }: { data: any; onClose: () => void }) {
  const stateLabel = ZONE_STATE_LABEL[data.state as keyof typeof ZONE_STATE_LABEL] ?? "רגוע";
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <span style={{
            display: "inline-block",
            background: `${data.color}18`,
            color: data.color,
            fontSize: 11,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 4,
            marginBottom: 6,
          }}>
            {stateLabel}
          </span>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>{data.name}</div>
        </div>
        <CloseBtn onClose={onClose} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          { label: "משתמשים", value: data.userCount ?? 0, color: "#2563eb" },
          { label: "הודעות", value: data.messageCount ?? 0, color: "#7c3aed" },
          { label: "ציון פעילות", value: data.activityScore ?? 0, color: data.color },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            padding: "10px 8px",
            textAlign: "center",
          }}>
            <div style={{ color, fontSize: 22, fontWeight: 800 }}>{value}</div>
            <div style={{ color: "#9ca3af", fontSize: 11 }}>{label}</div>
          </div>
        ))}
      </div>

      {data.activityScore === 0 && (
        <div style={{
          background: "#f1f5f9",
          border: "1px dashed #e2e8f0",
          borderRadius: 8,
          padding: "12px 14px",
          color: "#6b7280",
          fontSize: 13,
          textAlign: "center",
        }}>
          אין פעילות באזור זה כרגע
        </div>
      )}
    </div>
  );
}

function NodeSheet({ data, onClose }: { data: any; onClose: () => void }) {
  const color = NODE_COLORS[data.type as keyof typeof NODE_COLORS] ?? "#2563eb";
  const typeLabel = data.type === "event" ? "אירוע" : data.type === "message" ? "הודעה" : "פין";
  const timeAgo = Math.round((Date.now() - new Date(data.createdAt).getTime()) / 60000);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <span style={{
            display: "inline-block",
            background: `${color}18`,
            color,
            fontSize: 11,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 4,
            marginBottom: 6,
          }}>{typeLabel}</span>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>{data.title}</div>
          <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 3 }}>
            {data.creator} · לפני {timeAgo} דקות
          </div>
        </div>
        <CloseBtn onClose={onClose} />
      </div>

      {data.participants > 0 && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: `${color}10`,
          border: `1px solid ${color}30`,
          borderRadius: 8,
          padding: "10px 14px",
          marginBottom: 14,
        }}>
          <span style={{ fontSize: 16 }}>👥</span>
          <span style={{ color: "#374151", fontSize: 13 }}>
            <strong style={{ color }}>{data.participants}</strong> משתתפים
          </span>
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button style={{
          flex: 1,
          background: color,
          color: "white",
          border: "none",
          borderRadius: 8,
          padding: "11px",
          fontSize: 14,
          fontWeight: 700,
          cursor: "pointer",
        }}>
          {data.type === "event" ? "הצטרף לאירוע" : "פתח"}
        </button>
        <button style={{
          flex: 1,
          background: "#f1f5f9",
          color: "#374151",
          border: "1px solid #e2e8f0",
          borderRadius: 8,
          padding: "11px",
          fontSize: 14,
          cursor: "pointer",
        }}>
          שתף
        </button>
      </div>
    </div>
  );
}

function PlayerSheet({ data, onClose }: { data: any; onClose: () => void }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: data.avatarColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: 20,
            fontWeight: 800,
          }}>{data.name[0]}</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>{data.name}</div>
            <div style={{ color: "#22c55e", fontSize: 12, fontWeight: 600 }}>● מחובר</div>
          </div>
        </div>
        <CloseBtn onClose={onClose} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button style={{
          flex: 1,
          background: data.avatarColor,
          color: "white",
          border: "none",
          borderRadius: 8,
          padding: "11px",
          fontSize: 14,
          fontWeight: 700,
          cursor: "pointer",
        }}>שלח הודעה</button>
        <button style={{
          background: "#f1f5f9",
          color: "#374151",
          border: "1px solid #e2e8f0",
          borderRadius: 8,
          padding: "11px 16px",
          fontSize: 14,
          cursor: "pointer",
        }}>פרופיל</button>
      </div>
    </div>
  );
}

function GenericSheet({ title, subtitle, description, color, onClose }: {
  title: string; subtitle: string; description?: string; color: string; onClose: () => void;
}) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <div>
          <span style={{
            display: "inline-block",
            background: `${color}18`,
            color,
            fontSize: 11,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 4,
            marginBottom: 6,
          }}>{subtitle}</span>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>{title}</div>
          {description && <div style={{ color: "#6b7280", fontSize: 13, marginTop: 6 }}>{description}</div>}
        </div>
        <CloseBtn onClose={onClose} />
      </div>
    </div>
  );
}

function CloseBtn({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      style={{
        background: "#f1f5f9",
        border: "none",
        color: "#6b7280",
        cursor: "pointer",
        width: 28,
        height: 28,
        borderRadius: 8,
        fontSize: 14,
        flexShrink: 0,
      }}
    >✕</button>
  );
}
