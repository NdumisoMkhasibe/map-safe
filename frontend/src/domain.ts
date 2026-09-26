import type { Geometry, Position } from './types';

export const incidentCategories = [
  ['THEFT', 'Theft'],
  ['PICKPOCKETING', 'Pickpocketing'],
  ['ROBBERY', 'Mugging / robbery'],
  ['ASSAULT', 'Assault'],
  ['CAR_BREAK_IN', 'Car break-in'],
  ['HIJACKING', 'Hijacking'],
  ['HARASSMENT', 'Harassment'],
  ['VANDALISM', 'Vandalism'],
  ['SUSPICIOUS_ACTIVITY', 'Suspicious activity'],
  ['POOR_LIGHTING', 'Poor lighting'],
  ['LACK_OF_SECURITY', 'Lack of visible security'],
  ['OTHER', 'Other'],
] as const;

export function safetyLabel(score: number | null): string {
  if (score === null) return 'No community ratings';
  if (score <= 2) return 'Very low reported concern';
  if (score <= 4) return 'Lower reported concern';
  if (score <= 6) return 'Mixed experiences';
  if (score <= 8) return 'Elevated reported concern';
  return 'Very high reported concern';
}

export function scoreColor(score: number | null): string {
  if (score === null) return '#71858b';
  if (score <= 3) return '#168570';
  if (score <= 5) return '#b09a21';
  if (score <= 7) return '#c27626';
  return '#bb514e';
}

export function closePolygon(corners: Position[]): Geometry {
  return { type: 'Polygon', coordinates: [[...corners, ...(corners[0] ? [corners[0]] : [])]] };
}

/** Browser checks give immediate feedback; the server independently validates every geometry. */
export function geometryError(corners: Position[]): string | null {
  if (corners.length !== 4) return 'Choose exactly four corners to define your area.';
  if (
    corners.some(
      ([lng, lat]) =>
        !Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lng) > 180 || Math.abs(lat) > 90,
    )
  ) {
    return 'Use valid coordinates: longitude −180 to 180, latitude −90 to 90.';
  }
  if (new Set(corners.map((point) => point.join(','))).size !== 4)
    return 'Each corner must be in a different position.';
  const [a, b, c, d] = corners as [Position, Position, Position, Position];
  const cross = (p: Position, q: Position, r: Position) =>
    (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const intersects = (p: Position, q: Position, r: Position, s: Position) => {
    const signs = [cross(p, q, r), cross(p, q, s), cross(r, s, p), cross(r, s, q)];
    return signs[0]! * signs[1]! <= 0 && signs[2]! * signs[3]! <= 0;
  };
  if (intersects(a, b, c, d) || intersects(b, c, d, a))
    return 'The edges cross. Move the corners into order around the area.';
  const twiceArea = corners.reduce((sum, p, i) => {
    const next = corners[(i + 1) % 4]!;
    return sum + p[0] * next[1] - next[0] * p[1];
  }, 0);
  if (Math.abs(twiceArea) < 1e-10) return 'The area is too small. Spread the corners apart.';
  return null;
}

export function localDateTime(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function currentLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(
        new Error(
          'Location is unavailable in this browser. You can still share a self-attested visit.',
        ),
      );
      return;
    }
    navigator.geolocation.getCurrentPosition(
      resolve,
      (error) => {
        reject(
          new Error(
            error.code === 1
              ? 'Location permission was declined. You can still share a self-attested visit.'
              : 'Your location could not be found. Try again, or share a self-attested visit.',
          ),
        );
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  });
}
