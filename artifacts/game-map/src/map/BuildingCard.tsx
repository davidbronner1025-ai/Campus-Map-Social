import { useMemo, useState, useEffect, memo } from "react";
import { Polygon, Marker } from "react-leaflet";
import L from "leaflet";
import type { ZonePolygon, SelectedItem } from "../types/map";

const COLOR_TO_PALETTE: Record<string, { border: string; icon: string }> = {
  "#2563eb": { border: "#2563eb", icon: "📖" },
  "#ca8a04": { border: "#ca8a04", icon: "🍽️" },
  "#16a34a": { border: "#16a34a", icon: "⚽" },
  "#7c3aed": { border: "#7c3aed", icon: "📚" },
  "#dc2626": { border: "#dc2626", icon: "🏛️" },
  "#64748b": { border: "#64748b", icon: "🏢" },
};

function getCentroid(coords: [number, number][]): [number, number] {
  const lat = coords.reduce((s, c) => s + c[0], 0) / coords.length;
  const lng = coords.reduce((s, c) => s + c[1], 0) / coords.length;
  return [lat, lng];
}

interface BuildingCardProps {
  zone: ZonePolygon;
  onSelect: (item: SelectedItem) => void;
  presenceCount?: number;
}

export const BuildingCard = memo(function BuildingCard({
  zone, onSelect, presenceCount = 0,
}: BuildingCardProps) {
  const [hovered, setHovered] = useState(false);
  const [breathe, setBreathe] = useState(false);

  const pal = COLOR_TO_PALETTE[zone.color] ?? { border: zone.color, icon: "🏢" };
  const isHot    = zone.state === "hot";
  const isActive = zone.state === "active";

  useEffect(() => {
    if (!isHot && !isActive) return;
    const id = setInterval(() => setBreathe(b => !b), isHot ? 750 : 1300);
    return () => clearInterval(id);
  }, [isHot, isActive]);

  const centroid = useMemo(() => getCentroid(zone.coordinates), [zone.coordinates]);

  const fillOpacity = isHot
    ? (breathe ? 0.52 : 0.28)
    : isActive
    ? (breathe ? 0.32 : 0.18)
    : hovered ? 0.26 : 0.12;

  const borderOp = hovered ? 1 : isHot ? (breathe ? 0.95 : 0.60) : isActive ? 0.80 : 0.50;
  const weight   = hovered || isActive || isHot ? 2 : 1.5;

  const stateEmoji = isHot ? "🔥" : isActive ? "⚡" : "";

  const labelIcon = useMemo(() => {
    const badgeHtml = presenceCount > 0
      ? `<span style="background:${pal.border};color:#fff;border-radius:9px;padding:0 5px;font-size:10px;font-weight:800;line-height:16px;display:inline-block;margin-right:4px;">${presenceCount}</span>`
      : "";

    const glowStr = isHot && breathe
      ? `box-shadow:0 2px 14px rgba(0,0,0,0.11),0 0 20px ${pal.border}44;`
      : `box-shadow:0 2px 10px rgba(0,0,0,0.09);`;

    const borderColor = pal.border + Math.round(borderOp * 255).toString(16).padStart(2, "0");

    const html = `<div style="
      display:inline-flex;align-items:center;gap:4px;
      background:rgba(255,255,255,0.94);
      backdrop-filter:blur(10px);
      border:1.5px solid ${borderColor};
      border-radius:10px;
      padding:5px 10px;
      font-size:12px;font-weight:700;color:#0f172a;
      white-space:nowrap;
      ${glowStr}
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;
      direction:rtl;pointer-events:none;
    ">${stateEmoji ? `<span style="font-size:11px">${stateEmoji}</span>` : ""}<span>${zone.name}</span>${badgeHtml}</div>`;

    // measure approximate width: 10px per char + padding
    const w = Math.max(80, zone.name.length * 12 + 40 + (presenceCount > 0 ? 26 : 0));
    const h = 30;

    return L.divIcon({
      className: "",
      html,
      iconSize:   [w, h],
      iconAnchor: [w / 2, h / 2],
    });
  }, [zone.name, zone.color, pal, stateEmoji, presenceCount, borderOp, breathe, isHot]);

  return (
    <>
      <Polygon
        positions={zone.coordinates}
        pathOptions={{
          color:       pal.border,
          weight,
          opacity:     borderOp,
          fillColor:   pal.border,
          fillOpacity,
          lineCap:     "round",
          lineJoin:    "round",
        }}
        eventHandlers={{
          click:     () => onSelect({ kind: "zone", data: zone }),
          mouseover: () => setHovered(true),
          mouseout:  () => setHovered(false),
        }}
      />
      <Marker
        position={centroid}
        icon={labelIcon}
        interactive={false}
        zIndexOffset={100}
      />
    </>
  );
});
