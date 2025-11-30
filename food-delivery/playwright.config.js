// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  use: { baseURL: 'http://localhost:3000', headless: true },
  webServer: {
    command: 'npm run start:test',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      // make server.js listen even if NODE_ENV=test
      PLAYWRIGHT: '1',
      NODE_ENV: 'test',
      // DB + secrets for CI/local e2e
      MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/food_delivery_app',
      SESSION_SECRET: process.env.SESSION_SECRET || 'testsecret',
      JWT_SECRET: process.env.JWT_SECRET || 'testjwt',
      HOST: '0.0.0.0',
      PORT: '3000',
    },
  },
});
