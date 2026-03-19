import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { MapContainer, TileLayer, Polygon, Polyline, useMapEvents } from "react-leaflet";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, X, AlertCircle, Save } from "lucide-react";
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

function MapDrawHandler({
  drawingState,
  onAddPoint,
}: {
  drawingState: DrawingState;
  onAddPoint: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (drawingState === "drawing") {
        onAddPoint(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

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
      type: "academic" as ZoneType,
      color: "#6366f1",
    },
  });

  const watchedColor = form.watch("color");

  useEffect(() => {
    if (!campusLoading && !campus) {
      setLocation("/setup");
    }
  }, [campusLoading, campus, setLocation]);

  const handleStartDraw = () => {
    setActiveZoneId(null);
    setDrawingState("drawing");
    setDraftPoints([]);
    form.reset({ name: "", description: "", type: "academic" as ZoneType, color: "#6366f1" });
  };

  const handleEditZone = (zone: Zone) => {
    setActiveZoneId(zone.id);
    setDrawingState("drawing");
    setDraftPoints(zone.polygon.map((p) => [p.lat, p.lng]));
    form.reset({
      name: zone.name,
      description: zone.description || "",
      type: zone.type as ZoneType,
      color: zone.color,
    });
  };

  const handleCancelDraw = () => {
    setDrawingState("idle");
    setDraftPoints([]);
    setActiveZoneId(null);
  };

  const handleAddPoint = (lat: number, lng: number) => {
    setDraftPoints((prev) => [...prev, [lat, lng]]);
  };

  const onSubmit = (data: ZoneFormValues) => {
    if (draftPoints.length < 3) {
      toast({
        title: "Incomplete Polygon",
        description: "Click on the map to draw at least 3 points.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      ...data,
      polygon: draftPoints.map((p) => ({ lat: p[0], lng: p[1] })),
    };

    if (activeZoneId) {
      updateZone.mutate(
        { zoneId: activeZoneId, data: payload },
        {
          onSuccess: () => {
            toast({ title: "Zone Updated" });
            handleCancelDraw();
            refetchZones();
          },
          onError: (err) => {
            toast({ title: "Error", description: String(err), variant: "destructive" });
          },
        }
      );
    } else {
      createZone.mutate(
        { data: payload },
        {
          onSuccess: () => {
            toast({ title: "Zone Created" });
            handleCancelDraw();
            refetchZones();
          },
          onError: (err) => {
            toast({ title: "Error", description: String(err), variant: "destructive" });
          },
        }
      );
    }
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Delete this zone?")) {
      deleteZone.mutate(
        { zoneId: id },
        {
          onSuccess: () => {
            toast({ title: "Zone Deleted" });
            if (activeZoneId === id) handleCancelDraw();
            refetchZones();
          },
        }
      );
    }
  };

  if (campusLoading || zonesLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!campus) return null;

  return (
    <div className="flex-1 flex flex-col md:flex-row h-screen overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-full md:w-96 flex-shrink-0 bg-card/80 backdrop-blur-xl border-r border-border flex flex-col z-20">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold">Zones</h2>
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
              zones.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <p className="text-sm">No zones yet.</p>
                  <p className="text-xs mt-1">Click "New Zone" to draw one on the map.</p>
                </div>
              ) : (
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
                        <div
                          className="w-4 h-4 rounded-full shadow-inner flex-shrink-0"
                          style={{ backgroundColor: zone.color }}
                        />
                        <div>
                          <h4 className="font-semibold text-sm">{zone.name}</h4>
                          <span className="text-xs text-muted-foreground uppercase tracking-wider">
                            {zone.type}
                          </span>
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
              )
            ) : (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">
                    {activeZoneId ? "Edit Zone" : "Draw New Zone"}
                  </h3>
                  <Button variant="ghost" size="icon" onClick={handleCancelDraw} className="h-8 w-8">
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="bg-primary/10 text-primary px-4 py-3 rounded-lg flex items-start gap-3 text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p>Click on the map to add points. You need at least 3 points to create a zone.</p>
                </div>

                <div className="text-xs text-muted-foreground">
                  Points drawn: <strong>{draftPoints.length}</strong>
                  {draftPoints.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setDraftPoints((prev) => prev.slice(0, -1))}
                      className="ml-3 text-destructive hover:underline"
                    >
                      Undo last
                    </button>
                  )}
                </div>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Zone Name</Label>
                    <Input {...form.register("name")} placeholder="e.g. Main Quad" />
                    {form.formState.errors.name && (
                      <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Type</Label>
                    <select
                      {...form.register("type")}
                      className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {Object.values(ZoneType).map((t) => (
                        <option key={t} value={t}>
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Color</Label>
                    <div className="flex gap-3 items-center">
                      <input
                        type="color"
                        value={watchedColor}
                        onChange={(e) => form.setValue("color", e.target.value)}
                        className="w-12 h-10 rounded cursor-pointer border border-input bg-background p-1"
                      />
                      <Input
                        {...form.register("color")}
                        className="flex-1 font-mono text-sm"
                        placeholder="#6366f1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description <span className="text-muted-foreground">(optional)</span></Label>
                    <Textarea {...form.register("description")} placeholder="Brief description..." rows={2} />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={draftPoints.length < 3 || createZone.isPending || updateZone.isPending}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {createZone.isPending || updateZone.isPending
                      ? "Saving..."
                      : activeZoneId
                      ? "Save Changes"
                      : "Create Zone"}
                  </Button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Main Map */}
      <div className="flex-1 relative z-10">
        <MapContainer
          center={[campus.lat, campus.lng]}
          zoom={campus.defaultZoom}
          style={{ width: "100%", height: "100%" }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <MapDrawHandler drawingState={drawingState} onAddPoint={handleAddPoint} />

          {/* Existing Zones */}
          {zones.map((zone) => {
            if (activeZoneId === zone.id) return null;
            const positions: [number, number][] = zone.polygon.map((p) => [p.lat, p.lng]);
            return (
              <Polygon
                key={zone.id}
                positions={positions}
                pathOptions={{
                  color: zone.color,
                  fillColor: zone.color,
                  fillOpacity: 0.25,
                  weight: 2,
                }}
                eventHandlers={{
                  click: () => {
                    if (drawingState === "idle") handleEditZone(zone);
                  },
                }}
              />
            );
          })}

          {/* Draft Zone Preview */}
          {drawingState === "drawing" && draftPoints.length > 0 && (
            <>
              {draftPoints.length >= 3 ? (
                <Polygon
                  positions={draftPoints}
                  pathOptions={{
                    color: watchedColor,
                    fillColor: watchedColor,
                    fillOpacity: 0.35,
                    weight: 3,
                    dashArray: "6, 6",
                  }}
                />
              ) : (
                <Polyline
                  positions={draftPoints}
                  pathOptions={{
                    color: watchedColor,
                    weight: 3,
                    dashArray: "6, 6",
                  }}
                />
              )}
            </>
          )}
        </MapContainer>

        {drawingState === "drawing" && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] bg-black/80 text-white text-sm px-4 py-2 rounded-full shadow-xl pointer-events-none">
            {draftPoints.length < 3
              ? `Click to add point ${draftPoints.length + 1} (need ${3 - draftPoints.length} more)`
              : `${draftPoints.length} points — fill in the form and save`}
          </div>
        )}
      </div>
    </div>
  );
}
