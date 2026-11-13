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
    this.state = { ownerId: config.ownerId || '', allowed: [], pending: {}, users: {} };
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

  isOwner(id) { return !!this.state.ownerId && this.state.ownerId === String(id); }
  isAllowed(id) { return this.isOwner(id) || (this.state.allowed || []).includes(String(id)); }

  /** Friends the owner let in. */
  allow(id, name = '') {
    id = String(id);
    this.state.allowed = [...new Set([...(this.state.allowed || []), id])];
    (this.state.names ||= {})[id] = name || this.state.pending?.[id] || this.state.names?.[id] || '';
    delete (this.state.pending ||= {})[id];
    this.save();
  }
  deny(id) {
    id = String(id);
    this.state.allowed = (this.state.allowed || []).filter(x => x !== id);
    delete (this.state.pending ||= {})[id];
    if (this.state.users[id]) this.state.users[id].settings.enabled = false;
    this.save();
  }
  /** Returns true the first time a stranger asks for access. */
  requestAccess(id, name) {
    id = String(id);
    this.state.pending ||= {};
    if (id in this.state.pending) return false;
    this.state.pending[id] = name;
    this.save();
    return true;
  }
  friends() { return (this.state.allowed || []).map(id => ({ id, name: this.state.names?.[id] || '' })); }

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
