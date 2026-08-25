import { PrismaClient, type Material, type PrintType } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Inline the hash here rather than importing from lib/auth.ts: that module
// pulls in NextAuth (which imports `next/server`) and does not resolve cleanly
// under the `tsx` seed runner. Keeping bcrypt local keeps the seed dependency-light.
const hashPassword = (pw: string) => bcrypt.hash(pw, 12);

const prisma = new PrismaClient();

// Plausible mm dimensions per size label. Same L/W as the nominal size.
const SIZE_DIMS: Record<string, { lengthMm: number; widthMm: number; heightMm: number; baseCost: number }> = {
  '28cm': { lengthMm: 280, widthMm: 280, heightMm: 40, baseCost: 0.15 },
  '32cm': { lengthMm: 320, widthMm: 320, heightMm: 40, baseCost: 0.18 },
  '40cm': { lengthMm: 400, widthMm: 400, heightMm: 45, baseCost: 0.24 },
};

const MATERIALS: Material[] = ['KRAFT', 'WHITE'];
const PRINTS: PrintType[] = ['PLAIN', 'PRINTED'];

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

  // Codes MUST match the strings the calculator UI's <select> sends
  // (components/SavingsCalculatorPage.tsx). Note: the UI uses 'UK' (not 'GB')
  // for the United Kingdom, so we seed 'UK' to avoid a code mismatch.
  const countries: [string, string][] = [
    ['IT', 'Italy'],
    ['FR', 'France'],
    ['DE', 'Germany'],
    ['ES', 'Spain'],
    ['NL', 'Netherlands'],
    ['UK', 'United Kingdom'],
    ['BE', 'Belgium'],
    ['PL', 'Poland'],
    ['AT', 'Austria'],
  ];
  for (const [code, name] of countries) {
    await prisma.country.upsert({ where: { code }, update: {}, create: { code, name } });
  }

  // --- BoxConfig: 3 sizes x 2 materials x 2 prints = 12 rows, upsert on composite unique ---
  for (const sizeLabel of Object.keys(SIZE_DIMS)) {
    const { lengthMm, widthMm, heightMm } = SIZE_DIMS[sizeLabel];
    for (const material of MATERIALS) {
      for (const print of PRINTS) {
        await prisma.boxConfig.upsert({
          where: { sizeLabel_material_print: { sizeLabel, material, print } },
          update: { lengthMm, widthMm, heightMm, active: true },
          create: { sizeLabel, material, print, lengthMm, widthMm, heightMm, active: true },
        });
      }
    }
  }

  // --- GLOBAL PricingRule: no natural unique key, so delete-then-create for idempotency ---
  await prisma.pricingRule.deleteMany({ where: { scope: 'GLOBAL' } });
  await prisma.pricingRule.create({
    data: { scope: 'GLOBAL', markupMin: 0.2, markupMax: 0.35, active: true },
  });

  // --- LandedCost: (boxConfig x country) with two qty tiers each; no unique key -> wipe & recreate ---
  await prisma.landedCost.deleteMany({});

  const allBoxes = await prisma.boxConfig.findMany();
  const allCountries = await prisma.country.findMany();

  const landedRows: Array<{
    boxConfigId: string;
    countryId: string;
    qtyTierMin: number;
    qtyTierMax: number | null;
    costEur: number;
    source: 'MANUAL';
    active: boolean;
  }> = [];

  for (const box of allBoxes) {
    const dims = SIZE_DIMS[box.sizeLabel];
    // base by size, +0.02 WHITE, +0.03 PRINTED
    let tierA = dims.baseCost;
    if (box.material === 'WHITE') tierA += 0.02;
    if (box.print === 'PRINTED') tierA += 0.03;
    const tierB = Math.round(tierA * 0.88 * 1e4) / 1e4; // ~12% cheaper
    tierA = Math.round(tierA * 1e4) / 1e4;

    for (const country of allCountries) {
      landedRows.push({
        boxConfigId: box.id,
        countryId: country.id,
        qtyTierMin: 0,
        qtyTierMax: 49999,
        costEur: tierA,
        source: 'MANUAL',
        active: true,
      });
      landedRows.push({
        boxConfigId: box.id,
        countryId: country.id,
        qtyTierMin: 50000,
        qtyTierMax: null,
        costEur: tierB,
        source: 'MANUAL',
        active: true,
      });
    }
  }
  await prisma.landedCost.createMany({ data: landedRows });

  // --- PublicPriceRange manual override: 32cm/WHITE/PRINTED + DE, upsert on composite unique ---
  const overrideBox = await prisma.boxConfig.findUnique({
    where: { sizeLabel_material_print: { sizeLabel: '32cm', material: 'WHITE', print: 'PRINTED' } },
  });
  const de = await prisma.country.findUnique({ where: { code: 'DE' } });
  if (overrideBox && de) {
    await prisma.publicPriceRange.upsert({
      where: { boxConfigId_countryId: { boxConfigId: overrideBox.id, countryId: de.id } },
      update: { minEur: 0.26, maxEur: 0.3, isManualOverride: true, active: true },
      create: {
        boxConfigId: overrideBox.id,
        countryId: de.id,
        minEur: 0.26,
        maxEur: 0.3,
        isManualOverride: true,
        active: true,
      },
    });
  }

  const [boxCount, ruleCount, landedCount, pprCount] = await Promise.all([
    prisma.boxConfig.count(),
    prisma.pricingRule.count({ where: { scope: 'GLOBAL' } }),
    prisma.landedCost.count(),
    prisma.publicPriceRange.count(),
  ]);
  console.log(
    `Seed complete: boxConfigs=${boxCount}, globalRules=${ruleCount}, landedCosts=${landedCount}, publicPriceRanges=${pprCount}`,
  );
}

main().finally(() => prisma.$disconnect());
