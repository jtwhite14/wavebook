/**
 * Compute tide phase segments (0-11) for a series of hourly tide heights.
 *
 * The tide cycle is modeled as 12 segments covering one full trough-to-trough cycle:
 *   0:  Low tide (trough)
 *   1-2: Early rising
 *   3-4: Mid rising
 *   5:  High tide (peak)
 *   6:  High tide (other side of peak)
 *   7-8: Mid falling
 *   9-10: Late falling
 *   11: Approaching next trough
 *
 * Algorithm:
 * 1. Find local minima and maxima in the tide height series
 * 2. For each hour, determine position within the surrounding min→max or max→min arc
 * 3. Map to segment 0-11
 */

interface TidePoint {
  tideHeight: number | null;
}

interface Extremum {
  index: number;
  height: number;
  type: "min" | "max";
}

/**
 * Find local minima and maxima in a tide height series.
 * Requires at least 4 hours between extremes to filter noise.
 */
function findExtrema(heights: (number | null)[]): Extremum[] {
  const extrema: Extremum[] = [];
  const MIN_GAP = 4; // minimum hours between extremes

  for (let i = 1; i < heights.length - 1; i++) {
    const prev = heights[i - 1];
    const curr = heights[i];
    const next = heights[i + 1];
    if (prev == null || curr == null || next == null) continue;

    if (curr <= prev && curr <= next && curr < next) {
      // Local minimum
      if (extrema.length === 0 || (i - extrema[extrema.length - 1].index >= MIN_GAP && extrema[extrema.length - 1].type !== "min")) {
        extrema.push({ index: i, height: curr, type: "min" });
      } else if (extrema.length > 0 && extrema[extrema.length - 1].type === "min" && curr < extrema[extrema.length - 1].height) {
        // Replace with deeper minimum
        extrema[extrema.length - 1] = { index: i, height: curr, type: "min" };
      }
    } else if (curr >= prev && curr >= next && curr > next) {
      // Local maximum
      if (extrema.length === 0 || (i - extrema[extrema.length - 1].index >= MIN_GAP && extrema[extrema.length - 1].type !== "max")) {
        extrema.push({ index: i, height: curr, type: "max" });
      } else if (extrema.length > 0 && extrema[extrema.length - 1].type === "max" && curr > extrema[extrema.length - 1].height) {
        // Replace with higher maximum
        extrema[extrema.length - 1] = { index: i, height: curr, type: "max" };
      }
    }
  }

  return extrema;
}

/**
 * Compute tide phase segment (0-11) for each hour in a series.
 * Returns null for hours where phase can't be determined.
 */
export function computeTidePhases(hours: TidePoint[]): (number | null)[] {
  const heights = hours.map(h => h.tideHeight);
  const extrema = findExtrema(heights);
  const result: (number | null)[] = new Array(hours.length).fill(null);

  if (extrema.length < 2) {
    // Not enough data to determine phases — fall back to simple height-based classification
    return classifyByHeightOnly(heights);
  }

  for (let i = 0; i < hours.length; i++) {
    const h = heights[i];
    if (h == null) continue;

    // Find surrounding extrema
    let prevEx: Extremum | null = null;
    let nextEx: Extremum | null = null;
    for (const ex of extrema) {
      if (ex.index <= i) prevEx = ex;
      if (ex.index >= i && !nextEx) nextEx = ex;
    }

    if (prevEx && nextEx && prevEx !== nextEx) {
      // Interpolate position between the two extrema
      const span = nextEx.index - prevEx.index;
      const pos = (i - prevEx.index) / span; // 0 to 1

      if (prevEx.type === "min") {
        // Rising: min→max, maps to segments 0-5
        result[i] = Math.min(5, Math.floor(pos * 6));
      } else {
        // Falling: max→min, maps to segments 6-11
        result[i] = Math.min(11, 6 + Math.floor(pos * 6));
      }
    } else if (prevEx) {
      // Past the last known extremum — extrapolate
      result[i] = prevEx.type === "min" ? 0 : 6;
    } else if (nextEx) {
      // Before the first known extremum — extrapolate
      result[i] = nextEx.type === "max" ? 0 : 6;
    }
  }

  return result;
}

/**
 * Fallback: classify by height alone when extrema can't be found.
 * Uses a simple mapping: bottom third = low (segments 0,11),
 * middle third = mid (2-4, 8-10), top third = high (5-6).
 */
function classifyByHeightOnly(heights: (number | null)[]): (number | null)[] {
  const valid = heights.filter((h): h is number => h != null);
  if (valid.length === 0) return heights.map(() => null);

  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const range = max - min;

  return heights.map(h => {
    if (h == null || range === 0) return null;
    const normalized = (h - min) / range; // 0 to 1
    // Map 0-1 to a rough segment: 0=low, 0.5=high, 1=low (second half)
    // Use cosine to wrap: segment = round(6 * acos(2*normalized - 1) / PI)
    // Simpler: just use height bands
    if (normalized < 0.17) return 0;   // low
    if (normalized < 0.33) return 2;   // early rising / late falling
    if (normalized < 0.5) return 3;    // mid rising / mid falling
    if (normalized < 0.67) return 4;   // upper mid
    if (normalized < 0.83) return 5;   // near high
    return 5;                          // high
  });
}

/**
 * Distance between two segments on the 12-segment cycle.
 * Does NOT wrap (segments 0 and 11 are adjacent in the cycle but
 * represent different tide phases — low tide vs approaching low tide).
 */
export function segmentDistance(a: number, b: number): number {
  return Math.abs(a - b);
}

/**
 * Find the distance to the nearest selected segment.
 */
export function nearestSelectedSegmentDistance(seg: number, segments: boolean[]): number {
  let minDist = Infinity;
  for (let i = 0; i < segments.length; i++) {
    if (segments[i]) {
      const dist = segmentDistance(seg, i);
      if (dist < minDist) minDist = dist;
    }
  }
  return minDist;
}
