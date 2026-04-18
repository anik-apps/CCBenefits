import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  timeout: 30000,
  retries: 1,
  reporter: [['list'], ['html', { open: 'never' }]],

  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.03,
    },
  },

  // Exclude platform from snapshot paths so Linux-generated baselines work everywhere
  snapshotPathTemplate: '{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}{-projectName}{ext}',

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8080',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'desktop',
      use: { viewport: { width: 1280, height: 720 } },
    },
    {
      name: 'mobile',
      use: { viewport: { width: 375, height: 812 } },
      testMatch: /visual-regression/,
    },
  ],
});
