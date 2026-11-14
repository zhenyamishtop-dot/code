/* Gogi Trade mini app — vanilla JS, no build step. */
(() => {
  const tg = window.Telegram?.WebApp;
  const initData = tg?.initData || new URLSearchParams(location.hash.slice(1)).get('devInitData') || '';
  const $ = id => document.getElementById(id);
  const CDN = 'https://cdn.changes.tg/gifts';
  const norm = s => String(s ?? '').replace(/[’‘`ʼ]/g, "'").trim().toLowerCase();
  // the image CDN uses a plain apostrophe (Durov's Cap), Gift Satellite sometimes the typographic one
  const cdnName = s => encodeURIComponent(String(s).replace(/[’‘ʼ`]/g, "'"));
  const colImg = name => `${CDN}/models/${cdnName(name)}/png/Original.png`;
  const modelImg = (col, model) => `${CDN}/models/${cdnName(col)}/png/${cdnName(model)}.png`;
  const patternImg = (col, p) => `${CDN}/patterns/${cdnName(col)}/png/${cdnName(p)}.png`;
  const ton = v => (v == null ? '—' : Number(v).toFixed(v >= 10000 ? 0 : 2).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1'));
  const compact = v => (v >= 1e6 ? (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : v >= 1e3 ? (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'K' : String(Math.round(v)));

  const state = {
    settings: null, collections: [], collectionFloors: {}, volumes: {}, backdropColors: {}, markets: [], status: null,
    details: {}, editing: null, tab: 'models', sort: 'volume-desc', noneMode: {},
  };

  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') node.className = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else if (k === 'style') node.style.cssText = v;
      else node.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat()) if (c != null && c !== false) node.append(c.nodeType ? c : document.createTextNode(c));
    return node;
  }
  const img = (src, cls = '') => el('img', { src, class: 'fade ' + cls, loading: 'lazy', alt: '', onload: e => e.target.classList.add('in'), onerror: e => { e.target.style.visibility = 'hidden'; } });
  const haptic = kind => { try { kind === 'ok' ? tg?.HapticFeedback?.notificationOccurred('success') : kind === 'tap' ? tg?.HapticFeedback?.impactOccurred('light') : tg?.HapticFeedback?.selectionChanged(); } catch { /* not in Telegram */ } };
  const stagger = i => `animation-delay:${Math.min(i, 14) * 22}ms`;

  let toastTimer;
  function toast(text, isError) {
    const t = $('toast');
    t.textContent = text; t.className = 'toast' + (isError ? ' err' : ''); t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, isError ? 3500 : 1300);
  }

  async function api(method, path, body) {
    const res = await fetch(path, { method, headers: { 'X-Init-Data': initData, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Ошибка ' + res.status);
    return data;
  }

  // ---- saving (debounced autosave) ----
  let saveTimer, saving = false, dirty = false;
  function save() {
    dirty = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 500);
  }
  async function flush() {
    if (saving) return save();
    saving = true; dirty = false;
    try {
      const r = await api('PUT', '/api/settings', state.settings);
      state.status = r.status;
      renderHeader();
      toast('Сохранено');
    } catch (e) { toast(e.message, true); }
    saving = false;
    if (dirty) save();
  }

  const minFloor = name => {
    const vals = state.markets.map(m => state.collectionFloors[m.id]?.[norm(name)]).filter(v => v > 0);
    return vals.length ? Math.min(...vals) : null;
  };
  const vol = name => state.volumes[norm(name)] || null;
  const volText = name => { const v = vol(name); return v ? `24ч: ${compact(v.volume)} TON · ${v.sales} прод.` : '24ч: нет продаж'; };
  const ruleOf = name => state.settings.rules.find(r => norm(r.collection) === norm(name));
  const activeCount = () => state.settings.rules.filter(r => r.enabled !== false).length;
  // every Gift Satellite key polls its share of collections in parallel (1 req/s per market each)
  const cycleFor = n => Math.max(1, Math.round(Math.ceil(n / Math.max(1, state.status?.keys || 1)) * 1.05));

  // ---- ticker: top collections by 24h volume ----
  function renderTicker() {
    const top = state.collections
      .map(n => ({ n, v: vol(n), f: minFloor(n) }))
      .filter(x => x.v && x.f != null)
      .sort((a, b) => b.v.volume - a.v.volume)
      .slice(0, 14);
    const box = $('ticker');
    if (!top.length) { box.hidden = true; return; }
    const row = () => top.map(x => el('span', { class: 'tk' }, img(colImg(x.n)), el('b', {}, x.n), el('span', { class: 'p' }, `${ton(x.f)} TON`), el('span', { class: 'v' }, compact(x.v.volume))));
    $('tickerTrack').replaceChildren(...row(), ...row()); // duplicated for a seamless loop
    box.hidden = false;
  }

  // ---- main screen ----
  function renderHeader() {
    const s = state.settings, st = state.status;
    const active = activeCount();
    const cycle = cycleFor(active);
    const live = $('live');
    live.replaceChildren();
    if (!s.enabled) live.append(el('span', { class: 'dot warn' }), 'Пауза');
    else if (!active) live.append(el('span', { class: 'dot' }), 'Выберите коллекции');
    else live.append(el('span', { class: 'dot live' }), `LIVE · круг ~${cycle} сек`);
    $('master').checked = s.enabled;
    $('drops').checked = s.priceDrops !== false;
    $('dropRow').hidden = s.priceDrops === false;
    if (document.activeElement !== $('dropPct')) $('dropPct').value = s.minDropPct ?? 3;
    $('stats').replaceChildren(
      el('div', { class: 'stat' }, el('b', {}, String(active)), el('span', {}, 'коллекций')),
      el('div', { class: 'stat' }, el('b', {}, active && s.enabled ? '~' + cycle : '—', el('small', {}, active && s.enabled ? 'сек' : '')), el('span', {}, 'круг')),
      el('div', { class: 'stat' }, el('b', {}, String(st?.alerts ?? 0)), el('span', {}, 'сигналов')),
    );
    $('markets').replaceChildren(...state.markets.map(m => {
      const on = s.markets[m.id] !== false;
      const info = st?.markets?.[m.id];
      const ago = info?.lastPollAt ? Math.max(0, Math.round((st.now - info.lastPollAt) / 1000)) : null;
      const sub = !on ? 'выключен' : !s.enabled ? 'пауза' : ago == null ? 'ожидает' : ago <= 5 ? 'онлайн' : `${ago} сек назад`;
      return el('button', { class: 'market press' + (on ? ' on' : ''), onclick: () => { s.markets[m.id] = !on; haptic(); renderHeader(); save(); } },
        el('span', {}, el('b', {}, m.title), el('small', {}, sub)), el('span', { class: 'check' }));
    }));
  }

  function ruleSummary(r) {
    const parts = [];
    const custom = r.models.length || r.backdrops.length || r.symbols.length || r.maxPrice != null || r.maxOverFloorPct != null;
    if (!custom) return ['все подарки'];
    if (r.models.length) parts.push(`модели: ${r.models.length}`);
    if (r.backdrops.length) parts.push(`фоны: ${r.backdrops.length}`);
    if (r.symbols.length) parts.push(`узоры: ${r.symbols.length}`);
    if (r.maxPrice != null) parts.push(`до ${ton(r.maxPrice)} TON`);
    if (r.maxOverFloorPct != null) parts.push(`флор ${r.maxOverFloorPct > 0 ? '+' : ''}${r.maxOverFloorPct}%`);
    return parts;
  }

  function renderRules(animate) {
    const s = state.settings;
    const box = $('rules');
    $('rulesCount').textContent = s.rules.length ? `· ${s.rules.length}` : '';
    $('addTop').hidden = !s.rules.length;
    if (!s.rules.length) {
      box.replaceChildren(el('div', { class: 'empty' }, el('div', { class: 'empty-art' }, '⚡'), el('b', {}, 'Пока пусто'), 'Отметьте коллекции — новые листинги будут приходить в бота в ту же секунду. Модели, фоны и узоры можно уточнить потом.'));
      return;
    }
    box.replaceChildren(...s.rules.map((r, i) => {
      const floor = minFloor(r.collection);
      const custom = ruleSummary(r)[0] !== 'все подарки';
      return el('div', { class: 'rule' + (animate ? ' pop' : '') + (r.enabled === false ? ' off' : ''), style: animate ? stagger(i) : '' },
        el('button', { class: 'rule-main press', onclick: () => openEditor(i) },
          img(colImg(r.collection), 'thumb'),
          el('span', { style: 'min-width:0;flex:1' },
            el('div', { class: 'rule-name' }, r.collection),
            el('div', { class: 'rule-sub' }, ...ruleSummary(r).map(p => el('span', { class: 'tag' + (custom ? ' custom' : '') }, p))),
            el('div', { class: 'rule-floor' }, floor != null ? `флор ${ton(floor)} TON` : '', el('i', {}, volText(r.collection)))),
          el('span', { class: 'chev' }, '›')),
        el('label', { class: 'switch' },
          el('input', { type: 'checkbox', checked: r.enabled !== false, onchange: e => { r.enabled = e.target.checked; haptic(); e.target.closest('.rule').classList.toggle('off', !r.enabled); renderHeader(); save(); } }),
          el('span')));
    }));
  }

  // ---- collection picker (multi-select) ----
  const SORTS = [['volume-desc', 'Объём ↓'], ['volume-asc', 'Объём ↑'], ['sales-desc', 'Продажи ↓'], ['sales-asc', 'Продажи ↑'], ['floor-desc', 'Флор ↓'], ['floor-asc', 'Флор ↑'], ['name', 'А–Я'], ['picked', 'Выбранные']];
  let visible = [];

  function openPicker() {
    $('picker').hidden = false;
    $('pickerSearch').value = '';
    renderPicker(true);
    showBack(true);
  }

  function sortedCollections() {
    const q = norm($('pickerSearch').value);
    const list = state.collections.filter(c => !q || norm(c).includes(q));
    const [key, dir] = state.sort.split('-');
    const sign = dir === 'asc' ? 1 : -1;
    const val = { volume: n => vol(n)?.volume ?? -1, sales: n => vol(n)?.sales ?? -1, floor: n => minFloor(n) ?? -1 }[key];
    if (val) list.sort((a, b) => {
      const va = val(a), vb = val(b);
      if (va < 0 || vb < 0) return (va < 0) - (vb < 0) || a.localeCompare(b); // unknown values go last
      return sign * (va - vb) || a.localeCompare(b);
    });
    else if (key === 'picked') list.sort((a, b) => !!ruleOf(b) - !!ruleOf(a) || a.localeCompare(b));
    return list;
  }

  function renderPickerFoot() {
    const n = state.settings.rules.length;
    const allOn = visible.length > 0 && visible.every(ruleOf);
    $('pickerToggleAll').textContent = allOn ? 'Снять все' : (visible.length === state.collections.length ? 'Выбрать все' : `Выбрать ${visible.length}`);
    $('pickerDone').textContent = n ? `Готово · ${n} · круг ~${cycleFor(activeCount())} сек` : 'Готово';
    $('pickerCount').textContent = `${visible.length} из ${state.collections.length}`;
  }

  function renderPicker(animate) {
    $('pickerSorts').replaceChildren(...SORTS.map(([id, title]) => el('button', { class: 'chip press' + (state.sort === id ? ' on' : ''), onclick: () => { state.sort = id; haptic(); renderPicker(true); $('pickerGrid').scrollTop = 0; } }, title)));
    visible = sortedCollections();
    $('pickerGrid').replaceChildren(...visible.map((name, i) => {
      const floor = minFloor(name), v = vol(name);
      return el('button', { class: 'tile press' + (animate ? ' pop' : '') + (ruleOf(name) ? ' added' : ''), style: animate ? stagger(i) : '', onclick: e => togglePick(name, e.currentTarget) },
        el('span', { class: 'tick' }),
        img(colImg(name)), el('b', {}, name),
        el('small', { class: 'tile-floor' }, floor != null ? `${ton(floor)} TON` : '—'),
        el('small', { class: 'tile-vol' }, v ? `24ч: ${compact(v.volume)} TON` : '24ч: нет продаж'),
        v ? el('small', { class: 'tile-vol' }, `${v.sales} продаж`) : null);
    }));
    renderPickerFoot();
  }

  function addRule(name) { state.settings.rules.push({ collection: name, enabled: true, models: [], backdrops: [], symbols: [], maxPrice: null, maxOverFloorPct: null }); }
  function removeRule(name) { state.settings.rules = state.settings.rules.filter(r => norm(r.collection) !== norm(name)); }

  function togglePick(name, tile) {
    if (ruleOf(name)) removeRule(name); else addRule(name);
    tile.classList.toggle('added', !!ruleOf(name));
    haptic('tap'); renderPickerFoot(); save();
  }

  function toggleAllVisible() {
    const allOn = visible.every(ruleOf);
    for (const name of visible) { if (allOn) removeRule(name); else if (!ruleOf(name)) addRule(name); }
    haptic('ok'); renderPicker(false); save();
  }

  // ---- rule editor ----
  const TABS = [['models', 'Модели'], ['backdrops', 'Фоны'], ['symbols', 'Узоры'], ['price', 'Цена']];
  const DETAIL_KEY = { models: 'models', backdrops: 'backdrops', symbols: 'patterns' };
  const allNames = (r, field) => (state.details[norm(r.collection)]?.[DETAIL_KEY[field]] || []).map(x => x.name);
  /** Empty list means "all"; `noneMode` is the transient UI state right after "Снять". */
  const isOn = (r, field, name) => (r[field].length ? r[field].some(x => norm(x) === norm(name)) : !state.noneMode[field]);

  async function openEditor(i) {
    state.editing = i; state.tab = 'models'; state.noneMode = {};
    const r = state.settings.rules[i];
    $('editor').hidden = false;
    $('edImg').src = colImg(r.collection);
    $('edTitle').textContent = r.collection;
    $('edSearch').value = '';
    showBack(true);
    renderEditor(true);
    if (!state.details[norm(r.collection)]) {
      try { state.details[norm(r.collection)] = await api('GET', '/api/collection?name=' + encodeURIComponent(r.collection)); }
      catch (e) { toast(e.message, true); }
      if (state.editing === i) renderEditor(true);
    }
  }

  function renderTabs(r) {
    const count = t => (t === 'price' ? ((r.maxPrice != null) + (r.maxOverFloorPct != null) || '—') : r[t].length || 'все');
    $('edTabs').replaceChildren(...TABS.map(([id, title]) => el('button', { class: 'tab press' + (state.tab === id ? ' on' : ''), onclick: () => { state.tab = id; $('edSearch').value = ''; haptic(); renderEditor(true); } },
      title, el('small', {}, String(count(id))))));
  }

  function noteText(r, field) {
    if (r[field].length) return `Выбрано ${r[field].length} из ${allNames(r, field).length}. Уведомления придут только по ним.`;
    return state.noneMode[field] ? 'Ничего не отмечено. Отметьте нужные — иначе останутся все.' : 'Выбраны все. Снимите галочки с ненужных или нажмите «Снять» и отметьте только нужные.';
  }

  function renderEditor(animate) {
    const r = state.settings.rules[state.editing];
    if (!r) return;
    const d = state.details[norm(r.collection)];
    $('edFloors').replaceChildren(...state.markets.map(m => el('div', { class: 'floor' }, el('span', {}, m.title), el('b', {}, ton(state.collectionFloors[m.id]?.[norm(r.collection)])))));
    renderTabs(r);
    const isPrice = state.tab === 'price';
    $('edPrice').hidden = !isPrice; $('edList').hidden = isPrice; $('edSearchWrap').hidden = isPrice;
    if (isPrice) return renderPrice(r);
    const list = $('edList');
    if (!d) { list.replaceChildren(...Array.from({ length: 8 }, () => el('div', { class: 'skeleton' }))); return; }
    const field = state.tab;
    const q = norm($('edSearch').value);
    const floors = {};
    if (field === 'models') for (const m of state.markets) for (const [name, v] of Object.entries(d.modelFloors?.[m.id] || {})) if (v > 0 && !(floors[name] <= v)) floors[name] = v;
    const items = (d[DETAIL_KEY[field]] || []).filter(x => !q || norm(x.name).includes(q));
    const explicit = r[field].length > 0;
    items.sort((a, b) => (explicit ? isOn(r, field, b.name) - isOn(r, field, a.name) : 0) || (field === 'models' ? (floors[norm(a.name)] ?? 1e12) - (floors[norm(b.name)] ?? 1e12) : 0) || a.name.localeCompare(b.name));
    list.replaceChildren(el('div', { class: 'note', id: 'edNote' }, noteText(r, field)), ...items.map((x, i) => {
      let pic;
      if (field === 'models') pic = img(modelImg(r.collection, x.name));
      else if (field === 'symbols') pic = img(patternImg(r.collection, x.name), 'pat');
      else { const c = state.backdropColors[norm(x.name)]; pic = el('span', { class: 'swatch', style: c ? `background: radial-gradient(circle at 50% 40%, ${c.center}, ${c.edge})` : '' }); }
      const floor = floors[norm(x.name)];
      return el('button', { class: 'item press' + (animate ? ' pop' : '') + (isOn(r, field, x.name) ? ' on' : ''), style: animate ? stagger(i) : '', 'data-name': x.name, onclick: () => toggle(r, field, x.name) },
        pic,
        el('span', { class: 'item-name' }, el('b', {}, x.name), el('small', {}, x.rarity != null ? `${(x.rarity / 10).toFixed(1)}%` : '')),
        floor != null ? el('span', { class: 'item-floor' }, `${ton(floor)} TON`) : null,
        el('span', { class: 'box' }));
    }));
  }

  /** Updates check marks in place (no re-render, so the list does not jump). */
  function syncChecks(r, field) {
    for (const node of $('edList').querySelectorAll('.item')) node.classList.toggle('on', isOn(r, field, node.dataset.name));
    const note = $('edNote'); if (note) note.textContent = noteText(r, field);
    renderTabs(r);
  }

  function setSelection(r, field, names) {
    const all = allNames(r, field);
    // selecting everything is stored as "all" so that models added later are covered too
    r[field] = names.length >= all.length ? [] : names;
    state.noneMode[field] = false;
  }

  function toggle(r, field, name) {
    const all = allNames(r, field);
    if (!r[field].length && !state.noneMode[field]) setSelection(r, field, all.filter(x => norm(x) !== norm(name)));
    else if (isOn(r, field, name)) {
      r[field] = r[field].filter(x => norm(x) !== norm(name));
      if (!r[field].length) state.noneMode[field] = true;
    } else setSelection(r, field, [...r[field], name]);
    haptic('tap'); syncChecks(r, field); save();
  }

  function renderPrice(r) {
    if (document.activeElement !== $('edMax')) $('edMax').value = r.maxPrice ?? '';
    if (document.activeElement !== $('edPct')) $('edPct').value = r.maxOverFloorPct ?? '';
    $('edPresets').replaceChildren(...[-20, -10, -5, 0, 5, 10, 20].map(v => el('button', { class: 'chip press' + (r.maxOverFloorPct === v ? ' on' : ''), onclick: () => { r.maxOverFloorPct = r.maxOverFloorPct === v ? null : v; haptic(); renderEditor(); save(); } }, (v > 0 ? '+' : '') + v + '%')));
  }
  const numOrNull = v => (v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

  function closeSheets() {
    const open = [$('picker'), $('editor')].filter(s => !s.hidden);
    if (!open.length) return;
    for (const s of open) {
      s.classList.add('closing');
      setTimeout(() => { s.hidden = true; s.classList.remove('closing'); }, 190);
    }
    state.editing = null;
    showBack(false);
    renderRules(true); renderHeader();
  }
  function showBack(on) { try { on ? tg?.BackButton?.show() : tg?.BackButton?.hide(); } catch { /* old client */ } }

  // ---- wiring ----
  function bind() {
    $('master').addEventListener('change', e => { state.settings.enabled = e.target.checked; haptic('ok'); renderHeader(); save(); });
    $('drops').addEventListener('change', e => { state.settings.priceDrops = e.target.checked; haptic(); renderHeader(); save(); });
    $('dropPct').addEventListener('input', e => { const v = numOrNull(e.target.value); if (v != null && v >= 0 && v <= 100) { state.settings.minDropPct = v; save(); } });
    $('add').addEventListener('click', openPicker);
    $('addTop').addEventListener('click', openPicker);
    $('pickerSearch').addEventListener('input', () => renderPicker(false));
    $('pickerToggleAll').addEventListener('click', toggleAllVisible);
    $('edSearch').addEventListener('input', () => renderEditor(false));
    $('edAll').addEventListener('click', () => { const r = state.settings.rules[state.editing]; if (!r || state.tab === 'price') return; r[state.tab] = []; state.noneMode[state.tab] = false; haptic('ok'); syncChecks(r, state.tab); save(); });
    $('edNone').addEventListener('click', () => { const r = state.settings.rules[state.editing]; if (!r || state.tab === 'price') return; r[state.tab] = []; state.noneMode[state.tab] = true; haptic(); syncChecks(r, state.tab); save(); });
    $('edMax').addEventListener('input', e => { const r = state.settings.rules[state.editing]; const v = numOrNull(e.target.value); r.maxPrice = v != null && v >= 0 ? v : null; renderTabs(r); save(); });
    $('edPct').addEventListener('input', e => { const r = state.settings.rules[state.editing]; r.maxOverFloorPct = numOrNull(e.target.value); renderEditor(); save(); });
    $('edDelete').addEventListener('click', () => {
      const name = state.settings.rules[state.editing]?.collection;
      const go = () => { removeRule(name); closeSheets(); save(); };
      if (tg?.showConfirm && tg.initData) tg.showConfirm(`Убрать ${name} из списка?`, ok => ok && go()); else if (confirm(`Убрать ${name} из списка?`)) go();
    });
    document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeSheets));
    $('test').addEventListener('click', async e => {
      e.target.disabled = true;
      try { await api('POST', '/api/test'); toast('Отправил в бота'); haptic('ok'); } catch (err) { toast(err.message, true); }
      e.target.disabled = false;
    });
    try { tg?.BackButton?.onClick(closeSheets); } catch { /* old client */ }
  }

  async function refreshStatus() {
    if (document.hidden) return;
    try { state.status = await api('GET', '/api/status'); renderHeader(); } catch { /* transient */ }
  }

  async function start() {
    try { tg?.ready(); tg?.expand(); tg?.setHeaderColor?.('#050505'); tg?.setBackgroundColor?.('#050505'); tg?.setBottomBarColor?.('#050505'); } catch { /* not in Telegram */ }
    try {
      const b = await api('GET', '/api/bootstrap');
      Object.assign(state, { settings: b.settings, collections: b.collections, collectionFloors: b.collectionFloors, volumes: b.volumes || {}, backdropColors: b.backdropColors, markets: b.markets, status: b.status });
    } catch (e) {
      $('app').replaceChildren(el('div', { class: 'empty', style: 'padding-top:30vh' }, el('div', { class: 'empty-art' }, '⚡'), el('b', {}, 'Gogi Trade'), e.message));
      return;
    }
    bind(); renderHeader(); renderTicker(); renderRules(true);
    document.body.classList.add('ready');
    setInterval(refreshStatus, 4000);
  }
  start();
})();
