import { Polyline, CircleMarker, useMapEvents } from "react-leaflet";
import type { DrawingState } from "../types/map";

interface DrawingLayerProps {
  drawing: DrawingState;
  onPointAdd: (lat: number, lng: number) => void;
}

export function DrawingLayer({ drawing, onPointAdd }: DrawingLayerProps) {
  useMapEvents({
    click(e) {
      if (drawing.mode === "none") return;
      onPointAdd(e.latlng.lat, e.latlng.lng);
    },
  });

  if (drawing.mode === "none" || drawing.points.length === 0) return null;

  const color = drawing.color || "#2563eb";

  return (
    <>
      {drawing.points.length > 1 && (
        <Polyline
          positions={drawing.points}
          pathOptions={{ color, weight: 2.5, dashArray: "8 5", opacity: 0.9 }}
        />
      )}
      {drawing.points.map(([lat, lng], i) => (
        <CircleMarker
          key={i}
          center={[lat, lng]}
          radius={5}
          pathOptions={{ color, fillColor: "#fff", fillOpacity: 1, weight: 2 }}
        />
      ))}
    </>
  );
}
