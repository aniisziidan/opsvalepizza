const BOT_PATTERNS = [
  /googlebot/i,
  /bingbot/i,
  /slurp/i,
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /sogou/i,
  /exabot/i,
  /facebookexternalhit/i,
  /facebot/i,
  /ia_archiver/i,
  /ahrefsbot/i,
  /semrushbot/i,
  /mj12bot/i,
  /dotbot/i,
  /petalbot/i,
  /bytespider/i,
  /uptime/i,
  /pingdom/i,
  /uptimerobot/i,
  /curl\//i,
  /wget\//i,
  /python-requests/i,
  /postmanruntime/i,
  /lighthouse/i,
  /headlesschrome/i,
  /phantomjs/i,
  /node-fetch/i,
  /axios\//i,
];

export function isBotOrCrawler(userAgent?: string | null): boolean {
  if (!userAgent || typeof userAgent !== 'string') {
    return false;
  }

  const ua = userAgent.trim();
  if (ua.length < 5) return true; // Suspiciously short UA

  return BOT_PATTERNS.some((pattern) => pattern.test(ua));
}

export function detectDeviceType(userAgent?: string | null): 'DESKTOP' | 'MOBILE' | 'TABLET' {
  if (!userAgent) return 'DESKTOP';
  const ua = userAgent.toLowerCase();

  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) {
    return 'TABLET';
  }
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile|wpdesktop/i.test(ua)) {
    return 'MOBILE';
  }
  return 'DESKTOP';
}

export function detectBrowser(userAgent?: string | null): string {
  if (!userAgent) return 'Unknown';
  const ua = userAgent.toLowerCase();

  if (ua.includes('edg/')) return 'Edge';
  if (ua.includes('chrome/') && !ua.includes('chromium/')) return 'Chrome';
  if (ua.includes('safari/') && !ua.includes('chrome/')) return 'Safari';
  if (ua.includes('firefox/')) return 'Firefox';
  if (ua.includes('opera/') || ua.includes('opr/')) return 'Opera';
  return 'Other';
}

export function detectOs(userAgent?: string | null): string {
  if (!userAgent) return 'Unknown';
  const ua = userAgent.toLowerCase();

  if (ua.includes('windows')) return 'Windows';
  if (ua.includes('macintosh') || ua.includes('mac os')) return 'macOS';
  if (ua.includes('linux') && !ua.includes('android')) return 'Linux';
  if (ua.includes('android')) return 'Android';
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) return 'iOS';
  return 'Other';
}
