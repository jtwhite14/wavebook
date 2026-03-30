"use client";

import { Users, Link2Off } from "lucide-react";
import type { SharedSpotView } from "@/types";

interface SharedSpotsListProps {
  sharedSpots: SharedSpotView[];
  onSpotClick: (sharedSpot: SharedSpotView) => void;
  selectedShareId?: string;
}

export function SharedSpotsList({ sharedSpots, onSpotClick, selectedShareId }: SharedSpotsListProps) {
  if (sharedSpots.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-2.5">
        <Users className="size-3.5 text-muted-foreground" />
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Shared with you</p>
      </div>
      {sharedSpots.map((shared) => (
        <button
          key={shared.shareId}
          onClick={() => onSpotClick(shared)}
          className={`flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50 transition-colors w-full text-left ${
            selectedShareId === shared.shareId ? "bg-accent" : ""
          }`}
        >
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-medium truncate ${shared.status === "revoked" ? "text-muted-foreground" : ""}`}>
              {shared.spot.name}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {shared.status === "revoked" ? (
                <span className="flex items-center gap-1">
                  <Link2Off className="size-3 inline" />
                  Sessions no longer shared
                </span>
              ) : (
                <>
                  Shared by {shared.sharedBy.name || "Unknown"}
                  {shared.highRatedSessionCount > 0 && (
                    <> &middot; {shared.highRatedSessionCount} session{shared.highRatedSessionCount !== 1 ? "s" : ""}</>
                  )}
                </>
              )}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
