// Gift Satellite API client (official "API access" keys, header `Authorization: Token <key>`).
// Several keys are supported: every key has its own rate limits, search load is split between them.
import { config, MARKETS } from './config.js';
import { RateGate, sleep } from './util.js';

export class Satellite {
  constructor({ tokens = config.satelliteTokens, token, base = config.satelliteBase, fetchImpl = fetch } = {}) {
    this.tokens = token ? [token] : [...tokens];
    if (!this.tokens.length) throw new Error('No Gift Satellite API key');
    this.base = base;
    this.fetch = fetchImpl;
    // Per key: 1 request / second per market on /search/*; other routes are polled gently.
    this.gates = {};
    this.keyStats = this.tokens.map(() => ({ ok: 0, rateLimited: 0, errors: 0, disabled: false, lastError: null }));
    this.tokens.forEach((_, k) => {
      for (const [g, gap] of [['history', 350], ['floors', 350], ['gift', 1100]]) this.gates[`${g}#${k}`] = new RateGate(gap);
      for (const m of MARKETS) this.gates[`search:${m}#${k}`] = new RateGate(config.searchGapMs);
    });
    this.rr = 0;
    this.stats = { ok: 0, rateLimited: 0, errors: 0, lastError: null, lastOkAt: 0 };
    this.lastMs = {}; // gate -> duration of the last HTTP round trip
  }

  get keyCount() { return this.tokens.length; }
  /** Keys that are not rejected by the API (used to split the search load). */
  activeKeys() { return this.tokens.map((_, k) => k).filter(k => !this.keyStats[k].disabled); }
  /** Non-search routes rotate over working keys. */
  nextKey() {
    const keys = this.activeKeys();
    return keys.length ? keys[this.rr++ % keys.length] : 0;
  }

  async request(gateName, path, { method = 'GET', body, timeoutMs = 8000, retries = 2, key } = {}) {
    for (let attempt = 0; ; attempt++) {
      const k = key ?? this.nextKey();
      const gate = `${gateName}#${k}`;
      const ks = this.keyStats[k];
      await this.gates[gate].take();
      let res;
      const startedAt = Date.now();
      try {
        res = await this.fetch(this.base + path, {
          method,
          headers: { Authorization: 'Token ' + this.tokens[k], ...(body ? { 'Content-Type': 'application/json' } : {}) },
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (e) {
        this.stats.errors++; ks.errors++; this.stats.lastError = ks.lastError = `${path}: ${e.message}`;
        if (attempt >= retries) throw e;
        await sleep(500 * (attempt + 1));
        continue;
      }
      this.lastMs[gate] = Date.now() - startedAt;
      if (res.status === 429) {
        this.stats.rateLimited++; ks.rateLimited++;
        const wait = (Number(res.headers.get('retry-after')) || 1) * 1000 + 100;
        this.gates[gate].penalize(wait);
        if (attempt >= retries) throw new Error('429 rate limited: ' + path);
        continue;
      }
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        this.stats.errors++; ks.errors++; this.stats.lastError = ks.lastError = `${path}: HTTP ${res.status} ${text.slice(0, 120)}`;
        // a revoked / wrong key is taken out of rotation; the others share its collections
        if (res.status === 401 && this.activeKeys().length > 1) { ks.disabled = true; console.error(`Ключ Gift Satellite №${k + 1} отклонён (401) и отключён`); }
        const err = new Error(`HTTP ${res.status} ${path} ${text.slice(0, 120)}`);
        err.status = res.status;
        if (res.status >= 500 && attempt < retries) { await sleep(700 * (attempt + 1)); continue; }
        throw err;
      }
      this.stats.ok++; ks.ok++; this.stats.lastOkAt = Date.now();
      return res.json();
    }
  }

  /** 50 cheapest listings of a collection on one market (optionally narrowed by attributes). */
  search(market, collection, { models = [], backdrops = [], symbols = [] } = {}, key = 0) {
    const q = new URLSearchParams({ models: models.join(','), backdrops: backdrops.join(','), symbols: symbols.join(','), starsOnly: 'false' });
    return this.request('search:' + market, `/search/${market}/${encodeURIComponent(collection)}?${q}`, { retries: 0, key });
  }

  /** { modelName: floorTon } for a collection on one market. */
  modelFloors(collection, market) {
    return this.request('floors', `/history/models-floors?${new URLSearchParams({ collectionName: collection, market })}`);
  }

  /** { collectionName: floorTon } for one market. */
  collectionFloors(market) {
    return this.request('floors', `/history/floors?market=${market}`);
  }

  /** Latest sales (all markets) of a model, newest first. */
  async sales(collection, { models = [], backdrops = [], symbols = [], pageSize = 5 } = {}) {
    const r = await this.request('history', `/history/${encodeURIComponent(collection)}`, {
      method: 'POST',
      body: { models, backdrops, symbols, sortBy: 'date', markets: null, page: 0, pageSize },
    });
    return r?.content || [];
  }

  /** Hourly sales volume per collection over the last 24h, all markets together. */
  volumes24h() { return this.request('floors', '/history/collections?period=24h', { timeoutMs: 15000 }); }

  collections() { return this.request('gift', '/gift/collections?premarket=0'); }
  collection(name) { return this.request('gift', `/gift/collection/${encodeURIComponent(name)}`); }
}
