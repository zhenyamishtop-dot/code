// Local UI check: opens the mini app in headless Chromium with signed initData and walks through the main flows.
// Usage: node tools/ui-preview.mjs <allowedTelegramId> [outDir]   (service must be running on PORT)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { config } from '../src/config.js';
import { signInitData } from '../src/telegram.js';
const { chromium } = createRequire(import.meta.url)('playwright'); // dev-only: needs a global or local Playwright

const userId = Number(process.argv[2]);
const out = process.argv[3] || './data/preview';
fs.mkdirSync(out, { recursive: true });
const initData = signInitData({ id: userId, first_name: 'Preview' });
const url = `http://localhost:${config.port}/#devInitData=${encodeURIComponent(initData)}`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
const shot = async name => { await page.waitForTimeout(1100); await page.screenshot({ path: `${out}/${name}.png` }); };
const settings = () => page.evaluate(async init => (await (await fetch('/api/bootstrap', { headers: { 'X-Init-Data': init } })).json()).settings, initData);

await page.goto(url);
await page.waitForSelector('.stat');
await shot('1-home-empty');

// multi-select collections
await page.click('#add');
await page.waitForSelector('.tile');
const tiles = await page.locator('.tile').count();
await page.waitForTimeout(1500);
for (const name of ['Toy Bear', 'Lol Pop', 'Snoop Dogg']) await page.locator('.tile', { hasText: name }).first().click();
await shot('2-picker-volume');
const firstByVolume = await page.locator('.tile b').first().innerText();
await page.locator('#pickerSorts .chip', { hasText: 'Флор ↓' }).click();
await page.waitForTimeout(600);
const firstByFloor = await page.locator('.tile b').first().innerText();
await shot('3-picker-floor');
await page.fill('#pickerSearch', 'cap');
await page.waitForTimeout(300);
const found = await page.locator('.tile').count();
await page.click('#pickerToggleAll'); // select all found
await page.click('#pickerDone');
await page.waitForTimeout(1200);
const afterPick = (await settings()).rules.map(r => r.collection);
await shot('4-home');

// fine-tune one collection
await page.locator('.rule-main', { hasText: 'Toy Bear' }).click();
await page.waitForSelector('#edList .item');
const models = await page.locator('#edList .item').count();
const allChecked = await page.locator('#edList .item.on').count();
await page.locator('#edList .item').nth(1).click();          // uncheck one -> all but one
const afterUncheck = await page.locator('#edList .item.on').count();
await page.click('#edNone');
await page.locator('#edList .item').nth(0).click();
await page.locator('#edList .item').nth(2).click();
await shot('5-models');
await page.locator('.tab', { hasText: 'Фоны' }).click();
await page.waitForSelector('#edList .item');
const backdrops = await page.locator('#edList .item').count();
await page.click('#edNone');
await page.locator('#edList .item', { hasText: 'Black' }).first().click();
await shot('6-backdrops');
await page.locator('.tab', { hasText: 'Узоры' }).click();
await page.waitForSelector('#edList .item');
const patterns = await page.locator('#edList .item').count();
await page.click('#edNone'); await page.click('#edAll');     // "Все" brings back all
const patternsOn = await page.locator('#edList .item.on').count();
await page.waitForTimeout(2500);
await shot('7-patterns');
await page.locator('.tab', { hasText: 'Цена' }).click();
await page.fill('#edMax', '60');
await page.locator('#edPresets .chip', { hasText: '+5%' }).click();
await shot('8-price');
await page.locator('#editor [data-close]').last().click();
await page.waitForTimeout(1500);
await shot('9-home-custom');

const saved = await settings();
const noAuth = await page.evaluate(async () => (await fetch('/api/bootstrap')).status);
console.log(JSON.stringify({ tiles, firstByVolume, firstByFloor, found, afterPick, models, allChecked, afterUncheck, backdrops, patterns, patternsOn, noAuthStatus: noAuth, toyBear: saved.rules.find(r => r.collection === 'Toy Bear'), errors }, null, 1));
await browser.close();
