import { useState, useEffect, useCallback } from "react";
import type { ZonePolygon, PlayerMarker, InteractionNode, ZoneState } from "../types/map";
import { HOT_THRESHOLD, ACTIVE_THRESHOLD, ACTIVITY_TICK_MS } from "../data/campusData";
import { MAP_CENTER } from "../data/campusData";

const AVATAR_COLORS = ["#2563eb","#dc2626","#16a34a","#ea580c","#7c3aed","#ca8a04","#0891b2"];

function randNear(center: number, range: number) {
  return center + (Math.random() - 0.5) * range * 2;
}

function makePlayers(zones: ZonePolygon[]): PlayerMarker[] {
  if (zones.length === 0) return [];
  const names = ["אבי","רוני","שירה","יונתן","מיכל","דוד","נועה","אורי","גל","ליאת"];
  return names.slice(0, 6).map((name, i) => {
    const zone = zones[i % zones.length];
    const [cLat, cLng] = zone.coordinates[0];
    return {
      id: `player-${i}`,
      name,
      lat: randNear(cLat, 0.0003),
      lng: randNear(cLng, 0.0004),
      online: i < 4,
      activityLevel: i < 2 ? "hot" : i < 4 ? "active" : "idle",
      avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
      lastSeen: new Date(Date.now() - i * 180_000),
    };
  });
}

function makeNodes(zones: ZonePolygon[]): InteractionNode[] {
  if (zones.length === 0) return [];
  const items: InteractionNode[] = [
    { id: "n1", type: "event", title: "אירוע: שיעור תלמוד", creator: "הרב כהן", participants: 12, createdAt: new Date(Date.now() - 3600000), lat: 0, lng: 0, zoneId: "" },
    { id: "n2", type: "message", title: "פוסט: ארוחת ערב מיוחדת", creator: "מזכירות", participants: 3, createdAt: new Date(Date.now() - 900000), lat: 0, lng: 0, zoneId: "" },
    { id: "n3", type: "pin", title: "הודעה: בחינה מחר", creator: "מינהל", participants: 0, createdAt: new Date(Date.now() - 7200000), lat: 0, lng: 0, zoneId: "" },
    { id: "n4", type: "event", title: "אירוע: כדורגל ידידות", creator: "ועד סטודנטים", participants: 8, createdAt: new Date(Date.now() - 1800000), lat: 0, lng: 0, zoneId: "" },
  ];
  return items.map((item, i) => {
    const zone = zones[i % zones.length];
    const [cLat, cLng] = zone.coordinates[Math.min(1, zone.coordinates.length - 1)];
    return {
      ...item,
      lat: randNear(cLat, 0.00025),
      lng: randNear(cLng, 0.0003),
      zoneId: zone.id,
    };
  });
}

function computeScore(zone: ZonePolygon, players: PlayerMarker[], nodes: InteractionNode[]): number {
  const zPlayers = players.filter(p => {
    const [zLat, zLng] = zone.coordinates[0];
    const dLat = Math.abs(p.lat - zLat);
    const dLng = Math.abs(p.lng - zLng);
    return p.online && dLat < 0.001 && dLng < 0.0012;
  }).length;
  const zNodes = nodes.filter(n => n.zoneId === zone.id).length;
  return zPlayers + zNodes;
}

function scoreToState(score: number): ZoneState {
  if (score >= HOT_THRESHOLD) return "hot";
  if (score >= ACTIVE_THRESHOLD) return "active";
  return "neutral";
}

export function useActivityEngine(zones: ZonePolygon[], setZones: React.Dispatch<React.SetStateAction<ZonePolygon[]>>) {
  const [players, setPlayers] = useState<PlayerMarker[]>([]);
  const [nodes, setNodes] = useState<InteractionNode[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (zones.length === 0) return;
    if (initialized) return;
    const p = makePlayers(zones);
    const n = makeNodes(zones);
    setPlayers(p);
    setNodes(n);
    setInitialized(true);
    setZones(prev => prev.map(z => {
      const score = computeScore(z, p, n);
      return { ...z, activityScore: score, state: scoreToState(score), userCount: p.filter(pl => pl.online).length };
    }));
  }, [zones, initialized, setZones]);

  useEffect(() => {
    if (!initialized) return;
    const tick = setInterval(() => {
      setPlayers(prev => prev.map(p => ({
        ...p,
        lat: p.lat + (Math.random() - 0.5) * 0.00004,
        lng: p.lng + (Math.random() - 0.5) * 0.00004,
        activityLevel: Math.random() > 0.7 ? "hot" : Math.random() > 0.4 ? "active" : "idle",
      })));
      setZones(prev => prev.map(z => {
        const score = computeScore(z, players, nodes) + Math.floor(Math.random() * 2);
        return { ...z, activityScore: score, state: scoreToState(score) };
      }));
    }, ACTIVITY_TICK_MS);
    return () => clearInterval(tick);
  }, [initialized, players, nodes, setZones]);

  const nearestActiveZone = useCallback((zones: ZonePolygon[]) => {
    const active = zones.filter(z => z.state !== "neutral");
    if (active.length === 0) return null;
    return active.sort((a, b) => (b.activityScore ?? 0) - (a.activityScore ?? 0))[0];
  }, []);

  return { players, nodes, nearestActiveZone };
}
