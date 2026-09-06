import { z } from 'zod';

export const STAGES = ['ORIGIN', 'FREIGHT', 'DESTINATION', 'FINANCIAL'] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  ORIGIN: 'Origin',
  FREIGHT: 'Ocean / Freight',
  DESTINATION: 'Destination',
  FINANCIAL: 'Financial / Other',
};

export interface CalcLine {
  label: string;
  stage: Stage;
  minEur: number;
  maxEur: number;
}

export interface LandedCalcResult {
  stageSubtotals: Record<Stage, { min: number; max: number }>;
  shipmentMin: number;
  shipmentMax: number;
  perBoxMin: number;
  perBoxMax: number;
}

/**
 * Sums line items into per-stage subtotals and shipment totals, then derives the
 * per-box landed cost by dividing the shipment totals by the shipment quantity.
 * Pure: reused by the client (live preview) and the server (authoritative recompute).
 */
export function computeLandedCalc(lines: CalcLine[], shipmentQty: number): LandedCalcResult {
  const stageSubtotals: Record<Stage, { min: number; max: number }> = {
    ORIGIN: { min: 0, max: 0 },
    FREIGHT: { min: 0, max: 0 },
    DESTINATION: { min: 0, max: 0 },
    FINANCIAL: { min: 0, max: 0 },
  };
  let shipmentMin = 0;
  let shipmentMax = 0;
  for (const line of lines) {
    stageSubtotals[line.stage].min += line.minEur;
    stageSubtotals[line.stage].max += line.maxEur;
    shipmentMin += line.minEur;
    shipmentMax += line.maxEur;
  }
  const divisor = shipmentQty > 0 ? shipmentQty : 1;
  return {
    stageSubtotals,
    shipmentMin,
    shipmentMax,
    perBoxMin: shipmentMin / divisor,
    perBoxMax: shipmentMax / divisor,
  };
}

export const calcLineSchema = z
  .object({
    label: z.string().trim().min(1, 'Label is required'),
    stage: z.enum(STAGES),
    minEur: z.number().min(0, 'Min must be 0 or greater'),
    maxEur: z.number().min(0, 'Max must be 0 or greater'),
  })
  .refine((d) => d.maxEur >= d.minEur, {
    message: 'Max must be greater than or equal to min',
    path: ['maxEur'],
  });

export const createLandedCalcSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  countryId: z.string().min(1, 'Country is required'),
  boxConfigId: z.string().min(1, 'Box configuration is required'),
  shipmentQty: z.number().int().positive('Shipment quantity must be greater than 0'),
  lines: z.array(calcLineSchema).min(1, 'Add at least one expense line'),
});

export const updateLandedCalcSchema = createLandedCalcSchema.extend({
  id: z.string().min(1, 'Record id is required'),
});
