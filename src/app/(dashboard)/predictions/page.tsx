"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PredictionCard } from "@/components/predictions/PredictionCard";
import { toast } from "sonner";
import { SurfPrediction, AvailabilityWindow, SurfSessionWithConditions } from "@/types";
import { SurfSpot } from "@/lib/db/schema";
import { generatePredictions, getBestSurfWindows } from "@/lib/matching/conditions";
import { formatDate, formatTime } from "@/lib/utils/date";

export default function PredictionsPage() {
  const [spots, setSpots] = useState<SurfSpot[]>([]);
  const [sessions, setSessions] = useState<SurfSessionWithConditions[]>([]);
  const [selectedSpotId, setSelectedSpotId] = useState<string>("all");
  const [predictions, setPredictions] = useState<SurfPrediction[]>([]);
  const [availability, setAvailability] = useState<AvailabilityWindow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (spots.length > 0 && sessions.length > 0) {
      generateAllPredictions();
    }
  }, [spots, sessions, selectedSpotId, availability]);

  async function fetchInitialData() {
    try {
      const [spotsRes, sessionsRes, calendarRes] = await Promise.all([
        fetch("/api/spots"),
        fetch("/api/sessions"),
        fetch("/api/calendar"),
      ]);

      if (spotsRes.ok) {
        const data = await spotsRes.json();
        setSpots(data.spots || []);
      }

      if (sessionsRes.ok) {
        const data = await sessionsRes.json();
        setSessions(data.sessions || []);
      }

      if (calendarRes.ok) {
        const data = await calendarRes.json();
        setCalendarConnected(data.connected);
        setAvailability(data.availability || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function generateAllPredictions() {
    setLoadingPredictions(true);

    const spotsToProcess =
      selectedSpotId === "all"
        ? spots
        : spots.filter((s) => s.id === selectedSpotId);

    const allPredictions: SurfPrediction[] = [];

    for (const spot of spotsToProcess) {
      try {
        const forecastRes = await fetch(
          `/api/forecast?lat=${spot.latitude}&lng=${spot.longitude}&spotId=${spot.id}`
        );

        if (forecastRes.ok) {
          const data = await forecastRes.json();
          const hourlyForecast = data.forecast?.hourly || [];

          // Filter to reasonable surf hours (6am - 7pm)
          const filteredForecast = hourlyForecast.filter((h: { timestamp: Date }) => {
            const hour = new Date(h.timestamp).getHours();
            return hour >= 6 && hour <= 19;
          });

          // Sample every 3 hours to avoid too many predictions
          const sampledForecast = filteredForecast.filter(
            (_: unknown, i: number) => i % 3 === 0
          );

          const spotPredictions = generatePredictions(
            spot.id,
            spot.name,
            sampledForecast,
            sessions,
            availability
          );

          allPredictions.push(...spotPredictions);
        }
      } catch (error) {
        console.error(`Error fetching forecast for ${spot.name}:`, error);
      }
    }

    // Get best windows
    const bestWindows = getBestSurfWindows(allPredictions, 20);
    setPredictions(bestWindows);
    setLoadingPredictions(false);
  }

  const goldenWindows = predictions.filter((p) => p.isGoldenWindow);
  const otherPredictions = predictions.filter((p) => !p.isGoldenWindow);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded w-1/4 animate-pulse"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-muted rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (spots.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Surf Predictions</h1>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-4">
              Add some surf spots to get personalized predictions
            </p>
            <Button asChild>
              <Link href="/spots">Add Spots</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Surf Predictions</h1>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-4">
              Log some surf sessions to get personalized predictions based on your
              history
            </p>
            <Button asChild>
              <Link href="/sessions/new">Log a Session</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Surf Predictions</h1>
          <p className="text-muted-foreground">
            Based on your {sessions.length} past session
            {sessions.length !== 1 ? "s" : ""}
          </p>
        </div>

        {!calendarConnected && (
          <Button variant="outline" asChild>
            <Link href="/settings">Connect Calendar</Link>
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <Select value={selectedSpotId} onValueChange={setSelectedSpotId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All spots" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All spots</SelectItem>
            {spots.map((spot) => (
              <SelectItem key={spot.id} value={spot.id}>
                {spot.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {loadingPredictions && (
          <span className="text-sm text-muted-foreground flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Generating predictions...
          </span>
        )}
      </div>

      {/* Calendar status */}
      {calendarConnected && availability.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Calendar Connected
              </Badge>
              <span className="text-muted-foreground">
                Found {availability.length} free windows this week
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Predictions */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">
            All Predictions ({predictions.length})
          </TabsTrigger>
          <TabsTrigger value="golden">
            Golden Windows ({goldenWindows.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4 space-y-4">
          {predictions.length > 0 ? (
            predictions.map((prediction, index) => (
              <PredictionCard key={index} prediction={prediction} />
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">
                  {loadingPredictions
                    ? "Analyzing conditions..."
                    : "No predictions found matching your past sessions"}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="golden" className="mt-4 space-y-4">
          {goldenWindows.length > 0 ? (
            goldenWindows.map((prediction, index) => (
              <PredictionCard key={index} prediction={prediction} />
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground mb-2">
                  No golden windows found
                </p>
                <p className="text-sm text-muted-foreground">
                  {calendarConnected
                    ? "Golden windows appear when good surf conditions align with your free time"
                    : "Connect your calendar to see when good conditions match your availability"}
                </p>
                {!calendarConnected && (
                  <Button variant="outline" asChild className="mt-4">
                    <Link href="/settings">Connect Calendar</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How Predictions Work</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            SurfSync compares upcoming forecast conditions to your past sessions
            to find similar conditions to days you rated highly.
          </p>
          <p>Matching criteria:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Wave height within ±0.5m</li>
            <li>Swell direction within ±30°</li>
            <li>Swell period within ±3 seconds</li>
            <li>Wind speed within ±10 km/h</li>
          </ul>
          <p>
            The more sessions you log, the more accurate predictions become!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
