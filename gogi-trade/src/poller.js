// Polls Gift Satellite search for every watched collection on every market and emits new listings.
import { EventEmitter } from 'node:events';
import { config, MARKETS } from './config.js';
import { sleep } from './util.js';

const STATE_TTL_MS = 10 * 60_000;
const MAX_DEPTH = 10; // deep-scan slices per (collection, market)
const SLICE_RESET_MS = 30 * 60_000; // deep slices are rebuilt from scratch this often
const pageSizeOf = market => (market === 'telegram' ? 100 : 50);
const lc = s => String(s || '').toLowerCase();

/**
 * Search returns only the N cheapest lots, so models whose cheapest lot is above that window are invisible.
 * Given a full window, returns the models of `universe` that did not appear in it (they get their own query).
 */
export function missingModels(universe, items) {
  const present = new Set(items.map(i => lc(i.modelName)));
  return universe.filter(m => !present.has(lc(m)));
}

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
  constructor(sat, floors, getTargets, { modelsOf = () => null, deep = true } = {}) {
    super();
    this.sat = sat;
    this.floors = floors;
    this.getTargets = getTargets;
    this.modelsOf = modelsOf; // collection -> [model names] | null (catalog not loaded yet)
    this.deep = deep;
    this.slices = new Map(); // "market|parentKey" -> child slice target (models missing from the parent's window)
    this.tick = {}; // market#key -> counter used to interleave fast and deep queries
    this.states = new Map(); // market|targetKey -> { baselined, seen, touched }
    this.cursor = {}; // market#key -> position in the assigned list
    this.stats = Object.fromEntries(MARKETS.map(m => [m, { polls: 0, errors: 0, lastPollAt: 0, lastError: null, lastMs: 0 }]));
    this.running = false;
  }

  start() {
    this.running = true;
    this.active = new Set(); // "market#key" of running loops
    this.syncLoops();
  }

  /** Starts loops for keys added at runtime; loops of removed keys stop by themselves. */
  syncLoops() {
    if (!this.running) return;
    for (let k = 0; k < this.sat.keyCount; k++) for (const m of MARKETS) {
      if (!this.active.has(m + '#' + k)) this.loop(m, k);
    }
  }
  stop() { this.running = false; }

  /**
   * Targets polled by key slot `slot` on `market`: collections are dealt round-robin
   * over the working keys, so N keys make the cycle N times shorter.
   */
  assigned(market, slot) {
    const { base, deep } = this.targetsFor(market);
    const keys = this.sat.activeKeys();
    if (!keys.length) return slot === 0 ? { base, deep } : { base: [], deep: [] };
    const pos = keys.indexOf(slot);
    if (pos < 0) return { base: [], deep: [] };
    const mine = list => list.filter((_, i) => i % keys.length === pos);
    return { base: mine(base), deep: mine(deep) };
  }

  /** Base targets of a market plus the deep-scan slices hanging off them. */
  targetsFor(market) {
    const base = this.getTargets().filter(t => t.markets.includes(market));
    const deep = [];
    if (this.deep) for (const t of base) {
      for (let s = this.slices.get(market + '|' + t.key); s; s = this.slices.get(market + '|' + s.key)) deep.push(s);
    }
    return { base, deep };
  }

  /** Keeps the child slice of `target` in sync with the models missing from its latest window. */
  updateSlice(market, target, items) {
    const slot = market + '|' + target.key;
    const drop = () => { for (let k = slot, s; (s = this.slices.get(k)); k = market + '|' + s.key) this.slices.delete(k); };
    const full = items.length >= pageSizeOf(market);
    const universe = target.query.models.length ? target.query.models : this.modelsOf(target.collection);
    if (!this.deep || !full || !universe?.length || (target.depth || 0) >= MAX_DEPTH) return drop();
    const missing = missingModels(universe, items);
    if (!missing.length) return drop();
    const now = Date.now();
    let child = this.slices.get(slot);
    if (!child) {
      child = { collection: target.collection, markets: [market], depth: (target.depth || 0) + 1, key: target.key + '>', models: [], resetAt: now };
      this.slices.set(slot, child);
    }
    // grow the slice right away; shrink it only on the periodic rebuild (avoids flapping at the window edge)
    const rebuild = now - child.resetAt > SLICE_RESET_MS;
    const next = rebuild ? missing : [...new Set([...child.models, ...missing])];
    if (rebuild) child.resetAt = now;
    if (next.length !== child.models.length || next.some((m, i) => m !== child.models[i])) {
      const added = next.some(m => !child.models.includes(m));
      child.models = next;
      child.query = { ...target.query, models: next };
      // Telegram lots have no listing time: a widened query must re-baseline or old lots look new
      const st = this.states.get(market + '|' + child.key);
      if (added && market === 'telegram' && st) { st.baselined = false; st.seen.clear(); }
    }
  }

  async loop(market, key) {
    const cursorKey = market + '#' + key;
    this.active.add(cursorKey);
    try { await this.run(market, key, cursorKey); } finally { this.active.delete(cursorKey); }
  }

  async run(market, key, cursorKey) {
    while (this.running) {
      if (key >= this.sat.keyCount) return;
      const { base, deep } = this.assigned(market, key);
      if (!base.length && !deep.length) { await sleep(700); continue; }
      // every other request goes to the deep slices, so the cheapest lots stay fast and the rest is still seen
      const useDeep = deep.length && (!base.length || (this.tick[cursorKey] = (this.tick[cursorKey] || 0) + 1) % 2 === 0);
      const list = useDeep ? deep : base;
      const ck = cursorKey + (useDeep ? ':deep' : '');
      const target = list[(this.cursor[ck] = (this.cursor[ck] || 0) + 1) % list.length];
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
    if (!state) { state = { baselined: false, seen: new Map(), touched: 0, pageSize: pageSizeOf(market) }; this.states.set(key, state); }
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
    this.updateSlice(market, target, items);

    if (this.states.size > 2000) for (const [k, s] of this.states) if (Date.now() - s.touched > STATE_TTL_MS) this.states.delete(k);
  }

  /**
   * Seconds one pass takes on the busiest market (keys poll in parallel).
   * Fast pass = cheapest lots of every collection; deep pass = every model of every collection.
   */
  cycleSeconds() { return this.cycles().fast; }
  cycles() {
    const keys = Math.max(1, this.sat.activeKeys().length);
    let fast = 0, deep = 0, queries = 0;
    for (const m of MARKETS) {
      const { base, deep: d } = this.targetsFor(m);
      queries += base.length + d.length;
      const share = d.length && base.length ? 2 : 1; // base and deep queries alternate
      fast = Math.max(fast, Math.ceil(base.length / keys) * share);
      deep = Math.max(deep, Math.ceil(d.length / keys) * share, Math.ceil(base.length / keys) * share);
    }
    const sec = n => n * config.searchGapMs / 1000;
    return { fast: sec(fast), deep: sec(deep), queries };
  }
}
