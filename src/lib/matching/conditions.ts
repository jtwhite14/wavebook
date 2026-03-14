import {
  MarineConditions,
  ConditionMatch,
  SurfPrediction,
  AvailabilityWindow,
  SurfSessionWithConditions,
} from "@/types";

// Matching thresholds based on the plan
const THRESHOLDS = {
  waveHeight: 0.5, // ±0.5m
  swellDirection: 30, // ±30°
  swellPeriod: 3, // ±3s
  windSpeed: 10, // ±10 km/h
};

/**
 * Calculate if two values are within threshold
 */
function isWithinThreshold(
  value1: number | null,
  value2: number | null,
  threshold: number
): boolean {
  if (value1 === null || value2 === null) return false;
  return Math.abs(value1 - value2) <= threshold;
}

/**
 * Calculate angle difference accounting for wrap-around (0-360)
 */
function angleDifference(angle1: number | null, angle2: number | null): number {
  if (angle1 === null || angle2 === null) return Infinity;
  let diff = Math.abs(angle1 - angle2);
  if (diff > 180) diff = 360 - diff;
  return diff;
}

/**
 * Check if direction is within threshold
 */
function isDirectionMatch(
  dir1: number | null,
  dir2: number | null,
  threshold: number
): boolean {
  return angleDifference(dir1, dir2) <= threshold;
}

/**
 * Calculate match score between forecast conditions and session conditions
 */
export function calculateMatchScore(
  forecast: MarineConditions,
  session: MarineConditions
): {
  score: number;
  factors: ConditionMatch["matchingFactors"];
} {
  const factors = {
    waveHeight: isWithinThreshold(
      forecast.waveHeight,
      session.waveHeight,
      THRESHOLDS.waveHeight
    ),
    swellDirection: isDirectionMatch(
      forecast.primarySwellDirection,
      session.primarySwellDirection,
      THRESHOLDS.swellDirection
    ),
    swellPeriod: isWithinThreshold(
      forecast.primarySwellPeriod,
      session.primarySwellPeriod,
      THRESHOLDS.swellPeriod
    ),
    windSpeed: isWithinThreshold(
      forecast.windSpeed,
      session.windSpeed,
      THRESHOLDS.windSpeed
    ),
  };

  // Calculate weighted score
  const weights = {
    waveHeight: 30,
    swellDirection: 25,
    swellPeriod: 25,
    windSpeed: 20,
  };

  let score = 0;
  let totalWeight = 0;

  if (forecast.waveHeight !== null && session.waveHeight !== null) {
    const heightDiff = Math.abs(forecast.waveHeight - session.waveHeight);
    const heightScore = Math.max(0, 1 - heightDiff / (THRESHOLDS.waveHeight * 2));
    score += heightScore * weights.waveHeight;
    totalWeight += weights.waveHeight;
  }

  if (forecast.primarySwellDirection !== null && session.primarySwellDirection !== null) {
    const dirDiff = angleDifference(
      forecast.primarySwellDirection,
      session.primarySwellDirection
    );
    const dirScore = Math.max(0, 1 - dirDiff / (THRESHOLDS.swellDirection * 2));
    score += dirScore * weights.swellDirection;
    totalWeight += weights.swellDirection;
  }

  if (forecast.primarySwellPeriod !== null && session.primarySwellPeriod !== null) {
    const periodDiff = Math.abs(forecast.primarySwellPeriod - session.primarySwellPeriod);
    const periodScore = Math.max(0, 1 - periodDiff / (THRESHOLDS.swellPeriod * 2));
    score += periodScore * weights.swellPeriod;
    totalWeight += weights.swellPeriod;
  }

  if (forecast.windSpeed !== null && session.windSpeed !== null) {
    const windDiff = Math.abs(forecast.windSpeed - session.windSpeed);
    const windScore = Math.max(0, 1 - windDiff / (THRESHOLDS.windSpeed * 2));
    score += windScore * weights.windSpeed;
    totalWeight += weights.windSpeed;
  }

  const finalScore = totalWeight > 0 ? (score / totalWeight) * 100 : 0;

  return {
    score: Math.round(finalScore),
    factors,
  };
}

/**
 * Convert session conditions from DB format to MarineConditions
 */
export function sessionConditionsToMarine(
  conditions: SurfSessionWithConditions["conditions"]
): MarineConditions | null {
  if (!conditions) return null;

  return {
    waveHeight: conditions.waveHeight ? parseFloat(conditions.waveHeight) : null,
    wavePeriod: conditions.wavePeriod ? parseFloat(conditions.wavePeriod) : null,
    waveDirection: conditions.waveDirection ? parseFloat(conditions.waveDirection) : null,
    primarySwellHeight: conditions.primarySwellHeight
      ? parseFloat(conditions.primarySwellHeight)
      : null,
    primarySwellPeriod: conditions.primarySwellPeriod
      ? parseFloat(conditions.primarySwellPeriod)
      : null,
    primarySwellDirection: conditions.primarySwellDirection
      ? parseFloat(conditions.primarySwellDirection)
      : null,
    secondarySwellHeight: conditions.secondarySwellHeight
      ? parseFloat(conditions.secondarySwellHeight)
      : null,
    secondarySwellPeriod: conditions.secondarySwellPeriod
      ? parseFloat(conditions.secondarySwellPeriod)
      : null,
    secondarySwellDirection: conditions.secondarySwellDirection
      ? parseFloat(conditions.secondarySwellDirection)
      : null,
    windSpeed: conditions.windSpeed ? parseFloat(conditions.windSpeed) : null,
    windDirection: conditions.windDirection ? parseFloat(conditions.windDirection) : null,
    seaSurfaceTemp: conditions.seaSurfaceTemp
      ? parseFloat(conditions.seaSurfaceTemp)
      : null,
    timestamp: conditions.timestamp,
  };
}

/**
 * Find similar past sessions for forecast conditions
 */
export function findSimilarSessions(
  forecast: MarineConditions,
  sessions: SurfSessionWithConditions[],
  minRating: number = 3,
  minMatchScore: number = 50
): ConditionMatch[] {
  const matches: ConditionMatch[] = [];

  for (const session of sessions) {
    if (session.rating < minRating) continue;

    const sessionConditions = sessionConditionsToMarine(session.conditions);
    if (!sessionConditions) continue;

    const { score, factors } = calculateMatchScore(forecast, sessionConditions);

    if (score >= minMatchScore) {
      matches.push({
        sessionId: session.id,
        sessionDate: session.date,
        rating: session.rating,
        spotName: session.spot?.name || "Unknown",
        matchScore: score,
        matchingFactors: factors,
      });
    }
  }

  // Sort by match score descending
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Generate surf predictions for a spot
 */
export function generatePredictions(
  spotId: string,
  spotName: string,
  hourlyForecast: MarineConditions[],
  sessions: SurfSessionWithConditions[],
  availability: AvailabilityWindow[]
): SurfPrediction[] {
  const predictions: SurfPrediction[] = [];

  // Filter to only sessions for this spot with good ratings
  const spotSessions = sessions.filter(
    (s) => s.spotId === spotId && s.rating >= 3
  );

  for (const forecast of hourlyForecast) {
    const similarSessions = findSimilarSessions(forecast, spotSessions);

    // Calculate confidence based on number of similar sessions
    const confidence = Math.min(100, similarSessions.length * 20);

    // Check if user is available at this time
    const availabilityWindow = availability.find(
      (w) => forecast.timestamp >= w.start && forecast.timestamp <= w.end
    );

    const isGoldenWindow =
      similarSessions.length > 0 &&
      similarSessions[0].matchScore >= 70 &&
      availabilityWindow !== undefined;

    predictions.push({
      spotId,
      spotName,
      timestamp: forecast.timestamp,
      conditions: forecast,
      similarSessions: similarSessions.slice(0, 3), // Top 3 similar sessions
      confidence,
      isGoldenWindow,
      availabilityWindow,
    });
  }

  return predictions;
}

/**
 * Get the best surf windows from predictions
 */
export function getBestSurfWindows(
  predictions: SurfPrediction[],
  limit: number = 10
): SurfPrediction[] {
  return predictions
    .filter((p) => p.confidence > 0)
    .sort((a, b) => {
      // Prioritize golden windows
      if (a.isGoldenWindow && !b.isGoldenWindow) return -1;
      if (!a.isGoldenWindow && b.isGoldenWindow) return 1;
      // Then by confidence
      if (a.confidence !== b.confidence) return b.confidence - a.confidence;
      // Then by match score of best similar session
      const aScore = a.similarSessions[0]?.matchScore || 0;
      const bScore = b.similarSessions[0]?.matchScore || 0;
      return bScore - aScore;
    })
    .slice(0, limit);
}

/**
 * Format condition comparison for display
 */
export function formatConditionComparison(
  forecast: MarineConditions,
  session: MarineConditions
): string {
  const parts: string[] = [];

  if (forecast.waveHeight !== null && session.waveHeight !== null) {
    const diff = forecast.waveHeight - session.waveHeight;
    const arrow = diff > 0 ? "↑" : diff < 0 ? "↓" : "=";
    parts.push(`Waves: ${forecast.waveHeight.toFixed(1)}m ${arrow}`);
  }

  if (forecast.primarySwellPeriod !== null && session.primarySwellPeriod !== null) {
    const diff = forecast.primarySwellPeriod - session.primarySwellPeriod;
    const arrow = diff > 0 ? "↑" : diff < 0 ? "↓" : "=";
    parts.push(`Period: ${forecast.primarySwellPeriod.toFixed(0)}s ${arrow}`);
  }

  return parts.join(" | ");
}
