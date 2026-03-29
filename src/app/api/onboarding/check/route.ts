import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { db, surfSessions, spotShares, users } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";

export async function GET() {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [sessions, user, acceptedShare] = await Promise.all([
      db.query.surfSessions.findMany({
        where: eq(surfSessions.userId, userId),
      }),
      db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { phoneNumber: true },
      }),
      db.query.spotShares.findFirst({
        where: and(
          eq(spotShares.sharedWithUserId, userId),
          eq(spotShares.status, "accepted")
        ),
        orderBy: desc(spotShares.respondedAt),
        columns: { id: true },
      }),
    ]);

    // Invited user who hasn't completed invite onboarding yet
    if (acceptedShare && !user?.phoneNumber && sessions.length === 0) {
      return NextResponse.json({
        needsOnboarding: true,
        onboardingUrl: `/onboarding/invite?shareId=${acceptedShare.id}`,
        sessionCount: 0,
      });
    }

    // Invited user who has completed onboarding (has phone or sessions) — skip photo onboarding
    if (acceptedShare) {
      return NextResponse.json({
        needsOnboarding: false,
        sessionCount: sessions.length,
      });
    }

    // Organic user with no sessions — photo onboarding
    if (sessions.length === 0) {
      return NextResponse.json({
        needsOnboarding: true,
        onboardingUrl: "/onboarding",
        sessionCount: 0,
      });
    }

    // Has sessions — no onboarding needed
    return NextResponse.json({
      needsOnboarding: false,
      sessionCount: sessions.length,
    });
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    return NextResponse.json(
      { error: "Failed to check onboarding status" },
      { status: 500 }
    );
  }
}
