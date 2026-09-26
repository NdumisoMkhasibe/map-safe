import type { PrismaClient, User, Prisma } from '@prisma/client';
import { ApiError } from '../domain/errors.js';
import { calculateScore } from '../domain/scoring.js';

export type AdminEntity = 'users' | 'areas' | 'ratings' | 'incidents';
type Query = { q: string; status?: 'ACTIVE' | 'HIDDEN' | 'SUSPENDED'; page: number; limit: number };
const accountSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { ratings: true, areas: true } },
} satisfies Prisma.UserSelect;

export function requireAdmin(user: Pick<User, 'role' | 'status'> | null) {
  if (!user) throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in to continue.');
  if (user.role !== 'ADMIN' || user.status !== 'ACTIVE')
    throw new ApiError(403, 'FORBIDDEN', 'Administrator access is required.');
}

/** Admin listings intentionally include hidden records; public services never use these queries. */
export class AdminService {
  constructor(
    private db: PrismaClient,
    private halfLife = 180,
    private now = () => new Date(),
  ) {}
  async dashboard() {
    const [
      users,
      areas,
      ratings,
      incidents,
      activeUsers,
      hiddenAreas,
      hiddenRatings,
      hiddenIncidents,
      gpsVerifiedRatings,
      recentActivity,
      visible,
    ] = await Promise.all([
      this.db.user.count(),
      this.db.area.count(),
      this.db.rating.count(),
      this.db.incidentReport.count(),
      this.db.user.count({ where: { status: 'ACTIVE' } }),
      this.db.area.count({ where: { status: 'HIDDEN' } }),
      this.db.rating.count({ where: { status: 'HIDDEN' } }),
      this.db.incidentReport.count({ where: { status: 'HIDDEN' } }),
      this.db.rating.count({ where: { verificationMethod: 'GPS_VERIFIED' } }),
      this.db.adminAuditLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { actor: { select: { id: true, name: true } } },
      }),
      this.db.rating.findMany({
        where: {
          status: 'ACTIVE',
          user: { status: 'ACTIVE' },
          area: { status: 'ACTIVE', creator: { status: 'ACTIVE' } },
        },
        select: { id: true, score: true, createdAt: true },
      }),
    ]);
    return {
      users,
      areas,
      ratings,
      incidents,
      recentActivity,
      statistics: {
        activeUsers,
        hiddenAreas,
        hiddenRatings,
        hiddenIncidents,
        gpsVerifiedRatings,
        ...calculateScore(visible, this.now(), this.halfLife),
      },
    };
  }
  async list(entity: AdminEntity, query: Query) {
    const paging = {
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: { createdAt: 'desc' as const },
    };
    const contains = { contains: query.q, mode: 'insensitive' as const };
    if (entity === 'users') {
      if (query.status === 'HIDDEN')
        throw new ApiError(400, 'INVALID_STATUS', 'Users can be active or suspended.');
      const where = {
        status: query.status,
        OR: [{ name: contains }, { email: contains }],
      } satisfies Prisma.UserWhereInput;
      const [items, total] = await this.db.$transaction([
        this.db.user.findMany({ where, ...paging, select: accountSelect }),
        this.db.user.count({ where }),
      ]);
      return { items, total, page: query.page, limit: query.limit };
    }
    if (query.status === 'SUSPENDED')
      throw new ApiError(400, 'INVALID_STATUS', 'Content can be active or hidden.');
    if (entity === 'areas') {
      const where = { status: query.status, name: contains } satisfies Prisma.AreaWhereInput;
      const [items, total] = await this.db.$transaction([
        this.db.area.findMany({
          where,
          ...paging,
          include: {
            creator: { select: { id: true, name: true } },
            _count: { select: { ratings: true } },
          },
        }),
        this.db.area.count({ where }),
      ]);
      return { items, total, page: query.page, limit: query.limit };
    }
    if (entity === 'ratings') {
      const where = {
        status: query.status,
        ...(query.q
          ? {
              OR: [
                { comment: contains },
                { area: { name: contains } },
                { user: { name: contains } },
              ],
            }
          : {}),
      } satisfies Prisma.RatingWhereInput;
      const [items, total] = await this.db.$transaction([
        this.db.rating.findMany({
          where,
          ...paging,
          select: {
            id: true,
            areaId: true,
            score: true,
            comment: true,
            status: true,
            visitedAt: true,
            createdAt: true,
            verificationMethod: true,
            user: { select: { id: true, name: true } },
            area: { select: { id: true, name: true } },
            incidents: true,
          },
        }),
        this.db.rating.count({ where }),
      ]);
      return { items, total, page: query.page, limit: query.limit };
    }
    const where = {
      status: query.status,
      ...(query.q
        ? {
            OR: [
              { description: contains },
              { otherType: contains },
              { rating: { area: { name: contains } } },
            ],
          }
        : {}),
    } satisfies Prisma.IncidentReportWhereInput;
    const [items, total] = await this.db.$transaction([
      this.db.incidentReport.findMany({
        where,
        ...paging,
        include: {
          rating: {
            select: {
              id: true,
              area: { select: { id: true, name: true } },
              user: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.db.incidentReport.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }
  async moderate(
    actor: User,
    entity: AdminEntity,
    id: string,
    input: { status: 'ACTIVE' | 'HIDDEN' | 'SUSPENDED'; reason: string },
  ) {
    return this.db.$transaction(async (tx) => {
      let item;
      let previousStatus: string;
      if (entity === 'users') {
        if (input.status === 'HIDDEN')
          throw new ApiError(400, 'INVALID_STATUS', 'Users can be active or suspended.');
        const before = await tx.user.findUnique({ where: { id } });
        if (!before) throw new ApiError(404, 'NOT_FOUND', 'Account not found.');
        // All administrator suspensions are blocked; changing admin roles requires deliberate operator action.
        if (before.role === 'ADMIN' && input.status === 'SUSPENDED')
          throw new ApiError(
            409,
            'ADMIN_PROTECTED',
            'Administrator accounts cannot be suspended through this dashboard.',
          );
        previousStatus = before.status;
        item = await tx.user.update({
          where: { id },
          data: { status: input.status },
          select: accountSelect,
        });
        if (input.status === 'SUSPENDED') await tx.session.deleteMany({ where: { userId: id } });
      } else {
        if (input.status === 'SUSPENDED')
          throw new ApiError(400, 'INVALID_STATUS', 'Content can be active or hidden.');
        const before =
          entity === 'areas'
            ? await tx.area.findUnique({ where: { id } })
            : entity === 'ratings'
              ? await tx.rating.findUnique({ where: { id } })
              : await tx.incidentReport.findUnique({ where: { id } });
        if (!before) throw new ApiError(404, 'NOT_FOUND', 'Content not found.');
        previousStatus = before.status;
        const update = { where: { id }, data: { status: input.status } };
        item =
          entity === 'areas'
            ? await tx.area.update(update)
            : entity === 'ratings'
              ? await tx.rating.update(update)
              : await tx.incidentReport.update(update);
      }
      await tx.adminAuditLog.create({
        data: {
          actorId: actor.id,
          entityType: entity,
          entityId: id,
          previousStatus,
          status: input.status,
          reason: input.reason,
        },
      });
      return { item };
    });
  }
  async audit(page: number, limit: number) {
    const [items, total] = await this.db.$transaction([
      this.db.adminAuditLog.findMany({
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: { actor: { select: { id: true, name: true } } },
      }),
      this.db.adminAuditLog.count(),
    ]);
    return { items, total, page, limit };
  }
}
