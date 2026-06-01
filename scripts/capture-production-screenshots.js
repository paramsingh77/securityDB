import 'dotenv/config';
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const required = ['PRODUCTION_APP_URL', 'PRODUCTION_LOGIN_EMAIL', 'PRODUCTION_LOGIN_PASSWORD'];
const missing = required.filter((name) => !process.env[name]);

if (missing.length > 0) {
  console.error(`Missing required env values: ${missing.join(', ')}`);
  console.error('Create .env.production-login and run: node --env-file=.env.production-login scripts/capture-production-screenshots.js');
  process.exit(1);
}

const outputDir = path.resolve('production-screenshots');
const appUrl = process.env.PRODUCTION_APP_URL;
const email = process.env.PRODUCTION_LOGIN_EMAIL;
const password = process.env.PRODUCTION_LOGIN_PASSWORD;

const routes = [
  ['dashboard', '/dashboard'],
  ['event-reporting', '/event-reporting'],
  ['events', '/events'],
  ['incident-reporting', '/incident-reporting'],
  ['incidents', '/incidents'],
  ['user-management', '/user-management'],
  ['users', '/users'],
];

function absoluteUrl(route) {
  return new URL(route, appUrl).toString();
}

async function screenshot(page, name) {
  await page.screenshot({
    path: path.join(outputDir, `${name}.png`),
    fullPage: true,
  });
}

async function clickText(page, text) {
  const button = page.locator(`button:has-text("${text}"), a:has-text("${text}")`).first();
  if (await button.count()) {
    await button.click();
    await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1000);
    return true;
  }
  const locator = page.getByText(text, { exact: false }).first();
  if (await locator.count()) {
    await locator.click();
    await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1000);
    return true;
  }
  return false;
}

async function clickButton(page, text) {
  const locator = page.locator(`button:has-text("${text}")`).first();
  if (await locator.count()) {
    await locator.click();
    await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1000);
    return true;
  }
  return false;
}

async function fillFirstAvailable(page, selectors, value) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.count()) {
      await locator.fill(value);
      return true;
    }
  }
  return false;
}

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
});

const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
});

try {
  await page.goto(appUrl, { waitUntil: 'networkidle', timeout: 60000 });
  await screenshot(page, '00-login-or-dashboard');

  const filledEmail = await fillFirstAvailable(page, [
    'input[type="email"]',
    'input[name="email"]',
    'input[name="username"]',
    'input[placeholder*="email" i]',
    'input[placeholder*="user" i]',
  ], email);

  const filledPassword = await fillFirstAvailable(page, [
    'input[type="password"]',
    'input[name="password"]',
    'input[placeholder*="password" i]',
  ], password);

  if (filledEmail && filledPassword) {
    const submit = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in"), input[type="submit"]').first();
    await submit.click();
    await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1500);
  }

  await screenshot(page, '01-after-login');

  await page.goto(absoluteUrl('/dashboard'), { waitUntil: 'networkidle', timeout: 60000 });
  await screenshot(page, 'dashboard');

  const dashboardCaptures = [
    ['visitor-check-in-clicked', 'Visitor Check-in', ['New Check-in', 'Check Out']],
    ['event-reporting-clicked', 'Report Event', ['Add New Event', 'Edit']],
    ['incident-reporting-clicked', 'Report Incident', ['New Incident', 'View']],
    ['user-management-clicked', 'Manage Users', ['Add User']],
  ];

  for (const [name, dashboardText, actions] of dashboardCaptures) {
    await page.goto(absoluteUrl('/dashboard'), { waitUntil: 'networkidle', timeout: 60000 });
    const clicked = await clickText(page, dashboardText);
    if (clicked) {
      await screenshot(page, name);
      for (const action of actions) {
        const didClick = await clickButton(page, action);
        if (didClick) {
          await screenshot(page, `${name}-${action.toLowerCase().replaceAll(' ', '-')}`);
          await page.keyboard.press('Escape').catch(() => {});
          await page.waitForTimeout(500);
        }
      }
    }
  }

  for (const [name, route] of routes) {
    await page.goto(absoluteUrl(route), { waitUntil: 'networkidle', timeout: 60000 }).catch(() => null);
    await page.waitForTimeout(1000);
    await screenshot(page, name);
  }
} finally {
  await browser.close();
}

console.log(`Screenshots saved to ${outputDir}`);
