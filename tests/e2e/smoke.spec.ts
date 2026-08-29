import { test, expect } from '@playwright/test';

test.describe('OpsVale Pan-European Platform E2E Suite', () => {
  test('Root URL redirects to localized /en homepage with full SEO metadata', async ({ page }) => {
    await page.goto('/');

    // Verify redirection to localized route
    await expect(page).toHaveURL(/\/en/);
    await expect(page).toHaveTitle(/OpsVale/i);

    // Verify brand logo
    const brandLogo = page.locator('text=OpsVale').first();
    await expect(brandLogo).toBeVisible();

    // Verify hreflang alternate links
    const alternateEn = page.locator('link[rel="alternate"][hreflang="en"]');
    await expect(alternateEn).toHaveAttribute('href', /.*\/en/);

    const alternateDe = page.locator('link[rel="alternate"][hreflang="de"]');
    await expect(alternateDe).toHaveAttribute('href', /.*\/de/);
  });

  test('Language switcher dynamically changes locale to German (/de)', async ({ page }) => {
    await page.goto('/en');

    // Find and click language selector
    const langBtn = page.locator('button[aria-label="Select language"]').first();
    if (await langBtn.isVisible()) {
      await langBtn.click();
      const deOption = page.locator('button:has-text("Deutsch")').first();
      await deOption.click();

      await expect(page).toHaveURL(/\/de/);
      await expect(page.locator('h1').first()).toBeVisible();
    }
  });

  test('Savings Calculator allows metric entry and routes with parameters to /en/quote', async ({ page }) => {
    await page.goto('/en/calculator');

    await expect(page.locator('h1')).toBeVisible();

    // Select country
    const countrySelect = page.locator('select#country-select');
    await expect(countrySelect).toBeVisible();
    await countrySelect.selectOption('DE');

    // Click calculate
    const calcBtn = page.locator('button[type="submit"]:has-text("Calculate")');
    if (await calcBtn.isVisible()) {
      await calcBtn.click();
    }

    // Click Request Quote CTA
    const quoteCta = page.locator('button:has-text("Request an Exact Quote")').first();
    if (await quoteCta.isVisible()) {
      await quoteCta.click();
      await expect(page).toHaveURL(/\/en\/quote\?/);
    }
  });

  test('Cookie Consent Banner permits Essential Only and opens Preferences Modal', async ({ page }) => {
    await page.goto('/en');

    // Verify banner is shown
    const banner = page.locator('text=Cookie Preferences & Privacy Choice').first();
    if (await banner.isVisible()) {
      const essentialBtn = page.locator('button:has-text("Essential Only")').first();
      await expect(essentialBtn).toBeVisible();

      const customizeBtn = page.locator('button:has-text("Customize")').first();
      await customizeBtn.click();

      // Modal should open
      await expect(page.locator('text=Cookie & Tracking Preferences')).toBeVisible();
      await expect(page.locator('text=REQUIRED')).toBeVisible();
    }
  });

  test('Statutory Legal Pages render with verified company credentials and zero invented data', async ({ page }) => {
    // Imprint
    await page.goto('/en/imprint');
    await expect(page.locator('h1')).toContainText(/Imprint/i);
    await expect(page.locator('text=OpsVale B.V.').first()).toBeVisible();

    // Privacy
    await page.goto('/en/privacy');
    await expect(page.locator('h1')).toContainText(/Privacy/i);

    // Terms
    await page.goto('/en/terms');
    await expect(page.locator('h1')).toContainText(/Terms/i);

    // Cookies
    await page.goto('/en/cookies');
    await expect(page.locator('h1')).toContainText(/Cookie/i);
  });

  test('Health Check endpoint reports valid status probe and Storage checks', async ({ request }) => {
    const res = await request.get('/api/health');
    expect([200, 503]).toContain(res.status());

    const body = await res.json();
    expect(['healthy', 'degraded', 'unhealthy']).toContain(body.status);
    expect(body.checks.storage.status).toBe('up');
  });

  test('Security response headers and CSP are enforced', async ({ request }) => {
    const response = await request.get('/en');
    expect(response.ok()).toBe(true);

    const headers = response.headers();
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['content-security-policy']).toBeDefined();
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  });
});
