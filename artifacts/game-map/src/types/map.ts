export type GamePointType = "event" | "post" | "zone" | "npc" | "admin";
export type ZoneState = "neutral" | "active" | "hot";
export type DrawingMode = "none" | "zone" | "building" | "point";

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
  state?: ZoneState;
  activityScore?: number;
  userCount?: number;
  messageCount?: number;
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

export interface PlayerMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  online: boolean;
  activityLevel: "idle" | "active" | "hot";
  avatarColor: string;
  lastSeen: Date;
}

export interface InteractionNode {
  id: string;
  type: "message" | "event" | "pin";
  lat: number;
  lng: number;
  title: string;
  creator: string;
  participants: number;
  createdAt: Date;
  zoneId?: string;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface DrawingState {
  mode: DrawingMode;
  points: [number, number][];
  name: string;
  type: string;
  color: string;
}

export type SelectedItem =
  | { kind: "point"; data: GamePoint }
  | { kind: "zone"; data: ZonePolygon }
  | { kind: "building"; data: Building }
  | { kind: "player"; data: PlayerMarker }
  | { kind: "node"; data: InteractionNode }
  | null;
