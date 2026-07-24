import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Network Throttle — Slow 3G Simulation', () => {

  test('TC-NET-001: Login loads within 15s on Slow 3G (500ms RTT / 400kbps down)', async ({ page, context }) => {
    const cdpSession = await context.newCDPSession(page);
    await cdpSession.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 400 * 1024 / 8,
      uploadThroughput: 400 * 1024 / 8,
      latency: 500,
    });

    const start = Date.now();
    await page.goto('/');
    await page.fill('#user-name', 'standard_user');
    await page.fill('#password', 'secret_sauce');
    await page.click('#login-button');
    await page.waitForURL('**/inventory.html', { timeout: 15_000 });
    const elapsed = Date.now() - start;

    console.log(`[PERF] Login on Slow 3G completed in ${elapsed}ms`);
    expect(elapsed).toBeLessThan(15_000);
  });

  test('TC-NET-002: Product images render (or show fallback) on Slow 3G', async ({ page, context }) => {
    const cdpSession = await context.newCDPSession(page);
    await cdpSession.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 400 * 1024 / 8,
      uploadThroughput: 400 * 1024 / 8,
      latency: 500,
    });

    await login(page, 'standard');
    await page.waitForLoadState('domcontentloaded');

    const images = page.locator('.inventory_item_img img');
    const count = await images.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      await expect(img).toBeVisible({ timeout: 12_000 });
    }
  });

  test('TC-NET-003: Cart persists item across slow page reload', async ({ page, context }) => {
    await login(page, 'standard');
    await page.locator('[data-test^="add-to-cart"]').first().click();
    await expect(page.locator('.shopping_cart_badge')).toHaveText('1');

    const cdpSession = await context.newCDPSession(page);
    await cdpSession.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 400 * 1024 / 8,
      uploadThroughput: 400 * 1024 / 8,
      latency: 500,
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('.shopping_cart_badge')).toHaveText('1');
  });

  test('TC-NET-004: Checkout form submission works under 3G latency', async ({ page, context }) => {
    await login(page, 'standard');
    await page.locator('[data-test^="add-to-cart"]').first().click();

    const cdpSession = await context.newCDPSession(page);
    await cdpSession.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 400 * 1024 / 8,
      uploadThroughput: 400 * 1024 / 8,
      latency: 500,
    });

    await page.click('.shopping_cart_link');
    await page.click('[data-test="checkout"]');
    await page.fill('[data-test="firstName"]', 'Michael');
    await page.fill('[data-test="lastName"]', 'Smith');
    await page.fill('[data-test="postalCode"]', '19073');
    await page.click('[data-test="continue"]');

    await expect(page.locator('[data-test="payment-info-label"]')).toBeVisible({ timeout: 15_000 });
  });

});
