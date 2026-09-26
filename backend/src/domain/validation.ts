import { z } from 'zod';

export const incidentCategories = [
  'THEFT',
  'PICKPOCKETING',
  'ROBBERY',
  'ASSAULT',
  'CAR_BREAK_IN',
  'HIJACKING',
  'HARASSMENT',
  'VANDALISM',
  'SUSPICIOUS_ACTIVITY',
  'POOR_LIGHTING',
  'LACK_OF_SECURITY',
  'OTHER',
] as const;
export const incidentSchema = z
  .object({
    category: z.enum(incidentCategories),
    otherType: z.string().trim().min(2).max(100).optional(),
    description: z.string().trim().max(1000).optional(),
  })
  .strict()
  .refine((i) => i.category !== 'OTHER' || Boolean(i.otherType), {
    message: 'Describe the Other incident type.',
    path: ['otherType'],
  });
export const areaSchema = z
  .object({
    name: z.string().trim().min(2).max(100).default('Community area'),
    geometry: z.unknown().refine((g) => g !== undefined, 'Geometry is required'),
  })
  .strict();
export const gpsSchema = z
  .object({
    longitude: z.number().finite().min(-180).max(180),
    latitude: z.number().finite().min(-85).max(85),
    accuracy: z.number().finite().nonnegative().max(100),
    timestamp: z.string().datetime({ offset: true }),
  })
  .strict();
export const ratingSchema = z
  .object({
    areaId: z.string().min(1).max(100).optional(),
    area: areaSchema.optional(),
    score: z.number().int().min(1).max(10),
    comment: z.string().trim().max(2000).optional(),
    visitedAt: z.string().datetime({ offset: true }),
    attested: z.literal(true),
    gps: gpsSchema.optional(),
    incidents: z.array(incidentSchema).max(12).default([]),
  })
  .strict()
  .refine(
    (r) => Boolean(r.areaId) !== Boolean(r.area),
    'Supply either an existing areaId or a new area.',
  )
  .refine(
    (r) => new Set(r.incidents.map((i) => i.category)).size === r.incidents.length,
    'Choose each incident category only once.',
  );
export type RatingInput = z.infer<typeof ratingSchema>;
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export const areaQuerySchema = paginationSchema.extend({ bbox: z.string().optional() }).strict();
export const adminQuerySchema = paginationSchema
  .extend({
    q: z.string().trim().max(100).default(''),
    status: z.enum(['ACTIVE', 'SUSPENDED', 'HIDDEN']).optional(),
  })
  .strict();
export const idSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/);
export const moderationSchema = z
  .object({
    status: z.enum(['ACTIVE', 'HIDDEN', 'SUSPENDED']),
    reason: z.string().trim().min(3).max(500),
  })
  .strict();
export const pointSchema = z
  .object({
    longitude: z.coerce.number().finite().min(-180).max(180),
    latitude: z.coerce.number().finite().min(-85).max(85),
  })
  .strict();
export const bboxSchema = z
  .string()
  .transform((value) => value.split(',').map(Number))
  .pipe(
    z.tuple([
      z.number().min(-180).max(180),
      z.number().min(-85).max(85),
      z.number().min(-180).max(180),
      z.number().min(-85).max(85),
    ]),
  )
  .refine(
    ([west, south, east, north]) => west < east && south < north,
    'Use a non-wrapping west,south,east,north box.',
  );
