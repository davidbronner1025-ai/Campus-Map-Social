import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { motion } from "framer-motion";
import { MapPin, Save, Navigation } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Input, Label } from "@/components/ui";
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
  name: z.string().min(2, "Campus name must be at least 2 characters"),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  defaultZoom: z.coerce.number().min(1).max(20),
});

type SetupFormValues = z.infer<typeof setupSchema>;

// Component to handle map clicks and sync with form
function MapClickSync({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
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
    query: { retry: false } // Don't retry on 404
  });
  const setCampusMutation = useSetCampus();

  const defaultCenter: [number, number] = [40.7128, -74.0060]; // NY default if none

  const form = useForm<SetupFormValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      name: "",
      lat: defaultCenter[0],
      lng: defaultCenter[1],
      defaultZoom: 16,
    },
  });

  // Update form when campus data loads
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
            title: "Campus Configuration Saved",
            description: "The main location has been updated.",
          });
          setLocation("/zones");
        },
        onError: (err) => {
          toast({
            title: "Error",
            description: "Failed to save campus configuration.",
            variant: "destructive"
          });
        }
      }
    );
  };

  const handleCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        form.setValue("lat", pos.coords.latitude);
        form.setValue("lng", pos.coords.longitude);
      });
    }
  };

  if (isFetching) {
    return <div className="flex-1 flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8"
      >
        {/* Form Panel */}
        <div className="lg:col-span-4 space-y-6">
          <div>
            <h1 className="text-3xl font-display font-bold">Campus Setup</h1>
            <p className="text-muted-foreground mt-1">Configure the main location and settings for your campus network.</p>
          </div>

          <Card>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Campus Name</Label>
                  <Input 
                    id="name" 
                    placeholder="e.g. University of Technology" 
                    {...form.register("name")} 
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lat">Latitude</Label>
                    <Input id="lat" type="number" step="any" {...form.register("lat")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lng">Longitude</Label>
                    <Input id="lng" type="number" step="any" {...form.register("lng")} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultZoom">Default Zoom Level</Label>
                  <div className="flex gap-4 items-center">
                    <Input 
                      id="defaultZoom" 
                      type="range" 
                      min="1" 
                      max="20" 
                      className="flex-1 cursor-pointer"
                      {...form.register("defaultZoom")} 
                    />
                    <span className="w-8 text-center text-sm font-medium bg-secondary py-1 rounded-md">{watchedZoom}</span>
                  </div>
                </div>

                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full"
                  onClick={handleCurrentLocation}
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Use My Current Location
                </Button>
              </CardContent>
              <div className="p-6 pt-0">
                <Button type="submit" className="w-full" isLoading={setCampusMutation.isPending}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Configuration
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Map Panel */}
        <div className="lg:col-span-8 h-[500px] lg:h-[calc(100vh-8rem)] rounded-2xl overflow-hidden border border-border shadow-2xl relative">
          <div className="absolute top-4 left-4 z-20 bg-background/80 backdrop-blur-md px-4 py-2 rounded-lg border border-border text-sm font-medium shadow-lg pointer-events-none">
            Click anywhere on the map to set the campus center
          </div>
          
          <MapContainer 
            center={[watchedLat, watchedLng]} 
            zoom={watchedZoom} 
            className="w-full h-full z-10"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            <Marker position={[watchedLat, watchedLng]} />
            <MapClickSync 
              onLocationSelect={(lat, lng) => {
                form.setValue("lat", lat);
                form.setValue("lng", lng);
              }} 
            />
            <MapUpdater center={[watchedLat, watchedLng]} zoom={watchedZoom} />
          </MapContainer>
        </div>
      </motion.div>
    </div>
  );
}
