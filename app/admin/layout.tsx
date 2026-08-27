import React from 'react';
import { SideNavBar } from '@/components/admin/SideNavBar';
import { auth, signOut } from '@/lib/auth';
import { getNewLeadsCount, getDraftQuotesCount } from '@/lib/admin/queries';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // When there is no session (e.g. the /admin/login page) render the child
  // standalone without the admin chrome. The middleware guard redirects any
  // other unauthenticated /admin/** request to /admin/login.
  if (!session?.user) {
    return <>{children}</>;
  }

  const [newLeadsCount, draftQuotesCount] = await Promise.all([
    getNewLeadsCount(),
    getDraftQuotesCount(),
  ]);

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex flex-row w-full selection:bg-[#ffdeac] selection:text-[#281900]">
      <SideNavBar
        newLeadsCount={newLeadsCount}
        draftQuotesCount={draftQuotesCount}
        userName={session.user.name ?? 'Admin'}
        userEmail={session.user.email ?? 'admin@opsvale.com'}
      />
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="flex items-center justify-end gap-3 px-6 py-3 border-b border-[#e2e4ef] bg-white">
          <span className="font-mono-data text-[11px] text-[#4f5e7e]">
            {session.user.name ?? session.user.email}
          </span>
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/admin/login' });
            }}
          >
            <button
              type="submit"
              className="font-mono-data text-[11px] uppercase tracking-wider text-[#041632] hover:text-[#e77114] border border-[#c5c6ce] rounded-md px-3 py-1.5 transition-colors cursor-pointer"
            >
              Sign out
            </button>
          </form>
        </div>
        {children}
      </main>
    </div>
  );
}
