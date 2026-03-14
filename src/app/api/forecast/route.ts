import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, spotForecasts, surfSpots } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import {
  fetchMarineForecast,
  fetchCurrentConditions,
} from "@/lib/api/open-meteo";

// Cache forecasts for 1 hour
const CACHE_DURATION = 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const spotId = searchParams.get("spotId");
    const current = searchParams.get("current") === "true";

    if (!lat || !lng) {
      return NextResponse.json(
        { error: "Latitude and longitude required" },
        { status: 400 }
      );
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: "Invalid coordinates" },
        { status: 400 }
      );
    }

    // If requesting current conditions only
    if (current) {
      const conditions = await fetchCurrentConditions(latitude, longitude);
      return NextResponse.json({ conditions });
    }

    // Check if we have a cached forecast for this spot
    if (spotId) {
      // Verify spot belongs to user
      const spot = await db.query.surfSpots.findFirst({
        where: and(
          eq(surfSpots.id, spotId),
          eq(surfSpots.userId, session.user.id)
        ),
      });

      if (!spot) {
        return NextResponse.json({ error: "Spot not found" }, { status: 404 });
      }

      // Check for cached forecast
      const cachedForecast = await db.query.spotForecasts.findFirst({
        where: eq(spotForecasts.spotId, spotId),
        orderBy: (forecasts, { desc }) => [desc(forecasts.fetchedAt)],
      });

      if (cachedForecast) {
        const cacheAge = Date.now() - new Date(cachedForecast.fetchedAt).getTime();
        if (cacheAge < CACHE_DURATION) {
          return NextResponse.json({
            forecast: cachedForecast.forecastData,
            cached: true,
            fetchedAt: cachedForecast.fetchedAt,
          });
        }
      }
    }

    // Fetch fresh forecast
    const forecast = await fetchMarineForecast(latitude, longitude);

    // Cache the forecast if we have a spotId
    if (spotId) {
      // Delete old cached forecasts for this spot
      await db.delete(spotForecasts).where(eq(spotForecasts.spotId, spotId));

      // Insert new forecast
      await db.insert(spotForecasts).values({
        spotId,
        forecastData: forecast,
        fetchedAt: new Date(),
      });
    }

    return NextResponse.json({
      forecast,
      cached: false,
      fetchedAt: new Date(),
    });
  } catch (error) {
    console.error("Error fetching forecast:", error);
    return NextResponse.json(
      { error: "Failed to fetch forecast" },
      { status: 500 }
    );
  }
}
