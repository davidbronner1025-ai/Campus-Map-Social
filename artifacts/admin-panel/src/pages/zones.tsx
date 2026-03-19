import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { MapContainer, TileLayer, Polygon, Polyline, useMapEvents } from "react-leaflet";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, Trash2, X, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { useGetCampus, useGetZones, useCreateZone, useUpdateZone, useDeleteZone, ZoneType, Zone } from "@workspace/api-client-react";
import { Button, Input, Label, Textarea } from "@/components/ui";
import { useToast } from "@/hooks/use-toast";

const zoneSchema = z.object({
  name: z.string().min(2, "Name required"),
  description: z.string().optional(),
  type: z.nativeEnum(ZoneType),
  color: z.string().regex(/^#([0-9A-F]{3}){1,2}$/i, "Invalid hex color"),
});
type ZoneFormValues = z.infer<typeof zoneSchema>;

type DrawingState = "idle" | "drawing";

export default function ZonesPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: campus, isLoading: campusLoading } = useGetCampus({ query: { retry: false } });
  const { data: zones = [], isLoading: zonesLoading, refetch: refetchZones } = useGetZones();
  
  const createZone = useCreateZone();
  const updateZone = useUpdateZone();
  const deleteZone = useDeleteZone();

  const [activeZoneId, setActiveZoneId] = useState<number | null>(null);
  const [drawingState, setDrawingState] = useState<DrawingState>("idle");
  const [draftPoints, setDraftPoints] = useState<[number, number][]>([]);

  const form = useForm<ZoneFormValues>({
    resolver: zodResolver(zoneSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "academic",
      color: "#6366f1", // primary indigo
    }
  });

  // Redirect if no campus
  if (!campusLoading && !campus) {
    setLocation("/setup");
    return null;
  }

  const handleStartDraw = () => {
    setActiveZoneId(null);
    setDrawingState("drawing");
    setDraftPoints([]);
    form.reset({ name: "", description: "", type: "academic", color: "#6366f1" });
  };

  const handleEditZone = (zone: Zone) => {
    setActiveZoneId(zone.id);
    setDrawingState("drawing");
    setDraftPoints(zone.polygon.map(p => [p.lat, p.lng]));
    form.reset({
      name: zone.name,
      description: zone.description || "",
      type: zone.type,
      color: zone.color,
    });
  };

  const handleCancelDraw = () => {
    setDrawingState("idle");
    setDraftPoints([]);
    setActiveZoneId(null);
  };

  const onSubmit = (data: ZoneFormValues) => {
    if (draftPoints.length < 3) {
      toast({ title: "Incomplete Polygon", description: "Click on the map to draw at least 3 points.", variant: "destructive" });
      return;
    }

    const payload = {
      ...data,
      polygon: draftPoints.map(p => ({ lat: p[0], lng: p[1] }))
    };

    if (activeZoneId) {
      updateZone.mutate({ zoneId: activeZoneId, data: payload }, {
        onSuccess: () => {
          toast({ title: "Zone Updated" });
          handleCancelDraw();
          refetchZones();
        }
      });
    } else {
      createZone.mutate({ data: payload }, {
        onSuccess: () => {
          toast({ title: "Zone Created" });
          handleCancelDraw();
          refetchZones();
        }
      });
    }
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Delete this zone?")) {
      deleteZone.mutate({ zoneId: id }, {
        onSuccess: () => {
          toast({ title: "Zone Deleted" });
          if (activeZoneId === id) handleCancelDraw();
          refetchZones();
        }
      });
    }
  };

  // Map Click Handler Component
  const MapDrawHandler = () => {
    useMapEvents({
      click(e) {
        if (drawingState === "drawing") {
          setDraftPoints(prev => [...prev, [e.latlng.lat, e.latlng.lng]]);
        }
      },
    });
    return null;
  };

  if (campusLoading || zonesLoading) return <div className="p-8">Loading...</div>;
  if (!campus) return null;

  return (
    <div className="flex-1 flex flex-col md:flex-row h-screen overflow-hidden">
      
      {/* Left Sidebar - Lists & Forms */}
      <div className="w-full md:w-96 flex-shrink-0 bg-card/80 backdrop-blur-xl border-r border-border flex flex-col z-20">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-display font-bold">Zones</h2>
          <p className="text-sm text-muted-foreground mb-4">Manage campus areas</p>
          
          {drawingState === "idle" && (
            <Button onClick={handleStartDraw} className="w-full">
              <Plus className="w-4 h-4 mr-2" /> New Zone
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence mode="popLayout">
            {drawingState === "idle" ? (
              // List Mode
              zones.map((zone) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  key={zone.id}
                  onClick={() => handleEditZone(zone)}
                  className="p-4 rounded-xl border border-border bg-background hover:border-primary/50 cursor-pointer transition-all shadow-sm hover:shadow-md group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full shadow-inner" style={{ backgroundColor: zone.color }} />
                      <div>
                        <h4 className="font-semibold text-sm">{zone.name}</h4>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">{zone.type}</span>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleDelete(zone.id, e)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))
            ) : (
              // Edit/Create Form Mode
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">{activeZoneId ? "Edit Zone" : "Draw New Zone"}</h3>
                  <Button variant="ghost" size="icon" onClick={handleCancelDraw} className="h-8 w-8">
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="bg-primary/10 text-primary px-4 py-3 rounded-lg flex items-start gap-3 text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p>Click on the map to draw points. Connect at least 3 points to form a zone.</p>
                </div>

                {draftPoints.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setDraftPoints(prev => prev.slice(0, -1))}
                    className="w-full mb-4"
                  >
                    Undo Last Point
                  </Button>
                )}

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input {...form.register("name")} placeholder="Main Quad" />
                  </div>

                  <div className="space-y-2">
                    <Label>Type</Label>
                    <select 
                      {...form.register("type")}
                      className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
                    >
                      {Object.values(ZoneType).map(t => (
                        <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Color</Label>
                    <div className="flex gap-3">
                      <Input type="color" {...form.register("color")} className="w-16 p-1 h-10" />
                      <Input type="text" {...form.register("color")} className="flex-1" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea {...form.register("description")} placeholder="Optional details..." />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full mt-4" 
                    isLoading={createZone.isPending || updateZone.isPending}
                    disabled={draftPoints.length < 3}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {activeZoneId ? "Save Changes" : "Create Zone"}
                  </Button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Main Map */}
      <div className="flex-1 relative z-10 bg-black">
        <MapContainer 
          center={[campus.lat, campus.lng]} 
          zoom={campus.defaultZoom} 
          className="w-full h-full"
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <MapDrawHandler />
          
          {/* Render Existing Zones */}
          {zones.map(zone => {
            if (activeZoneId === zone.id) return null; // hide if editing
            const positions: [number, number][] = zone.polygon.map(p => [p.lat, p.lng]);
            return (
              <Polygon 
                key={zone.id} 
                positions={positions} 
                pathOptions={{ 
                  color: zone.color, 
                  fillColor: zone.color, 
                  fillOpacity: 0.2, 
                  weight: 2 
                }}
                eventHandlers={{
                  click: () => {
                    if (drawingState === "idle") handleEditZone(zone);
                  }
                }}
              />
            );
          })}

          {/* Render Draft Zone */}
          {drawingState === "drawing" && draftPoints.length > 0 && (
            <>
              {draftPoints.length >= 3 ? (
                <Polygon 
                  positions={draftPoints} 
                  pathOptions={{ 
                    color: form.watch("color"), 
                    fillColor: form.watch("color"), 
                    fillOpacity: 0.4, 
                    weight: 3, 
                    dashArray: "5, 5" 
                  }} 
                />
              ) : (
                <Polyline 
                  positions={draftPoints} 
                  pathOptions={{ 
                    color: form.watch("color"), 
                    weight: 3, 
                    dashArray: "5, 5" 
                  }} 
                />
              )}
            </>
          )}
        </MapContainer>
      </div>
    </div>
  );
}
