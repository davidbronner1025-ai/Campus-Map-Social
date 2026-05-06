import { motion, AnimatePresence } from "framer-motion";
import type { GamePoint, ZonePolygon, Building } from "../types/map";
import { POINT_TYPE_COLORS, POINT_TYPE_LABELS, BUILDING_TYPE_COLORS } from "./utils";

type SelectedItem =
  | { kind: "point"; data: GamePoint }
  | { kind: "zone"; data: ZonePolygon }
  | { kind: "building"; data: Building }
  | null;

interface InfoPanelProps {
  selected: SelectedItem;
  onClose: () => void;
}

export function InfoPanel({ selected, onClose }: InfoPanelProps) {
  return (
    <AnimatePresence>
      {selected && (
        <motion.div
          key={selected.kind + (selected.data as any).id}
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 35 }}
          style={{
            position: "absolute",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            width: "min(420px, 90vw)",
            background: "rgba(0,0,0,0.92)",
            backdropFilter: "blur(12px)",
            border: `1px solid ${getColor(selected)}`,
            borderRadius: 6,
            padding: "16px 20px",
            fontFamily: "monospace",
            boxShadow: `0 0 24px ${getColor(selected)}60, 0 0 60px ${getColor(selected)}20`,
          }}
        >
          <ScanLines color={getColor(selected)} />
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: 10,
              right: 14,
              background: "none",
              border: "none",
              color: getColor(selected),
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
              opacity: 0.7,
            }}
          >
            ✕
          </button>

          <div style={{ color: getColor(selected), fontSize: 10, opacity: 0.6, marginBottom: 4 }}>
            ▶ {getKindLabel(selected)} / ID:{(selected.data as any).id}
          </div>
          <div style={{ color: getColor(selected), fontSize: 18, fontWeight: "bold", marginBottom: 8 }}>
            {getName(selected)}
          </div>
          {getDescription(selected) && (
            <div style={{ color: "#aaa", fontSize: 13, lineHeight: 1.6 }}>
              {getDescription(selected)}
            </div>
          )}
          {selected.kind === "point" && (
            <div style={{ color: "#555", fontSize: 10, marginTop: 10 }}>
              {selected.data.lat.toFixed(6)}, {selected.data.lng.toFixed(6)}
            </div>
          )}
          {selected.kind === "building" && (
            <div style={{ color: "#555", fontSize: 10, marginTop: 10 }}>
              קומות: {selected.data.floor ?? "—"} · סוג: {selected.data.type}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ScanLines({ color }: { color: string }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: 6,
        pointerEvents: "none",
        backgroundImage: `repeating-linear-gradient(0deg, ${color}06 0px, ${color}06 1px, transparent 1px, transparent 4px)`,
      }}
    />
  );
}

function getColor(item: NonNullable<SelectedItem>): string {
  if (item.kind === "point") return POINT_TYPE_COLORS[item.data.type] || "#00f5ff";
  if (item.kind === "zone") return item.data.color;
  if (item.kind === "building") return BUILDING_TYPE_COLORS[item.data.type] || "#aaa";
  return "#00f5ff";
}

function getKindLabel(item: NonNullable<SelectedItem>): string {
  if (item.kind === "point") return POINT_TYPE_LABELS[item.data.type] || "נקודה";
  if (item.kind === "zone") return "אזור";
  if (item.kind === "building") return "מבנה";
  return "";
}

function getName(item: NonNullable<SelectedItem>): string {
  return item.data.name;
}

function getDescription(item: NonNullable<SelectedItem>): string | undefined {
  return (item.data as any).description;
}
