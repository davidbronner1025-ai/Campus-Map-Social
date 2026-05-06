import { useMemo } from "react";
import { Polygon, Tooltip } from "react-leaflet";
import type { ZonePolygon } from "../types/map";

interface ZoneLayerProps {
  zones: ZonePolygon[];
  onZoneClick: (zone: ZonePolygon) => void;
}

export function ZoneLayer({ zones, onZoneClick }: ZoneLayerProps) {
  return (
    <>
      {zones.map((zone) => (
        <ZonePolygonItem key={zone.id} zone={zone} onClick={onZoneClick} />
      ))}
    </>
  );
}

function ZonePolygonItem({ zone, onClick }: { zone: ZonePolygon; onClick: (z: ZonePolygon) => void }) {
  const positions = useMemo(
    () => zone.coordinates.map(([lat, lng]) => [lat, lng] as [number, number]),
    [zone.coordinates]
  );

  const color = zone.color;

  return (
    <Polygon
      positions={positions}
      pathOptions={{
        color,
        weight: 2,
        opacity: 0.9,
        fillColor: color,
        fillOpacity: 0.08,
        dashArray: "6 4",
      }}
      eventHandlers={{ click: () => onClick(zone) }}
    >
      <Tooltip sticky direction="top" opacity={1}>
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
          ◈ {zone.name}
        </div>
      </Tooltip>
    </Polygon>
  );
}
