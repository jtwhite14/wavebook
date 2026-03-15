"use client";

interface DirectionStripProps {
  directions: (number | null)[];
  sessionIndex: number;
}

export function DirectionStrip({ directions, sessionIndex }: DirectionStripProps) {
  return (
    <div className="flex items-center justify-between px-2 py-1">
      {directions.map((deg, i) => (
        <div
          key={i}
          className={`flex items-center justify-center w-6 h-6 rounded-full text-xs
            ${i === sessionIndex ? "bg-primary/20 ring-1 ring-primary" : ""}`}
        >
          {deg != null ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              className="text-muted-foreground"
              style={{ transform: `rotate(${deg}deg)` }}
            >
              <path
                d="M7 1L10 10H4L7 1Z"
                fill="currentColor"
              />
            </svg>
          ) : (
            <span className="text-muted-foreground/40">-</span>
          )}
        </div>
      ))}
    </div>
  );
}
