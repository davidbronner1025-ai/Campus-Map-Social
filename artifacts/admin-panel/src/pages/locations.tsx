import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { MapContainer, TileLayer, Polygon, Polyline, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, X, Save, Building2, UtensilsCrossed, Trophy, Car, Trees,
  MapPin, AlertTriangle, Star, Calendar, Users, ChevronRight, Bell, Clock, Undo2,
  Swords, Megaphone
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import {
  useGetCampus, useGetLocations, useCreateLocation, useUpdateLocation, useDeleteLocation,
  useGetAnnouncements, useCreateAnnouncement, useDeleteAnnouncement,
  useGetSchedules, useCreateScheduleEntry, useDeleteScheduleEntry,
  useGetMenus, useCreateMenu, useRateMenu,
  useGetGames, useCreateGame, useDeleteGame, useVoteForGame,
  LocationType,
} from "@workspace/api-client-react";

// Fix Leaflet default icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ── Type config ─────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { label: string; color: string; icon: any; emoji: string }> = {
  building:     { label: "Building",     color: "#4f9cf9", icon: Building2,       emoji: "🏛️" },
  dining_hall:  { label: "Dining Hall",  color: "#f97316", icon: UtensilsCrossed, emoji: "🍽️" },
  sports_field: { label: "Sports Field", color: "#22c55e", icon: Trophy,           emoji: "⚽" },
  parking:      { label: "Parking",      color: "#a855f7", icon: Car,             emoji: "🚗" },
  green:        { label: "Green Area",   color: "#84cc16", icon: Trees,           emoji: "🌿" },
  other:        { label: "Other",        color: "#6b7280", icon: MapPin,          emoji: "📍" },
};

const SPORT_LABELS: Record<string, string> = {
  football: "⚽ Football", basketball: "🏀 Basketball",
  volleyball: "🏐 Volleyball", tennis: "🎾 Tennis", other: "🏆 Other",
};

const PRIORITY_CONFIG: Record<string, { label: string; cls: string }> = {
  normal:    { label: "Normal",    cls: "text-primary border-primary" },
  important: { label: "Important", cls: "text-accent border-accent" },
  urgent:    { label: "Urgent",    cls: "text-destructive border-destructive" },
};

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const DAY_LABELS: Record<string, string> = {
  sunday: "Sun", monday: "Mon", tuesday: "Tue", wednesday: "Wed",
  thursday: "Thu", friday: "Fri", saturday: "Sat",
};

// ── Schemas ──────────────────────────────────────────────────────────────────
const locationSchema = z.object({
  name: z.string().min(1, "Name required"),
  description: z.string().optional(),
  type: z.nativeEnum(LocationType),
  color: z.string(),
  adminName: z.string().optional(),
});
type LocationForm = z.infer<typeof locationSchema>;

const announcementSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  priority: z.enum(["normal", "important", "urgent"]),
});

const scheduleSchema = z.object({
  dayOfWeek: z.enum(["sunday","monday","tuesday","wednesday","thursday","friday","saturday"]),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  label: z.string().min(1),
  instructor: z.string().optional(),
});

const menuSchema = z.object({
  date: z.string().min(1),
  items: z.array(z.object({ name: z.string().min(1), category: z.enum(["starter","main","side","dessert","drink"]) })).min(1),
});

const gameSchema = z.object({
  sport: z.enum(["football","basketball","volleyball","tennis","other"]),
  scheduledAt: z.string().min(1),
  description: z.string().optional(),
  maxPlayers: z.coerce.number().min(2).max(100),
});

// ── Map helpers ──────────────────────────────────────────────────────────────
function MapClickHandler({ drawing, onPoint }: { drawing: boolean; onPoint: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => { if (drawing) onPoint(e.latlng.lat, e.latlng.lng); } });
  return null;
}

function MapFly({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  useEffect(() => { map.flyTo([lat, lng], zoom, { duration: 1.2 }); }, [lat, lng, zoom, map]);
  return null;
}

// ── Star Rating ──────────────────────────────────────────────────────────────
function StarRating({ value, max = 5, onRate }: { value: number; max?: number; onRate?: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <Star key={i}
          className={`w-5 h-5 cursor-pointer transition-colors ${(hover || value) > i ? "text-accent fill-accent" : "text-muted-foreground"}`}
          onClick={() => onRate?.(i + 1)}
          onMouseEnter={() => onRate && setHover(i + 1)}
          onMouseLeave={() => onRate && setHover(0)}
        />
      ))}
    </div>
  );
}

// ── Building Panel ────────────────────────────────────────────────────────────
function BuildingPanel({ locationId }: { locationId: number }) {
  const [tab, setTab] = useState<"announcements" | "schedule">("announcements");

  const { data: announcements = [], refetch: reA } = useGetAnnouncements({ locationId });
  const { data: schedules = [], refetch: reS } = useGetSchedules({ locationId });
  const createAnn = useCreateAnnouncement();
  const deleteAnn = useDeleteAnnouncement();
  const createSch = useCreateScheduleEntry();
  const deleteSch = useDeleteScheduleEntry();

  const aForm = useForm({ resolver: zodResolver(announcementSchema), defaultValues: { title: "", content: "", priority: "normal" as const } });
  const sForm = useForm({ resolver: zodResolver(scheduleSchema), defaultValues: { dayOfWeek: "monday" as const, startTime: "08:00", endTime: "10:00", label: "", instructor: "" } });

  const submitAnn = (d: any) => createAnn.mutate({ locationId, data: d }, { onSuccess: () => { aForm.reset(); reA(); } });
  const submitSch = (d: any) => createSch.mutate({ locationId, data: d }, { onSuccess: () => { sForm.reset(); reS(); } });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 border-b border-primary/20 pb-2">
        {(["announcements", "schedule"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1 text-xs font-mono uppercase tracking-wider border transition-colors ${tab === t ? "border-primary text-primary bg-primary/10" : "border-transparent text-muted-foreground hover:text-primary"}`}>
            {t === "announcements" ? <><Megaphone className="w-3 h-3 inline mr-1" />Announcements</> : <><Clock className="w-3 h-3 inline mr-1" />Schedule</>}
          </button>
        ))}
      </div>

      {tab === "announcements" && (
        <div className="space-y-3">
          {announcements.map(a => (
            <div key={a.id} className={`border p-3 space-y-1 ${PRIORITY_CONFIG[a.priority]?.cls || "border-primary"}`}>
              <div className="flex justify-between items-start">
                <span className="text-xs font-mono font-bold">{a.title}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] uppercase font-mono border px-1 ${PRIORITY_CONFIG[a.priority]?.cls}`}>{a.priority}</span>
                  <button onClick={() => deleteAnn.mutate({ announcementId: a.id }, { onSuccess: reA })}>
                    <X className="w-3 h-3 text-destructive hover:scale-110" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{a.content}</p>
            </div>
          ))}
          {announcements.length === 0 && <p className="text-xs text-muted-foreground font-mono">NO ANNOUNCEMENTS</p>}
          <form onSubmit={aForm.handleSubmit(submitAnn)} className="border border-primary/30 p-3 space-y-2 bg-card/30">
            <p className="text-[9px] text-primary font-mono uppercase tracking-widest">+ New Announcement</p>
            <input {...aForm.register("title")} placeholder="Title" className="w-full bg-background/50 border border-primary/40 text-foreground text-xs p-2 font-mono" />
            <textarea {...aForm.register("content")} placeholder="Content" rows={2} className="w-full bg-background/50 border border-primary/40 text-foreground text-xs p-2 font-mono resize-none" />
            <div className="flex gap-2">
              <select {...aForm.register("priority")} className="flex-1 bg-background/50 border border-primary/40 text-foreground text-xs p-2 font-mono">
                <option value="normal">Normal</option>
                <option value="important">Important</option>
                <option value="urgent">Urgent</option>
              </select>
              <button type="submit" className="px-3 py-2 bg-primary text-primary-foreground text-xs font-mono uppercase border border-primary hover:bg-primary/80">POST</button>
            </div>
          </form>
        </div>
      )}

      {tab === "schedule" && (
        <div className="space-y-3">
          <div className="space-y-1">
            {DAYS.map(day => {
              const entries = schedules.filter(s => s.dayOfWeek === day);
              if (!entries.length) return null;
              return (
                <div key={day} className="border border-primary/20 p-2">
                  <p className="text-[9px] text-primary font-mono uppercase mb-1">{day}</p>
                  {entries.map(e => (
                    <div key={e.id} className="flex justify-between items-center text-xs py-1 border-t border-primary/10">
                      <span className="font-mono text-foreground">{e.startTime}–{e.endTime} · {e.label}</span>
                      <div className="flex items-center gap-2">
                        {e.instructor && <span className="text-muted-foreground text-[10px]">{e.instructor}</span>}
                        <button onClick={() => deleteSch.mutate({ scheduleId: e.id }, { onSuccess: reS })}><X className="w-3 h-3 text-destructive" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
            {schedules.length === 0 && <p className="text-xs text-muted-foreground font-mono">NO SCHEDULE ENTRIES</p>}
          </div>
          <form onSubmit={sForm.handleSubmit(submitSch)} className="border border-primary/30 p-3 space-y-2 bg-card/30">
            <p className="text-[9px] text-primary font-mono uppercase tracking-widest">+ Add Entry</p>
            <div className="grid grid-cols-2 gap-2">
              <select {...sForm.register("dayOfWeek")} className="bg-background/50 border border-primary/40 text-foreground text-xs p-2 font-mono">
                {DAYS.map(d => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
              </select>
              <input {...sForm.register("label")} placeholder="Course / Event" className="bg-background/50 border border-primary/40 text-foreground text-xs p-2 font-mono" />
              <input {...sForm.register("startTime")} type="time" className="bg-background/50 border border-primary/40 text-foreground text-xs p-2 font-mono" />
              <input {...sForm.register("endTime")} type="time" className="bg-background/50 border border-primary/40 text-foreground text-xs p-2 font-mono" />
            </div>
            <input {...sForm.register("instructor")} placeholder="Instructor (optional)" className="w-full bg-background/50 border border-primary/40 text-foreground text-xs p-2 font-mono" />
            <button type="submit" className="w-full py-2 bg-primary text-primary-foreground text-xs font-mono uppercase border border-primary hover:bg-primary/80">ADD</button>
          </form>
        </div>
      )}
    </div>
  );
}

// ── Dining Hall Panel ─────────────────────────────────────────────────────────
function DiningPanel({ locationId }: { locationId: number }) {
  const { data: menus = [], refetch } = useGetMenus({ locationId });
  const createMenu = useCreateMenu();
  const rateMenu = useRateMenu();
  const [ratingState, setRatingState] = useState<{ menuId: number; val: number } | null>(null);

  const today = new Date().toISOString().split("T")[0];
  const [newItems, setNewItems] = useState<{ name: string; category: string }[]>([{ name: "", category: "main" }]);
  const [menuDate, setMenuDate] = useState(today);

  const addItem = () => setNewItems(p => [...p, { name: "", category: "main" }]);
  const removeItem = (i: number) => setNewItems(p => p.filter((_, idx) => idx !== i));
  const updateItem = (i: number, k: string, v: string) => setNewItems(p => p.map((it, idx) => idx === i ? { ...it, [k]: v } : it));

  const submitMenu = () => {
    const valid = newItems.filter(it => it.name.trim());
    if (!valid.length) return;
    createMenu.mutate({ locationId, data: { date: menuDate, items: valid as any } }, {
      onSuccess: () => { setNewItems([{ name: "", category: "main" }]); refetch(); }
    });
  };

  const submitRating = (menuId: number) => {
    if (!ratingState) return;
    rateMenu.mutate({ menuId, data: { rating: ratingState.val } }, { onSuccess: () => { setRatingState(null); refetch(); } });
  };

  const CATEGORY_EMOJI: Record<string, string> = { starter: "🥗", main: "🍖", side: "🍟", dessert: "🍰", drink: "🥤" };

  return (
    <div className="space-y-4">
      {menus.map(menu => (
        <div key={menu.id} className="border border-accent/40 p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono text-accent uppercase">{menu.date}</span>
            <div className="flex items-center gap-2">
              <StarRating value={menu.averageRating} />
              <span className="text-[10px] text-muted-foreground font-mono">({menu.ratingCount})</span>
            </div>
          </div>
          <div className="space-y-1">
            {(menu.items as any[]).map((it: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs text-foreground font-mono">
                <span>{CATEGORY_EMOJI[it.category] || "•"}</span>
                <span>{it.name}</span>
                <span className="text-muted-foreground text-[10px]">{it.category}</span>
              </div>
            ))}
          </div>
          {ratingState?.menuId === menu.id ? (
            <div className="flex items-center gap-3 mt-2">
              <StarRating value={ratingState.val} onRate={v => setRatingState({ menuId: menu.id, val: v })} />
              <button onClick={() => submitRating(menu.id)} className="text-[10px] font-mono px-2 py-1 bg-accent text-accent-foreground uppercase">Submit</button>
              <button onClick={() => setRatingState(null)} className="text-[10px] font-mono text-muted-foreground">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setRatingState({ menuId: menu.id, val: 0 })} className="text-[10px] font-mono text-accent border border-accent/40 px-2 py-1 uppercase hover:bg-accent/10">Rate This Menu</button>
          )}
        </div>
      ))}
      {menus.length === 0 && <p className="text-xs text-muted-foreground font-mono">NO MENUS UPLOADED</p>}

      <div className="border border-accent/30 p-3 space-y-2 bg-card/30">
        <p className="text-[9px] text-accent font-mono uppercase tracking-widest">+ Today's Menu</p>
        <input type="date" value={menuDate} onChange={e => setMenuDate(e.target.value)} className="w-full bg-background/50 border border-accent/40 text-foreground text-xs p-2 font-mono" />
        {newItems.map((it, i) => (
          <div key={i} className="flex gap-2">
            <input value={it.name} onChange={e => updateItem(i, "name", e.target.value)} placeholder="Item name" className="flex-1 bg-background/50 border border-accent/40 text-foreground text-xs p-2 font-mono" />
            <select value={it.category} onChange={e => updateItem(i, "category", e.target.value)} className="bg-background/50 border border-accent/40 text-foreground text-xs p-2 font-mono">
              {["starter","main","side","dessert","drink"].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={() => removeItem(i)} className="text-destructive px-1"><X className="w-3 h-3" /></button>
          </div>
        ))}
        <div className="flex gap-2">
          <button onClick={addItem} className="text-[10px] font-mono text-accent border border-accent/40 px-2 py-1 uppercase hover:bg-accent/10">+ Item</button>
          <button onClick={submitMenu} className="flex-1 py-1 bg-accent text-accent-foreground text-xs font-mono uppercase border border-accent hover:bg-accent/80">Upload Menu</button>
        </div>
      </div>
    </div>
  );
}

// ── Sports Panel ──────────────────────────────────────────────────────────────
function SportsPanel({ locationId }: { locationId: number }) {
  const { data: games = [], refetch } = useGetGames({ locationId });
  const createGame = useCreateGame();
  const deleteGame = useDeleteGame();
  const voteGame = useVoteForGame();
  const [voteState, setVoteState] = useState<{ gameId: number; name: string } | null>(null);

  const gForm = useForm({ resolver: zodResolver(gameSchema), defaultValues: {
    sport: "football" as const, scheduledAt: new Date().toISOString().slice(0, 16),
    description: "", maxPlayers: 10
  }});

  const submitGame = (d: any) => {
    createGame.mutate({ locationId, data: { ...d, scheduledAt: new Date(d.scheduledAt).toISOString() } }, {
      onSuccess: () => { gForm.reset(); refetch(); }
    });
  };

  const submitVote = (gameId: number) => {
    if (!voteState?.name.trim()) return;
    voteGame.mutate({ gameId, data: { playerName: voteState.name } }, {
      onSuccess: () => { setVoteState(null); refetch(); }
    });
  };

  return (
    <div className="space-y-4">
      {games.map(g => (
        <div key={g.id} className="border border-secondary/40 p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono text-secondary font-bold">{SPORT_LABELS[g.sport] || g.sport}</span>
            <button onClick={() => deleteGame.mutate({ gameId: g.id }, { onSuccess: refetch })}>
              <Trash2 className="w-3 h-3 text-destructive" />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground font-mono">{new Date(g.scheduledAt).toLocaleString()}</p>
          {g.description && <p className="text-xs text-foreground">{g.description}</p>}
          <div className="flex items-center gap-2">
            <Users className="w-3 h-3 text-secondary" />
            <span className="text-xs font-mono text-secondary">{(g.votes as any[]).length} / {g.maxPlayers ?? "∞"} players</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {(g.votes as any[]).map((v: any, i: number) => (
              <span key={i} className="text-[10px] font-mono bg-secondary/10 border border-secondary/30 text-secondary px-2 py-0.5">{v.playerName}</span>
            ))}
          </div>
          {voteState?.gameId === g.id ? (
            <div className="flex gap-2 mt-2">
              <input value={voteState.name} onChange={e => setVoteState({ ...voteState, name: e.target.value })}
                placeholder="Your name" className="flex-1 bg-background/50 border border-secondary/40 text-foreground text-xs p-2 font-mono" />
              <button onClick={() => submitVote(g.id)} className="text-[10px] font-mono px-2 py-1 bg-secondary text-secondary-foreground uppercase">Join</button>
              <button onClick={() => setVoteState(null)} className="text-[10px] font-mono text-muted-foreground">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setVoteState({ gameId: g.id, name: "" })} className="text-[10px] font-mono text-secondary border border-secondary/40 px-2 py-1 uppercase hover:bg-secondary/10">+ Vote to Join</button>
          )}
        </div>
      ))}
      {games.length === 0 && <p className="text-xs text-muted-foreground font-mono">NO ACTIVE GAMES</p>}

      <form onSubmit={gForm.handleSubmit(submitGame)} className="border border-secondary/30 p-3 space-y-2 bg-card/30">
        <p className="text-[9px] text-secondary font-mono uppercase tracking-widest">+ New Game Session</p>
        <div className="grid grid-cols-2 gap-2">
          <select {...gForm.register("sport")} className="bg-background/50 border border-secondary/40 text-foreground text-xs p-2 font-mono">
            {["football","basketball","volleyball","tennis","other"].map(s => <option key={s} value={s}>{SPORT_LABELS[s]}</option>)}
          </select>
          <input {...gForm.register("maxPlayers")} type="number" min={2} max={100} placeholder="Max players" className="bg-background/50 border border-secondary/40 text-foreground text-xs p-2 font-mono" />
        </div>
        <input {...gForm.register("scheduledAt")} type="datetime-local" className="w-full bg-background/50 border border-secondary/40 text-foreground text-xs p-2 font-mono" />
        <input {...gForm.register("description")} placeholder="Description (optional)" className="w-full bg-background/50 border border-secondary/40 text-foreground text-xs p-2 font-mono" />
        <button type="submit" className="w-full py-2 bg-secondary text-secondary-foreground text-xs font-mono uppercase border border-secondary hover:bg-secondary/80">CREATE GAME</button>
      </form>
    </div>
  );
}

// ── Main Locations Page ──────────────────────────────────────────────────────
type Panel = "list" | "add" | "detail";

export default function LocationsPage() {
  const [, setRoute] = useLocation();
  const { data: campus, isLoading: campusLoading } = useGetCampus({ query: { retry: false } });
  const { data: locations = [], isLoading: locsLoading, refetch } = useGetLocations();

  const createLoc = useCreateLocation();
  const deleteLoc = useDeleteLocation();

  const [panel, setPanel] = useState<Panel>("list");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [draftPoints, setDraftPoints] = useState<[number, number][]>([]);
  const [detectedPlace, setDetectedPlace] = useState("");
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom: number } | null>(null);

  const lForm = useForm<LocationForm>({
    resolver: zodResolver(locationSchema),
    defaultValues: { name: "", description: "", type: "building" as LocationType, color: "#4f9cf9", adminName: "" },
  });
  const watchedType = lForm.watch("type");
  const watchedColor = lForm.watch("color");

  useEffect(() => {
    if (!campusLoading && !campus) setRoute("/setup");
  }, [campusLoading, campus, setRoute]);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
      const d = await r.json();
      if (d?.display_name) {
        const name = d.display_name.split(",")[0].trim();
        setDetectedPlace(name);
        if (!lForm.getValues("name")) lForm.setValue("name", name);
      }
    } catch {}
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (!drawing) return;
    setDraftPoints(p => [...p, [lat, lng]]);
    if (draftPoints.length === 0) reverseGeocode(lat, lng);
  };

  const startAdd = () => {
    setPanel("add");
    setSelectedId(null);
    setDrawing(true);
    setDraftPoints([]);
    setDetectedPlace("");
    lForm.reset({ name: "", description: "", type: "building" as LocationType, color: "#4f9cf9", adminName: "" });
  };

  const cancelAdd = () => { setPanel("list"); setDrawing(false); setDraftPoints([]); };

  const submitLocation = (data: LocationForm) => {
    if (draftPoints.length === 0) return;
    const center = draftPoints[0];
    createLoc.mutate({
      data: {
        ...data,
        lat: center[0], lng: center[1],
        polygon: draftPoints.map(p => ({ lat: p[0], lng: p[1] })),
      }
    }, {
      onSuccess: () => { cancelAdd(); refetch(); }
    });
  };

  const openDetail = (id: number) => {
    const loc = locations.find(l => l.id === id);
    if (!loc) return;
    setSelectedId(id);
    setPanel("detail");
    setFlyTo({ lat: loc.lat, lng: loc.lng, zoom: 18 });
  };

  if (campusLoading || locsLoading) return (
    <div className="flex-1 flex items-center justify-center font-mono text-primary text-xl tracking-widest animate-pulse">LOADING TACTICAL DATA...</div>
  );
  if (!campus) return null;

  const selectedLoc = locations.find(l => l.id === selectedId);

  return (
    <div className="flex-1 flex h-full overflow-hidden gap-4">

      {/* ── Left Panel ── */}
      <div className="w-80 flex-shrink-0 flex flex-col gap-3 overflow-y-auto">

        {/* Header */}
        <div className="game-hud-border p-4 flex items-center justify-between">
          {panel === "detail" && selectedLoc ? (
            <div className="flex items-center gap-2">
              <button onClick={() => setPanel("list")} className="text-primary/60 hover:text-primary"><ChevronRight className="w-4 h-4 rotate-180" /></button>
              <div>
                <p className="text-xs font-mono text-primary/60 uppercase">{TYPE_CONFIG[selectedLoc.type]?.emoji} {TYPE_CONFIG[selectedLoc.type]?.label}</p>
                <h2 className="text-sm font-display font-bold text-primary">{selectedLoc.name}</h2>
              </div>
            </div>
          ) : panel === "add" ? (
            <div>
              <p className="text-[10px] font-mono text-primary/60 uppercase">New Location</p>
              <h2 className="text-sm font-display font-bold text-primary">Draw on Map</h2>
            </div>
          ) : (
            <div>
              <p className="text-[10px] font-mono text-primary/60 uppercase">Tactical Map</p>
              <h2 className="text-sm font-display font-bold text-primary">{locations.length} Locations</h2>
            </div>
          )}
          {panel === "list" && (
            <button onClick={startAdd} className="flex items-center gap-1 px-3 py-2 bg-primary text-primary-foreground text-[10px] font-mono uppercase border border-primary hover:bg-primary/80 transition-colors">
              <Plus className="w-3 h-3" /> ADD
            </button>
          )}
          {(panel === "add" || panel === "detail") && (
            <button onClick={cancelAdd} className="text-muted-foreground hover:text-primary">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* List panel */}
        {panel === "list" && (
          <div className="space-y-2">
            <AnimatePresence>
              {locations.length === 0 ? (
                <div className="game-hud-border p-6 text-center">
                  <MapPin className="w-8 h-8 text-primary/20 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground font-mono">NO LOCATIONS DEFINED</p>
                  <p className="text-[10px] text-muted-foreground font-mono mt-1">Click ADD to mark locations on the map</p>
                </div>
              ) : locations.map(loc => {
                const cfg = TYPE_CONFIG[loc.type] || TYPE_CONFIG.other;
                return (
                  <motion.div key={loc.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                    className="game-hud-border p-3 cursor-pointer hover:bg-primary/5 transition-colors group"
                    onClick={() => openDetail(loc.id)}
                    style={{ borderColor: cfg.color + "60" }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 flex items-center justify-center border flex-shrink-0" style={{ borderColor: cfg.color, color: cfg.color, background: cfg.color + "15" }}>
                          <span className="text-sm">{cfg.emoji}</span>
                        </div>
                        <div>
                          <h3 className="text-xs font-display font-bold" style={{ color: cfg.color }}>{loc.name}</h3>
                          <p className="text-[10px] text-muted-foreground font-mono uppercase">{cfg.label}</p>
                          {loc.adminName && <p className="text-[10px] text-muted-foreground font-mono">👤 {loc.adminName}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={e => { e.stopPropagation(); deleteLoc.mutate({ locationId: loc.id }, { onSuccess: refetch }); }}
                          className="text-destructive hover:scale-110 transition-transform p-1">
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <ChevronRight className="w-3 h-3 text-primary" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Add panel */}
        {panel === "add" && (
          <form onSubmit={lForm.handleSubmit(submitLocation)} className="space-y-3">
            <div className="game-hud-border p-3 bg-primary/5">
              <div className="flex items-start gap-2 text-xs font-mono text-primary">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 animate-pulse" />
                <div>
                  <p className="font-bold">DRAW MODE ACTIVE</p>
                  <p className="text-primary/70 mt-1">Click on the map to place points. First click auto-detects location name via OSM.</p>
                  {draftPoints.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-primary">{draftPoints.length} points</span>
                      <button type="button" onClick={() => setDraftPoints(p => p.slice(0, -1))} className="flex items-center gap-1 text-[10px] text-destructive hover:underline">
                        <Undo2 className="w-3 h-3" /> Undo
                      </button>
                    </div>
                  )}
                  {detectedPlace && <p className="mt-1 text-secondary text-[10px]">Detected: {detectedPlace}</p>}
                </div>
              </div>
            </div>

            <div className="game-hud-border p-4 space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-primary/60 uppercase">Type</label>
                <select {...lForm.register("type")}
                  onChange={e => {
                    lForm.setValue("type", e.target.value as LocationType);
                    lForm.setValue("color", TYPE_CONFIG[e.target.value]?.color || "#6b7280");
                  }}
                  className="w-full bg-background/50 border border-primary/40 text-foreground text-xs p-2 font-mono">
                  {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.emoji} {v.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-primary/60 uppercase">Name</label>
                <input {...lForm.register("name")} placeholder="Location name" className="w-full bg-background/50 border border-primary/40 text-foreground text-xs p-2 font-mono" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-primary/60 uppercase">Admin (optional)</label>
                <input {...lForm.register("adminName")} placeholder="Manager name" className="w-full bg-background/50 border border-primary/40 text-foreground text-xs p-2 font-mono" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-primary/60 uppercase">Color</label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={watchedColor} onChange={e => lForm.setValue("color", e.target.value)} className="w-10 h-8 bg-transparent border border-primary/40 cursor-pointer p-0.5" />
                  <input {...lForm.register("color")} className="flex-1 bg-background/50 border border-primary/40 text-foreground text-xs p-2 font-mono" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-primary/60 uppercase">Description</label>
                <textarea {...lForm.register("description")} rows={2} placeholder="Brief description..." className="w-full bg-background/50 border border-primary/40 text-foreground text-xs p-2 font-mono resize-none" />
              </div>

              <button type="submit"
                disabled={draftPoints.length === 0 || createLoc.isPending}
                className="w-full py-2.5 bg-primary text-primary-foreground text-xs font-mono uppercase border border-primary hover:bg-primary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <Save className="w-3 h-3 inline mr-2" />
                {createLoc.isPending ? "SAVING..." : `SAVE (${draftPoints.length} pts)`}
              </button>
            </div>
          </form>
        )}

        {/* Detail panel */}
        {panel === "detail" && selectedLoc && (
          <div className="space-y-3">
            {selectedLoc.description && (
              <div className="game-hud-border p-3">
                <p className="text-xs text-muted-foreground">{selectedLoc.description}</p>
              </div>
            )}
            {selectedLoc.adminName && (
              <div className="game-hud-border p-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-xs font-mono text-primary">Admin: {selectedLoc.adminName}</span>
              </div>
            )}

            <div className="game-hud-border p-3" style={{ borderColor: TYPE_CONFIG[selectedLoc.type]?.color + "60" }}>
              {selectedLoc.type === "building" && <BuildingPanel locationId={selectedLoc.id} />}
              {selectedLoc.type === "dining_hall" && <DiningPanel locationId={selectedLoc.id} />}
              {selectedLoc.type === "sports_field" && <SportsPanel locationId={selectedLoc.id} />}
              {!["building","dining_hall","sports_field"].includes(selectedLoc.type) && (
                <p className="text-xs text-muted-foreground font-mono">No special management for this location type.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Map ── */}
      <div className="flex-1 game-hud-border relative overflow-hidden">
        {/* Drawing indicator */}
        {drawing && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2 bg-background/90 border border-primary text-xs font-mono text-primary uppercase shadow-[0_0_15px_rgba(0,255,204,0.3)] pointer-events-none">
            {draftPoints.length === 0 ? "CLICK TO MARK LOCATION" : `${draftPoints.length} POINTS MARKED`}
          </div>
        )}

        {/* HUD corner overlays */}
        <div className="absolute top-2 left-2 z-20 pointer-events-none">
          <div className="w-6 h-6 border-l-2 border-t-2 border-primary" />
        </div>
        <div className="absolute top-2 right-2 z-20 pointer-events-none">
          <div className="w-6 h-6 border-r-2 border-t-2 border-primary" />
        </div>
        <div className="absolute bottom-2 left-2 z-20 pointer-events-none">
          <div className="w-6 h-6 border-l-2 border-b-2 border-primary" />
        </div>
        <div className="absolute bottom-2 right-2 z-20 pointer-events-none">
          <div className="w-6 h-6 border-r-2 border-b-2 border-primary" />
        </div>

        <MapContainer center={[campus.lat, campus.lng]} zoom={campus.defaultZoom} style={{ width: "100%", height: "100%" }}>
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.basemaps.cartocdn.com/dark_matter/{z}/{x}/{y}{r}.png"
          />
          <MapClickHandler drawing={drawing} onPoint={handleMapClick} />
          {flyTo && <MapFly lat={flyTo.lat} lng={flyTo.lng} zoom={flyTo.zoom} />}

          {/* Existing locations */}
          {locations.map(loc => {
            const cfg = TYPE_CONFIG[loc.type] || TYPE_CONFIG.other;
            const isSelected = loc.id === selectedId;
            if (loc.polygon.length >= 2) {
              return (
                <Polygon key={loc.id}
                  positions={(loc.polygon as any[]).map((p: any) => [p.lat, p.lng])}
                  pathOptions={{ color: cfg.color, fillColor: cfg.color, fillOpacity: isSelected ? 0.4 : 0.2, weight: isSelected ? 3 : 2 }}
                  eventHandlers={{ click: () => openDetail(loc.id) }}
                />
              );
            }
            return (
              <Marker key={loc.id} position={[loc.lat, loc.lng]}
                eventHandlers={{ click: () => openDetail(loc.id) }}
              />
            );
          })}

          {/* Draft points while drawing */}
          {drawing && draftPoints.length >= 2 && (
            draftPoints.length >= 3 ? (
              <Polygon positions={draftPoints} pathOptions={{ color: watchedColor, fillColor: watchedColor, fillOpacity: 0.3, weight: 2, dashArray: "6 6" }} />
            ) : (
              <Polyline positions={draftPoints} pathOptions={{ color: watchedColor, weight: 2, dashArray: "6 6" }} />
            )
          )}
          {drawing && draftPoints.map((p, i) => (
            <Marker key={i} position={p} />
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
