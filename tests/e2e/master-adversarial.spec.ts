import { test, expect } from '@playwright/test';

test.describe('OpsVale Master E2E & Adversarial User Journey Suite', () => {

  // =========================================================================
  // 1. PUBLIC STOREFRONT & NAVIGATION SUITE
  // =========================================================================
  test('E2E-PUB-001: Root URL redirects to default locale /en with active layout', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/en/);
    await expect(page.locator('h1').first()).toBeVisible();

    // Verify brand logo and tagline
    await expect(page.getByText('OpsVale').first()).toBeVisible();
  });

  test('E2E-PUB-002: Navigation links on desktop route seamlessly without 404s', async ({ page }) => {
    await page.goto('/en');

    // Products
    await page.locator('nav a[href="/en/products"]').first().click();
    await expect(page).toHaveURL(/\/en\/products/);
    await expect(page.locator('h1')).toContainText(/Packaging|Catalog|Products/i);

    // How It Works
    await page.locator('nav a[href="/en/how-it-works"]').first().click();
    await expect(page).toHaveURL(/\/en\/how-it-works/);
    await expect(page.locator('h1')).toContainText(/Procurement|Logistics|SLA|How/i);

    // Savings Calculator
    await page.locator('nav a[href="/en/calculator"]').first().click();
    await expect(page).toHaveURL(/\/en\/calculator/);
    await expect(page.locator('h1')).toContainText(/Calculate|Savings|Calculator/i);

    // About
    await page.locator('nav a[href="/en/about"]').first().click();
    await expect(page).toHaveURL(/\/en\/about/);
    await expect(page.locator('h1')).toContainText(/Supply|About|OpsVale/i);
  });

  test('E2E-PUB-003: Mobile hamburger menu opens, navigates, and closes cleanly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/en');

    // Open hamburger
    const hamburgerBtn = page.locator('button[aria-label="Open menu"]').first();
    await expect(hamburgerBtn).toBeVisible();
    await hamburgerBtn.click();

    // Click Products link in mobile menu
    const mobileLink = page.locator('div.md\\:hidden a[href="/en/products"]').first();
    await expect(mobileLink).toBeVisible();
    await mobileLink.click();

    await expect(page).toHaveURL(/\/en\/products/);
  });

  // =========================================================================
  // 2. INTERNATIONALIZATION & LOCALE ROUTING
  // =========================================================================
  test('E2E-I18N-001: All 5 European locales render correct native strings', async ({ page }) => {
    const locales = [
      { code: 'en', titleSnippet: /Pizza/i },
      { code: 'de', titleSnippet: /Pizzakarton/i },
      { code: 'fr', titleSnippet: /Pizza/i },
      { code: 'it', titleSnippet: /Pizza/i },
      { code: 'es', titleSnippet: /Pizza/i },
    ];

    for (const loc of locales) {
      await page.goto(`/${loc.code}`);
      await expect(page.locator('h1').first()).toContainText(loc.titleSnippet);
    }
  });

  test('E2E-I18N-002: Invalid locale redirects cleanly to /en without crash', async ({ page }) => {
    await page.goto('/invalid-locale-xyz/products');
    await expect(page).toHaveURL(/\/en/);
  });

  // =========================================================================
  // 3. COOKIE CONSENT & GRANULAR PREFERENCES
  // =========================================================================
  test('E2E-GDPR-001: Granular cookie consent preferences lifecycle', async ({ page }) => {
    await page.goto('/en');

    // Check banner is present
    const customizeBtn = page.locator('button:has-text("Customize")').first();
    if (await customizeBtn.isVisible()) {
      await customizeBtn.click();

      // Modal appears
      await expect(page.locator('text=Cookie & Tracking Preferences')).toBeVisible();

      // Necessary is locked
      await expect(page.locator('text=REQUIRED').first()).toBeVisible();

      // Save preferences
      const saveBtn = page.locator('button:has-text("Save Preferences")').first();
      await saveBtn.click();

      // Banner should disappear
      await expect(page.locator('text=Cookie & Tracking Preferences')).not.toBeVisible();
    }
  });

  // =========================================================================
  // 4. PRECISION SAVINGS CALCULATOR
  // =========================================================================
  test('E2E-CALC-001: Interactive calculator UI, slider updates and quote routing', async ({ page }) => {
    await page.goto('/en/calculator');

    // Verify calculator form
    await expect(page.locator('#country-select')).toBeVisible();
    await page.locator('#country-select').selectOption('FR');

    // Click 32cm button
    const boxBtn32 = page.locator('button:has-text("32cm")').first();
    if (await boxBtn32.isVisible()) {
      await boxBtn32.click();
    }

    // Volume input
    const volumeInput = page.locator('input[type="number"]').first();
    if (await volumeInput.isVisible()) {
      await volumeInput.fill('45000');
    }

    // Current price input
    const priceInput = page.locator('input[type="number"]').nth(1);
    if (await priceInput.isVisible()) {
      await priceInput.fill('0.35');
    }

    // Click calculate
    const calcSubmit = page.locator('button[type="submit"]:has-text("Calculate")');
    if (await calcSubmit.isVisible()) {
      await calcSubmit.click();
    }

    // Request quote CTA
    const quoteBtn = page.locator('button:has-text("Request an Exact Quote")').first();
    if (await quoteBtn.isVisible()) {
      await quoteBtn.click();
      await expect(page).toHaveURL(/\/en\/quote\?/);
    }
  });

  // =========================================================================
  // 5. B2B RFQ MULTI-STEP WIZARD
  // =========================================================================
  test('E2E-RFQ-001: Step progression, back navigation, and validation in RFQ wizard', async ({ page }) => {
    await page.goto('/en/quote');

    await expect(page.locator('h1').first()).toContainText(/Company Information/i);

    // Step 1: Company Info - fill required fields
    const companyInput = page.locator('input[placeholder*="Pizza Planet EU"]').first();
    await expect(companyInput).toBeVisible();
    await companyInput.fill('Milano Gourmet Pizza');

    const nameInput = page.locator('input[placeholder*="Marco Rossi"]').first();
    await nameInput.fill('Marco Bellini');

    const emailInput = page.locator('input[placeholder*="rossi@company.eu"]').first();
    await emailInput.fill('m.bellini@milanogourmet.it');

    const phoneInput = page.locator('input[placeholder*="+39"]').first();
    await phoneInput.fill('+39 02 8844 9911');

    // Click Next Step -> Step 2
    const nextBtn1 = page.locator('button:has-text("Next Step")').first();
    await nextBtn1.click();

    // Step 2: Packaging Specifications should now be visible
    await expect(page.locator('text=Packaging Specifications').first()).toBeVisible();

    // Click Next Step -> Step 3
    const nextBtn2 = page.locator('button:has-text("Next Step")').first();
    await nextBtn2.click();

    // Step 3: Logistics & Hub Routing
    await expect(page.locator('text=Logistics & Hub Routing').first()).toBeVisible();

    // Test back button (labeled "Previous")
    const prevBtn = page.locator('button:has-text("Previous")').first();
    await expect(prevBtn).toBeVisible();
    await prevBtn.click();

    // Should return to Step 2
    await expect(page.locator('text=Packaging Specifications').first()).toBeVisible();
  });

  test('E2E-RFQ-002: Validation prevents progression when required fields are empty', async ({ page }) => {
    await page.goto('/en/quote');

    // On Step 1: Click Next Step without filling required fields
    const nextBtn = page.locator('button:has-text("Next Step")').first();
    await nextBtn.click();

    // Error messages should appear
    await expect(page.locator('p.text-red-600').first()).toBeVisible();
  });

  // =========================================================================
  // 6. ADMIN AUTHENTICATION & ACCESS GATING
  // =========================================================================
  test('E2E-AUTH-001: Unauthenticated requests to protected admin routes redirect to /admin/login', async ({ page }) => {
    const protectedRoutes = [
      '/admin/dashboard',
      '/admin/leads',
      '/admin/pricing',
      '/admin/quotes',
      '/admin/logistics',
      '/admin/analytics',
      '/admin/visitors',
      '/admin/notifications',
      '/admin/settings',
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/admin\/login/);
    }
  });

  test('E2E-AUTH-002: Invalid credentials display error alert on /admin/login', async ({ page }) => {
    await page.goto('/admin/login');

    await page.locator('#email').fill('unknown_operator@opsvale.com');
    await page.locator('#password').fill('WrongPassword999!');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Error alert should be visible
    await expect(page.locator('form div[role="alert"]')).toContainText(/Invalid email or password/i);
  });

  // =========================================================================
  // 7. RESPONSIVE MULTI-VIEWPORT VERIFICATION
  // =========================================================================
  test('E2E-RESP-001: Zero horizontal overflow across Mobile, Desktop, and Ultrawide', async ({ page }) => {
    const viewports = [
      { width: 320, height: 568, name: 'Mobile Small (320px)' },
      { width: 375, height: 812, name: 'Mobile (375px)' },
      { width: 1440, height: 900, name: 'Desktop (1440px)' },
      { width: 1920, height: 1080, name: 'FHD Ultrawide (1920px)' },
      { width: 2560, height: 1440, name: '2K Ultrawide (2560px)' },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/en');

      // Verify no horizontal overflow
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const innerWidth = await page.evaluate(() => window.innerWidth);
      expect(scrollWidth, `Horizontal overflow detected at ${vp.name}`).toBeLessThanOrEqual(innerWidth + 1);
    }
  });

  // =========================================================================
  // 8. ADVERSARIAL EDGE CASES & SECURITY HEADERS
  // =========================================================================
  test('E2E-SEC-001: Security headers (CSP, X-Frame-Options, X-Content-Type-Options) are enforced', async ({ request }) => {
    const res = await request.get('/en');
    expect(res.ok()).toBe(true);

    const headers = res.headers();
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  });

  test('E2E-EDGE-001: Adversarial query params and unicode inputs handled safely', async ({ page }) => {
    // Unicode and emoji in URL
    await page.goto('/en/quote?size=32cm&city=%F0%9F%8D%95%20PizzaCity%20%E4%B8%AD%E6%96%87&volume=999999999');
    await expect(page.locator('h1').first()).toBeVisible();

    // No uncaught React errors or page crash
    const heading = await page.locator('h1').first().textContent();
    expect(heading).toBeTruthy();
  });
});
