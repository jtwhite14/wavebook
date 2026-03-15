"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConditionsDisplay } from "@/components/sessions/ConditionsDisplay";
import { toast } from "sonner";
import { formatDate, formatTime, formatRelative } from "@/lib/utils/date";
import { SurfSpot, SurfSession } from "@/lib/db/schema";
import type { MarineConditions, SurfSessionWithConditions } from "@/types";

const SpotMap = dynamic(() => import("@/components/map/SpotMap"), {
  ssr: false,
  loading: () => <div className="w-full h-[300px] bg-muted animate-pulse rounded-lg" />,
});

interface SpotWithDetails extends SurfSpot {
  sessions: SurfSessionWithConditions[];
  currentConditions?: MarineConditions | null;
}

export default function SpotDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [spot, setSpot] = useState<SpotWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingConditions, setLoadingConditions] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchSpot(params.id as string);
    }
  }, [params.id]);

  async function fetchSpot(id: string) {
    try {
      const response = await fetch(`/api/spots?id=${id}`);
      if (response.ok) {
        const data = await response.json();
        setSpot(data.spot);

        // Fetch current conditions
        setLoadingConditions(true);
        const conditionsResponse = await fetch(
          `/api/forecast?lat=${data.spot.latitude}&lng=${data.spot.longitude}&current=true`
        );
        if (conditionsResponse.ok) {
          const conditionsData = await conditionsResponse.json();
          setSpot((prev) =>
            prev ? { ...prev, currentConditions: conditionsData.conditions } : null
          );
        }
      } else {
        toast.error("Spot not found");
        router.push("/spots");
      }
    } catch (error) {
      console.error("Error fetching spot:", error);
      toast.error("Failed to load spot");
    } finally {
      setLoading(false);
      setLoadingConditions(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded w-1/4 animate-pulse"></div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-[300px] bg-muted rounded animate-pulse"></div>
          <div className="h-[300px] bg-muted rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!spot) {
    return null;
  }

  const averageRating =
    spot.sessions.length > 0
      ? spot.sessions.reduce((acc, s) => acc + s.rating, 0) / spot.sessions.length
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="-ml-2">
              <Link href="/spots">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4 mr-1"
                >
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold mt-2">{spot.name}</h1>
          <p className="text-muted-foreground">
            {parseFloat(spot.latitude).toFixed(4)},{" "}
            {parseFloat(spot.longitude).toFixed(4)}
          </p>
        </div>
        <Button asChild>
          <Link href={`/sessions/new?spotId=${spot.id}`}>Log Session</Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Map */}
        <Card>
          <CardContent className="p-0 overflow-hidden rounded-lg">
            <div className="h-[300px]">
              <SpotMap
                spots={[spot]}
                selectedSpotId={spot.id}
                interactive={false}
                initialViewState={{
                  longitude: parseFloat(spot.longitude),
                  latitude: parseFloat(spot.latitude),
                  zoom: 11,
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Current Conditions */}
        <Card>
          <CardHeader>
            <CardTitle>Current Conditions</CardTitle>
            <CardDescription>
              {loadingConditions
                ? "Loading..."
                : spot.currentConditions
                ? "Live data from Open-Meteo"
                : "No conditions data available"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingConditions ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
            ) : spot.currentConditions ? (
              <ConditionsDisplay conditions={spot.currentConditions} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Unable to fetch current conditions
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{spot.sessions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {averageRating > 0 ? averageRating.toFixed(1) : "-"}
              {averageRating > 0 && (
                <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Last Session</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {spot.sessions.length > 0
                ? formatRelative(spot.sessions[0].date)
                : "-"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sessions / Forecast tabs */}
      <Tabs defaultValue="sessions">
        <TabsList>
          <TabsTrigger value="sessions">Sessions ({spot.sessions.length})</TabsTrigger>
          <TabsTrigger value="forecast">16-Day Forecast</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="mt-4">
          {spot.sessions.length > 0 ? (
            <div className="space-y-4">
              {spot.sessions.map((session) => (
                <Link
                  key={session.id}
                  href={`/sessions/${session.id}`}
                  className="block"
                >
                  <Card className="hover:bg-muted/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {formatDate(session.date)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatTime(session.startTime)}
                            {session.endTime && ` - ${formatTime(session.endTime)}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <svg
                                key={i}
                                className={`w-4 h-4 ${
                                  i < session.rating
                                    ? "text-yellow-400"
                                    : "text-muted-foreground/40"
                                }`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                        </div>
                      </div>
                      {session.notes && (
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                          {session.notes}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground mb-4">
                  No sessions logged at this spot yet
                </p>
                <Button asChild>
                  <Link href={`/sessions/new?spotId=${spot.id}`}>
                    Log First Session
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="forecast" className="mt-4">
          <ForecastDisplay spotId={spot.id} lat={parseFloat(spot.latitude)} lng={parseFloat(spot.longitude)} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ForecastDisplay({ spotId, lat, lng }: { spotId: string; lat: number; lng: number }) {
  const [forecast, setForecast] = useState<MarineConditions[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchForecast() {
      try {
        const response = await fetch(`/api/forecast?lat=${lat}&lng=${lng}&spotId=${spotId}`);
        if (response.ok) {
          const data = await response.json();
          setForecast(data.forecast?.hourly || []);
        }
      } catch (error) {
        console.error("Error fetching forecast:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchForecast();
  }, [spotId, lat, lng]);

  if (loading) {
    return <div className="animate-pulse h-64 bg-muted rounded"></div>;
  }

  // Group forecast by day and show daily summary
  const dailyForecast = forecast.reduce((acc, hour) => {
    const date = new Date(hour.timestamp).toDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(hour);
    return acc;
  }, {} as Record<string, MarineConditions[]>);

  const days = Object.entries(dailyForecast).slice(0, 16);

  if (days.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">No forecast data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {days.map(([date, hours]) => {
        // Get midday conditions (or first available)
        const middayHour = hours.find((h) => new Date(h.timestamp).getHours() === 12) || hours[0];
        const maxWave = Math.max(...hours.map((h) => h.waveHeight || 0));
        const minWave = Math.min(...hours.filter((h) => h.waveHeight).map((h) => h.waveHeight || 0));

        return (
          <Card key={date}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{formatDate(date)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Waves</span>
                  <span>{minWave.toFixed(1)} - {maxWave.toFixed(1)}m</span>
                </div>
                {middayHour.primarySwellPeriod && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Period</span>
                    <span>{middayHour.primarySwellPeriod.toFixed(0)}s</span>
                  </div>
                )}
                {middayHour.windSpeed !== null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Wind</span>
                    <span>{middayHour.windSpeed.toFixed(0)} km/h</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
