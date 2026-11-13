// Gift Satellite API client (official "API access" key, header `Authorization: Token <key>`).
import { config, MARKETS } from './config.js';
import { RateGate, sleep } from './util.js';

export class Satellite {
  constructor({ token = config.satelliteToken, base = config.satelliteBase, fetchImpl = fetch } = {}) {
    this.token = token;
    this.base = base;
    this.fetch = fetchImpl;
    // 1 request / second per market on /search/*; other routes are polled gently.
    this.gates = { history: new RateGate(350), floors: new RateGate(350), gift: new RateGate(1100) };
    for (const m of MARKETS) this.gates['search:' + m] = new RateGate(config.searchGapMs);
    this.stats = { ok: 0, rateLimited: 0, errors: 0, lastError: null, lastOkAt: 0 };
    this.lastMs = {}; // gate -> duration of the last HTTP round trip
  }

  async request(gate, path, { method = 'GET', body, timeoutMs = 8000, retries = 2 } = {}) {
    for (let attempt = 0; ; attempt++) {
      await this.gates[gate].take();
      let res;
      const startedAt = Date.now();
      try {
        res = await this.fetch(this.base + path, {
          method,
          headers: { Authorization: 'Token ' + this.token, ...(body ? { 'Content-Type': 'application/json' } : {}) },
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (e) {
        this.stats.errors++; this.stats.lastError = `${path}: ${e.message}`;
        if (attempt >= retries) throw e;
        await sleep(500 * (attempt + 1));
        continue;
      }
      this.lastMs[gate] = Date.now() - startedAt;
      if (res.status === 429) {
        this.stats.rateLimited++;
        const wait = (Number(res.headers.get('retry-after')) || 1) * 1000 + 100;
        this.gates[gate].penalize(wait);
        if (attempt >= retries) throw new Error('429 rate limited: ' + path);
        continue;
      }
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        this.stats.errors++; this.stats.lastError = `${path}: HTTP ${res.status} ${text.slice(0, 120)}`;
        const err = new Error(`HTTP ${res.status} ${path} ${text.slice(0, 120)}`);
        err.status = res.status;
        if (res.status >= 500 && attempt < retries) { await sleep(700 * (attempt + 1)); continue; }
        throw err;
      }
      this.stats.ok++; this.stats.lastOkAt = Date.now();
      return res.json();
    }
  }

  /** 50 cheapest listings of a collection on one market (optionally narrowed by attributes). */
  search(market, collection, { models = [], backdrops = [], symbols = [] } = {}) {
    const q = new URLSearchParams({ models: models.join(','), backdrops: backdrops.join(','), symbols: symbols.join(','), starsOnly: 'false' });
    return this.request('search:' + market, `/search/${market}/${encodeURIComponent(collection)}?${q}`, { retries: 0 });
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
