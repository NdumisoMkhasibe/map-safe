import { createHash, randomBytes } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import type { PrismaClient, User } from '@prisma/client';
import type { Config } from '../config.js';
import { ApiError } from '../domain/errors.js';
import { DAY_MS } from '../domain/scoring.js';

export type Identity = {
  subject: string;
  email: string;
  name: string;
  avatarUrl?: string;
  authoritativeEmail: boolean;
};
export interface IdentityVerifier {
  verify(credential: string): Promise<Identity>;
}

/** The official library verifies signatures, audience, issuer and expiration against Google's keys. */
export class GoogleIdentityVerifier implements IdentityVerifier {
  private client = new OAuth2Client();
  constructor(private clientId: string) {}
  async verify(credential: string): Promise<Identity> {
    if (!this.clientId)
      throw new ApiError(503, 'AUTH_UNAVAILABLE', 'Google sign-in is not configured yet.');
    try {
      const ticket = await this.client.verifyIdToken({
        idToken: credential,
        audience: this.clientId,
      });
      const payload = ticket.getPayload();
      if (
        !payload?.sub ||
        !payload.email ||
        payload.email_verified !== true ||
        !['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss) ||
        payload.aud !== this.clientId ||
        payload.exp * 1000 <= Date.now()
      )
        throw new Error('Invalid claims');
      return {
        subject: payload.sub,
        email: payload.email.toLowerCase(),
        name: payload.given_name || payload.name || 'Community member',
        avatarUrl: payload.picture?.startsWith('https://') ? payload.picture : undefined,
        authoritativeEmail:
          payload.email.toLowerCase().endsWith('@gmail.com') || Boolean(payload.hd),
      };
    } catch {
      throw new ApiError(
        401,
        'INVALID_GOOGLE_TOKEN',
        'Google could not verify this sign-in. Please try again.',
      );
    }
  }
}

/** Public identities deliberately omit email, subject, session and precise GPS metadata. */
export function publicName(name: string) {
  const first = name.trim().split(/\s+/)[0];
  return first && !first.includes('@') ? first.slice(0, 50) : 'Community member';
}
export function currentUser(user: User) {
  return {
    id: user.id,
    name: publicName(user.name),
    avatarUrl: user.avatarUrl,
    role: user.role,
    status: user.status,
  };
}
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');

export class AuthService {
  constructor(
    private db: PrismaClient,
    private config: Config,
    private verifier: IdentityVerifier,
    private now = () => new Date(),
  ) {}
  async google(credential: string) {
    const identity = await this.verifier.verify(credential);
    // Email collisions with a legacy or different Google subject require deliberate operator recovery.
    const existing = await this.db.user.findUnique({ where: { googleSubject: identity.subject } });
    const emailOwner = await this.db.user.findUnique({ where: { email: identity.email } });
    if (emailOwner && emailOwner.id !== existing?.id)
      throw new ApiError(
        409,
        'ACCOUNT_LINK_REQUIRED',
        'This email belongs to an existing account. Contact the site administrator.',
      );
    const role =
      identity.authoritativeEmail && this.config.ADMIN_EMAILS.includes(identity.email)
        ? 'ADMIN'
        : (existing?.role ?? 'USER');
    const user = await this.db.user.upsert({
      where: { googleSubject: identity.subject },
      create: {
        googleSubject: identity.subject,
        email: identity.email,
        name: identity.name,
        avatarUrl: identity.avatarUrl,
        role,
      },
      update: { email: identity.email, name: identity.name, avatarUrl: identity.avatarUrl, role },
    });
    return this.session(user);
  }
  async development(persona: 'user' | 'admin') {
    if (this.config.NODE_ENV === 'production' || !this.config.ENABLE_DEV_AUTH)
      throw new ApiError(404, 'NOT_FOUND', 'Route not found.');
    const user = await this.db.user.upsert({
      where: { googleSubject: `development-${persona}` },
      create: {
        googleSubject: `development-${persona}`,
        name: persona === 'admin' ? 'Demo moderator' : 'Demo explorer',
        email: `${persona}@mapsafe.invalid`,
        role: persona === 'admin' ? 'ADMIN' : 'USER',
      },
      update: {},
    });
    return this.session(user);
  }
  private async session(user: User) {
    if (user.status !== 'ACTIVE')
      throw new ApiError(403, 'ACCOUNT_SUSPENDED', 'This account is suspended.');
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(this.now().getTime() + this.config.SESSION_DAYS * DAY_MS);
    await this.db.$transaction([
      this.db.session.deleteMany({ where: { userId: user.id, expiresAt: { lt: this.now() } } }),
      this.db.session.create({ data: { tokenHash: tokenHash(token), userId: user.id, expiresAt } }),
    ]);
    return { token, expiresAt, user: currentUser(user) };
  }
  async resolve(token?: string) {
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
    const session = await this.db.session.findUnique({
      where: { tokenHash: tokenHash(token) },
      include: { user: true },
    });
    return session && session.expiresAt > this.now() && session.user.status === 'ACTIVE'
      ? session.user
      : null;
  }
  async logout(token?: string) {
    if (token) await this.db.session.deleteMany({ where: { tokenHash: tokenHash(token) } });
  }
}
