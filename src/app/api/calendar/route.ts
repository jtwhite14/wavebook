import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, users, accounts } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import {
  refreshAccessToken,
  fetchCalendarEvents,
  calculateAvailability,
} from "@/lib/api/google-calendar";
import { addDays } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's Google account
    const googleAccount = await db.query.accounts.findFirst({
      where: and(
        eq(accounts.userId, session.user.id),
        eq(accounts.provider, "google")
      ),
    });

    if (!googleAccount?.refresh_token) {
      return NextResponse.json({
        connected: false,
        message: "Google Calendar not connected",
      });
    }

    try {
      // Get fresh access token
      const accessToken = await refreshAccessToken(googleAccount.refresh_token);

      // Fetch events for the next 14 days
      const startDate = new Date();
      const endDate = addDays(new Date(), 14);

      const events = await fetchCalendarEvents(accessToken, startDate, endDate);

      // Calculate availability windows
      const availability = calculateAvailability(
        events,
        startDate,
        endDate,
        6, // Day starts at 6am
        20, // Day ends at 8pm
        60 // Minimum 1 hour window
      );

      return NextResponse.json({
        connected: true,
        events: events.slice(0, 50), // Limit events returned
        availability,
      });
    } catch (error) {
      console.error("Error fetching calendar:", error);

      // Check if it's an auth error
      if (error instanceof Error && error.message === "ACCESS_TOKEN_EXPIRED") {
        return NextResponse.json({
          connected: false,
          message: "Calendar access expired. Please reconnect.",
        });
      }

      return NextResponse.json({
        connected: true,
        events: [],
        availability: [],
        error: "Failed to fetch calendar events",
      });
    }
  } catch (error) {
    console.error("Error in calendar route:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar" },
      { status: 500 }
    );
  }
}
