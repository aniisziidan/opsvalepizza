import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculatorInputSchema } from '@/lib/validation/calculator';
import { resolvePublicRange } from '@/lib/pricing/publicRange';
import { selectActiveCorridor } from '@/lib/pricing/logistics';
import { computeSavings } from '@/lib/calculator/savings';
import { buildCalculatorResponse } from '@/lib/calculator/buildCalculatorResponse';
import {
  getClientIp,
  checkRateLimit,
  createRateLimitResponse,
  RATE_LIMIT_TIERS,
} from '@/lib/ratelimit/rateLimiter';

export async function POST(req: Request) {
  // 1. Rate limiting guard
  const ip = getClientIp(req);
  const rateCheck = checkRateLimit(`calc:${ip}`, RATE_LIMIT_TIERS.CALCULATOR);
  if (!rateCheck.success) {
    return createRateLimitResponse(rateCheck);
  }

  // 2. Input validation
  const parsed = calculatorInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  const inp = parsed.data;
  const material = inp.material === 'white' ? 'WHITE' : 'KRAFT';
  const print = inp.print === 'custom' ? 'PRINTED' : 'PLAIN';

  // 3. Database lookup
  try {
    const country = await prisma.country.findUnique({ where: { code: inp.countryCode } });
    const box = await prisma.boxConfig.findUnique({
      where: { sizeLabel_material_print: { sizeLabel: inp.boxSize, material, print } },
    });
    if (!country || !box) return NextResponse.json({ available: false, reason: 'unsupported_combination' });

    const [rules, landed, approved, corridors] = await Promise.all([
      prisma.pricingRule.findMany({
        where: {
          active: true,
          OR: [{ scope: 'GLOBAL' }, { countryId: country.id }, { boxConfigId: box.id }],
        },
      }),
      prisma.landedCost.findMany({ where: { active: true, boxConfigId: box.id, countryId: country.id } }),
      prisma.publicPriceRange.findFirst({
        where: { boxConfigId: box.id, countryId: country.id, active: true },
      }),
      prisma.logisticsCost.findMany({ where: { active: true, countryId: country.id } }),
    ]);

    const range = resolvePublicRange({
      boxConfigId: box.id,
      countryId: country.id,
      monthlyVolume: inp.monthlyVolume,
      approvedRange:
        approved && approved.active
          ? { minEur: Number(approved.minEur), maxEur: Number(approved.maxEur) }
          : null,
      markupRules: rules.map((r) => ({
        scope: r.scope,
        countryId: r.countryId,
        boxConfigId: r.boxConfigId,
        markupMin: Number(r.markupMin),
        markupMax: Number(r.markupMax),
        active: r.active,
      })),
      landedCosts: landed.map((l) => ({
        boxConfigId: l.boxConfigId,
        countryId: l.countryId,
        qtyTierMin: l.qtyTierMin,
        qtyTierMax: l.qtyTierMax,
        costEur: Number(l.costEur),
        active: l.active,
      })),
      logistics: selectActiveCorridor(
        corridors.map((l) => ({
          id: l.id,
          countryId: l.countryId,
          route: l.route,
          freightEur: l.freightEur ? Number(l.freightEur) : 0,
          inlandEur: l.inlandEur ? Number(l.inlandEur) : 0,
          otherEur: l.otherEur ? Number(l.otherEur) : 0,
          active: l.active,
        })),
        country.id,
      ),
    });
    if (!range.available) return NextResponse.json({ available: false, reason: 'no_estimate' });

    const savings = computeSavings({
      currentPrice: inp.currentPrice,
      monthlyVolume: inp.monthlyVolume,
      priceRange: { minEur: range.minEur, maxEur: range.maxEur },
    });

    return NextResponse.json(buildCalculatorResponse(range, savings));
  } catch (err: any) {
    return NextResponse.json(
      { available: false, reason: 'database_unavailable', error: err?.message || 'Database unavailable' },
      { status: 503 },
    );
  }
}
