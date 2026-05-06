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

  return (
    <Polygon
      positions={positions}
      pathOptions={{
        color: zone.color,
        weight: 2.5,
        opacity: 1,
        fillColor: zone.color,
        fillOpacity: 0.15,
      }}
      eventHandlers={{ click: () => onClick(zone) }}
    >
      <Tooltip sticky direction="top" opacity={1}>
        <div style={{
          background: "#ffffff",
          border: `1px solid ${zone.color}`,
          padding: "4px 10px",
          color: "#111827",
          fontSize: 12,
          fontFamily: "system-ui, sans-serif",
          borderRadius: 6,
          boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
        }}>
          <span style={{ color: zone.color, fontWeight: 600, marginRight: 4 }}>◈</span>
          {zone.name}
        </div>
      </Tooltip>
    </Polygon>
  );
}
