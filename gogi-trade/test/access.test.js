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
