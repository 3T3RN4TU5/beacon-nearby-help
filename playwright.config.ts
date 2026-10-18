import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

/** Chromium projects: installed Chrome locally (CI installs Playwright's), software WebGL. */
const chromium = {
  channel: process.env.CI ? undefined : 'chrome',
  launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
};

/**
 * End-to-end tests run against the production build with every external API mocked
 * (see e2e/mocks.ts), so they are deterministic and never load the free public services.
 * Desktop Chrome, Android (Pixel 7) and iPhone (WebKit) — the iPhone project exists because
 * Safari behaves differently (it caught the alarm-without-audio bug).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  // Each page renders a WebGL globe in software (SwiftShader); more workers just starve the CPU.
  workers: 2,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    serviceWorkers: 'block',
    // Deterministic: no globe spin or fly-in animations (also covers the reduced-motion path).
    reducedMotion: 'reduce',
    geolocation: { latitude: 28.6315, longitude: 77.2167, accuracy: 15 },
    permissions: ['geolocation'],
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], ...chromium, viewport: { width: 1440, height: 900 } },
    },
    // Contrast and semantics don't change with the device, so the axe audit runs on desktop only.
    { name: 'android', use: { ...devices['Pixel 7'], ...chromium }, testIgnore: /a11y\.spec/ },
    { name: 'iphone', use: { ...devices['iPhone 14'] }, testIgnore: /a11y\.spec/ },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
