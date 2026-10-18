import { expect, test } from '@playwright/test';
import { PLACES, mockApis } from './mocks';

test.describe('Beacon', () => {
  test('landing explains the app and offers an emergency number before any location', async ({ page }) => {
    await mockApis(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Nearest help/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Locate me' })).toBeVisible();
    await expect(page.getByRole('link', { name: /In immediate danger\? Call/ })).toHaveAttribute(
      'href',
      /^tel:/,
    );
  });

  test('one tap finds help ranked by travel time, not straight-line distance', async ({ page }) => {
    const cspViolations: string[] = [];
    page.on(
      'console',
      (m) => /Content Security Policy|Refused to/i.test(m.text()) && cspViolations.push(m.text()),
    );
    await mockApis(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Locate me' }).click();

    await expect(page.getByRole('heading', { name: 'Janpath, New Delhi' })).toBeVisible();
    // The nearer hospital takes 15 min by road; the further one 4 min — the card must show the latter.
    const hospitalCard = page.locator('article', { hasText: 'Hospital' }).first();
    await expect(hospitalCard).toContainText(PLACES.hospitalFarFast.name);
    await expect(hospitalCard).toContainText('ER');
    await expect(page.locator('article', { hasText: 'Pharmacy' })).toContainText('Open 24/7');
    await expect(page.locator('article', { hasText: 'Police' })).toContainText(
      'Connaught Place Police Station',
    );
    await expect(page.locator('article', { hasText: 'Fuel' })).toContainText('Indian Oil');
    // The preview server sends the production CSP; nothing in the flow may violate it.
    expect(cspViolations).toEqual([]);
  });

  test('a place shows route, directions and hand-off to navigation apps', async ({ page }) => {
    await mockApis(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Locate me' }).click();
    await page.getByRole('button', { name: PLACES.hospitalFarFast.name }).click();

    await expect(page.getByRole('heading', { name: PLACES.hospitalFarFast.name })).toBeVisible();
    await expect(page.getByText('Emergency department')).toBeVisible();
    await expect(page.getByRole('link', { name: /Navigate/ })).toHaveAttribute(
      'href',
      /google\.com\/maps\/dir\/\?api=1&destination=28\.626200,77\.200600&travelmode=driving/,
    );
    await expect(page.getByRole('link', { name: /Call Ram Manohar Lohia/ })).toHaveAttribute(
      'href',
      'tel:+911123365525',
    );

    await page.getByRole('button', { name: /Turn-by-turn/ }).click();
    await expect(page.getByText('Turn left onto Ashoka Road')).toBeVisible();
    await expect(page.getByText('Arrive — destination is on your right')).toBeVisible();
  });

  test('road weather surfaces a thunderstorm as a danger alert', async ({ page }) => {
    await mockApis(page, { thunderstorm: true });
    await page.goto('/');
    await page.getByRole('button', { name: 'Locate me' }).click();
    await page.getByRole('tab', { name: /Weather/ }).click();

    const alert = page.locator('li', { hasText: 'Thunderstorm' }).first();
    await expect(alert).toContainText('Danger');
    await expect(alert).toContainText('Now');
    await expect(page.getByText('Riding conditions')).toBeVisible();
  });

  test('SOS shows local emergency numbers and a shareable location message', async ({ page }) => {
    await mockApis(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Locate me' }).click();
    await page.getByRole('tab', { name: /SOS/ }).click();

    await expect(page.getByRole('link', { name: /Call 112/ })).toHaveAttribute('href', 'tel:112');
    await expect(page.getByRole('link', { name: /100\s*Police/ })).toBeVisible();
    await expect(page.locator('pre')).toContainText('https://maps.google.com/?q=28.631500,77.216700');
    await expect(page.locator('pre')).toContainText(`Nearest hospital: ${PLACES.hospitalFarFast.name}`);
  });

  test('searching a place works without GPS', async ({ page, context }) => {
    await context.clearPermissions();
    await mockApis(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Search a place' }).click();
    await page.getByRole('combobox', { name: 'Search for a place' }).fill('Mumbai');
    await page.getByRole('option', { name: /Mumbai/ }).click();
    await expect(page.getByText('Showing help near')).toBeVisible();
  });

  test('busy map-data servers produce a clear, recoverable error', async ({ page }) => {
    test.setTimeout(90_000);
    await mockApis(page, { overpassDown: true });
    await page.goto('/');
    await page.getByRole('button', { name: 'Locate me' }).click();
    await expect(page.getByText('Map data servers are busy')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  });
});
