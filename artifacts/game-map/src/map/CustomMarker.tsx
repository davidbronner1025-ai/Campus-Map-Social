import { useMemo } from "react";
import { Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import type { GamePoint } from "../types/map";
import { POINT_TYPE_COLORS, POINT_TYPE_ICONS, POINT_TYPE_LABELS } from "./utils";

interface CustomMarkerProps {
  point: GamePoint;
  onClick: (point: GamePoint) => void;
}

function createCyberpunkIcon(type: string): L.DivIcon {
  const color = POINT_TYPE_COLORS[type] || "#ffffff";
  const icon = POINT_TYPE_ICONS[type] || "•";

  return L.divIcon({
    className: "",
    html: `
      <div style="
        position: relative;
        width: 44px;
        height: 44px;
        cursor: pointer;
        filter: drop-shadow(0 0 8px ${color});
      ">
        <svg width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
          <polygon points="22,2 40,12 40,32 22,42 4,32 4,12" 
            fill="rgba(0,0,0,0.85)" 
            stroke="${color}" 
            stroke-width="1.5"
          />
          <polygon points="22,6 36,14 36,30 22,38 8,30 8,14" 
            fill="rgba(0,0,0,0.4)" 
            stroke="${color}" 
            stroke-width="0.5"
            opacity="0.5"
          />
          <text x="22" y="27" text-anchor="middle" 
            font-size="16" 
            fill="${color}"
            style="filter: drop-shadow(0 0 3px ${color})"
          >${icon}</text>
        </svg>
        <div style="
          position:absolute;
          bottom:-4px;
          left:50%;
          transform:translateX(-50%);
          width:6px;
          height:6px;
          border-radius:50%;
          background:${color};
          box-shadow: 0 0 6px 2px ${color};
          animation: pulse 1.5s infinite;
        "></div>
      </div>
    `,
    iconSize: [44, 48],
    iconAnchor: [22, 48],
    tooltipAnchor: [0, -48],
  });
}

export function CustomMarker({ point, onClick }: CustomMarkerProps) {
  const icon = useMemo(() => createCyberpunkIcon(point.type), [point.type]);
  const color = POINT_TYPE_COLORS[point.type] || "#ffffff";
  const label = POINT_TYPE_LABELS[point.type] || point.type;

  if (!point.lat || !point.lng) return null;

  return (
    <Marker
      position={[point.lat, point.lng]}
      icon={icon}
      eventHandlers={{ click: () => onClick(point) }}
    >
      <Tooltip
        direction="top"
        offset={[0, -50]}
        opacity={1}
        className="cyberpunk-tooltip"
      >
        <div style={{
          background: "rgba(0,0,0,0.9)",
          border: `1px solid ${color}`,
          borderRadius: "4px",
          padding: "4px 8px",
          color,
          fontSize: "12px",
          fontFamily: "monospace",
          whiteSpace: "nowrap",
          boxShadow: `0 0 8px ${color}40`,
        }}>
          <span style={{ opacity: 0.6, marginRight: 4 }}>[{label}]</span>
          {point.name}
        </div>
      </Tooltip>
    </Marker>
  );
}
