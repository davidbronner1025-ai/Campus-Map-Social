import { useEffect } from "react";
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

  const color = drawing.color || "#00f5ff";

  return (
    <>
      {drawing.points.length > 1 && (
        <Polyline
          positions={drawing.points}
          pathOptions={{ color, weight: 2, dashArray: "6 4", opacity: 0.8 }}
        />
      )}
      {drawing.points.map(([lat, lng], i) => (
        <CircleMarker
          key={i}
          center={[lat, lng]}
          radius={5}
          pathOptions={{ color, fillColor: color, fillOpacity: 1, weight: 1 }}
        />
      ))}
    </>
  );
}
