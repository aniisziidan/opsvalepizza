import React from 'react';
import { SideNavBar } from '@/components/admin/SideNavBar';
import { INITIAL_LEADS } from '@/lib/mockData';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const newLeadsCount = INITIAL_LEADS.filter((l) => l.status === 'New').length;

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex flex-row w-full selection:bg-[#ffdeac] selection:text-[#281900]">
      <SideNavBar newLeadsCount={newLeadsCount} />
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
