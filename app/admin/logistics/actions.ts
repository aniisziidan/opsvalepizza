'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { Prisma } from '@prisma/client';

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
  await requireAdmin();
  const data = logisticsCorridorSchema.parse(rawData);

  const created = await prisma.logisticsCost.create({
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

  revalidatePath('/admin/logistics');
  return { success: true, id: created.id };
}

export async function updateLogisticsCorridor(id: string, rawData: unknown) {
  await requireAdmin();
  const data = logisticsCorridorSchema.parse(rawData);

  const updated = await prisma.logisticsCost.update({
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

  revalidatePath('/admin/logistics');
  return { success: true, id: updated.id };
}

export async function toggleLogisticsCorridorActive(id: string, active: boolean) {
  await requireAdmin();

  await prisma.logisticsCost.update({
    where: { id },
    data: { active },
  });

  revalidatePath('/admin/logistics');
  return { success: true };
}
