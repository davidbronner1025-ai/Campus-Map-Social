import { useMemo } from "react";
import { CircleMarker, Tooltip } from "react-leaflet";
import type { Building } from "../types/map";
import { BUILDING_TYPE_COLORS } from "./utils";

interface BuildingLayerProps {
  buildings: Building[];
  onBuildingClick: (building: Building) => void;
}

export function BuildingLayer({ buildings, onBuildingClick }: BuildingLayerProps) {
  return (
    <>
      {buildings.map((b) => (
        <BuildingMarker key={b.id} building={b} onClick={onBuildingClick} />
      ))}
    </>
  );
}

function BuildingMarker({ building, onClick }: { building: Building; onClick: (b: Building) => void }) {
  const color = useMemo(() => BUILDING_TYPE_COLORS[building.type] || "#64748b", [building.type]);

  return (
    <CircleMarker
      center={[building.lat, building.lng]}
      radius={11}
      pathOptions={{
        color: color,
        weight: 2.5,
        fillColor: "#ffffff",
        fillOpacity: 0.92,
      }}
      eventHandlers={{ click: () => onClick(building) }}
    >
      <Tooltip direction="top" offset={[0, -14]} opacity={1}>
        <div style={{
          background: "#ffffff",
          border: `1px solid ${color}`,
          padding: "4px 10px",
          color: "#111827",
          fontSize: 12,
          fontFamily: "system-ui, sans-serif",
          borderRadius: 6,
          boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
          whiteSpace: "nowrap",
        }}>
          <span style={{ color, fontWeight: 600, marginRight: 4 }}>▣</span>
          {building.name}
          {building.floor && (
            <span style={{ color: "#9ca3af", fontSize: 10, marginLeft: 6 }}>
              {building.floor}F
            </span>
          )}
        </div>
      </Tooltip>
    </CircleMarker>
  );
}
