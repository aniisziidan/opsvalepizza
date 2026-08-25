import React from 'react';
import Link from 'next/link';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-[#041632] text-white border-t border-[#c5c6ce] relative z-10">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 md:px-16 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 pb-12 border-b border-[#1b2b48]">
          {/* Brand Col */}
          <div className="md:col-span-6 lg:col-span-5">
            <Link
              href="/"
              className="font-headline text-2xl font-bold text-white flex items-center gap-2 mb-4 hover:opacity-90 transition-opacity cursor-pointer text-left w-fit"
            >
              <span className="material-symbols-outlined text-2xl text-[#e77114]">package</span>
              OpsVale
            </Link>
            <p className="font-body text-sm text-[#8393b5] max-w-sm leading-relaxed mb-6">
              Wholesale pizza box supply chain &amp; logistics engineered specifically for high-volume European pizza chains.
            </p>
            <div className="flex items-center gap-2 text-xs font-mono-data text-[#8393b5]">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>All 14 European Logistics Hubs Operational</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-3 lg:col-span-3">
            <span className="font-mono-data text-xs text-[#e3c290] uppercase tracking-widest block mb-4 font-semibold">
              Platform
            </span>
            <ul className="space-y-2.5 font-mono-data text-xs text-[#8393b5]">
              <li>
                <Link href="/products" className="hover:text-white transition-colors cursor-pointer">
                  Standard Packaging Catalog
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-white transition-colors cursor-pointer">
                  Procurement &amp; Logistics SLA
                </Link>
              </li>
              <li>
                <Link href="/calculator" className="hover:text-white transition-colors cursor-pointer">
                  Cost Savings Calculator
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition-colors cursor-pointer">
                  European Hub Network
                </Link>
              </li>
            </ul>
          </div>

          {/* Connect / Legal */}
          <div className="md:col-span-3 lg:col-span-4">
            <span className="font-mono-data text-xs text-[#e3c290] uppercase tracking-widest block mb-4 font-semibold">
              European Dispatch Desk
            </span>
            <p className="font-mono-data text-xs text-[#8393b5] mb-2">
              Direct Inquiries: <a href="mailto:ops@opsvale.eu" className="text-white hover:underline">ops@opsvale.eu</a>
            </p>
            <p className="font-mono-data text-xs text-[#8393b5] mb-4">
              Central Depot: Industrieweg 44, 3044 GS Rotterdam, NL
            </p>

            {/* Industrial Barcode representation */}
            <div className="bg-[#1b2b48] border border-[#4f5e7e] p-3 rounded flex items-center justify-between font-mono-data text-[10px] text-[#8393b5] max-w-xs">
              <span className="tracking-[4px] font-mono-data text-white font-bold">||||||||||||||||||||</span>
              <span className="text-[#e3c290]">OPS-VALE-EUR-01</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-mono-data text-[#8393b5]">
          <p>© 2024 OpsVale B.V. All rights reserved. Pan-European Wholesale Logistics.</p>
          <div className="flex gap-6">
            <a href="#privacy" className="hover:text-white">Privacy Policy</a>
            <a href="#terms" className="hover:text-white">Terms of Supply</a>
            <a href="#iso" className="hover:text-white">FSC / ISO 9001</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
