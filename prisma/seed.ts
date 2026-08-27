import { PrismaClient, type Material, type PrintType, LeadStatus, QuoteStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const hashPassword = (pw: string) => bcrypt.hash(pw, 12);

const prisma = new PrismaClient();

// Plausible mm dimensions per size label.
const SIZE_DIMS: Record<string, { lengthMm: number; widthMm: number; heightMm: number; baseCost: number }> = {
  '28cm': { lengthMm: 280, widthMm: 280, heightMm: 40, baseCost: 0.15 },
  '32cm': { lengthMm: 320, widthMm: 320, heightMm: 40, baseCost: 0.18 },
  '40cm': { lengthMm: 400, widthMm: 400, heightMm: 45, baseCost: 0.24 },
};

const MATERIALS: Material[] = ['KRAFT', 'WHITE'];
const PRINTS: PrintType[] = ['PLAIN', 'PRINTED'];

async function main() {
  console.log('--- Starting OpsVale Database Seeding ---');

  // 1. Admin Super User
  await prisma.adminUser.upsert({
    where: { email: 'admin@opsvale.com' },
    update: {},
    create: {
      email: 'admin@opsvale.com',
      name: 'Sarah Jenkins',
      passwordHash: await hashPassword('ChangeMe!2026'),
      role: 'SUPER_ADMIN',
    },
  });

  // 2. Countries
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

  // 3. BoxConfigs (12 configurations)
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

  // 4. Global PricingRule
  await prisma.pricingRule.deleteMany({ where: { scope: 'GLOBAL' } });
  await prisma.pricingRule.create({
    data: { scope: 'GLOBAL', markupMin: 0.2, markupMax: 0.35, active: true },
  });

  // 5. Landed Costs
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
    let tierA = dims.baseCost;
    if (box.material === 'WHITE') tierA += 0.02;
    if (box.print === 'PRINTED') tierA += 0.03;
    const tierB = Math.round(tierA * 0.88 * 1e4) / 1e4;
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

  // 6. Lead Sequence Initialization
  await prisma.leadSequence.upsert({
    where: { year: 2026 },
    update: {},
    create: { year: 2026, currentNumber: 100 },
  });

  // 7. Seed Sample Companies, Contacts & Real Commercial Pipeline Deals
  const sampleCompanies = [
    {
      name: 'Bavaria Pizza Group GmbH',
      website: 'bavariapizza.de',
      countryCode: 'DE',
      branchCount: 24,
      branchRange: '20-50',
      contactName: 'Hans Gruber',
      contactEmail: 'hans@bavariapizza.de',
      contactPhone: '+49 89 2039 480',
      leadCode: 'OPS-2026-0042',
      status: LeadStatus.WON,
      boxSize: '32cm',
      material: 'KRAFT' as Material,
      print: 'PRINTED' as PrintType,
      monthlyVolume: 60000,
      quoteQty: 30000,
      unitPriceEur: 0.192,
      city: 'Munich',
      source: 'Savings Calculator',
    },
    {
      name: 'Milano Crust & Co S.r.l.',
      website: 'milanocrust.it',
      countryCode: 'IT',
      branchCount: 15,
      branchRange: '10-20',
      contactName: 'Matteo Moretti',
      contactEmail: 'm.moretti@milanocrust.it',
      contactPhone: '+39 02 8940 112',
      leadCode: 'OPS-2026-0058',
      status: LeadStatus.NEGOTIATING,
      boxSize: '32cm',
      material: 'WHITE' as Material,
      print: 'PRINTED' as PrintType,
      monthlyVolume: 45000,
      quoteQty: 25000,
      unitPriceEur: 0.215,
      city: 'Milan',
      source: 'Savings Calculator',
    },
    {
      name: 'Le Fournil Parisien SAS',
      website: 'lefournilparis.fr',
      countryCode: 'FR',
      branchCount: 8,
      branchRange: '6-10',
      contactName: 'Camille Laurent',
      contactEmail: 'claurent@lefournilparis.fr',
      contactPhone: '+33 1 42 68 00 11',
      leadCode: 'OPS-2026-0071',
      status: LeadStatus.QUOTE_SENT,
      boxSize: '32cm',
      material: 'KRAFT' as Material,
      print: 'PRINTED' as PrintType,
      monthlyVolume: 35000,
      quoteQty: 20000,
      unitPriceEur: 0.208,
      city: 'Paris',
      source: 'Direct Quote Form',
    },
    {
      name: 'Iberia Pizzerías S.L.',
      website: 'iberiapizzas.es',
      countryCode: 'ES',
      branchCount: 30,
      branchRange: '20-50',
      contactName: 'Sofia Fernandez',
      contactEmail: 's.fernandez@iberiapizzas.es',
      contactPhone: '+34 91 524 88 00',
      leadCode: 'OPS-2026-0089',
      status: LeadStatus.REVIEWING,
      boxSize: '40cm',
      material: 'KRAFT' as Material,
      print: 'PLAIN' as PrintType,
      monthlyVolume: 80000,
      quoteQty: 40000,
      unitPriceEur: 0.245,
      city: 'Madrid',
      source: 'Savings Calculator',
    },
    {
      name: 'Amsterdam Artisanal Slice B.V.',
      website: 'amsterdamslice.nl',
      countryCode: 'NL',
      branchCount: 4,
      branchRange: '1-5',
      contactName: 'Daan van Dijk',
      contactEmail: 'daan@amsterdamslice.nl',
      contactPhone: '+31 20 624 9900',
      leadCode: 'OPS-2026-0095',
      status: LeadStatus.NEW,
      boxSize: '28cm',
      material: 'WHITE' as Material,
      print: 'PRINTED' as PrintType,
      monthlyVolume: 20000,
      quoteQty: 10000,
      unitPriceEur: 0.185,
      city: 'Amsterdam',
      source: 'Direct Quote Form',
    },
  ];

  for (const item of sampleCompanies) {
    const company = await prisma.company.create({
      data: {
        name: item.name,
        normalizedName: item.name.toLowerCase().trim(),
        website: item.website,
        countryCode: item.countryCode,
        branchCount: item.branchCount,
        branchRange: item.branchRange,
      },
    });

    const contact = await prisma.contact.create({
      data: {
        companyId: company.id,
        name: item.contactName,
        email: item.contactEmail,
        phone: item.contactPhone,
        jobTitle: 'Head of Procurement',
      },
    });

    const lead = await prisma.lead.create({
      data: {
        code: item.leadCode,
        companyId: company.id,
        contactId: contact.id,
        status: item.status,
        source: item.source,
      },
    });

    // Create quote request record
    await prisma.quoteRequest.create({
      data: {
        leadId: lead.id,
        boxSpecificationType: 'STANDARD',
        standardBoxSize: item.boxSize,
        qtyPerOrder: item.quoteQty,
        lengthMm: SIZE_DIMS[item.boxSize]?.lengthMm ?? 320,
        widthMm: SIZE_DIMS[item.boxSize]?.widthMm ?? 320,
        heightMm: SIZE_DIMS[item.boxSize]?.heightMm ?? 40,
        material: item.material,
        print: item.print,
        monthlyVolume: item.monthlyVolume,
        deliveryCountryCode: item.countryCode,
        deliveryCity: item.city,
        hasLoadingDock: true,
        deliveryFrequency: 'Bi-Weekly Pallet Drop',
      },
    });

    // Create commercial quotation
    const quoteStatus =
      item.status === LeadStatus.WON
        ? QuoteStatus.ACCEPTED
        : item.status === LeadStatus.QUOTE_SENT || item.status === LeadStatus.NEGOTIATING
        ? QuoteStatus.SENT
        : QuoteStatus.DRAFT;

    const quote = await prisma.quote.create({
      data: {
        leadId: lead.id,
        revision: 1,
        status: quoteStatus,
        qty: item.quoteQty,
        unitPriceEur: item.unitPriceEur,
        specs: `${item.boxSize} ${item.material} / ${item.print}`,
        paymentTerms: 'Net 30 Days',
        sentAt: item.status !== LeadStatus.NEW ? new Date(Date.now() - 48 * 3600000) : null,
        expiresAt: item.status !== LeadStatus.NEW ? new Date(Date.now() + 14 * 86400000) : null,
        acceptedAt: item.status === LeadStatus.WON ? new Date(Date.now() - 12 * 3600000) : null,
        snapshot: {
          companyName: item.name,
          contactName: item.contactName,
          boxSpec: `${item.boxSize} Premium Corrugated Pizza Box`,
          boxSpecificationType: 'STANDARD',
          material: item.material,
          print: item.print,
          monthlyVolume: item.monthlyVolume,
          deliveryCity: item.city,
          deliveryCountryCode: item.countryCode,
          hasLoadingDock: true,
          deliveryFrequency: 'Bi-Weekly Pallet Drop',
          paymentTerms: 'Net 30 Days',
          dispatchSla: '48-Hour Corridor SLA',
          proposalLocale: item.countryCode.toLowerCase(),
        },
      },
    });

    // Activity log
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        type: 'STATUS_CHANGE',
        content: `Lead pipeline initialized in ${item.status} status with Quote Rev ${quote.revision}`,
      },
    });
  }

  const [boxCount, ruleCount, landedCount, leadCount] = await Promise.all([
    prisma.boxConfig.count(),
    prisma.pricingRule.count({ where: { scope: 'GLOBAL' } }),
    prisma.landedCost.count(),
    prisma.lead.count(),
  ]);

  console.log('--- Database Seeding Complete ---');
  console.log(`Box Configurations: ${boxCount}`);
  console.log(`Global Pricing Rules: ${ruleCount}`);
  console.log(`Landed Cost Corridors: ${landedCount}`);
  console.log(`Active Pipeline Deals: ${leadCount}`);
}

main().finally(() => prisma.$disconnect());
