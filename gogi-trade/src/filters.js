// Filter rules: validation of what the mini app sends, matching listings, and building poll targets.
import { MARKETS } from './config.js';
import { norm } from './util.js';

const MAX_RULES = 60;
const MAX_NAMES = 300;
const MAX_QUERY_NAMES = 25; // above this the attribute is filtered locally instead of in the API query

const cleanNames = arr => [...new Set((Array.isArray(arr) ? arr : []).filter(x => typeof x === 'string' && x.length <= 80).map(x => x.trim()).filter(Boolean))].slice(0, MAX_NAMES);
const cleanNum = (v, min, max) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};

/** Returns a safe settings object; `knownCollections` (optional Set of normalized names) rejects unknown collections. */
export function sanitizeSettings(input, knownCollections) {
  const src = input && typeof input === 'object' ? input : {};
  const markets = {};
  for (const m of MARKETS) markets[m] = src.markets?.[m] !== false;
  const rules = [];
  const seen = new Set();
  for (const r of Array.isArray(src.rules) ? src.rules.slice(0, MAX_RULES) : []) {
    if (!r || typeof r.collection !== 'string') continue;
    const collection = r.collection.trim().slice(0, 80);
    if (!collection || seen.has(norm(collection))) continue;
    if (knownCollections && !knownCollections.has(norm(collection))) continue;
    seen.add(norm(collection));
    rules.push({
      collection,
      enabled: r.enabled !== false,
      models: cleanNames(r.models),
      backdrops: cleanNames(r.backdrops),
      symbols: cleanNames(r.symbols),
      maxPrice: cleanNum(r.maxPrice, 0, 1e7),
      maxOverFloorPct: cleanNum(r.maxOverFloorPct, -100, 1000),
    });
  }
  return { enabled: src.enabled !== false, markets, priceDrops: src.priceDrops !== false, minDropPct: cleanNum(src.minDropPct, 0, 100) ?? 3, rules };
}

const inList = (list, value) => !list.length || list.some(x => norm(x) === norm(value));

/**
 * Does a listing pass the user's rule? `refFloor` is the lowest known model floor across markets (may be null).
 * Returns the matched rule or null.
 */
export function matchListing(settings, item, refFloor) {
  if (!settings?.enabled || settings.markets?.[item.market] === false) return null;
  const rule = (settings.rules || []).find(r => r.enabled !== false && norm(r.collection) === norm(item.collectionName));
  if (!rule) return null;
  if (!inList(rule.models, item.modelName) || !inList(rule.backdrops, item.backdropName) || !inList(rule.symbols, item.symbolName)) return null;
  const price = Number(item.normalizedPrice);
  if (rule.maxPrice != null && price > rule.maxPrice) return null;
  if (rule.maxOverFloorPct != null && refFloor != null && price > refFloor * (1 + rule.maxOverFloorPct / 100)) return null;
  return rule;
}

/**
 * Collapses all users' rules into poll targets: one per collection, with the narrowest
 * API query that still covers every rule (an attribute is sent to the API only when
 * every rule for that collection restricts it).
 */
export function buildTargets(users) {
  const byCol = new Map();
  for (const u of users) {
    if (!u.settings?.enabled) continue;
    for (const r of u.settings.rules || []) {
      if (r.enabled === false) continue;
      const key = norm(r.collection);
      if (!byCol.has(key)) byCol.set(key, { collection: r.collection, rules: [], markets: new Set() });
      const t = byCol.get(key);
      t.rules.push(r);
      for (const m of MARKETS) if (u.settings.markets?.[m] !== false) t.markets.add(m);
    }
  }
  const union = (rules, field) => {
    if (rules.some(r => !r[field]?.length)) return [];
    const map = new Map();
    for (const r of rules) for (const n of r[field]) map.set(norm(n), n);
    return map.size > MAX_QUERY_NAMES ? [] : [...map.values()].sort();
  };
  return [...byCol.values()].map(t => {
    const query = { models: union(t.rules, 'models'), backdrops: union(t.rules, 'backdrops'), symbols: union(t.rules, 'symbols') };
    return { collection: t.collection, markets: [...t.markets], query, key: norm(t.collection) + '|' + JSON.stringify(query) };
  }).sort((a, b) => a.key.localeCompare(b.key));
}
