import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    const val = m[2].replace(/^["']|["']$/g, '');
    if (process.env[m[1]] === undefined) process.env[m[1]] = val;
  }
}
loadEnvFile(path.join(ROOT, '.env'));

export const MARKETS = ['portals', 'mrkt', 'tonnel', 'getgems', 'telegram'];
export const MARKET_TITLES = { portals: 'Portals', mrkt: 'MRKT', tonnel: 'Tonnel', getgems: 'Getgems', telegram: 'Telegram' };
/** Gift Satellite names the Telegram market `tg` in search URLs and `telegram` everywhere else. */
export const SEARCH_PATH = { telegram: 'tg' };

export const config = {
  botToken: process.env.BOT_TOKEN || '',
  // One or more Gift Satellite keys: SATELLITE_TOKENS=key1,key2,... (SATELLITE_TOKEN is still accepted)
  satelliteTokens: [...new Set(`${process.env.SATELLITE_TOKENS || ''},${process.env.SATELLITE_TOKEN || ''}`.split(/[\s,;]+/).map(s => s.trim()).filter(Boolean))],
  satelliteBase: process.env.SATELLITE_BASE || 'https://gift-satellite.dev/api',
  webappUrl: (process.env.WEBAPP_URL || '').replace(/\/+$/, ''),
  port: Number(process.env.PORT || 8080),
  ownerId: process.env.OWNER_ID ? String(process.env.OWNER_ID) : '',
  freshWindowSec: Number(process.env.FRESH_WINDOW_SEC || 600),
  dataDir: path.resolve(ROOT, process.env.DATA_DIR || './data'),
  // Gift Satellite allows 1 search request per second per market
  searchGapMs: Number(process.env.SEARCH_GAP_MS || 1050),
};

export function assertConfig() {
  const missing = [];
  if (!config.botToken) missing.push('BOT_TOKEN');
  if (missing.length) {
    console.error('Не заданы переменные: ' + missing.join(', ') + '. Скопируйте .env.example в .env и заполните.');
    process.exit(1);
  }
  fs.mkdirSync(config.dataDir, { recursive: true });
}
