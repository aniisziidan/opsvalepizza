'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export const CalculatorPromoSection: React.FC = () => {
  const router = useRouter();
  const [quickVolume, setQuickVolume] = useState<string>('50,000');

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNum = parseInt(quickVolume.replace(/[^0-9]/g, ''), 10) || 50000;
    router.push(`/calculator?volume=${cleanNum}`);
  };

  return (
    <section className="w-full bg-[#213145] py-20 lg:py-24 relative overflow-hidden text-white">
      {/* Decorative Background Pattern */}
      <div 
        className="absolute inset-0 opacity-5 pointer-events-none" 
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, #ffffff 25%, transparent 25%, transparent 75%, #ffffff 75%, #ffffff), repeating-linear-gradient(45deg, #ffffff 25%, #f8f9ff 25%, #f8f9ff 75%, #ffffff 75%, #ffffff)`,
          backgroundPosition: '0 0, 10px 10px',
          backgroundSize: '20px 20px'
        }}
      />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 md:px-16 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 relative z-10 items-center">
        {/* Calculator Promo Box */}
        <div className="bg-[#1b2b48] p-8 sm:p-12 border border-[#4f5e7e] shadow-2xl relative rounded-sm">
          <div className="absolute top-0 right-0 w-14 h-14 sm:w-16 sm:h-16 bg-[#e77114] flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-2xl sm:text-3xl">calculate</span>
          </div>

          <span className="font-mono-data text-xs text-[#e3c290] uppercase tracking-widest block mb-4 font-semibold">
            Cost Analysis
          </span>

          <h2 className="font-headline text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-6">
            Stop Overpaying for Essential Packaging.
          </h2>

          <p className="font-body text-sm sm:text-base text-[#8393b5] mb-8 leading-relaxed">
            Input your current volume and pricing to see exactly how much OpsVale's dedicated logistics network can save your franchise annually.
          </p>

          <form onSubmit={handleCalculate} className="space-y-6">
            <div>
              <label className="font-mono-data text-xs text-[#8393b5] mb-2 uppercase block font-semibold">
                Monthly Box Volume
              </label>
              <input
                type="text"
                value={quickVolume}
                onChange={(e) => setQuickVolume(e.target.value)}
                placeholder="e.g., 50,000"
                className="w-full bg-[#213145] border border-[#4f5e7e] text-white p-4 h-12 focus:ring-2 focus:ring-[#e77114] focus:border-transparent outline-none font-mono-data text-sm rounded-sm placeholder:text-[#75777e]"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#e77114] text-white px-8 py-4 font-mono-data text-xs uppercase tracking-widest hover:bg-[#c25e10] transition-colors flex justify-center items-center gap-2 font-bold cursor-pointer shadow-lg rounded-sm"
            >
              Calculate Savings <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </form>
        </div>

        {/* Market Focus: European Specialization */}
        <div className="flex flex-col justify-center">
          <span className="font-mono-data text-xs text-[#8393b5] uppercase tracking-widest block mb-4 border-l-2 border-[#e77114] pl-3 font-semibold">
            Our Footprint
          </span>

          <h2 className="font-headline text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-6">
            Built for the European Market.
          </h2>

          <p className="font-body text-sm sm:text-base text-[#8393b5] mb-10 leading-relaxed">
            We don't try to serve everyone. We specialize strictly in supplying high-grade, food-safe packaging to pizza chains operating across the European continent. Our centralized hubs ensure minimal transit times and tariff-free movement within the EU.
          </p>

          <div className="grid grid-cols-2 gap-6 sm:gap-8">
            <div className="border-t border-[#4f5e7e] pt-4">
              <p className="font-headline text-3xl sm:text-4xl font-bold text-[#e3c290]">14</p>
              <p className="font-mono-data text-xs text-[#8393b5] uppercase mt-2 font-medium">Logistics Hubs</p>
            </div>
            <div className="border-t border-[#4f5e7e] pt-4">
              <p className="font-headline text-3xl sm:text-4xl font-bold text-[#e3c290]">48h</p>
              <p className="font-mono-data text-xs text-[#8393b5] uppercase mt-2 font-medium">Max Dispatch Time</p>
            </div>
            <div className="border-t border-[#4f5e7e] pt-4">
              <p className="font-headline text-3xl sm:text-4xl font-bold text-[#e3c290]">100%</p>
              <p className="font-mono-data text-xs text-[#8393b5] uppercase mt-2 font-medium">FSC Certified</p>
            </div>
            <div className="border-t border-[#4f5e7e] pt-4">
              <p className="font-headline text-3xl sm:text-4xl font-bold text-[#e3c290]">€0</p>
              <p className="font-mono-data text-xs text-[#8393b5] uppercase mt-2 font-medium">Hidden Fees</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
