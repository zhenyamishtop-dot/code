// Catalog of every collection with its models, backdrops and patterns (from Gift Satellite), cached on disk.
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { norm } from './util.js';

const TTL_MS = 12 * 3600 * 1000;
const COLORS_URL = 'https://cdn.changes.tg/gifts/backdrops/Lol%20Pop/backdrops.json';

export class Catalog {
  constructor(sat, file = path.join(config.dataDir, 'catalog.json')) {
    this.sat = sat;
    this.file = file;
    this.data = { collections: [], details: {}, backdropColors: {}, builtAt: 0 };
    if (fs.existsSync(file)) {
      try { this.data = { ...this.data, ...JSON.parse(fs.readFileSync(file, 'utf8')) }; } catch { /* rebuild */ }
    }
    this.pending = new Map();
    this.building = false;
  }

  get collections() { return this.data.collections; }
  known() { return new Set(this.data.collections.map(c => norm(c.name))); }
  /** Canonical spelling of a collection name, or null. */
  resolve(name) { return this.data.collections.find(c => norm(c.name) === norm(name))?.name || null; }
  progress() { return { total: this.data.collections.length, loaded: Object.keys(this.data.details).length, building: this.building }; }

  save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file + '.tmp', JSON.stringify(this.data));
    fs.renameSync(this.file + '.tmp', this.file);
  }

  async loadCollections() {
    const list = await this.sat.collections();
    this.data.collections = list.map(c => ({ name: c.name, telegramId: c.telegramId })).sort((a, b) => a.name.localeCompare(b.name));
  }

  async loadColors() {
    try {
      const res = await fetch(COLORS_URL, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) return;
      for (const b of await res.json()) {
        if (b?.name && b.hex) this.data.backdropColors[norm(b.name)] = { center: b.hex.centerColor, edge: b.hex.edgeColor };
      }
    } catch { /* colors are cosmetic */ }
  }

  /** Models / backdrops / patterns of one collection; fetched on demand if not cached yet. */
  async details(name) {
    const canonical = this.resolve(name) || name;
    const key = norm(canonical);
    if (this.data.details[key]) return this.data.details[key];
    if (!this.pending.has(key)) {
      this.pending.set(key, this.sat.collection(canonical).then(d => {
        const pick = arr => (arr || []).map(x => ({ name: x.name, rarity: x.rarityPermille })).sort((a, b) => a.name.localeCompare(b.name));
        this.data.details[key] = { name: d.name || canonical, models: pick(d.models), backdrops: pick(d.backdrops), patterns: pick(d.patterns) };
        return this.data.details[key];
      }).finally(() => this.pending.delete(key)));
    }
    return this.pending.get(key);
  }

  /** Background build: list first (fast), then details of every collection at the API's pace. */
  async init() {
    const stale = Date.now() - this.data.builtAt > TTL_MS;
    if (!this.data.collections.length) await this.loadCollections();
    if (!Object.keys(this.data.backdropColors).length) await this.loadColors();
    if (!stale && Object.keys(this.data.details).length >= this.data.collections.length) return;
    this.building = true;
    (async () => {
      try {
        if (stale) { await this.loadCollections().catch(() => {}); await this.loadColors(); }
        for (const c of this.data.collections) {
          if (!stale && this.data.details[norm(c.name)]) continue;
          if (stale) delete this.data.details[norm(c.name)];
          try { await this.details(c.name); } catch (e) { console.error('catalog:', c.name, e.message); }
        }
        this.data.builtAt = Date.now();
        this.save();
        console.log(`Каталог готов: ${this.data.collections.length} коллекций`);
      } finally { this.building = false; }
    })();
  }
}
