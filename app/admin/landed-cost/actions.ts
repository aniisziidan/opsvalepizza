'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { Prisma } from '@prisma/client';
import {
  computeLandedCalc,
  createLandedCalcSchema,
  updateLandedCalcSchema,
  type CalcLine,
} from '@/lib/pricing/landedCostCalc';

function isStaleActionError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : '';
  return (
    message.includes('failed-to-find-server-action') ||
    message.includes('was not found on the server')
  );
}

/** Freezes computed totals for a version row from its validated inputs. */
function totalsForRow(lines: CalcLine[], shipmentQty: number) {
  const r = computeLandedCalc(lines, shipmentQty);
  return {
    shipmentMinEur: new Prisma.Decimal(r.shipmentMin.toFixed(2)),
    shipmentMaxEur: new Prisma.Decimal(r.shipmentMax.toFixed(2)),
    perBoxMinEur: new Prisma.Decimal(r.perBoxMin.toFixed(4)),
    perBoxMaxEur: new Prisma.Decimal(r.perBoxMax.toFixed(4)),
  };
}

function toErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof z.ZodError) return err.issues[0]?.message ?? 'Invalid input';
  if (err instanceof Error) return err.message;
  return fallback;
}

/** Creates a brand-new calculation (fresh groupId). */
export async function createLandedCalc(rawData: unknown) {
  try {
    const admin = await requireAdmin();
    const data = createLandedCalcSchema.parse(rawData);
    const totals = totalsForRow(data.lines, data.shipmentQty);

    const record = await prisma.$transaction(async (tx) => {
      const created = await tx.landedCostCalc.create({
        data: {
          title: data.title,
          countryId: data.countryId,
          boxConfigId: data.boxConfigId,
          shipmentQty: data.shipmentQty,
          lines: data.lines as unknown as Prisma.InputJsonValue,
          ...totals,
          authorId: admin.id,
          active: true,
        },
      });
      await tx.pricingAuditLog.create({
        data: {
          authorId: admin.id,
          entityType: 'LANDED_COST_CALC',
          entityId: created.id,
          action: 'CREATE',
          oldValues: Prisma.JsonNull,
          newValues: {
            title: created.title,
            groupId: created.groupId,
            shipmentQty: created.shipmentQty,
            shipmentMinEur: created.shipmentMinEur.toString(),
            shipmentMaxEur: created.shipmentMaxEur.toString(),
          },
        },
      });
      return created;
    });

    revalidatePath('/admin/landed-cost');
    return { success: true, id: record.id };
  } catch (err) {
    if (isStaleActionError(err)) throw err;
    if (err instanceof Error && err.message.startsWith('UNAUTHORIZED')) throw err;
    return { success: false, error: toErrorMessage(err, 'Failed to save calculation') };
  }
}

/** Version-bumps an existing calculation within its groupId lineage. */
export async function updateLandedCalc(rawData: unknown) {
  try {
    const admin = await requireAdmin();
    const data = updateLandedCalcSchema.parse(rawData);
    const totals = totalsForRow(data.lines, data.shipmentQty);

    const record = await prisma.$transaction(async (tx) => {
      const existing = await tx.landedCostCalc.findUnique({ where: { id: data.id } });
      if (!existing) throw new Error('Calculation not found');

      const now = new Date();
      await tx.landedCostCalc.update({
        where: { id: existing.id },
        data: { active: false, effectiveTo: now },
      });

      const created = await tx.landedCostCalc.create({
        data: {
          groupId: existing.groupId,
          title: data.title,
          countryId: data.countryId,
          boxConfigId: data.boxConfigId,
          shipmentQty: data.shipmentQty,
          lines: data.lines as unknown as Prisma.InputJsonValue,
          ...totals,
          authorId: admin.id,
          active: true,
          effectiveFrom: now,
        },
      });

      await tx.pricingAuditLog.create({
        data: {
          authorId: admin.id,
          entityType: 'LANDED_COST_CALC',
          entityId: created.id,
          action: 'VERSION_UPDATE',
          oldValues: {
            shipmentMinEur: existing.shipmentMinEur.toString(),
            shipmentMaxEur: existing.shipmentMaxEur.toString(),
            effectiveFrom: existing.effectiveFrom.toISOString(),
          },
          newValues: {
            title: created.title,
            groupId: created.groupId,
            shipmentMinEur: created.shipmentMinEur.toString(),
            shipmentMaxEur: created.shipmentMaxEur.toString(),
          },
        },
      });
      return created;
    });

    revalidatePath('/admin/landed-cost');
    return { success: true, id: record.id };
  } catch (err) {
    if (isStaleActionError(err)) throw err;
    if (err instanceof Error && err.message.startsWith('UNAUTHORIZED')) throw err;
    return { success: false, error: toErrorMessage(err, 'Failed to update calculation') };
  }
}

/** Archives or restores a calculation version. */
export async function toggleLandedCalcActive(id: string, active: boolean) {
  try {
    const admin = await requireAdmin();
    await prisma.$transaction(async (tx) => {
      const record = await tx.landedCostCalc.findUnique({ where: { id } });
      if (!record) throw new Error('Calculation not found');
      const now = new Date();
      await tx.landedCostCalc.update({
        where: { id },
        data: { active, effectiveTo: active ? null : now },
      });
      await tx.pricingAuditLog.create({
        data: {
          authorId: admin.id,
          entityType: 'LANDED_COST_CALC',
          entityId: id,
          action: 'TOGGLE_ACTIVE',
          oldValues: { active: !active },
          newValues: { active },
        },
      });
    });
    revalidatePath('/admin/landed-cost');
    return { success: true };
  } catch (err) {
    if (isStaleActionError(err)) throw err;
    if (err instanceof Error && err.message.startsWith('UNAUTHORIZED')) throw err;
    return { success: false, error: toErrorMessage(err, 'Failed to change status') };
  }
}
