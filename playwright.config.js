const { defineConfig, devices } = require('@playwright/test');
module.exports = defineConfig({
  testDir:'./tests/e2e',timeout:30000,expect:{timeout:10000},fullyParallel:true,
  reporter:[['html',{outputFolder:'playwright-report',open:'never'}],['list']],
  use:{baseURL:'http://127.0.0.1:4173',trace:'retain-on-failure',screenshot:'only-on-failure'},
  webServer:{command:'python3 -m http.server 4173 --directory .',url:'http://127.0.0.1:4173',reuseExistingServer:true,timeout:15000},
  projects:[{name:'chromium',use:{...devices['Desktop Chrome']}},{name:'mobile',use:{...devices['Pixel 5']}}]
});
