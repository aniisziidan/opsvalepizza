import React from 'react';

export const AboutPage: React.FC = () => {
  return (
    <div className="w-full py-12 sm:py-16 max-w-[1440px] mx-auto px-4 sm:px-8 md:px-16">
      <div className="mb-12 border-l-4 border-[#e77114] pl-6 py-2">
        <span className="font-mono-data text-xs text-[#735a31] uppercase tracking-widest block mb-1 font-semibold">
          Corporate Overview
        </span>
        <h1 className="font-headline text-3xl sm:text-4xl font-bold text-[#041632] mb-3">
          European Wholesale Sourcing Infrastructure
        </h1>
        <p className="font-body text-base text-[#44474d] max-w-3xl leading-relaxed">
          OpsVale was built on a singular conviction: packaging shouldn't be an unpredictable operational headache for multi-unit pizza operators.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
        <div className="space-y-6 font-body text-sm sm:text-base text-[#44474d] leading-relaxed">
          <p>
            Operating across 14 logistics hubs in Central and Western Europe, OpsVale contracts directly with high-capacity paper mills in Scandinavia, Poland, and Italy. By consolidating purchase power across hundreds of franchise doors, we unlock Tier-1 mill pricing previously reserved only for multinational corporate conglomerates.
          </p>
          <p>
            Our dedicated QA labs inspect every production lot for burst pressure, steam perforation efficiency, and food safety hygiene, ensuring that pizza crusts stay crisp and lids never buckle under delivery stacking pressure.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4 font-mono-data text-xs">
            <div className="p-4 bg-white border border-[#c5c6ce] rounded-lg">
              <span className="text-[#e77114] font-headline text-2xl font-bold block mb-1">99.8%</span>
              <span className="text-[#041632] font-semibold">On-Time SLA Delivery</span>
            </div>
            <div className="p-4 bg-white border border-[#c5c6ce] rounded-lg">
              <span className="text-[#e77114] font-headline text-2xl font-bold block mb-1">45M+</span>
              <span className="text-[#041632] font-semibold">Boxes Shipped Annually</span>
            </div>
          </div>
        </div>

        <div className="bg-[#1b2b48] text-white p-8 rounded-xl border border-[#4f5e7e] space-y-6">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-3xl text-[#e3c290]">verified</span>
            <h2 className="font-headline text-xl font-bold">Sustainability &amp; Compliance</h2>
          </div>
          <p className="font-body text-sm text-[#8393b5] leading-relaxed">
            All cardboard materials sourced through OpsVale are certified according to FSC (Forest Stewardship Council) Chain of Custody standards and compliant with EU Directive 94/62/EC on packaging waste.
          </p>
          <ul className="space-y-3 font-mono-data text-xs text-[#dce9ff]">
            <li className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-[#e3c290]">check_circle</span>
              <span>100% Recyclable post-consumer paper fiber</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-[#e3c290]">check_circle</span>
              <span>Non-toxic water-soluble print pigments</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-[#e3c290]">check_circle</span>
              <span>Zero PFAS / forever chemicals added</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
