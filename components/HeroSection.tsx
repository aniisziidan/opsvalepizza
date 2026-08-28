'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/context';

type CalculatorApiResult =
  | {
      available: true;
      priceRange: { minEur: number; maxEur: number };
      savings: {
        perBoxMin: number;
        perBoxMax: number;
        pctMin: number;
        pctMax: number;
        yearlyMin: number;
        yearlyMax: number;
        annualVolume: number;
      };
    }
  | {
      available: false;
      reason: 'unsupported_combination' | 'no_estimate';
    };

const COUNTRIES = [
  { code: 'IT', name: 'Italy (IT)' },
  { code: 'DE', name: 'Germany (DE)' },
  { code: 'FR', name: 'France (FR)' },
  { code: 'ES', name: 'Spain (ES)' },
  { code: 'NL', name: 'Netherlands (NL)' },
  { code: 'BE', name: 'Belgium (BE)' },
  { code: 'PL', name: 'Poland (PL)' },
  { code: 'AT', name: 'Austria (AT)' },
  { code: 'UK', name: 'United Kingdom (UK)' },
];

export const HeroSection: React.FC = () => {
  const { t, locale } = useTranslation();
  const router = useRouter();

  // Calculator State
  const [country, setCountry] = useState<string>('IT');
  const [boxSize, setBoxSize] = useState<'28cm' | '32cm' | '40cm'>('32cm');
  const [monthlyVolume, setMonthlyVolume] = useState<number>(30000);
  const [currentPrice, setCurrentPrice] = useState<number>(0.35);

  const [result, setResult] = useState<CalculatorApiResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCalculated, setIsCalculated] = useState<boolean>(false);
  const requestIdRef = useRef(0);

  const formatCurrency = (val: number) => {
    return val.toLocaleString('en-EU', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const fetchEstimate = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    setIsLoading(true);

    try {
      const res = await fetch('/api/calculator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          countryCode: country,
          boxSize,
          material: 'kraft',
          print: 'custom',
          boxesPerOrder: Math.min(monthlyVolume, 10000),
          monthlyVolume,
          currentPriceEur: currentPrice,
        }),
      });

      if (reqId !== requestIdRef.current) return;
      if (res.ok) {
        const data = (await res.json()) as CalculatorApiResult;
        if (reqId === requestIdRef.current) {
          setResult(data);
          setIsCalculated(true);
        }
      }
    } catch {
      // Graceful fallback
    } finally {
      if (reqId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [country, boxSize, monthlyVolume, currentPrice]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchEstimate();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchEstimate]);

  const handleRequestQuote = () => {
    const yearlySavings = result && result.available ? Math.round(result.savings.yearlyMax) : 0;
    const params = new URLSearchParams({
      country,
      boxSize,
      material: 'kraft',
      print: 'custom',
      monthlyVolume: String(monthlyVolume),
      boxesPerOrder: String(Math.min(monthlyVolume, 10000)),
      currentPrice: String(currentPrice),
      savings: String(yearlySavings),
    });
    router.push(`/${locale}/quote?${params.toString()}`);
  };

  return (
    <section className="w-full border-b border-[#c5c6ce] relative overflow-hidden bg-[#041632] text-white">
      <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 min-h-[640px] lg:min-h-[720px]">
        {/* Left Side: Headline & Text with Warehouse Photo Background */}
        <div className="lg:col-span-7 relative p-6 sm:p-10 md:p-14 lg:p-16 flex flex-col justify-center overflow-hidden lg:border-r border-white/10">
          {/* Background Image */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            <Image
              src="/images/hero-warehouse.jpg"
              alt="Industrial pizza box storage warehouse"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="object-cover object-center filter brightness-50 contrast-125"
            />
            {/* Rich Gradient & Dark Overlay for optimal text legibility */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#041632]/95 via-[#041632]/90 to-[#041632]/80" />
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`,
                backgroundSize: '24px 24px',
              }}
            />
          </div>

          {/* Foreground Text Content */}
          <div className="relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-2 mb-6 bg-white/10 backdrop-blur-md px-3.5 py-1.5 border border-white/20 rounded-full w-fit">
              <span className="w-2.5 h-2.5 rounded-full bg-[#e77114] animate-pulse"></span>
              <span className="font-mono-data text-xs text-[#ffdeac] uppercase tracking-wider font-semibold">
                {t('hero.badge')}
              </span>
            </div>

            <h1 className="font-headline text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6 leading-tight drop-shadow-sm">
              {t('hero.headline')}{' '}
              <span className="text-[#e77114]">{t('hero.headlineHighlight')}</span>
            </h1>

            <p className="font-body text-base sm:text-lg text-[#dce9ff] mb-8 leading-relaxed">
              {t('hero.subheadline')}
            </p>

            {/* Value Pillars Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 pt-4 border-t border-white/15">
              <div className="flex items-center gap-2.5 bg-white/5 backdrop-blur-sm px-3 py-2 border border-white/10 rounded-sm">
                <span className="material-symbols-outlined text-[#e77114] text-xl">hub</span>
                <div>
                  <p className="font-headline text-xs font-bold text-white">14 European Hubs</p>
                  <p className="text-[10px] text-[#cbd5e1] font-mono-data">Intermodal Corridors</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 bg-white/5 backdrop-blur-sm px-3 py-2 border border-white/10 rounded-sm">
                <span className="material-symbols-outlined text-[#e77114] text-xl">verified</span>
                <div>
                  <p className="font-headline text-xs font-bold text-white">100% Food-Grade</p>
                  <p className="text-[10px] text-[#cbd5e1] font-mono-data">EU 1935/2004 Audit</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 bg-white/5 backdrop-blur-sm px-3 py-2 border border-white/10 rounded-sm">
                <span className="material-symbols-outlined text-[#e77114] text-xl">speed</span>
                <div>
                  <p className="font-headline text-xs font-bold text-white">24h SLA Quote</p>
                  <p className="text-[10px] text-[#cbd5e1] font-mono-data">Direct Mill Pricing</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                href={`/${locale}/products`}
                className="border border-white/40 text-white bg-white/5 backdrop-blur-sm px-6 py-3.5 font-mono-data text-xs uppercase tracking-widest hover:bg-white hover:text-[#041632] transition-colors cursor-pointer text-center font-bold rounded-sm"
              >
                {t('common.viewCatalogCta')}
              </Link>
              <Link
                href={`/${locale}/quote`}
                className="bg-[#e77114] text-white px-6 py-3.5 font-mono-data text-xs uppercase tracking-widest hover:bg-[#c25e10] transition-colors shadow-lg cursor-pointer text-center font-bold rounded-sm flex items-center gap-2"
              >
                {t('hero.secondaryCta')}
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Right Side: Interactive Hero Savings Calculator */}
        <div className="lg:col-span-5 bg-[#0b1c30] p-6 sm:p-8 lg:p-10 flex flex-col justify-center relative z-10">
          <div className="bg-[#112239] border border-[#2c3e5a] p-6 sm:p-7 rounded-xl shadow-2xl relative">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-sm bg-[#e77114] flex items-center justify-center text-white">
                  <span className="material-symbols-outlined text-lg">calculate</span>
                </div>
                <div>
                  <h2 className="font-headline text-base font-bold text-white">
                    {t('calculator.title')}
                  </h2>
                  <p className="text-[11px] text-[#8393b5] font-mono-data">Direct Factory Landed Comparison</p>
                </div>
              </div>
              {isLoading && (
                <span className="material-symbols-outlined text-sm text-[#e77114] animate-spin">
                  sync
                </span>
              )}
            </div>

            {/* Quick Calculator Inputs */}
            <div className="space-y-4">
              {/* Row 1: Country & Box Size */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-mono-data text-[11px] text-[#8393b5] uppercase block mb-1 font-semibold">
                    {t('calculator.destinationCountry')}
                  </label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full bg-[#041632] border border-[#2c3e5a] text-white px-3 py-2 text-xs font-mono-data rounded-sm outline-none focus:border-[#e77114] cursor-pointer"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-mono-data text-[11px] text-[#8393b5] uppercase block mb-1 font-semibold">
                    {t('calculator.boxSize')}
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {(['28cm', '32cm', '40cm'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setBoxSize(s)}
                        className={`py-1.5 text-xs font-mono-data font-bold rounded-sm transition-colors cursor-pointer border ${
                          boxSize === s
                            ? 'bg-[#e77114] border-[#e77114] text-white'
                            : 'bg-[#041632] border-[#2c3e5a] text-[#8393b5] hover:text-white'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 2: Monthly Volume */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-mono-data text-[11px] text-[#8393b5] uppercase font-semibold">
                    {t('calculator.monthlyVolumeLabel')}
                  </label>
                  <span className="font-mono-data text-xs font-bold text-[#ffdeac]">
                    {monthlyVolume.toLocaleString('en-EU')} boxes/mo
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[10000, 30000, 50000, 100000].map((vol) => (
                    <button
                      key={vol}
                      type="button"
                      onClick={() => setMonthlyVolume(vol)}
                      className={`py-1 text-xs font-mono-data rounded-sm transition-colors cursor-pointer border ${
                        monthlyVolume === vol
                          ? 'bg-white/20 border-white/40 text-white font-bold'
                          : 'bg-[#041632] border-[#2c3e5a] text-[#8393b5] hover:text-white'
                      }`}
                    >
                      {(vol / 1000).toFixed(0)}k
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 3: Current Unit Price */}
              <div>
                <label className="font-mono-data text-[11px] text-[#8393b5] uppercase block mb-1 font-semibold">
                  {t('calculator.currentPriceLabel')}
                </label>
                <div className="relative flex items-center bg-[#041632] border border-[#2c3e5a] rounded-sm focus-within:border-[#e77114]">
                  <span className="pl-3 font-mono-data text-xs text-[#8393b5]">€</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.10"
                    max="1.50"
                    value={currentPrice}
                    onChange={(e) => setCurrentPrice(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                    className="w-full bg-transparent px-2 py-2 text-xs font-mono-data text-white outline-none"
                    placeholder="0.35"
                  />
                  <span className="pr-3 font-mono-data text-[11px] text-[#8393b5]">/ unit</span>
                </div>
              </div>
            </div>

            {/* Results Display */}
            <div className="mt-5 p-4 rounded-lg bg-[#041632] border border-[#2c3e5a] space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="font-mono-data text-[11px] uppercase tracking-wider text-[#8393b5]">
                  {t('calculator.annualSavingsTitle')}
                </span>
                {result?.available && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono-data px-2 py-0.5 rounded-full font-bold">
                    {result.savings.pctMin.toFixed(0)}%–{result.savings.pctMax.toFixed(0)}% Savings
                  </span>
                )}
              </div>

              <div className="font-headline text-2xl sm:text-3xl font-bold text-[#ffdeac] flex items-baseline gap-1">
                <span>€</span>
                <span>
                  {result && result.available
                    ? `${formatCurrency(result.savings.yearlyMin)} – ${formatCurrency(result.savings.yearlyMax)}`
                    : '8,400 – 14,200'}
                </span>
                <span className="text-xs text-[#8393b5] font-normal">/ yr</span>
              </div>

              <div className="flex items-center justify-between text-xs font-mono-data text-[#8393b5] pt-2 border-t border-white/10">
                <span>OpsVale Est. Price:</span>
                <span className="text-white font-bold">
                  {result && result.available
                    ? `€${result.priceRange.minEur.toFixed(2)} – €${result.priceRange.maxEur.toFixed(2)} / box`
                    : '€0.26 – €0.29 / box'}
                </span>
              </div>
            </div>

            {/* Action CTA */}
            <div className="mt-5 space-y-2">
              <button
                type="button"
                onClick={handleRequestQuote}
                className="w-full bg-[#e77114] text-white py-3.5 px-4 rounded-sm font-mono-data text-xs uppercase tracking-widest hover:bg-[#c25e10] transition-colors shadow-lg flex items-center justify-center gap-2 font-bold cursor-pointer"
              >
                <span>{t('hero.secondaryCta')}</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>

              <div className="text-center">
                <Link
                  href={`/${locale}/calculator`}
                  className="text-[11px] text-[#8393b5] hover:text-white font-mono-data underline decoration-dotted transition-colors"
                >
                  Open Full Precision Calculator →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
