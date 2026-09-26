import { describe, expect, it } from 'vitest';
import { calculateScore, safetyLabel, DAY_MS } from '../src/domain/scoring.js';
import {
  parseQuadrilateral,
  containsPoint,
  overlapRatio,
  cooldownUntil,
} from '../src/domain/geometry.js';
import { ratingSchema, paginationSchema } from '../src/domain/validation.js';

const square = (x = 0, y = 0, size = 0.01) => ({
  type: 'Polygon' as const,
  coordinates: [
    [
      [x, y],
      [x + size, y],
      [x + size, y + size],
      [x, y + size],
      [x, y],
    ],
  ],
});
const now = new Date('2026-09-26T12:00:00Z');

describe('exponential community score', () => {
  it('has an explicit empty state', () =>
    expect(calculateScore([], now)).toEqual({
      score: null,
      ratingCount: 0,
      label: 'No reports yet',
    }));
  it('retains a single rating regardless of age', () =>
    expect(calculateScore([{ id: 'a', score: 8, createdAt: new Date(0) }], now).score).toBe(8));
  it('gives a report half the weight after 180 days', () => {
    expect(
      calculateScore(
        [
          { id: 'a', score: 2, createdAt: now },
          { id: 'b', score: 8, createdAt: new Date(now.getTime() - 180 * DAY_MS) },
        ],
        now,
      ).score,
    ).toBe(4);
  });
  it('deduplicates identical report ids in composite scores', () => {
    const rating = { id: 'a', score: 6, createdAt: now };
    expect(calculateScore([rating, rating], now).ratingCount).toBe(1);
  });
  it('accepts a configurable half-life', () => {
    expect(
      calculateScore(
        [
          { id: 'a', score: 1, createdAt: now },
          { id: 'b', score: 10, createdAt: new Date(now.getTime() - DAY_MS) },
        ],
        now,
        1,
      ).score,
    ).toBe(4);
  });
  it('prevents very old timestamps from causing underflow', () =>
    expect(calculateScore([{ id: 'a', score: 3, createdAt: new Date(0) }], now, 0.001).score).toBe(
      3,
    ));
  it('clamps future age to zero', () =>
    expect(
      calculateScore(
        [
          { id: 'a', score: 1, createdAt: new Date(now.getTime() + DAY_MS) },
          { id: 'b', score: 9, createdAt: now },
        ],
        now,
      ).score,
    ).toBe(5));
  it.each([0, 11, NaN, 1.5])('rejects invalid score %s', (score) =>
    expect(() => calculateScore([{ id: 'a', score, createdAt: now }], now)).toThrow(),
  );
  it.each([0, -1, NaN])('rejects invalid half-life %s', (days) =>
    expect(() => calculateScore([], now, days)).toThrow(),
  );
  it.each([
    [null, 'No reports yet'],
    [1, 'Very low reported risk'],
    [3, 'Lower reported risk'],
    [5, 'Mixed experiences'],
    [7, 'Elevated reported risk'],
    [10, 'Very high reported risk'],
  ] as const)('labels %s accessibly', (score, label) => expect(safetyLabel(score)).toBe(label));
});

describe('quadrilateral geometry', () => {
  it('retains GeoJSON and calculates searchable fields', () => {
    const parsed = parseQuadrilateral(square());
    expect(parsed.geometry.coordinates[0]).toHaveLength(5);
    expect(parsed.centroidLongitude).toBeCloseTo(0.005);
    expect(parsed.minLatitude).toBe(0);
    expect(parsed.maxLongitude).toBe(0.01);
  });
  it('supports a concave quadrilateral', () =>
    expect(
      parseQuadrilateral({
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [0.01, 0],
            [0.004, 0.004],
            [0, 0.01],
            [0, 0],
          ],
        ],
      }).geometry.type,
    ).toBe('Polygon'));
  it('supports reversed winding', () => {
    const shape = square();
    shape.coordinates[0].reverse();
    expect(parseQuadrilateral(shape).geometry.type).toBe('Polygon');
  });
  it.each([
    { type: 'Point', coordinates: [0, 0] },
    {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
        ],
      ],
    },
    {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 0],
          [0, 1],
          [0, 0],
        ],
      ],
    },
    {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [0.01, 0.01],
          [0, 0.01],
          [0.01, 0],
          [0, 0],
        ],
      ],
    },
    {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [0.01, 0],
          [0.02, 0],
          [0.03, 0],
          [0, 0],
        ],
      ],
    },
    square(181),
    square(0, 89),
    square(-179, 0, 358),
    square(0, 0, 10),
    square(0, 0, 0.00000001),
    { type: 'Polygon', coordinates: [square().coordinates[0], square().coordinates[0]] },
  ])('rejects malformed or unsupported geometry %#', (geometry) =>
    expect(() => parseQuadrilateral(geometry)).toThrow(),
  );
  it('includes boundary points', () => expect(containsPoint(square(), 0, 0.005)).toBe(true));
  it('includes interior and excludes outside points', () => {
    expect(containsPoint(square(), 0.005, 0.005)).toBe(true);
    expect(containsPoint(square(), 0.02, 0.02)).toBe(false);
  });
  it('measures identical, disjoint and touching polygons', () => {
    expect(overlapRatio(square(), square())).toBeCloseTo(1);
    expect(overlapRatio(square(), square(1))).toBe(0);
    expect(overlapRatio(square(), square(0.01))).toBe(0);
  });
  it('divides overlap by the smaller area, independent of order', () => {
    expect(overlapRatio(square(), square(0.002, 0.002, 0.002))).toBeCloseTo(1);
    expect(overlapRatio(square(0.002, 0.002, 0.002), square())).toBeCloseTo(1);
  });
  it('measures a partial overlap', () =>
    expect(overlapRatio(square(), square(0.004))).toBeCloseTo(0.6));
  it('returns the latest blocking expiry and respects the boundary', () => {
    const ratings = [
      { geometry: square(), createdAt: new Date(now.getTime() - DAY_MS) },
      { geometry: square(), createdAt: new Date(now.getTime() - 2 * DAY_MS) },
    ];
    expect(cooldownUntil(square(), ratings, now, 0.6)?.toISOString()).toBe(
      new Date(now.getTime() + 6 * DAY_MS).toISOString(),
    );
    expect(
      cooldownUntil(
        square(),
        [{ geometry: square(), createdAt: new Date(now.getTime() - 7 * DAY_MS) }],
        now,
        0.6,
      ),
    ).toBeNull();
    expect(cooldownUntil(square(1), ratings, now, 0.6)).toBeNull();
  });
});

describe('request schemas', () => {
  const valid = {
    area: { name: 'Park', geometry: square() },
    score: 3,
    visitedAt: now.toISOString(),
    attested: true,
    incidents: [],
  };
  it('accepts a self-attested report without optional prose', () =>
    expect(ratingSchema.parse(valid).score).toBe(3));
  it('requires precisely one area source', () => {
    expect(ratingSchema.safeParse({ ...valid, areaId: 'existing' }).success).toBe(false);
    expect(ratingSchema.safeParse({ ...valid, area: undefined }).success).toBe(false);
  });
  it('requires personal attestation', () =>
    expect(ratingSchema.safeParse({ ...valid, attested: false }).success).toBe(false));
  it.each([0, 11, 2.5, '3'])('rejects invalid score %s', (score) =>
    expect(ratingSchema.safeParse({ ...valid, score }).success).toBe(false),
  );
  it('requires an Other type and rejects duplicate incident categories', () => {
    expect(ratingSchema.safeParse({ ...valid, incidents: [{ category: 'OTHER' }] }).success).toBe(
      false,
    );
    expect(
      ratingSchema.safeParse({
        ...valid,
        incidents: [{ category: 'THEFT' }, { category: 'THEFT' }],
      }).success,
    ).toBe(false);
    expect(
      ratingSchema.safeParse({
        ...valid,
        incidents: [{ category: 'OTHER', otherType: 'Broken crossing' }],
      }).success,
    ).toBe(true);
  });
  it('rejects unknown body fields such as impersonated users', () =>
    expect(ratingSchema.safeParse({ ...valid, userId: 'someone-else' }).success).toBe(false));
  it('bounds pagination', () => {
    expect(paginationSchema.parse({})).toMatchObject({ page: 1, limit: 50 });
    expect(paginationSchema.safeParse({ limit: '10001' }).success).toBe(false);
  });
});
