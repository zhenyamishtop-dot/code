// HTTP server: serves the mini app and its JSON API. Every API call is authenticated with Telegram initData.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { config, ROOT, MARKETS, MARKET_TITLES } from './config.js';
import { validateInitData } from './telegram.js';
import { sanitizeSettings } from './filters.js';
import { norm } from './util.js';

const WEB = path.join(ROOT, 'web');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function readBody(req, limit = 256 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > limit) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

export function createServer({ store, catalog, floors, poller, notifier, bot }) {
  const status = userId => {
    const s = store.user(userId).settings;
    return {
      enabled: s.enabled,
      activeRules: s.rules.filter(r => r.enabled !== false).length,
      cycleSeconds: poller.cycleSeconds(),
      markets: Object.fromEntries(MARKETS.map(m => [m, { lastPollAt: poller.stats[m].lastPollAt, lastMs: poller.stats[m].lastMs, polls: poller.stats[m].polls, errors: poller.stats[m].errors }])),
      alerts: notifier.stats.alerts,
      lastAlertAt: notifier.stats.lastAlertAt,
      catalog: catalog.progress(),
      now: Date.now(),
    };
  };

  async function api(req, res, url) {
    const user = validateInitData(req.headers['x-init-data']);
    if (!user?.id) return json(res, 401, { error: 'Откройте приложение из Telegram-бота' });
    if (!store.isAllowed(user.id)) return json(res, 403, { error: 'Нет доступа. Напишите боту /start — владелец получит запрос.' });
    const route = req.method + ' ' + url.pathname;

    if (route === 'GET /api/bootstrap') {
      return json(res, 200, {
        user: { id: user.id, name: user.first_name || user.username || '' },
        settings: store.user(user.id).settings,
        collections: catalog.collections.map(c => c.name),
        collectionFloors: floors.collectionFloorsAll(),
        volumes: floors.volumes.map,
        backdropColors: catalog.data.backdropColors,
        markets: MARKETS.map(id => ({ id, title: MARKET_TITLES[id] })),
        status: status(user.id),
      });
    }
    if (route === 'GET /api/collection') {
      const name = catalog.resolve(url.searchParams.get('name') || '');
      if (!name) return json(res, 404, { error: 'Коллекция не найдена' });
      const [details] = await Promise.all([catalog.details(name), floors.ensureModels(name, 3000)]);
      return json(res, 200, { ...details, modelFloors: floors.modelFloorsAll(name) });
    }
    if (route === 'GET /api/status') return json(res, 200, status(user.id));
    if (route === 'PUT /api/settings') {
      const body = await readBody(req);
      const settings = sanitizeSettings(body, catalog.known());
      // keep canonical collection spelling
      for (const r of settings.rules) r.collection = catalog.resolve(r.collection) || r.collection;
      store.setSettings(user.id, settings);
      return json(res, 200, { settings, status: status(user.id) });
    }
    if (route === 'POST /api/test') {
      await bot.sendTest(store.user(user.id).chatId, user.id);
      return json(res, 200, { ok: true });
    }
    return json(res, 404, { error: 'not found' });
  }

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/healthz') return json(res, 200, { ok: true });
      if (url.pathname.startsWith('/api/')) return await api(req, res, url);
      if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
      const rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
      const file = path.join(WEB, rel);
      if (!file.startsWith(WEB + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(file).pipe(res);
    } catch (e) {
      console.error('http:', e.message);
      if (!res.headersSent) json(res, 500, { error: 'Внутренняя ошибка' }); else res.end();
    }
  });
  return server;
}
