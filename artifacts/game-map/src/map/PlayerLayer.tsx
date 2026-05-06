import { useMemo, memo } from "react";
import { Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import type { PlayerMarker, SelectedItem } from "../types/map";

interface PlayerLayerProps {
  players: PlayerMarker[];
  onSelect: (item: SelectedItem) => void;
}

export function PlayerLayer({ players, onSelect }: PlayerLayerProps) {
  const online = useMemo(() => players.filter(p => p.online), [players]);
  return (
    <>
      {online.map(p => (
        <PlayerPin key={p.id} player={p} onSelect={onSelect} />
      ))}
    </>
  );
}

const PlayerPin = memo(function PlayerPin({
  player,
  onSelect,
}: {
  player: PlayerMarker;
  onSelect: (item: SelectedItem) => void;
}) {
  const icon = useMemo(() => {
    const ringColor =
      player.activityLevel === "hot" ? "#ef4444" :
      player.activityLevel === "active" ? "#22c55e" : "#94a3b8";
    const initial = player.name[0];
    return L.divIcon({
      className: "",
      html: `
        <div style="
          position:relative;
          width:34px;
          height:34px;
          cursor:pointer;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.22));
        ">
          <div style="
            position:absolute;
            inset:0;
            border-radius:50%;
            background:${player.avatarColor};
            border:2.5px solid white;
            display:flex;
            align-items:center;
            justify-content:center;
            color:white;
            font-weight:700;
            font-size:13px;
            font-family:system-ui,sans-serif;
          ">${initial}</div>
          <div style="
            position:absolute;
            bottom:1px;
            right:1px;
            width:9px;
            height:9px;
            border-radius:50%;
            background:${ringColor};
            border:1.5px solid white;
          "></div>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      tooltipAnchor: [17, -4],
    });
  }, [player.avatarColor, player.activityLevel, player.name]);

  return (
    <Marker
      position={[player.lat, player.lng]}
      icon={icon}
      eventHandlers={{ click: () => onSelect({ kind: "player", data: player }) }}
      zIndexOffset={200}
    >
      <Tooltip direction="top" offset={[0, -4]} opacity={1}>
        <div style={{
          background: "white",
          border: `1.5px solid ${player.avatarColor}`,
          borderRadius: 6,
          padding: "3px 9px",
          fontSize: 12,
          color: "#111827",
          whiteSpace: "nowrap",
          boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
        }}>
          <span style={{ color: player.avatarColor, fontWeight: 700 }}>{player.name}</span>
          <span style={{ color: "#9ca3af", fontSize: 10, marginRight: 5 }}>
            {player.activityLevel === "hot" ? " 🔥" : player.activityLevel === "active" ? " ⚡" : ""}
          </span>
        </div>
      </Tooltip>
    </Marker>
  );
});
