import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap } from "react-leaflet";
import L from "leaflet";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquarePlus, User, RefreshCw, X, Send, ThumbsUp, ThumbsDown,
  MessageCircle, Trash2, ChevronDown, MapPin, Clock, Smile, Navigation, Users, Plus,
  ShoppingBag, AlertTriangle, ChevronUp, ChevronRight, Activity, Layers
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLocationEngine } from "@/hooks/useLocationEngine";
import NotificationBell from "@/components/NotificationBell";
import {
  getNearbyMessages, getNearbyUsers, getNearbyEvents,
  pinMessage, deleteMessage, reactToMessage,
  createEvent, deleteEvent, rsvpEvent, unrsvpEvent,
  getReplies, postReply, createConversation, getConversations,
  getLocations, getLocationAnnouncements, getLocationSchedules, getLocationMenus, getLocationGames,
  getLocationIssues, submitIssue, getLocationCrowd, getShops,
  type NearbyMessage, type NearbyUser, type NearbyEvent, type Reply,
  type ConversationListItem, type CampusLocation,
  type LocationAnnouncement, type LocationSchedule, type LocationMenu, type LocationGame,
  type IssueReport, type CrowdData, type CampusShop, type FloorEntry,
} from "@/lib/api";
import { ConversationRow, ChatDetail, NewChatSheet } from "@/pages/chats";

// Fix Leaflet default icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Israel center fallback
const ISRAEL_CENTER: [number, number] = [31.8, 35.2];
const FALLBACK_ZOOM = 13;

// ── Invitation Config ──────────────────────────────────────────────────────
const INVITE_TYPES = [
  { key: "smoke",     emoji: "🚬", label: "Smoke",      color: "#a78bfa", bgClass: "bg-violet-500/10 border-violet-500/30" },
  { key: "carpool",   emoji: "🚗", label: "Carpool",    color: "#60a5fa", bgClass: "bg-blue-500/10 border-blue-500/30" },
  { key: "phone_game",emoji: "📱", label: "Phone Game", color: "#34d399", bgClass: "bg-emerald-500/10 border-emerald-500/30" },
  { key: "food_order",emoji: "🍕", label: "Food Order", color: "#fb923c", bgClass: "bg-orange-500/10 border-orange-500/30" },
  { key: "football",  emoji: "⚽", label: "Football",   color: "#4ade80", bgClass: "bg-green-500/10 border-green-500/30" },
];

function getInviteConfig(type: string | null) {
  return INVITE_TYPES.find(t => t.key === type) || null;
}

// ── Event Categories ─────────────────────────────────────────────────────
const EVENT_CATEGORIES = [
  { key: "study_group",  emoji: "📚", label: "Study Group",  color: "#818cf8" },
  { key: "party",        emoji: "🎉", label: "Party",        color: "#f472b6" },
  { key: "sports",       emoji: "🏀", label: "Sports",       color: "#4ade80" },
  { key: "club_meeting", emoji: "🤝", label: "Club Meeting", color: "#60a5fa" },
  { key: "food",         emoji: "🍜", label: "Food",         color: "#fb923c" },
  { key: "other",        emoji: "✨", label: "Other",        color: "#a78bfa" },
] as const;

function getEventCategory(cat: string) {
  return EVENT_CATEGORIES.find(c => c.key === cat) || EVENT_CATEGORIES[5];
}

function formatEventTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 0) return "Started";
  if (mins < 60) return `In ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `In ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `In ${days}d`;
}

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === now.toDateString()) return `Today, ${time}`;
  if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow, ${time}`;
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${time}`;
}

// ── Custom map marker via DivIcon ──────────────────────────────────────────
function makeMarker(emoji: string, color: string, pulse = false) {
  return L.divIcon({
    className: "",
    iconSize: [40, 50],
    iconAnchor: [20, 50],
    html: `
      <div style="position:relative;width:40px;height:50px;">
        ${pulse ? `<div style="position:absolute;top:2px;left:2px;width:36px;height:36px;border-radius:50%;background:${color};opacity:0.3;animation:ping-slow 2s ease-in-out infinite;"></div>` : ""}
        <div style="width:40px;height:40px;border-radius:50% 50% 50% 4px;transform:rotate(-45deg);background:${color};border:2.5px solid rgba(255,255,255,0.85);box-shadow:0 3px 10px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;">
          <span style="transform:rotate(45deg);font-size:16px;line-height:1;">${emoji}</span>
        </div>
      </div>`,
  });
}

// ── HTML escape helper ───────────────────────────────────────────────────
function esc(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── User map marker ──────────────────────────────────────────────────────
function makeUserMarker(user: NearbyUser) {
  const isEmoji = user.avatarUrl?.startsWith("emoji:");
  const emoji = isEmoji ? user.avatarUrl!.slice(6) : null;
  const initial = (user.displayName?.[0] || "?").toUpperCase();
  const bg = user.bannerColor || "#1e293b";
  const opacity = user.active ? "1" : "0.5";
  const pulse = user.active ? `<div style="position:absolute;top:-3px;left:-3px;width:42px;height:42px;border-radius:50%;background:${bg};opacity:0.25;animation:ping-slow 2.5s ease-in-out infinite;"></div>` : "";
  const border = user.active ? "rgba(74,222,128,0.9)" : "rgba(148,163,184,0.5)";
  const safeEmoji = emoji ? esc(emoji) : null;
  const safeInitial = esc(initial);
  const safeName = esc(user.displayName || "?");
  const content = safeEmoji
    ? `<span style="font-size:18px;line-height:1;">${safeEmoji}</span>`
    : `<span style="font-size:14px;font-weight:700;color:white;">${safeInitial}</span>`;

  return L.divIcon({
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    html: `
      <div style="position:relative;width:36px;height:36px;opacity:${opacity};">
        ${pulse}
        <div style="width:36px;height:36px;border-radius:50%;background:${esc(bg)};border:2.5px solid ${border};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);">
          ${content}
        </div>
        <div style="position:absolute;bottom:-14px;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:9px;font-weight:600;color:white;background:rgba(0,0,0,0.6);padding:1px 5px;border-radius:4px;pointer-events:none;">
          ${safeName}
        </div>
      </div>`,
  });
}

// ── Event map marker ─────────────────────────────────────────────────────
function makeEventMarker(event: NearbyEvent) {
  const cat = getEventCategory(event.category);
  const safeTitle = esc(event.title.slice(0, 20));
  return L.divIcon({
    className: "",
    iconSize: [44, 54],
    iconAnchor: [22, 54],
    html: `
      <div style="position:relative;width:44px;height:54px;">
        <div style="width:44px;height:44px;border-radius:12px;background:${cat.color};border:2.5px solid rgba(255,255,255,0.9);box-shadow:0 3px 12px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;">
          <span style="font-size:22px;line-height:1;">${cat.emoji}</span>
        </div>
        <div style="position:absolute;bottom:-12px;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:8px;font-weight:700;color:white;background:${cat.color};padding:1px 6px;border-radius:4px;pointer-events:none;max-width:80px;overflow:hidden;text-overflow:ellipsis;">
          ${safeTitle}
        </div>
        <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid ${cat.color};"></div>
      </div>`,
  });
}

// ── Map center updater — uses setView (sync) to avoid rAF animation NaN bug ─
function MapCenterUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  const didSet = useRef(false);
  useEffect(() => {
    if (didSet.current) return;
    if (isNaN(center[0]) || isNaN(center[1])) return;
    try {
      map.setView(center, zoom, { animate: false });
      didSet.current = true;
    } catch {}
  }, [center, zoom, map]);
  return null;
}

// ── Map size invalidator — recalculates Leaflet dims after panel resizes ───
function MapSizeInvalidator({ deps }: { deps: unknown[] }) {
  const map = useMap();
  useEffect(() => {
    const t1 = setTimeout(() => { try { map.invalidateSize(); } catch {} }, 80);
    const t2 = setTimeout(() => { try { map.invalidateSize(); } catch {} }, 400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  // deps intentionally spread for comparison
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return null;
}

// ── Location helpers ─────────────────────────────────────────────────────────
const LOC_TYPES: Record<string, { emoji: string; label: string }> = {
  building:     { emoji: "🏛️", label: "Building" },
  dining_hall:  { emoji: "🍽️", label: "Dining Hall" },
  sports_field: { emoji: "⚽", label: "Sports Field" },
  parking:      { emoji: "🚗", label: "Parking" },
  green:        { emoji: "🌿", label: "Green Area" },
  other:        { emoji: "📍", label: "Other" },
};

const SPORT_LABELS: Record<string, string> = {
  football:"⚽ Football", basketball:"🏀 Basketball",
  volleyball:"🏐 Volleyball", tennis:"🎾 Tennis", other:"🏆 Other",
};

const CAT_EMOJI: Record<string, string> = {
  starter:"🥗", main:"🍖", side:"🍟", dessert:"🍰", drink:"🥤",
};

function polygonCentroid(pts: { lat: number; lng: number }[]): [number, number] {
  const lat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
  const lng = pts.reduce((s, p) => s + p.lng, 0) / pts.length;
  return [lat, lng];
}

// ── Time formatter ─────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// Day-of-week lookup — matches schema enum exactly
const DOW = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"] as const;

// ── Location Detail Sheet ────────────────────────────────────────────────────
const ISSUE_CATEGORIES = [
  { key: "maintenance", label: "Maintenance", emoji: "🔧" },
  { key: "cleanliness", label: "Cleanliness", emoji: "🧹" },
  { key: "safety", label: "Safety", emoji: "⚠️" },
  { key: "noise", label: "Noise", emoji: "🔊" },
  { key: "lighting", label: "Lighting", emoji: "💡" },
  { key: "other", label: "Other", emoji: "📝" },
];

function CrowdBar({ density }: { density: number }) {
  const level = density === 0 ? { label: "Quiet", color: "#22c55e" }
    : density < 0.4 ? { label: "Low", color: "#84cc16" }
    : density < 0.65 ? { label: "Moderate", color: "#eab308" }
    : density < 0.85 ? { label: "Busy", color: "#f97316" }
    : { label: "Packed", color: "#ef4444" };
  return (
    <div className="flex items-center gap-2">
      <Activity className="w-3.5 h-3.5 flex-shrink-0" style={{ color: level.color }} />
      <div className="flex-1 h-1.5 bg-secondary/50 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(density * 100, 4)}%`, background: level.color }} />
      </div>
      <span className="text-[11px] font-medium" style={{ color: level.color }}>{level.label}</span>
    </div>
  );
}

function FloorNavigator({ floors }: { floors: FloorEntry[] }) {
  const sorted = [...floors].sort((a, b) => b.floor - a.floor);
  const [activeFloor, setActiveFloor] = useState(sorted[0]?.floor ?? 0);
  const current = sorted.find(f => f.floor === activeFloor) ?? sorted[0];
  if (!current) return null;
  const ROOM_COLORS: Record<string, string> = {
    lecture: "#6366f1", lab: "#0ea5e9", office: "#8b5cf6",
    bathroom: "#64748b", lounge: "#10b981", study: "#f59e0b", other: "#94a3b8",
  };
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-3">
        <Layers className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Floor Navigator</span>
        {current.available !== undefined && (
          <span className="ml-auto text-[11px] text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">
            {current.available} seats free
          </span>
        )}
        {current.waitTime !== undefined && (
          <span className="text-[11px] text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2 py-0.5 rounded-full">
            ~{current.waitTime}min wait
          </span>
        )}
      </div>
      {/* Floor selector */}
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {sorted.map(f => (
          <button key={f.floor}
            onClick={() => setActiveFloor(f.floor)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
              f.floor === activeFloor
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary/40 text-muted-foreground border-border hover:bg-secondary"
            }`}
          >
            {f.floor === 0 ? "G" : f.floor > 0 ? `+${f.floor}` : f.floor}
          </button>
        ))}
      </div>
      {current.label && <p className="text-xs text-muted-foreground mb-2">{current.label}</p>}
      {current.notes && <p className="text-xs text-amber-400 mb-2">ℹ️ {current.notes}</p>}
      {current.rooms.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5">
          {current.rooms.map((r, i) => (
            <div key={i} className="flex items-center gap-2 bg-secondary/30 border border-border rounded-lg px-2.5 py-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ROOM_COLORS[r.type] || ROOM_COLORS.other }} />
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{r.room}</p>
                <p className="text-[10px] text-muted-foreground truncate">{r.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LocationDetailSheet({
  loc,
  onClose,
  onComposeHere,
}: {
  loc: CampusLocation;
  onClose: () => void;
  onComposeHere?: () => void;
}) {
  const cfg = LOC_TYPES[loc.type] || LOC_TYPES.other;
  const [anns, setAnns] = useState<LocationAnnouncement[]>([]);
  const [scheds, setScheds] = useState<LocationSchedule[]>([]);
  const [menus, setMenus] = useState<LocationMenu[]>([]);
  const [games, setGames] = useState<LocationGame[]>([]);
  const [locMsgs, setLocMsgs] = useState<NearbyMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [crowd, setCrowd] = useState<CrowdData | null>(null);
  const [issues, setIssues] = useState<IssueReport[]>([]);
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueCategory, setIssueCategory] = useState("maintenance");
  const [issueDesc, setIssueDesc] = useState("");
  const [issueFloor, setIssueFloor] = useState<number | undefined>();
  const [issueSending, setIssueSending] = useState(false);
  const [issueSuccess, setIssueSuccess] = useState(false);

  useEffect(() => {
    setLoading(true);
    const today = DOW[new Date().getDay()];
    const fetchers: Promise<any>[] = [
      getNearbyMessages(loc.lat, loc.lng, 120).then(setLocMsgs).catch(() => setLocMsgs([])),
      getLocationCrowd(loc.id).then(setCrowd).catch(() => {}),
      getLocationIssues(loc.id).then(rows => setIssues(rows.filter(r => r.isPublic && r.status !== "resolved"))).catch(() => {}),
    ];
    if (loc.type === "building") {
      fetchers.push(
        getLocationAnnouncements(loc.id).then(setAnns),
        getLocationSchedules(loc.id).then(d => setScheds(d.filter(s => s.dayOfWeek === today))),
      );
    } else if (loc.type === "dining_hall") {
      fetchers.push(getLocationMenus(loc.id).then(setMenus));
    } else if (loc.type === "sports_field") {
      fetchers.push(getLocationGames(loc.id).then(setGames));
    }
    Promise.all(fetchers).finally(() => setLoading(false));
  }, [loc.id, loc.type, loc.lat, loc.lng]);

  const handleSubmitIssue = async () => {
    if (!issueCategory) return;
    setIssueSending(true);
    try {
      await submitIssue({
        locationId: loc.id,
        floor: issueFloor,
        category: issueCategory,
        description: issueDesc || undefined,
        isPublic: true,
      });
      setIssueSuccess(true);
      setIssueOpen(false);
      setIssueDesc("");
      setTimeout(() => setIssueSuccess(false), 3000);
    } catch {} finally { setIssueSending(false); }
  };

  const PRIORITY_COLOR: Record<string, string> = {
    normal: "border-primary/40 text-primary",
    important: "border-yellow-400/60 text-yellow-400",
    urgent: "border-red-400/60 text-red-400",
  };

  const floors = loc.floorData && loc.floorData.length > 0 ? loc.floorData : null;

  return (
    <motion.div
      initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="flex flex-col h-full bg-card border-t border-border overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border flex-shrink-0">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ background: loc.color + "22", border: `1.5px solid ${loc.color}50` }}>
          {cfg.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-foreground truncate">{loc.name}</h2>
          <p className="text-xs text-muted-foreground">{cfg.label}{loc.adminName ? ` · ${loc.adminName}` : ""}</p>
          {crowd && <div className="mt-1.5"><CrowdBar density={crowd.density} /></div>}
        </div>
        <div className="flex items-center gap-2">
          {onComposeHere && (
            <button
              onClick={onComposeHere}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 active:scale-95 transition-all"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              Post here
            </button>
          )}
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Description */}
        {loc.description && (
          <div className="px-4 pt-3 pb-1">
            <p className="text-sm text-muted-foreground leading-relaxed">{loc.description}</p>
          </div>
        )}
        {loc.managerName && (
          <div className="px-4 pt-1 pb-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full">
              👤 {loc.managerName}
            </span>
          </div>
        )}

        {/* ── Floor Navigator ── */}
        {floors && (
          <div className="px-4 pt-3 pb-4 border-b border-border/50">
            <FloorNavigator floors={floors} />
          </div>
        )}

        {/* Type-specific content */}
        {loc.type === "building" && (
          <div className="px-4 pb-4">
            {loading ? (
              <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
            ) : (
              <>
                {scheds.length > 0 && (
                  <div className="mb-4 pt-3">
                    <p className="text-xs font-semibold text-primary mb-2 uppercase tracking-wide">📅 Today's Schedule</p>
                    <div className="space-y-1.5">
                      {scheds.map(s => (
                        <div key={s.id} className="flex items-center gap-3 bg-primary/5 border border-primary/15 rounded-xl px-3 py-2">
                          <span className="text-xs font-bold text-primary tabular-nums">{s.startTime}–{s.endTime}</span>
                          <span className="text-sm text-foreground flex-1">{s.label}</span>
                          {s.instructor && <span className="text-xs text-muted-foreground">{s.instructor}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {anns.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">📢 Announcements</p>
                    <div className="space-y-2">
                      {anns.map(a => (
                        <div key={a.id} className={`border rounded-xl p-3 ${PRIORITY_COLOR[a.priority] || "border-border"}`}>
                          <p className="text-sm font-semibold text-foreground">{a.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{a.content}</p>
                          <span className={`inline-block text-[10px] font-bold uppercase mt-2 px-2 py-0.5 rounded-full border ${PRIORITY_COLOR[a.priority]}`}>{a.priority}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {anns.length === 0 && scheds.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">No announcements or schedule for today</p>
                )}
              </>
            )}
          </div>
        )}

        {loc.type === "dining_hall" && (
          <div className="px-4 pb-4">
            {loading ? (
              <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
            ) : menus.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No menu available</p>
            ) : (
              <div className="space-y-3 pt-3">
                {menus.slice(0, 3).map(menu => (
                  <div key={menu.id} className="bg-secondary/30 border border-border rounded-xl p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-accent">{new Date(menu.date).toLocaleDateString("en-IL", { day: "numeric", month: "short" })}</span>
                      <span className="text-xs text-muted-foreground">⭐ {menu.averageRating > 0 ? menu.averageRating.toFixed(1) : "–"} ({menu.ratingCount})</span>
                    </div>
                    {(menu.items as any[]).map((it: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 py-1 text-sm text-foreground">
                        <span>{CAT_EMOJI[it.category] || "•"}</span>
                        <span>{it.name}</span>
                        <span className="text-xs text-muted-foreground ml-auto">{it.category}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {loc.type === "sports_field" && (
          <div className="px-4 pb-4">
            {loading ? (
              <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
            ) : games.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No games scheduled</p>
            ) : (
              <div className="space-y-3 pt-3">
                {games.map(g => (
                  <div key={g.id} className="bg-secondary/30 border border-border rounded-xl p-3">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-sm font-bold text-foreground">{SPORT_LABELS[g.sport] || g.sport}</p>
                      <span className="text-xs text-muted-foreground tabular-nums">{new Date(g.scheduledAt).toLocaleTimeString("en-IL", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(g.scheduledAt).toLocaleDateString("en-IL", { day: "numeric", month: "short" })}</p>
                    {g.description && <p className="text-xs text-foreground mt-1">{g.description}</p>}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">👥 {g.votes.length}/{g.maxPlayers} players</span>
                      <div className="flex gap-1">
                        {g.votes.slice(0, 4).map((v, i) => (
                          <span key={i} className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-full">{v.playerName}</span>
                        ))}
                        {g.votes.length > 4 && <span className="text-[10px] text-muted-foreground">+{g.votes.length - 4}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {(loc.type === "parking" || loc.type === "green" || loc.type === "other") && !loc.description && (
          <p className="text-sm text-muted-foreground text-center py-6">{cfg.emoji} {cfg.label}</p>
        )}

        {/* ── Pinned Messages ── */}
        {locMsgs.length > 0 && (
          <div className="px-4 pb-4">
            <div className="border-t border-border pt-4">
              <p className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">📌 Pinned Here</p>
              <div className="space-y-2">
                {locMsgs.map(msg => {
                  const isPermanent = msg.expiresAt === null;
                  return (
                    <div key={msg.id} className={`rounded-xl p-3 border ${isPermanent ? "bg-primary/5 border-primary/25" : "bg-secondary/30 border-border"}`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        {isPermanent && <span className="text-[10px] font-bold text-primary bg-primary/15 border border-primary/30 px-1.5 py-0.5 rounded-full">📌 Pinned</span>}
                        <span className="text-xs font-semibold text-foreground">{msg.author?.displayName || "Campus"}</span>
                        <span className="text-[10px] text-muted-foreground ml-auto">{timeAgo(msg.createdAt)}</span>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">{msg.content}</p>
                      {msg.reactions.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {(["yes","no"] as const).map(t => {
                            const count = msg.reactions.filter(r => r.type === t).length;
                            if (!count) return null;
                            return <span key={t} className="text-[11px] text-muted-foreground">{t === "yes" ? "👍" : "👎"} {count}</span>;
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Active Issues ── */}
        {issues.length > 0 && (
          <div className="px-4 pb-4">
            <div className="border-t border-border pt-4">
              <p className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">⚠️ Active Issues</p>
              <div className="space-y-1.5">
                {issues.map(iss => (
                  <div key={iss.id} className="flex items-center gap-2.5 bg-orange-500/5 border border-orange-500/20 rounded-xl px-3 py-2">
                    <span className="text-base">{ISSUE_CATEGORIES.find(c => c.key === iss.category)?.emoji || "⚠️"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground capitalize">{iss.category}</p>
                      {iss.description && <p className="text-[11px] text-muted-foreground truncate">{iss.description}</p>}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${iss.status === "open" ? "text-red-400 border-red-400/30 bg-red-400/10" : "text-yellow-400 border-yellow-400/30 bg-yellow-400/10"}`}>
                      {iss.status === "in_progress" ? "In Progress" : "Open"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Report Issue ── */}
        <div className="px-4 pb-6">
          <div className="border-t border-border pt-4">
            {issueSuccess ? (
              <div className="flex items-center gap-2 text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-xl px-4 py-3">
                <span className="text-base">✅</span>
                <p className="text-sm font-medium">Issue reported — thanks!</p>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setIssueOpen(o => !o)}
                  className="flex items-center gap-2 w-full text-left group"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Report an Issue</span>
                  {issueOpen ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground ml-auto" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground ml-auto" />}
                </button>
                {issueOpen && (
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-3 gap-1.5">
                      {ISSUE_CATEGORIES.map(c => (
                        <button
                          key={c.key}
                          onClick={() => setIssueCategory(c.key)}
                          className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all ${
                            issueCategory === c.key
                              ? "bg-orange-500/15 border-orange-500/40 text-orange-400"
                              : "bg-secondary/30 border-border text-muted-foreground hover:bg-secondary"
                          }`}
                        >
                          <span className="text-base">{c.emoji}</span>
                          <span className="text-[10px] font-medium">{c.label}</span>
                        </button>
                      ))}
                    </div>
                    {floors && (
                      <div>
                        <label className="text-[11px] text-muted-foreground mb-1.5 block">Floor (optional)</label>
                        <div className="flex gap-1.5 flex-wrap">
                          {floors.map(f => (
                            <button
                              key={f.floor}
                              onClick={() => setIssueFloor(issueFloor === f.floor ? undefined : f.floor)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                                issueFloor === f.floor ? "bg-primary text-primary-foreground border-primary" : "bg-secondary/40 text-muted-foreground border-border"
                              }`}
                            >
                              {f.floor === 0 ? "G" : f.floor > 0 ? `+${f.floor}` : f.floor}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <textarea
                      value={issueDesc}
                      onChange={e => setIssueDesc(e.target.value)}
                      placeholder="Describe the issue (optional)…"
                      rows={2}
                      className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-primary/50"
                    />
                    <button
                      onClick={handleSubmitIssue}
                      disabled={issueSending}
                      className="w-full py-2.5 rounded-xl bg-orange-500/90 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-orange-500 active:scale-95 transition-all disabled:opacity-60"
                    >
                      {issueSending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><AlertTriangle className="w-4 h-4" /> Submit Report</>}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Avatar ─────────────────────────────────────────────────────────────────
function Avatar({ url, name, size = 36, color }: { url: string | null; name: string; size?: number; color?: string }) {
  const isEmoji = url?.startsWith("emoji:");
  const style = { width: size, height: size, flexShrink: 0 };
  if (isEmoji) {
    return (
      <div style={{ ...style, background: color || "#1e293b", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.55 }}>
        {url!.slice(6)}
      </div>
    );
  }
  if (url) {
    return <img src={url} alt={name} style={{ ...style, borderRadius: 8, objectFit: "cover" }} />;
  }
  return (
    <div style={{ ...style, background: color || "#1e293b", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: size * 0.4 }}>
      {name?.[0]?.toUpperCase() || "?"}
    </div>
  );
}

// ── Message Card ───────────────────────────────────────────────────────────
function MessageCard({
  msg, currentUserId, onDelete, onReact, onOpenReplies
}: {
  msg: NearbyMessage; currentUserId: number;
  onDelete: (id: number) => void;
  onReact: (id: number, type: "yes" | "no") => void;
  onOpenReplies: (msg: NearbyMessage) => void;
}) {
  const invite = getInviteConfig(msg.invitationType);
  const isOwn = msg.userId === currentUserId;
  const yesCount = msg.reactions.filter(r => r.type === "yes").length;
  const noCount = msg.reactions.filter(r => r.type === "no").length;
  const myReaction = msg.reactions.find(r => r.userId === currentUserId);

  return (
    <div className={`bg-card rounded-2xl border border-border overflow-hidden ${invite ? `border-l-2` : ""}`}
      style={invite ? { borderLeftColor: invite.color } : {}}>

      {/* Invitation header */}
      {invite && (
        <div className="px-4 pt-3 pb-1 flex items-center gap-2">
          <span className="text-lg">{invite.emoji}</span>
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: invite.color }}>
            {invite.label} Invitation
          </span>
          {msg.maxParticipants && (
            <span className="ml-auto text-xs text-muted-foreground">{yesCount}/{msg.maxParticipants}</span>
          )}
        </div>
      )}

      {/* Author row */}
      <div className="px-4 pt-3 flex items-start gap-3">
        <Avatar url={msg.author?.avatarUrl || null} name={msg.author?.displayName || "?"} color={msg.author?.bannerColor} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-sm text-foreground">{msg.author?.displayName || "Unknown"}</span>
            {msg.author?.title && <span className="text-xs text-muted-foreground">· {msg.author.title}</span>}
          </div>
          <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Clock className="w-2.5 h-2.5" />{timeAgo(msg.createdAt)}
          </span>
        </div>
        {isOwn && (
          <button onClick={() => onDelete(msg.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        <p className="text-sm text-foreground leading-relaxed">{msg.content}</p>
      </div>

      {/* Actions */}
      <div className="px-4 pb-3 flex items-center gap-2">
        {msg.type === "invitation" ? (
          <>
            <button onClick={() => onReact(msg.id, "yes")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${myReaction?.type === "yes" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-primary/20"}`}>
              <ThumbsUp className="w-3.5 h-3.5" /> Yes {yesCount > 0 && yesCount}
            </button>
            <button onClick={() => onReact(msg.id, "no")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${myReaction?.type === "no" ? "bg-destructive text-destructive-foreground" : "bg-secondary text-foreground hover:bg-destructive/20"}`}>
              <ThumbsDown className="w-3.5 h-3.5" /> No {noCount > 0 && noCount}
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={() => onReact(msg.id, "yes")}
              className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-all ${myReaction?.type === "yes" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary"}`}>
              👍 {yesCount || ""}
            </button>
            <button onClick={() => onReact(msg.id, "no")}
              className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-all ${myReaction?.type === "no" ? "text-destructive bg-destructive/10" : "text-muted-foreground hover:text-destructive"}`}>
              👎 {noCount || ""}
            </button>
          </div>
        )}
        <button onClick={() => onOpenReplies(msg)} className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-2.5 py-1.5 rounded-lg hover:bg-primary/10">
          <MessageCircle className="w-3.5 h-3.5" />
          {msg.replyCount > 0 ? msg.replyCount : "Reply"}
        </button>
      </div>
    </div>
  );
}

// ── Replies Sheet ──────────────────────────────────────────────────────────
function RepliesSheet({ msg, currentUserId, onClose }: { msg: NearbyMessage; currentUserId: number; onClose: () => void }) {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getReplies(msg.id).then(setReplies).catch(() => {});
  }, [msg.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const r = await postReply(msg.id, text.trim());
      setReplies(p => [...p, r]);
      setText("");
    } finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background" style={{ maxWidth: 480, margin: "0 auto" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border bg-card/80 backdrop-blur-sm">
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
          <X className="w-5 h-5" />
        </button>
        <div>
          <p className="text-sm font-semibold">Replies</p>
          <p className="text-xs text-muted-foreground line-clamp-1">{msg.content}</p>
        </div>
      </div>

      {/* Replies list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {replies.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No replies yet. Be the first!</p>
          </div>
        )}
        {replies.map(r => (
          <div key={r.id} className={`flex gap-3 ${r.userId === currentUserId ? "flex-row-reverse" : ""}`}>
            <Avatar url={r.author?.avatarUrl || null} name={r.author?.displayName || "?"} size={32} />
            <div className={`max-w-[75%] ${r.userId === currentUserId ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
              <p className="text-xs text-muted-foreground px-1">{r.author?.displayName}</p>
              <div className={`px-3 py-2 rounded-2xl text-sm ${r.userId === currentUserId ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-card border border-border rounded-tl-sm"}`}>
                {r.content}
              </div>
              <p className="text-[10px] text-muted-foreground px-1">{timeAgo(r.createdAt)}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border bg-card/80 backdrop-blur-sm flex gap-2">
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Write a reply..."
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          className="flex-1 px-4 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary transition-colors" />
        <button onClick={send} disabled={!text.trim() || sending}
          className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm disabled:opacity-40 transition-all active:scale-95">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Compose Sheet ──────────────────────────────────────────────────────────
const EMOJI_QUICK = ["😊","😂","❤️","🔥","👍","🙏","😍","🤔","😎","🎉","💯","⚽","🍕","🎮","☕","🚗"];

function ComposeSheet({ onClose, onPosted, userLat, userLng, locationLabel }: {
  onClose: () => void; onPosted: () => void; userLat: number; userLng: number;
  locationLabel?: string;
}) {
  const [msgType, setMsgType] = useState<"regular" | "invitation">("regular");
  const [inviteType, setInviteType] = useState<string>("");
  const [content, setContent] = useState("");
  const [maxPart, setMaxPart] = useState(10);
  const [expiryMins, setExpiryMins] = useState(120);
  const [showEmoji, setShowEmoji] = useState(false);
  const [sending, setSending] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const addEmoji = (e: string) => {
    setContent(p => p + e);
    textRef.current?.focus();
  };

  const canSend = content.trim().length > 0 && (msgType === "regular" || inviteType);

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      await pinMessage({
        lat: userLat, lng: userLng, content: content.trim(),
        type: msgType,
        ...(msgType === "invitation" && { invitationType: inviteType, maxParticipants: maxPart }),
        expiresInMinutes: expiryMins,
      });
      onPosted();
      onClose();
    } finally { setSending(false); }
  };

  return (
    <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="flex flex-col h-full bg-card border-t border-border overflow-y-auto">

      {/* Handle */}
      <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
        <div className="w-10 h-1 rounded-full bg-border" />
      </div>

      <div className="px-5 pb-safe space-y-4" style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground text-base">Pin a Message</h3>
            {locationLabel && (
              <p className="text-xs text-primary mt-0.5">📍 {locationLabel}</p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Message type toggle */}
        <div className="flex rounded-xl border border-border overflow-hidden">
          <button onClick={() => setMsgType("regular")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${msgType === "regular" ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:text-foreground"}`}>
            💬 Message
          </button>
          <button onClick={() => { setMsgType("invitation"); if (!inviteType) setInviteType("smoke"); }}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${msgType === "invitation" ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:text-foreground"}`}>
            🎯 Invitation
          </button>
        </div>

        {/* Invitation type picker */}
        {msgType === "invitation" && (
          <div className="grid grid-cols-5 gap-2">
            {INVITE_TYPES.map(t => (
              <button key={t.key} onClick={() => setInviteType(t.key)}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-all ${inviteType === t.key ? "scale-105" : "opacity-60 hover:opacity-80"}`}
                style={inviteType === t.key ? { borderColor: t.color, background: t.color + "20", color: t.color } : { borderColor: "transparent", background: "hsl(var(--secondary))" }}>
                <span className="text-xl">{t.emoji}</span>
                <span className="text-[10px]">{t.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Invitation settings */}
        {msgType === "invitation" && (
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground block mb-1">Max people</label>
              <input type="number" min={2} max={50} value={maxPart} onChange={e => setMaxPart(+e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground block mb-1">Expires in (min)</label>
              <select value={expiryMins} onChange={e => setExpiryMins(+e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary">
                <option value={30}>30 min</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
                <option value={240}>4 hours</option>
              </select>
            </div>
          </div>
        )}

        {/* Text input */}
        <div className="relative">
          <textarea ref={textRef} value={content} onChange={e => setContent(e.target.value)}
            placeholder={msgType === "invitation"
              ? "Add details to your invitation..."
              : "What's on your mind? Pin it for nearby people..."}
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none" />
        </div>

        {/* Emoji quick access */}
        <div>
          <div className="flex gap-1.5 flex-wrap">
            {EMOJI_QUICK.map(e => (
              <button key={e} onClick={() => addEmoji(e)}
                className="text-lg w-9 h-9 rounded-lg hover:bg-secondary active:scale-90 transition-all flex items-center justify-center">
                {e}
              </button>
            ))}
            <button onClick={() => setShowEmoji(!showEmoji)}
              className="w-9 h-9 rounded-lg hover:bg-secondary transition-all flex items-center justify-center text-muted-foreground">
              <Smile className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Send button */}
        <button onClick={send} disabled={!canSend || sending}
          className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
          {sending ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <><MapPin className="w-4 h-4" /> Pin Message</>
          )}
        </button>
      </div>
    </motion.div>
  );
}

// ── Event Card ────────────────────────────────────────────────────────────
function EventCard({
  event, currentUserId, onOpen, onRsvp, onDelete
}: {
  event: NearbyEvent; currentUserId: number;
  onOpen: (e: NearbyEvent) => void;
  onRsvp: (id: number, join: boolean) => void;
  onDelete: (id: number) => void;
}) {
  const cat = getEventCategory(event.category);
  const isCreator = event.creatorId === currentUserId;
  const hasJoined = event.rsvps.some(r => r.userId === currentUserId);
  const capacityText = event.maxParticipants
    ? `${event.rsvpCount}/${event.maxParticipants}`
    : `${event.rsvpCount}`;

  return (
    <div onClick={() => onOpen(event)}
      className="bg-card rounded-2xl border border-border overflow-hidden cursor-pointer hover:border-border/80 transition-colors"
      style={{ borderLeftWidth: 3, borderLeftColor: cat.color }}>
      <div className="px-4 py-3 flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
          style={{ background: cat.color + "20" }}>
          {cat.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{event.title}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <Clock className="w-2.5 h-2.5" />
            {formatEventDate(event.startsAt)}
            <span style={{ color: cat.color }} className="font-semibold">{formatEventTime(event.startsAt)}</span>
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs px-2 py-0.5 rounded-md font-medium"
              style={{ background: cat.color + "15", color: cat.color }}>
              {cat.label}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="w-2.5 h-2.5" /> {capacityText} going
            </span>
            {event.distance > 0 && (
              <span className="text-xs text-muted-foreground">
                {event.distance < 1000 ? `${event.distance}m` : `${(event.distance / 1000).toFixed(1)}km`}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          {isCreator ? (
            <button onClick={e => { e.stopPropagation(); onDelete(event.id); }}
              className="p-1 text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={e => { e.stopPropagation(); onRsvp(event.id, !hasJoined); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                hasJoined
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground hover:bg-primary/20"
              }`}>
              {hasJoined ? "Joined ✓" : "Join"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Event Detail Sheet ───────────────────────────────────────────────────
function EventDetailSheet({
  event, currentUserId, onClose, onRefresh
}: {
  event: NearbyEvent; currentUserId: number; onClose: () => void; onRefresh: () => void;
}) {
  const cat = getEventCategory(event.category);
  const hasJoined = event.rsvps.some(r => r.userId === currentUserId);
  const isCreator = event.creatorId === currentUserId;
  const isFull = event.maxParticipants ? event.rsvpCount >= event.maxParticipants : false;
  const [acting, setActing] = useState(false);

  const handleRsvp = async () => {
    setActing(true);
    try {
      if (hasJoined) await unrsvpEvent(event.id);
      else await rsvpEvent(event.id);
      onRefresh();
    } finally { setActing(false); }
  };

  const handleDelete = async () => {
    setActing(true);
    try {
      await deleteEvent(event.id);
      onRefresh();
      onClose();
    } finally { setActing(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background" style={{ maxWidth: 480, margin: "0 auto" }}>
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border bg-card/80 backdrop-blur-sm">
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
          <X className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <p className="text-sm font-semibold">Event Details</p>
        </div>
        {isCreator && (
          <button onClick={handleDelete} disabled={acting}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
            style={{ background: cat.color + "20" }}>
            {cat.emoji}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-foreground">{event.title}</h2>
            <span className="inline-block mt-1 text-xs px-2.5 py-1 rounded-lg font-semibold"
              style={{ background: cat.color + "15", color: cat.color }}>
              {cat.label}
            </span>
          </div>
        </div>

        {event.description && (
          <p className="text-sm text-foreground/80 leading-relaxed">{event.description}</p>
        )}

        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground">{formatEventDate(event.startsAt)}</span>
            <span className="text-xs font-semibold" style={{ color: cat.color }}>{formatEventTime(event.startsAt)}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground">
              {event.rsvpCount}{event.maxParticipants ? `/${event.maxParticipants}` : ""} going
            </span>
            {isFull && <span className="text-xs text-destructive font-semibold">Full</span>}
          </div>
          {event.creator && (
            <div className="flex items-center gap-3 text-sm">
              <Avatar url={event.creator.avatarUrl} name={event.creator.displayName || "?"} size={20} color={event.creator.bannerColor} />
              <span className="text-foreground">Created by {event.creator.displayName}</span>
            </div>
          )}
        </div>

        {event.rsvps.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Participants</h3>
            <div className="space-y-2">
              {event.rsvps.map(r => (
                <div key={r.id} className="flex items-center gap-2.5 py-1">
                  <Avatar url={r.avatarUrl || null} name={r.displayName || "?"} size={28} />
                  <span className="text-sm text-foreground">{r.displayName || "Anonymous"}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {!isCreator && (
        <div className="px-5 py-4 border-t border-border bg-card/80 backdrop-blur-sm">
          <button onClick={handleRsvp} disabled={acting || (isFull && !hasJoined)}
            className={`w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
              hasJoined
                ? "bg-secondary text-foreground border border-border"
                : "bg-primary text-primary-foreground"
            } disabled:opacity-40`}>
            {acting ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : hasJoined ? (
              "Leave Event"
            ) : isFull ? (
              "Event Full"
            ) : (
              <><Users className="w-4 h-4" /> Join Event</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Create Event Sheet ──────────────────────────────────────────────────
function CreateEventSheet({ onClose, onCreated, userLat, userLng }: {
  onClose: () => void; onCreated: () => void; userLat: number; userLng: number;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("other");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [maxPart, setMaxPart] = useState<string>("");
  const [sending, setSending] = useState(false);

  const canSend = title.trim() && date && time;

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      const startsAt = new Date(`${date}T${time}`).toISOString();
      await createEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        lat: userLat, lng: userLng,
        startsAt,
        maxParticipants: maxPart ? parseInt(maxPart) : undefined,
      });
      onCreated();
      onClose();
    } finally { setSending(false); }
  };

  return (
    <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="flex flex-col h-full bg-card border-t border-border overflow-y-auto">

      <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
        <div className="w-10 h-1 rounded-full bg-border" />
      </div>

      <div className="px-5 pb-safe space-y-4" style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground text-base">Create Event</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1">Event Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Study session at the library"
            className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary transition-colors" />
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">Category</label>
          <div className="grid grid-cols-3 gap-2">
            {EVENT_CATEGORIES.map(c => (
              <button key={c.key} onClick={() => setCategory(c.key)}
                className={`flex items-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-medium transition-all ${
                  category === c.key ? "scale-[1.02]" : "opacity-60 hover:opacity-80"
                }`}
                style={category === c.key
                  ? { borderColor: c.color, background: c.color + "20", color: c.color }
                  : { borderColor: "transparent", background: "hsl(var(--secondary))" }}>
                <span className="text-base">{c.emoji}</span>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground block mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary" />
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground block mb-1">Time</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary" />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1">Max Participants (optional)</label>
          <input type="number" min={2} max={200} value={maxPart} onChange={e => setMaxPart(e.target.value)}
            placeholder="No limit"
            className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary transition-colors" />
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1">Description (optional)</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Add details about this event..."
            rows={2}
            className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none" />
        </div>

        <button onClick={send} disabled={!canSend || sending}
          className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
          {sending ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <><MapPin className="w-4 h-4" /> Create Event</>
          )}
        </button>
      </div>
    </motion.div>
  );
}

// ── Pulse Ticker ─────────────────────────────────────────────────────────────
function PulseTicker({ messages }: { messages: NearbyMessage[] }) {
  const recent = messages.slice(0, 8);
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (recent.length < 2) return;
    const t = setInterval(() => setIdx(i => (i + 1) % recent.length), 4000);
    return () => clearInterval(t);
  }, [recent.length]);
  if (recent.length === 0) return null;
  const msg = recent[idx];
  return (
    <div className="absolute top-0 inset-x-0 z-20 pointer-events-none">
      <div className="mx-3 mt-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.35 }}
            className="flex items-center gap-2 bg-card/80 backdrop-blur-sm border border-border/60 rounded-full px-3 py-1.5 shadow-sm"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0 animate-pulse" />
            <span className="text-[11px] font-semibold text-primary truncate max-w-[80px]">{msg.author?.displayName || "Someone"}</span>
            <span className="text-[11px] text-muted-foreground truncate flex-1">{msg.content}</span>
            <span className="text-[10px] text-muted-foreground flex-shrink-0">{timeAgo(msg.createdAt)}</span>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Shops Tab ─────────────────────────────────────────────────────────────────
function ShopsTab() {
  const [shops, setShops] = useState<CampusShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    getShops().then(setShops).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  if (shops.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6">
        <ShoppingBag className="w-12 h-12 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground text-center">No shops or deals added yet.<br />Check back soon!</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-base font-bold text-foreground">Campus Shops & Deals</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Food, services & special offers on campus</p>
      </div>
      <div className="px-4 pb-6 space-y-3">
        {shops.map(shop => {
          const isOpen = expanded === shop.id;
          return (
            <div
              key={shop.id}
              className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm"
              style={{ borderTopColor: shop.color + "60" }}
            >
              <button
                onClick={() => setExpanded(isOpen ? null : shop.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: shop.color + "20" }}>
                  {shop.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-foreground truncate">{shop.name}</p>
                    {shop.discount && (
                      <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: shop.color }}>
                        {shop.discount}
                      </span>
                    )}
                  </div>
                  {shop.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{shop.description}</p>}
                  {shop.hours && <p className="text-[11px] text-primary mt-0.5">🕐 {shop.hours}</p>}
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
              </button>
              {isOpen && shop.menuItems.length > 0 && (
                <div className="px-4 pb-4 border-t border-border/50">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mt-3 mb-2">Menu</p>
                  <div className="space-y-2">
                    {(shop.menuItems as any[]).map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground font-medium truncate">{item.name}</p>
                          {item.description && <p className="text-[11px] text-muted-foreground truncate">{item.description}</p>}
                        </div>
                        {item.price && <span className="text-sm font-bold text-foreground flex-shrink-0">{item.price}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Home Page ─────────────────────────────────────────────────────────
export default function HomePage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { pos, error: locError, requestPermission } = useLocationEngine(true);

  const [messages, setMessages] = useState<NearbyMessage[]>([]);
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [events, setEvents] = useState<NearbyEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [compose, setCompose] = useState(false);
  const [composeMode, setComposeMode] = useState<"message" | "event">("message");
  const [replyTarget, setReplyTarget] = useState<NearbyMessage | null>(null);
  const [eventDetail, setEventDetail] = useState<NearbyEvent | null>(null);
  const [feedOpen, setFeedOpen] = useState(true);
  const [feedTab, setFeedTab] = useState<"messages" | "events">("messages");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [showPeople, setShowPeople] = useState(true);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [locations, setLocations] = useState<CampusLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<CampusLocation | null>(null);
  const [locationCenter, setLocationCenter] = useState<[number, number] | null>(null);
  const [composeLocationOverride, setComposeLocationOverride] = useState<{ lat: number; lng: number; name: string } | null>(null);

  // ── Unified app state ──
  const [activeTab, setActiveTab] = useState<"map" | "chats" | "shops">("map");
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [convs, setConvs] = useState<ConversationListItem[]>([]);
  const [convsLoading, setConvsLoading] = useState(false);

  const fetchConvs = useCallback(async () => {
    try {
      const c = await getConversations();
      setConvs(c);
      setChatUnreadCount(c.reduce((sum, x) => sum + (x.unreadCount || 0), 0));
    } catch {} finally { setConvsLoading(false); }
  }, []);

  useEffect(() => {
    setConvsLoading(true);
    fetchConvs();
    const interval = setInterval(fetchConvs, 10000);
    return () => clearInterval(interval);
  }, [fetchConvs]);

  // Handle ?open=convId deep-link (from notifications) — open specific chat
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const openChatId = params.get("open");
    if (openChatId) {
      setActiveTab("chats");
      setActiveChatId(parseInt(openChatId));
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Fetch campus locations once on mount; derive map center from them when no GPS
  useEffect(() => {
    getLocations().then(locs => {
      const valid = locs.filter(l => l.polygon && l.polygon.length >= 3);
      setLocations(valid);
      if (valid.length > 0) {
        const allPts = valid.flatMap(l => l.polygon);
        const cLat = allPts.reduce((s, p) => s + p.lat, 0) / allPts.length;
        const cLng = allPts.reduce((s, p) => s + p.lng, 0) / allPts.length;
        if (!isNaN(cLat) && !isNaN(cLng)) setLocationCenter([cLat, cLng]);
      }
    }).catch(() => {});
  }, []);

  const mapCenter: [number, number] = pos ? [pos.lat, pos.lng] : (locationCenter ?? ISRAEL_CENTER);
  const mapZoom = pos ? 17 : (locationCenter ? 16 : FALLBACK_ZOOM);

  const locationCenterRef = useRef(locationCenter);
  useEffect(() => { locationCenterRef.current = locationCenter; }, [locationCenter]);

  const fetchAll = useCallback(async () => {
    const coord = pos
      ? { lat: pos.lat, lng: pos.lng }
      : locationCenterRef.current
        ? { lat: locationCenterRef.current[0], lng: locationCenterRef.current[1] }
        : null;
    if (!coord) return;
    const radius = pos ? 300 : 800;
    setLoading(true);
    try {
      const [msgs, users, evts] = await Promise.allSettled([
        getNearbyMessages(coord.lat, coord.lng, radius),
        pos ? getNearbyUsers(coord.lat, coord.lng, 500) : Promise.resolve<NearbyUser[]>([]),
        getNearbyEvents(coord.lat, coord.lng, 1000),
      ]);
      if (msgs.status === "fulfilled") setMessages(msgs.value);
      if (users.status === "fulfilled") setNearbyUsers(users.value);
      if (evts.status === "fulfilled") {
        setEvents(evts.value);
        setEventDetail(prev => {
          if (!prev) return null;
          const updated = evts.value.find(e => e.id === prev.id);
          return updated || null;
        });
      }
      setLastRefresh(new Date());
    } catch {} finally { setLoading(false); }
  }, [pos]);

  // Initial fetch + periodic refresh every 15s (runs when GPS or campus center becomes available)
  useEffect(() => {
    const coord = pos || locationCenter;
    if (!coord) return;
    fetchAll();
    const interval = setInterval(fetchAll, 15_000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos, locationCenter, fetchAll]);

  // Deep-link from notifications: ?viewEvent=ID or ?viewMessage=ID
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewEventId = params.get("viewEvent");
    const viewMessageId = params.get("viewMessage");

    if (viewEventId && events.length > 0) {
      const evt = events.find(e => e.id === parseInt(viewEventId));
      if (evt) {
        setFeedTab("events");
        setFeedOpen(true);
        setEventDetail(evt);
      }
      window.history.replaceState({}, "", window.location.pathname);
    }

    if (viewMessageId && messages.length > 0) {
      const msg = messages.find(m => m.id === parseInt(viewMessageId));
      if (msg) {
        setFeedTab("messages");
        setFeedOpen(true);
        setReplyTarget(msg);
      }
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [events, messages]);

  const handleDelete = async (id: number) => {
    await deleteMessage(id);
    setMessages(p => p.filter(m => m.id !== id));
  };

  const handleReact = async (id: number, type: "yes" | "no") => {
    await reactToMessage(id, type);
    fetchAll();
  };

  const handleEventRsvp = async (id: number, join: boolean) => {
    try {
      if (join) await rsvpEvent(id);
      else await unrsvpEvent(id);
      fetchAll();
    } catch {}
  };

  const handleEventDelete = async (id: number) => {
    try {
      await deleteEvent(id);
      fetchAll();
    } catch {}
  };

  if (!user) return null;

  return (
    <div className="flex-1 flex flex-col h-dvh overflow-hidden relative">
      {/* ── TOP BAR ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-card/90 backdrop-blur-md border-b border-border z-20">
        <div className="flex items-center gap-3">
          <Avatar url={user.avatarUrl} name={user.displayName || "?"} color={user.bannerColor} size={34} />
          <div>
            <p className="text-sm font-semibold text-foreground leading-tight">{user.displayName || "Set your name"}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5" />
              {pos ? `${messages.length} messages nearby` : locError ? (locationCenter ? "Campus view" : "Location unavailable") : locationCenter ? "Campus view" : "Locating..."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={fetchAll} className="p-2 rounded-xl hover:bg-secondary transition-colors" disabled={loading}>
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
          </button>
          <NotificationBell />
          <button onClick={() => navigate("/profile")} className="p-2 rounded-xl hover:bg-secondary transition-colors">
            <User className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* ── SHOPS TAB ── */}
      {activeTab === "shops" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <ShopsTab />
        </div>
      )}

      {/* ── MAP ── */}
      <div className="relative" style={{
        height: activeTab === "shops"
          ? "0"
          : activeTab === "chats"
          ? "35dvh"
          : (selectedLocation || compose)
          ? "38dvh"
          : feedOpen ? "40dvh" : "calc(100dvh - 113px)",
        minHeight: activeTab === "shops" ? 0 : 180,
        flexShrink: 0,
        display: activeTab === "shops" ? "none" : undefined,
      }}>
        <MapContainer center={mapCenter} zoom={mapZoom} style={{ width: "100%", height: "100%" }}>
          <TileLayer
            attribution="&copy; Esri"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
          />
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
            attribution=""
          />
          {pos && !isNaN(pos.lat) && !isNaN(pos.lng) && (
            <MapCenterUpdater center={[pos.lat, pos.lng]} zoom={17} />
          )}
          {!pos && locationCenter && (
            <MapCenterUpdater center={locationCenter} zoom={16} />
          )}
          <MapSizeInvalidator deps={[activeTab, feedOpen, !!selectedLocation, compose]} />

          {/* Campus location polygons */}
          {locations.map(loc => {
            const positions = loc.polygon.map(p => [p.lat, p.lng] as [number, number]);
            const centroid = polygonCentroid(loc.polygon);
            const cfg = LOC_TYPES[loc.type] || LOC_TYPES.other;
            const labelIcon = L.divIcon({
              className: "",
              html: `<div style="
                background:rgba(0,0,0,0.72);
                color:#fff;
                border:1.5px solid ${loc.color}90;
                border-radius:10px;
                padding:2px 8px;
                font-size:11px;
                font-weight:700;
                white-space:nowrap;
                box-shadow:0 2px 8px rgba(0,0,0,0.5);
                pointer-events:none;
                display:flex;align-items:center;gap:4px;
              ">${cfg.emoji} ${loc.name}</div>`,
              iconAnchor: [0, 0],
              iconSize: undefined as any,
            });
            return (
              <React.Fragment key={loc.id}>
                <Polygon
                  positions={positions}
                  pathOptions={{
                    color: loc.color,
                    fillColor: loc.color,
                    fillOpacity: 0.18,
                    weight: 2,
                    opacity: 0.7,
                  }}
                  eventHandlers={{ click: () => setSelectedLocation(loc) }}
                />
                <Marker
                  position={centroid}
                  icon={labelIcon}
                  eventHandlers={{ click: () => setSelectedLocation(loc) }}
                />
              </React.Fragment>
            );
          })}

          {/* User position marker */}
          {pos && (
            <Marker position={[pos.lat, pos.lng]}
              icon={makeMarker("📍", "#3b82f6", true)} />
          )}

          {/* Message markers */}
          {messages.map(msg => {
            const inv = getInviteConfig(msg.invitationType);
            const emoji = inv ? inv.emoji : (msg.author?.avatarUrl?.startsWith("emoji:") ? msg.author.avatarUrl.slice(6) : "💬");
            const color = inv ? inv.color : "#64748b";
            return (
              <Marker key={msg.id} position={[msg.lat, msg.lng]} icon={makeMarker(emoji, color)} />
            );
          })}

          {/* Event markers */}
          {events.map(evt => (
            <Marker key={`event-${evt.id}`} position={[evt.lat, evt.lng]} icon={makeEventMarker(evt)}
              eventHandlers={{ click: () => setEventDetail(evt) }} />
          ))}

          {/* Nearby user markers */}
          {showPeople && nearbyUsers.map(u => (
            <Marker key={`user-${u.id}`} position={[u.lat, u.lng]} icon={makeUserMarker(u)}>
              <Popup className="user-popup" closeButton={false}>
                <div style={{ minWidth: 130, textAlign: "center", padding: "2px 0" }}>
                  <p style={{ fontWeight: 700, fontSize: 13, margin: 0 }}>{u.displayName || "?"}</p>
                  {u.title && <p style={{ fontSize: 11, color: "#94a3b8", margin: "2px 0 0" }}>{u.title}</p>}
                  <p style={{ fontSize: 10, color: u.active ? "#4ade80" : "#94a3b8", margin: "4px 0 0" }}>
                    {u.active ? "Active now" : u.lastSeen ? `Last seen ${timeAgo(u.lastSeen)}` : "Inactive"}
                  </p>
                  <button onClick={async () => {
                      try {
                        const conv = await createConversation({ type: "direct", memberIds: [u.id] });
                        setActiveTab("chats");
                        setActiveChatId(conv.id);
                      } catch {}
                    }}
                    style={{ marginTop: 6, padding: "4px 12px", fontSize: 11, fontWeight: 600, background: "hsl(221.2 83.2% 53.3%)", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}>
                    Message
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Pulse Ticker */}
        {activeTab === "map" && <PulseTicker messages={messages} />}

        {/* People toggle */}
        <button
          onClick={() => setShowPeople(p => !p)}
          className={`absolute top-3 right-3 z-10 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all shadow-lg backdrop-blur-sm border ${
            showPeople
              ? "bg-primary/90 text-primary-foreground border-primary/50"
              : "bg-card/80 text-muted-foreground border-border"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          {nearbyUsers.length > 0 ? nearbyUsers.length : ""} People
        </button>

        {/* Location permission notice — only shown when no GPS AND no campus center yet */}
        {!pos && !locError && !locationCenter && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm z-10">
            <div className="bg-card border border-border rounded-2xl p-5 text-center max-w-xs mx-4 shadow-xl">
              <Navigation className="w-10 h-10 text-primary mx-auto mb-3" />
              <p className="font-semibold text-foreground mb-1">Enable Location</p>
              <p className="text-xs text-muted-foreground mb-4">See messages pinned by people around you</p>
              <button onClick={requestPermission} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm">
                Share Location
              </button>
            </div>
          </div>
        )}

        {/* Expand/collapse toggle */}
        <button onClick={() => setFeedOpen(p => !p)}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 bg-card/90 backdrop-blur-sm border border-border px-4 py-1.5 rounded-full text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors shadow-lg">
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${feedOpen ? "" : "rotate-180"}`} />
          {feedOpen ? "Expand map" : "Show feed"}
        </button>
      </div>

      {/* ── LOCATION DETAIL (inline, below map) ── */}
      <AnimatePresence>
        {selectedLocation && (
          <div className="flex-1 overflow-hidden">
            <LocationDetailSheet
              loc={selectedLocation}
              onClose={() => setSelectedLocation(null)}
              onComposeHere={() => {
                const ctr = polygonCentroid(selectedLocation.polygon);
                setComposeLocationOverride({ lat: ctr[0], lng: ctr[1], name: selectedLocation.name });
                setSelectedLocation(null);
                setComposeMode("message");
                setCompose(true);
              }}
            />
          </div>
        )}
      </AnimatePresence>

      {/* ── COMPOSE / EVENT SHEET (inline, below map) ── */}
      <AnimatePresence>
        {compose && !selectedLocation && (pos || composeLocationOverride || locationCenter) && (
          <div className="flex-1 overflow-hidden">
            {composeMode === "message" ? (
              <ComposeSheet
                onClose={() => { setCompose(false); setComposeLocationOverride(null); }}
                onPosted={() => { fetchAll(); setComposeLocationOverride(null); }}
                userLat={composeLocationOverride?.lat ?? pos?.lat ?? locationCenter?.[0] ?? 0}
                userLng={composeLocationOverride?.lng ?? pos?.lng ?? locationCenter?.[1] ?? 0}
                locationLabel={composeLocationOverride?.name}
              />
            ) : (
              <CreateEventSheet
                onClose={() => { setCompose(false); setComposeLocationOverride(null); }}
                onCreated={() => { fetchAll(); setComposeLocationOverride(null); }}
                userLat={composeLocationOverride?.lat ?? pos?.lat ?? locationCenter?.[0] ?? 0}
                userLng={composeLocationOverride?.lng ?? pos?.lng ?? locationCenter?.[1] ?? 0}
              />
            )}
          </div>
        )}
      </AnimatePresence>

      {/* ── FEED (map tab only) ── */}
      {!selectedLocation && !compose && feedOpen && activeTab === "map" && (
        <div className="flex-1 overflow-y-auto"
          onTouchStart={(e) => {
            const el = e.currentTarget;
            if (el.scrollTop <= 0) {
              (el as any).__pullStartY = e.touches[0].clientY;
            }
          }}
          onTouchEnd={(e) => {
            const el = e.currentTarget;
            const startY = (el as any).__pullStartY;
            if (startY !== undefined && el.scrollTop <= 0) {
              const endY = e.changedTouches[0].clientY;
              if (endY - startY > 60) fetchAll();
              delete (el as any).__pullStartY;
            }
          }}>
          {/* Feed header with tabs */}
          <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-sm border-b border-border">
            <div className="px-4 pt-2.5 pb-0 flex items-center justify-between">
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button onClick={() => setFeedTab("messages")}
                  className={`px-3.5 py-1.5 text-xs font-medium transition-colors ${feedTab === "messages" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  💬 Messages {messages.length > 0 && `(${messages.length})`}
                </button>
                <button onClick={() => setFeedTab("events")}
                  className={`px-3.5 py-1.5 text-xs font-medium transition-colors ${feedTab === "events" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  🗓 Events {events.length > 0 && `(${events.length})`}
                </button>
              </div>
              {lastRefresh && (
                <span className="text-[10px] text-muted-foreground">Updated {timeAgo(lastRefresh.toISOString())}</span>
              )}
            </div>
            <div className="h-2.5" />
          </div>

          <div className="px-4 py-3 space-y-3 pb-24">
            {loading && messages.length === 0 && events.length === 0 && (
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="rounded-2xl bg-card border border-border p-4 animate-pulse">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-muted" />
                      <div className="space-y-1.5">
                        <div className="h-3.5 w-24 bg-muted rounded" />
                        <div className="h-3 w-16 bg-muted rounded" />
                      </div>
                    </div>
                    <div className="h-4 w-full bg-muted rounded mb-2" />
                    <div className="h-4 w-3/4 bg-muted rounded" />
                  </div>
                ))}
              </div>
            )}
            {feedTab === "messages" ? (
              <>
                {messages.length === 0 && !loading && (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-3">📍</div>
                    <p className="text-muted-foreground text-sm font-medium">No messages nearby</p>
                    <p className="text-muted-foreground text-xs mt-1">Be the first to pin a message!</p>
                  </div>
                )}
                {messages.map(msg => (
                  <MessageCard key={msg.id} msg={msg} currentUserId={user.id}
                    onDelete={handleDelete}
                    onReact={handleReact}
                    onOpenReplies={setReplyTarget}
                  />
                ))}
              </>
            ) : (
              <>
                {events.length === 0 && !loading && (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-3">🗓</div>
                    <p className="text-muted-foreground text-sm font-medium">No events nearby</p>
                    <p className="text-muted-foreground text-xs mt-1">Create one and invite people!</p>
                  </div>
                )}
                {events.map(evt => (
                  <EventCard key={evt.id} event={evt} currentUserId={user.id}
                    onOpen={setEventDetail}
                    onRsvp={handleEventRsvp}
                    onDelete={handleEventDelete}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── CHATS PANEL (chats tab) ── */}
      {!selectedLocation && !compose && activeTab === "chats" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm flex-shrink-0">
            <p className="font-bold text-base text-foreground">Chats</p>
            <button onClick={() => setShowNewChat(true)}
              className="p-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {convsLoading && (
              <div className="space-y-0">
                {[1,2,3,4].map(i => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b border-border animate-pulse">
                    <div className="w-12 h-12 rounded-2xl bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-28 bg-muted rounded" />
                      <div className="h-3 w-40 bg-muted rounded" />
                    </div>
                    <div className="h-3 w-8 bg-muted rounded" />
                  </div>
                ))}
              </div>
            )}
            {!convsLoading && convs.length === 0 && (
              <div className="text-center py-14">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground text-sm font-medium">No chats yet</p>
                <p className="text-muted-foreground text-xs mt-1">Start a conversation with nearby people!</p>
                <button onClick={() => setShowNewChat(true)}
                  className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
                  New Chat
                </button>
              </div>
            )}
            {convs.map(c => (
              <ConversationRow key={c.id} conv={c} currentUserId={user.id}
                onClick={() => setActiveChatId(c.id)} />
            ))}
          </div>
        </div>
      )}

      {/* ── FAB: Compose ── */}
      {!compose && !replyTarget && !eventDetail && (pos || locationCenter) && activeTab === "map" && (
        <div className="fixed bottom-6 right-5 z-30 flex flex-col gap-2.5 items-end">
          <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.3 }}
            onClick={() => { setComposeMode("event"); setCompose(true); }}
            className="w-11 h-11 rounded-xl bg-card border border-border text-foreground shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform text-lg">
            🗓
          </motion.button>
          <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}
            onClick={() => { setComposeMode("message"); setCompose(true); }}
            className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform">
            <MessageSquarePlus className="w-6 h-6" />
          </motion.button>
        </div>
      )}

      {/* ── Replies Sheet ── */}
      <AnimatePresence>
        {replyTarget && (
          <RepliesSheet msg={replyTarget} currentUserId={user.id} onClose={() => setReplyTarget(null)} />
        )}
      </AnimatePresence>

      {/* ── Event Detail Sheet ── */}
      {eventDetail && (
        <EventDetailSheet
          event={eventDetail}
          currentUserId={user.id}
          onClose={() => setEventDetail(null)}
          onRefresh={fetchAll}
        />
      )}

      {/* ── Bottom Navigation ── */}
      <div className="border-t border-border bg-card/90 backdrop-blur-sm flex z-20 flex-shrink-0">
        <button onClick={() => setActiveTab("map")}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${activeTab === "map" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
          <MapPin className="w-5 h-5" />
          <span className="text-[10px] font-medium">Map</span>
        </button>
        <button onClick={() => setActiveTab("chats")}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors relative ${activeTab === "chats" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
          <div className="relative">
            <MessageCircle className="w-5 h-5" />
            {chatUnreadCount > 0 && (
              <div className="absolute -top-1.5 -right-2.5 min-w-[14px] h-[14px] rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center px-0.5">
                {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
              </div>
            )}
          </div>
          <span className="text-[10px] font-medium">Chats</span>
        </button>
        <button onClick={() => setActiveTab("shops")}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${activeTab === "shops" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
          <ShoppingBag className="w-5 h-5" />
          <span className="text-[10px] font-medium">Shops</span>
        </button>
        <button onClick={() => navigate("/profile")}
          className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-muted-foreground hover:text-foreground transition-colors">
          <User className="w-5 h-5" />
          <span className="text-[10px] font-medium">Profile</span>
        </button>
      </div>

      {/* ── Chat Detail Overlay ── */}
      {activeChatId !== null && (
        <ChatDetail
          convId={activeChatId}
          currentUserId={user.id}
          onBack={() => { setActiveChatId(null); fetchConvs(); }}
        />
      )}

      {/* ── New Chat Sheet ── */}
      <AnimatePresence>
        {showNewChat && (
          <NewChatSheet
            onClose={() => setShowNewChat(false)}
            onCreated={(id) => { setShowNewChat(false); setActiveChatId(id); }}
            currentUserId={user.id}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
