import React from 'react';

interface HeroSectionProps {
  onCheckSavings: () => void;
  onRequestQuote: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onCheckSavings, onRequestQuote }) => {
  return (
    <section className="w-full border-b border-[#c5c6ce] relative overflow-hidden bg-[#eff4ff]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 md:px-16 grid grid-cols-1 lg:grid-cols-12 min-h-[640px] lg:min-h-[716px]">
        {/* Left Text Content */}
        <div className="lg:col-span-6 flex flex-col justify-center py-12 lg:py-20 lg:pr-16 relative z-10 lg:border-r border-[#c5c6ce]">
          <div className="inline-flex items-center gap-2 mb-6 sm:mb-8 bg-[#dce9ff] px-3 py-1.5 w-fit border border-[#c5c6ce] rounded-sm">
            <span className="w-2 h-2 rounded-full bg-[#e77114] animate-pulse"></span>
            <span className="font-mono-data text-xs text-[#041632] uppercase tracking-wider font-semibold">
              Wholesale European Supply
            </span>
          </div>

          <h1 className="font-headline text-3xl sm:text-4xl md:text-5xl font-bold text-[#041632] mb-6 leading-tight max-w-xl">
            Lower Your Pizza Box Costs Without Compromising Quality.
          </h1>

          <p className="font-body text-base text-[#44474d] mb-8 sm:mb-10 max-w-lg leading-relaxed">
            Professional wholesale pizza box sourcing for European pizza chains. Specialized in high-volume supply and logistics. Every box accounted for, every order on time.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <button
              onClick={onCheckSavings}
              className="w-full sm:w-auto bg-[#e77114] text-white px-8 py-4 font-mono-data text-xs uppercase tracking-widest hover:bg-[#c25e10] transition-colors shadow-[0px_4px_20px_rgba(27,43,72,0.08)] cursor-pointer text-center font-bold rounded-sm"
            >
              Check Your Savings
            </button>
            <button
              onClick={onRequestQuote}
              className="w-full sm:w-auto border-2 border-[#041632] text-[#041632] bg-transparent px-8 py-4 font-mono-data text-xs uppercase tracking-widest hover:bg-[#041632] hover:text-white transition-colors cursor-pointer text-center font-bold rounded-sm"
            >
              Request an Exact Quote
            </button>
          </div>
        </div>

        {/* Right Visual Content */}
        <div className="lg:col-span-6 relative bg-[#cbdbf5] h-full min-h-[380px] sm:min-h-[440px] lg:min-h-full">
          <div className="absolute inset-0 p-4 sm:p-8 flex items-center justify-center">
            <img
              className="w-full h-full object-cover border border-[#c5c6ce] shadow-lg filter contrast-105 rounded-sm"
              alt="Neatly stacked, premium Kraft paper pizza boxes in a massive, brightly lit modern industrial warehouse."
              referrerPolicy="no-referrer"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBYDsi7xxfMKxwxKzTKtnKg_7mIUfUqRZE0G2muzKj9yVVtQTA2INKmMX-aNzheraaBBxKzsnFoJBiMuyjccsdHfxqN1Xu50nZ88fFMuVjiL3nI4ElqrRlwyUR5aD1tljWxwvdDXV6308NkVv6zlHqQiddamQOcycYr8HN3yzfOOTlByu4NH2Q74DHR777OwapVOPaKlc8rhuhVIxJmWGu9HIAgq9cioZu78lOrIZMTiN-wUyMwnQY70g"
            />
          </div>

          {/* Decorative Overlay Elements */}
          <div className="absolute top-6 sm:top-12 right-6 sm:right-12 bg-white/95 backdrop-blur-sm border border-[#c5c6ce] p-4 shadow-[0px_4px_20px_rgba(27,43,72,0.08)] flex items-center gap-4 rounded-sm">
            <div className="bg-[#dce9ff] p-2.5 rounded-sm flex items-center justify-center">
              <span className="material-symbols-outlined text-[#e77114] text-2xl">local_shipping</span>
            </div>
            <div>
              <p className="font-mono-data text-[11px] text-[#44474d] uppercase font-semibold">Transit Status</p>
              <p className="font-body text-sm font-bold text-[#041632]">On Schedule</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
