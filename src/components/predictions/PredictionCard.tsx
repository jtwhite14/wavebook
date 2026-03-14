"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatTime, formatDuration } from "@/lib/utils/date";
import { formatWaveHeight, formatWavePeriod, formatWindSpeed, getDirectionText } from "@/lib/api/open-meteo";
import { SurfPrediction } from "@/types";
import { ConditionMatch } from "./ConditionMatch";

interface PredictionCardProps {
  prediction: SurfPrediction;
}

export function PredictionCard({ prediction }: PredictionCardProps) {
  const { conditions, similarSessions, confidence, isGoldenWindow, availabilityWindow } = prediction;

  return (
    <Card className={isGoldenWindow ? "border-yellow-400 border-2" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold">{prediction.spotName}</h3>
              {isGoldenWindow && (
                <Badge className="bg-yellow-500 hover:bg-yellow-600">
                  Golden Window
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {formatDate(prediction.timestamp)} at {formatTime(prediction.timestamp)}
            </p>

            {/* Conditions */}
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              {conditions.waveHeight !== null && (
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {formatWaveHeight(conditions.waveHeight)}
                </span>
              )}
              {conditions.primarySwellPeriod !== null && (
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  {formatWavePeriod(conditions.primarySwellPeriod)}
                </span>
              )}
              {conditions.primarySwellDirection !== null && (
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                  {getDirectionText(conditions.primarySwellDirection)}
                </span>
              )}
              {conditions.windSpeed !== null && (
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                  {formatWindSpeed(conditions.windSpeed)}
                </span>
              )}
            </div>

            {/* Availability */}
            {availabilityWindow && (
              <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                You're free: {formatTime(availabilityWindow.start)} -{" "}
                {formatTime(availabilityWindow.end)} ({formatDuration(availabilityWindow.duration)})
              </p>
            )}

            {/* Similar Sessions */}
            {similarSessions.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Similar Past Sessions
                </p>
                {similarSessions.map((match) => (
                  <ConditionMatch key={match.sessionId} match={match} />
                ))}
              </div>
            )}
          </div>

          {/* Confidence */}
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold">{confidence}%</div>
            <p className="text-xs text-muted-foreground">confidence</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
