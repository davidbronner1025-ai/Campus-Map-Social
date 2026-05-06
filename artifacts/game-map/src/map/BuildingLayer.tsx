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
  const color = useMemo(() => BUILDING_TYPE_COLORS[building.type] || "#aaaaaa", [building.type]);

  return (
    <CircleMarker
      center={[building.lat, building.lng]}
      radius={10}
      pathOptions={{
        color,
        weight: 2,
        fillColor: "rgba(0,0,0,0.7)",
        fillOpacity: 0.85,
        opacity: 0.9,
      }}
      eventHandlers={{ click: () => onClick(building) }}
    >
      <Tooltip direction="top" offset={[0, -12]} opacity={1}>
        <div style={{
          background: "rgba(0,0,0,0.9)",
          border: `1px solid ${color}`,
          padding: "4px 10px",
          color,
          fontSize: "12px",
          fontFamily: "monospace",
          borderRadius: "3px",
          boxShadow: `0 0 8px ${color}50`,
        }}>
          ▣ {building.name}
          {building.floor && <span style={{ opacity: 0.6, marginLeft: 6 }}>{building.floor}F</span>}
        </div>
      </Tooltip>
    </CircleMarker>
  );
}
