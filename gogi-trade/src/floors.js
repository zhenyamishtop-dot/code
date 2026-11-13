// Floor cache: collection floors per market and model floors per market, refreshed in the background.
import { MARKETS } from './config.js';
import { norm, sleep, withTimeout } from './util.js';

const MODEL_TTL_MS = 45_000;
const COLL_TTL_MS = 30_000;
const VOLUME_TTL_MS = 5 * 60_000;

export class Floors {
  constructor(sat) {
    this.sat = sat;
    this.coll = {};   // market -> { at, map: normCollection -> price }
    this.model = {};  // normCollection -> market -> { at, map: normModel -> price }
    this.inflight = new Map();
    this.volumes = { at: 0, map: {} }; // normCollection -> { volume, sales } for the last 24h
    this.watched = () => [];
    this.running = false;
  }

  _toMap(obj) {
    const map = new Map();
    for (const [k, v] of Object.entries(obj || {})) if (Number(v) > 0) map.set(norm(k), Number(v));
    return map;
  }

  async refreshCollections(market) {
    const data = await this.sat.collectionFloors(market);
    this.coll[market] = { at: Date.now(), map: this._toMap(data) };
  }

  refreshModels(collection, market) {
    const key = norm(collection) + '|' + market;
    if (!this.inflight.has(key)) {
      this.inflight.set(key, this.sat.modelFloors(collection, market).then(data => {
        (this.model[norm(collection)] ||= {})[market] = { at: Date.now(), map: this._toMap(data) };
      }).finally(() => this.inflight.delete(key)));
    }
    return this.inflight.get(key);
  }

  async refreshVolumes() {
    const data = await this.sat.volumes24h();
    const map = {};
    for (const c of data || []) {
      let volume = 0, sales = 0;
      for (const v of c.values || []) { volume += Number(v.volume) || 0; sales += Number(v.quantity) || 0; }
      map[norm(c.collectionName)] = { volume: Math.round(volume * 100) / 100, sales };
    }
    this.volumes = { at: Date.now(), map };
  }

  /** Live update from a search batch: the cheapest listing of a collection on a market. */
  observeCollectionFloor(market, collection, price) {
    if (!(price > 0)) return;
    (this.coll[market] ||= { at: 0, map: new Map() }).map.set(norm(collection), price);
  }

  collectionFloor(market, collection) { return this.coll[market]?.map.get(norm(collection)) ?? null; }
  collectionFloorsAll() {
    const out = {};
    for (const m of MARKETS) out[m] = Object.fromEntries(this.coll[m]?.map || []);
    return out;
  }

  /** { portals, mrkt, tonnel, getgems } -> floor of the model (null when unknown). */
  modelFloors(collection, model) {
    const out = {};
    for (const m of MARKETS) out[m] = this.model[norm(collection)]?.[m]?.map.get(norm(model)) ?? null;
    return out;
  }

  modelFloorsAll(collection) {
    const out = {};
    for (const m of MARKETS) out[m] = Object.fromEntries(this.model[norm(collection)]?.[m]?.map || []);
    return out;
  }

  /** Makes sure model floors of a collection are loaded for all markets (bounded wait). */
  async ensureModels(collection, maxWaitMs = 2500) {
    const need = MARKETS.filter(m => !this.model[norm(collection)]?.[m]);
    if (!need.length) return;
    await withTimeout(Promise.allSettled(need.map(m => this.refreshModels(collection, m))), maxWaitMs);
  }

  /** Background loop keeping floors of watched collections fresh. */
  async run(getWatched) {
    this.watched = getWatched;
    this.running = true;
    while (this.running) {
      let did = false;
      try {
        if (Date.now() - this.volumes.at > VOLUME_TTL_MS) { this.volumes.at = Date.now() - VOLUME_TTL_MS + 30_000; await this.refreshVolumes(); did = true; }
        for (const m of MARKETS) {
          if (Date.now() - (this.coll[m]?.at || 0) > COLL_TTL_MS) { await this.refreshCollections(m); did = true; }
        }
        // refresh the stalest watched collection/market pair
        let stalest = null;
        for (const c of this.watched()) for (const m of MARKETS) {
          const at = this.model[norm(c)]?.[m]?.at || 0;
          if (Date.now() - at > MODEL_TTL_MS && (!stalest || at < stalest.at)) stalest = { c, m, at };
        }
        if (stalest) { await this.refreshModels(stalest.c, stalest.m); did = true; }
      } catch (e) { await sleep(1500); }
      if (!did) await sleep(500);
    }
  }

  stop() { this.running = false; }
}
