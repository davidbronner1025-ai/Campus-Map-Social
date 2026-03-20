import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { motion } from "framer-motion";
import { Save, Navigation, Crosshair, MapPin, Search, Loader2, X } from "lucide-react";
import { Card, CardContent, Button, Input, Label } from "@/components/ui";
import { useGetCampus, useSetCampus } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

// Fix Leaflet icons in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

const setupSchema = z.object({
  name: z.string().min(2, "Sector name required"),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  defaultZoom: z.coerce.number().min(1).max(20),
});
type SetupFormValues = z.infer<typeof setupSchema>;

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  type: string;
}

function MapClickSync({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onLocationSelect(e.latlng.lat, e.latlng.lng); } });
  return null;
}

function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (isNaN(center[0]) || isNaN(center[1])) return;
    map.flyTo(center, zoom, { duration: 1 });
  }, [center, zoom, map]);
  return null;
}

export default function SetupPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: campus, isLoading: isFetching } = useGetCampus({ query: { retry: false } });
  const setCampusMutation = useSetCampus();

  const [detectedPlace, setDetectedPlace] = useState<string>("");
  const [isDetecting, setIsDetecting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout>>(null);

  // Default to Israel
  const defaultCenter: [number, number] = [31.5, 35.0];
  const defaultZoom = 8;

  const form = useForm<SetupFormValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: { name: "", lat: defaultCenter[0], lng: defaultCenter[1], defaultZoom: 17 },
  });

  useEffect(() => {
    if (campus) {
      form.reset({ name: campus.name, lat: campus.lat, lng: campus.lng, defaultZoom: campus.defaultZoom });
    }
  }, [campus, form]);

  const watchedLat = form.watch("lat");
  const watchedLng = form.watch("lng");
  const watchedZoom = form.watch("defaultZoom");

  const onSubmit = (data: SetupFormValues) => {
    setCampusMutation.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "SYSTEM OVERRIDE SUCCESS", description: "Sector coordinates anchored successfully." });
        setLocation("/locations");
      },
      onError: () => {
        toast({ title: "SYSTEM ERROR", description: "Failed to establish sector coordinates.", variant: "destructive" });
      }
    });
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    setIsDetecting(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
      const data = await res.json();
      if (data?.display_name) {
        const placeName = data.display_name.split(',')[0].trim();
        setDetectedPlace(placeName);
        if (!form.getValues("name")) form.setValue("name", placeName);
      }
    } catch {} finally { setIsDetecting(false); }
  };

  const handleMapClick = (lat: number, lng: number) => {
    form.setValue("lat", lat);
    form.setValue("lng", lng);
    setSearchResults([]);
    reverseGeocode(lat, lng);
  };

  const handleCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        handleMapClick(pos.coords.latitude, pos.coords.longitude);
      });
    }
  };

  const doSearch = async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&addressdetails=0&countrycodes=il`
      );
      const data = await res.json();
      setSearchResults(data);
    } catch {} finally { setIsSearching(false); }
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => doSearch(val), 400);
  };

  const selectSearchResult = (r: SearchResult) => {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    form.setValue("lat", lat);
    form.setValue("lng", lng);
    form.setValue("defaultZoom", 17);
    setDetectedPlace(r.display_name.split(',')[0].trim());
    if (!form.getValues("name") || form.getValues("name") === detectedPlace) {
      form.setValue("name", r.display_name.split(',')[0].trim());
    }
    setSearchQuery("");
    setSearchResults([]);
  };

  if (isFetching) {
    return <div className="flex-1 flex items-center justify-center font-mono text-primary text-xl tracking-widest animate-pulse">ESTABLISHING UPLINK...</div>;
  }

  return (
    <div className="flex-1 h-full flex flex-col lg:flex-row gap-4">
      {/* Left panel */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
        className="w-full lg:w-96 flex-shrink-0 flex flex-col gap-4">
        <div className="game-hud-border p-5">
          <h2 className="text-2xl text-primary flex items-center gap-2 mb-2">
            <Crosshair className="w-6 h-6 animate-pulse" />
            INITIALIZE SECTOR
          </h2>
          <p className="text-xs text-primary/60 font-mono">Establish tactical parameters for the primary area of operations.</p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col gap-4">
          <div className="game-hud-border p-5 flex-1 flex flex-col gap-5">

            {/* Place Search */}
            <div className="space-y-2 relative">
              <Label className="text-primary font-mono text-xs uppercase">Search Location</Label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/50" />
                <input
                  value={searchQuery}
                  onChange={e => handleSearchChange(e.target.value)}
                  placeholder="Search city, campus, address..."
                  className="w-full pl-8 pr-8 py-2 bg-background/50 border border-primary/40 text-primary font-mono text-xs rounded-none focus:outline-none focus:border-primary"
                />
                {(searchQuery || isSearching) && (
                  <button type="button" onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-primary/50 hover:text-primary">
                    {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                  </button>
                )}
              </div>
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 bg-card border border-primary/50 shadow-xl max-h-60 overflow-y-auto">
                  {searchResults.map((r, i) => (
                    <button key={i} type="button" onClick={() => selectSearchResult(r)}
                      className="w-full text-left px-3 py-2 text-xs font-mono text-primary hover:bg-primary/10 border-b border-primary/10 last:border-0 transition-colors">
                      <MapPin className="w-3 h-3 inline mr-2 opacity-50" />
                      {r.display_name.split(',').slice(0, 3).join(', ')}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-primary font-mono text-xs uppercase">Designation</Label>
              <Input id="name"
                className="bg-background/50 border-primary text-primary font-mono rounded-none focus-visible:ring-primary focus-visible:ring-offset-0 focus-visible:ring-1"
                placeholder="e.g. Bar Ilan University"
                {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive font-mono">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-primary font-mono text-xs uppercase">Latitude</Label>
                <Input type="number" step="any"
                  className="bg-background/50 border-primary text-primary font-mono rounded-none"
                  {...form.register("lat")} />
              </div>
              <div className="space-y-2">
                <Label className="text-primary font-mono text-xs uppercase">Longitude</Label>
                <Input type="number" step="any"
                  className="bg-background/50 border-primary text-primary font-mono rounded-none"
                  {...form.register("lng")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-primary font-mono text-xs uppercase">Sensor Zoom ({watchedZoom}x)</Label>
              <input type="range" min="1" max="20"
                className="w-full cursor-pointer accent-primary"
                {...form.register("defaultZoom")} />
            </div>

            {detectedPlace && (
              <div className="bg-primary/10 border border-primary/50 p-3">
                <p className="text-[10px] text-primary/60 font-mono uppercase mb-1">Target Match:</p>
                <p className="text-sm text-primary font-mono font-bold flex items-center gap-2">
                  <MapPin className="w-4 h-4" />{detectedPlace}
                </p>
              </div>
            )}

            <Button type="button" variant="outline" className="w-full mt-auto game-btn" onClick={handleCurrentLocation}>
              <Navigation className="w-4 h-4 mr-2" />LOCK CURRENT POS
            </Button>
          </div>

          <Button type="submit" className="w-full h-14 game-btn text-lg" isLoading={setCampusMutation.isPending}>
            <Save className="w-5 h-5 mr-3" />COMMIT DATA
          </Button>
        </form>
      </motion.div>

      {/* Satellite Map */}
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
        className="flex-1 game-hud-border relative overflow-hidden">
        <div className="absolute top-4 left-4 z-20 bg-background/80 border border-primary px-4 py-2 text-xs font-mono text-primary uppercase shadow-[0_0_15px_rgba(0,255,204,0.3)] pointer-events-none">
          {isDetecting ? "ANALYZING TERRAIN..." : "CLICK MAP OR SEARCH"}
        </div>

        {/* HUD crosshairs */}
        <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center opacity-20">
          <div className="w-[1px] h-full bg-primary" />
          <div className="h-[1px] w-full bg-primary absolute" />
          <div className="w-32 h-32 border border-primary rounded-full absolute" />
        </div>

        <MapContainer
          center={campus ? [campus.lat, campus.lng] : defaultCenter}
          zoom={campus ? campus.defaultZoom : defaultZoom}
          className="w-full h-full z-10">
          {/* Satellite tiles (Esri World Imagery) */}
          <TileLayer
            attribution='&copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={20}
          />
          {/* Labels overlay */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
            attribution=""
            pane="overlayPane"
          />
          <Marker position={[watchedLat, watchedLng]} />
          <MapClickSync onLocationSelect={handleMapClick} />
          <MapUpdater center={[watchedLat, watchedLng]} zoom={watchedZoom} />
        </MapContainer>
      </motion.div>
    </div>
  );
}
