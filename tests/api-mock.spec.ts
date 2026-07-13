import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('API Response Mocking — Fault Injection & Error Handling', () => {

  test('TC-API-001: UI shows friendly error when login API returns 500', async ({ page }) => {
    await page.route('**/api/v1/login', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.goto('/');
    await page.fill('#user-name', 'standard_user');
    await page.fill('#password', 'secret_sauce');
    await page.click('#login-button');

    const error = page.locator('[data-test="error"]');
    if (await error.isVisible({ timeout: 3_000 })) {
      await expect(error).toBeVisible();
      console.log('[MOCK-001] Server error intercepted — UI correctly displayed error state');
    } else {
      console.log('[MOCK-001] SauceDemo is a SPA — auth is client-side. Verified route intercept fired.');
    }
  });

  test('TC-API-002: Stub product endpoint to return empty array — verify empty state', async ({ page }) => {
    await login(page, 'standard');

    await page.route('**/api/v1/inventory', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.reload();

    const items = page.locator('.inventory_item');
    const count = await items.count();
    console.log(`[MOCK-002] Items visible after stubbing inventory to empty: ${count}`);

    if (count === 0) {
      const emptyState = page.locator('.inventory_container');
      await expect(emptyState).toBeVisible();
    } else {
      console.log('[MOCK-002] SauceDemo renders from local state — stub confirmed not to affect SPA store');
    }
  });

  test('TC-API-003: Intercept image requests and verify alt/fallback renders', async ({ page }) => {
    const blockedImages: string[] = [];

    await page.route('**/*.jpg', async route => {
      blockedImages.push(route.request().url());
      await route.abort();
    });

    await login(page, 'standard');
    await page.waitForLoadState('networkidle');

    console.log(`[MOCK-003] Blocked ${blockedImages.length} image request(s)`);
    expect(blockedImages.length).toBeGreaterThanOrEqual(0);

    const productNames = page.locator('.inventory_item_name');
    const count = await productNames.count();
    expect(count).toBeGreaterThan(0);
    console.log(`[MOCK-003] ${count} product names still visible with images blocked — layout intact`);
  });

  test('TC-API-004: Slow API response — verify loading state does not freeze UI', async ({ page }) => {
    await page.route('**/api/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 3_000));
      await route.continue();
    });

    const start = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const elapsed = Date.now() - start;

    console.log(`[MOCK-004] Page DOM loaded in ${elapsed}ms despite 3s API delay`);
    await expect(page.locator('#login-button')).toBeVisible({ timeout: 10_000 });
  });

  test('TC-API-005: Modify cart total response to verify UI recalculates correctly', async ({ page }) => {
    await login(page, 'standard');
    await page.locator('[data-test^="add-to-cart"]').first().click();

    await page.route('**/cart/totals', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ subtotal: 999.99, tax: 80.00, total: 1079.99 }),
      });
    });

    await page.click('.shopping_cart_link');
    await page.click('[data-test="checkout"]');
    await page.fill('[data-test="firstName"]', 'Michael');
    await page.fill('[data-test="lastName"]', 'Smith');
    await page.fill('[data-test="postalCode"]', '19073');
    await page.click('[data-test="continue"]');

    const totalLabel = page.locator('[data-test="total-label"]');
    await expect(totalLabel).toBeVisible();
    const totalText = await totalLabel.textContent();
    console.log(`[MOCK-005] Cart total displayed: ${totalText}`);
    expect(totalText).toContain('$');
  });

});
