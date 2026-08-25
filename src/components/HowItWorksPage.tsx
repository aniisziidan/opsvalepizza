import React from 'react';

interface HowItWorksPageProps {
  onCheckSavings: () => void;
  onRequestQuote: () => void;
}

export const HowItWorksPage: React.FC<HowItWorksPageProps> = ({ onCheckSavings, onRequestQuote }) => {
  const steps = [
    {
      step: '01',
      title: 'Cost Analysis & Spec Matching',
      desc: 'Submit your current box dimensions, paper grammage, and annual volume. We analyze your requirements against our pan-European manufacturing runs.',
      icon: 'calculate'
    },
    {
      step: '02',
      title: 'Sample Testing & Proofing',
      desc: 'We courier physical packaging samples and high-res print mockups directly to your HQ test kitchen to verify grease resistance and heat retention.',
      icon: 'inventory_2'
    },
    {
      step: '03',
      title: 'Scheduled Hub Consolidation',
      desc: 'Production is scheduled in bulk runs and staged across our 14 European distribution depots to guarantee 48-hour delivery buffer protection.',
      icon: 'hub'
    },
    {
      step: '04',
      title: 'Automated Replenishment',
      desc: 'Direct EDI or scheduled weekly/monthly drops keep your store walk-in refrigerators stocked without tying up restaurant floor space.',
      icon: 'local_shipping'
    }
  ];

  return (
    <div className="w-full py-12 sm:py-16 max-w-[1440px] mx-auto px-4 sm:px-8 md:px-16">
      <div className="mb-12 border-l-4 border-[#e77114] pl-6 py-2">
        <span className="font-mono-data text-xs text-[#735a31] uppercase tracking-widest block mb-1 font-semibold">
          Procurement Process
        </span>
        <h1 className="font-headline text-3xl sm:text-4xl font-bold text-[#041632] mb-3">
          How OpsVale Streamlines Your Box Supply
        </h1>
        <p className="font-body text-base text-[#44474d] max-w-3xl leading-relaxed">
          From mill to kitchen: we remove broker margins, eliminate customs friction, and provide guaranteed supply continuity for high-growth pizzeria chains.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        {steps.map((s) => (
          <div
            key={s.step}
            className="bg-white border border-[#c5c6ce] rounded-xl p-6 sm:p-8 flex flex-col justify-between hover:border-[#041632] transition-colors relative"
          >
            <div>
              <div className="flex items-center justify-between mb-6">
                <span className="font-headline text-3xl font-black text-[#e77114]">{s.step}</span>
                <span className="material-symbols-outlined text-2xl text-[#1b2b48]">{s.icon}</span>
              </div>
              <h2 className="font-headline text-lg font-bold text-[#041632] mb-3">{s.title}</h2>
              <p className="font-body text-xs sm:text-sm text-[#44474d] leading-relaxed">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[#eff4ff] border border-[#c5c6ce] p-8 sm:p-12 rounded-xl flex flex-col md:flex-row items-center justify-between gap-8">
        <div>
          <h2 className="font-headline text-2xl font-bold text-[#041632] mb-2">Ready to benchmark your current box costs?</h2>
          <p className="font-body text-sm text-[#44474d]">Takes less than 2 minutes to generate an instant savings estimate.</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={onCheckSavings}
            className="bg-[#e77114] text-white px-6 py-3.5 rounded-lg font-mono-data text-xs uppercase font-bold tracking-wider hover:bg-[#c25e10] transition-colors cursor-pointer"
          >
            Run Calculator
          </button>
          <button
            onClick={onRequestQuote}
            className="bg-[#041632] text-white px-6 py-3.5 rounded-lg font-mono-data text-xs uppercase font-bold tracking-wider hover:bg-[#1b2b48] transition-colors cursor-pointer"
          >
            Request Exact Quote
          </button>
        </div>
      </div>
    </div>
  );
};
