import {
  area,
  bbox,
  booleanPointInPolygon,
  centroid,
  featureCollection,
  intersect,
  kinks,
  polygon,
} from '@turf/turf';
import { z } from 'zod';
import type { Polygon } from 'geojson';
import { ApiError } from './errors.js';
import { DAY_MS } from './scoring.js';

const position = z.tuple([
  z.number().finite().min(-180).max(180),
  z.number().finite().min(-85).max(85),
]);
const geometrySchema = z
  .object({
    type: z.literal('Polygon'),
    coordinates: z.array(z.array(position).length(5)).length(1),
  })
  .strict();

/** Small local polygons avoid antimeridian and polar ambiguities in this JSON/Turf MVP. */
export function parseQuadrilateral(input: unknown) {
  const geometry = geometrySchema.parse(input);
  const ring = geometry.coordinates[0];
  const bad = (message: string): never => {
    throw new ApiError(400, 'INVALID_GEOMETRY', message);
  };
  if (ring[0][0] !== ring[4][0] || ring[0][1] !== ring[4][1])
    bad('Close the polygon by repeating its first corner.');
  if (new Set(ring.slice(0, 4).map((p) => p.join(','))).size !== 4)
    bad('Choose exactly four different corners.');
  for (let i = 0; i < 4; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % 4];
    const c = ring[(i + 2) % 4];
    if (Math.abs((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])) < 1e-14)
      bad('Each corner must change the polygon direction.');
  }
  const shape = polygon(geometry.coordinates);
  const bounds = bbox(shape);
  if (bounds[2] - bounds[0] >= 180) bad('Areas crossing the antimeridian are not supported.');
  if (kinks(shape).features.length > 0) bad('The sides of an area must not cross.');
  const size = area(shape);
  if (size < 1 || size > 100_000_000)
    bad('Choose a local area between 1 square metre and 100 square kilometres.');
  const center = centroid(shape).geometry.coordinates;
  return {
    geometry,
    centroidLongitude: center[0],
    centroidLatitude: center[1],
    minLongitude: bounds[0],
    minLatitude: bounds[1],
    maxLongitude: bounds[2],
    maxLatitude: bounds[3],
  };
}

export function containsPoint(geometry: Polygon, longitude: number, latitude: number) {
  return booleanPointInPolygon([longitude, latitude], geometry);
}

/** Intersection relative to the smaller footprint also catches tiny nested areas. */
export function overlapRatio(a: Polygon, b: Polygon): number {
  const intersection = intersect(
    featureCollection([polygon(a.coordinates), polygon(b.coordinates)]),
  );
  if (!intersection) return 0;
  return Math.min(1, area(intersection) / Math.min(area(a), area(b)));
}

export function cooldownUntil(
  proposed: Polygon,
  recent: { geometry: Polygon; createdAt: Date }[],
  now: Date,
  threshold: number,
): Date | null {
  let latest = 0;
  for (const report of recent) {
    const expiry = report.createdAt.getTime() + 7 * DAY_MS;
    if (expiry > now.getTime() && overlapRatio(proposed, report.geometry) + 1e-9 >= threshold)
      latest = Math.max(latest, expiry);
  }
  return latest ? new Date(latest) : null;
}
