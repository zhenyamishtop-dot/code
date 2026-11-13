/* Gogi Trade mini app — vanilla JS, no build step. */
(() => {
  const tg = window.Telegram?.WebApp;
  const initData = tg?.initData || new URLSearchParams(location.hash.slice(1)).get('devInitData') || '';
  const $ = id => document.getElementById(id);
  const CDN = 'https://cdn.changes.tg/gifts';
  const norm = s => String(s ?? '').replace(/[’‘`ʼ]/g, "'").trim().toLowerCase();
  // the image CDN spells apostrophes the typographic way
  const cdnName = s => encodeURIComponent(String(s).replace(/'/g, '’'));
  const colImg = name => `${CDN}/models/${cdnName(name)}/png/Original.png`;
  const modelImg = (col, model) => `${CDN}/models/${cdnName(col)}/png/${cdnName(model)}.png`;
  const patternImg = (col, p) => `${CDN}/patterns/${cdnName(col)}/png/${cdnName(p)}.png`;
  const ton = v => (v == null ? '—' : Number(v).toFixed(v >= 10000 ? 0 : 2).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1'));

  const state = { settings: null, collections: [], collectionFloors: {}, backdropColors: {}, markets: [], status: null, details: {}, editing: null, tab: 'models' };

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
  const img = (src, cls = '') => el('img', { src, class: cls, loading: 'lazy', alt: '', onerror: e => { e.target.style.visibility = 'hidden'; } });
  const haptic = kind => { try { kind === 'ok' ? tg?.HapticFeedback?.notificationOccurred('success') : tg?.HapticFeedback?.selectionChanged(); } catch { /* not in Telegram */ } };

  let toastTimer;
  function toast(text, isError) {
    const t = $('toast');
    t.textContent = text; t.className = 'toast' + (isError ? ' err' : ''); t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, isError ? 3500 : 1400);
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
    saveTimer = setTimeout(flush, 450);
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

  // ---- main screen ----
  function renderHeader() {
    const s = state.settings, st = state.status;
    const active = s.rules.filter(r => r.enabled !== false).length;
    const cycle = st ? Math.max(1, Math.round(st.cycleSeconds)) : 0;
    const live = $('live');
    live.replaceChildren();
    if (!s.enabled) live.append(el('span', { class: 'dot warn' }), 'Пауза');
    else if (!active) live.append(el('span', { class: 'dot' }), 'Добавьте коллекцию');
    else live.append(el('span', { class: 'dot live' }), `LIVE · круг ~${cycle} сек`);
    $('master').checked = s.enabled;
    $('drops').checked = s.priceDrops !== false;
    $('dropRow').hidden = s.priceDrops === false;
    if (document.activeElement !== $('dropPct')) $('dropPct').value = s.minDropPct ?? 3;
    $('stats').replaceChildren(
      el('div', { class: 'stat' }, el('b', {}, String(active)), el('span', {}, 'коллекций')),
      el('div', { class: 'stat' }, el('b', {}, active && s.enabled ? '~' + cycle : '—', el('small', {}, active && s.enabled ? 'сек' : '')), el('span', {}, 'круг опроса')),
      el('div', { class: 'stat' }, el('b', {}, String(st?.alerts ?? 0)), el('span', {}, 'уведомлений')),
    );
    $('markets').replaceChildren(...state.markets.map(m => {
      const on = s.markets[m.id] !== false;
      const info = st?.markets?.[m.id];
      const ago = info?.lastPollAt ? Math.max(0, Math.round((st.now - info.lastPollAt) / 1000)) : null;
      const sub = !on ? 'выключен' : !s.enabled ? 'пауза' : ago == null ? 'ожидает' : ago <= 5 ? 'онлайн' : `${ago} сек назад`;
      return el('button', { class: 'market' + (on ? ' on' : ''), onclick: () => { s.markets[m.id] = !on; haptic(); renderHeader(); save(); } },
        el('span', {}, el('b', {}, m.title), el('small', {}, sub)), el('span', { class: 'check' }));
    }));
  }

  function ruleSummary(r) {
    const parts = [];
    parts.push(r.models.length ? `модели: ${r.models.length}` : 'все модели');
    if (r.backdrops.length) parts.push(`фоны: ${r.backdrops.length}`);
    if (r.symbols.length) parts.push(`узоры: ${r.symbols.length}`);
    if (r.maxPrice != null) parts.push(`до ${ton(r.maxPrice)} TON`);
    if (r.maxOverFloorPct != null) parts.push(`флор ${r.maxOverFloorPct > 0 ? '+' : ''}${r.maxOverFloorPct}%`);
    return parts;
  }

  function renderRules() {
    const s = state.settings;
    const box = $('rules');
    if (!s.rules.length) {
      box.replaceChildren(el('div', { class: 'empty' }, el('b', {}, 'Пока пусто'), 'Выберите коллекции — и новые листинги будут приходить в бота в ту же секунду.'));
      return;
    }
    box.replaceChildren(...s.rules.map((r, i) => {
      const floor = minFloor(r.collection);
      return el('div', { class: 'rule' + (r.enabled === false ? ' off' : '') },
        el('button', { class: 'rule-main', onclick: () => openEditor(i) },
          img(colImg(r.collection), 'thumb'),
          el('span', { style: 'min-width:0;flex:1' },
            el('div', { class: 'rule-name' }, r.collection),
            el('div', { class: 'rule-sub' }, ...ruleSummary(r).map(p => el('span', { class: 'tag' }, p))),
            floor != null ? el('div', { class: 'rule-floor' }, `флор ${ton(floor)} TON`) : null)),
        el('label', { class: 'switch' },
          el('input', { type: 'checkbox', checked: r.enabled !== false, onchange: e => { r.enabled = e.target.checked; haptic(); renderRules(); renderHeader(); save(); } }),
          el('span')));
    }));
  }

  // ---- collection picker ----
  function openPicker() {
    $('picker').hidden = false;
    $('pickerSearch').value = '';
    renderPicker();
    showBack(true);
  }
  function renderPicker() {
    const q = norm($('pickerSearch').value);
    const added = new Set(state.settings.rules.map(r => norm(r.collection)));
    const list = state.collections.filter(c => !q || norm(c).includes(q));
    $('pickerCount').textContent = `${list.length} из ${state.collections.length}`;
    $('pickerGrid').replaceChildren(...list.map(name => {
      const floor = minFloor(name);
      return el('button', { class: 'tile' + (added.has(norm(name)) ? ' added' : ''), onclick: () => pick(name) },
        img(colImg(name)), el('b', {}, name), el('small', {}, floor != null ? `${ton(floor)} TON` : ' '));
    }));
  }
  function pick(name) {
    const s = state.settings;
    let i = s.rules.findIndex(r => norm(r.collection) === norm(name));
    if (i < 0) {
      s.rules.push({ collection: name, enabled: true, models: [], backdrops: [], symbols: [], maxPrice: null, maxOverFloorPct: null });
      i = s.rules.length - 1;
      haptic('ok'); renderRules(); renderHeader(); save();
    }
    $('picker').hidden = true;
    openEditor(i);
  }

  // ---- rule editor ----
  const TABS = [['models', 'Модели'], ['backdrops', 'Фоны'], ['symbols', 'Узоры'], ['price', 'Цена']];
  const DETAIL_KEY = { models: 'models', backdrops: 'backdrops', symbols: 'patterns' };

  async function openEditor(i) {
    state.editing = i; state.tab = 'models';
    const r = state.settings.rules[i];
    $('editor').hidden = false;
    $('edImg').src = colImg(r.collection);
    $('edTitle').textContent = r.collection;
    $('edSearch').value = '';
    showBack(true);
    renderEditor();
    if (!state.details[norm(r.collection)]) {
      try { state.details[norm(r.collection)] = await api('GET', '/api/collection?name=' + encodeURIComponent(r.collection)); }
      catch (e) { toast(e.message, true); }
      if (state.editing === i) renderEditor();
    }
  }

  function renderEditor() {
    const r = state.settings.rules[state.editing];
    if (!r) return;
    const d = state.details[norm(r.collection)];
    $('edFloors').replaceChildren(...state.markets.map(m => el('div', { class: 'floor' }, el('span', {}, m.title), el('b', {}, ton(state.collectionFloors[m.id]?.[norm(r.collection)])))));
    const count = t => (t === 'price' ? ((r.maxPrice != null) + (r.maxOverFloorPct != null) || '') : r[t].length || 'все');
    $('edTabs').replaceChildren(...TABS.map(([id, title]) => el('button', { class: 'tab' + (state.tab === id ? ' on' : ''), onclick: () => { state.tab = id; $('edSearch').value = ''; haptic(); renderEditor(); } },
      title, el('small', {}, String(count(id) || '—')))));
    const isPrice = state.tab === 'price';
    $('edPrice').hidden = !isPrice; $('edList').hidden = isPrice; $('edSearchWrap').hidden = isPrice;
    if (isPrice) return renderPrice(r);
    const list = $('edList');
    if (!d) { list.replaceChildren(el('div', { class: 'loading' }, 'Загружаю…')); return; }
    const field = state.tab;
    const q = norm($('edSearch').value);
    const selected = new Set(r[field].map(norm));
    const floors = {};
    if (field === 'models') for (const m of state.markets) for (const [name, v] of Object.entries(d.modelFloors?.[m.id] || {})) if (v > 0 && !(floors[name] <= v)) floors[name] = v;
    const items = (d[DETAIL_KEY[field]] || []).filter(x => !q || norm(x.name).includes(q));
    // selected first, then by floor (models) or name
    items.sort((a, b) => (selected.has(norm(b.name)) - selected.has(norm(a.name))) || (field === 'models' ? (floors[norm(a.name)] ?? 1e12) - (floors[norm(b.name)] ?? 1e12) : 0) || a.name.localeCompare(b.name));
    const note = selected.size ? `Выбрано: ${selected.size}. Уведомления придут только по ним.` : 'Ничего не выбрано — подходят все. Отметьте нужные, чтобы сузить.';
    list.replaceChildren(el('div', { class: 'note' }, note), ...items.map(x => {
      const on = selected.has(norm(x.name));
      let pic;
      if (field === 'models') pic = img(modelImg(r.collection, x.name));
      else if (field === 'symbols') pic = img(patternImg(r.collection, x.name), 'pat');
      else { const c = state.backdropColors[norm(x.name)]; pic = el('span', { class: 'swatch', style: c ? `background: radial-gradient(circle at 50% 40%, ${c.center}, ${c.edge})` : '' }); }
      const floor = floors[norm(x.name)];
      return el('button', { class: 'item' + (on ? ' on' : ''), onclick: () => toggle(r, field, x.name) },
        pic,
        el('span', { class: 'item-name' }, el('b', {}, x.name), el('small', {}, x.rarity != null ? `${(x.rarity / 10).toFixed(1)}%` : '')),
        floor != null ? el('span', { class: 'item-floor' }, `${ton(floor)} TON`) : null,
        el('span', { class: 'box' }));
    }));
  }

  function toggle(r, field, name) {
    const i = r[field].findIndex(x => norm(x) === norm(name));
    if (i >= 0) r[field].splice(i, 1); else r[field].push(name);
    haptic();
    const top = $('edList').scrollTop;
    renderEditor(); $('edList').scrollTop = top;
    renderRules(); save();
  }

  function renderPrice(r) {
    $('edMax').value = r.maxPrice ?? '';
    $('edPct').value = r.maxOverFloorPct ?? '';
    $('edPresets').replaceChildren(...[-20, -10, -5, 0, 5, 10, 20].map(v => el('button', { class: 'chip' + (r.maxOverFloorPct === v ? ' on' : ''), onclick: () => { r.maxOverFloorPct = r.maxOverFloorPct === v ? null : v; haptic(); renderEditor(); renderRules(); save(); } }, (v > 0 ? '+' : '') + v + '%')));
  }
  const numOrNull = v => (v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

  function closeSheets() {
    const wasEditing = !$('editor').hidden;
    $('picker').hidden = true; $('editor').hidden = true;
    state.editing = null;
    showBack(false);
    if (wasEditing) { renderRules(); renderHeader(); }
  }
  function showBack(on) { try { on ? tg?.BackButton?.show() : tg?.BackButton?.hide(); } catch { /* old client */ } }

  // ---- wiring ----
  function bind() {
    $('master').addEventListener('change', e => { state.settings.enabled = e.target.checked; haptic(); renderHeader(); save(); });
    $('drops').addEventListener('change', e => { state.settings.priceDrops = e.target.checked; haptic(); renderHeader(); save(); });
    $('dropPct').addEventListener('input', e => { const v = numOrNull(e.target.value); if (v != null && v >= 0 && v <= 100) { state.settings.minDropPct = v; save(); } });
    $('add').addEventListener('click', openPicker);
    $('addTop').addEventListener('click', openPicker);
    $('pickerSearch').addEventListener('input', renderPicker);
    $('edSearch').addEventListener('input', renderEditor);
    $('edClear').addEventListener('click', () => { const r = state.settings.rules[state.editing]; if (r && state.tab !== 'price') { r[state.tab] = []; renderEditor(); renderRules(); save(); } });
    $('edMax').addEventListener('input', e => { const r = state.settings.rules[state.editing]; const v = numOrNull(e.target.value); r.maxPrice = v != null && v >= 0 ? v : null; renderRules(); save(); });
    $('edPct').addEventListener('input', e => { const r = state.settings.rules[state.editing]; r.maxOverFloorPct = numOrNull(e.target.value); renderRules(); save(); });
    $('edDelete').addEventListener('click', () => {
      const i = state.editing; const name = state.settings.rules[i]?.collection;
      const go = () => { state.settings.rules.splice(i, 1); closeSheets(); renderRules(); renderHeader(); save(); };
      if (tg?.showConfirm && tg.initData) tg.showConfirm(`Убрать ${name} из фильтров?`, ok => ok && go()); else if (confirm(`Убрать ${name} из фильтров?`)) go();
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
    try { tg?.ready(); tg?.expand(); tg?.setHeaderColor?.('#090c12'); tg?.setBackgroundColor?.('#090c12'); } catch { /* not in Telegram */ }
    try {
      const b = await api('GET', '/api/bootstrap');
      Object.assign(state, { settings: b.settings, collections: b.collections, collectionFloors: b.collectionFloors, backdropColors: b.backdropColors, markets: b.markets, status: b.status });
    } catch (e) {
      $('app').replaceChildren(el('div', { class: 'empty', style: 'padding-top:30vh' }, el('b', {}, 'Gogi Trade'), e.message));
      return;
    }
    bind(); renderHeader(); renderRules();
    setInterval(refreshStatus, 4000);
  }
  start();
})();
