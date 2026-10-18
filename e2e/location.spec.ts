import { expect, test, type Page } from '@playwright/test';
import { LAPTOP_GPS, PHONE_GPS, useFakeGps } from './gps';
import { mockApis } from './mocks';

const coords = (page: Page) => page.locator('p.font-mono', { hasText: '°' }).first();

test.describe('Location accuracy', () => {
  test('refines a coarse first fix to the GPS fix and re-searches at the corrected spot', async ({
    page,
    context,
  }) => {
    await useFakeGps(context, PHONE_GPS);
    await mockApis(page);
    const searched: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes('/api/interpreter')) searched.push(r.postData() ?? '');
    });

    await page.goto('/');
    await page.getByRole('button', { name: 'Locate me' }).click();

    // Results appear straight away for the rough fix, while GPS keeps improving it.
    await expect(page.getByText('Closest help')).toBeVisible();
    await expect(coords(page)).toContainText('28.6315° N, 77.2167° E', { timeout: 15_000 });
    await expect(coords(page)).toContainText('±10 m');
    expect(searched.some((q) => decodeURIComponent(q).includes('28.631500,77.216700'))).toBe(true);
  });

  test('warns when the location stays approximate and lets the user pin the exact spot', async ({
    page,
    context,
  }) => {
    test.slow();
    await useFakeGps(context, LAPTOP_GPS);
    await mockApis(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Locate me' }).click();

    await expect(page.getByText('Approximate location.')).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Set exact spot' }).click();

    const dialog = page.getByRole('dialog', { name: 'Set your exact location' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Set my location here' }).click();

    await expect(page.getByText('Pinned location')).toBeVisible();
    await expect(page.getByText('Approximate location.')).toBeHidden();
  });

  test('re-locating shows progress instead of doing nothing', async ({ page, context }) => {
    await useFakeGps(context, PHONE_GPS);
    await mockApis(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Locate me' }).click();
    await expect(coords(page)).toContainText('±10 m', { timeout: 15_000 });

    await page.getByRole('button', { name: 'Use my current location' }).click();
    await expect(page.locator('[aria-busy="true"]').first()).toBeAttached();
  });
});

test.describe('Navigation and safety', () => {
  test('the system Back button steps back inside the app', async ({ page }) => {
    await mockApis(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Locate me' }).click();
    await page.locator('article', { hasText: 'Hospital' }).getByRole('button', { name: /^\+\d/ }).click();
    await expect(page.getByRole('heading', { name: 'Hospitals' })).toBeVisible();
    await page.locator('ol button').first().click();
    await expect(page.getByRole('link', { name: /Navigate/ })).toBeVisible();

    await page.goBack();
    await expect(page.getByRole('heading', { name: 'Hospitals' })).toBeVisible();
    await page.goBack();
    await expect(page.getByText('Closest help')).toBeVisible();
    expect(new URL(page.url()).origin).toBe(new URL(test.info().project.use.baseURL!).origin);
  });

  test('the alarm still flashes when the device cannot play sound', async ({ page, context }) => {
    await context.addInitScript(() => {
      // Simulate a browser that refuses audio.
      Object.defineProperty(window, 'AudioContext', { value: undefined, configurable: true });
      Object.defineProperty(window, 'webkitAudioContext', { value: undefined, configurable: true });
    });
    await mockApis(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Locate me' }).click();
    await page.getByRole('tab', { name: /SOS/ }).click();

    const hold = page.getByRole('button', { name: 'Hold to sound the alarm' });
    await hold.scrollIntoViewIfNeeded();
    const box = (await hold.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    const alarm = page.getByRole('button', { name: 'Stop alarm' });
    await expect(alarm).toBeVisible({ timeout: 5_000 });
    await page.mouse.up();

    await expect(alarm).toContainText('Sound unavailable');
    await page.waitForTimeout(500);
    await expect(alarm).toBeVisible(); // must not close itself
    await alarm.click();
    await expect(alarm).toBeHidden();
  });
});
