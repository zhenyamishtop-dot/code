// Tiny JSON-file persistence: owner, users and their filter settings.
import fs from 'node:fs';
import path from 'node:path';
import { config, MARKETS } from './config.js';

export function defaultSettings() {
  return {
    enabled: true,
    markets: Object.fromEntries(MARKETS.map(m => [m, true])),
    priceDrops: true,
    minDropPct: 3, // ignore price drops smaller than this (markets jitter prices by fractions of a percent)
    rules: [],
  };
}

export class Store {
  constructor(file = path.join(config.dataDir, 'state.json')) {
    this.file = file;
    this.state = { ownerId: config.ownerId || '', users: {} };
    if (fs.existsSync(file)) {
      try { this.state = { ...this.state, ...JSON.parse(fs.readFileSync(file, 'utf8')) }; } catch (e) { console.error('state.json повреждён, начинаю с пустого:', e.message); }
    }
    if (config.ownerId) this.state.ownerId = config.ownerId;
    this.listeners = new Set();
    this.timer = null;
  }

  onChange(fn) { this.listeners.add(fn); }

  save() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 200);
    for (const fn of this.listeners) fn();
  }

  flush() {
    clearTimeout(this.timer);
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.state, null, 1));
    fs.renameSync(tmp, this.file);
  }

  get ownerId() { return this.state.ownerId; }

  /** First user to talk to the bot becomes the owner unless OWNER_ID is set. */
  claimOwner(id) {
    if (!this.state.ownerId) { this.state.ownerId = String(id); this.save(); }
    return this.state.ownerId === String(id);
  }

  isAllowed(id) { return !!this.state.ownerId && this.state.ownerId === String(id); }

  user(id) {
    id = String(id);
    if (!this.state.users[id]) this.state.users[id] = { chatId: id, settings: defaultSettings() };
    const u = this.state.users[id];
    u.settings = { ...defaultSettings(), ...u.settings, markets: { ...defaultSettings().markets, ...(u.settings?.markets || {}) } };
    return u;
  }

  setSettings(id, settings) { this.user(id).settings = settings; this.save(); }

  /** Users that should receive alerts. */
  activeUsers() {
    return Object.entries(this.state.users)
      .filter(([id, u]) => this.isAllowed(id) && u.settings?.enabled)
      .map(([id, u]) => ({ id, chatId: u.chatId, settings: u.settings }));
  }
}
