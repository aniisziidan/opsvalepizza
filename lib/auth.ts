import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { authConfig } from '@/auth.config';
import { prisma } from './db';

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
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
});
