import { AnalyticsEventType, TrafficSourceType, DeviceType } from '@prisma/client';

export type DateRangePreset =
  | 'TODAY'
  | 'YESTERDAY'
  | '7D'
  | '30D'
  | '90D'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'CUSTOM';

export interface AnalyticsEventInput {
  anonymousVisitorId?: string;
  sessionToken?: string;
  eventType: AnalyticsEventType;
  path: string;
  canonicalPath?: string;
  locale?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  deviceType?: DeviceType;
  metadata?: Record<string, any>;
}

export interface IngestionResult {
  success: boolean;
  visitorId?: string;
  sessionId?: string;
  eventId?: string;
  error?: string;
}

export interface AnalyticsFilterParams {
  range: DateRangePreset;
  customStartDate?: Date;
  customEndDate?: Date;
  country?: string;
  locale?: string;
  source?: TrafficSourceType | 'ALL';
  device?: DeviceType | 'ALL';
  campaign?: string;
  page?: number;
  pageSize?: number;
}

export interface MetricSummary {
  consentedUniqueVisitors: number;
  consentedSessions: number;
  consentedPageViews: number;
  pagesPerSession: number;
  avgSessionDurationSec: number;
  bounceRatePct: number;
  calculatorUsageCount: number;
  quoteSubmissionsCount: number;
  visitorToQuoteConversionRatePct: number;
  // Period-over-period deltas (% change vs previous comparable period)
  deltas: {
    visitorsDeltaPct: number;
    sessionsDeltaPct: number;
    pageViewsDeltaPct: number;
    avgDurationDeltaPct: number;
    bounceRateDeltaPct: number;
    quoteConversionDeltaPct: number;
  };
}

export interface TrafficTimePoint {
  timestamp: string; // ISO date or "YYYY-MM-DD" or "HH:00"
  dateLabel: string;
  visitors: number;
  sessions: number;
  pageViews: number;
  quoteSubmissions: number;
}

export interface CountryMetricRow {
  countryCode: string;
  countryName: string;
  visitors: number;
  sessions: number;
  pageViews: number;
  quoteRequests: number;
  conversionRatePct: number;
  avgDurationSec: number;
  shareOfTrafficPct: number;
}

export interface PageMetricRow {
  path: string;
  canonicalPath: string;
  pageViews: number;
  uniqueVisitors: number;
  entrances: number;
  exits: number;
  exitRatePct: number;
  avgTimeOnPageSec: number;
}

export interface LandingPageRow {
  landingPath: string;
  sessions: number;
  bounces: number;
  bounceRatePct: number;
  quoteSubmissions: number;
  conversionRatePct: number;
}

export interface ExitPageRow {
  exitPath: string;
  exits: number;
  totalViews: number;
  exitRatePct: number;
  isHighDropoffAnomaly: boolean;
}

export interface DualStageFunnel {
  acquisitionFunnel: {
    stage: string;
    description: string;
    count: number;
    dropoffPct: number;
    conversionFromPrevPct: number;
    conversionFromTopPct: number;
  }[];
  crmPipeline: {
    stage: string;
    description: string;
    count: number;
    conversionFromTopPct: number;
  }[];
}

export interface CalculatorTelemetry {
  totalCalculatorViews: number;
  totalCalculationsRun: number;
  totalCompletedCalculations: number;
  quoteHandoffsClicked: number;
  calculatorCompletionRatePct: number;
  calculatorToQuoteConversionRatePct: number;
  topVolumeRanges: Array<{ label: string; count: number; percentage: number }>;
  topBoxSizesCalculated: Array<{ size: string; count: number; percentage: number }>;
}

export interface CtaClickMetric {
  ctaName: string;
  location: string;
  clicks: number;
  shareOfTotalClicksPct: number;
}

export interface CampaignAttributionRow {
  source: string;
  medium?: string;
  campaign?: string;
  sessions: number;
  uniqueVisitors: number;
  calculatorUses: number;
  quoteSubmissions: number;
  conversionRatePct: number;
}

export interface SessionStreamItem {
  id: string;
  sessionToken: string;
  startedAt: string;
  lastActivityAt: string;
  durationSec: number;
  countryCode: string | null;
  countryName: string | null;
  locale: string | null;
  trafficSource: TrafficSourceType;
  referrerDomain: string | null;
  utmCampaign: string | null;
  deviceType: DeviceType;
  pageViewsCount: number;
  journey: string[]; // sequence of paths
  outcome: 'BOUNCED' | 'BROWSED' | 'CALCULATED' | 'QUOTE_SUBMITTED';
}

export interface WebsiteHealthAlert {
  id: string;
  type: 'OPPORTUNITY' | 'WARNING' | 'ANOMALY' | 'INFO';
  title: string;
  description: string;
  metric?: string;
  changePct?: number;
  detectedAt: string;
}

export interface VisitorIntelligenceData {
  timeframe: {
    rangePreset: DateRangePreset;
    startDate: string;
    endDate: string;
    previousStartDate: string;
    previousEndDate: string;
  };
  filterApplied: {
    country?: string;
    locale?: string;
    source?: string;
    device?: string;
    campaign?: string;
  };
  summary: MetricSummary;
  alerts: WebsiteHealthAlert[];
  trafficOverTime: TrafficTimePoint[];
  countries: CountryMetricRow[];
  topPages: PageMetricRow[];
  landingPages: LandingPageRow[];
  exitPages: ExitPageRow[];
  funnel: DualStageFunnel;
  calculatorTelemetry: CalculatorTelemetry;
  ctaPerformance: CtaClickMetric[];
  campaigns: CampaignAttributionRow[];
  recentSessions: SessionStreamItem[];
  generatedAt: string;
}
