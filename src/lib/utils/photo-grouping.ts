import { haversineDistance } from "./geo";

interface PhotoWithExif {
  id: string;
  photoUrl: string;
  exifData: { dateTime?: string; latitude?: number; longitude?: number } | null;
}

export interface PhotoGroup {
  photos: PhotoWithExif[];
  centroidLat: number | null;
  centroidLng: number | null;
  earliestTime: Date | null;
  latestTime: Date | null;
}

const MAX_TIME_GAP_MS = 3 * 60 * 60 * 1000; // 3 hours
const MAX_DISTANCE_KM = 1; // 1 km

/**
 * Groups photos by time and location proximity.
 * Photos taken within 3 hours of each other and within 1km
 * are considered part of the same session.
 */
export function groupPhotosBySession(photos: PhotoWithExif[]): PhotoGroup[] {
  if (photos.length === 0) return [];
  if (photos.length === 1) {
    const p = photos[0];
    const exif = p.exifData;
    return [{
      photos: [p],
      centroidLat: exif?.latitude ?? null,
      centroidLng: exif?.longitude ?? null,
      earliestTime: exif?.dateTime ? new Date(exif.dateTime) : null,
      latestTime: exif?.dateTime ? new Date(exif.dateTime) : null,
    }];
  }

  // Sort photos by time (those without time go to end)
  const sorted = [...photos].sort((a, b) => {
    const timeA = a.exifData?.dateTime ? new Date(a.exifData.dateTime).getTime() : Infinity;
    const timeB = b.exifData?.dateTime ? new Date(b.exifData.dateTime).getTime() : Infinity;
    return timeA - timeB;
  });

  const groups: PhotoGroup[] = [];
  const assigned = new Set<string>();

  for (const photo of sorted) {
    if (assigned.has(photo.id)) continue;

    const group: PhotoWithExif[] = [photo];
    assigned.add(photo.id);

    const photoTime = photo.exifData?.dateTime ? new Date(photo.exifData.dateTime).getTime() : null;
    const photoLat = photo.exifData?.latitude;
    const photoLng = photo.exifData?.longitude;

    // Try to add remaining unassigned photos to this group
    for (const candidate of sorted) {
      if (assigned.has(candidate.id)) continue;

      const candidateTime = candidate.exifData?.dateTime
        ? new Date(candidate.exifData.dateTime).getTime()
        : null;
      const candidateLat = candidate.exifData?.latitude;
      const candidateLng = candidate.exifData?.longitude;

      let timeClose = true;
      let locationClose = true;

      // Check time proximity
      if (photoTime != null && candidateTime != null) {
        timeClose = Math.abs(candidateTime - photoTime) <= MAX_TIME_GAP_MS;
      }

      // Check location proximity
      if (photoLat != null && photoLng != null && candidateLat != null && candidateLng != null) {
        const dist = haversineDistance(photoLat, photoLng, candidateLat, candidateLng);
        locationClose = dist <= MAX_DISTANCE_KM;
      }

      // If both have no EXIF data, group them together (all unknowns in one group)
      const bothNoExif = !photo.exifData?.dateTime && !photo.exifData?.latitude
        && !candidate.exifData?.dateTime && !candidate.exifData?.latitude;

      if ((timeClose && locationClose) || bothNoExif) {
        group.push(candidate);
        assigned.add(candidate.id);
      }
    }

    // Compute group metadata
    const times = group
      .map(p => p.exifData?.dateTime ? new Date(p.exifData.dateTime).getTime() : null)
      .filter((t): t is number => t != null);

    const lats = group
      .map(p => p.exifData?.latitude)
      .filter((l): l is number => l != null);

    const lngs = group
      .map(p => p.exifData?.longitude)
      .filter((l): l is number => l != null);

    groups.push({
      photos: group,
      centroidLat: lats.length > 0 ? lats.reduce((a, b) => a + b, 0) / lats.length : null,
      centroidLng: lngs.length > 0 ? lngs.reduce((a, b) => a + b, 0) / lngs.length : null,
      earliestTime: times.length > 0 ? new Date(Math.min(...times)) : null,
      latestTime: times.length > 0 ? new Date(Math.max(...times)) : null,
    });
  }

  return groups;
}
