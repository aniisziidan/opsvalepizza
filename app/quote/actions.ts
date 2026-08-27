'use server';

import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import {
  quoteSubmissionPayloadSchema,
  type QuoteSubmissionPayload,
} from '@/lib/validation/quoteRequest';
import { rateLimiter, getClientIp } from '@/lib/security/rateLimiter';
import { generateLeadCode } from '@/lib/leads/generateLeadCode';
import { matchOrCreateCompany } from '@/lib/companies/matchOrCreateCompany';
import { resolvePublicRange } from '@/lib/pricing/publicRange';
import { computeSavings } from '@/lib/calculator/savings';
import { notifyNewQuote } from '@/lib/email/notifyNewQuote';

export interface SubmitQuoteResult {
  success: boolean;
  leadCode?: string;
  isDuplicate?: boolean;
  errors?: Record<string, string>;
  error?: string;
}

export async function submitQuoteRequest(
  rawPayload: unknown,
): Promise<SubmitQuoteResult> {
  // 1. Resolve client IP and check submission rate limit (5 submissions / 10 min)
  const headerList = await headers();
  const dummyReq = new Request('http://localhost', { headers: headerList });
  const clientIp = getClientIp(dummyReq);

  const rateCheck = await rateLimiter.check(`quote_submit:${clientIp}`, 5, 10 * 60_000);
  if (!rateCheck.allowed) {
    return {
      success: false,
      error: 'Submission rate limit reached. Please wait a few minutes before trying again.',
    };
  }

  // 2. Validate payload against Zod schema
  const parseResult = quoteSubmissionPayloadSchema.safeParse(rawPayload);
  if (!parseResult.success) {
    const formattedErrors: Record<string, string> = {};
    for (const issue of parseResult.error.issues) {
      const field = issue.path[0];
      if (field && typeof field === 'string') {
        formattedErrors[field] = issue.message;
      }
    }
    return {
      success: false,
      errors: formattedErrors,
      error: 'Please fix the highlighted validation errors.',
    };
  }

  const payload: QuoteSubmissionPayload = parseResult.data;

  // 3. Anti-spam honeypot and cooldown check
  if (payload._hp_company_fax_ && payload._hp_company_fax_.trim().length > 0) {
    // Honeypot tripped by bot
    return { success: false, error: 'Submission rejected.' };
  }

  const now = Date.now();
  if (now - payload.formMountedAt < 2000) {
    // Under 2 seconds between render and submit is an automated bot
    return { success: false, error: 'Submission rejected due to abnormal submission speed.' };
  }

  // 4. Server-side Idempotency Guard
  const existingLead = await prisma.lead.findUnique({
    where: { idempotencyKey: payload.idempotencyKey },
  });
  if (existingLead) {
    return {
      success: true,
      leadCode: existingLead.code,
      isDuplicate: true,
    };
  }

  // 5. Authoritative Calculator Recalculation (if calcState provided)
  let calcSnapshotData: {
    countryCode: string;
    boxSize: string;
    material: 'KRAFT' | 'WHITE';
    print: 'PLAIN' | 'PRINTED';
    boxesPerOrder: number;
    monthlyVolume: number;
    currentPrice: number;
    landedCostEur: number | null;
    markupMin: number | null;
    markupMax: number | null;
    estMinEur: number;
    estMaxEur: number;
    estYearlySavings: number;
    estYearlySavingsMin: number | null;
    estYearlySavingsMax: number | null;
    landedCostId: string | null;
    markupRuleId: string | null;
    publicPriceRangeId: string | null;
    pricingVersion: string;
  } | null = null;

  if (payload.calcState) {
    const rawCalc = payload.calcState;
    const calcMat = rawCalc.material === 'white' ? 'WHITE' : 'KRAFT';
    const calcPrint = rawCalc.print === 'custom' ? 'PRINTED' : 'PLAIN';

    const country = await prisma.country.findUnique({ where: { code: rawCalc.country } });
    const box = await prisma.boxConfig.findUnique({
      where: {
        sizeLabel_material_print: {
          sizeLabel: rawCalc.boxSize,
          material: calcMat,
          print: calcPrint,
        },
      },
    });

    if (country && box) {
      const [rules, landed, approved] = await Promise.all([
        prisma.pricingRule.findMany({
          where: {
            active: true,
            OR: [{ scope: 'GLOBAL' }, { countryId: country.id }, { boxConfigId: box.id }],
          },
        }),
        prisma.landedCost.findMany({
          where: { active: true, boxConfigId: box.id, countryId: country.id },
        }),
        prisma.publicPriceRange.findFirst({
          where: { boxConfigId: box.id, countryId: country.id, active: true },
        }),
      ]);

      const rangeResult = resolvePublicRange({
        boxConfigId: box.id,
        countryId: country.id,
        monthlyVolume: rawCalc.monthlyVolume,
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
      });

      if (rangeResult.available) {
        const savingsResult = computeSavings({
          currentPrice: rawCalc.currentPrice,
          monthlyVolume: rawCalc.monthlyVolume,
          priceRange: { minEur: rangeResult.minEur, maxEur: rangeResult.maxEur },
        });

        calcSnapshotData = {
          countryCode: rawCalc.country,
          boxSize: rawCalc.boxSize,
          material: calcMat,
          print: calcPrint,
          boxesPerOrder: rawCalc.boxesPerOrder,
          monthlyVolume: rawCalc.monthlyVolume,
          currentPrice: rawCalc.currentPrice,
          landedCostEur: landed[0] ? Number(landed[0].costEur) : null,
          markupMin: rules[0] ? Number(rules[0].markupMin) : null,
          markupMax: rules[0] ? Number(rules[0].markupMax) : null,
          estMinEur: rangeResult.minEur,
          estMaxEur: rangeResult.maxEur,
          estYearlySavings: savingsResult.yearlySavingsMax,
          estYearlySavingsMin: savingsResult.yearlySavingsMin,
          estYearlySavingsMax: savingsResult.yearlySavingsMax,
          landedCostId: landed[0]?.id || null,
          markupRuleId: rules[0]?.id || null,
          publicPriceRangeId: approved?.id || null,
          pricingVersion: 'v1-2026',
        };
      }
    }
  }

  // Deduplicate file tokens
  const uniqueUploadTokens = Array.from(new Set(payload.uploadTokens));

  // 6. Execute atomic Prisma transaction
  let leadCode = '';
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Step A: Generate sequential lead code
      const generatedCode = await generateLeadCode(tx);

      // Step B: Match or create company
      const { id: companyId } = await matchOrCreateCompany(tx, {
        name: payload.companyName,
        websiteUrl: payload.websiteUrl,
        countryCode: payload.deliveryCountry,
        branchRange: payload.branches,
      });

      // Step C: Create contact
      const contact = await tx.contact.create({
        data: {
          companyId,
          name: payload.fullName,
          email: payload.workEmail,
          phone: payload.phoneNumber,
          jobTitle: payload.jobTitle || null,
        },
      });

      // Step D: Create lead
      const lead = await tx.lead.create({
        data: {
          code: generatedCode,
          idempotencyKey: payload.idempotencyKey,
          companyId,
          contactId: contact.id,
          status: 'NEW',
          source: payload.calcState ? 'calculator' : 'quote',
        },
      });

      // Step E: Create quote request
      const quoteMaterial = payload.material === 'white' ? 'WHITE' : 'KRAFT';
      const quotePrint = payload.printType === 'custom' ? 'PRINTED' : 'PLAIN';
      const qtyPerOrder = Math.round(payload.monthlyVolume / 3) || 5000;

      const quoteRequest = await tx.quoteRequest.create({
        data: {
          leadId: lead.id,
          boxSpecificationType: payload.boxSpecificationType,
          standardBoxSize: payload.standardBoxSize || null,
          lengthMm: payload.lengthMm,
          widthMm: payload.widthMm,
          heightMm: payload.heightMm,
          material: quoteMaterial,
          print: quotePrint,
          customFlute: payload.customFlute || null,
          monthlyVolume: payload.monthlyVolume,
          qtyPerOrder,
          deliveryCountryCode: payload.deliveryCountry,
          deliveryCity: payload.deliveryCity,
          deliveryFrequency: payload.deliveryFrequency || null,
          hasLoadingDock: payload.hasLoadingDock,
          deliveryAccessNotes: payload.deliveryAccessNotes || null,
          notes: payload.notes || null,
        },
      });

      // Step F: Create calculator snapshot if available
      if (calcSnapshotData) {
        await tx.calculatorSnapshot.create({
          data: {
            leadId: lead.id,
            ...calcSnapshotData,
          },
        });
      }

      // Step G: Single-use atomic token attachment & StoredFile creation
      for (const token of uniqueUploadTokens) {
        const updateCount = await tx.temporaryUpload.updateMany({
          where: {
            token,
            status: 'TEMPORARY',
            expiresAt: { gt: new Date() },
          },
          data: {
            status: 'ATTACHED',
          },
        });

        if (updateCount.count !== 1) {
          throw new Error(`Upload token invalid, expired, or already attached: ${token}`);
        }

        const tempRecord = await tx.temporaryUpload.findUniqueOrThrow({
          where: { token },
        });

        await tx.storedFile.create({
          data: {
            leadId: lead.id,
            quoteRequestId: quoteRequest.id,
            storageKey: tempRecord.storageKey,
            fileName: tempRecord.fileName,
            mimeType: tempRecord.mimeType,
            sizeBytes: tempRecord.sizeBytes,
          },
        });
      }

      // Step H: Record initial activity
      await tx.leadActivity.create({
        data: {
          leadId: lead.id,
          type: 'SUBMISSION',
          content: `Wholesale quote request submitted via website (${generatedCode})`,
        },
      });

      return { leadCode: generatedCode };
    });

    leadCode = result.leadCode;
  } catch (dbError) {
    console.error('Transaction failure during quote submission:', dbError);
    return {
      success: false,
      error: 'We encountered an error saving your request. Please try again.',
    };
  }

  // 7. Await email notification in try/catch (does not fail submission)
  try {
    const boxSpecDescription =
      payload.boxSpecificationType === 'STANDARD'
        ? `${payload.standardBoxSize || 'Standard'} (${payload.lengthMm}×${payload.widthMm}×${payload.heightMm}mm) - ${payload.material.toUpperCase()} - ${payload.printType}`
        : `Custom ${payload.lengthMm}×${payload.widthMm}×${payload.heightMm}mm - ${payload.material.toUpperCase()} - ${payload.printType}`;

    await notifyNewQuote({
      leadCode,
      companyName: payload.companyName,
      contactName: payload.fullName,
      workEmail: payload.workEmail,
      phoneNumber: payload.phoneNumber,
      branches: payload.branches,
      boxSpec: boxSpecDescription,
      monthlyVolume: payload.monthlyVolume,
      deliveryCity: payload.deliveryCity,
      deliveryCountry: payload.deliveryCountry,
      hasFiles: uniqueUploadTokens.length > 0,
      notes: payload.notes,
    });
  } catch (emailError) {
    console.error('Failed to dispatch quote notification email:', emailError);
  }

  return {
    success: true,
    leadCode,
  };
}
