export type GamePointType = "event" | "post" | "zone" | "npc" | "admin";

export interface GamePoint {
  id: string;
  name: string;
  type: GamePointType;
  lat: number;
  lng: number;
  description?: string;
  priority: number;
}

export interface ZonePolygon {
  id: string;
  name: string;
  description?: string;
  color: string;
  coordinates: [number, number][];
  buildingIds?: string[];
}

export interface Building {
  id: string;
  name: string;
  type: "academic" | "admin" | "sports" | "dining" | "parking" | "other";
  lat: number;
  lng: number;
  polygon?: [number, number][];
  description?: string;
  floor?: number;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export type DrawingMode = "none" | "zone" | "building" | "point";

export interface DrawingState {
  mode: DrawingMode;
  points: [number, number][];
  name: string;
  type: string;
  color: string;
}
