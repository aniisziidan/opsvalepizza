import React from 'react';
import { TopNavBar } from '@/components/TopNavBar';
import { Footer } from '@/components/Footer';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#eaeff7] flex flex-col items-center overflow-x-hidden selection:bg-[#ffdeac] selection:text-[#281900]">
      <div className="w-full max-w-[1440px] min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex flex-col justify-between shadow-[0_0_50px_rgba(4,22,50,0.06)] border-x border-[#c5c6ce]/60 relative">
        <TopNavBar />
        <main className="flex-grow">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
