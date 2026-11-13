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

export function formatSales(sales, now = Date.now()) {
  if (!sales) return '<i>загружаю…</i>';
  if (!sales.length) return '<i>продаж пока не было</i>';
  return sales.map(s => {
    const title = MARKET_TITLES[s.market] || (s.market === 'telegram' ? 'Telegram' : s.market);
    return `<a href="${nftUrl(s.slug)}">#${s.number ?? s.slug.split('-').pop()}</a> за <b>${fmtTon(s.normalizedPrice)} TON</b> на ${h(title)} — ${timeAgo(s.soldAt, now)} (${fmtMsk(s.soldAt)})`;
  }).join('\n');
}

/**
 * ctx: { type, item, oldPrice, modelFloors:{market:price|null}, collectionFloor, sales:Array|null, rarity:{model,backdrop,symbol} }
 */
export function formatAlert(ctx, now = Date.now()) {
  const { item } = ctx;
  const price = Number(item.normalizedPrice);
  const market = MARKET_TITLES[item.market] || item.market;
  const head = ctx.type === 'price_drop' ? '📉 <b>ЦЕНА СНИЖЕНА</b>' : ctx.type === 'test' ? '🧪 <b>ТЕСТ</b>' : '✅ <b>ЛИСТИНГ</b>';
  const rar = v => (v != null ? ` <i>(${(v / 10).toFixed(1)}%)</i>` : '');
  const lines = [
    head,
    `<a href="${nftUrl(item.slug)}">${h(item.collectionName)} #${item.number}</a> на <a href="${marketUrl(item)}">${h(market)}</a> за <b>${fmtTon(price)} TON</b>` +
      (ctx.type === 'price_drop' && ctx.oldPrice ? ` <s>${fmtTon(ctx.oldPrice)}</s> (−${((1 - price / ctx.oldPrice) * 100).toFixed(1)}%)` : ''),
    `Модель: <b>${h(item.modelName)}</b>${rar(ctx.rarity?.model)}`,
    `Фон: ${h(item.backdropName)}${rar(ctx.rarity?.backdrop)}`,
    `Узор: ${h(item.symbolName)}${rar(ctx.rarity?.symbol)}`,
    '',
    `Флор коллекции на ${h(market)}: <b>${fmtTon(ctx.collectionFloor)} TON</b>${pct(price, ctx.collectionFloor)}`,
    'Флор модели:',
    ...MARKETS.map(m => {
      const f = ctx.modelFloors?.[m];
      const mark = m === item.market ? '▸ ' : '   ';
      return `${mark}${MARKET_TITLES[m]}: ${f != null ? `<b>${fmtTon(f)} TON</b>${pct(price, f)}` : '—'}`;
    }),
    '',
    'Последние продажи модели:',
    `<blockquote expandable>${formatSales(ctx.sales, now)}</blockquote>`,
  ];
  if (item.isLocked) lines.splice(5, 0, '🔒 Подарок с блокировкой вывода');
  return lines.join('\n');
}

export function alertKeyboard(item) {
  return { inline_keyboard: [[
    { text: `Купить на ${MARKET_TITLES[item.market] || item.market}`, url: marketUrl(item) },
    { text: 'Подарок', url: nftUrl(item.slug) },
  ]] };
}

export class Notifier {
  constructor({ tg, sat, floors, catalog, store }) {
    Object.assign(this, { tg, sat, floors, catalog, store });
    this.salesCache = new Map(); // normCollection|normModel -> { at, promise }
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
    };
  }

  /** Sends the alert right away; if sales are not ready within a moment, the message is completed by an edit. */
  async deliver(chatId, ctx) {
    const salesPromise = this.sales(ctx.item.collectionName, ctx.item.modelName);
    ctx.sales = await withTimeout(salesPromise, 900, null);
    const extra = {
      reply_markup: alertKeyboard(ctx.item),
      link_preview_options: { url: nftUrl(ctx.item.slug), prefer_large_media: true, show_above_text: false },
    };
    const msg = await this.tg.send(chatId, formatAlert(ctx), extra);
    if (!ctx.sales) {
      salesPromise.then(sales => {
        ctx.sales = sales || [];
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
