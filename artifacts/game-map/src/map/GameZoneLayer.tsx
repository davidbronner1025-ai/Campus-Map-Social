import { useMemo, useEffect, useState } from "react";
import { Polygon, Tooltip } from "react-leaflet";
import type { ZonePolygon, SelectedItem } from "../types/map";

interface GameZoneLayerProps {
  zones: ZonePolygon[];
  onSelect: (item: SelectedItem) => void;
}

export function GameZoneLayer({ zones, onSelect }: GameZoneLayerProps) {
  return (
    <>
      {zones.map(zone => (
        <GameZoneItem key={zone.id} zone={zone} onSelect={onSelect} />
      ))}
    </>
  );
}

function GameZoneItem({ zone, onSelect }: { zone: ZonePolygon; onSelect: (item: SelectedItem) => void }) {
  const [pulse, setPulse] = useState(false);
  const positions = useMemo(
    () => zone.coordinates.map(([lat, lng]) => [lat, lng] as [number, number]),
    [zone.coordinates]
  );

  useEffect(() => {
    if (zone.state !== "hot") return;
    const id = setInterval(() => setPulse(p => !p), 900);
    return () => clearInterval(id);
  }, [zone.state]);

  const { fillOpacity, weight, opacity } = useMemo(() => {
    if (zone.state === "hot") return { fillOpacity: pulse ? 0.28 : 0.14, weight: 3, opacity: pulse ? 1 : 0.7 };
    if (zone.state === "active") return { fillOpacity: 0.18, weight: 2.5, opacity: 0.9 };
    return { fillOpacity: 0.08, weight: 1.5, opacity: 0.55 };
  }, [zone.state, pulse]);

  const label = zone.state === "hot" ? "🔥" : zone.state === "active" ? "⚡" : "";

  return (
    <Polygon
      positions={positions}
      pathOptions={{
        color: zone.color,
        weight,
        opacity,
        fillColor: zone.color,
        fillOpacity,
        dashArray: zone.state === "neutral" ? "6 5" : undefined,
      }}
      eventHandlers={{ click: () => onSelect({ kind: "zone", data: zone }) }}
    >
      <Tooltip permanent direction="center" className="zone-label-tooltip">
        <div style={{
          background: "white",
          border: `1.5px solid ${zone.color}`,
          borderRadius: 6,
          padding: "2px 8px",
          fontSize: 11,
          fontWeight: 700,
          color: zone.color,
          whiteSpace: "nowrap",
          boxShadow: zone.state === "hot" ? `0 0 10px ${zone.color}60` : "0 1px 4px rgba(0,0,0,0.12)",
          opacity: zone.state === "neutral" ? 0.75 : 1,
          pointerEvents: "none",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}>
          {label && <span>{label}</span>}
          {zone.name}
          {zone.activityScore !== undefined && zone.activityScore > 0 && (
            <span style={{ background: zone.color, color: "white", borderRadius: 4, padding: "0 4px", fontSize: 10 }}>
              {zone.activityScore}
            </span>
          )}
        </div>
      </Tooltip>
    </Polygon>
  );
}
