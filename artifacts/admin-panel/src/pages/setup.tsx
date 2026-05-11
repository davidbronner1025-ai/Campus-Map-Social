import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { MapContainer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { Save, Navigation, MapPin, Search, Loader2, X, SlidersHorizontal, CheckCircle, Layers } from "lucide-react";
import { useGetCampus, useSetCampus, getGetCampusQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const schema = z.object({
  name: z.string().min(2, "Campus name required"),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  defaultZoom: z.coerce.number().min(1).max(20),
});
type FormValues = z.infer<typeof schema>;

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
    return () => { layersRef.current.forEach(l => map.removeLayer(l)); };
  }, [styleKey, map]);

  return null;
}

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
              <span className="text-base">{s.emoji}</span><span>{s.label}</span>
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

interface SearchResult { display_name: string; lat: string; lon: string }

function MapClickSync({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({ click: e => onSelect(e.latlng.lat, e.latlng.lng) });
  return null;
}

function MapFly({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (isNaN(center[0]) || isNaN(center[1])) return;
    try { map.setView(center, zoom, { animate: false }); } catch {}
  }, [center, zoom, map]);
  return null;
}

export default function SetupPage() {
  const [, nav] = useLocation();
  const { toast } = useToast();
  const { data: campus, isLoading } = useGetCampus({ query: { retry: false } });
  const setCampus = useSetCampus();
  const queryClient = useQueryClient();

  const [searchQ, setSearchQ] = useState("");
  const [searchRes, setSearchRes] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [detected, setDetected] = useState("");
  const [saved, setSaved] = useState(false);
  const [mapStyle, setMapStyle] = useState("satellite");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", lat: 31.5, lng: 35.0, defaultZoom: 17 },
  });

  useEffect(() => {
    if (campus) form.reset({ name: campus.name, lat: campus.lat, lng: campus.lng, defaultZoom: campus.defaultZoom });
  }, [campus]);

  const lat = form.watch("lat");
  const lng = form.watch("lng");
  const zoom = form.watch("defaultZoom");

  const reverseGeocode = async (la: number, lo: number) => {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${la}&lon=${lo}&format=json`);
      const d = await r.json();
      if (d?.display_name) {
        const place = d.display_name.split(",")[0].trim();
        setDetected(place);
        if (!form.getValues("name")) form.setValue("name", place);
      }
    } catch {}
  };

  const handleMapClick = (la: number, lo: number) => {
    form.setValue("lat", la);
    form.setValue("lng", lo);
    setSearchRes([]);
    reverseGeocode(la, lo);
  };

  const doSearch = async (q: string) => {
    if (!q.trim()) { setSearchRes([]); return; }
    setIsSearching(true);
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=il`);
      setSearchRes(await r.json());
    } catch {} finally { setIsSearching(false); }
  };

  const handleSearchChange = (v: string) => {
    setSearchQ(v);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => doSearch(v), 450);
  };

  const selectResult = (r: SearchResult) => {
    const la = parseFloat(r.lat), lo = parseFloat(r.lon);
    form.setValue("lat", la);
    form.setValue("lng", lo);
    form.setValue("defaultZoom", 17);
    const name = r.display_name.split(",")[0].trim();
    setDetected(name);
    if (!form.getValues("name") || form.getValues("name") === detected) form.setValue("name", name);
    setSearchQ(""); setSearchRes([]);
  };

  const onSubmit = (data: FormValues) => {
    setCampus.mutate({ data }, {
      onSuccess: () => {
        setSaved(true);
        queryClient.invalidateQueries({ queryKey: getGetCampusQueryKey() });
        toast({ title: "Campus saved", description: `${data.name} has been configured successfully.` });
        setTimeout(() => { setSaved(false); nav("/locations"); }, 1200);
      },
      onError: () => toast({ title: "Error", description: "Failed to save campus settings.", variant: "destructive" }),
    });
  };

  if (isLoading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Map */}
      <div className="relative flex-shrink-0" style={{ height: "42dvh" }}>
        <MapContainer center={[lat || 31.5, lng || 35.0]} zoom={campus ? campus.defaultZoom : 8}
          style={{ width: "100%", height: "100%" }}>
          <DynamicTiles styleKey={mapStyle} />
          <MapClickSync onSelect={handleMapClick} />
          {!isNaN(lat) && !isNaN(lng) && <Marker position={[lat, lng]} />}
          {!isNaN(lat) && !isNaN(lng) && <MapFly center={[lat, lng]} zoom={zoom} />}
        </MapContainer>
        <MapStyleSwitcher style={mapStyle} onChange={setMapStyle} />
        <div className="absolute top-3 left-3 right-3 z-[400]">
          <div className="relative bg-card/95 backdrop-blur-sm rounded-xl border border-border shadow-xl">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={searchQ} onChange={e => handleSearchChange(e.target.value)}
              placeholder="Search campus or location..."
              className="w-full pl-10 pr-9 py-3 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none rounded-xl" />
            {(searchQ || isSearching) && (
              <button onClick={() => { setSearchQ(""); setSearchRes([]); }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
          {searchRes.length > 0 && (
            <div className="mt-1.5 bg-card border border-border rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
              {searchRes.map((r, i) => (
                <button key={i} onClick={() => selectResult(r)}
                  className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-secondary border-b border-border last:border-0 transition-colors flex items-center gap-2.5">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{r.display_name.split(",").slice(0, 3).join(", ")}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="absolute bottom-3 left-3 z-[400] bg-card/90 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 text-xs text-muted-foreground pointer-events-none">
          Tap map to set location
        </div>
      </div>

      {/* Form */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 px-4 py-5 space-y-4">
        {detected && (
          <div className="flex items-center gap-2 bg-primary/10 border border-primary/25 rounded-xl px-4 py-3">
            <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
            <p className="text-sm text-primary font-medium">{detected}</p>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Campus Name</label>
          <input {...form.register("name")} placeholder="e.g. Bar-Ilan University"
            className="w-full px-4 py-3 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:border-primary transition-colors" />
          {form.formState.errors.name && <p className="text-xs text-destructive mt-1">{form.formState.errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Latitude</label>
            <input {...form.register("lat")} type="number" step="any"
              className="w-full px-3 py-3 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:border-primary transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Longitude</label>
            <input {...form.register("lng")} type="number" step="any"
              className="w-full px-3 py-3 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:border-primary transition-colors" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5" /> Default Zoom — {zoom}×
          </label>
          <input type="range" min={12} max={20} {...form.register("defaultZoom")}
            className="w-full accent-primary cursor-pointer h-2 rounded-full" />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>Zoomed out</span><span>Street level</span>
          </div>
        </div>

        <button type="button" onClick={() => { if ("geolocation" in navigator) navigator.geolocation.getCurrentPosition(p => handleMapClick(p.coords.latitude, p.coords.longitude)); }}
          className="w-full py-3 rounded-xl bg-secondary text-foreground text-sm font-medium flex items-center justify-center gap-2 hover:bg-secondary/80 transition-colors">
          <Navigation className="w-4 h-4" /> Use Current Location
        </button>

        <button type="submit" disabled={setCampus.isPending || saved}
          className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50">
          {saved ? <><CheckCircle className="w-4 h-4" /> Saved!</> :
            setCampus.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> :
              <><Save className="w-4 h-4" /> Save & Continue</>}
        </button>
      </form>
    </div>
  );
}
