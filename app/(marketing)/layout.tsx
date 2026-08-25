import React from 'react';
import { TopNavBar } from '@/components/TopNavBar';
import { Footer } from '@/components/Footer';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex flex-col selection:bg-[#ffdeac] selection:text-[#281900]">
      <TopNavBar />
      <main className="flex-grow">{children}</main>
      <Footer />
    </div>
  );
}
