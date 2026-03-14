"use client";

import { SurfSpot } from "@/lib/db/schema";

interface SpotMarkerProps {
  spot: SurfSpot;
  isSelected?: boolean;
}

export default function SpotMarker({ spot, isSelected }: SpotMarkerProps) {
  return (
    <div className="relative group cursor-pointer">
      {/* Marker */}
      <div
        className={`
          w-8 h-8 rounded-full border-2 shadow-lg flex items-center justify-center
          transition-all duration-200 ease-in-out
          ${
            isSelected
              ? "bg-blue-600 border-white scale-125"
              : "bg-blue-500 border-white hover:scale-110"
          }
        `}
      >
        <span className="text-white text-sm">🏄</span>
      </div>

      {/* Tooltip */}
      <div
        className={`
          absolute bottom-full left-1/2 -translate-x-1/2 mb-2
          px-2 py-1 bg-background border rounded-md shadow-lg
          whitespace-nowrap text-sm font-medium
          opacity-0 group-hover:opacity-100 transition-opacity
          pointer-events-none
        `}
      >
        {spot.name}
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 -mt-1
                     border-4 border-transparent border-t-background"
        />
      </div>

      {/* Selection ring */}
      {isSelected && (
        <div className="absolute -inset-1 bg-blue-500/20 rounded-full animate-pulse" />
      )}
    </div>
  );
}
