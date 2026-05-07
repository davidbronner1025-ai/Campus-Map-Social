import { Polygon } from "react-leaflet";
import { useMemo } from "react";

interface CampusBoundaryProps {
  coordinates: [number, number][];
}

export function CampusBoundary({ coordinates }: CampusBoundaryProps) {
  if (coordinates.length < 3) return null;

  return (
    <>
      {/* Outer soft glow ring */}
      <Polygon
        positions={coordinates}
        pathOptions={{
          color: "#dc2626",
          weight: 0,
          fillColor: "#dc2626",
          fillOpacity: 0.04,
          interactive: false,
        }}
      />
      {/* Border line */}
      <Polygon
        positions={coordinates}
        pathOptions={{
          color: "#dc2626",
          weight: 2.5,
          opacity: 0.55,
          fillColor: "transparent",
          fillOpacity: 0,
          dashArray: "10 6",
          interactive: false,
        }}
      />
    </>
  );
}
