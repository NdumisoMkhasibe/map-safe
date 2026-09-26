import { Prisma, type PrismaClient, type User } from '@prisma/client';
import type { Polygon } from 'geojson';
import type { Config } from '../config.js';
import { ApiError } from '../domain/errors.js';
import { containsPoint, cooldownUntil, parseQuadrilateral } from '../domain/geometry.js';
import { calculateScore, DAY_MS } from '../domain/scoring.js';
import { bboxSchema, type RatingInput } from '../domain/validation.js';
import { publicName } from './auth.service.js';

const publicAreaWhere = {
  status: 'ACTIVE',
  creator: { status: 'ACTIVE' },
} satisfies Prisma.AreaWhereInput;
const publicRatingWhere = {
  status: 'ACTIVE',
  user: { status: 'ACTIVE' },
} satisfies Prisma.RatingWhereInput;
const ratingInclude = {
  user: { select: { id: true, name: true } },
  incidents: { where: { status: 'ACTIVE' as const } },
} satisfies Prisma.RatingInclude;
const areaInclude = {
  ratings: { where: publicRatingWhere, include: ratingInclude },
} satisfies Prisma.AreaInclude;
type FullArea = Prisma.AreaGetPayload<{ include: typeof areaInclude }>;
type FullRating = Prisma.RatingGetPayload<{ include: typeof ratingInclude }>;

export function publicRating(rating: FullRating) {
  return {
    id: rating.id,
    areaId: rating.areaId,
    score: rating.score,
    comment: rating.comment,
    visitedAt: rating.visitedAt,
    verificationMethod: rating.verificationMethod,
    createdAt: rating.createdAt,
    user: { id: rating.user.id, name: publicName(rating.user.name) },
    incidents: rating.incidents.map((i) => ({
      id: i.id,
      category: i.category,
      otherType: i.otherType,
      description: i.description,
      createdAt: i.createdAt,
    })),
  };
}

/** Only publicly visible reports reach scoring and serialization. Database rows remain the source of truth. */
export class AreaService {
  constructor(
    private db: PrismaClient,
    private config: Config,
    private now = () => new Date(),
  ) {}
  private summarize(area: FullArea) {
    return {
      id: area.id,
      name: area.name,
      geometry: area.geometry,
      centroidLatitude: area.centroidLatitude,
      centroidLongitude: area.centroidLongitude,
      status: area.status,
      createdAt: area.createdAt,
      updatedAt: area.updatedAt,
      ...calculateScore(area.ratings, this.now(), this.config.SCORE_HALF_LIFE_DAYS),
    };
  }
  async list(query: { bbox?: string; page: number; limit: number }) {
    const where: Prisma.AreaWhereInput = { ...publicAreaWhere };
    if (query.bbox) {
      const [west, south, east, north] = bboxSchema.parse(query.bbox);
      Object.assign(where, {
        minLongitude: { lte: east },
        maxLongitude: { gte: west },
        minLatitude: { lte: north },
        maxLatitude: { gte: south },
      });
    }
    const [areas, total] = await this.db.$transaction([
      this.db.area.findMany({
        where,
        include: areaInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.db.area.count({ where }),
    ]);
    return {
      areas: areas.map((a) => this.summarize(a)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }
  async detail(id: string) {
    const area = await this.db.area.findFirst({
      where: { id, ...publicAreaWhere },
      include: areaInclude,
    });
    if (!area) throw new ApiError(404, 'AREA_NOT_FOUND', 'This area is unavailable.');
    return {
      area: this.summarize(area),
      ratings: area.ratings
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 100)
        .map(publicRating),
    };
  }
  async ratings(areaId: string, page: number, limit: number) {
    if (!(await this.db.area.findFirst({ where: { id: areaId, ...publicAreaWhere } })))
      throw new ApiError(404, 'AREA_NOT_FOUND', 'This area is unavailable.');
    const where = { areaId, ...publicRatingWhere };
    const [ratings, total] = await this.db.$transaction([
      this.db.rating.findMany({
        where,
        include: ratingInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.rating.count({ where }),
    ]);
    return { ratings: ratings.map(publicRating), total, page, limit };
  }
  async rating(id: string) {
    const rating = await this.db.rating.findFirst({
      where: { id, ...publicRatingWhere, area: publicAreaWhere },
      include: ratingInclude,
    });
    if (!rating) throw new ApiError(404, 'RATING_NOT_FOUND', 'This report is unavailable.');
    return { rating: publicRating(rating) };
  }
  async create(user: User, input: { name: string; geometry: unknown }) {
    const geometry = parseQuadrilateral(input.geometry);
    const area = await this.db.area.create({
      data: { ...geometry, name: input.name, creatorId: user.id },
      include: areaInclude,
    });
    return { area: this.summarize(area) };
  }
  async update(user: User, id: string, input: { name?: string; geometry?: unknown }) {
    const area = await this.db.$transaction(async (tx) => {
      // Sharing the row lock with rating creation closes the edit-versus-first-rating race.
      await tx.$queryRaw`SELECT "id" FROM "Area" WHERE "id" = ${id} FOR UPDATE`;
      const existing = await tx.area.findUnique({ where: { id } });
      if (!existing) throw new ApiError(404, 'AREA_NOT_FOUND', 'This area is unavailable.');
      if (existing.creatorId !== user.id)
        throw new ApiError(403, 'FORBIDDEN', 'Only the area creator can edit its details.');
      if (existing.status !== 'ACTIVE')
        throw new ApiError(403, 'AREA_HIDDEN', 'A hidden area cannot be edited.');
      if (input.geometry && (await tx.rating.count({ where: { areaId: id } })))
        throw new ApiError(
          409,
          'GEOMETRY_LOCKED',
          'An area with reports cannot be moved. Draw a new area instead.',
        );
      return tx.area.update({
        where: { id },
        data: { name: input.name, ...(input.geometry ? parseQuadrilateral(input.geometry) : {}) },
        include: areaInclude,
      });
    });
    return { area: this.summarize(area) };
  }
  async submit(user: User, input: RatingInput) {
    const now = this.now();
    const visitedAt = new Date(input.visitedAt);
    if (visitedAt > now || visitedAt.getTime() < now.getTime() - 7 * DAY_MS)
      throw new ApiError(400, 'VISIT_NOT_RECENT', 'Choose a visit during the past seven days.');
    const proposed = input.area ? parseQuadrilateral(input.area.geometry) : null;
    return this.db.$transaction(
      async (tx) => {
        // A PostgreSQL row lock serializes submissions by this user across every API instance.
        // ReadCommitted makes the next read see a concurrent submission once its lock is released.
        await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${user.id} FOR UPDATE`;
        const current = await tx.user.findUnique({ where: { id: user.id } });
        if (!current || current.status !== 'ACTIVE')
          throw new ApiError(403, 'ACCOUNT_SUSPENDED', 'This account cannot submit reports.');
        if (input.areaId)
          await tx.$queryRaw`SELECT "id" FROM "Area" WHERE "id" = ${input.areaId} FOR UPDATE`;
        const existing = input.areaId
          ? await tx.area.findFirst({ where: { id: input.areaId, ...publicAreaWhere } })
          : null;
        if (input.areaId && !existing)
          throw new ApiError(404, 'AREA_NOT_FOUND', 'This area is unavailable.');
        const geometry = proposed?.geometry ?? (existing!.geometry as unknown as Polygon);
        const recent = await tx.rating.findMany({
          where: { userId: user.id, createdAt: { gt: new Date(now.getTime() - 7 * DAY_MS) } },
          include: { area: { select: { geometry: true } } },
        });
        const nextAllowedAt = cooldownUntil(
          geometry,
          recent.map((r) => ({
            geometry: r.area.geometry as unknown as Polygon,
            createdAt: r.createdAt,
          })),
          now,
          this.config.OVERLAP_THRESHOLD,
        );
        if (nextAllowedAt)
          throw new ApiError(
            409,
            'RATING_COOLDOWN',
            'You recently reviewed a substantially overlapping area. Please wait seven days between overlapping reports.',
            { nextAllowedAt: nextAllowedAt.toISOString() },
          );
        if (input.gps) {
          const age = now.getTime() - new Date(input.gps.timestamp).getTime();
          if (age > 300_000 || age < -30_000)
            throw new ApiError(400, 'GPS_EXPIRED', 'Request a fresh current-location reading.');
          if (!containsPoint(geometry, input.gps.longitude, input.gps.latitude))
            throw new ApiError(
              400,
              'GPS_OUTSIDE_AREA',
              'Your current location is outside the selected area.',
            );
        }
        const selectedArea =
          existing ??
          (await tx.area.create({
            data: { ...proposed!, name: input.area!.name, creatorId: user.id },
          }));
        const rating = await tx.rating.create({
          data: {
            areaId: selectedArea.id,
            userId: user.id,
            score: input.score,
            comment: input.comment || null,
            visitedAt,
            attestedAt: now,
            verificationMethod: input.gps ? 'GPS_VERIFIED' : 'SELF_ATTESTED',
            verifiedAt: input.gps ? now : null,
            gpsAccuracy: input.gps?.accuracy,
            createdAt: now,
            incidents: {
              create: input.incidents.map((i) => ({
                category: i.category,
                otherType: i.category === 'OTHER' ? i.otherType : undefined,
                description: i.description || null,
              })),
            },
          },
          include: ratingInclude,
        });
        const area = await tx.area.findUniqueOrThrow({
          where: { id: selectedArea.id },
          include: areaInclude,
        });
        return { rating: publicRating(rating), area: this.summarize(area) };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        timeout: 15_000,
        maxWait: 10_000,
      },
    );
  }
  async safety(longitude: number, latitude: number) {
    const candidates = await this.db.area.findMany({
      where: {
        ...publicAreaWhere,
        minLongitude: { lte: longitude },
        maxLongitude: { gte: longitude },
        minLatitude: { lte: latitude },
        maxLatitude: { gte: latitude },
      },
      include: areaInclude,
      take: 501,
    });
    if (candidates.length > 500)
      throw new ApiError(
        422,
        'AREA_DENSITY_LIMIT',
        'This position has too many overlapping areas to calculate reliably.',
      );
    const areas = candidates.filter((a) =>
      containsPoint(a.geometry as unknown as Polygon, longitude, latitude),
    );
    return {
      ...calculateScore(
        areas.flatMap((a) => a.ratings),
        this.now(),
        this.config.SCORE_HALF_LIFE_DAYS,
      ),
      areas: areas.map((a) => this.summarize(a)),
    };
  }
}
