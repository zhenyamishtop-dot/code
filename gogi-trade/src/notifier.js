// Turns poller events into Telegram alerts: listing + floors on all markets + last sales of the model.
import { MARKETS, MARKET_TITLES } from './config.js';
import { matchListing } from './filters.js';
import { escapeHtml as h, fmtTon, fmtMsk, timeAgo, norm, withTimeout } from './util.js';

export const nftUrl = slug => `https://t.me/nft/${slug}`;

/** Deep link that opens the listing inside the market. */
export function marketUrl(item) {
  const id = encodeURIComponent(item.giftId ?? '');
  switch (item.market) {
    case 'portals': return `https://t.me/portals/market?startapp=gift_${id}`;
    case 'mrkt': return `https://t.me/mrkt/app?startapp=${id}`;
    case 'tonnel': return `https://t.me/tonnel_network_bot/gift?startapp=${id}`;
    case 'getgems': return `https://getgems.io/nft/${id}`;
    default: return nftUrl(item.slug);
  }
}

const pct = (price, floor) => {
  if (!(floor > 0)) return '';
  const d = (price / floor - 1) * 100;
  const s = Math.abs(d) < 0.05 ? '0' : (d > 0 ? '+' : '−') + Math.abs(d).toFixed(Math.abs(d) < 10 ? 1 : 0);
  return ` (${s}%)`;
};

/** "<b>12.5 TON</b> на <a>MRKT</a> (+3%)" for the cheapest matching lot, or a loading / empty marker. */
export function formatAttrFloor(best, price) {
  if (best === undefined) return '<i>загружаю…</i>';
  if (!best) return '—';
  const title = MARKET_TITLES[best.market] || best.market;
  return `<b>${fmtTon(best.normalizedPrice)} TON</b> на <a href="${marketUrl(best)}">${h(title)}</a>${pct(price, Number(best.normalizedPrice))}`;
}

/** Cheapest lot over several markets' search results; `filter` narrows the candidates. */
export function cheapestOf(resultsByMarket, filter = () => true) {
  let best = null;
  for (const [market, items] of Object.entries(resultsByMarket || {})) {
    for (const it of Array.isArray(items) ? items : []) {
      if (!filter(it)) continue;
      const p = Number(it.normalizedPrice);
      if (p > 0 && (!best || p < Number(best.normalizedPrice))) best = { ...it, market: it.market || market };
    }
  }
  return best;
}

export function formatSales(sales, now = Date.now()) {
  if (!sales) return '<i>загружаю…</i>';
  if (!sales.length) return '<i>продаж пока не было</i>';
  return sales.map(s => {
    const title = MARKET_TITLES[s.market] || (s.market === 'telegram' ? 'Telegram' : s.market);
    return `▫️ <a href="${nftUrl(s.slug)}">#${s.number ?? s.slug.split('-').pop()}</a> · <b>${fmtTon(s.normalizedPrice)} TON</b> · ${h(title)} · ${timeAgo(s.soldAt, now)} <i>(${fmtMsk(s.soldAt)})</i>`;
  }).join('\n');
}

/**
 * Orange "terminal" style: Telegram cannot colour text, so the palette comes from
 * orange/black markers (🟧 🔸 🟠 ⚫️) and a fixed layout.
 * ctx: { type, item, oldPrice, modelFloors:{market:price|null}, collectionFloor, sales:Array|null, rarity:{model,backdrop,symbol} }
 */
export function formatAlert(ctx, now = Date.now()) {
  const { item } = ctx;
  const price = Number(item.normalizedPrice);
  const market = MARKET_TITLES[item.market] || item.market;
  const head = ctx.type === 'price_drop' ? '🔻 <b>СНИЖЕНИЕ ЦЕНЫ</b>' : ctx.type === 'test' ? '🧪 <b>ТЕСТ</b>' : '🟧 <b>ЛИСТИНГ</b>';
  const rar = v => (v != null ? ` <i>· ${(v / 10).toFixed(1)}%</i>` : '');
  const known = MARKETS.map(m => ctx.modelFloors?.[m]).filter(v => v != null && v > 0);
  const minFloor = known.length ? Math.min(...known) : null;
  const lines = [
    `${head} · <b>${h(market).toUpperCase()}</b>`,
    `<a href="${nftUrl(item.slug)}"><b>${h(item.collectionName)} #${item.number}</b></a>`,
    `💰 <b>${fmtTon(price)} TON</b>` +
      (ctx.type === 'price_drop' && ctx.oldPrice ? ` <s>${fmtTon(ctx.oldPrice)}</s> <b>−${((1 - price / ctx.oldPrice) * 100).toFixed(1)}%</b>` : '') +
      ` на <a href="${marketUrl(item)}">${h(market)}</a>`,
  ];
  if (minFloor != null && price < minFloor) lines.push(`🔥 <b>Ниже флора модели на ${((1 - price / minFloor) * 100).toFixed(1)}%</b>`);
  if (item.isLocked) lines.push('🔒 Подарок с блокировкой вывода');
  lines.push(
    '',
    `🔸 Модель: <b>${h(item.modelName)}</b>${rar(ctx.rarity?.model)}`,
    `🔸 Фон: <b>${h(item.backdropName)}</b>${rar(ctx.rarity?.backdrop)}`,
    `🔸 Узор: <b>${h(item.symbolName)}</b>${rar(ctx.rarity?.symbol)}`,
    '',
    `📊 <b>ФЛОР МОДЕЛИ</b>`,
    ...MARKETS.map(m => {
      const f = ctx.modelFloors?.[m];
      const mark = m === item.market ? '🟠' : '⚫️';
      const best = f != null && f === minFloor ? ' ⬅️ мин' : '';
      return `${mark} ${MARKET_TITLES[m]}: ${f != null ? `<b>${fmtTon(f)} TON</b>${pct(price, f)}${best}` : '—'}`;
    }),
    `🟧 Флор коллекции на ${h(market)}: <b>${fmtTon(ctx.collectionFloor)} TON</b>${pct(price, ctx.collectionFloor)}`,
    `🎨 Флор коллекции по фону (без этого): ${formatAttrFloor(ctx.backdropFloor, price)}`,
    `💎 Флор модели и фона (без этого): ${formatAttrFloor(ctx.modelBackdropFloor, price)}`,
    '',
    `🕓 <b>ПОСЛЕДНИЕ ПРОДАЖИ МОДЕЛИ</b>`,
    `<blockquote expandable>${formatSales(ctx.sales, now)}</blockquote>`,
  );
  return lines.join('\n');
}

export function alertKeyboard(item) {
  return { inline_keyboard: [[
    { text: `🟧 Купить на ${MARKET_TITLES[item.market] || item.market}`, url: marketUrl(item) },
    { text: '🎁 Подарок', url: nftUrl(item.slug) },
  ]] };
}

export class Notifier {
  constructor({ tg, sat, floors, catalog, store }) {
    Object.assign(this, { tg, sat, floors, catalog, store });
    this.salesCache = new Map(); // normCollection|normModel -> { at, promise }
    this.attrCache = new Map();  // query key -> { at, promise of { market: items[] } }
    this.sent = new Map();       // userId|giftKey|price -> ts (dedupe across markets' loops)
    this.stats = { alerts: 0, lastAlertAt: 0, lastLatencyMs: 0 };
  }

  sales(collection, model) {
    const key = norm(collection) + '|' + norm(model);
    const hit = this.salesCache.get(key);
    if (hit && Date.now() - hit.at < 20_000) return hit.promise;
    const promise = this.sat.sales(collection, { models: [model], pageSize: 5 }).catch(() => null);
    this.salesCache.set(key, { at: Date.now(), promise });
    if (this.salesCache.size > 500) for (const [k, v] of this.salesCache) if (Date.now() - v.at > 60_000) this.salesCache.delete(k);
    return promise;
  }

  /** Search all markets with a narrowed query (cached briefly; failures count as "no data" for that market). */
  searchAll(collection, query) {
    const key = norm(collection) + '|' + JSON.stringify(query);
    const hit = this.attrCache.get(key);
    if (hit && Date.now() - hit.at < 30_000) return hit.promise;
    const promise = Promise.all(MARKETS.map(m => this.sat.search(m, collection, query).then(r => [m, r], () => [m, null])))
      .then(pairs => Object.fromEntries(pairs));
    this.attrCache.set(key, { at: Date.now(), promise });
    if (this.attrCache.size > 300) for (const [k, v] of this.attrCache) if (Date.now() - v.at > 120_000) this.attrCache.delete(k);
    return promise;
  }

  /**
   * Cheapest other lot of the collection with the same backdrop (any model) and with the same model + backdrop,
   * over all markets (the alerted gift is excluded). The backdrop search usually already contains the model; a second, narrower search
   * is made only when the 50 cheapest backdrop lots have no lot of this model.
   */
  async attrFloors(item) {
    const col = item.collectionName;
    // the alerted gift itself is left out, so the floors show what else is on sale to compare with
    const self = String(item.slug || '').toLowerCase();
    const other = it => String(it.slug || '').toLowerCase() !== self;
    const byBackdrop = await this.searchAll(col, { models: [], backdrops: [item.backdropName], symbols: [] });
    const backdropFloor = cheapestOf(byBackdrop, other);
    const sameModel = it => other(it) && norm(it.modelName) === norm(item.modelName);
    let modelBackdropFloor = cheapestOf(byBackdrop, sameModel);
    const truncated = Object.values(byBackdrop).some(r => Array.isArray(r) && r.length >= 50);
    if (truncated) {
      const narrow = await this.searchAll(col, { models: [item.modelName], backdrops: [item.backdropName], symbols: [] });
      modelBackdropFloor = cheapestOf(narrow, other) || modelBackdropFloor;
    }
    return { backdropFloor, modelBackdropFloor };
  }

  rarity(item) {
    const d = this.catalog?.data.details[norm(item.collectionName)];
    const find = (arr, name) => arr?.find(x => norm(x.name) === norm(name))?.rarity ?? null;
    return d ? { model: find(d.models, item.modelName), backdrop: find(d.backdrops, item.backdropName), symbol: find(d.patterns, item.symbolName) } : null;
  }

  async context(ev) {
    const { item } = ev;
    await this.floors.ensureModels(item.collectionName, 1500);
    return {
      type: ev.type, item, oldPrice: ev.oldPrice,
      modelFloors: this.floors.modelFloors(item.collectionName, item.modelName),
      collectionFloor: this.floors.collectionFloor(item.market, item.collectionName),
      rarity: this.rarity(item),
      sales: null,
      backdropFloor: undefined,     // undefined = still loading, null = nothing on sale
      modelBackdropFloor: undefined,
    };
  }

  /**
   * Sends the alert right away; sales and backdrop floors that are not ready within a moment
   * are filled in by editing the message once they arrive.
   */
  async deliver(chatId, ctx) {
    const salesP = this.sales(ctx.item.collectionName, ctx.item.modelName).then(v => v || []);
    const attrP = this.attrFloors(ctx.item).catch(() => ({ backdropFloor: null, modelBackdropFloor: null }));
    const apply = (sales, attr) => {
      if (sales) ctx.sales = sales;
      if (attr) { ctx.backdropFloor = attr.backdropFloor; ctx.modelBackdropFloor = attr.modelBackdropFloor; }
    };
    apply(await withTimeout(salesP, 900, null), await withTimeout(attrP, 900, null));
    const extra = {
      reply_markup: alertKeyboard(ctx.item),
      link_preview_options: { url: nftUrl(ctx.item.slug), prefer_large_media: true, show_above_text: false },
    };
    const msg = await this.tg.send(chatId, formatAlert(ctx), extra);
    if (!ctx.sales || ctx.backdropFloor === undefined) {
      Promise.all([salesP, attrP]).then(([sales, attr]) => {
        apply(sales, attr);
        return this.tg.edit(chatId, msg.message_id, formatAlert(ctx), extra);
      }).catch(() => {});
    }
    return msg;
  }

  async handle(ev) {
    const { item } = ev;
    const users = this.store.activeUsers();
    if (!users.length) return;
    const ctx = await this.context(ev);
    const known = Object.values(ctx.modelFloors).filter(v => v != null);
    const refFloor = known.length ? Math.min(...known) : null;
    for (const u of users) {
      if (ev.type === 'price_drop') {
        if (u.settings.priceDrops === false) continue;
        const dropPct = (1 - Number(item.normalizedPrice) / ev.oldPrice) * 100;
        if (dropPct < (u.settings.minDropPct ?? 3)) continue;
      }
      if (!matchListing(u.settings, item, refFloor)) continue;
      const key = `${u.id}|${item.market}|${item.giftId || item.slug}|${item.normalizedPrice}`;
      if (this.sent.has(key)) continue;
      this.sent.set(key, Date.now());
      try {
        await this.deliver(u.chatId, { ...ctx });
        this.stats.alerts++; this.stats.lastAlertAt = Date.now(); this.stats.lastLatencyMs = Date.now() - ev.detectedAt;
        console.log(`${new Date().toISOString()} ${ev.type} ${item.market} ${item.slug} ${item.normalizedPrice} TON → ${u.id} за ${this.stats.lastLatencyMs} мс`);
      } catch (e) { console.error('alert send:', e.message); }
    }
    if (this.sent.size > 5000) for (const [k, t] of this.sent) if (Date.now() - t > 3600_000) this.sent.delete(k);
  }
}
