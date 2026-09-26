/** Cookie sessions stay HTTP-only. Every mutation uses JSON and the backend checks Origin. */
const baseUrl = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-MapSafe-Request': 'web',
        ...options.headers,
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(
      'We could not reach MapSafe. Check your connection and try again.',
      'NETWORK_ERROR',
      0,
    );
  }
  const body = (await response.json().catch(() => null)) as {
    error?: { message?: string; code?: string; details?: Record<string, unknown> };
  } | null;
  if (!response.ok) {
    throw new ApiError(
      body?.error?.message || 'Something went wrong. Please try again.',
      body?.error?.code || 'REQUEST_FAILED',
      response.status,
      body?.error?.details,
    );
  }
  return body as T;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError && typeof error.details?.nextAllowedAt === 'string') {
    return `${error.message} You can share another experience here after ${new Date(error.details.nextAllowedAt).toLocaleString()}.`;
  }
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
