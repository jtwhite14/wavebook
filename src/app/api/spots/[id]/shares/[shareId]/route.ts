import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { db, spotShares, loggedFriendSessions, surfSessions } from "@/lib/db";
import { eq, and, inArray } from "drizzle-orm";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; shareId: string }> }
) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: spotId, shareId } = await params;

    // Find the share first
    const share = await db.query.spotShares.findFirst({
      where: and(
        eq(spotShares.id, shareId),
        eq(spotShares.sharedByUserId, userId)
      ),
    });

    if (!share) {
      return NextResponse.json({ error: "Share not found" }, { status: 404 });
    }

    // If the share was claimed by a friend, soft-revoke it so the spot
    // stays on their account but sessions are no longer shared
    if (share.sharedWithUserId) {
      await db
        .update(spotShares)
        .set({ status: "revoked" })
        .where(eq(spotShares.id, shareId));

      const friendUserId = share.sharedWithUserId;

      // Clean up logged friend sessions
      const friendSessionIds = await db.query.surfSessions.findMany({
        where: and(eq(surfSessions.spotId, spotId), eq(surfSessions.userId, friendUserId)),
        columns: { id: true },
      });

      const ownerSessionIds = await db.query.surfSessions.findMany({
        where: and(eq(surfSessions.spotId, spotId), eq(surfSessions.userId, userId)),
        columns: { id: true },
      });

      if (friendSessionIds.length > 0) {
        await db.delete(loggedFriendSessions).where(
          and(
            eq(loggedFriendSessions.userId, userId),
            inArray(loggedFriendSessions.sessionId, friendSessionIds.map((s) => s.id))
          )
        );
      }

      if (ownerSessionIds.length > 0) {
        await db.delete(loggedFriendSessions).where(
          and(
            eq(loggedFriendSessions.userId, friendUserId),
            inArray(loggedFriendSessions.sessionId, ownerSessionIds.map((s) => s.id))
          )
        );
      }
    } else {
      // Unclaimed link — just delete it
      await db
        .delete(spotShares)
        .where(eq(spotShares.id, shareId));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error revoking share:", error);
    return NextResponse.json({ error: "Failed to revoke share" }, { status: 500 });
  }
}
