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
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 36 }}
          style={{
            position: "absolute",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            width: "min(400px, 90vw)",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: "16px 20px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div style={{
            position: "absolute",
            top: 0,
            left: 20,
            right: 20,
            height: 3,
            borderRadius: "0 0 3px 3px",
            background: getColor(selected),
            opacity: 0.8,
          }} />

          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: 12,
              right: 14,
              background: "#f1f5f9",
              border: "none",
              color: "#6b7280",
              cursor: "pointer",
              fontSize: 14,
              lineHeight: 1,
              width: 24,
              height: 24,
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>

          <div style={{
            display: "inline-block",
            background: `${getColor(selected)}18`,
            color: getColor(selected),
            fontSize: 11,
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: 4,
            marginBottom: 8,
          }}>
            {getKindLabel(selected)}
          </div>

          <div style={{ color: "#111827", fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
            {getName(selected)}
          </div>

          {getDescription(selected) && (
            <div style={{ color: "#6b7280", fontSize: 13, lineHeight: 1.6 }}>
              {getDescription(selected)}
            </div>
          )}

          {selected.kind === "point" && (
            <div style={{ color: "#9ca3af", fontSize: 11, marginTop: 10 }}>
              {selected.data.lat.toFixed(6)}, {selected.data.lng.toFixed(6)}
            </div>
          )}
          {selected.kind === "building" && selected.data.floor && (
            <div style={{ color: "#9ca3af", fontSize: 11, marginTop: 10 }}>
              {selected.data.floor} קומות · סוג: {selected.data.type}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function getColor(item: NonNullable<SelectedItem>): string {
  if (item.kind === "point") return POINT_TYPE_COLORS[item.data.type] || "#2563eb";
  if (item.kind === "zone") return item.data.color;
  if (item.kind === "building") return BUILDING_TYPE_COLORS[item.data.type] || "#6b7280";
  return "#2563eb";
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
