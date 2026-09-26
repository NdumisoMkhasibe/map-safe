import 'dotenv/config';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';

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
});
const app = createApp({ db, config });
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

  it('requires the configured Origin and request header for writes', async () => {
    await request(app)
      .post('/api/v1/auth/logout')
      .set('Origin', 'https://attacker.invalid')
      .set('X-MapSafe-Request', 'web')
      .expect(403);
  });
});
