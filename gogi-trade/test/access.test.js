import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Store } from '../src/store.js';
import { Bot } from '../src/bot.js';

function setup() {
  const store = new Store(path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gogi-')), 'state.json'));
  store.state.ownerId = '1';
  const sent = [];
  const tg = { send: async (chat, text, extra) => { sent.push({ chat: String(chat), text, extra }); return { message_id: sent.length }; }, call: async () => ({}) };
  const catalog = { resolve: n => (n.toLowerCase() === 'lol pop' ? 'Lol Pop' : null), collections: [{ name: 'Lol Pop' }], progress: () => ({ total: 1, loaded: 1 }) };
  const bot = new Bot({ tg, store, catalog, poller: { cycleSeconds: () => 1, stats: {} }, notifier: { stats: {} }, floors: {}, sat: {} });
  const msg = (id, text, name = 'Friend') => bot.onUpdate({ message: { from: { id, first_name: name }, chat: { id, type: 'private' }, text } });
  const tap = (id, data) => bot.onUpdate({ callback_query: { id: 'c', from: { id }, data, message: { chat: { id } } } });
  return { store, sent, msg, tap };
}

test('friend access: request -> owner approves -> friend can use the bot; deny revokes', async () => {
  const { store, sent, msg, tap } = setup();
  await msg(2, '/start');
  assert.equal(store.isAllowed(2), false);
  const toOwner = sent.find(m => m.chat === '1');
  assert.match(toOwner.text, /Запрос доступа/);
  assert.equal(toOwner.extra.reply_markup.inline_keyboard[0][0].callback_data, 'allow:2');
  // a second message does not spam the owner
  await msg(2, '/start');
  assert.equal(sent.filter(m => m.chat === '1').length, 1);
  // a stranger cannot approve themselves
  await tap(2, 'allow:2');
  assert.equal(store.isAllowed(2), false);

  await tap(1, 'allow:2');
  assert.equal(store.isAllowed(2), true);
  assert.ok(sent.some(m => m.chat === '2' && /открыл вам доступ/.test(m.text)));
  await msg(2, '/add lol pop');
  assert.deepEqual(store.user(2).settings.rules.map(r => r.collection), ['Lol Pop']);
  assert.deepEqual(store.activeUsers().map(u => u.id), ['1', '2']);
  // friends cannot manage access
  await msg(2, '/allow 3');
  assert.equal(store.isAllowed(3), false);

  await msg(1, '/deny 2');
  assert.equal(store.isAllowed(2), false);
  assert.deepEqual(store.activeUsers().map(u => u.id), ['1']);
});

test('owner can paste a list of keys; keys are validated, applied and the message deleted', async () => {
  const { extractKeys, isOnlyKeys } = await import('../src/bot.js');
  const a = 'a'.repeat(64), b = 'b'.repeat(64), c = 'c'.repeat(64);
  assert.deepEqual(extractKeys(`1. ${a}\n2. ${b}\n3. ${a}`), [a, b]);
  assert.ok(isOnlyKeys(`1. ${a}\n2. ${b}`));
  assert.ok(isOnlyKeys(`${a}, ${b}`));
  assert.ok(!isOnlyKeys(`вот ключи ${a}`));

  const { store, msg } = setup();
  const calls = [];
  const sat = { tokens: [c], keyStats: [{}], keyCount: 1, activeKeys() { return this.tokens.map((_, i) => i); },
    checkKey: async k => (k === b ? 'bad' : 'ok'), setTokens(t) { this.tokens = t; this.keyCount = t.length; this.keyStats = t.map(() => ({})); } };
  const { Bot } = await import('../src/bot.js');
  const sent = [];
  const tg = { send: async (chat, text) => { sent.push(text); return { message_id: 9 }; }, edit: async (chat, id, text) => { sent.push(text); }, call: async (m, p) => { calls.push([m, p]); return {}; } };
  const bot = new Bot({ tg, store, catalog: { collections: [], resolve: () => null }, poller: { cycleSeconds: () => 1, syncLoops() {}, stats: {} }, notifier: { stats: {} }, floors: {}, sat });
  await bot.onUpdate({ message: { message_id: 77, from: { id: 1 }, chat: { id: 1, type: 'private' }, text: `1. ${a}\n2. ${b}` } });
  assert.deepEqual(sat.tokens, [a]);
  assert.deepEqual(store.state.satelliteKeys, [a]);
  assert.ok(calls.some(([m, p]) => m === 'deleteMessage' && p.message_id === 77));
  assert.match(sent.at(-1), /Подключено ключей: <b>1<\/b>/);
  assert.match(sent.at(-1), /<code>bbbb…bbbb<\/code> — отклонён API/);
  // a friend cannot change keys
  store.allow('2');
  await bot.onUpdate({ message: { message_id: 78, from: { id: 2 }, chat: { id: 2, type: 'private' }, text: `/keys ${c}` } });
  assert.deepEqual(sat.tokens, [a]);
});
