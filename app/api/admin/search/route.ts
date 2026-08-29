import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { checkRateLimit, getClientIp, createRateLimitResponse } from '@/lib/ratelimit/rateLimiter';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limiting (60 search queries per minute)
  const clientIp = getClientIp(req);
  const rateLimitKey = `admin_search:${session.user.id}:${clientIp}`;
  const rateCheck = checkRateLimit(rateLimitKey, { maxRequests: 60, windowSeconds: 60 });
  if (!rateCheck.success) {
    return createRateLimitResponse(rateCheck);
  }

  const { searchParams } = new URL(req.url);
  const query = (searchParams.get('q') || '').trim();

  if (!query || query.length < 1) {
    return NextResponse.json({ leads: [], quotes: [] });
  }

  try {
    const [leads, quotes] = await Promise.all([
      prisma.lead.findMany({
        where: {
          OR: [
            { code: { contains: query, mode: 'insensitive' } },
            { company: { name: { contains: query, mode: 'insensitive' } } },
            { contact: { name: { contains: query, mode: 'insensitive' } } },
            { contact: { email: { contains: query, mode: 'insensitive' } } },
          ],
        },
        include: {
          company: { select: { name: true, countryCode: true } },
          contact: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
      prisma.quote.findMany({
        where: {
          OR: [
            { id: { contains: query, mode: 'insensitive' } },
            { lead: { code: { contains: query, mode: 'insensitive' } } },
            { lead: { company: { name: { contains: query, mode: 'insensitive' } } } },
          ],
        },
        include: {
          lead: {
            select: {
              id: true,
              code: true,
              company: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
    ]);

    return NextResponse.json({
      leads: leads.map((l) => ({
        id: l.id,
        leadCode: l.code,
        companyName: l.company?.name || 'Unknown Company',
        countryCode: l.company?.countryCode,
        contactName: l.contact?.name || 'Unknown Contact',
        contactEmail: l.contact?.email,
        status: l.status,
        href: `/admin/leads/${l.id}`,
      })),
      quotes: quotes.map((q) => ({
        id: q.id,
        leadId: q.leadId,
        leadCode: q.lead?.code || 'OPS-QUOTE',
        companyName: q.lead?.company?.name || 'Unknown Company',
        revision: q.revision,
        unitPriceEur: Number(q.unitPriceEur),
        status: q.status,
        href: `/admin/leads/${q.leadId}`,
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to execute admin search' },
      { status: 500 },
    );
  }
}
