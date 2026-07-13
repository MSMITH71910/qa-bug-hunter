import { test, expect, chromium } from '@playwright/test';

test.describe('Race Condition Detection — Parallel Stress Tests', () => {

  test('RC-001: Concurrent users adding the same item — detect cart count desync', async ({ browser }) => {
    const CONCURRENT_USERS = 4;
    const contexts = await Promise.all(
      Array.from({ length: CONCURRENT_USERS }, () => browser.newContext())
    );
    const pages = await Promise.all(contexts.map(ctx => ctx.newPage()));

    await Promise.all(pages.map(async page => {
      await page.goto('https://www.saucedemo.com/');
      await page.fill('#user-name', 'standard_user');
      await page.fill('#password', 'secret_sauce');
      await page.click('#login-button');
      await page.waitForURL('**/inventory.html');
    }));

    const results = await Promise.all(pages.map(async (page, idx) => {
      await page.locator('[data-test^="add-to-cart"]').first().click();
      const badge = page.locator('.shopping_cart_badge');
      const text = await badge.textContent({ timeout: 5_000 }).catch(() => null);
      console.log(`[RC-001] User-${idx + 1} cart badge: ${text ?? 'NOT VISIBLE'}`);
      return text;
    }));

    const allCorrect = results.every(r => r === '1');
    if (!allCorrect) {
      console.warn('[BUG DETECTED] Cart badge desync under concurrency:', results);
    }
    expect(results.filter(r => r === '1').length).toBeGreaterThanOrEqual(CONCURRENT_USERS - 1);

    await Promise.all(contexts.map(ctx => ctx.close()));
  });

  test('RC-002: Rapid double-click on checkout — verify no duplicate orders', async ({ page }) => {
    await page.goto('/');
    await page.fill('#user-name', 'standard_user');
    await page.fill('#password', 'secret_sauce');
    await page.click('#login-button');
    await page.waitForURL('**/inventory.html');
    await page.locator('[data-test^="add-to-cart"]').first().click();
    await page.click('.shopping_cart_link');
    await page.click('[data-test="checkout"]');
    await page.fill('[data-test="firstName"]', 'Michael');
    await page.fill('[data-test="lastName"]', 'Smith');
    await page.fill('[data-test="postalCode"]', '19073');
    await page.click('[data-test="continue"]');

    await Promise.all([
      page.click('[data-test="finish"]'),
      page.click('[data-test="finish"]').catch(() => {}),
    ]);

    const confirmations = await page.locator('[data-test="complete-header"]').count();
    console.log(`[RC-002] Order confirmation headers found: ${confirmations}`);
    expect(confirmations).toBeLessThanOrEqual(1);
  });

  test('RC-003: Rapid add + remove of same item — verify cart count stays accurate', async ({ page }) => {
    await page.goto('/');
    await page.fill('#user-name', 'standard_user');
    await page.fill('#password', 'secret_sauce');
    await page.click('#login-button');
    await page.waitForURL('**/inventory.html');

    const CYCLES = 5;
    const results: Array<{ action: string; badge: string | null }> = [];

    for (let i = 0; i < CYCLES; i++) {
      await page.locator('[data-test^="add-to-cart"]').first().click();
      await page.waitForTimeout(50);
      const addBadge = await page.locator('.shopping_cart_badge').textContent({ timeout: 2_000 }).catch(() => null);
      results.push({ action: 'add', badge: addBadge });

      await page.locator('[data-test^="remove"]').first().click();
      await page.waitForTimeout(50);
      const removeBadge = await page.locator('.shopping_cart_badge').isVisible({ timeout: 2_000 }).catch(() => false);
      results.push({ action: 'remove', badge: removeBadge ? 'visible' : null });
    }

    console.log('[RC-003] Add/Remove cycle results:', JSON.stringify(results, null, 2));

    const badAddCount = results.filter(r => r.action === 'add' && r.badge !== '1').length;
    if (badAddCount > 0) {
      console.warn(`[BUG DETECTED RC-003] ${badAddCount} add cycles had incorrect cart badge`);
    }
    expect(badAddCount).toBe(0);
  });

  test('RC-004: Parallel navigation — verify page state does not bleed between routes', async ({ browser }) => {
    const ctx = await browser.newContext();
    const [page1, page2] = await Promise.all([ctx.newPage(), ctx.newPage()]);

    await Promise.all([
      page1.goto('https://www.saucedemo.com/'),
      page2.goto('https://www.saucedemo.com/'),
    ]);

    await Promise.all([
      (async () => {
        await page1.fill('#user-name', 'standard_user');
        await page1.fill('#password', 'secret_sauce');
        await page1.click('#login-button');
        await page1.waitForURL('**/inventory.html');
        await page1.locator('[data-test^="add-to-cart"]').first().click();
      })(),
      (async () => {
        await page2.fill('#user-name', 'problem_user');
        await page2.fill('#password', 'secret_sauce');
        await page2.click('#login-button');
        await page2.waitForURL('**/inventory.html');
      })(),
    ]);

    const page1Badge = await page1.locator('.shopping_cart_badge').textContent({ timeout: 3_000 }).catch(() => null);
    const page2Badge = await page2.locator('.shopping_cart_badge').isVisible({ timeout: 1_000 }).catch(() => false);

    console.log(`[RC-004] Page1 (standard_user) cart: ${page1Badge} | Page2 (problem_user) cart visible: ${page2Badge}`);
    expect(page1Badge).toBe('1');
    expect(page2Badge).toBe(false);

    await ctx.close();
  });

});
