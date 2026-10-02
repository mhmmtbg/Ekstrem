'use strict';
/* ---------- Depolama (IndexedDB, olmazsa localStorage) ---------- */
const Store = (() => {
  let db = null, useLS = false;
  const LSK = 'ekstrem_v1';
  const ls = () => { try { return JSON.parse(localStorage.getItem(LSK)) || {}; } catch (e) { return {}; } };
  const lsSave = d => localStorage.setItem(LSK, JSON.stringify(d));
  function open() {
    return new Promise(res => {
      try {
        const r = indexedDB.open('ekstrem', 1);
        r.onupgradeneeded = () => {
          const d = r.result;
          d.createObjectStore('statements', { keyPath: 'id' });
          d.createObjectStore('incomes', { keyPath: 'id' });
          d.createObjectStore('kv', { keyPath: 'k' });
        };
        r.onsuccess = () => { db = r.result; res(); };
        r.onerror = () => { useLS = true; res(); };
      } catch (e) { useLS = true; res(); }
    });
  }
  const tx = (s, m) => db.transaction(s, m).objectStore(s);
  const wrap = rq => new Promise((res, rej) => { rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
  return {
    open,
    async all(s) { if (useLS) return Object.values(ls()[s] || {}); return wrap(tx(s, 'readonly').getAll()); },
    async put(s, v) { if (useLS) { const d = ls(); d[s] = d[s] || {}; d[s][v.id || v.k] = v; lsSave(d); return; } return wrap(tx(s, 'readwrite').put(v)); },
    async del(s, k) { if (useLS) { const d = ls(); if (d[s]) delete d[s][k]; lsSave(d); return; } return wrap(tx(s, 'readwrite').delete(k)); },
    async clear(s) { if (useLS) { const d = ls(); d[s] = {}; lsSave(d); return; } return wrap(tx(s, 'readwrite').clear()); },
    get mode() { return useLS ? 'localStorage' : 'IndexedDB'; }
  };
})();

/* ---------- Yardımcılar ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf0 = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
const tl = n => nf.format(n) + ' ₺';
const tl0 = n => nf0.format(n) + ' ₺';
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const MSHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const mLabel = k => { const [y, m] = k.split('-'); return MONTHS[+m - 1] + ' ' + y; };
const mShort = k => { const [y, m] = k.split('-'); return MSHORT[+m - 1] + ' ' + y.slice(2); };
const dLabel = d => { const [y, m, dd] = d.split('-'); return (+dd) + ' ' + MSHORT[+m - 1]; };
const dTR = d => d ? d.split('-').reverse().join('.') : '-';
const prevKey = k => { let [y, m] = k.split('-').map(Number); m--; if (!m) { m = 12; y--; } return y + '-' + String(m).padStart(2, '0'); };
// Ekstre hangi aya ait: kesim tarihinden 15 gün önce (dönemin ortası)
const monthOf = iso => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() - 15); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
const slug = s => GenericParser.norm(s).toLowerCase().replace(/[^a-z0-9]+/g, '-');
const CATCOL = Object.fromEntries([...BKCats.CATEGORIES.map(c => [c[0], c[1]]), [BKCats.OTHER[0], BKCats.OTHER[1]]]);
const CATNAMES = Object.keys(CATCOL);
const PCOL = ['var(--c-taksit)', 'var(--c-gelir)', 'var(--c-gider)', '#8a6fd1'];
function toast(msg, ms = 2600) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), ms); }

/* ---------- Durum ---------- */
const S = { statements: [], incomes: [], rules: [], cards: {}, cardProfile: {},
  profiles: [{ id: 'me', name: 'Ben' }, { id: 'es', name: 'Eşim' }], profile: 'me',
  month: null, view: 'ozet', addMode: 'harcama', theme: 'auto',
  plan: { items: [], carry: {}, excl: {}, horizon: 6, start: null }, q: '', qScope: 'month', qCat: null, qType: 'spend' };

async function load() {
  await Store.open();
  let sts = await Store.all('statements');
  // Eski sürüm verisini yeni yapıya taşı
  for (const s of sts) if (!s.bank) {
    const old = s.id;
    s.bank = 'Ziraat Bankkart'; s.profile = 'me'; s.month = s.id;
    const m = (s.sonOdeme || '').match(/(\d{2})\/(\d{2})\/(\d{4})/); if (m) s.sonOdeme = `${m[3]}-${m[2]}-${m[1]}`;
    const card = (s.tx.find(t => t.card) || {}).card || '';
    s.id = `ziraat-bankkart_${s.kesim}_${card}`;
    await Store.del('statements', old); await Store.put('statements', s);
  }
  S.statements = sts.sort((a, b) => a.kesim.localeCompare(b.kesim));
  S.incomes = (await Store.all('incomes')).map(i => ({ profile: 'me', ...i }));
  const kv = await Store.all('kv');
  const g = k => (kv.find(x => x.k === k) || {}).v;
  S.rules = g('rules') || [];
  S.cards = g('cards') || {};
  S.cardProfile = g('cardProfile') || {};
  S.profiles = g('profiles') || S.profiles;
  S.profile = g('activeProfile') || 'me';
  S.theme = g('theme') || (() => { try { return localStorage.getItem('ekstrem_theme'); } catch (e) { return null; } })() || 'auto';
  S.plan = Object.assign({ items: [], carry: {}, excl: {}, horizon: 6, start: null }, g('plan') || {});
  applyTheme();
  const keys = monthKeys();
  S.month = keys[keys.length - 1] || null;
}
const saveKV = (k, v) => Store.put('kv', { k, v });

const isHane = () => S.profile === 'hane';
const inProfile = x => isHane() || x.profile === S.profile;
const profName = id => (S.profiles.find(p => p.id === id) || {}).name || id;
function monthKeys() {
  const set = new Set(S.statements.filter(inProfile).map(s => s.month));
  S.incomes.filter(inProfile).forEach(i => set.add(i.month));
  return [...set].sort();
}
const stmtsOf = k => S.statements.filter(s => s.month === k && inProfile(s));
const stmtById = id => S.statements.find(s => s.id === id);
const catOf = t => t.catManual ? t.cat : BKCats.categorize(t.desc, S.rules);
const isSpend = t => t.type === 'expense' || t.type === 'fee' || t.type === 'refund';
function amtTL(t, st) {
  const usd = st && st.usdRate ? (t.usd || 0) * st.usdRate : 0;
  const v = t.tl + usd;
  return t.type === 'refund' ? -v : v;
}
const rowsOf = sts => sts.flatMap(st => st.tx.map(t => ({ t, st })));
const spendRows = sts => rowsOf(sts).filter(r => isSpend(r.t));
function incomeOf(k) { return S.incomes.filter(i => i.month === k && inProfile(i)).reduce((a, i) => a + i.amount, 0); }
function spendOf(sts) { return spendRows(sts).reduce((a, r) => a + amtTL(r.t, r.st), 0); }
function catTotals(sts) {
  const m = {};
  for (const { t, st } of spendRows(sts)) { const c = catOf(t); m[c] = (m[c] || 0) + amtTL(t, st); }
  return m;
}
const bankShort = b => (b || '').split(' ')[0];
const cardName = (c, st) => st && st.manual ? 'Kart dışı' : S.cards[c] || ((st ? bankShort(st.bank) + ' ' : '') + (c ? '•••• ' + c : 'kart'));
const srcLabel = (t, st) => st.manual ? (t.pay || 'Nakit') : bankShort(st.bank);
const lastDay = m => { const [y, mm] = m.split('-').map(Number); return `${m}-${String(new Date(y, mm, 0).getDate()).padStart(2, '0')}`; };
function manualStmt(profile, month, create) {
  const id = `manual_${profile}_${month}`;
  let st = stmtById(id);
  if (!st && create) {
    st = { id, manual: true, bank: 'Kart dışı', kesim: lastDay(month), month, profile, ok: null, tx: [] };
    S.statements.push(st); S.statements.sort((a, b) => a.kesim.localeCompare(b.kesim));
  }
  return st;
}

/* ---------- Kopya ekstre tespiti ---------- */
const txKeys = st => st.tx.filter(t => t.type !== 'info').map(t => `${t.date}|${Math.round(t.tl * 100)}|${Math.round((t.usd || 0) * 100)}`);
function txOverlap(a, b) {
  const m = new Map(); txKeys(a).forEach(k => m.set(k, (m.get(k) || 0) + 1));
  let hit = 0; txKeys(b).forEach(k => { const c = m.get(k); if (c) { hit++; m.set(k, c - 1); } });
  return hit / Math.max(1, Math.min(txKeys(a).length, txKeys(b).length));
}
// Aynı banka + aynı kesim tarihi + işlemlerin en az %80'i aynıysa aynı ekstredir
const sameStatement = (a, b) => !a.manual && !b.manual && a.bank === b.bank && a.kesim === b.kesim && txOverlap(a, b) >= 0.8;
function duplicateGroups() {
  const out = [], seen = new Set();
  const list = S.statements.filter(s => !s.manual);
  for (const a of list) {
    if (seen.has(a.id)) continue;
    const g = [a, ...list.filter(b => b !== a && !seen.has(b.id) && sameStatement(a, b))];
    if (g.length > 1) { g.forEach(s => seen.add(s.id)); out.push(g); }
  }
  return out;
}
async function deleteStatement(id) {
  await Store.del('statements', id); S.statements = S.statements.filter(x => x.id !== id);
  const keys = monthKeys(); if (!keys.includes(S.month)) S.month = keys[keys.length - 1] || null;
}
// Kopyaları temizle: en son yükleneni tut, eskilerdeki elle kategori/notları ona aktar
window.fixDuplicates = async () => {
  let n = 0;
  for (const g of duplicateGroups()) {
    g.sort((x, y) => (y.importedAt || '').localeCompare(x.importedAt || ''));
    const keep = g[0];
    for (const old of g.slice(1)) {
      for (const t of keep.tx) {
        const o = old.tx.find(x => x.date === t.date && x.desc === t.desc && x.tl === t.tl && (x.catManual || x.note));
        if (o) { if (o.catManual && !t.catManual) { t.cat = o.cat; t.catManual = true; } if (o.note && !t.note) t.note = o.note; }
      }
      await deleteStatement(old.id); n++;
    }
    await Store.put('statements', keep);
  }
  render(); toast(n ? `${n} kopya ekstre silindi` : 'Kopya ekstre yok');
};
function confirmSheet(title, text, okLabel) {
  return new Promise(res => {
    openSheet(`<h3>${esc(title)}</h3><p>${text}</p>
      <button class="btn danger block" id="cfOk">${esc(okLabel)}</button><button class="btn ghost block" id="cfNo">Vazgeç</button>`, () => res(false));
    $('#cfOk').onclick = () => { closeSheet(true); res(true); };
    $('#cfNo').onclick = () => { closeSheet(true); res(false); };
  });
}
window.askDeleteStatement = async id => {
  const s = stmtById(id); if (!s) return;
  const n = s.tx.length;
  const ok = await confirmSheet(s.manual ? 'Kart dışı harcamaları sil' : 'Ekstreyi sil',
    s.manual ? `<b>${mLabel(s.month)}</b> ayındaki ${n} kart dışı harcama kaydı (${esc(profName(s.profile))}) silinecek.`
      : `<b>${esc(s.bank)}</b>, kesim ${dTR(s.kesim)} ekstresi ve içindeki ${n} işlem silinecek. PDF'i istediğin zaman yeniden yükleyebilirsin.`,
    s.manual ? 'Kayıtları sil' : 'Ekstreyi sil');
  if (!ok) return false;
  await deleteStatement(id); render(); toast(s.manual ? 'Kart dışı kayıtlar silindi' : 'Ekstre silindi');
  return true;
};

/* ---------- PDF okuma ---------- */
function askPassword(name) {
  return new Promise(res => {
    openSheet(`<h3>Şifreli ekstre</h3><p class="sub">${esc(name)} şifre istiyor. Bankanın e-postada belirttiği şifreyi girin.</p>
      <input class="inp" id="pw" type="password" autocomplete="off">
      <button class="btn block" id="pwOk">Aç</button><button class="btn ghost block" id="pwNo">Vazgeç</button>`, () => res(null));
    setTimeout(() => $('#pw').focus(), 50);
    $('#pwOk').onclick = () => { const v = $('#pw').value; closeSheet(true); res(v); };
    $('#pwNo').onclick = () => { closeSheet(true); res(null); };
  });
}
async function readPdf(file) {
  const data = new Uint8Array(await file.arrayBuffer());
  const task = pdfjsLib.getDocument({ data, isEvalSupported: false });
  task.onPassword = async (cb, reason) => {
    const p = await askPassword(file.name + (reason === 2 ? ' (şifre yanlış)' : ''));
    if (p == null) task.destroy(); else cb(p);
  };
  const doc = await task.promise;
  const pages = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const pg = await doc.getPage(p);
    const tc = await pg.getTextContent();
    pages.push({ width: pg.getViewport({ scale: 1 }).width,
      items: tc.items.map(i => ({ str: i.str, x: i.transform[4], y: i.transform[5], r: i.transform[4] + i.width,
        rot: Math.abs(i.transform[1]) > 0.01 || Math.abs(i.transform[2]) > 0.01 })) });
  }
  return pages;
}
// Bankaya göre doğru ayrıştırıcıyı seç, ortak biçime çevir
function parseAny(pages) {
  const text = pages.map(p => p.items.map(i => i.str).join(' ')).join(' ');
  if (/Bankkart/i.test(text) && /ZİRAAT|Ziraat/.test(text)) {
    const clone = pages.map(p => ({ width: p.width, items: p.items.map(i => ({ ...i })) }));
    const r = BankkartParser.parse(clone);
    if (r.head.kesim && r.tx.length) {
      const iso = d => { const m = (d || '').match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : null; };
      return { bank: 'Ziraat Bankkart', kesimISO: iso(r.head.kesim), sonOdemeISO: iso(r.head.sonOdeme),
        borcTL: r.head.borcTL, borcUSD: r.head.borcUSD, faiz: r.summary && r.summary.faiz, ok: r.ok, tx: r.tx };
    }
  }
  const g = GenericParser.parse(pages);
  return { bank: g.bank, kesimISO: g.head.kesimISO, sonOdemeISO: g.head.sonOdemeISO, borcTL: g.head.borcTL,
    faiz: g.tx.filter(t => t.type === 'fee').reduce((a, t) => a + t.tl, 0), ok: g.ok, tx: g.tx };
}

async function importFiles(files) {
  if (!files.length) return;
  $('#main').innerHTML = `<div class="empty"><span class="spinner"></span><p style="margin-top:12px">Ekstreler okunuyor…</p></div>`;
  const report = [];
  for (const f of files) {
    try {
      const pages = await readPdf(f);
      const res = parseAny(pages);
      if (!res.kesimISO || !res.tx.length) { report.push({ name: f.name, err: 'Bu dosyada işlem tablosu ya da hesap kesim tarihi bulunamadı.' }); continue; }
      const tx = res.tx.filter(t => t.type !== 'info').map((t, i) => ({ ...t, i }));
      const cards = [...new Set(tx.map(t => t.card).filter(Boolean))];
      const id = `${slug(res.bank)}_${res.kesimISO}_${cards[0] || ''}`;
      // Aynı bankanın aynı kesim tarihli eski kaydı (ör. önceki sürümle farklı kimlikle alınmış) varsa onu devral
      const twin = S.statements.find(s => !s.manual && s.id !== id && s.bank === res.bank && s.kesim === res.kesimISO && (s.tx.some(t => t.card && cards.includes(t.card)) || txOverlap(s, { tx }) >= 0.8));
      if (twin) { await Store.del('statements', twin.id); S.statements = S.statements.filter(s => s !== twin); twin.id = id; }
      const old = stmtById(id) || twin;
      if (old) for (const t of tx) {
        const o = old.tx.find(x => x.date === t.date && x.desc === t.desc && x.tl === t.tl && (x.catManual || x.note));
        if (o) { if (o.catManual) { t.cat = o.cat; t.catManual = true; } if (o.note) t.note = o.note; }
      }
      const known = cards.map(c => S.cardProfile[c]).find(Boolean);
      const profile = old ? old.profile : known || (isHane() ? 'me' : S.profile);
      const dates = tx.map(t => t.date).sort();
      const st = { id, bank: res.bank, kesim: res.kesimISO, month: monthOf(res.kesimISO), profile,
        sonOdeme: res.sonOdemeISO, borcTL: res.borcTL, borcUSD: res.borcUSD, faiz: res.faiz, ok: res.ok,
        usdRate: old ? old.usdRate : null, fileName: f.name, importedAt: new Date().toISOString(),
        from: dates[0], to: dates[dates.length - 1], tx };
      await Store.put('statements', st);
      cards.forEach(c => S.cardProfile[c] = profile);
      S.statements = S.statements.filter(s => s.id !== id).concat(st).sort((a, b) => a.kesim.localeCompare(b.kesim));
      report.push({ name: f.name, id, st, n: tx.filter(isSpend).length, ok: res.ok, replaced: !!old, guessed: !known && !old });
    } catch (e) {
      console.error(e);
      report.push({ name: f.name, err: e && e.name === 'PasswordException' ? 'Şifre girilmedi.' : 'PDF okunamadı: ' + (e.message || e) });
    }
  }
  await saveKV('cardProfile', S.cardProfile);
  const good = report.filter(r => r.id);
  if (good.length) {
    const last = good.map(r => r.st).sort((a, b) => a.month.localeCompare(b.month)).pop();
    if (!isHane()) S.profile = last.profile;
    S.month = last.month;
  }
  render();
  const opts = sel => S.profiles.map(p => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${esc(p.name)}</option>`).join('');
  openSheet(`<h3>İçe aktarma sonucu</h3>
    ${good.some(r => r.guessed) ? '<p class="sub">Yeni kartları kime ait olduğunu seç; aynı kartın sonraki ekstreleri otomatik o kişiye gider.</p>' : ''}
    <ul class="list-plain">${report.map(r => r.err
    ? `<li><span>${esc(r.name)}<br><span class="sub">${esc(r.err)}</span></span><span class="badge warn">Hata</span></li>`
    : `<li style="flex-wrap:wrap"><span style="flex:1 1 60%"><b>${esc(r.st.bank)}</b> · ${mLabel(r.st.month)}${r.replaced ? ' (güncellendi)' : ''}<br>
        <span class="sub">${r.n} harcama · kesim ${dTR(r.st.kesim)}</span><br>
        ${r.ok ? '<span class="badge">✓ Banka toplamıyla eşleşti</span>' : r.ok === false ? '<span class="badge warn">Banka toplamı tutmadı, kontrol et</span>' : '<span class="badge warn">Doğrulanamadı</span>'}</span>
        <select class="inp" style="width:auto" data-prof="${r.id}" aria-label="Kişi">${opts(r.st.profile)}</select></li>`).join('')}</ul>
    <button class="btn block" id="impOk">Tamam</button>`);
  document.querySelectorAll('[data-prof]').forEach(s => s.onchange = async () => {
    const st = stmtById(s.dataset.prof); st.profile = s.value;
    st.tx.forEach(t => { if (t.card) S.cardProfile[t.card] = s.value; });
    await Store.put('statements', st); await saveKV('cardProfile', S.cardProfile);
  });
  $('#impOk').onclick = () => { closeSheet(true); render(); };
}

/* ---------- Alt panel ---------- */
let sheetOnClose = null;
// Geçmiş yönetimi: Android geri hareketi önce paneli kapatır, sonra Özet'e döner, en son çıkmadan önce uyarır.
let navBusy = false, ignoreNextPop = false, guardTimer = null; const navQueue = [];
const hist = f => navBusy ? navQueue.push(f) : f();
function initHistory() { history.replaceState({ guard: true }, ''); history.pushState({ v: 'ozet' }, ''); }
function removeSheetDom() { const s = $('#scrim'); if (s) s.remove(); }
function openSheet(html, onClose) {
  const had = !!$('#scrim'); removeSheetDom();
  const sc = document.createElement('div'); sc.className = 'scrim'; sc.id = 'scrim';
  sc.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
  sc.addEventListener('click', e => { if (e.target === sc) closeSheet(); });
  document.body.appendChild(sc); sheetOnClose = onClose || null;
  if (!had) hist(() => history.pushState({ sheet: true, v: S.view }, ''));
}
function closeSheet(silent) {
  if (!$('#scrim')) return;
  removeSheetDom();
  const cb = sheetOnClose; sheetOnClose = null;
  navBusy = true; ignoreNextPop = true; history.back();
  if (!silent && cb) cb();
}
window.addEventListener('popstate', e => {
  if (ignoreNextPop) { ignoreNextPop = false; navBusy = false; navQueue.splice(0).forEach(f => f()); return; }
  const st = e.state || {};
  if ($('#scrim')) { removeSheetDom(); const cb = sheetOnClose; sheetOnClose = null; if (cb) cb(); return; }
  if (st.sheet) { history.back(); return; }
  if (st.guard) {
    if (S.view !== 'ozet') { S.view = 'ozet'; render(); window.scrollTo(0, 0); }
    toast('Çıkmak için tekrar geri kaydır', 2200);
    clearTimeout(guardTimer);
    guardTimer = setTimeout(() => { if ((history.state || {}).guard) history.pushState({ v: 'ozet' }, ''); }, 2300);
    return;
  }
  clearTimeout(guardTimer);
  S.view = st.v || 'ozet'; render(); window.scrollTo(0, 0);
});
window.closeSheet = closeSheet;

/* ---------- Grafik parçaları ---------- */
function donut(entries, total, size = 132) {
  const r = 52, c = 2 * Math.PI * r; let off = 0;
  const segs = entries.filter(e => e[1] > 0).map(([k, v]) => {
    const len = total > 0 ? v / total * c : 0;
    const s = `<circle r="${r}" cx="66" cy="66" fill="none" stroke="${CATCOL[k] || '#999'}" stroke-width="20" stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-off}"/>`;
    off += len; return s;
  }).join('');
  return `<svg width="${size}" height="${size}" viewBox="0 0 132 132" role="img" aria-label="Kategori dağılımı">
    <g transform="rotate(-90 66 66)"><circle r="${r}" cx="66" cy="66" fill="none" stroke="#EDF1EE" stroke-width="20"/>${segs}</g>
    <text x="66" y="62" text-anchor="middle" font-size="11" fill="#5B6B6F">${entries.filter(e => e[1] > 0).length} kategori</text>
    <text x="66" y="80" text-anchor="middle" font-size="15" font-weight="700" fill="#13262B">${nf0.format(total / 1000)}k ₺</text></svg>`;
}

/* ---------- Üst bant ---------- */
function renderHeader() {
  const tabs = [...S.profiles, { id: 'hane', name: 'Hane' }];
  $('#people').innerHTML = tabs.map(p => `<button role="tab" data-p="${p.id}" aria-selected="${p.id === S.profile}">${esc(p.name)}</button>`).join('');
  const keys = monthKeys();
  $('#months').innerHTML = keys.map(k => `<button class="mchip" data-m="${k}" aria-pressed="${k === S.month}">${mShort(k)}</button>`).join('')
    || `<span style="color:rgba(255,255,255,.6);font-size:13px">${esc(isHane() ? 'Henüz ekstre yok' : profName(S.profile) + ' için henüz ekstre yok')}</span>`;
  $('#months').hidden = S.view === 'plan';
  const act = $('#months [aria-pressed=true]'); if (act && S.view !== 'plan') act.scrollIntoView({ inline: 'center', block: 'nearest' });
}

function viewEmpty() {
  const who = isHane() ? '' : ` (${esc(profName(S.profile))})`;
  return `<div class="empty"><h2>Ekstre yükle${who}</h2>
    <p>Kredi kartı ekstre PDF'lerini seç. Ziraat Bankkart, Akbank Axess ve Yapı Kredi World doğrudan tanınır; tablo düzenindeki diğer banka ekstreleri de okunmaya çalışılır. Veriler yalnızca bu telefonda saklanır.</p>
    <button class="btn" onclick="document.getElementById('file').click()">PDF ekstre seç</button>
    ${isHane() ? '' : `<button class="btn ghost" style="margin-left:6px" onclick="S.addMode='harcama';go('gelir')">Kart dışı harcama gir</button>`}
    <p class="sub" style="margin-top:18px">Birden fazla ekstreyi aynı anda seçebilirsin; aynı ayın farklı banka ekstreleri birleştirilir.</p></div>`;
}

/* ---------- Özet ---------- */
const CATICON = { 'Market': '🛒', 'Restoran & Kafe': '🍽️', 'Akaryakıt': '⛽', 'Faturalar': '💡', 'Ulaşım': '🚕', 'Online Alışveriş': '📦',
  'Abonelik & Dijital': '📺', 'Sağlık': '💊', 'Evcil Hayvan': '🐾', 'Giyim': '👕', 'Elektronik': '🔌', 'Ev & Hırdavat': '🔨', 'Oto': '🚗',
  'Vergi & Resmi': '🏛️', 'Emeklilik & Birikim': '🏦', 'Seyahat & Konaklama': '✈️', 'Eğlence & Kültür': '🎟️', 'Nakit Avans': '💵',
  'Faiz & Ücret': '📈', 'Diğer': '🧾' };
const ico = (c, extra = '') => `<span class="ico" style="background:${(CATCOL[c] || '#adb5bd')}22${extra}" aria-hidden="true">${CATICON[c] || '🧾'}</span>`;
const DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const up = s => s.toLocaleUpperCase('tr-TR');
function rcLine(l, v, cls = '') { return `<div class="ln ${cls}"><span class="lbl">${esc(l)}</span><span class="dots"></span><span class="v">${v}</span></div>`; }

function viewOzet() {
  const k = S.month; if (!k) return viewEmpty();
  const sts = stmtsOf(k);
  const inc = incomeOf(k);
  if (!sts.length) return `<div class="card"><h2>${mLabel(k)}</h2>
    <p>Bu ay için harcama kaydı yok; girilen gelir <b>${tl(inc)}</b>.</p>
    <button class="btn" onclick="document.getElementById('file').click()">Bu ayın ekstresini yükle</button></div>`;
  const rows = spendRows(sts);
  const spend = spendOf(sts);
  const cats = Object.entries(catTotals(sts)).sort((a, b) => b[1] - a[1]);
  const psts = stmtsOf(prevKey(k)); const pcats = catTotals(psts); const pspend = spendOf(psts);
  const net = inc - spend;
  const cardSts = sts.filter(s => !s.manual);
  const okAll = cardSts.length && cardSts.every(s => s.ok), okAny = cardSts.some(s => s.ok === false);
  const usdSts = sts.filter(st => st.tx.some(t => isSpend(t) && t.usd));
  const usdOpen = usdSts.filter(st => !st.usdRate).reduce((a, st) => a + st.tx.filter(isSpend).reduce((x, t) => x + (t.type === 'refund' ? -t.usd : t.usd || 0), 0), 0);

  // Fiş kalemleri: kaynak bazında
  const bySrc = {};
  rows.forEach(({ t, st }) => {
    const key = st.manual ? 'Kart dışı' + (isHane() ? ' (' + profName(st.profile) + ')' : '') : st.bank + (isHane() ? ' (' + profName(st.profile) + ')' : '');
    bySrc[key] = (bySrc[key] || 0) + amtTL(t, st);
  });
  const refunds = rows.filter(r => r.t.type === 'refund').reduce((a, r) => a + r.t.tl, 0);
  const fees = rows.filter(r => r.t.type === 'fee').reduce((a, r) => a + r.t.tl, 0);
  const scale = Math.max(spend, inc) || 1;
  const incPos = inc > 0 ? Math.min(100, inc / scale * 100) : null;
  const [ip, dp] = nf.format(spend).split(',');
  const digits = `${ip.replace(/\./g, '')} ${dp}`;

  // Takvim ısı haritası
  const byDay = {}; rows.forEach(({ t, st }) => byDay[t.date] = (byDay[t.date] || 0) + amtTL(t, st));
  const from = sts.map(s => s.manual ? `${s.month}-01` : (() => { const d = new Date(s.kesim + 'T12:00:00'); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); })()).sort()[0];
  const to = sts.map(s => s.kesim).sort().pop();
  const cells = []; { const d = new Date(from + 'T12:00:00'), end = new Date(to + 'T12:00:00');
    const lead = (d.getDay() + 6) % 7; for (let i = 0; i < lead; i++) cells.push(null);
    while (d <= end) { const key = d.toISOString().slice(0, 10); cells.push([key, Math.max(0, byDay[key] || 0), d.getDate()]); d.setDate(d.getDate() + 1); } }
  const maxDay = Math.max(1, ...cells.filter(Boolean).map(c => c[1]));
  const topDay = cells.filter(Boolean).reduce((a, d) => d[1] > a[1] ? d : a, ['', 0]);
  const heat = v => v <= 0 ? 'var(--cell)' : `rgba(var(--heat),${(0.16 + 0.84 * Math.sqrt(v / maxDay)).toFixed(2)})`;
  const weekend = cells.filter(c => c && [0, 6].includes(new Date(c[0] + 'T12:00:00').getDay())).reduce((a, c) => a + c[1], 0);

  const merch = {}; rows.forEach(({ t, st }) => { const m = merchantKey(t.desc); merch[m] = merch[m] || { v: 0, n: 0, c: catOf(t) }; merch[m].v += amtTL(t, st); merch[m].n++; });
  const topM = Object.entries(merch).sort((a, b) => b[1].v - a[1].v).slice(0, 5);

  const byCard = {}; rows.forEach(({ t, st }) => { const key = st.id + '|' + t.card; byCard[key] = byCard[key] || { v: 0, st, c: t.card }; byCard[key].v += amtTL(t, st); });
  const cardList = Object.values(byCard).sort((a, b) => b.v - a.v);
  const cardCols = ['var(--c-taksit)', 'var(--c-gelir)', 'var(--c-gider)', '#8a6fd1', 'var(--c-devneg)', '#7FA3D6'];
  const byPerson = {}; if (isHane()) rows.forEach(({ t, st }) => byPerson[st.profile] = (byPerson[st.profile] || 0) + amtTL(t, st));

  const takRows = rows.filter(({ t }) => t.taksitToplam && t.type === 'expense');
  const tak = takRows.filter(({ t }) => t.taksitNo < t.taksitToplam);
  const takRemain = tak.reduce((a, { t }) => a + (t.taksitToplam - t.taksitNo) * t.tl, 0);
  const takNext = tak.reduce((a, { t }) => a + t.tl, 0);
  const takAll = takRows.reduce((a, { t }) => a + t.tl, 0);

  const top = cats[0];
  const change = psts.length && pspend ? (spend - pspend) / pspend * 100 : null;
  const insight = top ? `En büyük kalem <b>${esc(top[0])}</b>: her 100 liranın ${nf0.format(top[1] / spend * 100)}'ü buraya gitti.` +
    (change != null ? ` Toplam harcama ${mLabel(prevKey(k)).split(' ')[0]} ayına göre <b class="${change > 0 ? 'neg' : 'pos'}">%${nf0.format(Math.abs(change))} ${change > 0 ? 'arttı' : 'azaldı'}</b>.` : '') : '';

  const dups = duplicateGroups().filter(g => g.some(s => s.month === k && inProfile(s)));
  return `
  ${dups.length ? `<div class="dupwarn"><b>Aynı ekstre birden fazla yüklenmiş</b>
    <span>${dups.map(g => `${esc(g[0].bank)}, kesim ${dTR(g[0].kesim)} (${g.length} kez)`).join('; ')}. Bu yüzden toplamlar fazla görünüyor.</span>
    <button class="btn" onclick="fixDuplicates()">Kopyaları sil, birini tut</button></div>` : ''}
  <div class="receipt-wrap"><div class="receipt" role="group" aria-label="${mLabel(k)} harcama özeti">
    <div class="rc-head"><div class="shop">Ekstrem</div>
      <div class="meta">${up(mLabel(k))} · ${up(isHane() ? 'Hane' : profName(S.profile))}</div></div>
    ${cardSts.length ? `<div class="stamp ${okAll ? '' : 'warn'}">${okAll ? 'BANKA<br>TOPLAMIYLA<br>EŞLEŞTİ' : okAny ? 'TOPLAM<br>TUTMADI' : 'DOĞRULAN-<br>AMADI'}</div>` : ''}
    <hr class="rc-rule">
    ${Object.entries(bySrc).sort((a, b) => b[1] - a[1]).map(([s, v]) => rcLine(s, nf.format(v))).join('')}
    ${refunds ? rcLine('İade / indirim', '−' + nf.format(refunds), 'small') : ''}
    ${fees ? rcLine('Faiz ve ücret dahil', nf.format(fees), 'small') : ''}
    ${usdOpen ? rcLine('Kuru girilmemiş döviz', nf.format(usdOpen) + ' $', 'small') : ''}
    <hr class="rc-rule">
    <div class="total"><span class="lbl">TOPLAM</span><span class="amt">${ip}<small>,${dp} ₺</small></span></div>
    ${inc ? rcLine('Gelir', nf.format(inc)) + rcLine(net >= 0 ? 'Kalan' : 'Açık', `<span class="${net >= 0 ? 'pos' : 'neg'}">${nf.format(Math.abs(net))}</span>`) +
      rcLine('Tasarruf oranı', '%' + nf0.format(net / inc * 100)) : ''}
    <hr class="rc-rule double">
    <div class="barcode" aria-hidden="true">
      <div class="bars">${cats.filter(c => c[1] > 0).map(([c, v]) => `<span class="seg" style="--c:${CATCOL[c]};width:${v / scale * 100}%"></span>`).join('')}${inc > spend ? '<span class="rest"></span>' : ''}</div>
      ${incPos != null ? `<div class="inc ${incPos > 80 ? 'right' : incPos < 20 ? 'left' : ''}" style="left:${incPos}%"><b>gelir</b></div>` : ''}
      <div class="digits"><span>${digits}</span><span>${cats.length} kategori</span></div>
    </div>
  </div></div>
  <div class="rc-actions">
    ${inc || isHane() ? '' : `<button class="btn ghost" onclick="S.addMode='gelir';go('gelir')">Gelir gir</button>`}
    <button class="btn ghost" onclick="exportReceipt()">${DL_ICON} Fişi PNG kaydet</button></div>

  ${isHane() ? `<section class="card"><h2>Kişilere göre</h2>
    <div class="stackbar">${S.profiles.map((p, i) => `<i style="width:${(byPerson[p.id] || 0) / (spend || 1) * 100}%;background:${PCOL[i % 4]}"></i>`).join('')}</div>
    <ul class="list-plain" style="margin-top:6px">${S.profiles.map((p, i) => {
      const pi = S.incomes.filter(x => x.month === k && x.profile === p.id).reduce((a, x) => a + x.amount, 0);
      return `<li><span><i class="dot" style="background:${PCOL[i % 4]};margin-right:8px"></i>${esc(p.name)}${pi ? `<br><span class="sub">gelir ${tl0(pi)}</span>` : ''}</span><b>${tl(byPerson[p.id] || 0)}</b></li>`;
    }).join('')}</ul></section>` : ''}

  ${usdSts.map(st => `<section class="card"><h2>Döviz harcaması<small>${esc(st.bank)}</small></h2>
    <div class="row"><div><b>${nf.format(st.tx.filter(isSpend).reduce((x, t) => x + (t.type === 'refund' ? -t.usd : t.usd || 0), 0))} USD</b>
      <div class="sub">${st.usdRate ? `1 USD = ${nf.format(st.usdRate)} ₺ ile toplama dahil` : 'Toplama eklemek için ödediğin kuru gir'}</div></div>
    <input class="inp" style="width:110px" inputmode="decimal" placeholder="Kur" value="${st.usdRate ? nf.format(st.usdRate) : ''}" onchange="setRate('${st.id}', this.value)"></div></section>`).join('')}

  ${planCompareCard(k)}

  <section class="card"><h2>Nereye gitti?${psts.length ? `<small>${mShort(prevKey(k))} ile fark</small>` : ''}</h2>
    ${insight ? `<p class="insight">${insight}</p>` : ''}
    <ul class="cats">${cats.map(([c, v]) => {
      const d = psts.length ? v - (pcats[c] || 0) : null;
      return `<li onclick="filterCat('${esc(c)}')">${ico(c)}<span class="nm">${esc(c)}</span>
        <span class="amt">${tl(v)}</span>
        <span class="meta"><span class="bar"><i style="width:${Math.max(0, v / (cats[0][1] || 1) * 100)}%;background:${CATCOL[c]}"></i></span>
        <span class="sub">%${spend ? nf0.format(v / spend * 100) : 0}</span>
        ${d != null && Math.abs(d) >= 1 ? `<span class="delta ${d > 0 ? 'neg' : 'pos'}">${d > 0 ? '+' : '−'}${nf0.format(Math.abs(d))}</span>` : ''}</span></li>`;
    }).join('')}</ul></section>

  <section class="card"><h2>Harcama takvimi<small>${topDay[0] ? `en yoğun ${dLabel(topDay[0])}` : ''}</small></h2>
    <div class="cal">${DAYS.map(d => `<span class="dh">${d}</span>`).join('')}
      ${cells.map(c => c ? `<span class="d ${c[0] === topDay[0] ? 'top' : ''} ${c[1] / maxDay > .45 ? 'hot' : ''}" style="background:${heat(c[1])}" title="${dLabel(c[0])}: ${tl(c[1])}">${c[2]}</span>` : '<span class="d x"></span>').join('')}</div>
    <div class="calleg"><span>az</span>${[0.02, .15, .4, .7, 1].map(v => `<i style="background:${heat(v * maxDay)}"></i>`).join('')}<span>çok</span>
      <span style="margin-left:auto">hafta sonu payı %${spend ? nf0.format(weekend / spend * 100) : 0}</span></div>
    ${topDay[0] ? `<p class="sub" style="margin:10px 0 0">En yoğun gün ${dLabel(topDay[0])}: ${tl(topDay[1])}. Taksit dilimleri, taksidin bu döneme yansıdığı günde sayılır.</p>` : ''}</section>

  <section class="card"><h2>En çok harcanan yerler</h2><ul class="list-plain">${topM.map(([m, o], i) =>
    `<li><span style="display:flex;align-items:center;gap:10px;min-width:0">${ico(o.c, ';width:34px;height:34px;font-size:16px;border-radius:10px')}<span style="min-width:0"><b style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(m)}</b><span class="sub">${o.n} işlem</span></span></span><b>${tl(o.v)}</b></li>`).join('')}</ul></section>

  ${cardList.length > 1 ? `<section class="card"><h2>Kartlara göre</h2>
    <div class="stackbar">${cardList.map((c, i) => `<i style="width:${Math.max(0, c.v / spend * 100)}%;background:${cardCols[i % 6]}"></i>`).join('')}</div>
    <ul class="list-plain" style="margin-top:6px">${cardList.map((c, i) => `<li><span><i class="dot" style="background:${cardCols[i % 6]};margin-right:8px"></i>${esc(cardName(c.c, c.st))}${isHane() ? `<span class="pill">${esc(profName(c.st.profile))}</span>` : ''}</span><b>${tl(c.v)}</b></li>`).join('')}</ul></section>` : ''}

  ${takAll ? `<section class="card"><h2>Taksitler</h2>
    <div class="stats"><div class="stat"><div class="l">Bu ay ödenen</div><div class="v">${tl0(takAll)}</div></div>
    <div class="stat"><div class="l">Gelecek ay</div><div class="v">${tl0(takNext)}</div></div>
    <div class="stat"><div class="l">Kalan borç</div><div class="v">${tl0(takRemain)}</div></div></div>
    ${tak.length ? `<ul class="list-plain" style="margin-top:10px">${tak.sort((a, b) => (b.t.taksitToplam - b.t.taksitNo) * b.t.tl - (a.t.taksitToplam - a.t.taksitNo) * a.t.tl).map(({ t, st }) =>
      `<li><span style="min-width:0"><b>${esc(merchantKey(t.desc))}</b><br><span class="sub">${esc(srcLabel(t, st))}, ${t.taksitToplam - t.taksitNo} ay kaldı</span>
        <span class="dotsline" aria-label="${t.taksitNo}/${t.taksitToplam} taksit">${Array.from({ length: Math.min(t.taksitToplam, 12) }, (_, j) => `<i class="${j < t.taksitNo ? '' : 'o'}"></i>`).join('')}</span></span><b>${tl(t.tl)}</b></li>`).join('')}</ul>` : ''}</section>` : ''}

  <section class="card"><h2>Ekstreler</h2><ul class="list-plain">${sts.map(st => st.manual
    ? `<li><span><b>Kart dışı harcamalar</b>${isHane() ? `<span class="pill">${esc(profName(st.profile))}</span>` : ''}<br><span class="sub">${st.tx.length} kayıt: nakit, havale vb.</span></span><span class="strow"><b>${tl(st.tx.reduce((a, t) => a + t.tl, 0))}</b>${TRASH(st.id)}</span></li>`
    : `<li><span><b>${esc(st.bank)}</b>${isHane() ? `<span class="pill">${esc(profName(st.profile))}</span>` : ''}
      <br><span class="sub">Kesim ${dTR(st.kesim)}, son ödeme ${dTR(st.sonOdeme)}</span></span>
      <span class="strow"><b style="text-align:right">${esc(st.borcTL || '-')} ₺${st.borcUSD && st.borcUSD !== '0,00' ? '<br>+ ' + esc(st.borcUSD) + ' $' : ''}</b>${TRASH(st.id)}</span></li>`).join('')}</ul></section>`;
}

function TRASH(id) {
  return `<button class="trash" onclick="askDeleteStatement('${id}')" aria-label="Sil"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button>`;
}
function merchantKey(desc) {
  return desc.replace(/^\d{2}\/\d{2}\s+/, '').replace(/\s+\d{2}\.Tak\b.*$/, '').replace(/^Sonradan Taksit\s+/i, '')
    .replace(/\s+\d+\.\s*Taksit$/i, '').replace(/\s+\([\d.,]+ döviz\)$/, '')
    .replace(/\s+(İSTANBUL|ISTANBUL|ANKARA|LONDON|TRTR|TR|STANBUL)(\s+(TR|TRTR))?$/i, '')
    .replace(/^IYZICO\//i, '').replace(/^\?YZ\?CO\//, '').replace(/^S\//, '').trim();
}

/* ---------- İşlemler ---------- */
function viewIslem() {
  if (!S.statements.some(inProfile)) return viewEmpty();
  const q = BKCats.upper(S.q.trim());
  const src = S.qScope === 'all' ? S.statements.filter(inProfile) : stmtsOf(S.month);
  let list = rowsOf(src);
  list = list.filter(({ t }) => S.qType === 'spend' ? isSpend(t) : S.qType === 'refund' ? t.type === 'refund' : S.qType === 'pay' ? t.type === 'payment' : true);
  if (S.qCat) list = list.filter(({ t }) => catOf(t) === S.qCat);
  if (q) list = list.filter(({ t, st }) => {
    const hay = BKCats.upper([t.desc, catOf(t), t.note || '', cardName(t.card, st), st.bank, profName(st.profile), nf.format(t.tl), dTR(t.date)].join(' '));
    return q.split(' ').every(w => hay.includes(w));
  });
  list.sort((a, b) => b.t.date.localeCompare(a.t.date) || b.t.i - a.t.i);
  const total = list.reduce((a, { t, st }) => a + (isSpend(t) ? amtTL(t, st) : 0), 0);
  const catsUsed = [...new Set(spendRows(src).map(r => catOf(r.t)))].sort((a, b) => a.localeCompare(b, 'tr'));
  let lastDay = '', rows = '';
  for (const { t, st } of list.slice(0, 400)) {
    if (t.date !== lastDay) { lastDay = t.date; rows += `<div class="txday">${dLabel(t.date)} ${t.date.slice(0, 4)}</div>`; }
    const c = catOf(t); const col = t.type === 'payment' ? '#9aa6a3' : CATCOL[c];
    const amtStr = t.usd && !t.tl ? nf.format(t.usd) + ' $' : tl(t.tl);
    rows += `<button class="tx" onclick="editTx('${st.id}',${t.i})">${t.type === 'payment' ? '<span class="ico" style="background:var(--hair)" aria-hidden="true">💳</span>' : ico(c)}
      <span class="mid"><span class="d">${esc(merchantKey(t.desc))}</span>
      <span class="m">${esc(t.type === 'payment' ? 'Ödeme' : c)} · ${esc(srcLabel(t, st))}${isHane() ? `<span class="pill">${esc(profName(st.profile))}</span>` : ''}${t.taksitToplam ? `<span class="tag">${t.taksitNo}/${t.taksitToplam} taksit</span>` : ''}${t.catManual ? '<span class="tag">elle</span>' : ''}${t.note ? `<span class="tag">${esc(t.note)}</span>` : ''}</span></span>
      <span class="a ${t.type === 'refund' ? 'refund' : t.type === 'payment' ? 'pay' : ''}">${t.type === 'refund' || t.type === 'payment' ? '+' : ''}${amtStr}</span></button>`;
  }
  return `
  <div class="search"><input id="q" type="search" placeholder="İşyeri, kategori, banka, tutar veya tarih ara" value="${esc(S.q)}" autocomplete="off"></div>
  <div class="row" style="margin-bottom:10px;flex-wrap:wrap">
    <div class="seg" role="group" aria-label="Kapsam">
      <button aria-pressed="${S.qScope === 'month'}" onclick="setQ('qScope','month')">${S.month ? mShort(S.month) : 'Bu ay'}</button>
      <button aria-pressed="${S.qScope === 'all'}" onclick="setQ('qScope','all')">Tüm aylar</button></div>
    <div class="seg" role="group" aria-label="Tür">
      <button aria-pressed="${S.qType === 'spend'}" onclick="setQ('qType','spend')">Harcama</button>
      <button aria-pressed="${S.qType === 'refund'}" onclick="setQ('qType','refund')">İade</button>
      <button aria-pressed="${S.qType === 'pay'}" onclick="setQ('qType','pay')">Ödeme</button></div>
  </div>
  <div class="chips"><button class="chip" aria-pressed="${!S.qCat}" onclick="setQ('qCat',null)">Tümü</button>
    ${catsUsed.map(c => `<button class="chip" aria-pressed="${S.qCat === c}" onclick="setQ('qCat','${esc(c)}')"><i class="dot" style="background:${CATCOL[c]}"></i>${esc(c)}</button>`).join('')}</div>
  <div class="resultsum"><b>${list.length}</b> işlem${S.qType !== 'pay' ? ` · toplam <b>${tl(total)}</b>` : ''}</div>
  ${rows ? `<div class="txlist">${rows}</div>` : '<div class="empty"><p>Aramana uyan işlem yok. Farklı bir kelime dene ya da kapsamı "Tüm aylar" yap.</p></div>'}
  ${list.length > 400 ? '<p class="sub">İlk 400 sonuç gösteriliyor, aramayı daraltabilirsin.</p>' : ''}`;
}

/* ---------- Aylar ---------- */
function viewTrend() {
  const keys = monthKeys();
  if (!keys.length) return viewEmpty();
  const data = keys.map(k => { const sts = stmtsOf(k); return { k, sts, s: spendOf(sts), i: incomeOf(k), has: sts.length > 0 }; });
  const max = Math.max(1, ...data.map(d => Math.max(d.s, d.i)));
  const withS = data.filter(d => d.has);
  const avg = withS.reduce((a, d) => a + d.s, 0) / (withS.length || 1);
  const totals = {}; withS.forEach(d => Object.entries(catTotals(d.sts)).forEach(([c, v]) => totals[c] = (totals[c] || 0) + v));
  const allCats = Object.keys(totals);
  const tc = allCats.includes(S.trendCat) ? S.trendCat : allCats.sort((a, b) => totals[b] - totals[a])[0];
  const cdata = withS.map(d => ({ k: d.k, v: catTotals(d.sts)[tc] || 0 }));
  const cmax = Math.max(1, ...cdata.map(d => d.v));
  const cavg = cdata.reduce((a, d) => a + d.v, 0) / (cdata.length || 1);
  return `
  <section class="card"><h2>Aylık harcama ve gelir<small>ortalama ${tl0(avg)}</small></h2>
    <div class="tbars">${data.map(d => `<div class="tcol ${d.k === S.month ? 'sel' : ''}" onclick="pickMonth('${d.k}')">
      <div class="val">${d.has ? nf0.format(d.s / 1000) + 'k' : ''}</div>
      <div class="b" style="height:${d.s / max * 78}%"></div>
      ${d.i ? `<div class="inc" style="bottom:calc(${d.i / max * 78}% + 20px)"></div>` : ''}
      <div class="lbl">${mShort(d.k)}</div></div>`).join('')}</div>
    <div class="legend"><span><i style="background:var(--bar-muted)"></i>Harcama</span><span><i style="background:var(--firuze);height:3px"></i>Gelir</span></div></section>
  <section class="card"><h2>Ay ay özet</h2><table class="t"><thead><tr><th>Ay</th><th>Harcama</th><th>Gelir</th><th>Kalan</th></tr></thead><tbody>
    ${data.slice().reverse().map(d => `<tr onclick="pickMonth('${d.k}')"><td>${mLabel(d.k)}<br><span class="sub">${[...new Set(d.sts.map(s => s.manual ? 'Kart dışı' : bankShort(s.bank)))].map(esc).join(', ')}</span></td><td>${d.has ? tl0(d.s) : '—'}</td><td>${d.i ? tl0(d.i) : '—'}</td>
      <td class="${d.i ? (d.i - d.s >= 0 ? 'pos' : 'neg') : ''}">${d.i && d.has ? tl0(d.i - d.s) : '—'}</td></tr>`).join('')}</tbody></table></section>
  ${tc ? `<section class="card"><h2>Kategori bazında<small>ortalama ${tl0(cavg)}/ay</small></h2>
    <div class="chips">${allCats.sort((a, b) => a.localeCompare(b, 'tr')).map(c => `<button class="chip" aria-pressed="${c === tc}" onclick="S.trendCat='${esc(c)}';render()"><i class="dot" style="background:${CATCOL[c]}"></i>${esc(c)}</button>`).join('')}</div>
    <div class="tbars" style="height:140px">${cdata.map(d => `<div class="tcol"><div class="val">${nf0.format(d.v / 1000 * 10) / 10}k</div>
      <div class="b" style="height:${Math.max(0, d.v / cmax * 72)}%;background:${CATCOL[tc]}"></div><div class="lbl">${mShort(d.k)}</div></div>`).join('')}</div></section>` : ''}`;
}

/* ---------- Ekle: kart dışı harcama ve gelir ---------- */
function viewGelir() {
  const k = S.month || new Date().toISOString().slice(0, 7);
  const seg = `<div class="seg" role="group" aria-label="Kayıt türü" style="margin-bottom:12px">
    <button style="flex:1" aria-pressed="${S.addMode === 'harcama'}" onclick="setQ('addMode','harcama')">Kart dışı harcama</button>
    <button style="flex:1" aria-pressed="${S.addMode === 'gelir'}" onclick="setQ('addMode','gelir')">Gelir</button></div>`;
  if (isHane()) {
    const tot = incomeOf(k);
    return seg + `<section class="card"><h2>${mLabel(k)} hane geliri</h2>
      <ul class="list-plain">${S.profiles.map(p => `<li><span>${esc(p.name)}</span><b>${tl(S.incomes.filter(i => i.month === k && i.profile === p.id).reduce((a, i) => a + i.amount, 0))}</b></li>`).join('')}
      <li><b>Toplam</b><b class="pos">${tl(tot)}</b></li></ul>
      <p class="sub">Kayıt eklemek için üstten kişiyi seç.</p></section>`;
  }
  return seg + (S.addMode === 'gelir' ? viewIncomeForm(k) : viewManualForm(k));
}
function viewManualForm(k) {
  const st = manualStmt(S.profile, k);
  const items = st ? st.tx.slice().sort((a, b) => b.date.localeCompare(a.date)) : [];
  const today = new Date().toISOString().slice(0, 10);
  const defDate = today.slice(0, 7) === k ? today : `${k}-15`;
  const recent = [...new Set(S.statements.filter(s => s.manual).flatMap(s => s.tx.map(t => t.desc)))].slice(-30);
  return `
  <section class="card"><h2>Kart dışı harcama ekle<small>${esc(profName(S.profile))}</small></h2>
    <p class="sub" style="margin:0 0 4px">Nakit, banka kartı, havale gibi ekstreye yansımayan harcamalar. Kayıt, tarihin düştüğü aya eklenir.</p>
    <label class="f" for="mDesc">Açıklama</label>
    <input class="inp" id="mDesc" list="mRecent" placeholder="Örn. pazar alışverişi, kira, berber" autocomplete="off">
    <datalist id="mRecent">${recent.map(d => `<option>${esc(d)}</option>`).join('')}</datalist>
    <div class="row" style="gap:10px;align-items:flex-end">
      <div style="flex:1"><label class="f" for="mAmt">Tutar (₺)</label><input class="inp" id="mAmt" inputmode="decimal" placeholder="0,00"></div>
      <div style="flex:1"><label class="f" for="mDate">Tarih</label><input class="inp" id="mDate" type="date" value="${defDate}"></div>
    </div>
    <label class="f" for="mCat">Kategori</label>
    <select class="inp" id="mCat"><option value="">Otomatik (açıklamaya göre)</option>${CATNAMES.map(c => `<option>${esc(c)}</option>`).join('')}</select>
    <label class="f" for="mPay">Ödeme şekli</label>
    <select class="inp" id="mPay"><option>Nakit</option><option>Banka kartı</option><option>Havale / EFT</option><option>Otomatik ödeme</option><option>Diğer</option></select>
    <label class="f" for="mNote">Not (isteğe bağlı)</label><input class="inp" id="mNote">
    <button class="btn block" onclick="addManual()">Harcamayı kaydet</button></section>
  <section class="card"><h2>${mLabel(k)} kart dışı harcamaları${items.length ? `<small>${tl(items.reduce((a, t) => a + t.tl, 0))}</small>` : ''}</h2>
    ${items.length ? `<ul class="list-plain">${items.map(t => `<li><span><b>${esc(t.desc)}</b><br><span class="sub">${dLabel(t.date)} · ${esc(catOf(t))} · ${esc(t.pay || 'Nakit')}${t.note ? ' · ' + esc(t.note) : ''}</span></span>
      <span style="white-space:nowrap"><b>${tl(t.tl)}</b><button class="x" aria-label="Sil" onclick="delManual('${st.id}',${t.i})">×</button></span></li>`).join('')}</ul>`
      : '<p class="sub">Bu ay için kart dışı harcama girilmedi.</p>'}</section>`;
}
function viewIncomeForm(k) {
  const items = S.incomes.filter(i => i.month === k && i.profile === S.profile);
  const total = items.reduce((a, i) => a + i.amount, 0);
  const prev = S.incomes.filter(i => i.month === prevKey(k) && i.profile === S.profile);
  return `
  <section class="card"><h2>${esc(profName(S.profile))} · ${mLabel(k)} gelirleri</h2>
    ${items.length ? items.map(i => `<div class="inc-item"><span><b>${esc(i.source)}</b>${i.note ? `<br><span class="sub">${esc(i.note)}</span>` : ''}</span>
      <span><b>${tl(i.amount)}</b><button class="x" aria-label="Sil" onclick="delIncome('${i.id}')">×</button></span></div>`).join('')
      : '<p class="sub">Bu ay için gelir girilmedi.</p>'}
    ${items.length ? `<div class="row" style="padding-top:10px"><b>Toplam</b><b class="pos">${tl(total)}</b></div>` : ''}
    ${!items.length && prev.length ? `<button class="btn ghost block" onclick="copyPrevIncome()">${mLabel(prevKey(k))} gelirlerini kopyala (${tl0(prev.reduce((a, i) => a + i.amount, 0))})</button>` : ''}
  </section>
  <section class="card"><h2>Gelir ekle</h2>
    <label class="f" for="gm">Ay</label><input class="inp" id="gm" type="month" value="${k}">
    <label class="f" for="gs">Kaynak</label>
    <input class="inp" id="gs" list="srcs" placeholder="Maaş, ek gelir, kira…" value="Maaş">
    <datalist id="srcs"><option>Maaş</option><option>Ek gelir</option><option>Prim / ikramiye</option><option>Kira geliri</option><option>Burs</option><option>Diğer</option></datalist>
    <label class="f" for="ga">Tutar (₺)</label><input class="inp" id="ga" inputmode="decimal" placeholder="0,00">
    <label class="f" for="gn">Not (isteğe bağlı)</label><input class="inp" id="gn">
    <button class="btn block" onclick="addIncome()">Geliri kaydet</button></section>`;
}
window.addManual = async () => {
  const desc = $('#mDesc').value.trim(), amount = parseNum($('#mAmt').value), date = $('#mDate').value;
  if (!desc) return toast('Açıklama yaz, örneğin "pazar alışverişi".');
  if (!isFinite(amount) || amount <= 0) return toast('Geçerli bir tutar gir, örneğin 1.250,00');
  if (!date) return toast('Tarih seç.');
  const month = date.slice(0, 7);
  const st = manualStmt(S.profile, month, true);
  const cat = $('#mCat').value;
  const t = { i: Date.now(), date, card: '', desc, tl: Math.round(amount * 100) / 100, usd: 0, type: 'expense', pay: $('#mPay').value };
  if (cat) { t.cat = cat; t.catManual = true; }
  const note = $('#mNote').value.trim(); if (note) t.note = note;
  st.tx.push(t); await Store.put('statements', st);
  S.month = month; render(); toast(`${tl(t.tl)} · ${catOf(t)} olarak kaydedildi`);
  const d = $('#mDesc'); if (d) d.focus();
};
window.delManual = async (sid, i) => {
  const st = stmtById(sid); st.tx = st.tx.filter(t => t.i !== i);
  if (st.tx.length) await Store.put('statements', st); else { await Store.del('statements', sid); S.statements = S.statements.filter(s => s !== st); }
  render();
};

function render() {
  renderHeader();
  document.querySelectorAll('#tabs button').forEach(b => b.setAttribute('aria-current', b.dataset.v === S.view ? 'page' : 'false'));
  const v = { ozet: viewOzet, islem: viewIslem, trend: viewTrend, plan: viewPlan, gelir: viewGelir }[S.view];
  $('#main').innerHTML = v();
  const q = $('#q');
  if (q) q.oninput = e => { S.q = e.target.value; const pos = e.target.selectionStart; render(); const n = $('#q'); n.focus(); n.setSelectionRange(pos, pos); };
}

/* ---------- Eylemler ---------- */
window.go = v => {
  if (v === S.view) { window.scrollTo(0, 0); return; }
  if (v === 'ozet') { hist(() => { const cur = history.state || {}; if (cur.v && cur.v !== 'ozet') history.back(); else { S.view = 'ozet'; render(); } }); return; }
  hist(() => { const cur = history.state || {}; (cur.v && cur.v !== 'ozet' ? history.replaceState : history.pushState).call(history, { v }, ''); });
  S.view = v; render(); window.scrollTo(0, 0);
};
window.pickMonth = k => { S.month = k; if (S.view === 'ozet') { render(); window.scrollTo(0, 0); } else go('ozet'); };
window.setQ = (key, val) => { S[key] = val; render(); };
window.filterCat = c => { S.qCat = c; S.qScope = 'month'; S.qType = 'spend'; S.q = ''; go('islem'); };
function setProfile(p) {
  S.profile = p; saveKV('activeProfile', p);
  const keys = monthKeys(); if (!keys.includes(S.month)) S.month = keys[keys.length - 1] || null;
  S.qCat = null; render();
}
const parseNum = s => {
  s = String(s).trim().replace(/\s|₺|TL/gi, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  return parseFloat(s);
};
window.setRate = async (id, v) => {
  const st = stmtById(id); const n = parseNum(v);
  st.usdRate = isFinite(n) && n > 0 ? n : null; await Store.put('statements', st); render();
};
window.addIncome = async () => {
  const month = $('#gm').value, source = $('#gs').value.trim() || 'Gelir', amount = parseNum($('#ga').value), note = $('#gn').value.trim();
  if (!month) return toast('Ay seç.');
  if (!isFinite(amount) || amount <= 0) return toast('Geçerli bir tutar gir, örneğin 85.000,00');
  const it = { id: 'i' + Date.now(), month, source, amount, note, profile: S.profile };
  await Store.put('incomes', it); S.incomes.push(it); S.month = month; render(); toast('Gelir kaydedildi');
};
window.delIncome = async id => { await Store.del('incomes', id); S.incomes = S.incomes.filter(i => i.id !== id); render(); };
window.copyPrevIncome = async () => {
  const k = S.month;
  for (const p of S.incomes.filter(i => i.month === prevKey(k) && i.profile === S.profile)) {
    const it = { ...p, id: 'i' + Date.now() + Math.random().toString(36).slice(2, 6), month: k };
    await Store.put('incomes', it); S.incomes.push(it);
  }
  render(); toast('Gelirler kopyalandı');
};

window.editTx = (sid, i) => {
  const st = stmtById(sid); const t = st.tx.find(x => x.i === i); const cur = catOf(t);
  const kw = merchantKey(t.desc).split(/\s+/).slice(0, 2).join(' ');
  openSheet(`<h3>${esc(merchantKey(t.desc))}</h3>
    <div class="sub">${dTR(t.date)} · ${esc(st.manual ? (t.pay || 'Nakit') : cardName(t.card, st))} · ${esc(profName(st.profile))} · ${t.usd && !t.tl ? nf.format(t.usd) + ' $' : tl(t.tl)}${t.taksit ? ' · ' + esc(t.taksit) : ''}</div>
    <div class="sub" style="margin-top:4px">Ekstredeki açıklama: ${esc(t.desc)}</div>
    ${t.type === 'payment' ? '' : `<label class="f">Kategori</label>
    <div class="catgrid">${CATNAMES.map(c => `<button data-c="${esc(c)}" aria-pressed="${c === cur}"><span class="e" aria-hidden="true">${CATICON[c]}</span>${esc(c)}</button>`).join('')}</div>
    <label class="f" style="display:flex;gap:8px;align-items:center;margin-top:14px"><input type="checkbox" id="mkRule" checked> İçinde şu ifade geçen tüm işlemlere uygula:</label>
    <input class="inp" id="ruleKw" value="${esc(kw)}">`}
    <label class="f" for="note">Not</label><input class="inp" id="note" value="${esc(t.note || '')}" placeholder="Örn. doğum günü hediyesi">
    <button class="btn block" id="txSave">Kaydet</button>
    ${st.manual ? '<button class="btn danger block" id="txDel">Bu harcamayı sil</button>' : ''}`);
  if (st.manual) $('#txDel').onclick = async () => {
    st.tx = st.tx.filter(x => x !== t);
    if (st.tx.length) await Store.put('statements', st); else { await Store.del('statements', st.id); S.statements = S.statements.filter(s => s !== st); }
    closeSheet(true); render(); toast('Harcama silindi');
  };
  let chosen = cur;
  document.querySelectorAll('.catgrid button').forEach(b => b.onclick = () => {
    chosen = b.dataset.c; document.querySelectorAll('.catgrid button').forEach(x => x.setAttribute('aria-pressed', x === b));
  });
  $('#txSave').onclick = async () => {
    t.note = $('#note').value.trim() || undefined;
    if (t.type !== 'payment' && chosen !== cur) {
      const rule = $('#mkRule').checked && $('#ruleKw').value.trim();
      if (rule) {
        S.rules = S.rules.filter(r => BKCats.upper(r.kw) !== BKCats.upper(rule));
        S.rules.unshift({ kw: rule, cat: chosen }); await saveKV('rules', S.rules);
        t.catManual = false; delete t.cat;
      } else { t.cat = chosen; t.catManual = true; }
    }
    await Store.put('statements', st); closeSheet(true); render();
    toast(chosen !== cur ? `Kategori: ${chosen}` : 'Kaydedildi');
  };
};

/* ---------- Ayarlar ---------- */
function openSettings() {
  const cardSet = {}; S.statements.forEach(s => s.tx.forEach(t => { if (t.card) cardSet[t.card] = s; }));
  const opts = sel => S.profiles.map(p => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${esc(p.name)}</option>`).join('');
  openSheet(`<h3>Ayarlar</h3>
    <label class="f">Görünüm</label>
    <div class="seg" role="group" aria-label="Tema">${[['auto', 'Telefona göre'], ['light', 'Açık'], ['dark', 'Koyu']].map(([k, l]) =>
      `<button style="flex:1" aria-pressed="${S.theme === k}" data-theme-set="${k}">${l}</button>`).join('')}</div>
    <label class="f">Kişiler</label>
    ${S.profiles.map(p => `<input class="inp" style="margin-bottom:6px" data-pname="${p.id}" value="${esc(p.name)}">`).join('')}
    <label class="f">Kartlar</label>
    ${Object.keys(cardSet).length ? Object.entries(cardSet).map(([c, s]) => `<div class="row" style="margin-bottom:6px;gap:6px">
      <span style="flex:0 0 92px;font-size:13px">${esc(bankShort(s.bank))}<br>•••• ${c}</span>
      <input class="inp" data-card="${c}" value="${esc(S.cards[c] || '')}" placeholder="Kart adı">
      <select class="inp" style="width:auto" data-cprof="${c}">${opts(S.cardProfile[c] || s.profile)}</select></div>`).join('') : '<p class="sub">Ekstre yükleyince kartların burada görünür.</p>'}
    <label class="f">Kendi kategori kuralların (${S.rules.length})</label>
    ${S.rules.length ? `<ul class="list-plain">${S.rules.map((r, i) => `<li><span>"${esc(r.kw)}" → <b>${esc(r.cat)}</b></span><button class="x" aria-label="Kuralı sil" data-rule="${i}">×</button></li>`).join('')}</ul>` : '<p class="sub">Bir işleme dokunup kategorisini değiştirdiğinde kural buraya eklenir.</p>'}
    <label class="f">Yüklü ekstreler</label>
    ${duplicateGroups().length ? `<div class="dupwarn"><b>${duplicateGroups().reduce((a, g) => a + g.length - 1, 0)} kopya ekstre var</b><button class="btn" id="fixDup">Kopyaları sil</button></div>` : ''}
    <ul class="list-plain">${S.statements.slice().reverse().map(s => `<li><span>${esc(s.manual ? 'Kart dışı harcamalar' : s.bank)} · ${mLabel(s.month)}<br><span class="sub">${esc(profName(s.profile))} · ${s.tx.length} ${s.manual ? 'kayıt' : 'satır · kesim ' + dTR(s.kesim)}</span></span><button class="trash" aria-label="Sil" data-st="${s.id}"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button></li>`).join('') || '<li class="sub">Yok</li>'}</ul>
    <label class="f">Yedekleme</label>
    <p class="sub" style="margin:0 0 6px">Veriler yalnızca bu telefonda (${Store.mode}) saklanır. Uygulamayı silmeden önce yedek al.</p>
    <button class="btn ghost block" id="bkDl">Yedeği dosya olarak indir</button>
    <button class="btn ghost block" id="bkCp">Yedeği panoya kopyala</button>
    <button class="btn ghost block" id="bkIn">Yedekten geri yükle</button>
    <button class="btn danger block" id="wipe">Tüm verileri sil</button>
    <button class="btn block" id="setSave">Kaydet ve kapat</button>`);
  document.querySelectorAll('[data-theme-set]').forEach(b => b.onclick = () => {
    setTheme(b.dataset.themeSet); document.querySelectorAll('[data-theme-set]').forEach(x => x.setAttribute('aria-pressed', x === b)); });
  document.querySelectorAll('[data-rule]').forEach(b => b.onclick = async () => { S.rules.splice(+b.dataset.rule, 1); await saveKV('rules', S.rules); openSettings(); render(); });
  document.querySelectorAll('[data-st]').forEach(b => b.onclick = async () => { await askDeleteStatement(b.dataset.st); openSettings(); });
  const fd = $('#fixDup'); if (fd) fd.onclick = async () => { await fixDuplicates(); openSettings(); };
  $('#setSave').onclick = async () => {
    document.querySelectorAll('[data-pname]').forEach(i => { const p = S.profiles.find(x => x.id === i.dataset.pname); if (i.value.trim()) p.name = i.value.trim(); });
    document.querySelectorAll('[data-card]').forEach(i => { const v = i.value.trim(); if (v) S.cards[i.dataset.card] = v; else delete S.cards[i.dataset.card]; });
    // kart sahibi değiştiyse o kartın ekstrelerini taşı
    for (const sel of document.querySelectorAll('[data-cprof]')) {
      const c = sel.dataset.cprof;
      if (S.cardProfile[c] !== sel.value) {
        S.cardProfile[c] = sel.value;
        for (const s of S.statements.filter(s => s.tx.some(t => t.card === c))) { s.profile = sel.value; await Store.put('statements', s); }
      }
    }
    await saveKV('profiles', S.profiles); await saveKV('cards', S.cards); await saveKV('cardProfile', S.cardProfile);
    closeSheet(true); render();
  };
  const backup = () => JSON.stringify({ app: 'ekstrem', v: 2, at: new Date().toISOString(), statements: S.statements, incomes: S.incomes,
    rules: S.rules, cards: S.cards, cardProfile: S.cardProfile, profiles: S.profiles, plan: S.plan, theme: S.theme });
  $('#bkDl').onclick = () => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([backup()], { type: 'application/json' }));
    a.download = 'ekstrem-yedek-' + new Date().toISOString().slice(0, 10) + '.json'; document.body.appendChild(a); a.click(); a.remove();
    toast('İndirme başlamadıysa "panoya kopyala"yı kullan', 4000);
  };
  $('#bkCp').onclick = async () => {
    try { await navigator.clipboard.writeText(backup()); toast('Yedek panoya kopyalandı; not uygulamasına yapıştırıp sakla', 4000); }
    catch (e) { openSheet(`<h3>Yedek metni</h3><p class="sub">Tümünü seçip kopyala.</p><textarea class="inp" readonly onfocus="this.select()">${esc(backup())}</textarea><button class="btn block" onclick="closeSheet()">Kapat</button>`); }
  };
  $('#bkIn').onclick = () => {
    openSheet(`<h3>Yedekten geri yükle</h3><p class="sub">Yedek dosyasını seç ya da yedek metnini yapıştır. Mevcut verilerin yerine geçer.</p>
    <button class="btn ghost block" onclick="document.getElementById('fileJson').click()">Yedek dosyası seç</button>
    <textarea class="inp" id="bkText" placeholder="veya yedek metnini buraya yapıştır" style="margin-top:10px"></textarea>
    <button class="btn block" id="bkGo">Geri yükle</button>`);
    $('#bkGo').onclick = () => restore($('#bkText').value);
  };
  $('#wipe').onclick = async () => {
    if (!confirm('Tüm ekstreler, gelirler, kişiler ve kurallar silinecek. Emin misin?')) return;
    await Promise.all(['statements', 'incomes', 'kv'].map(s => Store.clear(s)));
    await load(); closeSheet(true); render();
  };
}
async function restore(text) {
  try {
    const d = JSON.parse(text);
    if (d.app !== 'ekstrem') throw new Error('Bu bir Ekstrem yedeği değil.');
    await Promise.all(['statements', 'incomes', 'kv'].map(s => Store.clear(s)));
    for (const s of d.statements || []) await Store.put('statements', s);
    for (const i of d.incomes || []) await Store.put('incomes', i);
    for (const k of ['rules', 'cards', 'cardProfile', 'profiles', 'plan', 'theme']) if (d[k]) await saveKV(k, d[k]);
    await load(); closeSheet(true); render(); toast('Yedek geri yüklendi');
  } catch (e) { toast('Geri yükleme başarısız: ' + e.message, 4000); }
}

/* ---------- Başlat ---------- */
$('#btnImport').onclick = () => $('#file').click();
$('#btnSettings').onclick = openSettings;
$('#btnTheme').onclick = () => setTheme(resolvedTheme() === 'dark' ? 'light' : 'dark');
$('#file').onchange = e => { const f = [...e.target.files]; e.target.value = ''; importFiles(f); };
$('#fileJson').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (f) restore(await f.text()); };
$('#months').onclick = e => { const b = e.target.closest('[data-m]'); if (b) { S.month = b.dataset.m; render(); } };
$('#people').onclick = e => { const b = e.target.closest('[data-p]'); if (b) setProfile(b.dataset.p); };
$('#tabs').onclick = e => { const b = e.target.closest('[data-v]'); if (b) go(b.dataset.v); };
initHistory();
load().then(render).catch(e => { $('#main').innerHTML = `<div class="empty"><p>Başlatılamadı: ${esc(e.message)}</p></div>`; });
