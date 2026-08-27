import { NextRequest, NextResponse } from 'next/server';
import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';
import { LOCALES, DEFAULT_LOCALE, isValidLocale, Locale } from '@/lib/i18n/config';

const { auth: adminAuthMiddleware } = NextAuth(authConfig);

function detectLocale(req: NextRequest): Locale {
  // 1. Check NEXT_LOCALE cookie
  const cookieLocale = req.cookies.get('NEXT_LOCALE')?.value;
  if (cookieLocale && isValidLocale(cookieLocale)) {
    return cookieLocale;
  }

  // 2. Check Accept-Language header
  const acceptLang = req.headers.get('accept-language');
  if (acceptLang) {
    const langs = acceptLang.split(',').map((l) => l.split(';')[0].trim().toLowerCase());
    for (const lang of langs) {
      const prefix = lang.slice(0, 2);
      if (isValidLocale(prefix)) {
        return prefix;
      }
    }
  }

  return DEFAULT_LOCALE;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Gated Admin Routes: Pass through NextAuth middleware (Always English-only internal platform)
  if (pathname.startsWith('/admin')) {
    return (adminAuthMiddleware as any)(req);
  }

  // 2. Bypass API, Next.js system internals, and static assets
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/robots.txt') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 3. Proposals portal - can be accessed via /proposals/[token] or /[locale]/proposals/[token]
  // Allow direct /proposals/[token] or localized

  // 4. Check if pathname already starts with a valid locale (/en, /de, /fr, /it, /es)
  const segments = pathname.split('/');
  const firstSegment = segments[1];

  if (isValidLocale(firstSegment)) {
    return NextResponse.next();
  }

  // 5. Public Route without locale prefix -> Redirect to localized URL
  const targetLocale = detectLocale(req);
  const newPath = `/${targetLocale}${pathname === '/' ? '' : pathname}`;
  const redirectUrl = new URL(newPath, req.url);
  redirectUrl.search = req.nextUrl.search;

  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|robots.txt|.*\\..*).*)'],
};
