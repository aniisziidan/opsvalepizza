import { NextRequest, NextResponse } from 'next/server';
import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';
import { LOCALES, DEFAULT_LOCALE, isValidLocale, Locale } from '@/lib/i18n/config';
import { buildContentSecurityPolicy } from '@/lib/security/csp';

const { auth } = NextAuth(authConfig);

const isProduction = process.env.NODE_ENV === 'production';

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

/** Edge-safe base64 nonce (crypto + btoa are available in the Edge runtime). */
function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user;

  // Per-request CSP nonce. Setting the CSP on the *request* headers is what lets Next.js apply
  // the nonce to its own framework/bootstrap scripts; we also set it on the response.
  //
  // The strict nonce + strict-dynamic policy only works on dynamically rendered routes, because
  // Next stamps the nonce at request time. `/admin/**` and `/proposals/**` are dynamic, so they
  // get the strict policy. The localized public pages are statically generated (their inline
  // scripts are prebuilt with no nonce), so they fall back to 'unsafe-inline'.
  const useNonce = pathname.startsWith('/admin') || pathname.startsWith('/proposals');
  const nonce = generateNonce();
  const csp = buildContentSecurityPolicy({ nonce, isProduction, useNonce });

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', csp);

  const render = () => {
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.headers.set('Content-Security-Policy', csp);
    return res;
  };
  const redirect = (url: URL) => {
    const res = NextResponse.redirect(url);
    res.headers.set('Content-Security-Policy', csp);
    return res;
  };

  // 1. Gated Admin Routes (always English-only internal platform)
  if (pathname.startsWith('/admin')) {
    const isLoginPage = pathname === '/admin/login';
    // Already logged in and visiting the login page -> go to dashboard.
    if (isLoginPage && isLoggedIn) {
      return redirect(new URL('/admin/dashboard', req.nextUrl));
    }
    // Every other /admin/** route requires a session -> clean redirect to login.
    if (!isLoginPage && !isLoggedIn) {
      return redirect(new URL('/admin/login', req.nextUrl));
    }
    return render();
  }

  // 2. Proposals portal - direct token route
  if (pathname.startsWith('/proposals')) {
    return render();
  }

  // 3. Check if pathname already starts with a valid locale (/en, /de, /fr, /it, /es)
  const segments = pathname.split('/');
  const firstSegment = segments[1];

  // If /[locale]/proposals/[token] is visited, redirect cleanly to /proposals/[token]
  if (isValidLocale(firstSegment) && segments[2] === 'proposals') {
    const rawToken = segments.slice(3).join('/');
    return redirect(new URL(`/proposals/${rawToken}`, req.url));
  }

  if (isValidLocale(firstSegment)) {
    return render();
  }

  // 4. Public Route without locale prefix -> Redirect to localized URL
  const targetLocale = detectLocale(req);
  const newPath = `/${targetLocale}${pathname === '/' ? '' : pathname}`;
  const redirectUrl = new URL(newPath, req.url);
  redirectUrl.search = req.nextUrl.search;

  return redirect(redirectUrl);
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|robots.txt|.*\\..*).*)'],
};
