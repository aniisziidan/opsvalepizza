'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { parsePricingWorkbook } from '@/lib/excel/parseWorkbook';
import { evaluateExcelDiff } from '@/lib/excel/diffEngine';
import {
  BulkCommitPayload,
  BulkCommitResult,
  ExcelPreviewResult,
  ImportMode,
} from '@/lib/excel/types';
import { Prisma, PricingAuditAction, PricingEntityType, CostSource } from '@prisma/client';
import { emitNotificationEvent } from '@/lib/notifications/dispatcher';

/**
 * Server action to parse and diff an uploaded Excel workbook with mode and version conflict checks.
 */
export async function previewExcelUpload(formData: FormData): Promise<ExcelPreviewResult> {
  await requireAdmin();

  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    throw new Error('No valid spreadsheet file uploaded');
  }

  const rawMode = formData.get('mode') as string | null;
  const mode: ImportMode =
    rawMode === 'UPDATE_EXISTING' || rawMode === 'ADD_NEW' ? rawMode : 'AUTO';

  const fileName = file.name;
  const isExcel =
    fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv');

  if (!isExcel) {
    throw new Error('Please upload an Excel spreadsheet (.xlsx, .xls) or CSV file');
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const parseResult = parsePricingWorkbook(buffer);
  return evaluateExcelDiff(fileName, parseResult, undefined, mode);
}

/**
 * Server action to atomically commit bulk pricing modifications to the database with audit history
 * and optimistic concurrency protections.
 */
export async function commitBulkPricingChanges(
  payload: BulkCommitPayload
): Promise<BulkCommitResult> {
  const admin = await requireAdmin();
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    // 1. Fetch metadata
    const countries = await tx.country.findMany();
    const countryByCode = new Map(countries.map((c) => [c.code.toUpperCase(), c]));

    const boxConfigs = await tx.boxConfig.findMany();
    const boxConfigByKey = new Map(
      boxConfigs.map((b) => [`${b.sizeLabel.toLowerCase()}|${b.material}|${b.print}`, b])
    );
    const boxConfigBySize = new Map(
      boxConfigs.map((b) => [b.sizeLabel.toLowerCase(), b])
    );

    let landedCostsCreated = 0;
    let pricingRulesCreated = 0;
    let publicRangesCreated = 0;
    let totalAudited = 0;

    // 2. Commit Landed Costs
    for (const item of payload.landedCosts) {
      if (item.action !== 'INSERT' && item.action !== 'UPDATE') continue;

      const country = countryByCode.get(item.countryCode.toUpperCase());
      const boxKey = `${item.boxSizeLabel.toLowerCase()}|${item.material}|${item.print}`;
      const boxConfig = boxConfigByKey.get(boxKey);

      if (!country || !boxConfig) {
        throw new Error(
          `Unable to resolve SKU mapping for ${item.countryCode} - ${item.boxSizeLabel} (${item.material}/${item.print})`
        );
      }

      const costDecimal = new Prisma.Decimal(Number(item.costEur).toFixed(4));
      const qtyTierMaxVal = item.qtyTierMax ?? null;

      // Optimistic concurrency check: if updating by recordId, verify it is still active
      if (item.recordId) {
        const targetRecord = await tx.landedCost.findUnique({
          where: { id: item.recordId },
        });
        if (targetRecord && !targetRecord.active) {
          throw new Error(
            `Concurrency conflict: Landed cost record #${item.recordId} (${item.countryCode} - ${item.boxSizeLabel}) was modified by another session. Please re-export.`
          );
        }
      }

      // Retire existing active matching tier
      const existing = await tx.landedCost.findFirst({
        where: {
          countryId: country.id,
          boxConfigId: boxConfig.id,
          qtyTierMin: item.qtyTierMin,
          qtyTierMax: qtyTierMaxVal,
          active: true,
        },
      });

      if (existing) {
        await tx.landedCost.update({
          where: { id: existing.id },
          data: {
            active: false,
            effectiveTo: now,
          },
        });
      }

      // Create new versioned landed cost record
      const created = await tx.landedCost.create({
        data: {
          countryId: country.id,
          boxConfigId: boxConfig.id,
          qtyTierMin: item.qtyTierMin,
          qtyTierMax: qtyTierMaxVal,
          costEur: costDecimal,
          source: CostSource.MANUAL,
          effectiveFrom: now,
          active: true,
        },
      });

      // Record audit log
      await tx.pricingAuditLog.create({
        data: {
          authorId: admin.id,
          entityType: PricingEntityType.LANDED_COST,
          entityId: created.id,
          action: existing ? PricingAuditAction.VERSION_UPDATE : PricingAuditAction.CREATE,
          oldValues: existing
            ? {
                costEur: existing.costEur.toString(),
                effectiveFrom: existing.effectiveFrom.toISOString(),
                source: `EXCEL_BULK_${payload.importMode || 'AUTO'}`,
              }
            : Prisma.DbNull,
          newValues: {
            countryCode: country.code,
            boxSizeLabel: boxConfig.sizeLabel,
            material: boxConfig.material,
            print: boxConfig.print,
            qtyTierMin: item.qtyTierMin,
            qtyTierMax: qtyTierMaxVal,
            costEur: costDecimal.toString(),
            source: `EXCEL_BULK_${payload.importMode || 'AUTO'}`,
          },
        },
      });

      landedCostsCreated++;
      totalAudited++;
    }

    // 3. Commit Pricing Rules
    for (const item of payload.pricingRules) {
      if (item.action !== 'INSERT' && item.action !== 'UPDATE') continue;

      let countryId: string | null = null;
      let boxConfigId: string | null = null;

      if (item.countryCode) {
        const country = countryByCode.get(item.countryCode.toUpperCase());
        if (!country) throw new Error(`Country code ${item.countryCode} not found`);
        countryId = country.id;
      }

      if (item.boxSizeLabel) {
        const box = boxConfigBySize.get(item.boxSizeLabel.toLowerCase());
        if (!box) throw new Error(`Box size ${item.boxSizeLabel} not found`);
        boxConfigId = box.id;
      }

      const markupMinDecimal = new Prisma.Decimal(Number(item.markupMin).toFixed(3));
      const markupMaxDecimal = new Prisma.Decimal(Number(item.markupMax).toFixed(3));

      // Concurrency check if recordId supplied
      if (item.recordId) {
        const targetRecord = await tx.pricingRule.findUnique({
          where: { id: item.recordId },
        });
        if (targetRecord && !targetRecord.active) {
          throw new Error(
            `Concurrency conflict: Pricing rule #${item.recordId} was modified by another session. Please re-export.`
          );
        }
      }

      // Retire existing matching active rule
      const existing = await tx.pricingRule.findFirst({
        where: {
          scope: item.scope,
          countryId,
          boxConfigId,
          active: true,
        },
      });

      if (existing) {
        await tx.pricingRule.update({
          where: { id: existing.id },
          data: {
            active: false,
            effectiveTo: now,
          },
        });
      }

      // Create new versioned pricing rule
      const created = await tx.pricingRule.create({
        data: {
          scope: item.scope,
          countryId,
          boxConfigId,
          markupMin: markupMinDecimal,
          markupMax: markupMaxDecimal,
          effectiveFrom: now,
          active: true,
        },
      });

      // Record audit log
      await tx.pricingAuditLog.create({
        data: {
          authorId: admin.id,
          entityType: PricingEntityType.PRICING_RULE,
          entityId: created.id,
          action: existing ? PricingAuditAction.VERSION_UPDATE : PricingAuditAction.CREATE,
          oldValues: existing
            ? {
                markupMin: existing.markupMin.toString(),
                markupMax: existing.markupMax.toString(),
                source: `EXCEL_BULK_${payload.importMode || 'AUTO'}`,
              }
            : Prisma.DbNull,
          newValues: {
            scope: item.scope,
            countryId,
            boxConfigId,
            markupMin: markupMinDecimal.toString(),
            markupMax: markupMaxDecimal.toString(),
            source: `EXCEL_BULK_${payload.importMode || 'AUTO'}`,
          },
        },
      });

      pricingRulesCreated++;
      totalAudited++;
    }

    // 4. Commit Public Price Overrides
    for (const item of payload.publicPriceRanges) {
      if (item.action !== 'INSERT' && item.action !== 'UPDATE') continue;

      const country = countryByCode.get(item.countryCode.toUpperCase());
      const boxKey = `${item.boxSizeLabel.toLowerCase()}|${item.material}|${item.print}`;
      const boxConfig = boxConfigByKey.get(boxKey);

      if (!country || !boxConfig) {
        throw new Error(
          `Unable to resolve public range mapping for ${item.countryCode} - ${item.boxSizeLabel}`
        );
      }

      const minDecimal = new Prisma.Decimal(Number(item.minEur).toFixed(4));
      const maxDecimal = new Prisma.Decimal(Number(item.maxEur).toFixed(4));

      if (item.recordId) {
        const targetRecord = await tx.publicPriceRange.findUnique({
          where: { id: item.recordId },
        });
        if (targetRecord && !targetRecord.active) {
          throw new Error(
            `Concurrency conflict: Public price range #${item.recordId} was modified by another session. Please re-export.`
          );
        }
      }

      const existing = await tx.publicPriceRange.findFirst({
        where: {
          countryId: country.id,
          boxConfigId: boxConfig.id,
          active: true,
        },
      });

      if (existing) {
        await tx.publicPriceRange.update({
          where: { id: existing.id },
          data: {
            active: false,
            effectiveTo: now,
          },
        });
      }

      const created = await tx.publicPriceRange.create({
        data: {
          countryId: country.id,
          boxConfigId: boxConfig.id,
          minEur: minDecimal,
          maxEur: maxDecimal,
          isManualOverride: true,
          effectiveFrom: now,
          active: true,
        },
      });

      await tx.pricingAuditLog.create({
        data: {
          authorId: admin.id,
          entityType: PricingEntityType.PUBLIC_PRICE_RANGE,
          entityId: created.id,
          action: existing ? PricingAuditAction.VERSION_UPDATE : PricingAuditAction.CREATE,
          oldValues: existing
            ? {
                minEur: existing.minEur.toString(),
                maxEur: existing.maxEur.toString(),
                source: `EXCEL_BULK_${payload.importMode || 'AUTO'}`,
              }
            : Prisma.DbNull,
          newValues: {
            countryId: country.id,
            boxConfigId: boxConfig.id,
            minEur: minDecimal.toString(),
            maxEur: maxDecimal.toString(),
            source: `EXCEL_BULK_${payload.importMode || 'AUTO'}`,
          },
        },
      });

      publicRangesCreated++;
      totalAudited++;
    }

    return {
      landedCostsCreated,
      pricingRulesCreated,
      publicRangesCreated,
      totalAudited,
    };
  });

  revalidatePath('/admin/pricing');
  revalidatePath('/admin/dashboard');
  revalidatePath('/calculator');

  emitNotificationEvent({
    type: 'PRICING_IMPORT_COMPLETED',
    category: 'PRICING',
    priority: 'NORMAL',
    title: `Pricing Import Applied (${result.totalAudited} updates)`,
    message: `${admin.name || admin.email} committed ${result.totalAudited} pricing updates (${result.landedCostsCreated} landed costs, ${result.pricingRulesCreated} rules).`,
    entityType: 'PRICING',
    actionUrl: '/admin/pricing',
  }).catch(() => {});

  return {
    success: true,
    message: `Successfully applied ${result.totalAudited} bulk pricing modifications with version tracking (${payload.importMode || 'AUTO'}).`,
    counts: result,
  };
}
