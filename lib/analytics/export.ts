import { VisitorIntelligenceData } from './types';

/**
 * Renders a value as a safe, quoted CSV cell.
 *
 * Neutralizes spreadsheet formula injection (CWE-1236): any cell that begins
 * with a formula trigger (`= + - @`, tab or carriage return) is prefixed with a
 * single quote so Excel/LibreOffice treat it as text rather than executing it.
 * Attacker-controlled analytics fields (utm medium/campaign, referrer, paths)
 * flow into this export, so every string cell must pass through here. Embedded
 * double quotes are doubled per RFC 4180.
 */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) {
    s = `'${s}`;
  }
  return `"${s.replace(/"/g, '""')}"`;
}

export function formatAnalyticsAsCsv(data: VisitorIntelligenceData, section = 'summary'): string {
  const lines: string[] = [];

  switch (section) {
    case 'countries': {
      lines.push('Country Code,Country Name,Visitors,Sessions,Page Views,Quote Requests,Conversion Rate (%),Share of Traffic (%)');
      for (const c of data.countries) {
        lines.push(
          `${csvCell(c.countryCode)},${csvCell(c.countryName)},${c.visitors},${c.sessions},${c.pageViews},${c.quoteRequests},${c.conversionRatePct}%,${c.shareOfTrafficPct}%`
        );
      }
      break;
    }
    case 'pages': {
      lines.push('Path,Canonical Path,Page Views,Unique Visitors,Entrances,Exits,Exit Rate (%)');
      for (const p of data.topPages) {
        lines.push(
          `${csvCell(p.path)},${csvCell(p.canonicalPath)},${p.pageViews},${p.uniqueVisitors},${p.entrances},${p.exits},${p.exitRatePct}%`
        );
      }
      break;
    }
    case 'campaigns': {
      lines.push('Traffic Source,Medium,Campaign,Sessions,Unique Visitors,Calculator Uses,Quote Submissions,Conversion Rate (%)');
      for (const camp of data.campaigns) {
        lines.push(
          `${csvCell(camp.source)},${csvCell(camp.medium || '')},${csvCell(camp.campaign || '')},${camp.sessions},${camp.uniqueVisitors},${camp.calculatorUses},${camp.quoteSubmissions},${camp.conversionRatePct}%`
        );
      }
      break;
    }
    case 'funnel': {
      lines.push('Stage,Description,Visitor Count,Conversion from Previous (%),Conversion from Top (%)');
      for (const f of data.funnel.acquisitionFunnel) {
        lines.push(
          `${csvCell(f.stage)},${csvCell(f.description)},${f.count},${f.conversionFromPrevPct}%,${f.conversionFromTopPct}%`
        );
      }
      break;
    }
    default: {
      // Summary
      lines.push('Metric,Value,Period Delta (%)');
      lines.push(`"Consent-Based Unique Visitors",${data.summary.consentedUniqueVisitors},${data.summary.deltas.visitorsDeltaPct}%`);
      lines.push(`"Consented Sessions",${data.summary.consentedSessions},${data.summary.deltas.sessionsDeltaPct}%`);
      lines.push(`"Consented Page Views",${data.summary.consentedPageViews},${data.summary.deltas.pageViewsDeltaPct}%`);
      lines.push(`"Pages per Session",${data.summary.pagesPerSession},-`);
      lines.push(`"Average Session Duration (seconds)",${data.summary.avgSessionDurationSec},${data.summary.deltas.avgDurationDeltaPct}%`);
      lines.push(`"Bounce Rate (%)",${data.summary.bounceRatePct}%,${data.summary.deltas.bounceRateDeltaPct}%`);
      lines.push(`"Calculator Usages",${data.summary.calculatorUsageCount},-`);
      lines.push(`"Quote Submissions",${data.summary.quoteSubmissionsCount},-`);
      lines.push(`"Visitor to Quote Conversion Rate (%)",${data.summary.visitorToQuoteConversionRatePct}%,${data.summary.deltas.quoteConversionDeltaPct}%`);
    }
  }

  return lines.join('\n');
}
