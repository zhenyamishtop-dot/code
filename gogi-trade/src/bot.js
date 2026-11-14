// Bot commands: status, pause/resume, quick filter edits by text, test alert. Rich filters live in the mini app.
import { config, MARKETS, MARKET_TITLES } from './config.js';
import { sanitizeSettings } from './filters.js';
import { escapeHtml as h, norm, fmtTon } from './util.js';

const COMMANDS = [
  { command: 'start', description: 'Главное меню' },
  { command: 'status', description: 'Состояние и скорость опроса' },
  { command: 'list', description: 'Мои фильтры' },
  { command: 'add', description: 'Добавить коллекцию: /add Lol Pop' },
  { command: 'remove', description: 'Убрать коллекцию: /remove Lol Pop' },
  { command: 'pause', description: 'Поставить уведомления на паузу' },
  { command: 'resume', description: 'Включить уведомления' },
  { command: 'test', description: 'Прислать тестовое уведомление' },
  { command: 'users', description: 'Кому открыт доступ (для владельца)' },
  { command: 'keys', description: 'Ключи Gift Satellite (для владельца)' },
];

/** Gift Satellite keys in any text: one per line, numbered, comma or space separated. */
export const extractKeys = text => [...new Set((String(text).match(/\b[a-f0-9]{64}\b/gi) || []).map(k => k.toLowerCase()))];
/** True when the message holds nothing but keys (and list numbering like "1."). */
export const isOnlyKeys = text => !String(text).replace(/\b[a-f0-9]{64}\b/gi, '').replace(/(^|\s)\d{1,3}[.)]/g, ' ').replace(/[\s,;]+/g, '').length;
const maskKey = k => `${k.slice(0, 4)}…${k.slice(-4)}`;

export class Bot {
  constructor({ tg, store, catalog, poller, notifier, floors, sat }) {
    Object.assign(this, { tg, store, catalog, poller, notifier, floors, sat });
    this.webapp = /^https:\/\//.test(config.webappUrl) ? config.webappUrl : '';
  }

  async setup() {
    this.me = await this.tg.call('getMe');
    await this.tg.call('setMyCommands', { commands: COMMANDS });
    await this.tg.call('setMyDescription', { description: 'Gogi Trade — мгновенные уведомления о новых листингах NFT-подарков на Portals, MRKT, Tonnel и Getgems: цена, флоры модели на всех маркетах и последние продажи.' }).catch(() => {});
    await this.tg.call('setMyShortDescription', { short_description: 'Снайпер листингов NFT-подарков: Portals · MRKT · Tonnel · Getgems' }).catch(() => {});
    await this.tg.call('setChatMenuButton', {
      menu_button: this.webapp ? { type: 'web_app', text: 'Gogi Trade', web_app: { url: this.webapp } } : { type: 'commands' },
    }).catch(e => console.error('menu button:', e.message));
    return this.me;
  }

  mainKeyboard(settings) {
    const rows = [];
    if (this.webapp) rows.push([{ text: '⚡ Открыть Gogi Trade', web_app: { url: this.webapp } }]);
    rows.push([
      settings.enabled ? { text: '⏸ Пауза', callback_data: 'pause' } : { text: '▶️ Включить', callback_data: 'resume' },
      { text: '📊 Статус', callback_data: 'status' },
    ]);
    rows.push([{ text: '🧪 Тестовое уведомление', callback_data: 'test' }]);
    return { inline_keyboard: rows };
  }

  statusText(userId) {
    const s = this.store.user(userId).settings;
    const active = s.rules.filter(r => r.enabled !== false);
    const cycle = this.poller.cycleSeconds();
    const cat = this.catalog.progress();
    const lines = [
      `<b>Gogi Trade</b> — ${s.enabled ? '🟢 работает' : '⏸ на паузе'}`,
      '',
      `Коллекций в фильтрах: <b>${active.length}</b>`,
      `Маркеты: ${MARKETS.filter(m => s.markets[m] !== false).map(m => MARKET_TITLES[m]).join(' · ') || '—'}`,
      `Ключей Gift Satellite: <b>${this.sat.activeKeys().length}</b>` + (this.sat.activeKeys().length < this.sat.keyCount ? ` (отключено: ${this.sat.keyCount - this.sat.activeKeys().length})` : ''),
      active.length ? `Полный круг опроса: <b>~${Math.max(1, Math.round(cycle))} сек</b> на каждый маркет` : 'Добавьте коллекции — и я начну следить.',
      '',
      ...MARKETS.map(m => {
        const st = this.poller.stats[m];
        const ago = st.lastPollAt ? `${Math.round((Date.now() - st.lastPollAt) / 100) / 10} сек назад, ${st.lastMs} мс` : 'ещё не опрашивался';
        return `${MARKET_TITLES[m]}: ${ago}`;
      }),
      '',
      `Уведомлений отправлено: ${this.notifier.stats.alerts}` + (this.notifier.stats.lastLatencyMs ? ` (последнее за ${this.notifier.stats.lastLatencyMs} мс)` : ''),
      `Каталог: ${cat.loaded}/${cat.total} коллекций${cat.building ? ' (загружается…)' : ''}`,
    ];
    return lines.join('\n');
  }

  listText(userId) {
    const s = this.store.user(userId).settings;
    if (!s.rules.length) return 'Фильтров пока нет. Добавьте коллекцию: <code>/add Lol Pop</code>' + (this.webapp ? ' или откройте мини-приложение.' : '');
    return '<b>Мои фильтры</b>\n\n' + s.rules.map(r => {
      const parts = [];
      if (r.models.length) parts.push(`модели: ${r.models.length}`);
      if (r.backdrops.length) parts.push(`фоны: ${r.backdrops.length}`);
      if (r.symbols.length) parts.push(`узоры: ${r.symbols.length}`);
      if (r.maxPrice != null) parts.push(`до ${fmtTon(r.maxPrice)} TON`);
      if (r.maxOverFloorPct != null) parts.push(`≤ флор ${r.maxOverFloorPct >= 0 ? '+' : ''}${r.maxOverFloorPct}%`);
      return `${r.enabled !== false ? '🟢' : '⚪️'} <b>${h(r.collection)}</b>${parts.length ? ' — ' + parts.join(', ') : ' — все подарки'}`;
    }).join('\n');
  }

  keysText() {
    const st = this.sat.keyStats;
    const rows = this.sat.tokens.map((k, i) => `${i + 1}. <code>${maskKey(k)}</code> — ${st[i]?.disabled ? 'отключён (API отклонил)' : 'работает'}`);
    return `<b>Ключи Gift Satellite: ${this.sat.activeKeys().length} из ${this.sat.keyCount} работают</b>\n${rows.join('\n')}\n\n` +
      'Чтобы заменить список, просто отправьте все ключи одним сообщением (по одному в строке). Сообщение с ключами я сразу удалю.';
  }

  /** Replaces the key list from a message; the message with keys is deleted from the chat. */
  async keysCommand(chatId, msg, text) {
    const keys = extractKeys(text);
    if (msg?.message_id && keys.length) await this.tg.call('deleteMessage', { chat_id: chatId, message_id: msg.message_id }).catch(() => {});
    if (!keys.length) return this.tg.send(chatId, this.keysText());
    const status = await this.tg.send(chatId, `Проверяю ${keys.length} ключ(ей)…`);
    const results = [];
    for (const k of keys) results.push([k, await this.sat.checkKey(k)]);
    const good = results.filter(([, r]) => r === 'ok').map(([k]) => k);
    const bad = results.filter(([, r]) => r !== 'ok');
    const lines = bad.map(([k, r]) => `<code>${maskKey(k)}</code> — ${r === 'bad' ? 'отклонён API' : 'не удалось проверить'}`);
    if (!good.length) return this.tg.edit(chatId, status.message_id, '❌ Ни один ключ не прошёл проверку, оставил прежние.\n' + lines.join('\n'));
    this.sat.setTokens(good);
    this.poller.syncLoops();
    this.store.state.satelliteKeys = good;
    this.store.save();
    const cycle = Math.max(1, Math.round(this.poller.cycleSeconds()));
    return this.tg.edit(chatId, status.message_id, `✅ Подключено ключей: <b>${good.length}</b>. Круг опроса сейчас ~${cycle} сек.` +
      (lines.length ? '\n\nНе подключены:\n' + lines.join('\n') : '') + '\n\nСообщение с ключами удалено из чата.');
  }

  async sendTest(chatId, userId) {
    const s = this.store.user(userId).settings;
    const collection = s.rules.find(r => r.enabled !== false)?.collection || 'Lol Pop';
    const market = MARKETS.find(m => s.markets[m] !== false) || 'portals';
    const items = await this.sat.search(market, collection, {});
    if (!items?.length) return this.tg.send(chatId, `На ${MARKET_TITLES[market]} сейчас нет лотов ${h(collection)}.`);
    const ctx = await this.notifier.context({ type: 'test', item: items[0] });
    return this.notifier.deliver(chatId, ctx);
  }

  async onUpdate(u) {
    const msg = u.message;
    const cb = u.callback_query;
    const from = msg?.from || cb?.from;
    if (!from) return;
    const chatId = msg?.chat.id ?? cb.message?.chat.id;
    if (msg && msg.chat.type !== 'private') return;

    this.store.claimOwner(from.id);
    if (!this.store.isAllowed(from.id)) {
      if (cb) await this.tg.call('answerCallbackQuery', { callback_query_id: cb.id }).catch(() => {});
      const name = [from.first_name, from.last_name].filter(Boolean).join(' ') + (from.username ? ` (@${from.username})` : '');
      if (this.store.requestAccess(from.id, name)) {
        await this.tg.send(this.store.ownerId, `🔔 <b>Запрос доступа</b>\n${h(name)}\nID: <code>${from.id}</code>`, {
          reply_markup: { inline_keyboard: [[{ text: '✅ Разрешить', callback_data: `allow:${from.id}` }, { text: '🚫 Отклонить', callback_data: `deny:${from.id}` }]] },
        }).catch(e => console.error('access request:', e.message));
        return this.tg.send(chatId, 'Это приватный бот. Я отправил владельцу запрос на доступ — напишу, когда он ответит.');
      }
      return this.tg.send(chatId, 'Запрос уже у владельца. Как только он разрешит доступ, я напишу.');
    }
    const user = this.store.user(from.id);
    if (String(user.chatId) !== String(chatId)) { user.chatId = String(chatId); this.store.save(); }
    const s = user.settings;

    let cmd = '', arg = '';
    if (cb) { cmd = cb.data; await this.tg.call('answerCallbackQuery', { callback_query_id: cb.id }).catch(() => {}); }
    else if (msg?.text?.startsWith('/')) {
      const m = msg.text.match(/^\/([a-z_]+)(?:@\w+)?\s*([\s\S]*)$/i);
      if (m) { cmd = m[1].toLowerCase(); arg = m[2].trim(); }
    } else if (msg?.text && this.store.isOwner(from.id) && extractKeys(msg.text).length && isOnlyKeys(msg.text)) {
      // the owner just pasted a list of Gift Satellite keys
      cmd = 'keys'; arg = msg.text;
    } else return;

    if (cmd === 'keys') {
      if (!this.store.isOwner(from.id)) return this.tg.send(chatId, 'Эта команда доступна только владельцу.');
      return this.keysCommand(chatId, msg, arg);
    }

    // owner-only access management
    const access = cmd.match(/^(allow|deny)(?::(\d+))?$/);
    if (access || cmd === 'users') {
      if (!this.store.isOwner(from.id)) return this.tg.send(chatId, 'Эта команда доступна только владельцу.');
      if (cmd === 'users') {
        const fr = this.store.friends();
        return this.tg.send(chatId, fr.length
          ? '<b>Доступ открыт:</b>\n' + fr.map(f => `• ${h(f.name || 'без имени')} — <code>${f.id}</code>`).join('\n') + '\n\nЗакрыть доступ: <code>/deny ID</code>'
          : 'Доступ есть только у вас. Пусть друг напишет боту /start — вам придёт запрос с кнопкой «Разрешить».');
      }
      const id = access[2] || arg.replace(/\D/g, '');
      if (!id) return this.tg.send(chatId, `Укажите ID: <code>/${access[1]} 123456789</code>`);
      if (access[1] === 'allow') {
        this.store.allow(id);
        this.store.user(id);
        await this.tg.send(id, '✅ Владелец открыл вам доступ к Gogi Trade. Нажмите /start.').catch(() => {});
        return this.tg.send(chatId, `✅ Доступ открыт для <code>${id}</code>.`);
      }
      this.store.deny(id);
      await this.tg.send(id, 'Владелец закрыл доступ к Gogi Trade.').catch(() => {});
      return this.tg.send(chatId, `🚫 Доступ закрыт для <code>${id}</code>.`);
    }

    switch (cmd) {
      case 'start':
      case 'help':
        return this.tg.send(chatId, [
          '<b>⚡ Gogi Trade</b>',
          '',
          'Присылаю новые листинги NFT-подарков с <b>Portals, MRKT, Tonnel и Getgems</b> сразу, как они появляются: цена, флор модели на всех четырёх маркетах, последние 5 продаж модели и кнопка покупки.',
          '',
          this.webapp ? 'Откройте мини-приложение, выберите коллекции, модели, фоны и узоры — и я начну следить.' : 'Мини-приложение появится после настройки адреса (WEBAPP_URL). Пока фильтры можно задать командами: <code>/add Lol Pop</code>, <code>/remove Lol Pop</code>, <code>/list</code>.',
          '',
          'Чем меньше коллекций выбрано, тем быстрее опрос: одна коллекция проверяется раз в секунду на каждом маркете.',
        ].join('\n'), { reply_markup: this.mainKeyboard(s) });
      case 'status':
        return this.tg.send(chatId, this.statusText(from.id), { reply_markup: this.mainKeyboard(s) });
      case 'list':
        return this.tg.send(chatId, this.listText(from.id));
      case 'pause':
        s.enabled = false; this.store.save();
        return this.tg.send(chatId, '⏸ Уведомления на паузе. Опрос остановлен.', { reply_markup: this.mainKeyboard(s) });
      case 'resume':
        s.enabled = true; this.store.save();
        return this.tg.send(chatId, '🟢 Уведомления включены.', { reply_markup: this.mainKeyboard(s) });
      case 'add': {
        if (!arg) return this.tg.send(chatId, 'Укажите коллекцию: <code>/add Lol Pop</code>');
        const name = this.catalog.resolve(arg);
        if (!name) {
          const near = this.catalog.collections.filter(c => norm(c.name).includes(norm(arg))).slice(0, 8).map(c => `<code>/add ${h(c.name)}</code>`);
          return this.tg.send(chatId, `Не нашёл коллекцию «${h(arg)}».` + (near.length ? '\nВозможно:\n' + near.join('\n') : ''));
        }
        if (s.rules.some(r => norm(r.collection) === norm(name))) return this.tg.send(chatId, `${h(name)} уже в фильтрах.`);
        user.settings = sanitizeSettings({ ...s, rules: [...s.rules, { collection: name }] });
        this.store.save();
        return this.tg.send(chatId, `🟢 Слежу за <b>${h(name)}</b> — все модели, фоны и узоры.\nТочные фильтры настраиваются в мини-приложении.`);
      }
      case 'remove': {
        const before = s.rules.length;
        s.rules = s.rules.filter(r => norm(r.collection) !== norm(arg));
        this.store.save();
        return this.tg.send(chatId, before === s.rules.length ? `«${h(arg)}» нет в фильтрах. Список: /list` : `Убрал <b>${h(arg)}</b>.`);
      }
      case 'test':
        try { return await this.sendTest(chatId, from.id); }
        catch (e) { return this.tg.send(chatId, 'Не получилось собрать тестовое уведомление: ' + h(e.message)); }
      default:
        return this.tg.send(chatId, 'Не знаю такой команды. Список — в меню или /start.');
    }
  }
}
