import React from 'react';
import Link from 'next/link';
import { PRODUCT_CATALOG } from '@/lib/mockData';

export const ProductsPage: React.FC = () => {
  return (
    <div className="w-full py-12 sm:py-16 max-w-[1440px] mx-auto px-4 sm:px-8 md:px-16">
      <div className="mb-12 border-l-4 border-[#e77114] pl-6 py-2">
        <span className="font-mono-data text-xs text-[#735a31] uppercase tracking-widest block mb-1 font-semibold">
          Commercial Packaging Catalog
        </span>
        <h1 className="font-headline text-3xl sm:text-4xl font-bold text-[#041632] mb-3">
          Heavyweight Corrugated Pizza Packaging
        </h1>
        <p className="font-body text-base text-[#44474d] max-w-3xl leading-relaxed">
          Standardized for European takeaway and delivery fleets. Manufactured with FSC-certified 100% recyclable virgin kraft liners and micro-fluted corrugation for maximum heat retention and zero lid collapse.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        {PRODUCT_CATALOG.map((prod) => (
          <div
            key={prod.id}
            className="bg-white border border-[#c5c6ce] rounded-xl p-6 sm:p-8 hover:shadow-lg transition-all flex flex-col justify-between relative group"
          >
            {prod.badge && (
              <span className="absolute top-6 right-6 bg-[#e77114] text-white font-mono-data text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                {prod.badge}
              </span>
            )}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#eff4ff] flex items-center justify-center text-[#041632]">
                  <span className="material-symbols-outlined text-2xl">crop_square</span>
                </div>
                <h2 className="font-headline text-xl sm:text-2xl font-bold text-[#041632]">{prod.title}</h2>
              </div>
              <p className="font-body text-sm text-[#44474d] mb-6 leading-relaxed">{prod.desc}</p>

              <div className="grid grid-cols-2 gap-3 mb-6 bg-[#f8f9ff] p-4 rounded-lg border border-[#c5c6ce]/60 font-mono-data text-xs">
                <div>
                  <span className="text-[#75777e] block">Caliper Profile</span>
                  <span className="font-bold text-[#041632]">{prod.caliper}</span>
                </div>
                <div>
                  <span className="text-[#75777e] block">Grammage</span>
                  <span className="font-bold text-[#041632]">{prod.weight}</span>
                </div>
                <div>
                  <span className="text-[#75777e] block">Minimum Order</span>
                  <span className="font-bold text-[#041632]">{prod.moq}</span>
                </div>
                <div>
                  <span className="text-[#75777e] block">Indicative Price</span>
                  <span className="font-bold text-[#e77114]">{prod.unitPrice}</span>
                </div>
              </div>

              <ul className="space-y-2 mb-6 font-body text-xs sm:text-sm text-[#44474d]">
                {prod.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-[#e77114]">check</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href="/quote"
              className="w-full bg-[#041632] text-white py-3 rounded-lg font-mono-data text-xs uppercase tracking-wider hover:bg-[#1b2b48] transition-colors cursor-pointer font-bold flex items-center justify-center gap-2"
            >
              Get Bulk Quote
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
        ))}
      </div>

      {/* Quality specs banner */}
      <div className="bg-[#1b2b48] text-white rounded-xl p-8 sm:p-12 border border-[#4f5e7e] grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div>
          <span className="material-symbols-outlined text-3xl text-[#e3c290] mb-3">eco</span>
          <h3 className="font-headline text-lg font-bold mb-2">100% Food-Safe &amp; Recyclable</h3>
          <p className="font-body text-xs sm:text-sm text-[#8393b5]">
            Certified to EC 1935/2004 and FDA direct food contact regulations. Heavy-duty paper fibers degrade naturally without toxic coatings.
          </p>
        </div>
        <div>
          <span className="material-symbols-outlined text-3xl text-[#e3c290] mb-3">palette</span>
          <h3 className="font-headline text-lg font-bold mb-2">High-Definition Flexo Print</h3>
          <p className="font-body text-xs sm:text-sm text-[#8393b5]">
            Up to 4-color precision water-based flexographic printing with odorless food-safe inks that resist steam and condensation smearing.
          </p>
        </div>
        <div>
          <span className="material-symbols-outlined text-3xl text-[#e3c290] mb-3">forklift</span>
          <h3 className="font-headline text-lg font-bold mb-2">Palletized Flat-Pack Logistics</h3>
          <p className="font-body text-xs sm:text-sm text-[#8393b5]">
            1,000 units per standard Euro-pallet (120x80cm), pre-creased for 3-second rapid origami fold assembly during restaurant rush hours.
          </p>
        </div>
      </div>
    </div>
  );
};
