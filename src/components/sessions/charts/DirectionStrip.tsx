"use client";

import { useState } from "react";
import { getDirectionText } from "@/lib/api/open-meteo";

interface DirectionStripProps {
  directions: (number | null)[];
  sessionIndex: number;
  label?: string;
}

export function DirectionStrip({ directions, sessionIndex, label }: DirectionStripProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div className="flex items-center gap-2 px-5 pt-1.5 pb-0.5">
      {label && (
        <span className="text-[10px] text-white/20 font-medium tracking-wide shrink-0 w-[70px]">
          {label}
        </span>
      )}
      <div className="flex items-center justify-between flex-1">
        {directions.map((deg, i) => {
          const isSession = i === sessionIndex;
          const isHovered = i === hoveredIndex;
          const showLabel = isSession || isHovered;
          const compass = deg != null ? getDirectionText(deg) : null;

          return (
            <div
              key={i}
              className="flex flex-col items-center gap-0.5 cursor-default"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div
                className={`flex items-center justify-center w-5 h-5 rounded-full transition-colors
                  ${isSession ? "bg-primary/15" : isHovered ? "bg-white/5" : ""}`}
              >
                {deg != null ? (
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    className={`transition-colors ${isSession ? "text-primary" : isHovered ? "text-white/50" : "text-white/25"}`}
                    style={{ transform: `rotate(${deg}deg)` }}
                  >
                    <path d="M5 1L7.5 8H2.5L5 1Z" fill="currentColor" />
                  </svg>
                ) : (
                  <span className="text-white/10 text-[9px]">-</span>
                )}
              </div>
              {showLabel && compass && (
                <span className={`text-[9px] font-medium ${isSession ? "text-primary/70" : "text-white/40"}`}>
                  {compass}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
