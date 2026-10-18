import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { mockApis } from './mocks';

/**
 * Contrast is measured through opacity, so auditing mid-fade reports false failures. Wait until
 * the landing screen has gone and no finite transition is still running (endless decorative
 * pulses are ignored), plus a beat for JS-driven springs.
 */
async function settle(page: Page, { onLanding = false } = {}) {
  if (!onLanding) await expect(page.getByRole('button', { name: 'Locate me' })).toHaveCount(0);
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every((a) => a.playState !== 'running' || a.effect?.getComputedTiming().iterations === Infinity),
  );
  await page.waitForTimeout(600);
}

/** WCAG 2.2 AA via axe-core; the WebGL canvas itself is excluded (it has no DOM to audit). */
async function audit(page: Page, options?: { onLanding?: boolean }) {
  await settle(page, options);
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .exclude('.maplibregl-canvas')
    .analyze();
  return violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
}

for (const scheme of ['dark', 'light'] as const) {
  test(`no serious accessibility violations (${scheme} theme)`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await mockApis(page);
    await page.goto('/');
    expect(await audit(page, { onLanding: true }), 'landing').toEqual([]);

    await page.getByRole('button', { name: 'Locate me' }).click();
    await expect(page.getByText('Closest help')).toBeVisible();
    expect(await audit(page), 'results').toEqual([]);

    await page.locator('article', { hasText: 'Hospital' }).locator('button').first().click();
    await expect(page.getByRole('link', { name: /Navigate/ })).toBeVisible();
    expect(await audit(page), 'place').toEqual([]);

    await page.getByRole('tab', { name: /Weather/ }).click();
    await expect(page.getByText('Riding conditions')).toBeVisible();
    expect(await audit(page), 'weather').toEqual([]);

    await page.getByRole('tab', { name: /SOS/ }).click();
    await expect(page.getByRole('link', { name: /Call 112/ })).toBeVisible();
    expect(await audit(page), 'sos').toEqual([]);
  });
}
