import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { authConfig } from '@/auth.config';
import { prisma } from './db';
import { needsRevalidation } from './auth/sessionRevalidation';

export const hashPassword = (pw: string) => bcrypt.hash(pw, 12);
export const verifyPassword = (pw: string, hash: string) =>
  bcrypt.compare(pw, hash);

// Fixed cost-12 bcrypt hash used to equalize timing on the no-user/inactive
// path, mitigating user-enumeration via response-time side channel.
const DUMMY_HASH =
  '$2b$12$NU85z5Fp6BLPGadffgnisuyl0/SM3UXYCOzWgGfTpLVWLtJh7xIxK';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(c) {
        const user = await prisma.adminUser.findUnique({
          where: { email: String(c?.email) },
        });
        if (!user || !user.active) {
          // Run a comparable bcrypt compare so timing doesn't leak whether
          // the account exists / is active.
          await bcrypt.compare(String(c?.password), DUMMY_HASH);
          return null;
        }
        if (!(await verifyPassword(String(c?.password), user.passwordHash)))
          return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    /**
     * Node-runtime JWT callback that layers a periodic database re-validation
     * on top of the edge-safe base callback in `auth.config.ts`.
     *
     * Runs on sign-in (seeds identity + role + a validation stamp) and on every
     * subsequent `auth()` in the Node runtime. When the stamp is older than the
     * re-validation interval it re-reads the live `AdminUser`: if the account is
     * gone or deactivated the callback returns `null`, which invalidates the
     * session so a stale token can no longer load admin pages. This closes the
     * gap where the edge middleware only checks that a token *exists*.
     */
    async jwt({ token, user, ...rest }) {
      // Delegate to the base callback first so id-on-sign-in stays in one place.
      const baseJwt = authConfig.callbacks?.jwt;
      const next = baseJwt
        ? ((await baseJwt({ token, user, ...rest } as Parameters<NonNullable<typeof baseJwt>>[0])) ?? token)
        : token;

      if (user) {
        // Fresh sign-in: seed role and mark the token as just-validated.
        next.role = (user as { role?: string }).role;
        next.lastValidatedAt = Date.now();
        return next;
      }

      if (!needsRevalidation(next.lastValidatedAt as number | undefined, Date.now())) {
        return next;
      }

      const id = (next.id as string | undefined) ?? (next.sub as string | undefined);
      if (!id) return next;

      try {
        const admin = await prisma.adminUser.findUnique({
          where: { id },
          select: { active: true, role: true },
        });
        if (!admin || !admin.active) {
          // Deactivated or deleted -> drop the session on the spot.
          return null;
        }
        next.role = admin.role;
        next.lastValidatedAt = Date.now();
      } catch {
        // Fail open on transient DB errors: keep the existing token rather than
        // logging every admin out. `requireAdmin` still re-checks on mutations.
      }
      return next;
    },
  },
});
