import React from 'react';
import { redirect } from 'next/navigation';
import { SideNavBar } from '@/components/admin/SideNavBar';
import { AdminNotificationBell } from '@/components/admin/AdminNotificationBell';
import { auth, signOut } from '@/lib/auth';
import { prisma } from '@/lib/db';
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

  // Defense-in-depth: the edge middleware only verifies that a token exists, so
  // a JWT minted before the account was deactivated/deleted could still render
  // admin page shells until it expired. Re-check the live record here — the one
  // chokepoint every admin page passes through — and bounce stale sessions to
  // login instead of rendering the chrome.
  const liveAdmin = await prisma.adminUser.findUnique({
    where: { id: session.user.id },
    select: { active: true },
  });
  if (!liveAdmin?.active) {
    redirect('/admin/login');
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
        <div className="flex items-center justify-end gap-4 px-6 py-2.5 border-b border-[#e2e4ef] bg-white shadow-2xs">
          <AdminNotificationBell />
          <div className="h-4 w-px bg-[#e2e4ef]" />
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
