import { test, expect, chromium } from '@playwright/test';
import path from 'path';

const extensionPath = path.resolve(__dirname, '../../dist');

test.describe('Agentation Extension', () => {
  test.skip(true, 'E2E tests require built extension — run manually with: pnpm build && npx playwright test');

  test('loads extension and shows toolbar badge', async () => {
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });

    const page = await context.newPage();
    await page.goto('file://' + path.resolve(__dirname, '../fixtures/react-app/index.html'));
    await page.waitForTimeout(1000);

    // Check that the agentation-root element exists
    const host = await page.locator('agentation-root').count();
    expect(host).toBe(1);

    await context.close();
  });

  test('annotates element and copies markdown', async () => {
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });

    const page = await context.newPage();
    await page.goto('file://' + path.resolve(__dirname, '../fixtures/react-app/index.html'));
    await page.waitForTimeout(1000);

    // Activate toolbar via keyboard shortcut
    await page.keyboard.press('Control+Shift+F');
    await page.waitForTimeout(500);

    // Click on a button element
    await page.click('.btn-primary');
    await page.waitForTimeout(500);

    // Type comment in popup textarea (inside shadow DOM)
    // Note: Shadow DOM access requires special handling
    // This is a scaffold — detailed selectors depend on actual DOM structure

    await context.close();
  });
});
