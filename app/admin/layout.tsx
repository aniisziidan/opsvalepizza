import React from 'react';
import { redirect } from 'next/navigation';
import { AdminChrome } from '@/components/admin/AdminChrome';
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

  const handleSignOut = async () => {
    'use server';
    await signOut({ redirectTo: '/admin/login' });
  };

  return (
    <AdminChrome
      newLeadsCount={newLeadsCount}
      draftQuotesCount={draftQuotesCount}
      userName={session.user.name ?? 'Admin'}
      userEmail={session.user.email ?? 'admin@opsvale.com'}
      signOutAction={handleSignOut}
    >
      {children}
    </AdminChrome>
  );
}
