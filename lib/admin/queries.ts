import { prisma } from '@/lib/db';
import { LeadStatus, LEAD_STATUS_LABEL } from '@/lib/types';
import { formatBoxSpec } from './formatters';
import { ActivityType, QuoteStatus, RuleScope, CostSource, PricingEntityType, PricingAuditAction, Role, AdminAuditAction } from '@prisma/client';
import { selectActiveCorridor, effectiveLandedCost, type CorridorCandidate } from '@/lib/pricing/logistics';
import { resolvePublicRange } from '@/lib/pricing/publicRange';
import { compactBreakdownLines } from '@/lib/pricing/breakdownFormat';

export interface LeadSummaryRow {
  id: string;
  code: string;
  status: LeadStatus;
  statusLabel: string;
  source: string;
  createdAt: string;
  company: {
    id: string;
    name: string;
  };
  contact: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  location: string;
  boxSpec: string;
  monthlyVolume: number;
  estYearlySavingsMax: string | null;
}

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface LeadDetailData {
  id: string;
  code: string;
  status: LeadStatus;
  statusLabel: string;
  source: string;
  createdAt: string;
  updatedAt: string;
  company: {
    id: string;
    name: string;
    website: string | null;
    branchRange: string | null;
    countryCode: string | null;
  };
  contact: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    jobTitle: string | null;
  };
  quoteRequest: {
    id: string;
    boxSpecificationType: 'STANDARD' | 'CUSTOM';
    standardBoxSize: string | null;
    lengthMm: number;
    widthMm: number;
    heightMm: number;
    material: string;
    print: string;
    customFlute: string | null;
    monthlyVolume: number;
    qtyPerOrder: number;
    deliveryCountryCode: string;
    deliveryCity: string;
    deliveryFrequency: string | null;
    hasLoadingDock: boolean;
    deliveryAccessNotes: string | null;
    notes: string | null;
    submittedAt: string;
  } | null;
  calcData: {
    id: string;
    countryCode: string;
    boxSize: string;
    material: string;
    print: string;
    boxesPerOrder: number;
    monthlyVolume: number;
    currentPrice: string;
    landedCostEur: string | null;
    markupMin: string | null;
    markupMax: string | null;
    estMinEur: string;
    estMaxEur: string;
    estYearlySavings: string;
    estYearlySavingsMin: string | null;
    estYearlySavingsMax: string | null;
    pricingVersion: string | null;
    createdAt: string;
  } | null;
  files: {
    id: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: string;
  }[];
  quotes: QuoteRow[];
  activities: {
    id: string;
    type: ActivityType;
    content: string;
    authorName: string | null;
    createdAt: string;
  }[];
}

export interface DashboardStats {
  totalLeads: number;
  byStatus: Record<LeadStatus, number>;
  recentActivities: RecentActivityRow[];
}

export interface RecentActivityRow {
  id: string;
  leadId: string;
  leadCode: string;
  companyName: string;
  type: ActivityType;
  content: string;
  authorName: string | null;
  createdAt: string;
}

export interface QuoteRow {
  id: string;
  leadId: string;
  leadCode: string;
  companyName: string;
  contactName: string;
  contactEmail?: string;
  revision: number;
  unitPriceEur: string;
  qty: number;
  totalEur: string;
  specs: string | null;
  notes: string | null;
  paymentTerms: string | null;
  dispatchSla: string | null;
  status: QuoteStatus;
  isExpired: boolean;
  hasAccessToken: boolean;
  dispatchReqAt: string | null;
  sentAt: string | null;
  expiresAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export interface LandedCostRow {
  id: string;
  boxConfigId: string;
  boxSizeLabel: string;
  material: string;
  print: string;
  countryId: string;
  countryCode: string;
  countryName: string;
  qtyTierMin: number;
  qtyTierMax: number | null;
  costEur: string;
  source: CostSource;
  effectiveFrom: string;
  effectiveTo: string | null;
  active: boolean;
}

export interface PricingRuleRow {
  id: string;
  scope: RuleScope;
  countryId: string | null;
  countryCode: string | null;
  countryName: string | null;
  boxConfigId: string | null;
  boxSizeLabel: string | null;
  markupMin: string;
  markupMax: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  active: boolean;
}

export interface PublicPriceRangeRow {
  id: string;
  boxConfigId: string;
  boxSizeLabel: string;
  material: string;
  print: string;
  countryId: string;
  countryCode: string;
  countryName: string;
  minEur: string;
  maxEur: string;
  isManualOverride: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  active: boolean;
}

export interface PricingAuditLogRow {
  id: string;
  authorName: string | null;
  entityType: PricingEntityType;
  entityId: string;
  action: PricingAuditAction;
  oldValues: any;
  newValues: any;
  createdAt: string;
}

export interface CountryOption {
  id: string;
  code: string;
  name: string;
  active: boolean;
}

export interface BoxConfigOption {
  id: string;
  sizeLabel: string;
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
  material: string;
  print: string;
  active: boolean;
}

export interface LogisticsRow {
  id: string;
  countryCode: string;
  countryName: string;
  route: string | null;
  port: string | null;
  shipMethod: string | null;
  freightEur: string | null;
  inlandEur: string | null;
  otherEur: string | null;
  active: boolean;
}

export interface LeadListOptions {
  page?: number;
  pageSize?: number;
  status?: LeadStatus;
  search?: string;
  sortField?: 'createdAt' | 'code' | 'status';
  sortDir?: 'asc' | 'desc';
}

/**
 * Fetch paginated leads with database-side filtering and search.
 */
export async function getLeadsSummary(
  opts: LeadListOptions = {}
): Promise<PaginatedResult<LeadSummaryRow>> {
  const page = Math.max(1, opts.page || 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize || 25));
  const skip = (page - 1) * pageSize;

  const whereClause: any = {};

  if (opts.status) {
    whereClause.status = opts.status;
  }

  const rawSearch = (opts.search || '').trim().slice(0, 200);
  if (rawSearch.length > 0) {
    whereClause.OR = [
      { code: { contains: rawSearch, mode: 'insensitive' } },
      { company: { name: { contains: rawSearch, mode: 'insensitive' } } },
      { contact: { name: { contains: rawSearch, mode: 'insensitive' } } },
      { contact: { email: { contains: rawSearch, mode: 'insensitive' } } },
    ];
  }

  const sortField = opts.sortField || 'createdAt';
  const sortDir = opts.sortDir || 'desc';

  const [leads, totalCount] = await prisma.$transaction([
    prisma.lead.findMany({
      where: whereClause,
      include: {
        company: true,
        contact: true,
        quoteRequest: true,
        calcData: true,
      },
      orderBy: [{ [sortField]: sortDir }, { id: 'desc' }],
      skip,
      take: pageSize,
    }),
    prisma.lead.count({ where: whereClause }),
  ]);

  const items: LeadSummaryRow[] = leads.map((l) => {
    const city = l.quoteRequest?.deliveryCity || l.company.countryCode || '';
    const country = l.quoteRequest?.deliveryCountryCode || l.company.countryCode || '';
    const location = city && country ? `${city}, ${country}` : city || country || 'EU';

    const boxSpec = formatBoxSpec(l.quoteRequest, l.calcData);
    const monthlyVolume =
      l.quoteRequest?.monthlyVolume || l.calcData?.monthlyVolume || 0;
    const estSavings =
      l.calcData?.estYearlySavingsMax?.toString() ||
      l.calcData?.estYearlySavings?.toString() ||
      null;

    return {
      id: l.id,
      code: l.code,
      status: l.status as LeadStatus,
      statusLabel: LEAD_STATUS_LABEL[l.status as LeadStatus] || l.status,
      source: l.source,
      createdAt: l.createdAt.toISOString(),
      company: {
        id: l.company.id,
        name: l.company.name,
      },
      contact: {
        id: l.contact.id,
        name: l.contact.name,
        email: l.contact.email,
        phone: l.contact.phone,
      },
      location,
      boxSpec,
      monthlyVolume,
      estYearlySavingsMax: estSavings,
    };
  });

  return {
    items,
    totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

export interface ContactSummaryRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  company: {
    id: string;
    name: string;
    website: string | null;
    countryCode: string | null;
  };
  leadsCount: number;
  latestLead?: {
    id: string;
    code: string;
    status: LeadStatus;
    createdAt: string;
  } | null;
}

/**
 * Fetch paginated CRM contacts with associated company and lead inquiry records.
 */
export async function getCRMContactsSummary(
  opts: { page?: number; pageSize?: number; search?: string } = {}
): Promise<PaginatedResult<ContactSummaryRow>> {
  const page = Math.max(1, opts.page || 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize || 50));
  const skip = (page - 1) * pageSize;

  const whereClause: any = {};
  const rawSearch = (opts.search || '').trim().slice(0, 200);
  if (rawSearch.length > 0) {
    whereClause.OR = [
      { name: { contains: rawSearch, mode: 'insensitive' } },
      { email: { contains: rawSearch, mode: 'insensitive' } },
      { phone: { contains: rawSearch, mode: 'insensitive' } },
      { jobTitle: { contains: rawSearch, mode: 'insensitive' } },
      { company: { name: { contains: rawSearch, mode: 'insensitive' } } },
    ];
  }

  const [contacts, totalCount] = await Promise.all([
    prisma.contact.findMany({
      where: whereClause,
      include: {
        company: true,
        leads: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, code: true, status: true, createdAt: true },
        },
        _count: {
          select: { leads: true },
        },
      },
      orderBy: { name: 'asc' },
      skip,
      take: pageSize,
    }),
    prisma.contact.count({ where: whereClause }),
  ]);

  const items: ContactSummaryRow[] = contacts.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    jobTitle: c.jobTitle,
    company: {
      id: c.company.id,
      name: c.company.name,
      website: c.company.website,
      countryCode: c.company.countryCode,
    },
    leadsCount: c._count.leads,
    latestLead: c.leads[0]
      ? {
          id: c.leads[0].id,
          code: c.leads[0].code,
          status: c.leads[0].status,
          createdAt: c.leads[0].createdAt.toISOString(),
        }
      : null,
  }));

  return {
    items,
    totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

/**
 * Fetch a single lead by ID with all relations for the detail dossier.
 */
export async function getLeadDetail(id: string): Promise<LeadDetailData | null> {
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      company: true,
      contact: true,
      quoteRequest: true,
      calcData: true,
      files: {
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      },
      quotes: {
        include: {
          lead: {
            include: {
              company: true,
              contact: true,
            },
          },
        },
        orderBy: [{ revision: 'desc' }, { id: 'desc' }],
      },
      activities: {
        include: {
          author: {
            select: { name: true },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      },
    },
  });

  if (!lead) return null;

  return {
    id: lead.id,
    code: lead.code,
    status: lead.status as LeadStatus,
    statusLabel: LEAD_STATUS_LABEL[lead.status as LeadStatus] || lead.status,
    source: lead.source,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
    company: {
      id: lead.company.id,
      name: lead.company.name,
      website: lead.company.website,
      branchRange: lead.company.branchRange,
      countryCode: lead.company.countryCode,
    },
    contact: {
      id: lead.contact.id,
      name: lead.contact.name,
      email: lead.contact.email,
      phone: lead.contact.phone,
      jobTitle: lead.contact.jobTitle,
    },
    quoteRequest: lead.quoteRequest
      ? {
          id: lead.quoteRequest.id,
          boxSpecificationType: lead.quoteRequest.boxSpecificationType,
          standardBoxSize: lead.quoteRequest.standardBoxSize,
          lengthMm: lead.quoteRequest.lengthMm,
          widthMm: lead.quoteRequest.widthMm,
          heightMm: lead.quoteRequest.heightMm,
          material: lead.quoteRequest.material,
          print: lead.quoteRequest.print,
          customFlute: lead.quoteRequest.customFlute,
          monthlyVolume: lead.quoteRequest.monthlyVolume,
          qtyPerOrder: lead.quoteRequest.qtyPerOrder,
          deliveryCountryCode: lead.quoteRequest.deliveryCountryCode,
          deliveryCity: lead.quoteRequest.deliveryCity,
          deliveryFrequency: lead.quoteRequest.deliveryFrequency,
          hasLoadingDock: lead.quoteRequest.hasLoadingDock,
          deliveryAccessNotes: lead.quoteRequest.deliveryAccessNotes,
          notes: lead.quoteRequest.notes,
          submittedAt: lead.quoteRequest.submittedAt.toISOString(),
        }
      : null,
    calcData: lead.calcData
      ? {
          id: lead.calcData.id,
          countryCode: lead.calcData.countryCode,
          boxSize: lead.calcData.boxSize,
          material: lead.calcData.material,
          print: lead.calcData.print,
          boxesPerOrder: lead.calcData.boxesPerOrder,
          monthlyVolume: lead.calcData.monthlyVolume,
          currentPrice: lead.calcData.currentPrice.toString(),
          landedCostEur: lead.calcData.landedCostEur?.toString() || null,
          markupMin: lead.calcData.markupMin?.toString() || null,
          markupMax: lead.calcData.markupMax?.toString() || null,
          estMinEur: lead.calcData.estMinEur.toString(),
          estMaxEur: lead.calcData.estMaxEur.toString(),
          estYearlySavings: lead.calcData.estYearlySavings.toString(),
          estYearlySavingsMin: lead.calcData.estYearlySavingsMin?.toString() || null,
          estYearlySavingsMax: lead.calcData.estYearlySavingsMax?.toString() || null,
          pricingVersion: lead.calcData.pricingVersion,
          createdAt: lead.calcData.createdAt.toISOString(),
        }
      : null,
    files: lead.files.map((f) => ({
      id: f.id,
      fileName: f.fileName,
      mimeType: f.mimeType,
      sizeBytes: f.sizeBytes,
      createdAt: f.createdAt.toISOString(),
    })),
    quotes: lead.quotes.map((q) => {
      const isExpired = Boolean(q.expiresAt && q.expiresAt.getTime() <= new Date().getTime());
      const totalEur = (Number(q.unitPriceEur) * q.qty).toFixed(2);

      return {
        id: q.id,
        leadId: q.leadId,
        leadCode: q.lead.code,
        companyName: q.lead.company.name,
        contactName: q.lead.contact.name,
        contactEmail: q.lead.contact.email,
        revision: q.revision,
        unitPriceEur: q.unitPriceEur.toString(),
        qty: q.qty,
        totalEur,
        specs: q.specs,
        notes: q.notes,
        paymentTerms: q.paymentTerms,
        dispatchSla: q.dispatchSla,
        status: q.status,
        isExpired,
        hasAccessToken: Boolean(q.accessToken),
        dispatchReqAt: q.dispatchReqAt?.toISOString() || null,
        sentAt: q.sentAt?.toISOString() || null,
        expiresAt: q.expiresAt?.toISOString() || null,
        acceptedAt: q.acceptedAt?.toISOString() || null,
        rejectedAt: q.rejectedAt?.toISOString() || null,
        rejectionReason: q.rejectionReason,
        createdAt: q.createdAt.toISOString(),
      };
    }),
    activities: lead.activities.map((a) => ({
      id: a.id,
      type: a.type,
      content: a.content,
      authorName: a.author?.name || null,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}

export interface QuoteListOptions {
  status?: string;
  search?: string;
}

/**
 * Fetch all admin-created Quote records with status filtering (including derived EXPIRED) and search.
 */
export async function getQuotesList(opts: QuoteListOptions = {}): Promise<QuoteRow[]> {
  const whereClause: any = {};
  const now = new Date();

  if (opts.status && opts.status !== 'ALL') {
    if (opts.status === 'EXPIRED') {
      whereClause.status = 'SENT';
      whereClause.expiresAt = { lte: now };
    } else if (opts.status === 'SENT') {
      whereClause.status = 'SENT';
      whereClause.OR = [
        { expiresAt: { gt: now } },
        { expiresAt: null },
      ];
    } else {
      whereClause.status = opts.status as QuoteStatus;
    }
  }

  const rawSearch = (opts.search || '').trim().slice(0, 200);
  if (rawSearch.length > 0) {
    whereClause.OR = [
      { lead: { code: { contains: rawSearch, mode: 'insensitive' } } },
      { lead: { company: { name: { contains: rawSearch, mode: 'insensitive' } } } },
      { lead: { contact: { name: { contains: rawSearch, mode: 'insensitive' } } } },
      { lead: { contact: { email: { contains: rawSearch, mode: 'insensitive' } } } },
    ];
  }

  const quotes = await prisma.quote.findMany({
    where: whereClause,
    include: {
      lead: {
        include: {
          company: true,
          contact: true,
        },
      },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });

  return quotes.map((q) => {
    const isExpired = Boolean(q.expiresAt && q.expiresAt.getTime() <= now.getTime());
    const totalEur = (Number(q.unitPriceEur) * q.qty).toFixed(2);

    return {
      id: q.id,
      leadId: q.lead.id,
      leadCode: q.lead.code,
      companyName: q.lead.company.name,
      contactName: q.lead.contact.name,
      contactEmail: q.lead.contact.email,
      revision: q.revision,
      unitPriceEur: q.unitPriceEur.toString(),
      qty: q.qty,
      totalEur,
      specs: q.specs,
      notes: q.notes,
      paymentTerms: q.paymentTerms,
      dispatchSla: q.dispatchSla,
      status: q.status,
      isExpired,
      hasAccessToken: Boolean(q.accessToken),
      dispatchReqAt: q.dispatchReqAt?.toISOString() || null,
      sentAt: q.sentAt?.toISOString() || null,
      expiresAt: q.expiresAt?.toISOString() || null,
      acceptedAt: q.acceptedAt?.toISOString() || null,
      rejectedAt: q.rejectedAt?.toISOString() || null,
      rejectionReason: q.rejectionReason,
      createdAt: q.createdAt.toISOString(),
    };
  });
}

/**
 * Fetch aggregated dashboard KPIs across all 8 statuses and recent activity history.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const allStatuses: LeadStatus[] = [
    'NEW',
    'REVIEWING',
    'NEED_MORE_INFO',
    'QUOTE_PREPARED',
    'QUOTE_SENT',
    'NEGOTIATING',
    'WON',
    'LOST',
  ];

  const initialStatusCounts: Record<LeadStatus, number> = {
    NEW: 0,
    REVIEWING: 0,
    NEED_MORE_INFO: 0,
    QUOTE_PREPARED: 0,
    QUOTE_SENT: 0,
    NEGOTIATING: 0,
    WON: 0,
    LOST: 0,
  };

  const [statusGroups, totalLeads, recentActivities] = await prisma.$transaction([
    prisma.lead.groupBy({
      by: ['status'],
      _count: { id: true },
      orderBy: { status: 'asc' },
    }),
    prisma.lead.count(),
    prisma.leadActivity.findMany({
      include: {
        lead: {
          include: {
            company: true,
          },
        },
        author: {
          select: { name: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 15,
    }),
  ]);

  const byStatus = { ...initialStatusCounts };
  for (const group of statusGroups) {
    if (allStatuses.includes(group.status as LeadStatus)) {
      const count =
        typeof group._count === 'object' && group._count
          ? group._count.id || 0
          : 0;
      byStatus[group.status as LeadStatus] = count;
    }
  }

  const activities: RecentActivityRow[] = recentActivities.map((a) => ({
    id: a.id,
    leadId: a.lead.id,
    leadCode: a.lead.code,
    companyName: a.lead.company.name,
    type: a.type,
    content: a.content,
    authorName: a.author?.name || null,
    createdAt: a.createdAt.toISOString(),
  }));

  return {
    totalLeads,
    byStatus,
    recentActivities: activities,
  };
}

/**
 * Fetch count of NEW leads for the sidebar badge.
 */
export async function getNewLeadsCount(): Promise<number> {
  return prisma.lead.count({
    where: { status: 'NEW' },
  });
}

/**
 * Fetch count of DRAFT quotes for the sidebar badge.
 */
export async function getDraftQuotesCount(): Promise<number> {
  return prisma.quote.count({
    where: { status: 'DRAFT' },
  });
}

/**
 * Fetch all landed cost records (active + historical versions).
 */
export async function getLandedCosts(): Promise<LandedCostRow[]> {
  const records = await prisma.landedCost.findMany({
    include: {
      boxConfig: true,
      country: true,
    },
    orderBy: [
      { country: { code: 'asc' } },
      { boxConfig: { sizeLabel: 'asc' } },
      { qtyTierMin: 'asc' },
      { effectiveFrom: 'desc' },
      { id: 'desc' },
    ],
  });

  return records.map((r) => ({
    id: r.id,
    boxConfigId: r.boxConfigId,
    boxSizeLabel: r.boxConfig.sizeLabel,
    material: r.boxConfig.material,
    print: r.boxConfig.print,
    countryId: r.countryId,
    countryCode: r.country.code,
    countryName: r.country.name,
    qtyTierMin: r.qtyTierMin,
    qtyTierMax: r.qtyTierMax,
    costEur: r.costEur.toString(),
    source: r.source,
    effectiveFrom: r.effectiveFrom.toISOString(),
    effectiveTo: r.effectiveTo?.toISOString() || null,
    active: r.active,
  }));
}

/**
 * Fetch all pricing rules (active + historical versions).
 */
export async function getPricingRules(): Promise<PricingRuleRow[]> {
  const records = await prisma.pricingRule.findMany({
    include: {
      country: true,
      boxConfig: true,
    },
    orderBy: [{ scope: 'asc' }, { effectiveFrom: 'desc' }, { id: 'desc' }],
  });

  return records.map((r) => ({
    id: r.id,
    scope: r.scope,
    countryId: r.countryId,
    countryCode: r.country?.code || null,
    countryName: r.country?.name || null,
    boxConfigId: r.boxConfigId,
    boxSizeLabel: r.boxConfig?.sizeLabel || null,
    markupMin: r.markupMin.toString(),
    markupMax: r.markupMax.toString(),
    effectiveFrom: r.effectiveFrom.toISOString(),
    effectiveTo: r.effectiveTo?.toISOString() || null,
    active: r.active,
  }));
}

/**
 * Fetch all public price range overrides.
 */
export async function getPublicPriceRanges(): Promise<PublicPriceRangeRow[]> {
  const records = await prisma.publicPriceRange.findMany({
    orderBy: [{ countryId: 'asc' }, { effectiveFrom: 'desc' }, { id: 'desc' }],
  });

  // Collect unique boxConfig and country IDs to resolve labels
  const boxConfigIds = Array.from(new Set(records.map((r) => r.boxConfigId)));
  const countryIds = Array.from(new Set(records.map((r) => r.countryId)));

  const [boxConfigs, countries] = await Promise.all([
    prisma.boxConfig.findMany({ where: { id: { in: boxConfigIds } } }),
    prisma.country.findMany({ where: { id: { in: countryIds } } }),
  ]);

  const boxMap = new Map(boxConfigs.map((b) => [b.id, b]));
  const countryMap = new Map(countries.map((c) => [c.id, c]));

  return records.map((r) => {
    const box = boxMap.get(r.boxConfigId);
    const country = countryMap.get(r.countryId);

    return {
      id: r.id,
      boxConfigId: r.boxConfigId,
      boxSizeLabel: box?.sizeLabel || 'Unknown',
      material: box?.material || 'KRAFT',
      print: box?.print || 'PLAIN',
      countryId: r.countryId,
      countryCode: country?.code || '—',
      countryName: country?.name || '—',
      minEur: r.minEur.toString(),
      maxEur: r.maxEur.toString(),
      isManualOverride: r.isManualOverride,
      effectiveFrom: r.effectiveFrom.toISOString(),
      effectiveTo: r.effectiveTo?.toISOString() || null,
      active: r.active,
    };
  });
}

/**
 * Fetch recent pricing audit logs with author information.
 */
export async function getPricingAuditLogs(): Promise<PricingAuditLogRow[]> {
  const records = await prisma.pricingAuditLog.findMany({
    include: {
      author: {
        select: { name: true },
      },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 30,
  });

  return records.map((r) => ({
    id: r.id,
    authorName: r.author?.name || null,
    entityType: r.entityType,
    entityId: r.entityId,
    action: r.action,
    oldValues: r.oldValues,
    newValues: r.newValues,
    createdAt: r.createdAt.toISOString(),
  }));
}

/**
 * Fetch active countries for selector dropdowns.
 */
export async function getCountries(): Promise<CountryOption[]> {
  const records = await prisma.country.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
  });

  return records.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
    active: c.active,
  }));
}

/**
 * Fetch active box configurations for selector dropdowns.
 */
export async function getBoxConfigs(): Promise<BoxConfigOption[]> {
  const records = await prisma.boxConfig.findMany({
    where: { active: true },
    orderBy: [{ sizeLabel: 'asc' }, { material: 'asc' }, { print: 'asc' }],
  });

  return records.map((b) => ({
    id: b.id,
    sizeLabel: b.sizeLabel,
    lengthMm: b.lengthMm,
    widthMm: b.widthMm,
    heightMm: b.heightMm,
    material: b.material,
    print: b.print,
    active: b.active,
  }));
}

/**
 * Fetch logistics costs joined with countries for the logistics hubs view.
 */
export async function getLogisticsData(): Promise<LogisticsRow[]> {
  const records = await prisma.logisticsCost.findMany({
    include: {
      country: true,
    },
    orderBy: [{ country: { name: 'asc' } }, { id: 'desc' }],
  });

  return records.map((l) => ({
    id: l.id,
    countryCode: l.country.code,
    countryName: l.country.name,
    route: l.route,
    port: l.port,
    shipMethod: l.shipMethod,
    freightEur: l.freightEur?.toString() || null,
    inlandEur: l.inlandEur?.toString() || null,
    otherEur: l.otherEur?.toString() || null,
    active: l.active,
  }));
}

/** Active logistics corridors as pricing candidates (numbers, not Decimals/strings). */
export async function getActiveCorridorCandidates(): Promise<CorridorCandidate[]> {
  const rows = await prisma.logisticsCost.findMany({ where: { active: true } });
  return rows.map((l) => ({
    id: l.id,
    countryId: l.countryId,
    route: l.route,
    freightEur: l.freightEur ? Number(l.freightEur) : 0,
    inlandEur: l.inlandEur ? Number(l.inlandEur) : 0,
    otherEur: l.otherEur ? Number(l.otherEur) : 0,
    active: l.active,
  }));
}

export interface QuotePricingGuidance {
  available: boolean;
  countryName: string;
  compact: { label: string; valueEur: number }[];
  markupMinPct: number;
  markupMaxPct: number;
  suggestedMinEur: number;
  suggestedMaxEur: number;
  noLogisticsConfigured: boolean;
}

/** Compute the compact pricing guidance shown in the quote builder for a lead. */
export async function getQuotePricingGuidance(leadId: string): Promise<QuotePricingGuidance | null> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { quoteRequest: true, calcData: true },
  });
  if (!lead) return null;

  const countryCode =
    lead.quoteRequest?.deliveryCountryCode || lead.calcData?.countryCode || null;
  const sizeLabel = lead.quoteRequest?.standardBoxSize || lead.calcData?.boxSize || null;
  const monthlyVolume = lead.quoteRequest?.monthlyVolume || lead.calcData?.monthlyVolume || 0;
  const material = lead.quoteRequest?.material || lead.calcData?.material || 'KRAFT';
  const print = lead.quoteRequest?.print || lead.calcData?.print || 'PLAIN';
  if (!countryCode || !sizeLabel) return null;

  const country = await prisma.country.findUnique({ where: { code: countryCode } });
  const box = await prisma.boxConfig.findUnique({
    where: { sizeLabel_material_print: { sizeLabel, material, print } },
  });
  if (!country || !box) return null;

  const [rules, landed, approved, corridors] = await Promise.all([
    prisma.pricingRule.findMany({
      where: { active: true, OR: [{ scope: 'GLOBAL' }, { countryId: country.id }, { boxConfigId: box.id }] },
    }),
    prisma.landedCost.findMany({ where: { active: true, boxConfigId: box.id, countryId: country.id } }),
    prisma.publicPriceRange.findFirst({ where: { boxConfigId: box.id, countryId: country.id, active: true } }),
    getActiveCorridorCandidates(),
  ]);

  const range = resolvePublicRange({
    boxConfigId: box.id,
    countryId: country.id,
    monthlyVolume,
    approvedRange: approved && approved.active ? { minEur: Number(approved.minEur), maxEur: Number(approved.maxEur) } : null,
    markupRules: rules.map((r) => ({ scope: r.scope, countryId: r.countryId, boxConfigId: r.boxConfigId, markupMin: Number(r.markupMin), markupMax: Number(r.markupMax), active: r.active })),
    landedCosts: landed.map((l) => ({ boxConfigId: l.boxConfigId, countryId: l.countryId, qtyTierMin: l.qtyTierMin, qtyTierMax: l.qtyTierMax, costEur: Number(l.costEur), active: l.active })),
    logistics: selectActiveCorridor(corridors, country.id),
  });

  const breakdown = range.breakdown ?? effectiveLandedCost(0, null);
  return {
    available: range.available,
    countryName: country.name,
    compact: compactBreakdownLines(breakdown, country.name),
    markupMinPct: Math.round(range.markupMin * 1000) / 10,
    markupMaxPct: Math.round(range.markupMax * 1000) / 10,
    suggestedMinEur: range.minEur,
    suggestedMaxEur: range.maxEur,
    noLogisticsConfigured: breakdown.noLogisticsConfigured,
  };
}

export interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

export interface AdminAuditLogRow {
  id: string;
  actorAdminId: string;
  actorAdminName: string;
  targetAdminId: string;
  targetAdminName: string;
  targetAdminEmail: string;
  action: AdminAuditAction;
  oldValue: any;
  newValue: any;
  createdAt: string;
}

export interface SystemDiagnosticsData {
  storage: {
    provider: string;
    bucket?: string;
    status: 'Connected' | 'Local';
  };
  email: {
    transporter: 'SMTP' | 'Console';
    status: 'Configured' | 'Development Mode';
  };
  database: {
    status: 'Connected' | 'Error';
    latencyMs: number;
  };
  environment: string;
}

/**
 * Fetch all admin users without exposing password hashes.
 */
export async function getAdminUsers(): Promise<AdminUserRow[]> {
  const users = await prisma.adminUser.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      createdAt: true,
    },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  });

  return users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    active: u.active,
    createdAt: u.createdAt.toISOString(),
  }));
}

/**
 * Fetch admin governance audit logs.
 */
export async function getAdminAuditLogs(): Promise<AdminAuditLogRow[]> {
  const logs = await prisma.adminAuditLog.findMany({
    include: {
      actorAdmin: {
        select: { name: true },
      },
      targetAdmin: {
        select: { name: true, email: true },
      },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 50,
  });

  return logs.map((l) => ({
    id: l.id,
    actorAdminId: l.actorAdminId,
    actorAdminName: l.actorAdmin?.name ?? 'System',
    targetAdminId: l.targetAdminId,
    targetAdminName: l.targetAdmin?.name ?? 'Deleted Admin',
    targetAdminEmail: l.targetAdmin?.email ?? '—',
    action: l.action,
    oldValue: l.oldValue,
    newValue: l.newValue,
    createdAt: l.createdAt.toISOString(),
  }));
}

/**
 * Fetch sanitized system diagnostics without leaking sensitive keys, passwords, or connection strings.
 */
export async function getSystemDiagnostics(): Promise<SystemDiagnosticsData> {
  const s3Bucket = process.env.S3_BUCKET;
  const isS3 = process.env.STORAGE_PROVIDER === 's3' || Boolean(s3Bucket);
  const isSmtp = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);

  // Measure safe database ping latency
  const startTime = Date.now();
  let dbStatus: 'Connected' | 'Error' = 'Connected';
  let latencyMs = 0;

  try {
    await prisma.$queryRaw`SELECT 1`;
    latencyMs = Date.now() - startTime;
  } catch {
    dbStatus = 'Error';
  }

  return {
    storage: {
      provider: isS3 ? 'S3 / Cloudflare R2' : 'Local Disk',
      bucket: isS3 && s3Bucket ? s3Bucket : undefined,
      status: isS3 ? 'Connected' : 'Local',
    },
    email: {
      transporter: isSmtp ? 'SMTP' : 'Console',
      status: isSmtp ? 'Configured' : 'Development Mode',
    },
    database: {
      status: dbStatus,
      latencyMs,
    },
    environment: process.env.NODE_ENV || 'development',
  };
}

