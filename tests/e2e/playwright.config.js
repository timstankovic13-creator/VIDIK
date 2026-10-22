const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './specs',
  timeout: 30000,
  expect: { timeout: 5000 },
  fullyParallel: false,
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }], ['json', { outputFile: 'test-results.json' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  webServer: {
    command: 'python3 -m http.server 4173 --directory ../../canonical/9.1.2',
    url: 'http://127.0.0.1:4173/VIDIK__HTML_REFERENCE_V9_1_2_CANONICAL.html',
    reuseExistingServer: false,
    timeout: 15000
  }
});
