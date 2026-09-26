import type { Config } from '../config.js';
import { ApiError } from '../domain/errors.js';
import { z } from 'zod';

export type SearchResult = {
  id: string;
  displayName: string;
  latitude: number;
  longitude: number;
  bbox?: number[];
};
export interface GeocodingProvider {
  search(query: string): Promise<{ results: SearchResult[]; attribution: string }>;
}
export class DisabledGeocoder implements GeocodingProvider {
  async search(): Promise<never> {
    throw new ApiError(
      503,
      'SEARCH_UNAVAILABLE',
      'Place search is not configured. You can still explore the map.',
    );
  }
}
const responseSchema = z.array(
  z.object({
    place_id: z.number(),
    display_name: z.string(),
    lat: z.coerce.number().min(-90).max(90),
    lon: z.coerce.number().min(-180).max(180),
    boundingbox: z.array(z.coerce.number()).length(4).optional(),
  }),
);

/** User-submitted searches only. One process-wide queue enforces at most one provider call/second. */
export class NominatimGeocoder implements GeocodingProvider {
  private cache = new Map<
    string,
    { expiresAt: number; value: { results: SearchResult[]; attribution: string } }
  >();
  private queue: Promise<unknown> = Promise.resolve();
  private lastRequest = 0;
  constructor(
    private config: Config,
    private request: typeof fetch = fetch,
    private clock = Date.now,
    private pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
  ) {}
  async search(query: string) {
    const key = query.trim().toLowerCase();
    const work = this.queue.then(async () => {
      const cached = this.cache.get(key);
      if (cached && cached.expiresAt > this.clock()) return cached.value;
      await this.pause(Math.max(0, 1100 - (this.clock() - this.lastRequest)));
      this.lastRequest = this.clock();
      const url = new URL('/search', this.config.GEOCODING_BASE_URL);
      url.search = new URLSearchParams({ q: query, format: 'jsonv2', limit: '5' }).toString();
      try {
        const response = await this.request(url, {
          headers: {
            'User-Agent': this.config.GEOCODING_USER_AGENT,
            Accept: 'application/json',
            'Accept-Language': 'en',
          },
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) throw new Error('Provider failure');
        const places = responseSchema.parse(await response.json());
        const value = {
          results: places.map((p) => ({
            id: String(p.place_id),
            displayName: p.display_name,
            latitude: p.lat,
            longitude: p.lon,
            bbox: p.boundingbox
              ? [p.boundingbox[2], p.boundingbox[0], p.boundingbox[3], p.boundingbox[1]]
              : undefined,
          })),
          attribution: '© OpenStreetMap contributors, ODbL; search by Nominatim',
        };
        if (this.cache.size >= 500) this.cache.delete(this.cache.keys().next().value as string);
        this.cache.set(key, {
          expiresAt: this.clock() + this.config.GEOCODING_CACHE_TTL_MS,
          value,
        });
        return value;
      } catch {
        throw new ApiError(
          503,
          'SEARCH_UNAVAILABLE',
          'Place search is temporarily unavailable. Please try later.',
        );
      }
    });
    this.queue = work.catch(() => undefined);
    return work;
  }
}
