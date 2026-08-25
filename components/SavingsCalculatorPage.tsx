'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CalculatorState } from '@/lib/types';

interface SavingsCalculatorPageProps {
  initialVolume?: number;
}

// Local type mirroring the /api/calculator response contract.
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

// Countries the API/pricing data supports as valid 2-letter codes. The UI
// already stores ISO-style codes; 'OTHER' is a sentinel with no code.
const SUPPORTED_COUNTRY_CODES = ['DE', 'FR', 'IT', 'ES', 'NL', 'UK', 'BE', 'PL', 'AT'];

export const SavingsCalculatorPage: React.FC<SavingsCalculatorPageProps> = ({
  initialVolume = 20000,
}) => {
  const router = useRouter();
  const [country, setCountry] = useState<string>('IT');
  const [boxSize, setBoxSize] = useState<'28cm' | '32cm' | '40cm'>('32cm');
  const [material, setMaterial] = useState<'kraft' | 'white'>('kraft');
  const [print, setPrint] = useState<'plain' | 'custom'>('custom');
  const [boxesPerOrder, setBoxesPerOrder] = useState<number>(5000);
  const [monthlyVolume, setMonthlyVolume] = useState<number>(initialVolume);
  const [currentPrice, setCurrentPrice] = useState<number>(0.35);

  const [hasCalculated, setHasCalculated] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [detailsOpen, setDetailsOpen] = useState<boolean>(true);

  const [result, setResult] = useState<CalculatorApiResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);

  // Track the latest request so out-of-order responses (from rapid input
  // changes) never overwrite fresher results.
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (initialVolume && initialVolume !== monthlyVolume) {
      setMonthlyVolume(initialVolume);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialVolume]);

  const formatCurrency = (val: number) => {
    return val.toLocaleString('en-EU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const currentCalcState: CalculatorState = {
    country,
    boxSize,
    material,
    print,
    boxesPerOrder,
    monthlyVolume,
    currentPrice,
  };

  const fetchEstimate = useCallback(async () => {
    const reqId = ++requestIdRef.current;

    // 'OTHER' (or any non 2-letter sentinel) cannot be priced — surface the
    // missing-data path without hitting the API with an invalid code.
    if (!SUPPORTED_COUNTRY_CODES.includes(country)) {
      setError(false);
      setIsLoading(false);
      setResult({ available: false, reason: 'unsupported_combination' });
      return;
    }

    setIsLoading(true);
    setError(false);
    setIsAnimating(true);

    try {
      const res = await fetch('/api/calculator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          countryCode: country,
          boxSize,
          material,
          print,
          boxesPerOrder,
          monthlyVolume,
          currentPrice,
        }),
      });

      if (reqId !== requestIdRef.current) return; // stale response, ignore

      if (!res.ok) {
        setResult(null);
        setError(true);
        return;
      }

      const data = (await res.json()) as CalculatorApiResult;
      if (reqId !== requestIdRef.current) return;
      setResult(data);
    } catch {
      if (reqId !== requestIdRef.current) return;
      setResult(null);
      setError(true);
    } finally {
      if (reqId === requestIdRef.current) {
        setIsLoading(false);
        setTimeout(() => {
          if (reqId === requestIdRef.current) setIsAnimating(false);
        }, 400);
      }
    }
  }, [country, boxSize, material, print, boxesPerOrder, monthlyVolume, currentPrice]);

  const handleCalculate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setHasCalculated(true);
    void fetchEstimate();
  };

  // Auto-recalc after the first calculation, debounced ~400ms.
  useEffect(() => {
    if (!hasCalculated) return;
    const t = setTimeout(() => {
      void fetchEstimate();
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, boxSize, material, print, boxesPerOrder, monthlyVolume, currentPrice, hasCalculated]);

  const available = result?.available === true;
  const unavailable = result?.available === false;

  const yearlyForQuote =
    result && result.available ? Math.round(result.savings.yearlyMax) : 0;

  const handleRequestQuote = () => {
    const params = new URLSearchParams({
      country: currentCalcState.country,
      boxSize: currentCalcState.boxSize,
      material: currentCalcState.material,
      print: currentCalcState.print,
      monthlyVolume: String(currentCalcState.monthlyVolume),
      boxesPerOrder: String(currentCalcState.boxesPerOrder),
      currentPrice: String(currentCalcState.currentPrice),
      savings: String(yearlyForQuote),
    });
    router.push(`/quote?${params.toString()}`);
  };

  return (
    <div className="w-full relative py-10 sm:py-16 overflow-hidden">
      {/* Subtle grid background */}
      <div className="absolute inset-0 z-0 industrial-grid-subtle pointer-events-none opacity-40"></div>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 md:px-16 relative z-10">
        {/* Header / Intro */}
        <div className="mb-10 border-l-4 border-[#e77114] pl-6 py-2">
          <h1 className="font-headline text-3xl sm:text-4xl md:text-5xl font-bold text-[#041632] mb-4">
            Calculate Your Packaging Savings
          </h1>
          <p className="font-body text-base text-[#44474d] max-w-2xl leading-relaxed">
            Enter your current procurement metrics below. Our industrial-grade calculator analyzes your volume against our direct-from-factory pricing to reveal your exact cost reduction potential.
          </p>
        </div>

        {/* Calculator Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Calculator Form (Left Column) */}
          <div className="lg:col-span-7 bg-white border border-[#c5c6ce] p-6 sm:p-8 rounded-xl shadow-[0px_4px_20px_rgba(27,43,72,0.04)]">
            <form onSubmit={handleCalculate} className="space-y-8 flex flex-col h-full">
              {/* 01. Country */}
              <div className="space-y-2">
                <label className="font-mono-data text-xs text-[#0b1c30] block uppercase tracking-wider font-semibold" htmlFor="country-select">
                  01. Delivery Country
                </label>
                <div className="relative">
                  <select
                    id="country-select"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full bg-[#eff4ff] border border-[#c5c6ce] rounded-sm px-4 py-3.5 font-body text-base text-[#0b1c30] appearance-none focus:outline-none focus:ring-2 focus:ring-[#041632] focus:border-transparent transition-shadow h-12 cursor-pointer"
                  >
                    <option value="IT">Italy (IT)</option>
                    <option value="FR">France (FR)</option>
                    <option value="DE">Germany (DE)</option>
                    <option value="ES">Spain (ES)</option>
                    <option value="UK">United Kingdom (UK)</option>
                    <option value="NL">Netherlands (NL)</option>
                    <option value="BE">Belgium (BE)</option>
                    <option value="PL">Poland (PL)</option>
                    <option value="AT">Austria (AT)</option>
                    <option value="OTHER">Other European Country</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-[#44474d] pointer-events-none">
                    expand_more
                  </span>
                </div>
              </div>

              {/* 02. Box Size */}
              <div className="space-y-2">
                <label className="font-mono-data text-xs text-[#0b1c30] block uppercase tracking-wider font-semibold">
                  02. Primary Box Size
                </label>
                <div className="grid grid-cols-3 gap-3 sm:gap-4">
                  {/* 28cm */}
                  <button
                    type="button"
                    onClick={() => setBoxSize('28cm')}
                    className={`border rounded-lg p-4 text-center transition-all flex flex-col justify-center items-center gap-2 cursor-pointer ${
                      boxSize === '28cm'
                        ? 'border-[#041632] bg-[#dce9ff] text-[#041632] font-bold ring-1 ring-[#041632]'
                        : 'border-[#c5c6ce] hover:bg-[#eff4ff] text-[#44474d]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-2xl">crop_square</span>
                    <span className="font-body text-xs sm:text-sm font-semibold">28cm / 11"</span>
                  </button>

                  {/* 32cm */}
                  <button
                    type="button"
                    onClick={() => setBoxSize('32cm')}
                    className={`relative border rounded-lg p-4 text-center transition-all flex flex-col justify-center items-center gap-2 cursor-pointer ${
                      boxSize === '32cm'
                        ? 'border-[#041632] bg-[#dce9ff] text-[#041632] font-bold ring-1 ring-[#041632]'
                        : 'border-[#c5c6ce] hover:bg-[#eff4ff] text-[#44474d]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-3xl">crop_square</span>
                    <span className="font-body text-xs sm:text-sm font-semibold">32cm / 13"</span>
                    <span className="text-[10px] bg-[#e77114] text-white px-2 py-0.5 rounded-full absolute -top-2.5 font-mono-data font-bold">
                      Popular
                    </span>
                  </button>

                  {/* 40cm */}
                  <button
                    type="button"
                    onClick={() => setBoxSize('40cm')}
                    className={`border rounded-lg p-4 text-center transition-all flex flex-col justify-center items-center gap-2 cursor-pointer ${
                      boxSize === '40cm'
                        ? 'border-[#041632] bg-[#dce9ff] text-[#041632] font-bold ring-1 ring-[#041632]'
                        : 'border-[#c5c6ce] hover:bg-[#eff4ff] text-[#44474d]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-4xl">crop_square</span>
                    <span className="font-body text-xs sm:text-sm font-semibold">40cm / 16"</span>
                  </button>
                </div>
              </div>

              {/* 03. Material & Print */}
              <div className="space-y-2">
                <label className="font-mono-data text-xs text-[#0b1c30] block uppercase tracking-wider font-semibold">
                  03. Material &amp; Print
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Material Color */}
                  <div className="space-y-3 p-4 border border-[#c5c6ce] rounded-lg bg-[#f8f9ff]">
                    <span className="font-body text-xs font-semibold text-[#44474d] block mb-1">
                      Material Color
                    </span>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="radio"
                          name="material"
                          checked={material === 'kraft'}
                          onChange={() => setMaterial('kraft')}
                          className="w-4 h-4 text-[#041632] focus:ring-[#041632] border-[#c5c6ce]"
                        />
                        <span className="w-5 h-5 rounded-full bg-[#d2b48c] border border-[#a08a6b] shadow-inner group-hover:scale-110 transition-transform"></span>
                        <span className="font-body text-sm font-medium">Kraft Brown</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="radio"
                          name="material"
                          checked={material === 'white'}
                          onChange={() => setMaterial('white')}
                          className="w-4 h-4 text-[#041632] focus:ring-[#041632] border-[#c5c6ce]"
                        />
                        <span className="w-5 h-5 rounded-full bg-white border border-[#c5c6ce] shadow-inner group-hover:scale-110 transition-transform"></span>
                        <span className="font-body text-sm font-medium">White</span>
                      </label>
                    </div>
                  </div>

                  {/* Print Type */}
                  <div className="space-y-3 p-4 border border-[#c5c6ce] rounded-lg bg-[#f8f9ff]">
                    <span className="font-body text-xs font-semibold text-[#44474d] block mb-1">
                      Print Type
                    </span>
                    <div className="flex flex-col gap-2.5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="print"
                          checked={print === 'plain'}
                          onChange={() => setPrint('plain')}
                          className="w-4 h-4 text-[#041632] focus:ring-[#041632] border-[#c5c6ce]"
                        />
                        <span className="font-body text-sm">Plain (No Print)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="print"
                          checked={print === 'custom'}
                          onChange={() => setPrint('custom')}
                          className="w-4 h-4 text-[#041632] focus:ring-[#041632] border-[#c5c6ce]"
                        />
                        <span className="font-body text-sm font-medium">Custom Printed (1-3 colors)</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* 04 & 05. Volumes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="font-mono-data text-xs text-[#0b1c30] block uppercase tracking-wider font-semibold" htmlFor="boxes_per_order">
                    04. Boxes Per Order
                  </label>
                  <div className="relative flex items-center border border-[#c5c6ce] rounded-sm bg-[#eff4ff] focus-within:ring-2 focus-within:ring-[#041632] focus-within:border-transparent transition-shadow">
                    <span className="material-symbols-outlined text-[#44474d] pl-4">inventory_2</span>
                    <input
                      id="boxes_per_order"
                      type="number"
                      min="1000"
                      step="500"
                      value={boxesPerOrder}
                      onChange={(e) => setBoxesPerOrder(Math.max(1000, parseInt(e.target.value) || 1000))}
                      placeholder="e.g. 5000"
                      className="w-full bg-transparent border-none px-4 py-3.5 font-body text-base text-[#0b1c30] focus:ring-0 h-12 outline-none"
                    />
                  </div>
                  <p className="text-xs text-[#44474d] mt-1 font-mono-data">Min. order quantity usually 1,000.</p>
                </div>

                <div className="space-y-2">
                  <label className="font-mono-data text-xs text-[#0b1c30] block uppercase tracking-wider font-semibold" htmlFor="boxes_per_month">
                    05. Monthly Volume
                  </label>
                  <div className="relative flex items-center border border-[#c5c6ce] rounded-sm bg-[#eff4ff] focus-within:ring-2 focus-within:ring-[#041632] focus-within:border-transparent transition-shadow">
                    <span className="material-symbols-outlined text-[#44474d] pl-4">calendar_month</span>
                    <input
                      id="boxes_per_month"
                      type="number"
                      min="1000"
                      step="1000"
                      value={monthlyVolume}
                      onChange={(e) => setMonthlyVolume(Math.max(1000, parseInt(e.target.value) || 1000))}
                      placeholder="e.g. 20000"
                      className="w-full bg-transparent border-none px-4 py-3.5 font-body text-base text-[#0b1c30] focus:ring-0 h-12 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 06. Current Price */}
              <div className="space-y-2">
                <label className="font-mono-data text-xs text-[#0b1c30] block uppercase tracking-wider font-semibold" htmlFor="current_price">
                  06. Current Price Per Box (€)
                </label>
                <div className="relative flex items-center border border-[#c5c6ce] rounded-sm bg-[#eff4ff] focus-within:ring-2 focus-within:ring-[#041632] focus-within:border-transparent transition-shadow max-w-xs">
                  <span className="pl-4 font-mono-data text-[#44474d] text-lg font-bold">€</span>
                  <input
                    id="current_price"
                    type="number"
                    min="0.05"
                    step="0.01"
                    value={currentPrice}
                    onChange={(e) => setCurrentPrice(Math.max(0.05, parseFloat(e.target.value) || 0.05))}
                    placeholder="0.35"
                    className="w-full bg-transparent border-none px-4 py-3 font-headline text-2xl font-bold text-[#0b1c30] focus:ring-0 h-14 outline-none"
                  />
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-6 mt-auto border-t border-[#c5c6ce]/50">
                <button
                  type="submit"
                  className="w-full bg-[#e77114] text-white py-4 px-8 rounded-lg font-headline text-lg font-bold hover:bg-[#c25e10] transition-all flex items-center justify-center gap-3 shadow-[0px_4px_14px_rgba(231,113,20,0.3)] hover:shadow-[0px_6px_20px_rgba(231,113,20,0.4)] cursor-pointer"
                >
                  <span className="material-symbols-outlined">analytics</span>
                  Calculate My Potential Savings
                </button>
              </div>
            </form>
          </div>

          {/* Results Section (Right Column) */}
          <div className="lg:col-span-5 flex flex-col h-full">
            <div className="bg-[#041632] text-white p-6 sm:p-8 rounded-xl shadow-xl flex-grow flex flex-col relative overflow-hidden transition-all duration-300">
              {/* Background structural lines */}
              <div className="absolute inset-0 z-0 industrial-grid-subtle opacity-10 pointer-events-none"></div>

              <div className="relative z-10 flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6 sm:mb-8 border-b border-white/20 pb-4">
                  <span className="material-symbols-outlined text-3xl text-[#ffdeac]">monitoring</span>
                  <h2 className="font-headline text-xl sm:text-2xl font-semibold text-[#ffdeac]">
                    Savings Analysis
                  </h2>
                  {isLoading && (
                    <span
                      className="ml-auto material-symbols-outlined text-xl text-[#b7c7eb] animate-spin"
                      aria-label="Calculating"
                    >
                      progress_activity
                    </span>
                  )}
                </div>

                {/* Error / retry state */}
                {error ? (
                  <div className="flex-grow flex flex-col items-center justify-center text-center py-8 gap-4">
                    <span className="material-symbols-outlined text-4xl text-[#ffdeac]">error</span>
                    <p className="font-body text-sm text-[#dce9ff] max-w-xs">
                      Something went wrong while calculating your estimate. Please try again.
                    </p>
                    <button
                      type="button"
                      onClick={() => void fetchEstimate()}
                      className="bg-white/10 hover:bg-white/20 border border-white/20 text-white py-2.5 px-6 rounded-lg font-mono-data text-xs uppercase tracking-widest transition-colors cursor-pointer flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-base">refresh</span>
                      Retry
                    </button>
                  </div>
                ) : unavailable ? (
                  /* Missing-data path (spec §10) */
                  <div className="flex-grow flex flex-col">
                    <div className="bg-[#213145]/70 border border-white/10 rounded-lg p-6 flex flex-col items-start gap-4">
                      <span className="material-symbols-outlined text-3xl text-[#ffdeac]">
                        request_quote
                      </span>
                      <p className="font-body text-base text-[#dce9ff] leading-relaxed">
                        We don&apos;t yet have an instant estimate for this exact requirement.
                        Request an exact quote and we&apos;ll review your requirements within 24
                        business hours.
                      </p>
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/20 space-y-4 mt-auto">
                      <button
                        type="button"
                        onClick={handleRequestQuote}
                        className="w-full bg-[#ffdeac] text-[#281900] py-3.5 px-6 rounded-lg font-mono-data text-xs uppercase tracking-widest hover:bg-[#fddba7] transition-colors shadow-md flex items-center justify-center gap-2 font-bold cursor-pointer"
                      >
                        Request an Exact Quote
                        <span className="material-symbols-outlined">arrow_forward</span>
                      </button>
                      <p className="text-[11px] text-[#cbdbf5]/70 text-center leading-tight">
                        Disclaimer: Estimated savings are based on information provided and standard OpsVale pricing tiers for similar volumes and specifications. Actual quotes may vary based on final logistics routing and precise raw material costs at time of order.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-6 flex-grow">
                      {/* Primary Savings Metric */}
                      <div className="bg-[#213145]/70 border border-white/10 rounded-lg p-6">
                        <span className="font-mono-data text-xs text-[#b7c7eb] uppercase tracking-widest block mb-2 font-semibold">
                          Estimated Yearly Savings ⭐
                        </span>
                        <div className={`font-headline text-3xl sm:text-4xl lg:text-5xl font-bold flex items-baseline gap-1 text-white ${
                          isAnimating ? 'scale-105 text-[#e77114]' : ''
                        } transition-all`}>
                          <span className="text-2xl sm:text-3xl text-[#ffdeac] font-normal">€</span>
                          <span>
                            {available
                              ? `${formatCurrency(result.savings.yearlyMin)} – ${formatCurrency(result.savings.yearlyMax)}`
                              : '--'}
                          </span>
                        </div>

                        <div className="mt-4 flex items-center gap-2 text-[#dce9ff] bg-white/10 px-3 py-1.5 rounded-full w-fit">
                          <span className="material-symbols-outlined text-sm text-[#e77114]">arrow_downward</span>
                          <span className="font-body text-xs sm:text-sm font-medium">
                            {available
                              ? `Cost reduction identified (${result.savings.pctMin.toFixed(1)}%–${result.savings.pctMax.toFixed(1)}%)`
                              : 'Cost reduction identified'}
                          </span>
                        </div>
                      </div>

                      {/* Per Box Breakdown */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="border border-[#c5c6ce]/30 rounded-lg p-4 bg-white/5">
                          <span className="font-mono-data text-[11px] text-[#cbdbf5] uppercase block mb-1 font-semibold">
                            Savings Per Box ⭐
                          </span>
                          <div className="font-headline text-xl sm:text-2xl text-[#fddba7] font-semibold">
                            {available ? (
                              <>
                                <span>€</span>
                                {formatCurrency(result.savings.perBoxMin)}
                                {' – '}
                                <span>€</span>
                                {formatCurrency(result.savings.perBoxMax)}
                              </>
                            ) : (
                              <>
                                <span>€</span>--
                              </>
                            )}
                          </div>
                        </div>

                        <div className="border border-[#c5c6ce]/30 rounded-lg p-4 bg-white/5">
                          <span className="font-mono-data text-[11px] text-[#cbdbf5] uppercase block mb-1 font-semibold">
                            OpsVale Price Range
                          </span>
                          <div className="font-headline text-xl sm:text-2xl text-white font-semibold">
                            {available ? (
                              <>
                                <span>€</span>
                                {result.priceRange.minEur.toFixed(2)} – €
                                {result.priceRange.maxEur.toFixed(2)}
                              </>
                            ) : (
                              <>
                                <span>€</span>-- - --
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expandable Details */}
                      <div className="border border-[#c5c6ce]/20 rounded-lg overflow-hidden bg-[#1b2b48]/50">
                        <button
                          type="button"
                          onClick={() => setDetailsOpen(!detailsOpen)}
                          className="w-full cursor-pointer p-4 font-mono-data text-xs text-[#f8f9ff] flex justify-between items-center hover:bg-[#1b2b48] transition-colors uppercase font-semibold"
                        >
                          Detailed Volume Breakdown
                          <span className={`material-symbols-outlined transition-transform duration-200 ${
                            detailsOpen ? 'rotate-180' : ''
                          }`}>
                            expand_more
                          </span>
                        </button>

                        {detailsOpen && (
                          <div className="p-4 border-t border-white/10 space-y-3 font-body text-sm text-[#dce9ff] bg-[#213145]/40">
                            <div className="flex justify-between py-1 border-b border-white/10">
                              <span>Current Price / Box:</span>
                              <span className="font-semibold text-white">€{formatCurrency(currentPrice)}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-white/10">
                              <span>OpsVale Price Range:</span>
                              <span className="font-semibold text-[#e3c290]">
                                {available
                                  ? `€${result.priceRange.minEur.toFixed(2)} – €${result.priceRange.maxEur.toFixed(2)}`
                                  : '--'}
                              </span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-white/10">
                              <span>Savings / Box:</span>
                              <span className="font-semibold text-white">
                                {available
                                  ? `€${formatCurrency(result.savings.perBoxMin)} – €${formatCurrency(result.savings.perBoxMax)}`
                                  : '--'}
                              </span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-white/10">
                              <span>Savings %:</span>
                              <span className="font-semibold text-white">
                                {available
                                  ? `${result.savings.pctMin.toFixed(1)}% – ${result.savings.pctMax.toFixed(1)}%`
                                  : '--'}
                              </span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-white/10">
                              <span>Monthly Volume:</span>
                              <span className="font-semibold text-white">{monthlyVolume.toLocaleString('en-EU')}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-white/10">
                              <span>Annual Volume:</span>
                              <span className="font-semibold text-white">
                                {available
                                  ? result.savings.annualVolume.toLocaleString('en-EU')
                                  : '--'}
                              </span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-white/10">
                              <span>Monthly Savings:</span>
                              <span className="font-semibold text-white">
                                {available
                                  ? `€${formatCurrency(result.savings.yearlyMin / 12)} – €${formatCurrency(result.savings.yearlyMax / 12)}`
                                  : '--'}
                              </span>
                            </div>
                            <div className="flex justify-between py-1">
                              <span>Yearly Savings:</span>
                              <span className="font-semibold text-[#e3c290]">
                                {available
                                  ? `€${formatCurrency(result.savings.yearlyMin)} – €${formatCurrency(result.savings.yearlyMax)}`
                                  : '--'}
                              </span>
                            </div>
                            <div className="flex justify-between py-1 text-xs text-[#b7c7eb] pt-2">
                              <span>*Assumes 12 orders/year at the specified monthly volume. Savings shown as a min–max range across the OpsVale price band.</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom CTA */}
                    <div className="mt-8 pt-6 border-t border-white/20 space-y-4">
                      <button
                        type="button"
                        onClick={handleRequestQuote}
                        className="w-full bg-[#ffdeac] text-[#281900] py-3.5 px-6 rounded-lg font-mono-data text-xs uppercase tracking-widest hover:bg-[#fddba7] transition-colors shadow-md flex items-center justify-center gap-2 font-bold cursor-pointer"
                      >
                        Request an Exact Quote
                        <span className="material-symbols-outlined">arrow_forward</span>
                      </button>

                      <p className="text-[11px] text-[#cbdbf5]/70 text-center leading-tight">
                        Disclaimer: Estimated savings are based on information provided and standard OpsVale pricing tiers for similar volumes and specifications. Actual quotes may vary based on final logistics routing and precise raw material costs at time of order.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
