import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: '**/*.spec.js', timeout: 90000, fullyParallel: false,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:4176', browserName: 'chromium', viewport: {width:1440,height:1000}, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: { command: 'python3 -m http.server 4176 --bind 127.0.0.1', url: 'http://127.0.0.1:4176', reuseExistingServer: !process.env.CI },
});
