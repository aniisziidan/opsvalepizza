import { describe, it, expect } from 'vitest';
import { isBotOrCrawler, detectDeviceType, detectBrowser, detectOs } from '../botDetector';

describe('Bot Detector & Device Classifier', () => {
  it('detects common search engine and scraper bot user agents', () => {
    expect(isBotOrCrawler('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toBe(true);
    expect(isBotOrCrawler('Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)')).toBe(true);
    expect(isBotOrCrawler('Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)')).toBe(true);
    expect(isBotOrCrawler('SemrushBot/7~bl (+http://www.semrush.com/bot.html)')).toBe(true);
    expect(isBotOrCrawler('curl/7.68.0')).toBe(true);
    expect(isBotOrCrawler('Mozilla/5.0 (HeadlessChrome/90.0.4430.212)')).toBe(true);
  });

  it('correctly permits standard human browsers', () => {
    const chromeDesktop =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    const safariIphone =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1';

    expect(isBotOrCrawler(chromeDesktop)).toBe(false);
    expect(isBotOrCrawler(safariIphone)).toBe(false);
  });

  it('classifies device types accurately', () => {
    const mobileUa = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) Mobile/15E148';
    const tabletUa = 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15';
    const desktopUa = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

    expect(detectDeviceType(mobileUa)).toBe('MOBILE');
    expect(detectDeviceType(tabletUa)).toBe('TABLET');
    expect(detectDeviceType(desktopUa)).toBe('DESKTOP');
  });

  it('identifies browsers and operating systems', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
    expect(detectBrowser(ua)).toBe('Chrome');
    expect(detectOs(ua)).toBe('Windows');
  });
});
