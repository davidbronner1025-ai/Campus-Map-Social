import { useMemo, memo } from "react";
import { Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import type { InteractionNode, SelectedItem } from "../types/map";

interface NodeLayerProps {
  nodes: InteractionNode[];
  onSelect: (item: SelectedItem) => void;
}

export function NodeLayer({ nodes, onSelect }: NodeLayerProps) {
  return (
    <>
      {nodes.map(n => (
        <NodePin key={n.id} node={n} onSelect={onSelect} />
      ))}
    </>
  );
}

const NODE_STYLE: Record<string, { color: string; icon: string }> = {
  event:   { color: "#ea580c", icon: "🎯" },
  message: { color: "#2563eb", icon: "💬" },
  pin:     { color: "#7c3aed", icon: "📌" },
};

const NodePin = memo(function NodePin({
  node,
  onSelect,
}: {
  node: InteractionNode;
  onSelect: (item: SelectedItem) => void;
}) {
  const style = NODE_STYLE[node.type] ?? NODE_STYLE.pin;

  const icon = useMemo(() => L.divIcon({
    className: "",
    html: `
      <div style="
        width:36px;
        height:36px;
        border-radius:50%;
        background:white;
        border:2.5px solid ${style.color};
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:16px;
        cursor:pointer;
        box-shadow:0 2px 8px rgba(0,0,0,0.15);
        filter:drop-shadow(0 1px 3px rgba(0,0,0,0.18));
      ">${style.icon}</div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    tooltipAnchor: [18, -4],
  }), [style]);

  return (
    <Marker
      position={[node.lat, node.lng]}
      icon={icon}
      eventHandlers={{ click: () => onSelect({ kind: "node", data: node }) }}
      zIndexOffset={300}
    >
      <Tooltip direction="top" offset={[0, -4]} opacity={1}>
        <div style={{
          background: "white",
          border: `1.5px solid ${style.color}`,
          borderRadius: 6,
          padding: "3px 9px",
          fontSize: 12,
          color: "#111827",
          whiteSpace: "nowrap",
          boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
          maxWidth: 200,
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>
          {node.title}
          {node.participants > 0 && (
            <span style={{ color: style.color, fontWeight: 700, marginRight: 6 }}>
              · {node.participants} משתתפים
            </span>
          )}
        </div>
      </Tooltip>
    </Marker>
  );
});
