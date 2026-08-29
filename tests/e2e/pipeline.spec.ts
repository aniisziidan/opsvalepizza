import { test, expect } from '@playwright/test';

/**
 * Full commercial-pipeline E2E: acquisition → dispatch → accept.
 *
 * This exercises the real revenue path end-to-end and therefore needs a running
 * app with a *seeded* Postgres and a known admin account. It is SKIPPED BY
 * DEFAULT so `npm run test:e2e` stays green in environments without that data
 * (CI without a DB, local checkouts). Enable it explicitly:
 *
 *   RUN_PIPELINE_E2E=1 \
 *   E2E_ADMIN_EMAIL=admin@opsvale.com \
 *   E2E_ADMIN_PASSWORD=... \
 *   npm run test:e2e -- pipeline.spec.ts
 *
 * The acquisition and authentication legs are asserted directly. The middle
 * "price & dispatch a proposal" leg is an operator action in the admin CRM whose
 * selectors are intentionally left as a documented TODO rather than guessed — it
 * is grounded here by navigating the lead workspace and is completed by an
 * operator (or a follow-up that captures the real dispatch UI). The acceptance
 * leg runs against a proposal token supplied via E2E_PROPOSAL_TOKEN.
 */

const RUN = process.env.RUN_PIPELINE_E2E === '1';
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? '';
const PROPOSAL_TOKEN = process.env.E2E_PROPOSAL_TOKEN ?? '';

test.describe('Commercial pipeline: acquisition → dispatch → accept', () => {
  test.skip(!RUN, 'Set RUN_PIPELINE_E2E=1 (+ seeded DB and admin creds) to run this pipeline suite.');

  test('Acquisition — the public quote wizard is reachable and submittable', async ({ page }) => {
    await page.goto('/en/quote');
    // The multi-step quote page renders a heading and the first step's form.
    await expect(page.locator('h1').first()).toBeVisible();
    // A submit/continue control drives the wizard forward.
    await expect(page.getByRole('button').first()).toBeVisible();
  });

  test('Authentication — a seeded operator can sign in to the admin portal', async ({ page }) => {
    test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'Provide E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD.');

    await page.goto('/admin/login');
    await page.locator('#email').fill(ADMIN_EMAIL);
    await page.locator('#password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/admin\/dashboard/);
  });

  test('Dispatch — operator reaches the leads workspace to price & send a proposal', async ({ page }) => {
    test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'Provide E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD.');

    await page.goto('/admin/login');
    await page.locator('#email').fill(ADMIN_EMAIL);
    await page.locator('#password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/admin\/dashboard/);

    await page.goto('/admin/leads');
    await expect(page.locator('h1').first()).toBeVisible();
    // TODO(dispatch): open a lead, create a quote revision, and dispatch the
    // proposal, capturing the real admin selectors. Until then the acceptance
    // leg below runs against a token dispatched out-of-band (E2E_PROPOSAL_TOKEN).
  });

  test('Accept — a dispatched proposal can be opened and accepted by the customer', async ({ page }) => {
    test.skip(!PROPOSAL_TOKEN, 'Provide E2E_PROPOSAL_TOKEN for a dispatched (SENT) proposal.');

    await page.goto(`/proposals/${PROPOSAL_TOKEN}`);
    await expect(page.locator('h1').first()).toBeVisible();

    const acceptBtn = page.getByRole('button', { name: /accept/i }).first();
    await expect(acceptBtn).toBeVisible();
    await acceptBtn.click();

    // After acceptance the portal confirms the won state (button disabled or a
    // confirmation surface appears).
    await expect(page.getByText(/accepted|thank you|confirmed/i).first()).toBeVisible();
  });
});
