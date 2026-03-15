"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatTime } from "@/lib/utils/date";
import { formatWaveHeight, formatWindSpeed } from "@/lib/api/open-meteo";
import { SurfSessionWithConditions } from "@/types";

interface SessionCardProps {
  session: SurfSessionWithConditions;
}

export function SessionCard({ session }: SessionCardProps) {
  return (
    <Link href={`/sessions/${session.id}`} className="block">
      <Card className="hover:bg-muted/50 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium truncate">{session.spot?.name}</h3>
                {session.photoUrl && (
                  <Badge variant="secondary" className="shrink-0">Photo</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {formatDate(session.date)} at {formatTime(session.startTime)}
                {session.endTime && ` - ${formatTime(session.endTime)}`}
              </p>
              {session.notes && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                  {session.notes}
                </p>
              )}
              {session.conditions && (
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {session.conditions.waveHeight && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-500/15 text-blue-400">
                      {formatWaveHeight(parseFloat(session.conditions.waveHeight))}
                    </span>
                  )}
                  {session.conditions.primarySwellPeriod && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-500/15 text-green-400">
                      {parseFloat(session.conditions.primarySwellPeriod).toFixed(0)}s
                    </span>
                  )}
                  {session.conditions.windSpeed && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-500/15 text-gray-400">
                      {formatWindSpeed(parseFloat(session.conditions.windSpeed))}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col items-end shrink-0">
              <div className="flex items-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg
                    key={i}
                    className={`w-4 h-4 ${
                      i < session.rating ? "text-yellow-400" : "text-muted-foreground/40"
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              {session.photoUrl && (
                <div className="mt-2 w-16 h-16 rounded overflow-hidden">
                  <img
                    src={session.photoUrl}
                    alt="Session"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
