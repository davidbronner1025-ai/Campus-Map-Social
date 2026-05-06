import { useMemo } from "react";
import { Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import type { GamePoint } from "../types/map";
import { POINT_TYPE_COLORS, POINT_TYPE_ICONS, POINT_TYPE_LABELS } from "./utils";

interface CustomMarkerProps {
  point: GamePoint;
  onClick: (point: GamePoint) => void;
}

function createCleanIcon(type: string): L.DivIcon {
  const color = POINT_TYPE_COLORS[type] || "#2563eb";
  const icon = POINT_TYPE_ICONS[type] || "•";

  return L.divIcon({
    className: "",
    html: `
      <div style="
        position: relative;
        width: 36px;
        height: 42px;
        cursor: pointer;
        filter: drop-shadow(0 2px 6px rgba(0,0,0,0.25));
      ">
        <svg width="36" height="42" viewBox="0 0 36 42" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 2 C9.16 2 2 9.16 2 18 C2 28 18 40 18 40 C18 40 34 28 34 18 C34 9.16 26.84 2 18 2Z"
            fill="${color}"
            stroke="white"
            stroke-width="2"
          />
          <circle cx="18" cy="18" r="9" fill="white" opacity="0.25"/>
          <text x="18" y="23" text-anchor="middle"
            font-size="14"
            fill="white"
          >${icon}</text>
        </svg>
      </div>
    `,
    iconSize: [36, 42],
    iconAnchor: [18, 42],
    tooltipAnchor: [0, -44],
  });
}

export function CustomMarker({ point, onClick }: CustomMarkerProps) {
  const icon = useMemo(() => createCleanIcon(point.type), [point.type]);
  const color = POINT_TYPE_COLORS[point.type] || "#2563eb";
  const label = POINT_TYPE_LABELS[point.type] || point.type;

  if (!point.lat || !point.lng) return null;

  return (
    <Marker
      position={[point.lat, point.lng]}
      icon={icon}
      eventHandlers={{ click: () => onClick(point) }}
    >
      <Tooltip direction="top" offset={[0, -44]} opacity={1}>
        <div style={{
          background: "#ffffff",
          border: `1px solid ${color}`,
          borderRadius: 6,
          padding: "4px 10px",
          color: "#111827",
          fontSize: 12,
          fontFamily: "system-ui, sans-serif",
          whiteSpace: "nowrap",
          boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
        }}>
          <span style={{
            color: color,
            fontWeight: 600,
            marginRight: 5,
            fontSize: 11,
          }}>{label}</span>
          {point.name}
        </div>
      </Tooltip>
    </Marker>
  );
}
