'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { Prisma } from '@prisma/client';
import { corridorsToDeactivate } from '@/lib/logistics/enforcement';
import { logisticsAuditValues } from '@/lib/logistics/audit';

const logisticsCorridorSchema = z.object({
  countryId: z.string().min(1, 'Country is required'),
  route: z.string().trim().max(120).optional().nullable(),
  port: z.string().trim().max(120).optional().nullable(),
  shipMethod: z.string().trim().max(120).optional().nullable(),
  freightEur: z
    .union([z.number(), z.string()])
    .optional()
    .nullable()
    .transform((v) => (v === '' || v === null || v === undefined ? null : Number(v)))
    .refine((v) => v === null || v >= 0, 'Freight EUR must be >= 0'),
  inlandEur: z
    .union([z.number(), z.string()])
    .optional()
    .nullable()
    .transform((v) => (v === '' || v === null || v === undefined ? null : Number(v)))
    .refine((v) => v === null || v >= 0, 'Inland EUR must be >= 0'),
  otherEur: z
    .union([z.number(), z.string()])
    .optional()
    .nullable()
    .transform((v) => (v === '' || v === null || v === undefined ? null : Number(v)))
    .refine((v) => v === null || v >= 0, 'Other EUR must be >= 0'),
});

export async function createLogisticsCorridor(rawData: unknown) {
  const admin = await requireAdmin();
  const data = logisticsCorridorSchema.parse(rawData);

  try {
    const created = await prisma.$transaction(async (tx) => {
      // New corridors are created active → deactivate any existing active one for the country.
      const activeForCountry = await tx.logisticsCost.findMany({
        where: { countryId: data.countryId, active: true },
        select: { id: true },
      });
      const toDeactivate = corridorsToDeactivate(activeForCountry.map((c) => c.id), '');
      if (toDeactivate.length > 0) {
        await tx.logisticsCost.updateMany({ where: { id: { in: toDeactivate } }, data: { active: false } });
      }

      const row = await tx.logisticsCost.create({
        data: {
          countryId: data.countryId,
          route: data.route || null,
          port: data.port || null,
          shipMethod: data.shipMethod || null,
          freightEur: data.freightEur !== null ? new Prisma.Decimal(data.freightEur.toFixed(4)) : null,
          inlandEur: data.inlandEur !== null ? new Prisma.Decimal(data.inlandEur.toFixed(4)) : null,
          otherEur: data.otherEur !== null ? new Prisma.Decimal(data.otherEur.toFixed(4)) : null,
          active: true,
        },
      });

      await tx.pricingAuditLog.create({
        data: {
          authorId: admin.id,
          entityType: 'LOGISTICS_COST',
          entityId: row.id,
          action: 'CREATE',
          oldValues: Prisma.JsonNull,
          newValues: logisticsAuditValues({
            route: row.route, port: row.port, shipMethod: row.shipMethod,
            freightEur: row.freightEur?.toString() ?? null,
            inlandEur: row.inlandEur?.toString() ?? null,
            otherEur: row.otherEur?.toString() ?? null,
            active: row.active,
          }) as unknown as Prisma.InputJsonValue,
        },
      });

      return row;
    });

    revalidatePath('/admin/logistics');
    return { success: true, id: created.id };
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return { success: false, error: 'This country already has an active logistics corridor. Deactivate it first.' };
    }
    throw err;
  }
}

export async function updateLogisticsCorridor(id: string, rawData: unknown) {
  const admin = await requireAdmin();
  const data = logisticsCorridorSchema.parse(rawData);

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const before = await tx.logisticsCost.findUniqueOrThrow({ where: { id } });
      const row = await tx.logisticsCost.update({
        where: { id },
        data: {
          countryId: data.countryId,
          route: data.route || null,
          port: data.port || null,
          shipMethod: data.shipMethod || null,
          freightEur: data.freightEur !== null ? new Prisma.Decimal(data.freightEur.toFixed(4)) : null,
          inlandEur: data.inlandEur !== null ? new Prisma.Decimal(data.inlandEur.toFixed(4)) : null,
          otherEur: data.otherEur !== null ? new Prisma.Decimal(data.otherEur.toFixed(4)) : null,
        },
      });

      await tx.pricingAuditLog.create({
        data: {
          authorId: admin.id,
          entityType: 'LOGISTICS_COST',
          entityId: id,
          action: 'VERSION_UPDATE',
          oldValues: logisticsAuditValues({
            route: before.route, port: before.port, shipMethod: before.shipMethod,
            freightEur: before.freightEur?.toString() ?? null,
            inlandEur: before.inlandEur?.toString() ?? null,
            otherEur: before.otherEur?.toString() ?? null,
            active: before.active,
          }) as unknown as Prisma.InputJsonValue,
          newValues: logisticsAuditValues({
            route: row.route, port: row.port, shipMethod: row.shipMethod,
            freightEur: row.freightEur?.toString() ?? null,
            inlandEur: row.inlandEur?.toString() ?? null,
            otherEur: row.otherEur?.toString() ?? null,
            active: row.active,
          }) as unknown as Prisma.InputJsonValue,
        },
      });

      return row;
    });

    revalidatePath('/admin/logistics');
    return { success: true, id: updated.id };
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return { success: false, error: 'This country already has an active logistics corridor.' };
    }
    throw err;
  }
}

export async function toggleLogisticsCorridorActive(id: string, active: boolean) {
  const admin = await requireAdmin();

  try {
    await prisma.$transaction(async (tx) => {
      const target = await tx.logisticsCost.findUniqueOrThrow({ where: { id } });
      if (active) {
        const activeForCountry = await tx.logisticsCost.findMany({
          where: { countryId: target.countryId, active: true },
          select: { id: true },
        });
        const toDeactivate = corridorsToDeactivate(activeForCountry.map((c) => c.id), id);
        if (toDeactivate.length > 0) {
          await tx.logisticsCost.updateMany({ where: { id: { in: toDeactivate } }, data: { active: false } });
        }
      }
      await tx.logisticsCost.update({ where: { id }, data: { active } });
      await tx.pricingAuditLog.create({
        data: {
          authorId: admin.id,
          entityType: 'LOGISTICS_COST',
          entityId: id,
          action: 'TOGGLE_ACTIVE',
          oldValues: { active: target.active } as unknown as Prisma.InputJsonValue,
          newValues: { active } as unknown as Prisma.InputJsonValue,
        },
      });
    });

    revalidatePath('/admin/logistics');
    return { success: true };
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return { success: false, error: 'This country already has an active logistics corridor.' };
    }
    throw err;
  }
}
