// Local UI check: opens the mini app in headless Chromium with signed initData and walks through the main flows.
// Usage: node test/ui-preview.mjs <ownerTelegramId> [outDir]   (service must be running on PORT)
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); // dev-only: needs a global or local Playwright
import fs from 'node:fs';
import { config } from '../src/config.js';
import { signInitData } from '../src/telegram.js';

const userId = Number(process.argv[2]);
const out = process.argv[3] || './data/preview';
fs.mkdirSync(out, { recursive: true });
const initData = signInitData({ id: userId, first_name: 'Preview' });
const url = `http://localhost:${config.port}/#devInitData=${encodeURIComponent(initData)}`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const shot = async name => { await page.waitForTimeout(900); await page.screenshot({ path: `${out}/${name}.png` }); };

await page.goto(url);
await page.waitForSelector('.stat');
await shot('1-home');

await page.click('#add');
await page.waitForSelector('.tile');
const tiles = await page.locator('.tile').count();
await page.waitForTimeout(1500);
await shot('2-picker');
await page.fill('#pickerSearch', 'toy');
await page.waitForTimeout(300);
await page.locator('.tile', { hasText: 'Toy Bear' }).first().click();
await page.waitForSelector('#edList .item');
const models = await page.locator('#edList .item').count();
await page.locator('#edList .item').nth(0).click();
await page.locator('#edList .item').nth(2).click();
await page.waitForTimeout(1200);
await shot('3-models');
await page.locator('.tab', { hasText: 'Фоны' }).click();
await page.waitForSelector('#edList .item');
const backdrops = await page.locator('#edList .item').count();
await page.locator('#edList .item', { hasText: 'Black' }).first().click();
await shot('4-backdrops');
await page.locator('.tab', { hasText: 'Узоры' }).click();
await page.waitForSelector('#edList .item');
const patterns = await page.locator('#edList .item').count();
await shot('5-patterns');
await page.locator('.tab', { hasText: 'Цена' }).click();
await page.fill('#edMax', '60');
await page.locator('#edPresets .chip', { hasText: '+5%' }).click();
await shot('6-price');
await page.locator('#editor [data-close]').last().click();
await page.waitForTimeout(1500);
await shot('7-home-with-rule');

const saved = await page.evaluate(async init => (await (await fetch('/api/bootstrap', { headers: { 'X-Init-Data': init } })).json()).settings, initData);
const noAuth = await page.evaluate(async () => (await fetch('/api/bootstrap')).status);
console.log(JSON.stringify({ tiles, models, backdrops, patterns, noAuthStatus: noAuth, savedRule: saved.rules.find(r => r.collection === 'Toy Bear'), errors }, null, 1));
await browser.close();
