import test from 'node:test';
import assert from 'node:assert/strict';
import { diffListings } from '../src/poller.js';
import { sanitizeSettings, matchListing, buildTargets } from '../src/filters.js';
import { formatAlert, marketUrl, alertKeyboard } from '../src/notifier.js';
import { validateInitData, signInitData } from '../src/telegram.js';
import { fmtTon, norm, timeAgo, RateGate } from '../src/util.js';

const NOW = Date.parse('2026-11-13T03:00:00Z');
const item = (over = {}) => ({
  slug: 'ScaredCat-17114', market: 'mrkt', giftId: 'abc-1', number: 17114, normalizedPrice: 273.97,
  collectionName: 'Scared Cat', modelName: 'Purrlion', backdropName: 'Navy Blue', symbolName: 'Spider',
  isLocked: false, createdAt: new Date(NOW - 2000).toISOString(), ...over,
});

test('diffListings: first batch is a silent baseline', () => {
  const state = { baselined: false, seen: new Map() };
  assert.deepEqual(diffListings(state, [item()], { now: NOW, freshWindowMs: 600_000 }), []);
  assert.equal(state.baselined, true);
});

test('diffListings: fresh unseen item is a new listing, old unseen item is not', () => {
  const state = { baselined: false, seen: new Map() };
  diffListings(state, [item()], { now: NOW, freshWindowMs: 600_000 });
  const fresh = item({ giftId: 'new-1', slug: 'ScaredCat-1' });
  const slidIn = item({ giftId: 'old-1', slug: 'ScaredCat-2', createdAt: new Date(NOW - 3 * 3600_000).toISOString() });
  const events = diffListings(state, [item(), fresh, slidIn], { now: NOW, freshWindowMs: 600_000 });
  assert.deepEqual(events.map(e => [e.type, e.item.giftId]), [['listing', 'new-1']]);
  // nothing is reported twice
  assert.deepEqual(diffListings(state, [item(), fresh, slidIn], { now: NOW + 1000, freshWindowMs: 600_000 }), []);
});

test('diffListings: price drop on a known item', () => {
  const state = { baselined: false, seen: new Map() };
  diffListings(state, [item()], { now: NOW });
  const events = diffListings(state, [item({ normalizedPrice: 250 })], { now: NOW + 1000 });
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'price_drop');
  assert.equal(events[0].oldPrice, 273.97);
  // a price increase is not an event
  assert.deepEqual(diffListings(state, [item({ normalizedPrice: 260 })], { now: NOW + 2000 }), []);
});

test('diffListings: portals eventAt (ms) counts as listing time', () => {
  const state = { baselined: true, seen: new Map() };
  const relisted = item({ giftId: 'p-1', market: 'portals', createdAt: new Date(NOW - 86400_000).toISOString(), eventAt: NOW - 3000 });
  assert.equal(diffListings(state, [relisted], { now: NOW, freshWindowMs: 600_000 }).length, 1);
});

test('sanitizeSettings: drops junk, dedupes, validates numbers and unknown collections', () => {
  const s = sanitizeSettings({
    enabled: true, markets: { tonnel: false, bogus: true },
    rules: [
      { collection: ' Scared Cat ', models: ['Purrlion', 'Purrlion', 5, ''], maxPrice: '300', maxOverFloorPct: 'x' },
      { collection: 'scared cat' },
      { collection: 'Not A Gift' },
      { nope: 1 },
    ],
  }, new Set(['scared cat']));
  assert.deepEqual(s.markets, { portals: true, mrkt: true, tonnel: false, getgems: true });
  assert.equal(s.rules.length, 1);
  assert.deepEqual(s.rules[0], { collection: 'Scared Cat', enabled: true, models: ['Purrlion'], backdrops: [], symbols: [], maxPrice: 300, maxOverFloorPct: null });
});

test('matchListing: attributes, markets, price limits', () => {
  const base = sanitizeSettings({ rules: [{ collection: 'Scared Cat', models: ['purrlion'], backdrops: ['Navy Blue'], maxPrice: 280, maxOverFloorPct: 70 }] });
  assert.ok(matchListing(base, item(), 170));
  assert.equal(matchListing(base, item({ modelName: 'Other' }), 170), null);
  assert.equal(matchListing(base, item({ backdropName: 'Black' }), 170), null);
  assert.equal(matchListing(base, item({ normalizedPrice: 281 }), 170), null);
  assert.equal(matchListing(base, item(), 150), null, '273.97 is more than 70% above a 150 floor');
  assert.ok(matchListing(base, item(), null), 'unknown floor does not block');
  assert.equal(matchListing({ ...base, markets: { ...base.markets, mrkt: false } }, item(), 170), null);
  assert.equal(matchListing({ ...base, enabled: false }, item(), 170), null);
  const apostrophe = sanitizeSettings({ rules: [{ collection: "Durov's Cap" }] });
  assert.ok(matchListing(apostrophe, item({ collectionName: 'Durov’s Cap' }), null));
});

test('buildTargets: API query only narrows when every rule narrows', () => {
  const u = rules => ({ settings: sanitizeSettings({ rules }) });
  let t = buildTargets([u([{ collection: 'Toy Bear', models: ['Cotton'] }]), u([{ collection: 'Toy Bear', models: ['Peanut'], backdrops: ['Black'] }])]);
  assert.equal(t.length, 1);
  assert.deepEqual(t[0].query, { models: ['Cotton', 'Peanut'], backdrops: [], symbols: [] });
  t = buildTargets([u([{ collection: 'Toy Bear', models: ['Cotton'] }]), u([{ collection: 'Toy Bear' }])]);
  assert.deepEqual(t[0].query.models, []);
  t = buildTargets([{ settings: { ...sanitizeSettings({ rules: [{ collection: 'Toy Bear' }] }), enabled: false } }]);
  assert.deepEqual(t, []);
  t = buildTargets([{ settings: sanitizeSettings({ markets: { tonnel: false }, rules: [{ collection: 'Toy Bear' }, { collection: 'Lol Pop', enabled: false }] }) }]);
  assert.deepEqual(t.map(x => x.collection), ['Toy Bear']);
  assert.deepEqual(t[0].markets, ['portals', 'mrkt', 'getgems']);
});

test('formatAlert: contains listing, floors for 4 markets, sales with links; escapes HTML', () => {
  const text = formatAlert({
    type: 'listing', item: item({ modelName: 'Purr<lion>' }),
    modelFloors: { portals: 170, mrkt: 268.5, tonnel: null, getgems: 300 }, collectionFloor: 148,
    rarity: { model: 15, backdrop: 20, symbol: 4 },
    sales: [{ slug: 'ScaredCat-15506', number: 15506, market: 'mrkt', normalizedPrice: 268.5, soldAt: new Date(NOW - 3600_000).toISOString() }],
  }, NOW);
  assert.match(text, /🟧 <b>ЛИСТИНГ<\/b> · <b>MRKT<\/b>/);
  assert.match(text, /<a href="https:\/\/t\.me\/nft\/ScaredCat-17114"><b>Scared Cat #17114<\/b><\/a>/);
  assert.match(text, /💰 <b>273\.97 TON<\/b> на <a href="https:\/\/t\.me\/mrkt\/app\?startapp=abc-1">MRKT<\/a>/);
  assert.match(text, /Purr&lt;lion&gt;/);
  assert.match(text, /Флор коллекции на MRKT: <b>148 TON<\/b>/);
  assert.match(text, /⚫️ Portals: <b>170 TON<\/b> \(\+61%\) ⬅️ мин/);
  assert.match(text, /🟠 MRKT: <b>268\.5 TON<\/b> \(\+2\.0%\)/);
  assert.match(text, /Tonnel: —/);
  assert.match(text, /<a href="https:\/\/t\.me\/nft\/ScaredCat-15506">#15506<\/a> · <b>268\.5 TON<\/b> · MRKT · 1 ч 0 мин назад <i>\(13\.11 05:00\)<\/i>/);
  assert.doesNotMatch(text, /Ниже флора/);
  const cheap = formatAlert({ type: 'listing', item: item({ normalizedPrice: 150 }), modelFloors: { portals: 170, mrkt: 200, tonnel: null, getgems: null }, collectionFloor: 148, sales: [] }, NOW);
  assert.match(cheap, /🔥 <b>Ниже флора модели на 11\.8%<\/b>/);
  assert.ok(text.length < 4096);
});

test('market links and keyboard', () => {
  assert.equal(marketUrl(item({ market: 'portals', giftId: 'u-1' })), 'https://t.me/portals/market?startapp=gift_u-1');
  assert.equal(marketUrl(item({ market: 'tonnel', giftId: '10561882' })), 'https://t.me/tonnel_network_bot/gift?startapp=10561882');
  assert.equal(marketUrl(item({ market: 'getgems', giftId: 'EQabc' })), 'https://getgems.io/nft/EQabc');
  const kb = alertKeyboard(item());
  assert.equal(kb.inline_keyboard[0][0].text, '🟧 Купить на MRKT');
  assert.equal(kb.inline_keyboard[0][1].url, 'https://t.me/nft/ScaredCat-17114');
});

test('initData: valid signature passes, tampering / wrong token / stale data fail', () => {
  const token = '123456:TEST-TOKEN';
  const data = signInitData({ id: 42, first_name: 'A' }, token, Math.floor(NOW / 1000));
  assert.deepEqual(validateInitData(data, token, 86400, NOW), { id: 42, first_name: 'A' });
  assert.equal(validateInitData(data.replace('%22id%22%3A42', '%22id%22%3A43'), token, 86400, NOW), null);
  assert.equal(validateInitData(data, 'other:token', 86400, NOW), null);
  assert.equal(validateInitData(data, token, 86400, NOW + 2 * 86400_000), null);
  assert.equal(validateInitData('', token), null);
  assert.equal(validateInitData('hash=zz', token), null);
});

test('util: formatting and rate gate', async () => {
  assert.equal(fmtTon(273.97), '273.97');
  assert.equal(fmtTon(148), '148');
  assert.equal(fmtTon(4.2), '4.2');
  assert.equal(fmtTon(null), '—');
  assert.equal(norm('Durov’s Cap'), "durov's cap");
  assert.equal(timeAgo(NOW - 45_000, NOW), '45 сек назад');
  const gate = new RateGate(60);
  const t0 = Date.now();
  await Promise.all([gate.take(), gate.take(), gate.take()]);
  assert.ok(Date.now() - t0 >= 110, 'three slots need at least two gaps');
});

test('multiple keys: search load is split between keys, each key has its own rate gate', async () => {
  const { Satellite } = await import('../src/satellite.js');
  const { Poller } = await import('../src/poller.js');
  const calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push({ at: Date.now(), key: opts.headers.Authorization, url });
    return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  const sat = new Satellite({ tokens: ['k1', 'k2', 'k3'], base: 'http://x', fetchImpl });
  assert.equal(sat.keyCount, 3);
  const targets = ['A', 'B', 'C', 'D', 'E', 'F'].map(c => ({ collection: c, markets: ['portals'], query: { models: [], backdrops: [], symbols: [] }, key: c }));
  const poller = new Poller(sat, { observeCollectionFloor() {} }, () => targets);
  // every collection belongs to exactly one key
  const parts = [0, 1, 2].map(k => poller.assigned('portals', k).map(t => t.collection));
  assert.deepEqual(parts.flat().sort(), ['A', 'B', 'C', 'D', 'E', 'F']);
  assert.ok(parts.every(p => p.length === 2));
  assert.ok(Math.abs(poller.cycleSeconds() - 2 * 1.05) < 1e-9);
  // three keys can each search the same market in the same second
  const t0 = Date.now();
  await Promise.all([0, 1, 2].map(k => sat.search('portals', 'A', {}, k)));
  assert.ok(Date.now() - t0 < 500, 'keys must not wait for each other');
  assert.deepEqual(calls.map(c => c.key).sort(), ['Token k1', 'Token k2', 'Token k3']);
  // a rejected key is disabled and its collections move to the others
  sat.keyStats[1].disabled = true;
  assert.deepEqual(poller.assigned('portals', 1), []);
  assert.deepEqual([0, 2].map(k => poller.assigned('portals', k).length), [3, 3]);
  assert.ok(Math.abs(poller.cycleSeconds() - 3 * 1.05) < 1e-9);
});

test('config: keys from SATELLITE_TOKENS and SATELLITE_TOKEN are merged and deduped', async () => {
  process.env.SATELLITE_TOKENS = 'aaa, bbb;ccc';
  process.env.SATELLITE_TOKEN = 'bbb';
  const { config } = await import('../src/config.js?keys');
  assert.deepEqual(config.satelliteTokens, ['aaa', 'bbb', 'ccc']);
});

test('backdrop floors: cheapest lot over markets, model filter, formatting', async () => {
  const { cheapestOf, formatAttrFloor } = await import('../src/notifier.js');
  const res = {
    portals: [{ slug: 'A-1', giftId: 'p1', modelName: 'Cotton', normalizedPrice: 40 }, { slug: 'A-2', giftId: 'p2', modelName: 'Peanut', normalizedPrice: 36 }],
    mrkt: [{ slug: 'A-3', giftId: 'm1', modelName: 'Cotton', normalizedPrice: 38.5 }],
    tonnel: null, // failed market
    getgems: [],
  };
  const any = cheapestOf(res);
  assert.equal(any.slug, 'A-2');
  assert.equal(any.market, 'portals');
  const model = cheapestOf(res, it => it.modelName === 'Cotton');
  assert.equal(model.slug, 'A-3');
  assert.equal(model.market, 'mrkt');
  assert.equal(cheapestOf(res, () => false), null);
  assert.equal(formatAttrFloor(undefined, 40), '<i>загружаю…</i>');
  assert.equal(formatAttrFloor(null, 40), '—');
  assert.equal(formatAttrFloor(model, 40), '<b>38.5 TON</b> на <a href="https://t.me/mrkt/app?startapp=m1">MRKT</a> (+3.9%)');
  const text = formatAlert({ type: 'listing', item: item(), modelFloors: {}, collectionFloor: 148, sales: [], backdropFloor: any, modelBackdropFloor: null }, NOW);
  const lines = text.split('\n');
  const iColl = lines.findIndex(l => l.includes('Флор коллекции на MRKT'));
  assert.match(lines[iColl + 1], /^🎨 Флор коллекции по фону \(без этого\): <b>36 TON<\/b> на <a href="https:\/\/t\.me\/portals\/market\?startapp=gift_p2">Portals<\/a>/);
  assert.equal(lines[iColl + 2], '💎 Флор модели и фона (без этого): —');
  assert.ok(lines.slice(iColl + 3).some(l => l.includes('ПОСЛЕДНИЕ ПРОДАЖИ')));
});

test('backdrop floors exclude the alerted gift itself', async () => {
  const { Notifier } = await import('../src/notifier.js');
  const lots = { portals: [{ slug: 'ToyBear-1', giftId: 'a', modelName: 'Cotton', normalizedPrice: 30 }, { slug: 'ToyBear-2', giftId: 'b', modelName: 'Peanut', normalizedPrice: 33 }, { slug: 'ToyBear-3', giftId: 'c', modelName: 'Cotton', normalizedPrice: 35 }] };
  const sat = { search: async m => lots[m] || [] };
  const n = new Notifier({ tg: null, sat, floors: null, catalog: null, store: null });
  const r = await n.attrFloors({ slug: 'ToyBear-1', collectionName: 'Toy Bear', modelName: 'Cotton', backdropName: 'Black' });
  assert.equal(r.backdropFloor.slug, 'ToyBear-2');
  assert.equal(r.modelBackdropFloor.slug, 'ToyBear-3');
  const alone = await n.attrFloors({ slug: 'ToyBear-9', collectionName: 'Toy Bear', modelName: 'Peanut', backdropName: 'Black' });
  assert.equal(alone.modelBackdropFloor.slug, 'ToyBear-2');
});
