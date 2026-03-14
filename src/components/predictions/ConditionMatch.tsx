"use client";

import Link from "next/link";
import { formatDate } from "@/lib/utils/date";
import { ConditionMatch as ConditionMatchType } from "@/types";

interface ConditionMatchProps {
  match: ConditionMatchType;
}

export function ConditionMatch({ match }: ConditionMatchProps) {
  return (
    <Link
      href={`/sessions/${match.sessionId}`}
      className="block p-2 rounded border hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{match.spotName}</p>
          <p className="text-xs text-muted-foreground">
            {formatDate(match.sessionDate)}
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg
                key={i}
                className={`w-3 h-3 ${
                  i < match.rating ? "text-yellow-400" : "text-gray-300"
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{match.matchScore}% match</p>
        </div>
      </div>

      {/* Match factors */}
      <div className="mt-2 flex flex-wrap gap-1">
        {match.matchingFactors.waveHeight && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
            waves
          </span>
        )}
        {match.matchingFactors.swellDirection && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
            direction
          </span>
        )}
        {match.matchingFactors.swellPeriod && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
            period
          </span>
        )}
        {match.matchingFactors.windSpeed && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
            wind
          </span>
        )}
      </div>
    </Link>
  );
}
