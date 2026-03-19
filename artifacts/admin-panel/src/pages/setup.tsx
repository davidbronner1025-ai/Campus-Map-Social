import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { motion } from "framer-motion";
import { Save, Navigation, Crosshair, MapPin } from "lucide-react";
import { Card, CardContent, Button, Input, Label, Badge } from "@/components/ui";
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

function MapClickSync({ 
  onLocationSelect 
}: { 
  onLocationSelect: (lat: number, lng: number) => void 
}) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapUpdater({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export default function SetupPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: campus, isLoading: isFetching } = useGetCampus({
    query: { retry: false } 
  });
  const setCampusMutation = useSetCampus();
  
  const [detectedPlace, setDetectedPlace] = useState<string>("");
  const [isDetecting, setIsDetecting] = useState(false);

  const defaultCenter: [number, number] = [40.7128, -74.0060]; 

  const form = useForm<SetupFormValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      name: "",
      lat: defaultCenter[0],
      lng: defaultCenter[1],
      defaultZoom: 16,
    },
  });

  useEffect(() => {
    if (campus) {
      form.reset({
        name: campus.name,
        lat: campus.lat,
        lng: campus.lng,
        defaultZoom: campus.defaultZoom,
      });
    }
  }, [campus, form]);

  const watchedLat = form.watch("lat");
  const watchedLng = form.watch("lng");
  const watchedZoom = form.watch("defaultZoom");

  const onSubmit = (data: SetupFormValues) => {
    setCampusMutation.mutate(
      { data },
      {
        onSuccess: () => {
          toast({
            title: "SYSTEM OVERRIDE SUCCESS",
            description: "Sector coordinates anchored successfully.",
          });
          setLocation("/locations");
        },
        onError: (err) => {
          toast({
            title: "SYSTEM ERROR",
            description: "Failed to establish sector coordinates.",
            variant: "destructive"
          });
        }
      }
    );
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    setIsDetecting(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
      const data = await res.json();
      if (data && data.display_name) {
        const placeName = data.display_name.split(',')[0].trim();
        setDetectedPlace(placeName);
        
        const currentName = form.getValues("name");
        if (!currentName || currentName === "") {
          form.setValue("name", placeName);
        }
        
        toast({
          title: "LOCATION ACQUIRED",
          description: `Target identified: ${placeName}`,
        });
      }
    } catch (e) {
      console.error("Geocoding failed", e);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    form.setValue("lat", lat);
    form.setValue("lng", lng);
    reverseGeocode(lat, lng);
  };

  const handleCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        handleMapClick(pos.coords.latitude, pos.coords.longitude);
      });
    }
  };

  if (isFetching) {
    return <div className="flex-1 flex items-center justify-center font-mono text-primary text-xl tracking-widest animate-pulse">ESTABLISHING UPLINK...</div>;
  }

  return (
    <div className="flex-1 h-full flex flex-col lg:flex-row gap-4">
      {/* Target Info Panel */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full lg:w-96 flex-shrink-0 flex flex-col gap-4"
      >
        <div className="game-hud-border p-5">
          <h2 className="text-2xl text-primary flex items-center gap-2 mb-2">
            <Crosshair className="w-6 h-6 animate-pulse" />
            INITIALIZE SECTOR
          </h2>
          <p className="text-xs text-primary/60 font-mono">Establish tactical parameters for the primary area of operations.</p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col gap-4">
          <div className="game-hud-border p-5 flex-1 flex flex-col gap-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-primary font-mono text-xs uppercase">Designation</Label>
              <Input 
                id="name" 
                className="bg-background/50 border-primary text-primary font-mono rounded-none focus-visible:ring-primary focus-visible:ring-offset-0 focus-visible:ring-1"
                placeholder="e.g. SECTOR_ALPHA" 
                {...form.register("name")} 
              />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive font-mono mt-1">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lat" className="text-primary font-mono text-xs uppercase">Latitude (Y)</Label>
                <Input 
                  id="lat" type="number" step="any" 
                  className="bg-background/50 border-primary text-primary font-mono rounded-none"
                  {...form.register("lat")} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lng" className="text-primary font-mono text-xs uppercase">Longitude (X)</Label>
                <Input 
                  id="lng" type="number" step="any" 
                  className="bg-background/50 border-primary text-primary font-mono rounded-none"
                  {...form.register("lng")} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultZoom" className="text-primary font-mono text-xs uppercase">Sensor Zoom ({watchedZoom}x)</Label>
              <div className="flex gap-4 items-center">
                <Input 
                  id="defaultZoom" 
                  type="range" 
                  min="1" 
                  max="20" 
                  className="flex-1 cursor-pointer accent-primary"
                  {...form.register("defaultZoom")} 
                />
              </div>
            </div>

            {detectedPlace && (
              <div className="bg-primary/10 border border-primary/50 p-3 mt-4">
                <p className="text-[10px] text-primary/60 font-mono mb-1 uppercase">Target Match:</p>
                <p className="text-sm text-primary font-mono font-bold flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {detectedPlace}
                </p>
              </div>
            )}

            <Button 
              type="button" 
              variant="outline" 
              className="w-full mt-auto game-btn"
              onClick={handleCurrentLocation}
            >
              <Navigation className="w-4 h-4 mr-2" />
              LOCK CURRENT POS
            </Button>
          </div>
          
          <Button type="submit" className="w-full h-14 game-btn text-lg" isLoading={setCampusMutation.isPending}>
            <Save className="w-5 h-5 mr-3" />
            COMMIT DATA
          </Button>
        </form>
      </motion.div>

      {/* Sensor Map */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex-1 game-hud-border relative overflow-hidden"
      >
        <div className="absolute top-4 left-4 z-20 bg-background/80 border border-primary px-4 py-2 text-xs font-mono text-primary uppercase shadow-[0_0_15px_rgba(0,255,204,0.3)] pointer-events-none">
          {isDetecting ? "ANALYZING TERRAIN..." : "AWAITING CLICK COORDINATES"}
        </div>
        
        {/* HUD Crosshairs overlay */}
        <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center opacity-30">
          <div className="w-[1px] h-full bg-primary" />
          <div className="h-[1px] w-full bg-primary absolute" />
          <div className="w-32 h-32 border border-primary rounded-full absolute" />
        </div>

        <MapContainer 
          center={[watchedLat, watchedLng]} 
          zoom={watchedZoom} 
          className="w-full h-full z-10"
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.basemaps.cartocdn.com/dark_matter/{z}/{x}/{y}{r}.png"
          />
          <Marker position={[watchedLat, watchedLng]} />
          <MapClickSync onLocationSelect={handleMapClick} />
          <MapUpdater center={[watchedLat, watchedLng]} zoom={watchedZoom} />
        </MapContainer>
      </motion.div>
    </div>
  );
}
