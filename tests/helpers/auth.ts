import { Page } from '@playwright/test';

export const USERS = {
  standard: { username: 'standard_user', password: 'secret_sauce' },
  locked:   { username: 'locked_out_user', password: 'secret_sauce' },
  problem:  { username: 'problem_user', password: 'secret_sauce' },
  performance: { username: 'performance_glitch_user', password: 'secret_sauce' },
} as const;

export async function login(page: Page, user: keyof typeof USERS = 'standard') {
  await page.goto('/');
  await page.fill('#user-name', USERS[user].username);
  await page.fill('#password', USERS[user].password);
  await page.click('#login-button');
  await page.waitForURL('**/inventory.html');
}

export async function addItemToCart(page: Page, itemIndex = 0) {
  const addButtons = page.locator('[data-test^="add-to-cart"]');
  await addButtons.nth(itemIndex).click();
}

export async function proceedToCheckout(page: Page) {
  await page.click('.shopping_cart_link');
  await page.click('[data-test="checkout"]');
  await page.fill('[data-test="firstName"]', 'Michael');
  await page.fill('[data-test="lastName"]', 'Smith');
  await page.fill('[data-test="postalCode"]', '19073');
  await page.click('[data-test="continue"]');
}
