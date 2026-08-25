import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Inline the hash here rather than importing from lib/auth.ts: that module
// pulls in NextAuth (which imports `next/server`) and does not resolve cleanly
// under the `tsx` seed runner. Keeping bcrypt local keeps the seed dependency-light.
const hashPassword = (pw: string) => bcrypt.hash(pw, 12);

const prisma = new PrismaClient();

async function main() {
  await prisma.adminUser.upsert({
    where: { email: 'admin@opsvale.com' },
    update: {},
    create: {
      email: 'admin@opsvale.com',
      name: 'OpsVale Admin',
      passwordHash: await hashPassword('ChangeMe!2026'),
      role: 'SUPER_ADMIN',
    },
  });

  const countries: [string, string][] = [
    ['DE', 'Germany'],
    ['FR', 'France'],
    ['IT', 'Italy'],
    ['ES', 'Spain'],
    ['NL', 'Netherlands'],
  ];
  for (const [code, name] of countries) {
    await prisma.country.upsert({ where: { code }, update: {}, create: { code, name } });
  }
}

main().finally(() => prisma.$disconnect());
