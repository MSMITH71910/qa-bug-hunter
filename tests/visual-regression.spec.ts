import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Visual Regression — Screenshot Assertions', () => {

  test.beforeEach(async ({ page }) => {
    await login(page, 'standard');
  });

  test('VR-001: Products page layout is visually stable', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('products-page.png', {
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    });
  });

  test('VR-002: Cart icon badge renders correctly after adding an item', async ({ page }) => {
    await page.locator('[data-test^="add-to-cart"]').first().click();
    await expect(page.locator('.shopping_cart_link')).toHaveScreenshot('cart-badge.png', {
      maxDiffPixelRatio: 0.01,
    });
  });

  test('VR-003: Product detail page layout matches baseline', async ({ page }) => {
    await page.locator('.inventory_item_name').first().click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('product-detail.png', {
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    });
  });

  test('VR-004: Checkout form renders without pixel drift', async ({ page }) => {
    await page.locator('[data-test^="add-to-cart"]').first().click();
    await page.click('.shopping_cart_link');
    await page.click('[data-test="checkout"]');
    await expect(page.locator('.checkout_info')).toHaveScreenshot('checkout-form.png', {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    });
  });

  test('VR-005: Error message styling matches design system', async ({ page }) => {
    await page.goto('/');
    await page.fill('#user-name', 'locked_out_user');
    await page.fill('#password', 'secret_sauce');
    await page.click('#login-button');
    await expect(page.locator('[data-test="error"]')).toHaveScreenshot('login-error.png', {
      maxDiffPixelRatio: 0.01,
    });
  });

  test('VR-006: Order confirmation page — detect any layout regression', async ({ page }) => {
    await page.locator('[data-test^="add-to-cart"]').first().click();
    await page.click('.shopping_cart_link');
    await page.click('[data-test="checkout"]');
    await page.fill('[data-test="firstName"]', 'Michael');
    await page.fill('[data-test="lastName"]', 'Smith');
    await page.fill('[data-test="postalCode"]', '19073');
    await page.click('[data-test="continue"]');
    await page.click('[data-test="finish"]');
    await expect(page).toHaveScreenshot('order-complete.png', {
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    });
  });

});
