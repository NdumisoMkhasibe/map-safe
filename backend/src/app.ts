import { randomUUID } from 'node:crypto';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import * as helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { Prisma, type PrismaClient, type User } from '@prisma/client';
import { z, ZodError } from 'zod';
import type { Config } from './config.js';
import { ApiError } from './domain/errors.js';
import {
  areaSchema,
  ratingSchema,
  areaQuerySchema,
  adminQuerySchema,
  idSchema,
  moderationSchema,
  paginationSchema,
  pointSchema,
} from './domain/validation.js';
import {
  AuthService,
  GoogleIdentityVerifier,
  currentUser,
  type IdentityVerifier,
} from './services/auth.service.js';
import { AreaService } from './services/area.service.js';
import { AdminService, requireAdmin, type AdminEntity } from './services/admin.service.js';
import {
  DisabledGeocoder,
  NominatimGeocoder,
  type GeocodingProvider,
} from './services/geocoding.service.js';
import { getHealthStatus } from './services/health.service.js';

type Options = {
  db: PrismaClient;
  config: Config;
  verifier?: IdentityVerifier;
  geocoder?: GeocodingProvider;
  now?: () => Date;
};
const cookieName = 'mapsafe_session';
function cookie(req: Request): string | undefined {
  return req.headers.cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);
}
function signedIn(response: { locals: { user?: User | null } }): User {
  const user = response.locals.user;
  if (!user) throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in to continue.');
  return user;
}

/** HTTP composition stays separate from listening and business rules, making the real API testable. */
export function createApp({ db, config, verifier, geocoder, now = () => new Date() }: Options) {
  if (config.NODE_ENV === 'production' && config.ENABLE_DEV_AUTH)
    throw new Error('Development authentication is forbidden in production');
  const app = express();
  app.disable('x-powered-by');
  if (config.TRUST_PROXY) app.set('trust proxy', 1);
  const auth = new AuthService(
    db,
    config,
    verifier ?? new GoogleIdentityVerifier(config.GOOGLE_CLIENT_ID),
    now,
  );
  const areas = new AreaService(db, config, now);
  const admin = new AdminService(db, config.SCORE_HALF_LIFE_DAYS, now);
  const search =
    geocoder ??
    (config.GEOCODING_PROVIDER === 'nominatim'
      ? new NominatimGeocoder(config)
      : new DisabledGeocoder());
  const cookieOptions = {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/api/v1',
  };
  app.use(helmet.default());
  app.use((req, res, next) => {
    res.locals.requestId = randomUUID();
    res.setHeader('X-Request-ID', res.locals.requestId as string);
    next();
  });
  app.use(
    cors({
      origin: config.FRONTEND_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-MapSafe-Request'],
    }),
  );
  app.use(express.json({ limit: '32kb', strict: true }));
  app.get('/health', (_req, res) => {
    res.json(getHealthStatus());
  });
  const limited = {
    error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
  };
  app.use(
    '/api/v1',
    rateLimit({
      windowMs: 60_000,
      limit: 180,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: limited,
    }),
  );
  app.use('/api/v1', (req, _res, next) => {
    // SameSite cookies alone are insufficient: the exact allowed Origin and a non-simple header prevent login and session CSRF.
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
      (req.get('Origin') !== config.FRONTEND_ORIGIN || req.get('X-MapSafe-Request') !== 'web')
    )
      throw new ApiError(
        403,
        'CSRF_REJECTED',
        'This request did not originate from the MapSafe application.',
      );
    next();
  });
  app.use('/api/v1', async (req, res, next) => {
    res.locals.user = await auth.resolve(cookie(req));
    next();
  });
  app.use(
    '/api/v1/auth',
    rateLimit({
      windowMs: 15 * 60_000,
      limit: 60,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: limited,
    }),
    (_req, res, next) => {
      res.setHeader('Cache-Control', 'no-store');
      next();
    },
  );
  app.get('/api/v1/auth/me', (_req, res) => {
    res.json({ user: res.locals.user ? currentUser(res.locals.user as User) : null });
  });
  app.post('/api/v1/auth/google', async (req, res) => {
    const { credential } = z
      .object({ credential: z.string().min(10).max(10000) })
      .strict()
      .parse(req.body);
    const session = await auth.google(credential);
    res.cookie(cookieName, session.token, { ...cookieOptions, expires: session.expiresAt });
    res.json({ user: session.user });
  });
  if (config.NODE_ENV !== 'production' && config.ENABLE_DEV_AUTH) {
    app.post('/api/v1/auth/development', async (req, res) => {
      const remote = req.socket.remoteAddress;
      if (
        !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote ?? '') ||
        !['localhost', '127.0.0.1', '[::1]'].includes(new URL(config.FRONTEND_ORIGIN).hostname)
      )
        throw new ApiError(403, 'LOCAL_ONLY', 'Development sign-in is available on loopback only.');
      const { persona } = z
        .object({ persona: z.enum(['user', 'admin']) })
        .strict()
        .parse(req.body);
      const session = await auth.development(persona);
      res.cookie(cookieName, session.token, { ...cookieOptions, expires: session.expiresAt });
      res.json({ user: session.user });
    });
  }
  app.post('/api/v1/auth/logout', async (req, res) => {
    await auth.logout(cookie(req));
    res.clearCookie(cookieName, cookieOptions);
    res.status(204).end();
  });
  app.get('/api/v1/areas', async (req, res) => {
    res.json(await areas.list(areaQuerySchema.parse(req.query)));
  });
  app.post('/api/v1/areas', async (req, res) => {
    res.status(201).json(await areas.create(signedIn(res), areaSchema.parse(req.body)));
  });
  app.get('/api/v1/areas/:id', async (req, res) => {
    res.json(await areas.detail(idSchema.parse(req.params.id)));
  });
  app.patch('/api/v1/areas/:id', async (req, res) => {
    const input = z
      .object({
        name: z.string().trim().min(2).max(100).optional(),
        geometry: z.unknown().optional(),
      })
      .strict()
      .refine(
        (value) => value.name !== undefined || value.geometry !== undefined,
        'Supply an updated name or geometry.',
      )
      .parse(req.body);
    res.json(await areas.update(signedIn(res), idSchema.parse(req.params.id), input));
  });
  app.get('/api/v1/areas/:id/ratings', async (req, res) => {
    const p = paginationSchema.strict().parse(req.query);
    res.json(await areas.ratings(idSchema.parse(req.params.id), p.page, p.limit));
  });
  app.post('/api/v1/ratings', async (req, res) => {
    res.status(201).json(await areas.submit(signedIn(res), ratingSchema.parse(req.body)));
  });
  app.get('/api/v1/ratings/:id', async (req, res) => {
    res.json(await areas.rating(idSchema.parse(req.params.id)));
  });
  app.get('/api/v1/safety', async (req, res) => {
    const point = pointSchema.parse(req.query);
    res.json(await areas.safety(point.longitude, point.latitude));
  });
  app.get(
    '/api/v1/search',
    rateLimit({
      windowMs: 60_000,
      limit: 10,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: limited,
    }),
    async (req, res) => {
      const { q } = z
        .object({ q: z.string().trim().min(2).max(150) })
        .strict()
        .parse(req.query);
      res.json(await search.search(q));
    },
  );
  app.use('/api/v1/admin', (_req, res, next) => {
    requireAdmin(res.locals.user as User | null);
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.get('/api/v1/admin/dashboard', async (_req, res) => {
    res.json(await admin.dashboard());
  });
  app.get('/api/v1/admin/audit', async (req, res) => {
    const p = paginationSchema.strict().parse(req.query);
    res.json(await admin.audit(p.page, p.limit));
  });
  for (const entity of ['users', 'areas', 'ratings', 'incidents'] satisfies AdminEntity[]) {
    app.get(`/api/v1/admin/${entity}`, async (req, res) => {
      res.json(await admin.list(entity, adminQuerySchema.parse(req.query)));
    });
    app.patch(`/api/v1/admin/${entity}/:id`, async (req, res) => {
      res.json(
        await admin.moderate(
          signedIn(res),
          entity,
          idSchema.parse(req.params.id),
          moderationSchema.parse(req.body),
        ),
      );
    });
  }
  app.use((_req, _res, next) => next(new ApiError(404, 'NOT_FOUND', 'Route not found.')));
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof ApiError) {
      res.status(error.status).json({
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
      });
      return;
    }
    if (error instanceof ZodError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Please check the submitted information.',
          details: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
      });
      return;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      res.status(409).json({
        error: { code: 'CONFLICT', message: 'This record already exists. Please retry.' },
      });
      return;
    }
    if (
      error instanceof SyntaxError ||
      (typeof error === 'object' && error && 'type' in error && error.type === 'entity.too.large')
    ) {
      res.status(error instanceof SyntaxError ? 400 : 413).json({
        error: { code: 'INVALID_BODY', message: 'Send a valid JSON request smaller than 32 KB.' },
      });
      return;
    }
    // Never log bodies, cookies, tokens, database connection strings or GPS coordinates.
    console.error(
      JSON.stringify({
        event: 'request_failed',
        requestId: res.locals.requestId,
        kind: error instanceof Error ? error.name : 'UnknownError',
      }),
    );
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong. Please try again.',
        requestId: res.locals.requestId,
      },
    });
  });
  return app;
}
