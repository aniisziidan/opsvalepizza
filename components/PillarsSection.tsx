import React from 'react';

export const PillarsSection: React.FC = () => {
  return (
    <section className="w-full bg-[#f8f9ff] py-16 sm:py-20 border-b border-[#c5c6ce]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 md:px-16">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="font-headline text-3xl sm:text-4xl font-bold text-[#041632] mb-4">
            The OpsVale Advantage
          </h2>
          <p className="font-body text-base text-[#44474d] max-w-2xl mx-auto">
            Engineered for high-volume procurement where reliability is the only metric that matters.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 industrial-border bg-white rounded-sm overflow-hidden shadow-sm">
          {/* Pillar 1 */}
          <div className="p-8 sm:p-10 border-b md:border-b-0 md:border-r border-[#c5c6ce] hover:bg-[#eff4ff] transition-colors duration-300">
            <div className="w-12 h-12 bg-[#1b2b48] rounded-sm flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-[#eaf1ff] text-2xl">bolt</span>
            </div>
            <h3 className="font-headline text-2xl font-bold text-[#041632] mb-3">Fast.</h3>
            <p className="font-body text-sm sm:text-base text-[#44474d] leading-relaxed">
              Streamlined ordering and rapid dispatch protocols ensure your materials are moving before you even realize you're low.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="p-8 sm:p-10 border-b md:border-b-0 md:border-r border-[#c5c6ce] hover:bg-[#eff4ff] transition-colors duration-300">
            <div className="w-12 h-12 bg-[#1b2b48] rounded-sm flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-[#eaf1ff] text-2xl">check_circle</span>
            </div>
            <h3 className="font-headline text-2xl font-bold text-[#041632] mb-3">Simple.</h3>
            <p className="font-body text-sm sm:text-base text-[#44474d] leading-relaxed">
              No complex catalogs. We focus purely on what works for European pizzerias, standardizing the supply chain.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="p-8 sm:p-10 hover:bg-[#eff4ff] transition-colors duration-300">
            <div className="w-12 h-12 bg-[#1b2b48] rounded-sm flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-[#eaf1ff] text-2xl">my_location</span>
            </div>
            <h3 className="font-headline text-2xl font-bold text-[#041632] mb-3">Accurate.</h3>
            <p className="font-body text-sm sm:text-base text-[#44474d] leading-relaxed">
              Precision tracking from factory floor to your back door. Total data visibility into every pallet shipped.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
