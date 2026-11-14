// Polls Gift Satellite search for every watched collection on every market and emits new listings.
import { EventEmitter } from 'node:events';
import { config, MARKETS } from './config.js';
import { sleep } from './util.js';

const STATE_TTL_MS = 10 * 60_000;

export function listingTime(item) {
  const t = Math.max(Number(item.eventAt) || 0, Date.parse(item.createdAt) || 0);
  return t || 0;
}

/**
 * Pure change detector for one (market, target) stream.
 * state: { baselined, seen: Map(giftKey -> { price, at }) }
 * Returns events: { type: 'listing' | 'price_drop', item, oldPrice? }
 */
export function diffListings(state, items, { now = Date.now(), freshWindowMs = config.freshWindowSec * 1000 } = {}) {
  const events = [];
  // Price window of the previous batch: results are the N cheapest lots, so a lot that only
  // slid into the window after others sold shows up at its upper edge.
  const prevCutoff = state.full ? state.maxPrice : Infinity;
  for (const item of items) {
    const key = String(item.giftId || item.slug || item._id);
    const price = Number(item.normalizedPrice);
    const prev = state.seen.get(key);
    if (!prev) {
      const at = listingTime(item);
      // With a listing time (Portals, MRKT, Tonnel, Getgems): new only if created recently.
      // Without one (Telegram market): new if it appeared strictly inside the previous price window.
      const isNew = at ? now - at <= freshWindowMs : price < prevCutoff;
      if (state.baselined && isNew) events.push({ type: 'listing', item });
    } else if (price < prev.price - 1e-9) {
      events.push({ type: 'price_drop', item, oldPrice: prev.price });
    }
    state.seen.set(key, { price, at: now });
  }
  state.baselined = true;
  const prices = items.map(i => Number(i.normalizedPrice)).filter(p => p > 0);
  state.maxPrice = prices.length ? Math.max(...prices) : 0;
  state.full = items.length >= (state.pageSize || 50);
  // forget items that left the window long ago
  if (state.seen.size > 400) for (const [k, v] of state.seen) if (now - v.at > 3600_000) state.seen.delete(k);
  return events;
}

export class Poller extends EventEmitter {
  constructor(sat, floors, getTargets) {
    super();
    this.sat = sat;
    this.floors = floors;
    this.getTargets = getTargets;
    this.states = new Map(); // market|targetKey -> { baselined, seen, touched }
    this.cursor = {}; // market#key -> position in the assigned list
    this.stats = Object.fromEntries(MARKETS.map(m => [m, { polls: 0, errors: 0, lastPollAt: 0, lastError: null, lastMs: 0 }]));
    this.running = false;
  }

  start() {
    this.running = true;
    for (const m of MARKETS) for (let k = 0; k < this.sat.keyCount; k++) this.loop(m, k);
  }
  stop() { this.running = false; }

  /**
   * Targets polled by key slot `slot` on `market`: collections are dealt round-robin
   * over the working keys, so N keys make the cycle N times shorter.
   */
  assigned(market, slot) {
    const keys = this.sat.activeKeys();
    const targets = this.getTargets().filter(t => t.markets.includes(market));
    if (!keys.length) return slot === 0 ? targets : [];
    const pos = keys.indexOf(slot);
    if (pos < 0) return [];
    return targets.filter((_, i) => i % keys.length === pos);
  }

  async loop(market, key) {
    const cursorKey = market + '#' + key;
    while (this.running) {
      const targets = this.assigned(market, key);
      if (!targets.length) { await sleep(700); continue; }
      const target = targets[(this.cursor[cursorKey] = (this.cursor[cursorKey] || 0) + 1) % targets.length];
      const st = this.stats[market];
      const t0 = Date.now();
      try {
        const items = await this.sat.search(market, target.collection, target.query, key);
        st.polls++; st.lastPollAt = Date.now(); st.lastMs = this.sat.lastMs?.[`search:${market}#${key}`] ?? Date.now() - t0;
        this.process(market, target, Array.isArray(items) ? items : []);
      } catch (e) {
        st.errors++; st.lastError = e.message;
        await sleep(300);
      }
    }
  }

  process(market, target, items) {
    const key = market + '|' + target.key;
    let state = this.states.get(key);
    if (!state) { state = { baselined: false, seen: new Map(), touched: 0, pageSize: market === 'telegram' ? 100 : 50 }; this.states.set(key, state); }
    // a target that was not polled for a while starts from a fresh baseline
    if (state.touched && Date.now() - state.touched > STATE_TTL_MS) { state.baselined = false; state.seen.clear(); }
    state.touched = Date.now();

    const unfiltered = !target.query.models.length && !target.query.backdrops.length && !target.query.symbols.length;
    // the Telegram market search sees fewer lots than its floor statistics, so it does not update floors
    if (unfiltered && items.length && market !== 'telegram') {
      this.floors.observeCollectionFloor(market, target.collection, Math.min(...items.map(i => Number(i.normalizedPrice)).filter(p => p > 0)));
    }
    if (process.env.DEBUG_POLL && state.baselined) {
      for (const i of items) {
        const k = String(i.giftId || i.slug || i._id);
        if (!state.seen.has(k)) console.log(`[poll] unseen ${market} ${i.slug} ${i.normalizedPrice} age ${Math.round((Date.now() - listingTime(i)) / 1000)}s`);
      }
    }
    for (const ev of diffListings(state, items)) this.emit(ev.type, { ...ev, market, detectedAt: Date.now() });

    if (this.states.size > 2000) for (const [k, s] of this.states) if (Date.now() - s.touched > STATE_TTL_MS) this.states.delete(k);
  }

  /** Seconds one full pass over all targets takes on the busiest market (keys poll in parallel). */
  cycleSeconds() {
    const targets = this.getTargets();
    const keys = Math.max(1, this.sat.activeKeys().length);
    const perMarket = MARKETS.map(m => Math.ceil(targets.filter(t => t.markets.includes(m)).length / keys));
    return Math.max(0, ...perMarket) * config.searchGapMs / 1000;
  }
}
