import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';

// Edge-safe: instantiate NextAuth with the provider-less base config only.
// This does NOT import lib/auth.ts (which pulls in the Prisma client and would
// break the Edge middleware runtime). The `authorized` callback in authConfig
// gates /admin/** and redirects unauthenticated users to /admin/login.
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ['/admin/:path*'],
};
