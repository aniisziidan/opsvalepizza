import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-safe base Auth.js config.
 *
 * This file MUST NOT import the Prisma client (or anything that pulls it in),
 * because `middleware.ts` runs in the Edge runtime where Prisma cannot run.
 * It contains only the pieces the middleware needs: the session strategy, the
 * sign-in page, and an `authorized` callback that gates access to /admin/**.
 *
 * The full config (with the Credentials provider that queries Prisma) lives in
 * `lib/auth.ts` and spreads this base in. See Step 8 in the Phase 1 plan.
 */
export const authConfig = {
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: { signIn: '/admin/login' },
  // Providers are attached in lib/auth.ts (the Credentials provider needs
  // Prisma, which is not Edge-safe). Middleware only needs the callback below.
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) || (token.sub as string);
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const path = nextUrl.pathname;
      const isLoginPage = path === '/admin/login';
      const isAdminArea = path.startsWith('/admin');

      // If already logged in and visiting login page, redirect cleanly to dashboard
      if (isLoginPage && isLoggedIn) {
        return Response.redirect(new URL('/admin/dashboard', nextUrl));
      }

      // Allow the login page through for non-authenticated users
      if (isLoginPage) return true;

      // Every other /admin/** route requires a session -> clean redirect to login (no ugly query params)
      if (isAdminArea && !isLoggedIn) {
        return Response.redirect(new URL('/admin/login', nextUrl));
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
