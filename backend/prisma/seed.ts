import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { parseQuadrilateral } from '../src/domain/geometry.js';

const prisma = new PrismaClient();

/** Stable IDs make the clearly fictional local demonstration seed safe to rerun. */
async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('The fictional MapSafe demo seed cannot run in production.');
  }

  const user = await prisma.user.upsert({
    where: { email: 'demo@mapsafe.invalid' },
    create: {
      id: 'mapsafe-demo-user',
      name: 'Demo Contributor',
      email: 'demo@mapsafe.invalid',
    },
    update: {},
  });
  const areaData = parseQuadrilateral({
    type: 'Polygon',
    coordinates: [
      [
        [28.05, -26.205],
        [28.056, -26.205],
        [28.056, -26.2],
        [28.05, -26.2],
        [28.05, -26.205],
      ],
    ],
  });
  const area = await prisma.area.upsert({
    where: { id: 'mapsafe-demo-area' },
    create: {
      id: 'mapsafe-demo-area',
      name: 'Fictional demo area · Johannesburg',
      creatorId: user.id,
      ...areaData,
    },
    update: { name: 'Fictional demo area · Johannesburg', ...areaData },
  });
  const ratingDate = new Date(Date.now() - 2 * 60 * 60 * 1000);
  await prisma.rating.upsert({
    where: { id: 'mapsafe-demo-rating' },
    create: {
      id: 'mapsafe-demo-rating',
      areaId: area.id,
      userId: user.id,
      score: 4,
      comment: 'Fictional demonstration report. This is not local safety information.',
      visitedAt: ratingDate,
      attestedAt: ratingDate,
      createdAt: ratingDate,
    },
    update: {},
  });

  console.log('Inserted or retained one explicitly fictional MapSafe demo report.');
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Demo seed failed.');
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
