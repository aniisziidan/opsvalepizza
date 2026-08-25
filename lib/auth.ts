import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { authConfig } from '@/auth.config';
import { prisma } from './db';

export const hashPassword = (pw: string) => bcrypt.hash(pw, 12);
export const verifyPassword = (pw: string, hash: string) =>
  bcrypt.compare(pw, hash);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(c) {
        const user = await prisma.adminUser.findUnique({
          where: { email: String(c?.email) },
        });
        if (!user || !user.active) return null;
        if (!(await verifyPassword(String(c?.password), user.passwordHash)))
          return null;
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
});
