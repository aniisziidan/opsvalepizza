import { VisitorIntelligenceData } from './types';

export function formatAnalyticsAsCsv(data: VisitorIntelligenceData, section = 'summary'): string {
  const lines: string[] = [];

  switch (section) {
    case 'countries': {
      lines.push('Country Code,Country Name,Visitors,Sessions,Page Views,Quote Requests,Conversion Rate (%),Share of Traffic (%)');
      for (const c of data.countries) {
        lines.push(
          `"${c.countryCode}","${c.countryName}",${c.visitors},${c.sessions},${c.pageViews},${c.quoteRequests},${c.conversionRatePct}%,${c.shareOfTrafficPct}%`
        );
      }
      break;
    }
    case 'pages': {
      lines.push('Path,Canonical Path,Page Views,Unique Visitors,Entrances,Exits,Exit Rate (%)');
      for (const p of data.topPages) {
        lines.push(
          `"${p.path}","${p.canonicalPath}",${p.pageViews},${p.uniqueVisitors},${p.entrances},${p.exits},${p.exitRatePct}%`
        );
      }
      break;
    }
    case 'campaigns': {
      lines.push('Traffic Source,Medium,Campaign,Sessions,Unique Visitors,Calculator Uses,Quote Submissions,Conversion Rate (%)');
      for (const camp of data.campaigns) {
        lines.push(
          `"${camp.source}","${camp.medium || ''}","${camp.campaign || ''}",${camp.sessions},${camp.uniqueVisitors},${camp.calculatorUses},${camp.quoteSubmissions},${camp.conversionRatePct}%`
        );
      }
      break;
    }
    case 'funnel': {
      lines.push('Stage,Description,Visitor Count,Conversion from Previous (%),Conversion from Top (%)');
      for (const f of data.funnel.acquisitionFunnel) {
        lines.push(
          `"${f.stage}","${f.description}",${f.count},${f.conversionFromPrevPct}%,${f.conversionFromTopPct}%`
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
