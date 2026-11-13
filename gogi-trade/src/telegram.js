// Minimal Telegram Bot API client (long polling) + mini app initData validation.
import crypto from 'node:crypto';
import { config } from './config.js';
import { sleep } from './util.js';

export class Telegram {
  constructor(token = config.botToken) {
    this.base = `https://api.telegram.org/bot${token}/`;
    this.offset = 0;
    this.running = false;
  }

  async call(method, params = {}, { timeoutMs = 15000, retries = 2 } = {}) {
    for (let attempt = 0; ; attempt++) {
      let json;
      try {
        const res = await fetch(this.base + method, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params), signal: AbortSignal.timeout(timeoutMs),
        });
        json = await res.json();
      } catch (e) {
        if (attempt >= retries) throw e;
        await sleep(500 * (attempt + 1));
        continue;
      }
      if (json.ok) return json.result;
      if (json.error_code === 429 && attempt < retries) { await sleep(((json.parameters?.retry_after) || 1) * 1000 + 200); continue; }
      const err = new Error(`Telegram ${method}: ${json.error_code} ${json.description}`);
      err.code = json.error_code;
      throw err;
    }
  }

  send(chatId, text, extra = {}) {
    return this.call('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', ...extra });
  }

  edit(chatId, messageId, text, extra = {}) {
    return this.call('editMessageText', { chat_id: chatId, message_id: messageId, text, parse_mode: 'HTML', ...extra });
  }

  async poll(onUpdate) {
    this.running = true;
    while (this.running) {
      try {
        const updates = await this.call('getUpdates', { offset: this.offset, timeout: 25, allowed_updates: ['message', 'callback_query'] }, { timeoutMs: 35000, retries: 0 });
        for (const u of updates) {
          this.offset = u.update_id + 1;
          try { await onUpdate(u); } catch (e) { console.error('update handler:', e.message); }
        }
      } catch (e) {
        if (e.code === 401 || e.code === 409) { console.error(e.message); await sleep(5000); }
        else await sleep(1500);
      }
    }
  }

  stop() { this.running = false; }
}

/**
 * Validates Telegram WebApp initData (HMAC-SHA256, https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app).
 * Returns the parsed user object or null.
 */
export function validateInitData(initData, botToken = config.botToken, maxAgeSec = 86400, now = Date.now()) {
  if (!initData || typeof initData !== 'string' || initData.length > 8192) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');
  const dataCheck = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expected = crypto.createHmac('sha256', secret).update(dataCheck).digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const authDate = Number(params.get('auth_date')) || 0;
  if (maxAgeSec && now / 1000 - authDate > maxAgeSec) return null;
  try { return JSON.parse(params.get('user') || 'null'); } catch { return null; }
}

/** Builds signed initData — used by tests and the local preview tool. */
export function signInitData(user, botToken = config.botToken, authDate = Math.floor(Date.now() / 1000)) {
  const params = new URLSearchParams({ auth_date: String(authDate), query_id: 'AAgogi', user: JSON.stringify(user) });
  const dataCheck = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  params.set('hash', crypto.createHmac('sha256', secret).update(dataCheck).digest('hex'));
  return params.toString();
}
