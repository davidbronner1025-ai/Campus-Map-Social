import { memo, useMemo } from "react";
import { CircleMarker } from "react-leaflet";
import type { PlayerMarker } from "../types/map";

interface PresenceDotsProps {
  players: PlayerMarker[];
  zoom: number;
}

export const PresenceDots = memo(function PresenceDots({ players, zoom }: PresenceDotsProps) {
  const online = useMemo(() => players.filter(p => p.online), [players]);
  const radius = zoom >= 19 ? 5 : zoom >= 18 ? 4 : 3;

  return (
    <>
      {online.map(p => (
        <CircleMarker
          key={p.id}
          center={[p.lat, p.lng]}
          radius={radius}
          pathOptions={{
            color: "white",
            weight: 1.5,
            fillColor: p.avatarColor,
            fillOpacity: 0.92,
            opacity: 1,
          }}
        />
      ))}
    </>
  );
});
