export const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Normalizes names so that "Durov’s Cap" and "Durov's Cap" compare equal. */
export const norm = s => String(s ?? '').replace(/[’‘`ʼ]/g, "'").trim().toLowerCase();

export const escapeHtml = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function fmtTon(n) {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  const v = Number(n);
  const digits = v >= 10000 ? 0 : 2;
  return v.toFixed(digits).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
}

export function timeAgo(date, now = Date.now()) {
  const s = Math.max(0, Math.round((now - new Date(date).getTime()) / 1000));
  if (s < 60) return `${s} сек назад`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч ${m % 60} мин назад`;
  const d = Math.floor(h / 24);
  return `${d} дн ${h % 24} ч назад`;
}

/** dd.mm HH:MM in Moscow time (UTC+3), the audience's timezone. */
export function fmtMsk(date) {
  const d = new Date(new Date(date).getTime() + 3 * 3600 * 1000);
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

/** Sequential gate: resolves callers one by one, at least `gapMs` apart. */
export class RateGate {
  constructor(gapMs) { this.gapMs = gapMs; this.next = 0; this.chain = Promise.resolve(); }
  take() {
    const run = this.chain.then(async () => {
      const wait = this.next - Date.now();
      if (wait > 0) await sleep(wait);
      this.next = Date.now() + this.gapMs;
    });
    this.chain = run.catch(() => {});
    return run;
  }
  /** Push the next slot further away (used after HTTP 429). */
  penalize(ms) { this.next = Math.max(this.next, Date.now() + ms); }
}

export function withTimeout(promise, ms, fallback) {
  let t;
  return Promise.race([promise, new Promise(r => { t = setTimeout(() => r(fallback), ms); })]).finally(() => clearTimeout(t));
}
