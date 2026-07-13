import { test, expect } from '@playwright/test';
import { login, addItemToCart, proceedToCheckout } from './helpers/auth';

test.describe('Happy Path — SauceDemo E2E', () => {

  test('TC-001: Successful login with standard_user', async ({ page }) => {
    await login(page, 'standard');
    await expect(page).toHaveURL(/inventory/);
    await expect(page.locator('.title')).toHaveText('Products');
  });

  test('TC-002: Locked-out user receives correct error message', async ({ page }) => {
    await page.goto('/');
    await page.fill('#user-name', 'locked_out_user');
    await page.fill('#password', 'secret_sauce');
    await page.click('#login-button');
    const error = page.locator('[data-test="error"]');
    await expect(error).toBeVisible();
    await expect(error).toContainText('Sorry, this user has been locked out');
  });

  test('TC-003: Add item to cart and verify cart badge', async ({ page }) => {
    await login(page, 'standard');
    await addItemToCart(page, 0);
    await expect(page.locator('.shopping_cart_badge')).toHaveText('1');
  });

  test('TC-004: Full checkout flow — add item, checkout, confirm order', async ({ page }) => {
    await login(page, 'standard');
    await addItemToCart(page, 0);
    await proceedToCheckout(page);

    await expect(page.locator('[data-test="payment-info-label"]')).toBeVisible();

    await page.click('[data-test="finish"]');
    await expect(page.locator('[data-test="complete-header"]')).toHaveText('Thank you for your order!');
  });

  test('TC-005: Sort products by Price (low to high) and verify order', async ({ page }) => {
    await login(page, 'standard');
    await page.selectOption('[data-test="product-sort-container"]', 'lohi');

    const prices = page.locator('.inventory_item_price');
    const count = await prices.count();
    const values: number[] = [];
    for (let i = 0; i < count; i++) {
      const text = await prices.nth(i).textContent();
      values.push(parseFloat(text!.replace('$', '')));
    }
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThanOrEqual(values[i - 1]);
    }
  });

  test('TC-006: Remove item from cart and verify badge disappears', async ({ page }) => {
    await login(page, 'standard');
    await addItemToCart(page, 0);
    await expect(page.locator('.shopping_cart_badge')).toHaveText('1');

    await page.locator('[data-test^="remove"]').first().click();
    await expect(page.locator('.shopping_cart_badge')).not.toBeVisible();
  });

  test('TC-007: Navigate to product detail page and verify content', async ({ page }) => {
    await login(page, 'standard');
    await page.locator('.inventory_item_name').first().click();
    await expect(page.locator('.inventory_details_name')).toBeVisible();
    await expect(page.locator('.inventory_details_price')).toBeVisible();
    await expect(page.locator('[data-test^="add-to-cart"]')).toBeVisible();
  });

  test('TC-008: Burger menu opens and logout works', async ({ page }) => {
    await login(page, 'standard');
    await page.click('#react-burger-menu-btn');
    await page.waitForSelector('#logout_sidebar_link', { state: 'visible' });
    await page.click('#logout_sidebar_link');
    await expect(page).toHaveURL('/');
    await expect(page.locator('#login-button')).toBeVisible();
  });

});
