import React from 'react';
import { getLegalConfig } from '@/lib/legal/config';
import { getDictionary } from '@/lib/i18n/getDictionary';
import { isValidLocale, DEFAULT_LOCALE, Locale } from '@/lib/i18n/config';

interface PrivacyPageProps {
  params: Promise<{ locale: string }>;
}

export default async function PrivacyPage({ params }: PrivacyPageProps) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isValidLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const dict = getDictionary(locale);
  const legalConfig = getLegalConfig();

  return (
    <div className="w-full py-12 sm:py-16 max-w-[1000px] mx-auto px-4 sm:px-8 font-mono-data text-xs">
      <div className="mb-10 border-l-4 border-[#e77114] pl-6 py-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[#735a31] uppercase tracking-widest font-semibold text-[11px]">
            GDPR Compliance Notice
          </span>
          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold text-[10px]">
            VERSION {legalConfig.versions.privacyVersion}
          </span>
        </div>
        <h1 className="font-headline text-3xl sm:text-4xl font-bold text-[#041632]">
          {dict.legal.privacyTitle}
        </h1>
      </div>

      <div className="bg-white border border-[#c5c6ce] rounded-xl p-8 sm:p-10 shadow-sm space-y-8 text-[#44474d] leading-relaxed">
        {/* 1. Data Controller */}
        <section className="space-y-3">
          <h2 className="font-headline text-lg font-bold text-[#041632] border-b border-[#c5c6ce] pb-2">
            1. Data Controller &amp; Contact
          </h2>
          <p className="font-body text-xs">
            The data controller responsible for the processing of personal and business data on this platform within the meaning of the General Data Protection Regulation (GDPR) is:
          </p>
          <div className="bg-[#f8f9ff] p-4 rounded border border-[#c5c6ce]/60 text-xs">
            <span className="font-bold text-[#041632] block">{legalConfig.company.legalName}</span>
            <span>{legalConfig.company.registeredAddress}</span>
            <span className="block mt-1">
              Data Protection / Legal Officer: <a href={`mailto:${legalConfig.company.contactEmail}`} className="text-blue-700 underline">{legalConfig.company.contactEmail}</a>
            </span>
          </div>
        </section>

        {/* 2. Scope & Categories of Data Processing */}
        <section className="space-y-3">
          <h2 className="font-headline text-lg font-bold text-[#041632] border-b border-[#c5c6ce] pb-2">
            2. Scope &amp; Processing Categories
          </h2>
          <p className="font-body text-xs">
            We collect and process personal data exclusively for commercial business-to-business (B2B) packaging inquiries, pricing benchmarking, proposal generation, and order fulfillment:
          </p>
          <ul className="list-disc pl-5 space-y-2 font-body text-xs">
            <li>
              <strong>Savings Calculator Data:</strong> Country of destination, box dimensions, material selections, and estimated monthly volumes.
            </li>
            <li>
              <strong>Quote Inquiries:</strong> Company name, VAT ID (if provided), contact person name, corporate email address, delivery city/country, and packaging specifications.
            </li>
            <li>
              <strong>File Uploads &amp; Dielines:</strong> Packaging dielines, artwork files (PDF, AI, PNG, DXF) uploaded to calculate flexographic plate requirements.
            </li>
            <li>
              <strong>Proposal Acceptance &amp; Contract Records:</strong> Client IP address, user agent, accepted legal versions (Terms and Privacy), and timestamp upon formal commercial proposal confirmation.
            </li>
          </ul>
        </section>

        {/* 3. Legal Bases for Processing */}
        <section className="space-y-3">
          <h2 className="font-headline text-lg font-bold text-[#041632] border-b border-[#c5c6ce] pb-2">
            3. Legal Bases (GDPR Art. 6)
          </h2>
          <div className="space-y-2 font-body text-xs">
            <p>
              <strong>Performance of Contract &amp; Pre-contractual Steps (Art. 6(1)(b) GDPR):</strong> Processing quote submissions, calculating freight logistics, producing formal proposals, and executing wholesale packaging deliveries.
            </p>
            <p>
              <strong>Legitimate Business Interests (Art. 6(1)(f) GDPR):</strong> Platform security, rate limiting against automated abuse, server stability, and auditing price changes.
            </p>
            <p>
              <strong>Consent (Art. 6(1)(a) GDPR):</strong> Non-essential tracking cookies and optional analytics (opt-in only via our cookie consent banner).
            </p>
          </div>
        </section>

        {/* 4. Storage Locations & Retention Periods */}
        <section className="space-y-3">
          <h2 className="font-headline text-lg font-bold text-[#041632] border-b border-[#c5c6ce] pb-2">
            4. Storage Infrastructure &amp; Data Retention
          </h2>
          <p className="font-body text-xs">
            All database records and file uploads are hosted strictly within the European Union (AWS eu-central-1 Frankfurt / EU Cloud Infrastructure).
          </p>
          <ul className="list-disc pl-5 space-y-1.5 font-body text-xs">
            <li><strong>Unreferenced File Uploads:</strong> Automatically purged after 14 days via automated background cleanup cron jobs.</li>
            <li><strong>Commercial Proposals &amp; Quotes:</strong> Retained for statutory commercial/tax periods (up to 7–10 years under applicable European commercial accounting laws).</li>
            <li><strong>Customer Sessions:</strong> Encrypted JWT tokens stored in secure, HttpOnly session cookies with 24-hour expiration.</li>
          </ul>
        </section>

        {/* 5. Data Subject Rights */}
        <section className="space-y-3">
          <h2 className="font-headline text-lg font-bold text-[#041632] border-b border-[#c5c6ce] pb-2">
            5. Your Rights Under the GDPR
          </h2>
          <p className="font-body text-xs">
            As a data subject, you retain the following statutory rights under European law:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-[#f8f9ff] rounded border border-[#c5c6ce]/60">
              <span className="font-bold text-[#041632] block">Right of Access (Art. 15)</span>
              <span className="text-[11px]">Request confirmation and copy of personal data processed.</span>
            </div>
            <div className="p-3 bg-[#f8f9ff] rounded border border-[#c5c6ce]/60">
              <span className="font-bold text-[#041632] block">Right to Rectification (Art. 16)</span>
              <span className="text-[11px]">Request immediate correction of inaccurate business records.</span>
            </div>
            <div className="p-3 bg-[#f8f9ff] rounded border border-[#c5c6ce]/60">
              <span className="font-bold text-[#041632] block">Right to Erasure (Art. 17)</span>
              <span className="text-[11px]">Request deletion where data is no longer necessary for contract fulfillment.</span>
            </div>
            <div className="p-3 bg-[#f8f9ff] rounded border border-[#c5c6ce]/60">
              <span className="font-bold text-[#041632] block">Right to Restriction &amp; Objection (Art. 18 &amp; 21)</span>
              <span className="text-[11px]">Restrict processing or object to processing based on legitimate interests.</span>
            </div>
          </div>
          <p className="font-body text-xs pt-2">
            To exercise any of these rights, contact our Data Protection desk at{' '}
            <a href={`mailto:${legalConfig.company.contactEmail}`} className="text-blue-700 underline font-bold">
              {legalConfig.company.contactEmail}
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
}
