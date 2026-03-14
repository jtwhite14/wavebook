"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { SurfSpot } from "@/lib/db/schema";

// Dynamic import for map to avoid SSR issues
const SpotMap = dynamic(() => import("@/components/map/SpotMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] bg-muted animate-pulse rounded-lg" />
  ),
});

export default function SpotsPage() {
  const router = useRouter();
  const [spots, setSpots] = useState<SurfSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpot, setSelectedSpot] = useState<SurfSpot | null>(null);
  const [newSpotMarker, setNewSpotMarker] = useState<{ lat: number; lng: number } | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newSpotName, setNewSpotName] = useState("");
  const [newSpotDescription, setNewSpotDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSpots();
  }, []);

  async function fetchSpots() {
    try {
      const response = await fetch("/api/spots");
      if (response.ok) {
        const data = await response.json();
        setSpots(data.spots || []);
      }
    } catch (error) {
      console.error("Error fetching spots:", error);
      toast.error("Failed to load spots");
    } finally {
      setLoading(false);
    }
  }

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setNewSpotMarker({ lat, lng });
    setIsAddDialogOpen(true);
    setSelectedSpot(null);
  }, []);

  const handleSpotClick = useCallback((spot: SurfSpot) => {
    setSelectedSpot(spot);
    setNewSpotMarker(null);
  }, []);

  const handleAddSpot = async () => {
    if (!newSpotMarker || !newSpotName.trim()) {
      toast.error("Please enter a spot name");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/spots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSpotName.trim(),
          latitude: newSpotMarker.lat,
          longitude: newSpotMarker.lng,
          description: newSpotDescription.trim() || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSpots((prev) => [...prev, data.spot]);
        setNewSpotMarker(null);
        setIsAddDialogOpen(false);
        setNewSpotName("");
        setNewSpotDescription("");
        toast.success("Spot added successfully!");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to add spot");
      }
    } catch (error) {
      console.error("Error adding spot:", error);
      toast.error("Failed to add spot");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSpot = async (spotId: string) => {
    if (!confirm("Are you sure you want to delete this spot?")) return;

    try {
      const response = await fetch(`/api/spots?id=${spotId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSpots((prev) => prev.filter((s) => s.id !== spotId));
        setSelectedSpot(null);
        toast.success("Spot deleted");
      } else {
        toast.error("Failed to delete spot");
      }
    } catch (error) {
      console.error("Error deleting spot:", error);
      toast.error("Failed to delete spot");
    }
  };

  const handleCancelAdd = () => {
    setIsAddDialogOpen(false);
    setNewSpotMarker(null);
    setNewSpotName("");
    setNewSpotDescription("");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded w-1/4 animate-pulse"></div>
        <div className="h-[500px] bg-muted rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Surf Spots</h1>
          <p className="text-muted-foreground">
            Click on the map to add a new spot
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {spots.length} spot{spots.length !== 1 ? "s" : ""}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Map */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-0 overflow-hidden rounded-lg">
              <div className="h-[500px]">
                <SpotMap
                  spots={spots}
                  onMapClick={handleMapClick}
                  onSpotClick={handleSpotClick}
                  selectedSpotId={selectedSpot?.id}
                  newSpotMarker={newSpotMarker}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Spot details / list */}
        <div className="space-y-4">
          {selectedSpot ? (
            <Card>
              <CardHeader>
                <CardTitle>{selectedSpot.name}</CardTitle>
                <CardDescription>
                  {parseFloat(selectedSpot.latitude).toFixed(4)},{" "}
                  {parseFloat(selectedSpot.longitude).toFixed(4)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedSpot.description && (
                  <p className="text-sm text-muted-foreground">
                    {selectedSpot.description}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => router.push(`/spots/${selectedSpot.id}`)}
                  >
                    View Details
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDeleteSpot(selectedSpot.id)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-4 h-4"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Your Spots</CardTitle>
                <CardDescription>
                  {spots.length
                    ? "Select a spot on the map to view details"
                    : "Click on the map to add your first spot"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {spots.length > 0 && (
                  <div className="space-y-2">
                    {spots.map((spot) => (
                      <button
                        key={spot.id}
                        onClick={() => setSelectedSpot(spot)}
                        className="w-full p-3 text-left rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <p className="font-medium">{spot.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {parseFloat(spot.latitude).toFixed(4)},{" "}
                          {parseFloat(spot.longitude).toFixed(4)}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add spot dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Spot</DialogTitle>
            <DialogDescription>
              {newSpotMarker && (
                <>
                  Location: {newSpotMarker.lat.toFixed(4)},{" "}
                  {newSpotMarker.lng.toFixed(4)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Spot Name</Label>
              <Input
                id="name"
                placeholder="e.g., Ocean Beach, Pipeline..."
                value={newSpotName}
                onChange={(e) => setNewSpotName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Any notes about this spot..."
                value={newSpotDescription}
                onChange={(e) => setNewSpotDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancelAdd}>
              Cancel
            </Button>
            <Button onClick={handleAddSpot} disabled={isSaving || !newSpotName.trim()}>
              {isSaving ? "Adding..." : "Add Spot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
