import { config, assertConfig } from './config.js';
import { Satellite } from './satellite.js';
import { Store } from './store.js';
import { Catalog } from './catalog.js';
import { Floors } from './floors.js';
import { Poller } from './poller.js';
import { Notifier } from './notifier.js';
import { Telegram } from './telegram.js';
import { Bot } from './bot.js';
import { createServer } from './server.js';
import { buildTargets } from './filters.js';
import { norm } from './util.js';

assertConfig();

const store = new Store();
// keys sent to the bot (/keys) are stored in state.json and take priority over .env
const keys = store.state.satelliteKeys?.length ? store.state.satelliteKeys : config.satelliteTokens;
if (!keys.length) { console.error('Нет ключей Gift Satellite: задайте SATELLITE_TOKENS в .env'); process.exit(1); }
const sat = new Satellite({ tokens: keys });
const catalog = new Catalog(sat);
const floors = new Floors(sat);
const tg = new Telegram();

// Poll targets are recomputed only when settings change.
let targets = buildTargets(store.activeUsers());
store.onChange(() => { targets = buildTargets(store.activeUsers()); });

// Deep scan: models that do not fit into the 50 cheapest lots get their own queries (DEEP_SCAN=0 turns it off)
const modelsOf = name => {
  const d = catalog.data.details[norm(catalog.resolve(name) || name)];
  if (!d) { catalog.details(name).catch(() => {}); return null; }
  return d.models.map(m => m.name);
};
const poller = new Poller(sat, floors, () => targets, { modelsOf, deep: process.env.DEEP_SCAN !== '0' });
const notifier = new Notifier({ tg, sat, floors, catalog, store });
const bot = new Bot({ tg, store, catalog, poller, notifier, floors, sat });

poller.on('listing', ev => notifier.handle(ev).catch(e => console.error('notify:', e.message)));
poller.on('price_drop', ev => notifier.handle(ev).catch(e => console.error('notify:', e.message)));

const server = createServer({ store, catalog, floors, poller, notifier, bot });

// UI_ONLY=1: local preview of the mini app without talking to Telegram (does not disturb a running bot)
const uiOnly = process.env.UI_ONLY === '1';
if (!uiOnly) {
  const me = await bot.setup();
  console.log(`Бот @${me.username} запущен`);
}
await catalog.init().catch(e => console.error('catalog init:', e.message));
server.listen(config.port, () => console.log(`Мини-приложение: http://localhost:${config.port}` + (config.webappUrl ? ` (публично: ${config.webappUrl})` : ' (WEBAPP_URL не задан)')));
floors.run(() => targets.map(t => t.collection));
poller.start();
if (!uiOnly) tg.poll(u => bot.onUpdate(u));

function shutdown() {
  console.log('Останавливаюсь…');
  poller.stop(); floors.stop(); tg.stop(); store.flush();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
