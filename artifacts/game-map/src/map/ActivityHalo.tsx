import { memo, useMemo } from "react";
import { Circle } from "react-leaflet";
import type { ZonePolygon } from "../types/map";

interface ActivityHaloProps {
  zones: ZonePolygon[];
}

function getCentroid(coords: [number, number][]): [number, number] {
  const lat = coords.reduce((s, c) => s + c[0], 0) / coords.length;
  const lng = coords.reduce((s, c) => s + c[1], 0) / coords.length;
  return [lat, lng];
}

export const ActivityHalo = memo(function ActivityHalo({ zones }: ActivityHaloProps) {
  const active = useMemo(() =>
    zones.filter(z => z.state === "hot" || z.state === "active"),
    [zones]
  );

  return (
    <>
      {active.map(zone => {
        const center = getCentroid(zone.coordinates);
        const isHot = zone.state === "hot";
        return (
          <Circle
            key={`halo-${zone.id}`}
            center={center}
            radius={isHot ? 28 : 18}
            pathOptions={{
              color: zone.color,
              weight: 0,
              fillColor: zone.color,
              fillOpacity: isHot ? 0.07 : 0.04,
              interactive: false,
            }}
          />
        );
      })}
    </>
  );
});
