import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { MapContainer, Polygon, Polyline, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, X, Save, Building2, UtensilsCrossed, Trophy, Car, Trees,
  MapPin, Star, Calendar, Users, Bell, Clock, Undo2, ChevronLeft,
  Megaphone, Loader2, AlertTriangle, ChevronRight, Search, Edit2, UserCheck,
  Layers, PlusCircle, MessageSquarePlus,
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
import { adminFetch } from "@/lib/api";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const TYPES: Record<string, { label: string; color: string; Icon: any; emoji: string }> = {
  building:     { label: "Building",     color: "#60a5fa", Icon: Building2,       emoji: "🏛️" },
  dining_hall:  { label: "Dining Hall",  color: "#fb923c", Icon: UtensilsCrossed, emoji: "🍽️" },
  sports_field: { label: "Sports Field", color: "#4ade80", Icon: Trophy,           emoji: "⚽" },
  parking:      { label: "Parking",      color: "#c084fc", Icon: Car,             emoji: "🚗" },
  green:        { label: "Green Area",   color: "#a3e635", Icon: Trees,           emoji: "🌿" },
  other:        { label: "Other",        color: "#94a3b8", Icon: MapPin,          emoji: "📍" },
};

const DAYS = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
const DAY_LABELS: Record<string, string> = { sunday:"Sun",monday:"Mon",tuesday:"Tue",wednesday:"Wed",thursday:"Thu",friday:"Fri",saturday:"Sat" };
const SPORT_LABELS: Record<string, string> = { football:"⚽ Football",basketball:"🏀 Basketball",volleyball:"🏐 Volleyball",tennis:"🎾 Tennis",other:"🏆 Other" };
const CATEGORY_EMOJI: Record<string, string> = { starter:"🥗",main:"🍖",side:"🍟",dessert:"🍰",drink:"🥤" };
const PRIORITY_STYLE: Record<string, string> = {
  normal:    "border-primary/50 text-primary",
  important: "border-accent/50 text-accent",
  urgent:    "border-destructive/50 text-destructive",
};

const MAP_STYLES = [
  { key: "satellite", label: "Satellite", emoji: "🛰️",
    tiles: [
      { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attr: "&copy; Esri" },
      { url: "https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png", attr: "" },
    ] },
  { key: "street", label: "Street", emoji: "🗺️",
    tiles: [
      { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attr: "&copy; OSM" },
    ] },
  { key: "terrain", label: "Terrain", emoji: "⛰️",
    tiles: [
      { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", attr: "&copy; Esri" },
    ] },
  { key: "dark", label: "Dark", emoji: "🌙",
    tiles: [
      { url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", attr: "&copy; CartoDB" },
    ] },
] as const;

function MapStyleSwitcher({ style, onChange }: { style: string; onChange: (s: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute bottom-3 right-3 z-[500]">
      {open && (
        <div className="mb-2 bg-card/95 backdrop-blur-sm border border-border rounded-xl shadow-xl overflow-hidden">
          {MAP_STYLES.map(s => (
            <button key={s.key} onClick={() => { onChange(s.key); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium transition-colors border-b border-border last:border-0 ${
                style === s.key ? "bg-primary/15 text-primary" : "text-foreground hover:bg-secondary"}`}>
              <span className="text-base">{s.emoji}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      )}
      <button onClick={() => setOpen(!open)}
        className="w-10 h-10 rounded-xl bg-card/95 backdrop-blur-sm border border-border shadow-xl flex items-center justify-center text-foreground hover:bg-secondary transition-colors ml-auto">
        <Layers className="w-4.5 h-4.5" />
      </button>
    </div>
  );
}

function DynamicTiles({ styleKey }: { styleKey: string }) {
  const map = useMap();
  const layersRef = useRef<L.TileLayer[]>([]);

  useEffect(() => {
    layersRef.current.forEach(l => map.removeLayer(l));
    layersRef.current = [];

    const style = MAP_STYLES.find(s => s.key === styleKey) || MAP_STYLES[0];
    style.tiles.forEach(t => {
      const layer = L.tileLayer(t.url, { attribution: t.attr, maxZoom: 20 });
      layer.addTo(map);
      layersRef.current.push(layer);
    });

    return () => {
      layersRef.current.forEach(l => map.removeLayer(l));
    };
  }, [styleKey, map]);

  return null;
}

function fmtDate(d: string) { return new Date(d).toLocaleDateString("en-IL", { day:"numeric",month:"short" }); }
function fmtTime(d: string) { return new Date(d).toLocaleTimeString("en-IL", { hour:"2-digit",minute:"2-digit" }); }

function StarRating({ value, max=5, onRate }: { value:number; max?:number; onRate?:(n:number)=>void }) {
  const [hover,setHover]=useState(0);
  return (
    <div className="flex gap-1">
      {Array.from({length:max}).map((_,i)=>(
        <Star key={i} className={`w-4 h-4 cursor-pointer ${(hover||value)>i?"text-accent fill-accent":"text-muted-foreground"}`}
          onClick={()=>onRate?.(i+1)} onMouseEnter={()=>onRate&&setHover(i+1)} onMouseLeave={()=>onRate&&setHover(0)} />
      ))}
    </div>
  );
}

// ── Map Search Component ────────────────────────────────────────────────────
function MapSearchBar({ onSelect }: { onSelect: (lat: number, lng: number, name: string) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<any>(null);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=il`);
      const data = await r.json();
      setResults(data);
      setOpen(data.length > 0);
    } catch { setResults([]); }
    setLoading(false);
  }, []);

  const handleChange = (val: string) => {
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 400);
  };

  return (
    <div className="absolute top-3 left-3 right-3 z-[500]">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input value={query} onChange={e => handleChange(e.target.value)} placeholder="Search location..."
          className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-card/95 backdrop-blur-sm border border-border text-sm text-foreground focus:outline-none focus:border-primary shadow-lg" />
        {query && <button onClick={() => { setQuery(""); setResults([]); setOpen(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>}
        {loading && <Loader2 className="absolute right-8 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground animate-spin" />}
      </div>
      {open && results.length > 0 && (
        <div className="mt-1 bg-card/95 backdrop-blur-sm border border-border rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
          {results.map((r, i) => (
            <button key={i} onClick={() => { onSelect(parseFloat(r.lat), parseFloat(r.lon), r.display_name.split(",")[0]); setQuery(r.display_name.split(",")[0]); setOpen(false); }}
              className="w-full text-left px-3 py-2.5 text-xs text-foreground hover:bg-primary/10 border-b border-border last:border-0 transition-colors">
              <span className="font-medium">{r.display_name.split(",")[0]}</span>
              <span className="text-muted-foreground ml-1">{r.display_name.split(",").slice(1, 3).join(",")}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── User Picker Component ───────────────────────────────────────────────────
type AdminUser = { id: number; phone: string; displayName: string; avatarUrl?: string };

function UserPicker({ value, onChange, users }: { value: number | null; onChange: (id: number | null) => void; users: AdminUser[] }) {
  const [open, setOpen] = useState(false);
  const selected = users.find(u => u.id === value);

  return (
    <div className="relative">
      <label className="text-xs text-muted-foreground mb-1 block">Location Manager</label>
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-card border border-border text-sm text-left transition-colors hover:border-primary/40">
        <UserCheck className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        {selected ? (
          <span className="text-foreground flex-1 truncate">{selected.displayName || selected.phone}</span>
        ) : (
          <span className="text-muted-foreground flex-1">Select a manager (optional)</span>
        )}
        {value && (
          <button type="button" onClick={e => { e.stopPropagation(); onChange(null); setOpen(false); }} className="p-0.5 text-muted-foreground hover:text-destructive">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg max-h-40 overflow-y-auto z-50">
          {users.length === 0 && <p className="text-xs text-muted-foreground px-3 py-3 text-center">No registered users</p>}
          {users.map(u => (
            <button key={u.id} type="button" onClick={() => { onChange(u.id); setOpen(false); }}
              className={`w-full text-left px-3 py-2.5 text-xs border-b border-border last:border-0 transition-colors hover:bg-primary/10 flex items-center gap-2 ${u.id === value ? "bg-primary/10 text-primary" : "text-foreground"}`}>
              <span className="font-medium">{u.displayName || "No name"}</span>
              <span className="text-muted-foreground">{u.phone}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Building Panel ─────────────────────────────────────────────────────────────
const annSchema = z.object({ title:z.string().min(1), content:z.string().min(1), priority:z.enum(["normal","important","urgent"]) });
const schSchema = z.object({ dayOfWeek:z.enum(["sunday","monday","tuesday","wednesday","thursday","friday","saturday"]), startTime:z.string(), endTime:z.string(), label:z.string().min(1), instructor:z.string().optional() });

function BuildingPanel({ locationId }: { locationId:number }) {
  const [tab,setTab]=useState<"announcements"|"schedule">("announcements");
  const {data:anns=[],refetch:reA}=useGetAnnouncements({locationId});
  const {data:scheds=[],refetch:reS}=useGetSchedules({locationId});
  const createAnn=useCreateAnnouncement(); const deleteAnn=useDeleteAnnouncement();
  const createSch=useCreateScheduleEntry(); const deleteSch=useDeleteScheduleEntry();
  const aForm=useForm({resolver:zodResolver(annSchema),defaultValues:{title:"",content:"",priority:"normal" as const}});
  const sForm=useForm({resolver:zodResolver(schSchema),defaultValues:{dayOfWeek:"monday" as const,startTime:"08:00",endTime:"10:00",label:"",instructor:""}});

  return (
    <div>
      <div className="flex gap-1 mb-4">
        {(["announcements","schedule"] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${tab===t?"bg-primary text-primary-foreground":"bg-secondary text-muted-foreground hover:text-foreground"}`}>
            {t==="announcements"?"📢 Announcements":"📅 Schedule"}
          </button>
        ))}
      </div>

      {tab==="announcements"&&(
        <div className="space-y-3">
          {anns.map(a=>(
            <div key={a.id} className={`border rounded-xl p-3 ${PRIORITY_STYLE[a.priority]||"border-border"}`}>
              <div className="flex justify-between items-start gap-2">
                <div><p className="text-sm font-semibold text-foreground">{a.title}</p><p className="text-xs text-muted-foreground mt-1">{a.content}</p></div>
                <button onClick={()=>deleteAnn.mutate({announcementId:a.id},{onSuccess:reA})} className="p-1 text-muted-foreground hover:text-destructive flex-shrink-0"><X className="w-3.5 h-3.5"/></button>
              </div>
              <span className={`inline-block text-[10px] uppercase font-semibold mt-2 px-2 py-0.5 rounded-full border ${PRIORITY_STYLE[a.priority]||"border-border"}`}>{a.priority}</span>
            </div>
          ))}
          {anns.length===0&&<p className="text-xs text-muted-foreground text-center py-4">No announcements yet</p>}
          <form onSubmit={aForm.handleSubmit(d=>createAnn.mutate({locationId,data:d},{onSuccess:()=>{aForm.reset();reA();}}))}>
            <div className="bg-card border border-border rounded-xl p-3 space-y-2.5">
              <p className="text-xs font-semibold text-foreground">New Announcement</p>
              <input {...aForm.register("title")} placeholder="Title" className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary"/>
              <textarea {...aForm.register("content")} placeholder="Content" rows={2} className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary resize-none"/>
              <div className="flex gap-2">
                <select {...aForm.register("priority")} className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none">
                  <option value="normal">Normal</option><option value="important">Important</option><option value="urgent">Urgent</option>
                </select>
                <button type="submit" disabled={createAnn.isPending} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40">Post</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {tab==="schedule"&&(
        <div className="space-y-3">
          {DAYS.map(day=>{
            const entries=scheds.filter(s=>s.dayOfWeek===day);
            if(!entries.length) return null;
            return (
              <div key={day} className="bg-card border border-border rounded-xl p-3">
                <p className="text-xs font-bold text-primary mb-2 uppercase">{day}</p>
                {entries.map(e=>(
                  <div key={e.id} className="flex items-center justify-between py-1.5 border-t border-border first:border-0">
                    <div><p className="text-xs font-medium text-foreground">{e.startTime}–{e.endTime} · {e.label}</p>{e.instructor&&<p className="text-[10px] text-muted-foreground">{e.instructor}</p>}</div>
                    <button onClick={()=>deleteSch.mutate({scheduleId:e.id},{onSuccess:reS})}><X className="w-3 h-3 text-muted-foreground hover:text-destructive"/></button>
                  </div>
                ))}
              </div>
            );
          })}
          {scheds.length===0&&<p className="text-xs text-muted-foreground text-center py-4">No schedule entries</p>}
          <form onSubmit={sForm.handleSubmit(d=>createSch.mutate({locationId,data:d},{onSuccess:()=>{sForm.reset();reS();}}))}>
            <div className="bg-card border border-border rounded-xl p-3 space-y-2.5">
              <p className="text-xs font-semibold text-foreground">Add Entry</p>
              <div className="grid grid-cols-2 gap-2">
                <select {...sForm.register("dayOfWeek")} className="px-3 py-2 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none">
                  {DAYS.map(d=><option key={d} value={d}>{DAY_LABELS[d]}</option>)}
                </select>
                <input {...sForm.register("label")} placeholder="Course / Event" className="px-3 py-2 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:border-primary"/>
                <input {...sForm.register("startTime")} type="time" className="px-3 py-2 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none"/>
                <input {...sForm.register("endTime")} type="time" className="px-3 py-2 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none"/>
              </div>
              <input {...sForm.register("instructor")} placeholder="Instructor (optional)" className="w-full px-3 py-2 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:border-primary"/>
              <button type="submit" disabled={createSch.isPending} className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40">Add</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ── Dining Panel ───────────────────────────────────────────────────────────────
function DiningPanel({ locationId }: { locationId:number }) {
  const {data:menus=[],refetch}=useGetMenus({locationId});
  const createMenu=useCreateMenu(); const rateMenu=useRateMenu();
  const [ratingState,setRatingState]=useState<{menuId:number;val:number}|null>(null);
  const today=new Date().toISOString().split("T")[0];
  const [items,setItems]=useState([{name:"",category:"main"}]);
  const [date,setDate]=useState(today);

  const submitMenu=()=>{
    const valid=items.filter(i=>i.name.trim());
    if(!valid.length) return;
    createMenu.mutate({locationId,data:{date,items:valid as any}},{onSuccess:()=>{setItems([{name:"",category:"main"}]);refetch();}});
  };

  return (
    <div className="space-y-3">
      {menus.map(menu=>(
        <div key={menu.id} className="bg-card border border-border rounded-xl p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-accent">{fmtDate(menu.date)}</span>
            <div className="flex items-center gap-1.5"><StarRating value={menu.averageRating}/><span className="text-[10px] text-muted-foreground">({menu.ratingCount})</span></div>
          </div>
          {(menu.items as any[]).map((it:any,i:number)=>(
            <div key={i} className="flex items-center gap-2 py-1 text-sm text-foreground">
              <span>{CATEGORY_EMOJI[it.category]||"•"}</span><span>{it.name}</span><span className="text-xs text-muted-foreground">{it.category}</span>
            </div>
          ))}
          {ratingState?.menuId===menu.id?(
            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border">
              <StarRating value={ratingState.val} onRate={v=>setRatingState({menuId:menu.id,val:v})}/>
              <button onClick={()=>{rateMenu.mutate({menuId:menu.id,data:{rating:ratingState.val}},{onSuccess:()=>{setRatingState(null);refetch();}});}} className="px-3 py-1 rounded-lg bg-accent text-accent-foreground text-xs font-medium">Submit</button>
              <button onClick={()=>setRatingState(null)} className="text-xs text-muted-foreground">Cancel</button>
            </div>
          ):(
            <button onClick={()=>setRatingState({menuId:menu.id,val:0})} className="mt-2 text-xs text-accent border border-accent/30 rounded-lg px-3 py-1 hover:bg-accent/10 transition-colors">Rate This Menu</button>
          )}
        </div>
      ))}
      {menus.length===0&&<p className="text-xs text-muted-foreground text-center py-4">No menus uploaded</p>}
      <div className="bg-card border border-border rounded-xl p-3 space-y-2.5">
        <p className="text-xs font-semibold text-foreground">Add Today's Menu</p>
        <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none"/>
        {items.map((it,i)=>(
          <div key={i} className="flex gap-2">
            <input value={it.name} onChange={e=>setItems(p=>p.map((x,j)=>j===i?{...x,name:e.target.value}:x))} placeholder="Item name" className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:border-primary"/>
            <select value={it.category} onChange={e=>setItems(p=>p.map((x,j)=>j===i?{...x,category:e.target.value}:x))} className="px-2 py-2 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none">
              {["starter","main","side","dessert","drink"].map(c=><option key={c} value={c}>{CATEGORY_EMOJI[c]} {c}</option>)}
            </select>
            {items.length>1&&<button onClick={()=>setItems(p=>p.filter((_,j)=>j!==i))} className="p-2 text-muted-foreground hover:text-destructive"><X className="w-3 h-3"/></button>}
          </div>
        ))}
        <div className="flex gap-2">
          <button onClick={()=>setItems(p=>[...p,{name:"",category:"main"}])} className="text-xs text-accent border border-accent/30 rounded-lg px-3 py-2 hover:bg-accent/10">+ Item</button>
          <button onClick={submitMenu} disabled={createMenu.isPending} className="flex-1 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium disabled:opacity-40">Upload Menu</button>
        </div>
      </div>
    </div>
  );
}

// ── Sports Panel ───────────────────────────────────────────────────────────────
const gameSchema = z.object({ sport:z.enum(["football","basketball","volleyball","tennis","other"]), scheduledAt:z.string(), description:z.string().optional(), maxPlayers:z.coerce.number().min(2).max(100) });

function SportsPanel({ locationId }: { locationId:number }) {
  const {data:games=[],refetch}=useGetGames({locationId});
  const createGame=useCreateGame(); const deleteGame=useDeleteGame(); const voteGame=useVoteForGame();
  const [voteState,setVoteState]=useState<{gameId:number;name:string}|null>(null);
  const gForm=useForm({resolver:zodResolver(gameSchema),defaultValues:{sport:"football" as const,scheduledAt:new Date().toISOString().slice(0,16),description:"",maxPlayers:10}});

  const submitGame=(d:any)=>createGame.mutate({locationId,data:{...d,scheduledAt:new Date(d.scheduledAt).toISOString()}},{onSuccess:()=>{gForm.reset();refetch();}});
  const submitVote=(gameId:number)=>{
    if(!voteState?.name.trim()) return;
    voteGame.mutate({gameId,data:{playerName:voteState.name}},{onSuccess:()=>{setVoteState(null);refetch();}});
  };

  return (
    <div className="space-y-3">
      {games.map(g=>(
        <div key={g.id} className="bg-card border border-border rounded-xl p-3">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm font-bold text-foreground">{SPORT_LABELS[g.sport]||g.sport}</p>
              <p className="text-xs text-muted-foreground">{fmtDate(g.scheduledAt)} at {fmtTime(g.scheduledAt)}</p>
              {g.description&&<p className="text-xs text-foreground mt-1">{g.description}</p>}
            </div>
            <button onClick={()=>deleteGame.mutate({gameId:g.id},{onSuccess:refetch})} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4"/></button>
          </div>
          <div className="flex items-center gap-1.5 mb-2">
            <Users className="w-3.5 h-3.5 text-muted-foreground"/>
            <span className="text-xs text-muted-foreground">{(g.votes as any[]).length} / {g.maxPlayers} players</span>
          </div>
          <div className="flex flex-wrap gap-1 mb-2">
            {(g.votes as any[]).map((v:any,i:number)=>(
              <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-md">{v.playerName}</span>
            ))}
          </div>
          {voteState?.gameId===g.id?(
            <div className="flex gap-2 pt-2 border-t border-border">
              <input value={voteState.name} onChange={e=>setVoteState({...voteState,name:e.target.value})} placeholder="Your name" className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:border-primary"/>
              <button onClick={()=>submitVote(g.id)} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium">Join</button>
              <button onClick={()=>setVoteState(null)} className="px-2 py-2 text-xs text-muted-foreground">✕</button>
            </div>
          ):(
            <button onClick={()=>setVoteState({gameId:g.id,name:""})} className="text-xs text-primary border border-primary/30 rounded-lg px-3 py-1.5 hover:bg-primary/10 transition-colors">+ Vote to Join</button>
          )}
        </div>
      ))}
      {games.length===0&&<p className="text-xs text-muted-foreground text-center py-4">No active games</p>}
      <form onSubmit={gForm.handleSubmit(submitGame)}>
        <div className="bg-card border border-border rounded-xl p-3 space-y-2.5">
          <p className="text-xs font-semibold text-foreground">Create Game Session</p>
          <div className="grid grid-cols-2 gap-2">
            <select {...gForm.register("sport")} className="px-3 py-2 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none">
              {Object.entries(SPORT_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
            </select>
            <input {...gForm.register("maxPlayers")} type="number" min={2} max={100} placeholder="Max players" className="px-3 py-2 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:border-primary"/>
          </div>
          <input {...gForm.register("scheduledAt")} type="datetime-local" className="w-full px-3 py-2 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none"/>
          <input {...gForm.register("description")} placeholder="Description (optional)" className="w-full px-3 py-2 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:border-primary"/>
          <button type="submit" disabled={createGame.isPending} className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40">Create Game</button>
        </div>
      </form>
    </div>
  );
}

// ── Map helpers ────────────────────────────────────────────────────────────────
function MapClick({ drawing, pinMode, onPoint, onPinClick }: {
  drawing: boolean;
  pinMode: boolean;
  onPoint: (lat: number, lng: number) => void;
  onPinClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({ click: e => {
    if (drawing) onPoint(e.latlng.lat, e.latlng.lng);
    else if (pinMode) onPinClick(e.latlng.lat, e.latlng.lng);
  } });
  return null;
}
function MapFly({ lat, lng, zoom }: { lat:number; lng:number; zoom:number }) {
  const map = useMap();
  useEffect(() => {
    if (isNaN(lat) || isNaN(lng)) return;
    try { map.setView([lat, lng], zoom, { animate: false }); } catch {}
  }, [lat, lng, zoom, map]);
  return null;
}

function makePinIcon(emoji: string, color: string, pulse = false) {
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};border:2px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);width:32px;height:32px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.4);${pulse ? "animation:pulse 1.5s infinite" : ""}"><span style="transform:rotate(45deg);font-size:14px;line-height:1">${emoji}</span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

// ── Location Form Schema ───────────────────────────────────────────────────────
const locSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.nativeEnum(LocationType),
  color: z.string(),
  adminName: z.string().optional(),
});
type LocForm = z.infer<typeof locSchema>;

// ── Floor Data Editor ─────────────────────────────────────────────────────────
type FloorRoom = { name: string; room: string; type: string };
type FloorEntry = { floor: number; label: string; rooms: FloorRoom[]; notes?: string; available?: number; waitTime?: number };
const ROOM_TYPES = ["lecture","lab","office","bathroom","lounge","study","other"];

function FloorDataEditor({ locationId, initialFloors }: { locationId: number; initialFloors: FloorEntry[] }) {
  const [floors, setFloors] = useState<FloorEntry[]>(initialFloors);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeFloor, setActiveFloor] = useState<number | null>(floors[0]?.floor ?? null);
  const [newFloorNum, setNewFloorNum] = useState(0);
  const [newRoom, setNewRoom] = useState<FloorRoom>({ name: "", room: "", type: "lecture" });
  const sortedFloors = [...floors].sort((a, b) => b.floor - a.floor);

  const [saveError, setSaveError] = useState<string | null>(null);

  const saveFloors = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await adminFetch(`/admin/locations/${locationId}/floors`, {
        method: "PATCH",
        body: JSON.stringify({ floorData: floors }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      console.error("[admin floors] save failed", e);
      setSaveError(e?.message || "Floor save failed");
    } finally { setSaving(false); }
  };

  const addFloor = () => {
    if (floors.find(f => f.floor === newFloorNum)) return;
    const newF: FloorEntry = { floor: newFloorNum, label: `Floor ${newFloorNum}`, rooms: [] };
    setFloors([...floors, newF]);
    setActiveFloor(newFloorNum);
    setNewFloorNum(0);
  };

  const removeFloor = (floorNum: number) => {
    setFloors(floors.filter(f => f.floor !== floorNum));
    if (activeFloor === floorNum) setActiveFloor(null);
  };

  const updateFloor = (floorNum: number, updates: Partial<FloorEntry>) => {
    setFloors(floors.map(f => f.floor === floorNum ? { ...f, ...updates } : f));
  };

  const addRoom = (floorNum: number) => {
    if (!newRoom.room || !newRoom.name) return;
    updateFloor(floorNum, { rooms: [...(floors.find(f => f.floor === floorNum)?.rooms || []), { ...newRoom }] });
    setNewRoom({ name: "", room: "", type: "lecture" });
  };

  const removeRoom = (floorNum: number, idx: number) => {
    const floor = floors.find(f => f.floor === floorNum);
    if (!floor) return;
    updateFloor(floorNum, { rooms: floor.rooms.filter((_, i) => i !== idx) });
  };

  const activeFl = floors.find(f => f.floor === activeFloor);

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Floor Navigator</span>
        </div>
        <button onClick={saveFloors} disabled={saving}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            saveError ? "text-red-400 border-red-400/30 bg-red-400/10"
            : saved ? "text-emerald-400 border-emerald-400/30 bg-emerald-400/10"
            : "text-primary border-primary/30 bg-primary/10 hover:bg-primary/20"
          }`}>
          {saving ? <div className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            : saveError ? "⚠ Save failed"
            : saved ? "✅ Saved!"
            : <><Save className="w-3 h-3" /> Save Floors</>}
        </button>
      </div>
      {saveError && (
        <p role="alert" className="text-xs text-red-400 mb-2 -mt-1">{saveError}</p>
      )}

      {/* Floor tabs */}
      <div className="flex gap-1.5 mb-3 flex-wrap items-center">
        {sortedFloors.map(f => (
          <button key={f.floor}
            onClick={() => setActiveFloor(f.floor)}
            className={`px-2 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 ${
              f.floor === activeFloor ? "bg-primary text-primary-foreground border-primary" : "bg-secondary/40 text-muted-foreground border-border"
            }`}
          >
            {f.floor === 0 ? "G" : f.floor > 0 ? `+${f.floor}` : f.floor}
            <X className="w-2.5 h-2.5 opacity-50 hover:opacity-100" onClick={e => { e.stopPropagation(); removeFloor(f.floor); }} />
          </button>
        ))}
        {/* Add floor */}
        <div className="flex gap-1 ml-1">
          <input type="number" value={newFloorNum} onChange={e => setNewFloorNum(Number(e.target.value))}
            className="w-14 px-2 py-1 rounded-lg bg-card border border-border text-xs text-foreground focus:outline-none focus:border-primary text-center" />
          <button onClick={addFloor} className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors">
            <PlusCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {activeFl && (
        <div className="space-y-3 bg-secondary/20 border border-border rounded-xl p-3">
          {/* Label */}
          <input value={activeFl.label} onChange={e => updateFloor(activeFl.floor, { label: e.target.value })}
            placeholder="Floor label" className="w-full px-2.5 py-1.5 rounded-lg bg-card border border-border text-xs text-foreground focus:outline-none focus:border-primary" />
          {/* Notes */}
          <input value={activeFl.notes || ""} onChange={e => updateFloor(activeFl.floor, { notes: e.target.value || undefined })}
            placeholder="Notes (optional)" className="w-full px-2.5 py-1.5 rounded-lg bg-card border border-border text-xs text-foreground focus:outline-none focus:border-primary" />
          {/* Available seats / wait time */}
          <div className="flex gap-2">
            <input type="number" value={activeFl.available ?? ""} onChange={e => updateFloor(activeFl.floor, { available: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="Free seats" className="flex-1 px-2.5 py-1.5 rounded-lg bg-card border border-border text-xs text-foreground focus:outline-none focus:border-primary" />
            <input type="number" value={activeFl.waitTime ?? ""} onChange={e => updateFloor(activeFl.floor, { waitTime: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="Wait (min)" className="flex-1 px-2.5 py-1.5 rounded-lg bg-card border border-border text-xs text-foreground focus:outline-none focus:border-primary" />
          </div>
          {/* Rooms list */}
          {activeFl.rooms.length > 0 && (
            <div className="space-y-1.5">
              {activeFl.rooms.map((r, i) => (
                <div key={i} className="flex items-center gap-2 bg-card border border-border rounded-lg px-2 py-1.5">
                  <span className="text-[10px] font-mono text-primary bg-primary/10 px-1 py-0.5 rounded flex-shrink-0">{r.room}</span>
                  <span className="text-xs text-foreground flex-1 truncate">{r.name}</span>
                  <span className="text-[10px] text-muted-foreground">{r.type}</span>
                  <button onClick={() => removeRoom(activeFl.floor, i)} className="text-muted-foreground hover:text-red-400 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {/* Add room */}
          <div className="flex gap-1.5 flex-wrap">
            <input value={newRoom.room} onChange={e => setNewRoom(v => ({ ...v, room: e.target.value }))}
              placeholder="Room #" className="w-16 px-2 py-1.5 rounded-lg bg-card border border-border text-xs text-foreground focus:outline-none focus:border-primary" />
            <input value={newRoom.name} onChange={e => setNewRoom(v => ({ ...v, name: e.target.value }))}
              placeholder="Room name" className="flex-1 min-w-[100px] px-2 py-1.5 rounded-lg bg-card border border-border text-xs text-foreground focus:outline-none focus:border-primary" />
            <select value={newRoom.type} onChange={e => setNewRoom(v => ({ ...v, type: e.target.value }))}
              className="w-24 px-2 py-1.5 rounded-lg bg-card border border-border text-xs text-foreground focus:outline-none focus:border-primary">
              {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button onClick={() => addRoom(activeFl.floor)} className="px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium flex-shrink-0">
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Locations Page ────────────────────────────────────────────────────────
export default function LocationsPage() {
  const [, nav] = useLocation();
  const { data: campus, isLoading: campusLoading } = useGetCampus({ query: { retry: false } });
  const { data: locs = [], isLoading: locsLoading, refetch } = useGetLocations();
  const createLoc = useCreateLocation();
  const updateLoc = useUpdateLocation();
  const deleteLoc = useDeleteLocation();

  const [mode, setMode] = useState<"list" | "add" | "detail" | "edit">("list");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [pts, setPts] = useState<[number,number][]>([]);
  const [detected, setDetected] = useState("");
  const [flyTarget, setFlyTarget] = useState<{ lat:number; lng:number; zoom:number } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [managerId, setManagerId] = useState<number | null>(null);
  const [editManagerId, setEditManagerId] = useState<number | null>(null);
  const [mapStyle, setMapStyle] = useState("satellite");

  const [pinMode, setPinMode] = useState(false);
  const [pendingPin, setPendingPin] = useState<{ lat: number; lng: number } | null>(null);
  const [pinContent, setPinContent] = useState("");
  const [pinSubmitting, setPinSubmitting] = useState(false);
  const [adminMsgs, setAdminMsgs] = useState<any[]>([]);
  const [deletingMsgId, setDeletingMsgId] = useState<number | null>(null);

  const [users, setUsers] = useState<AdminUser[]>([]);
  useEffect(() => {
    adminFetch<AdminUser[]>("/admin/users").then(setUsers).catch(() => {});
  }, []);

  const fetchAdminMsgs = useCallback(async () => {
    try {
      setAdminMsgs(await adminFetch<any[]>("/admin/messages"));
    } catch {}
  }, []);
  useEffect(() => { fetchAdminMsgs(); }, [fetchAdminMsgs]);

  const submitPin = async () => {
    if (!pendingPin || !pinContent.trim() || pinSubmitting) return;
    setPinSubmitting(true);
    try {
      await adminFetch("/admin/messages", {
        method: "POST",
        body: JSON.stringify({ lat: pendingPin.lat, lng: pendingPin.lng, content: pinContent.trim(), type: "regular" }),
      });
      setPendingPin(null);
      setPinContent("");
      fetchAdminMsgs();
    } catch (e: any) {
      console.error("[admin pin] failed", e);
      alert(e?.message || "Failed to pin message");
    } finally {
      setPinSubmitting(false);
    }
  };

  const deleteAdminMsg = async (id: number) => {
    if (deletingMsgId === id) return;
    setDeletingMsgId(id);
    try {
      await adminFetch(`/admin/messages/${id}`, { method: "DELETE" });
      // Only remove from UI after server confirms
      setAdminMsgs(p => p.filter(m => m.id !== id));
    } catch (e: any) {
      console.error("[admin msg] delete failed", e);
      alert(e?.message || "Failed to delete message");
    } finally {
      setDeletingMsgId(null);
    }
  };

  const lForm = useForm<LocForm>({
    resolver: zodResolver(locSchema),
    defaultValues: { name:"", description:"", type: LocationType.building, color:"#60a5fa", adminName:"" },
  });
  const watchedType = lForm.watch("type");
  const watchedColor = lForm.watch("color");

  const editForm = useForm<LocForm>({
    resolver: zodResolver(locSchema),
    defaultValues: { name:"", description:"", type: LocationType.building, color:"#60a5fa", adminName:"" },
  });

  useEffect(() => {
    if (!campusLoading && !campus) nav("/setup");
  }, [campusLoading, campus]);

  const reverseGeocode = async (lat:number, lng:number) => {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
      const d = await r.json();
      if (d?.display_name) {
        const name = d.display_name.split(",")[0].trim();
        setDetected(name);
        if (!lForm.getValues("name")) lForm.setValue("name", name);
      }
    } catch {}
  };

  const handleMapClick = (lat:number, lng:number) => {
    if (!drawing) return;
    setPts(p => [...p, [lat, lng]]);
    if (pts.length === 0) reverseGeocode(lat, lng);
  };

  const handleSearchSelect = (lat: number, lng: number, name: string) => {
    setFlyTarget({ lat, lng, zoom: 18 });
    if (mode === "add" && !lForm.getValues("name")) {
      lForm.setValue("name", name);
      setDetected(name);
    }
  };

  const startAdd = () => {
    setMode("add"); setDrawing(true); setPts([]); setDetected(""); setManagerId(null);
    setSheetOpen(false); setSelectedId(null);
    setPinMode(false); setPendingPin(null); setPinContent("");
    lForm.reset({ name:"", description:"", type: LocationType.building, color:"#60a5fa", adminName:"" });
  };

  const cancelAdd = () => { setMode("list"); setDrawing(false); setPts([]); };

  const submit = (data: LocForm, addAnother = false) => {
    if (pts.length === 0 || createLoc.isPending) return;
    const center = pts[0];
    createLoc.mutate({
      data: { ...data, lat: center[0], lng: center[1], polygon: pts.map(p => ({ lat: p[0], lng: p[1] })), managerId: managerId as any }
    }, {
      onSuccess: () => {
        refetch();
        if (addAnother) {
          setPts([]);
          setDetected("");
          setManagerId(null);
          setDrawing(true);
          lForm.reset({ name:"", description:"", type: LocationType.building, color:"#60a5fa", adminName:"" });
        } else {
          cancelAdd();
        }
      },
      onError: (err: any) => {
        console.error("[admin location] create failed", err);
        alert(err?.message || "Failed to create location. Please try again.");
      },
    });
  };

  const openDetail = (id: number) => {
    const loc = locs.find(l => l.id === id);
    if (!loc) return;
    setSelectedId(id);
    setMode("detail");
    setSheetOpen(true);
    setFlyTarget({ lat: loc.lat, lng: loc.lng, zoom: 18 });
  };

  const startEdit = () => {
    if (!selectedLoc) return;
    editForm.reset({
      name: selectedLoc.name,
      description: selectedLoc.description || "",
      type: selectedLoc.type as LocationType,
      color: selectedLoc.color,
      adminName: selectedLoc.adminName || "",
    });
    setEditManagerId((selectedLoc as any).managerId || null);
    setMode("edit");
  };

  const submitEdit = (data: LocForm) => {
    if (!selectedLoc || updateLoc.isPending) return;
    updateLoc.mutate({
      locationId: selectedLoc.id,
      data: {
        ...data,
        lat: selectedLoc.lat,
        lng: selectedLoc.lng,
        polygon: (selectedLoc.polygon as any[]).map((p: any) => ({ lat: p.lat, lng: p.lng })),
        managerId: editManagerId as any,
      },
    }, {
      onSuccess: () => { setMode("detail"); refetch(); },
      onError: (err: any) => {
        console.error("[admin location] update failed", err);
        alert(err?.message || "Failed to update location. Please try again.");
      },
    });
  };

  const selectedLoc = locs.find(l => l.id === selectedId);

  if (campusLoading || locsLoading) return (
    <div className="flex-1 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
    </div>
  );
  if (!campus) return null;

  const mapHeight = mode === "list" ? "45dvh" : "35dvh";

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">

      {/* ── MAP ── */}
      <div className="relative flex-shrink-0 transition-all duration-300" style={{ height: mapHeight }}>
        <MapContainer center={[campus.lat, campus.lng]} zoom={campus.defaultZoom} style={{ width:"100%", height:"100%" }}>
          <DynamicTiles styleKey={mapStyle} />
          <MapClick drawing={drawing} pinMode={pinMode} onPoint={handleMapClick} onPinClick={(lat, lng) => { setPendingPin({ lat, lng }); setPinContent(""); }} />
          {flyTarget && <MapFly lat={flyTarget.lat} lng={flyTarget.lng} zoom={flyTarget.zoom} />}

          {locs.map(loc => {
            const cfg = TYPES[loc.type] || TYPES.other;
            const isSel = loc.id === selectedId;
            if (loc.polygon.length >= 2) {
              return (
                <Polygon key={loc.id}
                  positions={(loc.polygon as any[]).map((p:any) => [p.lat, p.lng])}
                  pathOptions={{ color: cfg.color, fillColor: cfg.color, fillOpacity: isSel ? 0.45 : 0.2, weight: isSel ? 3 : 2 }}
                  eventHandlers={{ click: () => openDetail(loc.id) }}
                />
              );
            }
            return <Marker key={loc.id} position={[loc.lat, loc.lng]} eventHandlers={{ click: () => openDetail(loc.id) }} />;
          })}

          {drawing && pts.length >= 3 && <Polygon positions={pts} pathOptions={{ color: watchedColor, fillColor: watchedColor, fillOpacity: 0.3, weight: 2, dashArray: "6 6" }} />}
          {drawing && pts.length === 2 && <Polyline positions={pts} pathOptions={{ color: watchedColor, weight: 2, dashArray: "6 6" }} />}
          {drawing && pts.map((p, i) => <Marker key={i} position={p} />)}

          {adminMsgs.map(msg => (
            <Marker key={msg.id} position={[msg.lat, msg.lng]} icon={makePinIcon("📌", "#f59e0b")}>
            </Marker>
          ))}

          {pendingPin && (
            <Marker position={[pendingPin.lat, pendingPin.lng]} icon={makePinIcon("📍", "#3b82f6", true)} />
          )}
        </MapContainer>

        <MapSearchBar onSelect={handleSearchSelect} />
        <MapStyleSwitcher style={mapStyle} onChange={setMapStyle} />

        {drawing && (
          <div className="absolute top-14 left-3 right-3 z-[400] bg-primary/90 backdrop-blur-sm text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-medium flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{pts.length === 0 ? "Tap map to draw the area" : `${pts.length} points marked`}</span>
            </div>
            {pts.length > 0 && (
              <button onClick={() => setPts(p => p.slice(0, -1))} className="flex items-center gap-1 text-xs bg-primary-foreground/20 px-2 py-1 rounded-lg">
                <Undo2 className="w-3 h-3" /> Undo
              </button>
            )}
          </div>
        )}

        {pinMode && !drawing && (
          <div className="absolute top-14 left-3 right-3 z-[400] bg-amber-500/90 backdrop-blur-sm text-white rounded-xl px-4 py-2.5 text-sm font-medium flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-2">
              <MessageSquarePlus className="w-4 h-4 flex-shrink-0" />
              <span>Click anywhere on the map to pin a message</span>
            </div>
            <button onClick={() => { setPinMode(false); setPendingPin(null); }} className="text-xs bg-white/20 px-2 py-1 rounded-lg hover:bg-white/30">
              Cancel
            </button>
          </div>
        )}

        {pendingPin && (
          <div className="absolute bottom-3 left-3 right-16 z-[500] bg-card/98 backdrop-blur-md border border-border rounded-2xl p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <MessageSquarePlus className="w-4 h-4 text-primary" /> Pin Campus Message
              </h3>
              <button onClick={() => { setPendingPin(null); setPinContent(""); }}
                className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <textarea value={pinContent} onChange={e => setPinContent(e.target.value)}
              placeholder="Message for students on the map..." rows={3}
              className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary resize-none" />
            <div className="flex gap-2 mt-3">
              <button onClick={() => { setPendingPin(null); setPinContent(""); }}
                className="px-4 py-2 rounded-xl bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80">
                Cancel
              </button>
              <button onClick={submitPin} disabled={!pinContent.trim() || pinSubmitting}
                className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2">
                {pinSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><MessageSquarePlus className="w-4 h-4" /> Pin Message</>}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── LIST MODE ── */}
      {mode === "list" && (
        <div className="flex-1 overflow-y-auto">
          <div className="sticky top-0 bg-background/90 backdrop-blur-sm border-b border-border px-4 py-2.5 flex items-center justify-between z-10">
            <h2 className="text-sm font-semibold text-foreground">{locs.length} Location{locs.length !== 1 ? "s" : ""}</h2>
          </div>
          <div className="px-4 py-3 space-y-2 pb-24">
            {locs.length === 0 && (
              <div className="text-center py-12">
                <MapPin className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No locations yet</p>
                <p className="text-xs text-muted-foreground mt-1">Tap + to draw a location on the map</p>
              </div>
            )}
            {locs.map(loc => {
              const cfg = TYPES[loc.type] || TYPES.other;
              const mgrName = (loc as any).managerName;
              return (
                <div key={loc.id} onClick={() => openDetail(loc.id)}
                  className="bg-card border border-border rounded-2xl p-3.5 flex items-center gap-3 cursor-pointer hover:border-primary/30 transition-colors active:scale-[0.98]">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                    style={{ background: cfg.color + "20", border: `1px solid ${cfg.color}40` }}>
                    {cfg.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{loc.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {cfg.label}
                      {loc.description ? ` · ${loc.description}` : ""}
                    </p>
                    {mgrName && (
                      <p className="text-[10px] text-primary mt-0.5 flex items-center gap-1">
                        <UserCheck className="w-3 h-3" /> {mgrName}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={e => { e.stopPropagation(); deleteLoc.mutate({ locationId: loc.id }, { onSuccess: refetch }); }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              );
            })}

            {adminMsgs.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-amber-500 mb-2 flex items-center gap-1.5">
                  <MessageSquarePlus className="w-3.5 h-3.5" /> Pinned Map Messages ({adminMsgs.length})
                </p>
                <div className="space-y-2">
                  {adminMsgs.map(msg => (
                    <div key={msg.id} className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-3 flex items-start gap-3">
                      <span className="text-lg flex-shrink-0">📌</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground leading-snug">{msg.content}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{new Date(msg.createdAt).toLocaleString("en-IL", { day:"numeric",month:"short",hour:"2-digit",minute:"2-digit" })}</p>
                      </div>
                      <button onClick={() => deleteAdminMsg(msg.id)} disabled={deletingMsgId === msg.id}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0 disabled:opacity-40">
                        {deletingMsgId === msg.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ADD MODE ── */}
      {mode === "add" && (
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-4 space-y-3">
            {detected && (
              <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-3 py-2.5">
                <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                <p className="text-sm text-primary">{detected}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {Object.entries(TYPES).map(([k, v]) => (
                <button key={k} type="button" onClick={() => { lForm.setValue("type", k as LocationType); lForm.setValue("color", v.color); }}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all ${watchedType === k ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground hover:border-primary/40"}`}>
                  <span className="text-lg">{v.emoji}</span><span className="text-xs font-medium">{v.label}</span>
                </button>
              ))}
            </div>

            <input {...lForm.register("name")} placeholder="Location name" className="w-full px-4 py-3 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:border-primary transition-colors"/>
            <textarea {...lForm.register("description")} placeholder="Description" rows={2} className="w-full px-4 py-3 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:border-primary resize-none transition-colors"/>
            <input {...lForm.register("adminName")} placeholder="Admin name (optional)" className="w-full px-4 py-3 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:border-primary transition-colors"/>

            <UserPicker value={managerId} onChange={setManagerId} users={users} />

            <div className="flex gap-2 items-center">
              <label className="text-xs text-muted-foreground">Color:</label>
              <input type="color" value={watchedColor} onChange={e => lForm.setValue("color", e.target.value)} className="w-10 h-9 rounded-lg border border-border bg-transparent p-0.5 cursor-pointer"/>
              <input {...lForm.register("color")} className="flex-1 px-3 py-2 rounded-xl bg-card border border-border text-xs text-foreground focus:outline-none"/>
            </div>

            <div className="flex gap-2 pb-2">
              <button type="button" onClick={cancelAdd} className="py-3 px-4 rounded-xl bg-secondary text-foreground text-sm font-medium">Cancel</button>
              <button type="button" onClick={lForm.handleSubmit(d => submit(d, false))} disabled={pts.length === 0 || createLoc.isPending}
                className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2">
                {createLoc.isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : <><Save className="w-4 h-4"/> Save</>}
              </button>
            </div>
            <button type="button" onClick={lForm.handleSubmit(d => submit(d, true))} disabled={pts.length === 0 || createLoc.isPending}
              className="w-full py-3 rounded-xl border-2 border-dashed border-primary/40 text-primary text-sm font-medium disabled:opacity-40 flex items-center justify-center gap-2 hover:bg-primary/5 transition-colors mb-6">
              <PlusCircle className="w-4 h-4"/> Save & Add Another Location
            </button>
          </div>
        </div>
      )}

      {/* ── DETAIL PANEL (inline below map) ── */}
      <AnimatePresence>
        {mode === "detail" && selectedLoc && sheetOpen && (
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="flex-1 flex flex-col overflow-hidden bg-card border-t border-border">

            <div className="flex-shrink-0 px-4 pt-3 pb-3 border-b border-border">
              <div className="w-10 h-1 rounded-full bg-border mx-auto mb-3" />
              <div className="flex items-center gap-3">
                <button onClick={() => { setMode("list"); setSheetOpen(false); setSelectedId(null); }}
                  className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: (TYPES[selectedLoc.type]?.color || "#94a3b8") + "20", border: `1px solid ${TYPES[selectedLoc.type]?.color || "#94a3b8"}40` }}>
                  {TYPES[selectedLoc.type]?.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{selectedLoc.name}</p>
                  <p className="text-xs text-muted-foreground">{TYPES[selectedLoc.type]?.label}{selectedLoc.adminName ? ` · ${selectedLoc.adminName}` : ""}</p>
                </div>
                <button onClick={startEdit}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => { if (confirm("Delete this location?")) deleteLoc.mutate({ locationId: selectedLoc.id }, { onSuccess: () => { setMode("list"); setSheetOpen(false); refetch(); } }); }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {selectedLoc.description && (
                <p className="text-sm text-muted-foreground mb-3 bg-background border border-border rounded-xl px-3 py-2.5">{selectedLoc.description}</p>
              )}
              {(selectedLoc as any).managerName && (
                <div className="flex items-center gap-2 mb-4 bg-primary/5 border border-primary/20 rounded-xl px-3 py-2.5">
                  <UserCheck className="w-4 h-4 text-primary flex-shrink-0" />
                  <p className="text-xs font-medium text-primary">Manager: {(selectedLoc as any).managerName}</p>
                </div>
              )}
              {selectedLoc.type === "building"     && <BuildingPanel locationId={selectedLoc.id} />}
              {selectedLoc.type === "dining_hall"  && <DiningPanel   locationId={selectedLoc.id} />}
              {selectedLoc.type === "sports_field" && <SportsPanel   locationId={selectedLoc.id} />}
              {!["building","dining_hall","sports_field"].includes(selectedLoc.type) && (
                <div className="text-center py-8"><MapPin className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2"/><p className="text-sm text-muted-foreground">No management features for this type</p></div>
              )}
              <FloorDataEditor
                locationId={selectedLoc.id}
                initialFloors={((selectedLoc as any).floorData as FloorEntry[]) || []}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── EDIT PANEL (inline below map) ── */}
      <AnimatePresence>
        {mode === "edit" && selectedLoc && (
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="flex-1 flex flex-col overflow-hidden bg-card border-t border-border">

            <div className="flex-shrink-0 px-4 pt-3 pb-3 border-b border-border">
              <div className="w-10 h-1 rounded-full bg-border mx-auto mb-3" />
              <div className="flex items-center gap-3">
                <button onClick={() => setMode("detail")}
                  className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <p className="text-sm font-bold text-foreground flex-1">Edit Location</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(TYPES).map(([k, v]) => (
                  <button key={k} type="button" onClick={() => { editForm.setValue("type", k as LocationType); editForm.setValue("color", v.color); }}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all ${editForm.watch("type") === k ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground hover:border-primary/40"}`}>
                    <span className="text-lg">{v.emoji}</span><span className="text-xs font-medium">{v.label}</span>
                  </button>
                ))}
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Name</label>
                <input {...editForm.register("name")} className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Description</label>
                <textarea {...editForm.register("description")} rows={2} className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary resize-none" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Admin Name</label>
                <input {...editForm.register("adminName")} className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary" />
              </div>

              <UserPicker value={editManagerId} onChange={setEditManagerId} users={users} />

              <div className="flex gap-2 items-center">
                <label className="text-xs text-muted-foreground">Color:</label>
                <input type="color" value={editForm.watch("color")} onChange={e => editForm.setValue("color", e.target.value)} className="w-10 h-9 rounded-lg border border-border bg-transparent p-0.5 cursor-pointer"/>
                <input {...editForm.register("color")} className="flex-1 px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none"/>
              </div>

              <div className="flex gap-2 pb-6">
                <button type="button" onClick={() => setMode("detail")} className="flex-1 py-3 rounded-xl bg-secondary text-foreground text-sm font-medium">Cancel</button>
                <button type="button" onClick={editForm.handleSubmit(submitEdit)} disabled={updateLoc.isPending}
                  className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2">
                  {updateLoc.isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : <><Save className="w-4 h-4"/> Save Changes</>}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FABs */}
      {mode === "list" && (
        <>
          <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}
            onClick={() => { setPinMode(p => !p); setPendingPin(null); setPinContent(""); }}
            className={`fixed bottom-36 right-5 z-20 w-12 h-12 rounded-xl shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all border ${
              pinMode ? "bg-amber-500 text-white border-amber-600 shadow-amber-500/40" : "bg-card text-foreground border-border shadow-black/20"
            }`}>
            <MessageSquarePlus className="w-5 h-5" />
          </motion.button>
          <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.1 }}
            onClick={startAdd}
            className="fixed bottom-20 right-5 z-20 w-14 h-14 rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform">
            <Plus className="w-6 h-6" />
          </motion.button>
        </>
      )}
    </div>
  );
}
