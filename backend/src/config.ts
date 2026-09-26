import { z } from 'zod';

const flag = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: z.string().url(),
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:5173'),
  GOOGLE_CLIENT_ID: z.string().default(''),
  ADMIN_EMAILS: z
    .string()
    .default('')
    .transform((value) =>
      value
        .split(',')
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  ENABLE_DEV_AUTH: flag,
  TRUST_PROXY: flag,
  SESSION_DAYS: z.coerce.number().positive().max(30).default(7),
  SCORE_HALF_LIFE_DAYS: z.coerce.number().positive().default(180),
  OVERLAP_THRESHOLD: z.coerce.number().min(0.01).max(1).default(0.6),
  GEOCODING_PROVIDER: z.enum(['disabled', 'nominatim']).default('nominatim'),
  GEOCODING_USER_AGENT: z.string().default('MapSafe/0.2.0 (contact: mkhasibendumiso3@gmail.com)'),
  GEOCODING_BASE_URL: z.string().url().default('https://nominatim.openstreetmap.org'),
  GEOCODING_CACHE_TTL_MS: z.coerce.number().positive().default(86_400_000),
});
export type Config = z.infer<typeof envSchema>;

/** Invalid production settings fail at startup instead of silently weakening security. */
export function loadConfig(environment: NodeJS.ProcessEnv = process.env): Config {
  const config = envSchema.parse(environment);
  if (new URL(config.FRONTEND_ORIGIN).origin !== config.FRONTEND_ORIGIN)
    throw new Error('FRONTEND_ORIGIN must contain only the origin');
  if (config.NODE_ENV === 'production') {
    if (config.ENABLE_DEV_AUTH)
      throw new Error('Development authentication is forbidden in production');
    if (!config.GOOGLE_CLIENT_ID || !config.FRONTEND_ORIGIN.startsWith('https://'))
      throw new Error('Production requires Google configuration and an HTTPS frontend');
  }
  if (
    config.GEOCODING_PROVIDER === 'nominatim' &&
    !/\S+.*(?:https?:\/\/|@)\S+/.test(config.GEOCODING_USER_AGENT)
  )
    throw new Error(
      'Nominatim requires an identifying application User-Agent with a contact URL or email',
    );
  return config;
}
