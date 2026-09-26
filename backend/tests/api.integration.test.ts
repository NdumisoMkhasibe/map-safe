import 'dotenv/config';
import { createHash } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import type { Identity } from '../src/services/auth.service.js';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) throw new Error('TEST_DATABASE_URL is required for API integration tests.');
const db = new PrismaClient({ datasourceUrl: databaseUrl });
const config = loadConfig({
  ...process.env,
  DATABASE_URL: databaseUrl,
  NODE_ENV: 'test',
  ENABLE_DEV_AUTH: 'true',
  FRONTEND_ORIGIN: 'http://localhost:5173',
  GOOGLE_CLIENT_ID: 'test-client.apps.googleusercontent.com',
  ADMIN_EMAILS: 'admin@example.com,untrusted@example.com',
});
const testIdentities: Record<string, Identity> = {
  'google-credential-admin': {
    subject: 'google-subject-admin',
    email: 'admin@example.com',
    name: 'Admin Example',
    authoritativeEmail: true,
  },
  'google-credential-admin-updated': {
    subject: 'google-subject-admin',
    email: 'admin@example.com',
    name: 'Updated Admin',
    authoritativeEmail: true,
  },
  'google-credential-user': {
    subject: 'google-subject-user',
    email: 'member@example.net',
    name: 'Member Example',
    authoritativeEmail: false,
  },
  'google-credential-untrusted': {
    subject: 'google-subject-untrusted',
    email: 'untrusted@example.com',
    name: 'Untrusted Example',
    authoritativeEmail: false,
  },
};
const app = createApp({
  db,
  config,
  verifier: {
    async verify(credential) {
      const identity = testIdentities[credential];
      if (!identity) throw new Error('Unknown test credential');
      return identity;
    },
  },
});
const webRequest = (agent: ReturnType<typeof request.agent>) =>
  agent.set('Origin', config.FRONTEND_ORIGIN).set('X-MapSafe-Request', 'web');
const areaGeometry = {
  type: 'Polygon',
  coordinates: [
    [
      [28.0, -26.2],
      [28.01, -26.2],
      [28.01, -26.19],
      [28.0, -26.19],
      [28.0, -26.2],
    ],
  ],
};

describe('versioned HTTP API against isolated PostgreSQL', () => {
  beforeAll(async () => db.$connect());
  beforeEach(async () => {
    await db.adminAuditLog.deleteMany();
    await db.session.deleteMany();
    await db.incidentReport.deleteMany();
    await db.rating.deleteMany();
    await db.area.deleteMany();
    await db.legacyRating.deleteMany();
    await db.legacyLocation.deleteMany();
    await db.user.deleteMany();
  });
  afterAll(async () => db.$disconnect());

  it('serves health and anonymous map browsing without requiring a session', async () => {
    await request(app)
      .get('/health')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ status: 'ok', service: 'mapsafe-backend' });
      });
    await request(app).get('/api/v1/areas').expect(200).expect({
      areas: [],
      total: 0,
      page: 1,
      limit: 50,
    });
  });

  it('blocks anonymous mutations and rejects invalid quadrilaterals', async () => {
    const anonymous = request.agent(app);
    await webRequest(anonymous)
      .post('/api/v1/areas')
      .send({ name: 'Example', geometry: areaGeometry })
      .expect(401);

    await webRequest(anonymous)
      .post('/api/v1/auth/development')
      .send({ persona: 'user' })
      .expect(200);
    await webRequest(anonymous)
      .post('/api/v1/areas')
      .send({
        name: 'Crossing area',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [28, -26],
              [28.01, -26.01],
              [28, -26.01],
              [28.01, -26],
              [28, -26],
            ],
          ],
        },
      })
      .expect(400);
  });

  it('persists Google identities and grants ADMIN only to allowlisted authoritative email', async () => {
    const admin = request.agent(app);
    const first = await webRequest(admin)
      .post('/api/v1/auth/google')
      .send({ credential: 'google-credential-admin' })
      .expect(200);
    expect(first.body.user.role).toBe('ADMIN');
    expect(first.body.user).not.toHaveProperty('email');

    const rawToken = first.headers['set-cookie'][0].match(/mapsafe_session=([^;]+)/)?.[1];
    expect(rawToken).toBeTruthy();
    const storedAdmin = await db.user.findUnique({
      where: { googleSubject: 'google-subject-admin' },
    });
    expect(storedAdmin).toMatchObject({
      email: 'admin@example.com',
      name: 'Admin Example',
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    const storedSession = await db.session.findUnique({
      where: { tokenHash: createHash('sha256').update(rawToken!).digest('hex') },
    });
    expect(storedSession?.userId).toBe(storedAdmin?.id);
    expect(storedSession?.tokenHash).not.toBe(rawToken);

    const updated = await webRequest(admin)
      .post('/api/v1/auth/google')
      .send({ credential: 'google-credential-admin-updated' })
      .expect(200);
    expect(updated.body.user.id).toBe(storedAdmin?.id);
    expect(await db.user.count({ where: { googleSubject: 'google-subject-admin' } })).toBe(1);
    expect(
      (await db.user.findUnique({ where: { googleSubject: 'google-subject-admin' } }))?.name,
    ).toBe('Updated Admin');

    const nonAdmin = request.agent(app);
    const user = await webRequest(nonAdmin)
      .post('/api/v1/auth/google')
      .send({ credential: 'google-credential-user' })
      .expect(200);
    expect(user.body.user.role).toBe('USER');
    expect(
      await db.user.findUnique({ where: { googleSubject: 'google-subject-user' } }),
    ).toMatchObject({
      email: 'member@example.net',
      role: 'USER',
    });

    const spoofedAllowlistMatch = await webRequest(request.agent(app))
      .post('/api/v1/auth/google')
      .send({ credential: 'google-credential-untrusted' })
      .expect(200);
    expect(spoofedAllowlistMatch.body.user.role).toBe('USER');
    expect(
      await db.user.findUnique({ where: { googleSubject: 'google-subject-untrusted' } }),
    ).toMatchObject({
      email: 'untrusted@example.com',
      role: 'USER',
    });

    await webRequest(admin).get('/api/v1/admin/dashboard').expect(200);
    await webRequest(nonAdmin).get('/api/v1/admin/dashboard').expect(403);
  });

  it('creates a self-attested recent report and blocks a duplicate overlap', async () => {
    const member = request.agent(app);
    await webRequest(member).post('/api/v1/auth/development').send({ persona: 'user' }).expect(200);
    const now = new Date();
    const payload = {
      area: { name: 'Local park', geometry: areaGeometry },
      score: 3,
      visitedAt: new Date(now.getTime() - 60_000).toISOString(),
      attested: true,
      incidents: [{ category: 'OTHER', otherType: 'Broken streetlight' }],
    };
    const first = await webRequest(member).post('/api/v1/ratings').send(payload).expect(201);
    expect(first.body.rating.verificationMethod).toBe('SELF_ATTESTED');
    expect(first.body.rating.incidents[0].otherType).toBe('Broken streetlight');
    expect(first.body.rating.user).not.toHaveProperty('email');
    const duplicate = await webRequest(member).post('/api/v1/ratings').send(payload).expect(409);
    expect(duplicate.body.error.code).toBe('RATING_COOLDOWN');
    expect(duplicate.body.error.details.nextAllowedAt).toBeTypeOf('string');
  });

  it('serializes concurrent overlapping submissions in PostgreSQL', async () => {
    const member = request.agent(app);
    await webRequest(member)
      .post('/api/v1/auth/google')
      .send({ credential: 'google-credential-user' })
      .expect(200);
    const payload = {
      area: { name: 'Concurrent park', geometry: areaGeometry },
      score: 4,
      visitedAt: new Date(Date.now() - 60_000).toISOString(),
      attested: true,
      incidents: [],
    };
    const responses = await Promise.all([
      webRequest(member).post('/api/v1/ratings').send(payload),
      webRequest(member).post('/api/v1/ratings').send(payload),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    expect(responses.find((response) => response.status === 409)?.body.error.code).toBe(
      'RATING_COOLDOWN',
    );
    expect(await db.rating.count()).toBe(1);
    expect(await db.area.count()).toBe(1);
  });

  it('audits account suspension, revokes sessions and protects admin accounts', async () => {
    const admin = request.agent(app);
    const adminLogin = await webRequest(admin)
      .post('/api/v1/auth/google')
      .send({ credential: 'google-credential-admin' })
      .expect(200);
    const member = request.agent(app);
    await webRequest(member)
      .post('/api/v1/auth/google')
      .send({ credential: 'google-credential-user' })
      .expect(200);
    const memberUser = await db.user.findUniqueOrThrow({
      where: { googleSubject: 'google-subject-user' },
    });

    await webRequest(admin)
      .patch(`/api/v1/admin/users/${memberUser.id}`)
      .send({ status: 'SUSPENDED', reason: 'Repeated policy violations' })
      .expect(200);

    const suspended = await db.user.findUnique({ where: { googleSubject: 'google-subject-user' } });
    expect(suspended?.status).toBe('SUSPENDED');
    expect(await db.session.count({ where: { userId: suspended!.id } })).toBe(0);
    expect(
      await webRequest(member)
        .get('/api/v1/auth/me')
        .expect(200)
        .then((r) => r.body.user),
    ).toBe(null);
    expect(await db.adminAuditLog.count({ where: { actorId: adminLogin.body.user.id } })).toBe(1);

    await webRequest(admin)
      .patch(`/api/v1/admin/users/${adminLogin.body.user.id}`)
      .send({ status: 'SUSPENDED', reason: 'Self suspension attempt' })
      .expect(409)
      .expect(({ body }) => expect(body.error.code).toBe('ADMIN_PROTECTED'));
  });

  it('requires the configured Origin and request header for writes', async () => {
    await request(app)
      .post('/api/v1/auth/logout')
      .set('Origin', 'https://attacker.invalid')
      .set('X-MapSafe-Request', 'web')
      .expect(403);
  });
});
