'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { Prisma, PricingEntityType, PricingAuditAction, RuleScope } from '@prisma/client';

// Business boundaries: Markup must be strictly between 15% and 45%
const MIN_MARKUP = 0.15;
const MAX_MARKUP = 0.45;

const landedCostSchema = z
  .object({
    boxConfigId: z.string().min(1, 'Box config is required'),
    countryId: z.string().min(1, 'Country is required'),
    qtyTierMin: z.number().int().min(0, 'Tier min must be 0 or greater'),
    qtyTierMax: z.number().int().nullable().optional(),
    costEur: z
      .union([z.number(), z.string()])
      .refine((v) => Number(v) > 0, 'Landed cost must be greater than 0'),
  })
  .refine(
    (d) => d.qtyTierMax === null || d.qtyTierMax === undefined || d.qtyTierMax > d.qtyTierMin,
    {
      message: 'Tier max must be greater than tier min',
      path: ['qtyTierMax'],
    }
  );

const pricingRuleSchema = z
  .object({
    scope: z.enum(['GLOBAL', 'COUNTRY', 'PRODUCT'] as const),
    countryId: z.string().nullable().optional(),
    boxConfigId: z.string().nullable().optional(),
    markupMin: z
      .number()
      .min(MIN_MARKUP, `Minimum markup cannot be less than ${(MIN_MARKUP * 100).toFixed(0)}%`)
      .max(MAX_MARKUP, `Minimum markup cannot exceed ${(MAX_MARKUP * 100).toFixed(0)}%`),
    markupMax: z
      .number()
      .min(MIN_MARKUP, `Maximum markup cannot be less than ${(MIN_MARKUP * 100).toFixed(0)}%`)
      .max(MAX_MARKUP, `Maximum markup cannot exceed ${(MAX_MARKUP * 100).toFixed(0)}%`),
  })
  .refine((d) => d.markupMax >= d.markupMin, {
    message: 'Maximum markup must be greater than or equal to minimum markup',
    path: ['markupMax'],
  })
  .refine(
    (d) => {
      if (d.scope === 'COUNTRY' && !d.countryId) return false;
      if (d.scope === 'PRODUCT' && (!d.countryId || !d.boxConfigId)) return false;
      return true;
    },
    {
      message: 'Country and Box Configuration must be specified for scoped rules',
      path: ['scope'],
    }
  );

const publicPriceRangeSchema = z
  .object({
    boxConfigId: z.string().min(1, 'Box config is required'),
    countryId: z.string().min(1, 'Country is required'),
    minEur: z
      .union([z.number(), z.string()])
      .refine((v) => Number(v) > 0, 'Min price must be greater than 0'),
    maxEur: z
      .union([z.number(), z.string()])
      .refine((v) => Number(v) > 0, 'Max price must be greater than 0'),
    isManualOverride: z.boolean().default(true),
  })
  .refine((d) => Number(d.maxEur) >= Number(d.minEur), {
    message: 'Max price must be greater than or equal to min price',
    path: ['maxEur'],
  });

const toggleActiveSchema = z.object({
  entityType: z.enum(['LANDED_COST', 'PRICING_RULE', 'PUBLIC_PRICE_RANGE'] as const),
  id: z.string().min(1, 'Entity ID is required'),
  active: z.boolean(),
});

/**
 * Creates a new versioned LandedCost record, retiring any matching active tier.
 */
export async function createLandedCostVersion(rawData: unknown) {
  const admin = await requireAdmin();
  const data = landedCostSchema.parse(rawData);

  const costDecimal = new Prisma.Decimal(Number(data.costEur).toFixed(4));
  const qtyTierMaxVal = data.qtyTierMax ?? null;

  const result = await prisma.$transaction(async (tx) => {
    // 1. Exact 4-tuple matching: (boxConfigId, countryId, qtyTierMin, qtyTierMax)
    const existingActive = await tx.landedCost.findFirst({
      where: {
        boxConfigId: data.boxConfigId,
        countryId: data.countryId,
        qtyTierMin: data.qtyTierMin,
        qtyTierMax: qtyTierMaxVal === null ? null : qtyTierMaxVal,
        active: true,
      },
    });

    const now = new Date();

    // 2. Retire active predecessor if present
    if (existingActive) {
      await tx.landedCost.update({
        where: { id: existingActive.id },
        data: {
          active: false,
          effectiveTo: now,
        },
      });
    }

    // 3. Insert new active version
    const newRecord = await tx.landedCost.create({
      data: {
        boxConfigId: data.boxConfigId,
        countryId: data.countryId,
        qtyTierMin: data.qtyTierMin,
        qtyTierMax: qtyTierMaxVal,
        costEur: costDecimal,
        source: 'MANUAL',
        effectiveFrom: now,
        active: true,
      },
    });

    // 4. Record audit log
    await tx.pricingAuditLog.create({
      data: {
        authorId: admin.id,
        entityType: 'LANDED_COST',
        entityId: newRecord.id,
        action: existingActive ? 'VERSION_UPDATE' : 'CREATE',
        oldValues: existingActive
          ? {
              costEur: existingActive.costEur.toString(),
              effectiveFrom: existingActive.effectiveFrom.toISOString(),
            }
          : Prisma.JsonNull,
        newValues: {
          costEur: newRecord.costEur.toString(),
          qtyTierMin: newRecord.qtyTierMin,
          qtyTierMax: newRecord.qtyTierMax,
          effectiveFrom: newRecord.effectiveFrom.toISOString(),
        },
      },
    });

    return newRecord;
  });

  revalidatePath('/admin/pricing');
  revalidatePath('/calculator');

  return { success: true, id: result.id };
}

/**
 * Creates a new versioned PricingRule, retiring any active rule matching the exact scope.
 */
export async function createPricingRuleVersion(rawData: unknown) {
  const admin = await requireAdmin();
  const data = pricingRuleSchema.parse(rawData);

  const markupMinDecimal = new Prisma.Decimal(data.markupMin.toFixed(3));
  const markupMaxDecimal = new Prisma.Decimal(data.markupMax.toFixed(3));

  const result = await prisma.$transaction(async (tx) => {
    const whereClause: Prisma.PricingRuleWhereInput = {
      scope: data.scope as RuleScope,
      countryId: data.countryId || null,
      boxConfigId: data.boxConfigId || null,
      active: true,
    };

    const existingActive = await tx.pricingRule.findFirst({
      where: whereClause,
    });

    const now = new Date();

    if (existingActive) {
      await tx.pricingRule.update({
        where: { id: existingActive.id },
        data: {
          active: false,
          effectiveTo: now,
        },
      });
    }

    const newRecord = await tx.pricingRule.create({
      data: {
        scope: data.scope as RuleScope,
        countryId: data.countryId || null,
        boxConfigId: data.boxConfigId || null,
        markupMin: markupMinDecimal,
        markupMax: markupMaxDecimal,
        effectiveFrom: now,
        active: true,
      },
    });

    await tx.pricingAuditLog.create({
      data: {
        authorId: admin.id,
        entityType: 'PRICING_RULE',
        entityId: newRecord.id,
        action: existingActive ? 'VERSION_UPDATE' : 'CREATE',
        oldValues: existingActive
          ? {
              markupMin: existingActive.markupMin.toString(),
              markupMax: existingActive.markupMax.toString(),
              effectiveFrom: existingActive.effectiveFrom.toISOString(),
            }
          : Prisma.JsonNull,
        newValues: {
          scope: newRecord.scope,
          markupMin: newRecord.markupMin.toString(),
          markupMax: newRecord.markupMax.toString(),
          effectiveFrom: newRecord.effectiveFrom.toISOString(),
        },
      },
    });

    return newRecord;
  });

  revalidatePath('/admin/pricing');
  revalidatePath('/calculator');

  return { success: true, id: result.id };
}

/**
 * Creates a new versioned PublicPriceRange override, retiring any active matching predecessor.
 */
export async function createPublicPriceRangeVersion(rawData: unknown) {
  const admin = await requireAdmin();
  const data = publicPriceRangeSchema.parse(rawData);

  const minDecimal = new Prisma.Decimal(Number(data.minEur).toFixed(4));
  const maxDecimal = new Prisma.Decimal(Number(data.maxEur).toFixed(4));

  const result = await prisma.$transaction(async (tx) => {
    const existingActive = await tx.publicPriceRange.findFirst({
      where: {
        boxConfigId: data.boxConfigId,
        countryId: data.countryId,
        active: true,
      },
    });

    const now = new Date();

    if (existingActive) {
      await tx.publicPriceRange.update({
        where: { id: existingActive.id },
        data: {
          active: false,
          effectiveTo: now,
        },
      });
    }

    const newRecord = await tx.publicPriceRange.create({
      data: {
        boxConfigId: data.boxConfigId,
        countryId: data.countryId,
        minEur: minDecimal,
        maxEur: maxDecimal,
        isManualOverride: data.isManualOverride,
        effectiveFrom: now,
        active: true,
      },
    });

    await tx.pricingAuditLog.create({
      data: {
        authorId: admin.id,
        entityType: 'PUBLIC_PRICE_RANGE',
        entityId: newRecord.id,
        action: existingActive ? 'VERSION_UPDATE' : 'CREATE',
        oldValues: existingActive
          ? {
              minEur: existingActive.minEur.toString(),
              maxEur: existingActive.maxEur.toString(),
              effectiveFrom: existingActive.effectiveFrom.toISOString(),
            }
          : Prisma.JsonNull,
        newValues: {
          minEur: newRecord.minEur.toString(),
          maxEur: newRecord.maxEur.toString(),
          effectiveFrom: newRecord.effectiveFrom.toISOString(),
        },
      },
    });

    return newRecord;
  });

  revalidatePath('/admin/pricing');
  revalidatePath('/calculator');

  return { success: true, id: result.id };
}

/**
 * Toggles the active status of a pricing entity with strict server-side model dispatching.
 */
export async function togglePricingEntityActive(
  rawEntityType: string,
  rawId: string,
  rawActive: boolean
) {
  const admin = await requireAdmin();
  const validated = toggleActiveSchema.parse({
    entityType: rawEntityType,
    id: rawId,
    active: rawActive,
  });

  const { entityType, id, active } = validated;

  await prisma.$transaction(async (tx) => {
    const now = new Date();

    if (entityType === 'LANDED_COST') {
      const record = await tx.landedCost.findUnique({ where: { id } });
      if (!record) throw new Error('Landed cost record not found');

      await tx.landedCost.update({
        where: { id },
        data: {
          active,
          effectiveTo: active ? null : now,
        },
      });
    } else if (entityType === 'PRICING_RULE') {
      const record = await tx.pricingRule.findUnique({ where: { id } });
      if (!record) throw new Error('Pricing rule record not found');

      await tx.pricingRule.update({
        where: { id },
        data: {
          active,
          effectiveTo: active ? null : now,
        },
      });
    } else if (entityType === 'PUBLIC_PRICE_RANGE') {
      const record = await tx.publicPriceRange.findUnique({ where: { id } });
      if (!record) throw new Error('Public price range record not found');

      await tx.publicPriceRange.update({
        where: { id },
        data: {
          active,
          effectiveTo: active ? null : now,
        },
      });
    } else {
      throw new Error(`Unsupported entity type: ${entityType}`);
    }

    await tx.pricingAuditLog.create({
      data: {
        authorId: admin.id,
        entityType: entityType as PricingEntityType,
        entityId: id,
        action: 'TOGGLE_ACTIVE',
        oldValues: { active: !active },
        newValues: { active },
      },
    });
  });

  revalidatePath('/admin/pricing');
  revalidatePath('/calculator');

  return { success: true };
}
