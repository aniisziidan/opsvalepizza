'use client';

import React, { Suspense, useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackPageView } from '@/lib/analytics/tracker';
import { getClientConsent } from '@/lib/consent/consentManager';

function AnalyticsTrackingTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;

    // Build current full path for comparison
    const search = searchParams?.toString();
    const fullPath = search ? `${pathname}?${search}` : pathname;

    if (lastTrackedPathRef.current === fullPath) {
      return;
    }

    const consent = getClientConsent();
    if (consent?.analytics) {
      lastTrackedPathRef.current = fullPath;
      trackPageView(pathname, undefined, document.title);
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    // Listen for consent updates (when user accepts analytics from banner)
    const handleConsentUpdated = (e: CustomEvent) => {
      const consent = e.detail;
      if (consent?.analytics && pathname && lastTrackedPathRef.current !== pathname) {
        lastTrackedPathRef.current = pathname;
        trackPageView(pathname, undefined, document.title);
      }
    };

    window.addEventListener('opsvale_consent_updated', handleConsentUpdated as EventListener);
    return () => {
      window.removeEventListener('opsvale_consent_updated', handleConsentUpdated as EventListener);
    };
  }, [pathname]);

  return null;
}

export const VisitorAnalyticsProvider: React.FC = () => {
  return (
    <Suspense fallback={null}>
      <AnalyticsTrackingTracker />
    </Suspense>
  );
};
