import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { db, spotShares, surfSessions } from "@/lib/db";
import { eq, and, gte, count, inArray } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shares = await db.query.spotShares.findMany({
      where: and(
        eq(spotShares.sharedWithUserId, userId),
        inArray(spotShares.status, ["accepted", "revoked"])
      ),
      with: {
        spot: {
          columns: { id: true, name: true, latitude: true, longitude: true, description: true },
        },
        sharedBy: {
          columns: { id: true, name: true },
        },
      },
    });

    // Get high-rated session counts for each share (skip for revoked)
    const results = await Promise.all(
      shares.map(async (share) => {
        let highRatedSessionCount = 0;
        if (share.status === "accepted") {
          const [sessionCount] = await db
            .select({ count: count() })
            .from(surfSessions)
            .where(and(
              eq(surfSessions.spotId, share.spotId),
              eq(surfSessions.userId, share.sharedByUserId),
              gte(surfSessions.rating, 3)
            ));
          highRatedSessionCount = sessionCount.count;
        }

        return {
          shareId: share.id,
          status: share.status as "accepted" | "revoked",
          spot: share.spot,
          sharedBy: share.sharedBy,
          highRatedSessionCount,
        };
      })
    );

    return NextResponse.json({ sharedSpots: results });
  } catch (error) {
    console.error("Error fetching shared spots:", error);
    return NextResponse.json({ error: "Failed to fetch shared spots" }, { status: 500 });
  }
}
