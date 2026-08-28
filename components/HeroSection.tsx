'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
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
    <section className="w-full border-b border-[#c5c6ce] relative overflow-hidden bg-[#041632] text-white flex items-center min-h-[640px] lg:min-h-[720px]">
      {/* Full-bleed background video extending edge-to-edge */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none filter brightness-80 contrast-110"
        poster="/images/hero-warehouse.jpg"
      >
        <source src="/videos/hero-bg.mp4" type="video/mp4" />
      </video>

      {/* Global subtle texture */}
      <div
        className="absolute inset-0 z-[1] opacity-10 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Centered Maximum-Width Hero Content Wrapper */}
      <div className="relative z-10 w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-10 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-12 items-center">
          {/* Left Side: 70% Transparent (30% overlay opacity) */}
          <div className="lg:col-span-7 relative p-6 sm:p-8 lg:p-10 flex flex-col justify-center bg-[#041632]/30 backdrop-blur-md rounded-2xl border border-white/15 shadow-2xl">
            <div className="relative z-10 max-w-xl">
              <div className="inline-flex items-center gap-2 mb-5 bg-black/40 backdrop-blur-md px-3.5 py-1.5 border border-white/20 rounded-full w-fit">
                <span className="w-2.5 h-2.5 rounded-full bg-[#e77114] animate-pulse"></span>
                <span className="font-mono-data text-xs text-[#ffdeac] uppercase tracking-wider font-semibold">
                  {t('hero.badge')}
                </span>
              </div>

              <h1 className="font-headline text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-5 leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
                {t('hero.headline')}{' '}
                <span className="text-[#e77114] drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">{t('hero.headlineHighlight')}</span>
              </h1>

              <p className="font-body text-base sm:text-lg text-white mb-7 leading-relaxed drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                {t('hero.subheadline')}
              </p>

              {/* Value Pillars Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-7 pt-4 border-t border-white/20">
                <div className="flex items-center gap-2.5 bg-black/40 backdrop-blur-md px-3 py-2 border border-white/15 rounded-sm">
                  <span className="material-symbols-outlined text-[#e77114] text-xl">hub</span>
                  <div>
                    <p className="font-headline text-xs font-bold text-white">14 European Hubs</p>
                    <p className="text-[10px] text-[#cbd5e1] font-mono-data">Intermodal Corridors</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 bg-black/40 backdrop-blur-md px-3 py-2 border border-white/15 rounded-sm">
                  <span className="material-symbols-outlined text-[#e77114] text-xl">verified</span>
                  <div>
                    <p className="font-headline text-xs font-bold text-white">100% Food-Grade</p>
                    <p className="text-[10px] text-[#cbd5e1] font-mono-data">EU 1935/2004 Audit</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 bg-black/40 backdrop-blur-md px-3 py-2 border border-white/15 rounded-sm">
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
                  className="border border-white/50 text-white bg-black/40 backdrop-blur-md px-6 py-3.5 font-mono-data text-xs uppercase tracking-widest hover:bg-white hover:text-[#041632] transition-colors cursor-pointer text-center font-bold rounded-sm shadow-md"
                >
                  {t('common.viewCatalogCta')}
                </Link>
                <Link
                  href={`/${locale}/quote`}
                  className="bg-[#e77114] text-white px-6 py-3.5 font-mono-data text-xs uppercase tracking-widest hover:bg-[#c25e10] transition-colors shadow-xl cursor-pointer text-center font-bold rounded-sm flex items-center gap-2"
                >
                  {t('hero.secondaryCta')}
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Right Side: 40% Transparent (60% background overlay) */}
          <div className="lg:col-span-5 flex flex-col justify-center relative z-10 w-full max-w-[500px] lg:max-w-none mx-auto">
            <div className="bg-[#112239]/60 backdrop-blur-md border border-white/20 p-6 sm:p-7 rounded-2xl shadow-2xl relative">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-white/15">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-sm bg-[#e77114] flex items-center justify-center text-white shadow-md">
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
                    <label className="font-mono-data text-[11px] text-[#cbd5e1] uppercase block mb-1 font-semibold">
                      {t('calculator.destinationCountry')}
                    </label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full bg-[#041632]/80 border border-white/20 text-white px-3 py-2 text-xs font-mono-data rounded-sm outline-none focus:border-[#e77114] cursor-pointer backdrop-blur-sm"
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code} className="bg-[#041632] text-white">
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-mono-data text-[11px] text-[#cbd5e1] uppercase block mb-1 font-semibold">
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
                              ? 'bg-[#e77114] border-[#e77114] text-white shadow-sm'
                              : 'bg-[#041632]/80 border-white/20 text-[#cbd5e1] hover:text-white backdrop-blur-sm'
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
                    <label className="font-mono-data text-[11px] text-[#cbd5e1] uppercase font-semibold">
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
                            ? 'bg-white/25 border-white/50 text-white font-bold'
                            : 'bg-[#041632]/80 border-white/20 text-[#cbd5e1] hover:text-white backdrop-blur-sm'
                        }`}
                      >
                        {(vol / 1000).toFixed(0)}k
                      </button>
                    ))}
                  </div>
                </div>

                {/* Row 3: Current Unit Price */}
                <div>
                  <label className="font-mono-data text-[11px] text-[#cbd5e1] uppercase block mb-1 font-semibold">
                    {t('calculator.currentPriceLabel')}
                  </label>
                  <div className="relative flex items-center bg-[#041632]/80 border border-white/20 rounded-sm focus-within:border-[#e77114] backdrop-blur-sm">
                    <span className="pl-3 font-mono-data text-xs text-[#cbd5e1]">€</span>
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
                    <span className="pr-3 font-mono-data text-[11px] text-[#cbd5e1]">/ unit</span>
                  </div>
                </div>
              </div>

              {/* Results Display */}
              <div className="mt-5 p-4 rounded-lg bg-[#041632]/70 border border-white/15 space-y-3 backdrop-blur-sm">
                <div className="flex items-baseline justify-between">
                  <span className="font-mono-data text-[11px] uppercase tracking-wider text-[#cbd5e1]">
                    {t('calculator.annualSavingsTitle')}
                  </span>
                  {result?.available && (
                    <span className="text-[10px] bg-emerald-500/25 text-emerald-300 font-mono-data px-2 py-0.5 rounded-full font-bold border border-emerald-400/30">
                      {result.savings.pctMin.toFixed(0)}%–{result.savings.pctMax.toFixed(0)}% Savings
                    </span>
                  )}
                </div>

                <div className="font-headline text-2xl sm:text-3xl font-bold text-[#ffdeac] flex items-baseline gap-1 drop-shadow-sm">
                  <span>€</span>
                  <span>
                    {result && result.available
                      ? `${formatCurrency(result.savings.yearlyMin)} – ${formatCurrency(result.savings.yearlyMax)}`
                      : '8,400 – 14,200'}
                  </span>
                  <span className="text-xs text-[#cbd5e1] font-normal">/ yr</span>
                </div>

                <div className="flex items-center justify-between text-xs font-mono-data text-[#cbd5e1] pt-2 border-t border-white/10">
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
                    className="text-[11px] text-[#cbd5e1] hover:text-white font-mono-data underline decoration-dotted transition-colors"
                  >
                    Open Full Precision Calculator →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
