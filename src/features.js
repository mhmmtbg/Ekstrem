/* =====================================================================
   Ek sayfalar: bütçeler, abonelikler, faiz ve ücretler, sınıflandırma,
   hedefler, kişiler, yıl özeti; navigasyon paneli; Android kolaylıkları
   ===================================================================== */
const EXTRA_VIEWS = { butce: viewButce, abonelik: viewAbonelik, ucret: viewUcret, sinif: viewSinif, hedef: viewHedef, kisi: viewKisi, yil: viewYil };
const PAGE_TITLES = { ozet: 'Özet', islem: 'İşlemler', trend: 'Aylar', plan: 'Plan', gelir: 'Ekle', butce: 'Bütçeler', abonelik: 'Abonelikler',
  ucret: 'Faiz ve ücretler', sinif: 'Kategorisizler', hedef: 'Hedefler', kisi: 'Kişiler', yil: 'Yıl özeti' };
const scopeKey = () => isHane() ? 'hane' : S.profile;
const profStatements = () => S.statements.filter(inProfile);
const pageHead = (t, sub) => `<div class="pagehead"><h2>${t}</h2>${sub ? `<p>${sub}</p>` : ''}</div>`;
const pct = (a, b) => b ? nf0.format(a / b * 100) : '0';
const sum = (l, f = x => x) => l.reduce((a, x) => a + f(x), 0);
// Ay ay basit sütun grafiği (Aylar sayfasıyla aynı görünüm)
function miniBars(data, opts = {}) {
  const max = Math.max(1, ...data.map(d => d.v));
  return `<div class="tbars ${data.length > 6 ? 'compact' : ''}" style="height:${opts.h || 150}px">${data.map(d => `<div class="tcol ${d.sel ? 'sel' : ''}" ${d.on ? `onclick="${d.on}"` : ''}>
    <div class="val">${d.v ? (d.v >= 1000 ? nf0.format(d.v / 1000) + 'k' : nf0.format(d.v)) : ''}</div>
    <div class="b" style="height:${Math.max(0, d.v / max * 72)}%;${d.col ? 'background:' + d.col : ''}"></div><div class="lbl">${d.l}</div></div>`).join('')}</div>`;
}

/* ---------- Navigasyon paneli ---------- */
function openMenu() {
  const nCls = uncatGroups().reduce((a, g) => a + g.n, 0);
  const overs = budgetStatus(S.month).filter(b => b.over).length;
  const item = (v, ic, t, s, cnt) => `<button class="navi" aria-current="${S.view === v ? 'page' : 'false'}" onclick="closeSheet(true);go('${v}')">
    <span class="ni" aria-hidden="true">${ic}</span><span><b>${t}</b><span class="s">${s}</span></span>${cnt ? `<span class="cnt">${cnt}</span>` : ''}</button>`;
  const act = (fn, ic, t, s) => `<button class="navi" onclick="closeSheet(true);${fn}"><span class="ni" aria-hidden="true">${ic}</span><span><b>${t}</b><span class="s">${s}</span></span></button>`;
  openSheet(`<div class="dh"><b>Ekstrem</b><button class="x" onclick="closeSheet()" aria-label="Menüyü kapat">×</button></div>
    <div class="grp">Harcamalar</div>
    ${item('ozet', '🧾', 'Özet', 'Ayın fişi ve harcama detayları')}
    ${item('islem', '🔎', 'İşlemler', 'Arama ve süzme')}
    ${item('trend', '📊', 'Aylar', 'Ay ay harcama ve gelir')}
    ${item('gelir', '➕', 'Ekle', 'Kart dışı harcama, gelir')}
    <div class="grp">Kontrol</div>
    ${item('butce', '🎯', 'Bütçeler', 'Kategori sınırları', overs ? `${overs} aşım` : '')}
    ${item('abonelik', '🔁', 'Abonelikler', 'Her ay tekrarlayan ödemeler')}
    ${item('ucret', '📈', 'Faiz ve ücretler', 'Bankaya ödenen faiz, vergi, aidat')}
    ${item('sinif', '🏷️', 'Kategorisizler', 'Diğer\'e düşenleri sınıflandır', nCls ? String(nCls) : '')}
    <div class="grp">Plan</div>
    ${item('plan', '🗓️', 'Plan', 'Nakit akışı ve bilanço')}
    ${item('hedef', '🏁', 'Hedefler', 'Birikim hedefleri')}
    ${act('openSimulator()', '🧮', 'Bunu alırsam?', 'Bir alışverişin plana etkisi')}
    <div class="grp">Analiz</div>
    ${item('kisi', '👥', 'Kişiler', 'Kim ne kadar harcıyor, trendler')}
    ${item('yil', '📅', 'Yıl özeti', 'Yılın toplamları')}
    <div class="grp">Uygulama</div>
    ${act('openSettings()', '⚙️', 'Ayarlar', 'Kartlar, kurallar, yedek, kilit, hatırlatıcı')}`, null, 'drawer');
}

/* ---------- Özet uyarı şeridi ---------- */
function ozetAlerts(k, sts) {
  const out = [];
  const rows = spendRows(sts);
  const fees = sum(rows.filter(r => isFeeRow(r.t)), r => r.t.tl);
  const bs = budgetStatus(k), over = bs.filter(b => b.over);
  if (over.length) out.push(['warn', '🎯', `${over.length} kategori bütçeyi aştı`, over.slice(0, 2).map(b => `${b.cat} +${nf0.format(b.spent - b.limit)} ₺`).join(', '), "go('butce')"]);
  else if (bs.length) out.push(['ok', '🎯', 'Bütçe içindesin', `${tl0(sum(bs, b => b.spent))} / ${tl0(sum(bs, b => b.limit))}`, "go('butce')"]);
  if (fees >= 1) out.push(['warn', '📈', `${tl0(fees)} faiz ve ücret`, 'Bu ay bankaya ödenen', "go('ucret')"]);
  const zam = detectSubs().filter(s => s.change && s.last === k);
  if (zam.length) out.push(['warn', '🔁', `${zam[0].name} zamlandı`, `${nf.format(zam[0].prev)} → ${nf.format(zam[0].amount)} ₺${zam.length > 1 ? ` (+${zam.length - 1} abonelik)` : ''}`, "go('abonelik')"]);
  const unc = rows.filter(r => r.t.type === 'expense' && catOf(r.t) === BKCats.OTHER[0]).length;
  if (unc) out.push(['', '🏷️', `${unc} işlem kategorisiz`, 'Dokun, tek tek sınıflandır', "go('sinif')"]);
  const today = new Date().toISOString().slice(0, 10), in7 = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const due = profStatements().filter(s => !s.manual && s.sonOdeme && s.sonOdeme >= today && s.sonOdeme <= in7);
  due.forEach(s => out.push(['', '⏰', `Son ödeme ${dLabel(s.sonOdeme)}`, `${s.bank}: ${s.borcTL || '-'} ₺`, "S.ptab.oz='ekstre';selectTab('oz','ekstre');document.getElementById('oz').scrollIntoView({behavior:'smooth'})"]));
  if (!out.length) return '';
  return `<div class="alerts" role="list">${out.map(([c, i, t, s, on]) => `<button class="alert ${c}" role="listitem" onclick="${on}"><span class="ai" aria-hidden="true">${i}</span><span style="min-width:0"><b>${esc(t)}</b><span class="s">${esc(s)}</span></span></button>`).join('')}</div>`;
}

/* ---------- Bütçeler ---------- */
const budgetsOf = () => (S.budgets[scopeKey()] = S.budgets[scopeKey()] || {});
function catSpendOf(k) { return k ? catTotals(stmtsOf(k)) : {}; }
function budgetStatus(k) {
  const b = budgetsOf(), sp = catSpendOf(k);
  const curMonth = k === nowMonth();
  const frac = curMonth ? Math.max(0.05, new Date().getDate() / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()) : 1;
  return Object.entries(b).filter(([, v]) => v > 0).map(([cat, limit]) => {
    const spent = Math.max(0, sp[cat] || 0);
    const proj = curMonth ? spent / frac : null;
    return { cat, limit, spent, ratio: spent / limit, over: spent > limit, proj, projOver: proj != null && proj > limit && spent <= limit };
  }).sort((a, b) => b.ratio - a.ratio);
}
function avgCatSpend(n = 3) {
  const ms = [...new Set(profStatements().map(s => s.month))].sort().filter(m => m < nowMonth() || stmtsOf(m).some(s => !s.manual)).slice(-n);
  const tot = {}; ms.forEach(m => Object.entries(catSpendOf(m)).forEach(([c, v]) => tot[c] = (tot[c] || 0) + v));
  const out = {}; Object.entries(tot).forEach(([c, v]) => { if (v > 0) out[c] = Math.ceil(v / (ms.length || 1) / 100) * 100; });
  return { avg: out, n: ms.length };
}
function viewButce() {
  const k = S.month, bs = budgetStatus(k), b = budgetsOf();
  const sp = catSpendOf(k);
  const limitT = sum(bs, x => x.limit), spentT = sum(bs, x => x.spent);
  const free = Object.entries(sp).filter(([c, v]) => !b[c] && v > 0).sort((a, c) => c[1] - a[1]);
  const { avg, n } = avgCatSpend();
  const bar = x => `<span class="bar"><i style="width:${Math.min(100, x.ratio * 100)}%;background:${x.over ? 'var(--mercan)' : x.ratio > .85 || x.projOver ? 'var(--c-gider)' : 'var(--firuze)'}"></i></span>`;
  const head = pageHead('Bütçeler', `${k ? mLabel(k) : ''} · ${esc(isHane() ? 'Hane' : profName(S.profile))}. Kategorilere aylık sınır koy; aşınca Özet'te uyarı çıkar.`);
  if (!bs.length) return head + `<section class="card"><h2>Henüz bütçe yok</h2>
    <p class="insight">Son ${n || 3} ayın ortalamasına göre bütçe önerilebilir; sonra tek tek düzeltirsin.</p>
    ${Object.keys(avg).length ? `<ul class="list-plain">${Object.entries(avg).filter(([c]) => !['Faiz & Ücret', 'Nakit Avans', BKCats.OTHER[0]].includes(c)).sort((a, c) => c[1] - a[1]).slice(0, 8).map(([c, v]) => `<li><span>${ico(c, ';width:30px;height:30px;font-size:15px;border-radius:9px;display:inline-grid;vertical-align:middle;margin-right:8px')}${esc(c)}</span><b>${tl0(v)}</b></li>`).join('')}</ul>
    <button class="btn block" onclick="suggestBudgets()">Bu önerilerle başla</button>` : '<p class="sub">Önce birkaç aylık ekstre yükle.</p>'}
    <button class="btn ghost block" onclick="editBudget()">Kendim gireyim</button></section>`;
  const overN = bs.filter(x => x.over).length;
  return head + `<section class="card"><h2>${k ? mLabel(k) : ''}<small>${overN ? `<span class="badge warn">${overN} aşım</span>` : '<span class="badge">bütçe içinde</span>'}</small></h2>
    <div class="stats"><div class="stat"><div class="l">Bütçe</div><div class="v">${tl0(limitT)}</div></div>
      <div class="stat"><div class="l">Harcanan</div><div class="v">${tl0(spentT)}</div></div>
      <div class="stat"><div class="l">${limitT >= spentT ? 'Kalan' : 'Aşım'}</div><div class="v ${limitT >= spentT ? 'pos' : 'neg'}">${tl0(Math.abs(limitT - spentT))}</div></div></div>
    <div class="bar" style="height:10px;margin-top:12px"><i style="width:${Math.min(100, spentT / (limitT || 1) * 100)}%;background:${spentT > limitT ? 'var(--mercan)' : 'var(--firuze)'}"></i></div>
    ${free.length ? `<p class="sub" style="margin:10px 0 0">Bütçesiz kategorilerde ${tl0(sum(free, f => f[1]))} harcama var.</p>` : ''}</section>
  ${tabPanel('bt', 'Kategoriler', [
    { k: 'b', label: `Bütçeli (${bs.length})`, html: `<ul class="cats">${bs.map(x => `<li onclick="editBudget('${esc(x.cat)}')">${ico(x.cat)}<span class="nm">${esc(x.cat)}</span>
      <span class="amt ${x.over ? 'neg' : ''}">${tl0(x.spent)} <span class="sub">/ ${tl0(x.limit)}</span></span>
      <span class="meta">${bar(x)}<span class="sub">%${pct(x.spent, x.limit)}</span></span>
      ${x.over ? `<span class="sub neg" style="grid-column:2/4">${tl0(x.spent - x.limit)} aştın</span>` : x.projOver ? `<span class="sub" style="grid-column:2/4;color:var(--c-gider)">Bu hızla ay sonunda ~${tl0(x.proj)} olur</span>` : ''}</li>`).join('')}</ul>
      <button class="btn ghost block" onclick="editBudget()">+ Kategori bütçesi ekle</button>` },
    free.length && { k: 'f', label: `Bütçesiz (${free.length})`, html: `<ul class="cats">${free.map(([c, v]) => `<li onclick="editBudget('${esc(c)}')">${ico(c)}<span class="nm">${esc(c)}</span><span class="amt">${tl0(v)}</span>
      <span class="meta"><span class="sub">${avg[c] ? `3 ay ort. ${tl0(avg[c])}` : ''} · dokun, bütçe koy</span></span></li>`).join('')}</ul>` },
  ])}
  ${budgetPlanCard(limitT)}`;
}
function budgetPlanCard(limitT) {
  if (!S.plan.items.length) return '';
  const calc = planCalc(), r0 = calc.rows.find(r => !r.real) || calc.rows[0];
  const kart = visibleItems().find(it => it.auto === 'kart'), nakit = visibleItems().find(it => it.auto === 'nakit');
  const target = Math.max(0, Math.round((limitT - (nakit ? nakit.amount : 0) - r0.pTak) / 100) * 100);
  return `<section class="card"><h2>Plan ile bağlantı</h2>
    <p class="insight">Bütçe toplamın <b>${tl0(limitT)}</b>. Plandaki kart harcaması tahmini ${kart ? `<b>${tl0(kart.amount)}</b>` : 'yok'}${nakit ? `, kart dışı tahmini <b>${tl0(nakit.amount)}</b>` : ''}.</p>
    <p class="sub">Taksitler planda ayrıca sayıldığı için (${mShort(r0.m)}: ${tl0(r0.pTak)}) bütçeden düşülür. Kart harcaması tahmini <b>${tl0(target)}</b> olur.</p>
    <button class="btn ghost block" onclick="budgetToPlan(${target})">Plandaki kart harcaması tahminini ${tl0(target)} yap</button></section>`;
}
window.budgetToPlan = async v => {
  let kart = visibleItems().find(it => it.auto === 'kart');
  if (!kart) { kart = { id: 'p' + Date.now(), kind: 'gider', name: 'Kart harcaması (tahmini)', amount: v, start: planStart(), months: 0, scope: scopeKey(), auto: 'kart' }; S.plan.items.push(kart); }
  else kart.amount = v;
  await savePlan(); render(); toast('Plan güncellendi');
};
window.suggestBudgets = async () => {
  const { avg } = avgCatSpend(); const b = budgetsOf();
  Object.entries(avg).forEach(([c, v]) => { if (!['Faiz & Ücret', 'Nakit Avans', BKCats.OTHER[0]].includes(c)) b[c] = v; });
  await saveKV('budgets', S.budgets); render(); toast('Bütçeler son ayların ortalamasıyla oluşturuldu');
};
window.editBudget = cat => {
  const b = budgetsOf(), { avg } = avgCatSpend();
  const list = CATNAMES.filter(c => c === cat || !b[c]);
  openSheet(`<h3>${cat && b[cat] ? 'Bütçeyi düzenle' : 'Kategori bütçesi'}</h3>
    <label class="f" for="bCat">Kategori</label><select class="inp" id="bCat">${list.map(c => `<option ${c === cat ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
    <label class="f" for="bAmt">Aylık sınır (₺)</label><input class="inp" id="bAmt" inputmode="decimal" value="${cat && b[cat] ? nf0.format(b[cat]) : ''}">
    <p class="sub" id="bHint"></p>
    <button class="btn block" id="bSave">Kaydet</button>
    ${cat && b[cat] ? '<button class="btn danger block" id="bDel">Bütçeyi kaldır</button>' : ''}`);
  const hint = () => { const c = $('#bCat').value; $('#bHint').textContent = avg[c] ? `Son aylarda ortalama ${tl0(avg[c])} harcadın.` : ''; if (!$('#bAmt').value && avg[c]) $('#bAmt').placeholder = nf0.format(avg[c]); };
  $('#bCat').onchange = hint; hint();
  $('#bSave').onclick = async () => {
    const c = $('#bCat').value, v = parseNum($('#bAmt').value || $('#bAmt').placeholder);
    if (!isFinite(v) || v <= 0) return toast('Geçerli bir tutar gir, örneğin 5.000');
    b[c] = Math.round(v); await saveKV('budgets', S.budgets); closeSheet(true); render(); toast(`${c}: ${tl0(v)} / ay`);
  };
  const d = $('#bDel'); if (d) d.onclick = async () => { delete b[cat]; await saveKV('budgets', S.budgets); closeSheet(true); render(); toast('Bütçe kaldırıldı'); };
};

/* ---------- Abonelikler ---------- */
const VOLATILE = ['Market', 'Akaryakıt', 'Restoran & Kafe', 'Online Alışveriş', 'Giyim', 'Ulaşım', 'Elektronik', 'Ev & Hırdavat', 'Nakit Avans', 'Faiz & Ücret'];
const subKey = d => BKCats.upper(merchantKey(d)).replace(/[0-9*#_.\/\\-]+/g, ' ').replace(/\b(TR|TRTR|ISTANBUL|ANKARA|IZMIR|COM|WWW|LTD|STI|AS)\b/g, ' ').replace(/\s+/g, ' ').trim().split(' ').slice(0, 2).join(' ');
let subCache = null;
function detectSubs() {
  const sig = S.statements.length + '|' + S.profile + '|' + S.subIgnore.length + '|' + S.rules.length + '|' + sum(S.statements, s => s.tx.length);
  if (subCache && subCache.sig === sig) return subCache.list;
  const rows = rowsOf(profStatements().filter(s => !s.manual)).filter(r => r.t.type === 'expense' && !r.t.taksitToplam && r.t.tl > 0);
  const latest = [...new Set(profStatements().filter(s => !s.manual).map(s => s.month))].sort().pop() || nowMonth();
  const g = {};
  for (const { t, st } of rows) {
    const key = subKey(t.desc); if (!key || key.length < 3) continue;
    const o = g[key] = g[key] || { key, name: merchantKey(t.desc), cat: catOf(t), by: {}, n: 0, src: srcLabel(t, st) };
    (o.by[st.month] = o.by[st.month] || []).push(amtTL(t, st)); o.n++;
  }
  const out = [];
  for (const o of Object.values(g)) {
    if (S.subIgnore.includes(o.key)) continue;
    const months = Object.keys(o.by).sort();
    const isSub = o.cat === 'Abonelik & Dijital';
    if (months.length < (isSub ? 2 : 3)) continue;
    if (o.n / months.length > 1.5) continue;
    const span = mDiff(months[0], months[months.length - 1]) + 1;
    if (months.length / span < 0.6) continue;
    const amts = months.map(m => sum(o.by[m]));
    const mx = Math.max(...amts), mn = Math.min(...amts);
    if (mn <= 0) continue;
    const steps = amts.slice(1).filter((v, i) => Math.abs(v - amts[i]) / amts[i] > 0.03).length;
    if (VOLATILE.includes(o.cat) && mx / mn > 1.05) continue;
    if (!isSub && (mx / mn > 1.3 || steps > Math.max(1, months.length / 3))) continue;
    const amount = amts[amts.length - 1], prev = amts.length > 1 ? amts[amts.length - 2] : amount;
    const change = Math.abs(amount - prev) >= 1 && Math.abs(amount - prev) / prev > 0.03 && amount / prev < 2 && prev / amount < 2 ? amount - prev : 0;
    out.push({ ...o, months, amts, amount, prev, change, first: months[0], last: months[months.length - 1], active: mDiff(months[months.length - 1], latest) <= 1 });
  }
  out.sort((a, b) => (b.active - a.active) || b.amount - a.amount);
  subCache = { sig, list: out };
  return out;
}
function viewAbonelik() {
  const list = detectSubs(), act = list.filter(s => s.active), old = list.filter(s => !s.active);
  const monthly = sum(act, s => s.amount), changed = act.filter(s => s.change > 0);
  const row = s => `<li onclick="openSub('${esc(s.key)}')" style="cursor:pointer"><span style="display:flex;gap:10px;align-items:center;min-width:0">${ico(s.cat, ';width:34px;height:34px;font-size:16px;border-radius:10px;flex:0 0 34px')}
    <span style="min-width:0"><b style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(s.name)}</b>
    <span class="sub">${s.months.length} ay · ${esc(s.src)}${s.change ? ` · <span class="${s.change > 0 ? 'neg' : 'pos'}">${s.change > 0 ? 'zam' : 'indirim'} ${sgn0(s.change)} ₺</span>` : ''}${!s.active ? ` · son ${mShort(s.last)}` : ''}</span></span></span>
    <span style="text-align:right;white-space:nowrap"><b>${tl(s.amount)}</b><br><span class="sub">yılda ${tl0(s.amount * 12)}</span></span></li>`;
  return pageHead('Abonelikler', 'Ekstrelerde her ay benzer tutarla tekrarlayan ödemeler. Yanlış yakalananları gizleyebilirsin.') +
    (list.length ? `<section class="card"><div class="stats"><div class="stat"><div class="l">Aylık</div><div class="v">${tl0(monthly)}</div></div>
      <div class="stat"><div class="l">Yıllık</div><div class="v">${tl0(monthly * 12)}</div></div>
      <div class="stat"><div class="l">Aktif</div><div class="v">${act.length}</div></div></div>
      ${changed.length ? `<p class="insight" style="margin-top:12px">Son ayda <b class="neg">${changed.length} abonelik zamlandı</b>: ${changed.map(s => `${esc(s.name)} ${nf.format(s.prev)} → ${nf.format(s.amount)} ₺`).join(', ')}.</p>` : ''}</section>
    ${tabPanel('sb', 'Liste', [
      { k: 'a', label: `Aktif (${act.length})`, html: act.length ? `<ul class="list-plain">${act.map(row).join('')}</ul>` : '<p class="sub">Aktif abonelik bulunamadı.</p>' },
      old.length && { k: 'o', label: `Durmuş olabilir (${old.length})`, html: `<p class="sub" style="margin:0 0 6px">Son iki ayın ekstrelerinde görünmeyenler.</p><ul class="list-plain">${old.map(row).join('')}</ul>` },
    ])}` : `<section class="card"><p class="insight">Henüz tekrarlayan ödeme bulunamadı. En az 2-3 aylık ekstre yüklendiğinde abonelikler burada görünür.</p></section>`) +
    (S.subIgnore.length ? `<button class="btn ghost block" onclick="S.subIgnore=[];saveKV('subIgnore',[]);render()">Gizlenen ${S.subIgnore.length} kaydı geri getir</button>` : '');
}
window.openSub = key => {
  const s = detectSubs().find(x => x.key === key); if (!s) return;
  const max = Math.max(...s.amts);
  openSheet(`<h3>${esc(s.name)}</h3><p class="sub">${esc(s.cat)} · ${esc(s.src)} · ${mShort(s.first)}'den beri ${s.months.length} ay</p>
    <div class="stats" style="margin:12px 0"><div class="stat"><div class="l">Son tutar</div><div class="v">${tl(s.amount)}</div></div>
      <div class="stat"><div class="l">Yıllık</div><div class="v">${tl0(s.amount * 12)}</div></div>
      <div class="stat"><div class="l">Toplam ödenen</div><div class="v">${tl0(sum(s.amts))}</div></div></div>
    ${miniBars(s.months.map((m, i) => ({ l: MSHORT[+m.slice(5) - 1], v: s.amts[i] })), { h: 120 })}
    <button class="btn ghost block" onclick="closeSheet(true);S.q='${esc(s.key).replace(/'/g, '')}';S.qScope='all';S.qType='spend';S.qCat=null;go('islem')">İşlemleri gör</button>
    <button class="btn danger block" onclick="hideSub('${esc(s.key)}')">Bu bir abonelik değil, gizle</button>`);
};
window.hideSub = async key => { S.subIgnore.push(key); await saveKV('subIgnore', S.subIgnore); closeSheet(true); render(); toast('Gizlendi'); };

/* ---------- Faiz ve ücretler ---------- */
const isFeeRow = t => t.type === 'fee' || (t.type === 'expense' && catOf(t) === 'Faiz & Ücret');
function feeKind(desc) {
  const d = BKCats.upper(desc);
  if (/BSMV|KKDF|VERGI/.test(d)) return 'Vergi (BSMV, KKDF)';
  if (/GECIKME/.test(d)) return 'Gecikme';
  if (/YILLIK|UYELIK|AIDAT|KART UCRET/.test(d)) return 'Kart ücreti';
  if (/FAIZ/.test(d)) return 'Faiz';
  return 'Diğer ücret';
}
function viewUcret() {
  const rows = rowsOf(profStatements().filter(s => !s.manual)).filter(r => isFeeRow(r.t));
  const months = monthKeys().filter(m => stmtsOf(m).some(s => !s.manual)).slice(-12);
  const byM = {}; rows.forEach(r => byM[r.st.month] = (byM[r.st.month] || 0) + r.t.tl);
  const last12 = rows.filter(r => months.includes(r.st.month));
  const tot12 = sum(last12, r => r.t.tl), cur = byM[S.month] || 0;
  const kinds = {}; last12.forEach(r => { const k = feeKind(r.t.desc); kinds[k] = (kinds[k] || 0) + r.t.tl; });
  const banks = {}; last12.forEach(r => banks[r.st.bank] = (banks[r.st.bank] || 0) + r.t.tl);
  const list = l => l.length ? `<ul class="list-plain">${l.sort((a, b) => b.t.date.localeCompare(a.t.date)).map(({ t, st }) => `<li><span style="min-width:0"><b>${esc(merchantKey(t.desc))}</b><br><span class="sub">${dTR(t.date)} · ${esc(bankShort(st.bank))} · ${esc(feeKind(t.desc))}</span></span><b>${tl(t.tl)}</b></li>`).join('')}</ul>` : '<p class="sub">Kayıt yok.</p>';
  const hasCardFee = kinds['Kart ücreti'] > 0, hasInt = (kinds['Faiz'] || 0) + (kinds['Gecikme'] || 0) > 0;
  return pageHead('Faiz ve ücretler', 'Ekstrelerdeki faiz, BSMV/KKDF, kart aidatı ve gecikme bedelleri.') +
    `<section class="card"><div class="stats"><div class="stat"><div class="l">${S.month ? mShort(S.month) : 'Bu ay'}</div><div class="v ${cur ? 'neg' : ''}">${tl0(cur)}</div></div>
      <div class="stat"><div class="l">Son ${months.length} ay</div><div class="v">${tl0(tot12)}</div></div>
      <div class="stat"><div class="l">Aylık ort.</div><div class="v">${tl0(tot12 / (months.length || 1))}</div></div></div>
      ${miniBars(months.map(m => ({ l: MSHORT[+m.slice(5) - 1], v: byM[m] || 0, sel: m === S.month, col: 'var(--mercan)', on: `S.month='${m}';render()` })), { h: 130 })}
      ${hasInt ? '<p class="sub" style="margin:8px 0 0">Faiz, dönem borcunun tamamı son ödeme gününe kadar ödenmediğinde işler. Asgari tutar yerine borcun tamamını ödemek faizi önler.</p>' : ''}
      ${hasCardFee ? '<p class="sub" style="margin:6px 0 0">Kart ücreti ödüyorsun; bankanla görüşerek düşürebilir ya da ücretsiz bir karta geçebilirsin.</p>' : ''}</section>
    ${tabPanel('uc', 'Ayrıntı', [
      { k: 'ay', label: S.month ? mShort(S.month) : 'Bu ay', html: list(rows.filter(r => r.st.month === S.month)) },
      { k: 'tur', label: 'Türe göre', html: `<ul class="list-plain">${Object.entries(kinds).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<li><span>${esc(k)}<br><span class="sub">%${pct(v, tot12)}</span></span><b>${tl(v)}</b></li>`).join('') || '<li class="sub">Kayıt yok</li>'}</ul>` },
      { k: 'banka', label: 'Bankaya göre', html: `<ul class="list-plain">${Object.entries(banks).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<li><span>${esc(k)}</span><b>${tl(v)}</b></li>`).join('') || '<li class="sub">Kayıt yok</li>'}</ul>` },
      { k: 'tum', label: `Tümü (${last12.length})`, html: list(last12) },
    ])}`;
}

/* ---------- Kategorisizler ---------- */
const ruleKw = desc => merchantKey(desc).split(/\s+/).slice(0, 2).join(' ');
function uncatGroups() {
  const g = {};
  for (const { t, st } of rowsOf(profStatements())) {
    if (t.type !== 'expense' || t.catManual || catOf(t) !== BKCats.OTHER[0]) continue;
    const kw = ruleKw(t.desc); const key = BKCats.upper(kw);
    if (!key || S.clsSkip.includes(key)) continue;
    const o = g[key] = g[key] || { key, kw, n: 0, v: 0, ex: [] };
    o.n++; o.v += amtTL(t, st); if (o.ex.length < 3) o.ex.push({ t, st });
  }
  return Object.values(g).sort((a, b) => b.v - a.v);
}
const QUICK = ['Market', 'Restoran & Kafe', 'Online Alışveriş', 'Faturalar', 'Ulaşım', 'Giyim', 'Sağlık', 'Ev & Hırdavat', 'Eğlence & Kültür'];
function viewSinif() {
  const gs = uncatGroups(), n = sum(gs, g => g.n), v = sum(gs, g => g.v);
  const card = g => `<div class="clsg" data-g="${esc(g.key)}"><div class="row"><span style="min-width:0"><b>${esc(g.kw)}</b><br><span class="sub">${g.n} işlem · ${tl(g.v)} · ${g.ex.map(x => dLabel(x.t.date)).join(', ')}</span></span></div>
    <div class="sub" style="margin:2px 0 6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(g.ex[0].t.desc)}</div>
    <div class="qchips">${QUICK.map(c => `<button class="chip" onclick="classify('${esc(g.key)}','${esc(c)}')"><span aria-hidden="true">${CATICON[c]}</span>${esc(c)}</button>`).join('')}
      <button class="chip" onclick="classifyMore('${esc(g.key)}')">Diğer…</button><button class="chip skip" onclick="skipCls('${esc(g.key)}')">Atla</button></div></div>`;
  return pageHead('Kategorisizler', 'Diğer\'e düşen işyerleri. Seçtiğin kategori kural olarak kaydedilir; o işyerinin geçmiş ve gelecek tüm işlemleri bu kategoriye geçer.') +
    (gs.length ? `<section class="card"><div class="stats"><div class="stat"><div class="l">İşyeri</div><div class="v">${gs.length}</div></div>
      <div class="stat"><div class="l">İşlem</div><div class="v">${n}</div></div><div class="stat"><div class="l">Tutar</div><div class="v">${tl0(v)}</div></div></div></section>
      <section class="card tpanel"><h2>Sınıflandır<small>en büyük tutar üstte</small></h2>${scrollList(gs.map(card).join(''))}</section>`
      : `<section class="card"><p class="insight">Kategorisiz işlem kalmadı. 🎉</p></section>`) +
    (S.clsSkip.length ? `<button class="btn ghost block" onclick="S.clsSkip=[];saveKV('clsSkip',[]);render()">Atlanan ${S.clsSkip.length} işyerini geri getir</button>` : '');
}
window.classify = async (key, cat) => {
  const g = uncatGroups().find(x => x.key === key); if (!g) return;
  S.rules = S.rules.filter(r => BKCats.upper(r.kw) !== key);
  S.rules.unshift({ kw: g.kw, cat }); await saveKV('rules', S.rules);
  subCache = null; render(); toast(`${g.kw} → ${cat} (${g.n} işlem)`);
};
window.classifyMore = key => {
  openSheet(`<h3>Kategori seç</h3><div class="catgrid">${CATNAMES.filter(c => c !== BKCats.OTHER[0]).map(c => `<button onclick="closeSheet(true);classify('${esc(key)}','${esc(c)}')"><span class="e" aria-hidden="true">${CATICON[c]}</span>${esc(c)}</button>`).join('')}</div>`);
};
window.skipCls = async key => { S.clsSkip.push(key); await saveKV('clsSkip', S.clsSkip); render(); };

/* ---------- Bunu alırsam? ---------- */
window.openSimulator = () => {
  const months = planMonths().filter(m => m >= nowMonth());
  const opts = (months.length ? months : [nowMonth()]).map(m => `<option value="${m}">${mLabel(m)}</option>`).join('');
  openSheet(`<h3>Bunu alırsam?</h3><p class="sub">Bir alışverişi peşin ya da taksitle plana ekleyince ayların nasıl değişeceğini gösterir. Plan değişmez; istersen sonunda eklersin.</p>
    <label class="f" for="smName">Ne alacaksın?</label><input class="inp" id="smName" placeholder="Örn. buzdolabı" value="Yeni alışveriş">
    <div class="row" style="gap:10px;align-items:flex-end">
      <div style="flex:1.3"><label class="f" for="smAmt">Toplam tutar (₺)</label><input class="inp" id="smAmt" inputmode="decimal" placeholder="45.000"></div>
      <div style="flex:1"><label class="f" for="smN">Taksit</label><select class="inp" id="smN">${[1, 2, 3, 4, 6, 9, 12, 18, 24].map(n => `<option value="${n}" ${n === 6 ? 'selected' : ''}>${n === 1 ? 'Peşin' : n + ' taksit'}</option>`).join('')}</select></div></div>
    <label class="f" for="smStart">İlk ödeme ayı</label><select class="inp" id="smStart">${opts}</select>
    ${isHane() ? `<label class="f" for="smScope">Kime ait</label><select class="inp" id="smScope">${[...S.profiles.map(p => [p.id, p.name]), ['hane', 'Ortak (hane)']].map(([v, l]) => `<option value="${v}" ${v === 'hane' ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>` : ''}
    <div id="smOut" style="margin-top:14px"></div>
    <button class="btn block" id="smAdd" disabled>Plana ekle</button>`);
  const run = () => {
    const amt = parseNum($('#smAmt').value), n = +$('#smN').value, start = $('#smStart').value;
    if (!isFinite(amt) || amt <= 0) { $('#smOut').innerHTML = '<p class="sub">Tutarı girince sonuç burada görünür.</p>'; $('#smAdd').disabled = true; return; }
    const it = { id: '__sim', kind: 'gider', name: $('#smName').value.trim() || 'Alışveriş', amount: Math.round(amt / n * 100) / 100, start, months: n, scope: isHane() ? $('#smScope').value : S.profile };
    const a = planCalc(), b = planCalc(null, [it]);
    const minA = a.rows.reduce((m, r) => r.bal < m.bal ? r : m, a.rows[0]), minB = b.rows.reduce((m, r) => r.bal < m.bal ? r : m, b.rows[0]);
    const negB = b.rows.filter(r => r.bal < 0), negA = a.rows.filter(r => r.bal < 0);
    const last = b.rows.length - 1, inPlan = b.rows.filter(r => itemActive(it, r.m)).length;
    const verdict = negB.length > negA.length ? `<span class="badge warn">Zorlar</span> ${negB.length} ayda bilanço eksiye düşüyor; en sıkışık ay ${MONTHS[+minB.m.slice(5) - 1]} (${sgn0(minB.bal)} ₺).`
      : minB.bal < minA.bal * 0.5 && minB.bal > 0 ? `<span class="badge warn">Sıkıştırır</span> Artıda kalıyorsun ama en düşük bakiye ${tl0(minB.bal)} olur (şu an ${tl0(minA.bal)}).`
      : `<span class="badge">Karşılanır</span> Plan boyunca artıda kalıyorsun; en düşük bakiye ${tl0(minB.bal)}.`;
    $('#smOut').innerHTML = `<p class="insight">${verdict}</p>
      <p class="sub">${n === 1 ? 'Peşin' : `Ayda ${tl(it.amount)}, ${n} ay`}${inPlan < n ? ` · plan döneminde ${inPlan} taksit görünüyor` : ''}. Dönem sonu ${sgn0(a.rows[last].bal)} → <b>${sgn0(b.rows[last].bal)} ₺</b>.</p>
      <table class="cmptab"><thead><tr><th>Ay</th><th>Şu an</th><th>Alırsan</th><th>Fark</th></tr></thead><tbody>
      ${b.rows.map((r, i) => `<tr><th>${mShort(r.m)}</th><td class="${a.rows[i].bal < 0 ? 'neg' : ''}">${sgn0(a.rows[i].bal)}</td><td class="${r.bal < 0 ? 'neg' : ''}">${sgn0(r.bal)}</td><td>${sgn0(r.bal - a.rows[i].bal)}</td></tr>`).join('')}</tbody></table>`;
    $('#smAdd').disabled = false;
    $('#smAdd').onclick = async () => { S.plan.items.push({ ...it, id: 'p' + Date.now(), name: n > 1 ? `${it.name} (${n} taksit)` : it.name }); await savePlan(); closeSheet(true); render(); toast(`${it.name} plana eklendi`); };
  };
  ['smAmt', 'smN', 'smStart', 'smName', 'smScope'].forEach(id => { const el = $('#' + id); if (el) el.oninput = el.onchange = run; });
  run();
};

/* ---------- Hedefler ---------- */
const goals = () => (S.plan.goals = S.plan.goals || []);
const visibleGoals = () => goals().filter(g => isHane() || g.scope === S.profile);
function goalInfo(g, calc) {
  const now = nowMonth(), left = Math.max(1, mDiff(now, g.due) + 1);
  const need = Math.max(0, g.target - g.saved), perMonth = need / left;
  const item = S.plan.items.find(it => it.id === g.itemId);
  const rows = calc.rows.filter(r => !r.real && r.m >= now && r.m <= g.due);
  const surplus = rows.length ? sum(rows, r => r.gelirT - r.takT - r.giderT) / rows.length : null;
  const minBal = rows.length ? Math.min(...rows.map(r => r.bal)) : null;
  let st, txt;
  if (g.saved >= g.target) { st = 'ok'; txt = 'Hedefe ulaştın.'; }
  else if (mDiff(now, g.due) < 0) { st = 'warn'; txt = 'Süre doldu.'; }
  else if (item) { st = minBal != null && minBal < 0 ? 'warn' : 'ok'; txt = `Planda ayda ${tl0(item.amount)} ayrılıyor.${minBal != null && minBal < 0 ? ' Ama plan bazı aylarda eksiye düşüyor.' : ''}`; }
  else if (surplus == null) { st = ''; txt = `Ayda ${tl0(perMonth)} ayırman gerekiyor. Plan dönemi hedef tarihine yetişmiyor.`; }
  else {
    // Plana eklenmemiş tüm hedefler aynı artıyı paylaşır
    const open = visibleGoals().filter(x => x.saved < x.target && !S.plan.items.some(it => it.id === x.itemId) && mDiff(now, x.due) >= 0);
    const all = sum(open, x => Math.max(0, x.target - x.saved) / Math.max(1, mDiff(now, x.due) + 1));
    const both = open.length > 1 ? ` (tüm hedeflerin için ${tl0(all)})` : '';
    if (surplus >= all) { st = 'ok'; txt = `Planına göre ayda ortalama ${tl0(surplus)} artıyor; bu hedef için ${tl0(perMonth)}${both} ayırırsan yetişir.`; }
    else { st = 'warn'; txt = surplus > 0 ? `Bu hedef için ayda ${tl0(perMonth)}${both} gerekiyor ama planda ortalama ${tl0(surplus)} artıyor.` : `Ayda ${tl0(perMonth)} gerekiyor; plan şu an artı vermiyor.`; }
  }
  return { left, need, perMonth, item, st, txt, ratio: Math.min(1, g.saved / g.target) };
}
function goalCard(g, calc, compact) {
  const i = goalInfo(g, calc);
  return `<div class="goal" onclick="openGoal('${g.id}')"><div class="row"><b>${esc(g.name)}${isHane() && g.scope ? `<span class="pill">${esc(scopeLabel(g.scope))}</span>` : ''}</b>
      <span class="badge ${i.st === 'warn' ? 'warn' : ''}">${i.st === 'ok' ? (g.saved >= g.target ? 'Tamam' : 'Yetişir') : i.st === 'warn' ? 'Zor' : `${i.left} ay`}</span></div>
    <div class="bar" style="height:9px;margin:8px 0 6px"><i style="width:${i.ratio * 100}%;background:var(--firuze)"></i></div>
    <div class="sub">${tl0(g.saved)} / ${tl0(g.target)} · ${mLabel(g.due)}${compact ? '' : ` · ${i.left} ay kaldı`}</div>
    ${compact ? '' : `<p class="sub" style="margin:6px 0 0;color:var(--ink)">${i.txt}</p>`}</div>`;
}
function goalsMini(calc) {
  const gs = visibleGoals();
  return (gs.length ? gs.map(g => goalCard(g, calc, true)).join('') : '<p class="sub">Henüz hedef yok. Tatil, araba, acil durum fonu gibi bir birikim hedefi ekleyebilirsin.</p>') +
    `<div class="row" style="gap:8px;margin-top:10px"><button class="btn ghost" style="flex:1" onclick="editGoal()">+ Hedef</button><button class="btn ghost" style="flex:1" onclick="go('hedef')">Hedefler sayfası</button></div>`;
}
function viewHedef() {
  const calc = planCalc(), gs = visibleGoals();
  const totT = sum(gs, g => g.target), totS = sum(gs, g => g.saved);
  return pageHead('Hedefler', 'Birikim hedeflerin ve plana göre yetişip yetişmeyeceği.') +
    (gs.length ? `<section class="card"><div class="stats"><div class="stat"><div class="l">Hedef</div><div class="v">${tl0(totT)}</div></div>
      <div class="stat"><div class="l">Biriken</div><div class="v pos">${tl0(totS)}</div></div><div class="stat"><div class="l">Kalan</div><div class="v">${tl0(Math.max(0, totT - totS))}</div></div></div></section>
      <section class="card tpanel"><h2>Hedeflerin</h2>${scrollList(gs.map(g => goalCard(g, calc)).join(''))}</section>` :
      `<section class="card"><p class="insight">Bir hedef ekle: ne kadar, ne zamana kadar. Uygulama plana bakıp yetişip yetişmeyeceğini söyler ve istersen plana aylık birikim kalemi ekler.</p></section>`) +
    `<button class="btn block" onclick="editGoal()">+ Yeni hedef</button>`;
}
window.openGoal = id => {
  const g = goals().find(x => x.id === id); if (!g) return;
  const i = goalInfo(g, planCalc());
  openSheet(`<h3>${esc(g.name)}</h3><p class="sub">${tl0(g.saved)} / ${tl0(g.target)} · hedef ${mLabel(g.due)}</p>
    <div class="bar" style="height:10px;margin:10px 0"><i style="width:${i.ratio * 100}%;background:var(--firuze)"></i></div>
    <p class="insight">${i.txt}</p>
    <label class="f" for="gAdd">Birikime ekle (₺)</label><div class="row" style="gap:8px"><input class="inp" id="gAdd" inputmode="decimal" placeholder="${nf0.format(Math.round(i.perMonth))}"><button class="btn" id="gAddGo">Ekle</button></div>
    ${!i.item && g.saved < g.target ? `<button class="btn ghost block" id="gPlan">Plana ayda ${tl0(i.perMonth)} birikim kalemi ekle</button>` : ''}
    ${i.item ? `<button class="btn ghost block" id="gUnplan">Plandaki birikim kalemini kaldır</button>` : ''}
    <button class="btn ghost block" onclick="closeSheet(true);editGoal('${g.id}')">Düzenle</button>
    <button class="btn danger block" id="gDel">Hedefi sil</button>`);
  $('#gAddGo').onclick = async () => { const v = parseNum($('#gAdd').value); if (!isFinite(v) || !v) return toast('Tutar gir'); g.saved = Math.round((g.saved + v) * 100) / 100; await savePlan(); closeSheet(true); render(); toast(g.saved >= g.target ? 'Hedefe ulaştın!' : `Biriken: ${tl0(g.saved)}`); };
  const gp = $('#gPlan'); if (gp) gp.onclick = async () => {
    const start = nowMonth() > planStart() ? nowMonth() : planStart();
    const it = { id: 'p' + Date.now(), kind: 'gider', name: 'Birikim: ' + g.name, amount: Math.ceil(i.perMonth / 100) * 100, start, months: Math.max(1, mDiff(start, g.due) + 1), scope: g.scope || scopeKey(), goal: g.id };
    S.plan.items.push(it); g.itemId = it.id; await savePlan(); closeSheet(true); render(); toast('Birikim kalemi plana eklendi');
  };
  const gu = $('#gUnplan'); if (gu) gu.onclick = async () => { S.plan.items = S.plan.items.filter(x => x.id !== g.itemId); delete g.itemId; await savePlan(); closeSheet(true); render(); };
  $('#gDel').onclick = async () => { S.plan.goals = goals().filter(x => x !== g); if (g.itemId) S.plan.items = S.plan.items.filter(x => x.id !== g.itemId); await savePlan(); closeSheet(true); render(); toast('Hedef silindi'); };
};
window.editGoal = id => {
  const ex = id ? goals().find(x => x.id === id) : null;
  const g = ex || { name: '', target: 0, saved: 0, due: addM(nowMonth(), 6), scope: scopeKey() };
  const mo = Array.from({ length: 36 }, (_, i) => addM(nowMonth(), i + 1));
  openSheet(`<h3>${ex ? 'Hedefi düzenle' : 'Yeni hedef'}</h3>
    <label class="f" for="gN">Ad</label><input class="inp" id="gN" value="${esc(g.name)}" placeholder="Örn. yaz tatili, acil durum fonu">
    <div class="row" style="gap:10px;align-items:flex-end"><div style="flex:1"><label class="f" for="gT">Hedef tutar (₺)</label><input class="inp" id="gT" inputmode="decimal" value="${g.target ? nf0.format(g.target) : ''}"></div>
      <div style="flex:1"><label class="f" for="gS">Şu an biriken (₺)</label><input class="inp" id="gS" inputmode="decimal" value="${g.saved ? nf0.format(g.saved) : ''}" placeholder="0"></div></div>
    <label class="f" for="gD">Ne zamana kadar</label><select class="inp" id="gD">${mo.map(m => `<option value="${m}" ${m === g.due ? 'selected' : ''}>${mLabel(m)}</option>`).join('')}</select>
    ${isHane() ? `<label class="f" for="gSc">Kimin</label><select class="inp" id="gSc">${[...S.profiles.map(p => [p.id, p.name]), ['hane', 'Ortak (hane)']].map(([v, l]) => `<option value="${v}" ${v === g.scope ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>` : ''}
    <button class="btn block" id="gSave">Kaydet</button>`);
  $('#gSave').onclick = async () => {
    const name = $('#gN').value.trim(), target = parseNum($('#gT').value), saved = parseNum($('#gS').value || '0');
    if (!name) return toast('Hedefe bir ad ver');
    if (!isFinite(target) || target <= 0) return toast('Hedef tutarı gir');
    Object.assign(g, { name, target, saved: isFinite(saved) ? saved : 0, due: $('#gD').value, scope: isHane() ? $('#gSc').value : S.profile });
    if (!ex) goals().push({ id: 'g' + Date.now(), ...g });
    await savePlan(); closeSheet(true); render(); toast('Hedef kaydedildi');
  };
};

/* ---------- Kişiler (hane trendleri) ---------- */
function viewKisi() {
  const all = S.statements, profs = S.profiles;
  const months = [...new Set([...all.map(s => s.month), ...S.incomes.map(i => i.month)])].sort().slice(-12);
  if (!months.length) return pageHead('Kişiler') + viewEmpty();
  const sp = (m, p) => sum(spendRows(all.filter(s => s.month === m && s.profile === p)), r => amtTL(r.t, r.st));
  const inc = (m, p) => sum(S.incomes.filter(i => i.month === m && i.profile === p), i => i.amount);
  const data = months.map(m => ({ m, v: profs.map(p => sp(m, p.id)), i: profs.map(p => inc(m, p.id)) }));
  const max = Math.max(1, ...data.map(d => sum(d.v)));
  const last3 = data.slice(-3), t3 = profs.map((p, j) => sum(last3, d => d.v[j])), tot3 = sum(t3);
  const cats = {}; profs.forEach(p => { const sts = all.filter(s => s.profile === p.id && last3.some(d => d.m === s.month)); Object.entries(catTotals(sts)).forEach(([c, v]) => { cats[c] = cats[c] || profs.map(() => 0); cats[c][profs.indexOf(p)] += v; }); });
  const catList = Object.entries(cats).sort((a, b) => sum(b[1]) - sum(a[1]));
  const trendTxt = data.length >= 2 ? profs.map((p, j) => { const a = data[data.length - 2].v[j], b = data[data.length - 1].v[j]; return a ? `${esc(p.name)} ${b > a ? '▲' : '▼'} %${nf0.format(Math.abs(b - a) / a * 100)}` : ''; }).filter(Boolean).join(' · ') : '';
  return pageHead('Kişiler', 'Hanede kimin ne kadar harcadığı ve zaman içindeki seyri.') +
    `<section class="card"><h2>Son 3 ay<small>${mShort(last3[0].m)} – ${mShort(last3[last3.length - 1].m)}</small></h2>
      <div class="stackbar">${profs.map((p, j) => `<i style="width:${t3[j] / (tot3 || 1) * 100}%;background:${PCOL[j % 4]}"></i>`).join('')}</div>
      <ul class="list-plain" style="margin-top:6px">${profs.map((p, j) => `<li><span><i class="dot" style="background:${PCOL[j % 4]};margin-right:8px"></i>${esc(p.name)}<br><span class="sub">ayda ort. ${tl0(t3[j] / last3.length)}</span></span><b>%${pct(t3[j], tot3)}</b></li>`).join('')}</ul>
      ${trendTxt ? `<p class="sub" style="margin:8px 0 0">Son ay, bir önceki aya göre: ${trendTxt}</p>` : ''}</section>
    ${tabPanel('ks', 'Trendler', [
      { k: 'ay', label: 'Ay ay', html: `<div class="tbars ${data.length > 6 ? 'compact' : ''}" style="height:170px">${data.map(d => `<div class="tcol"><div class="val">${nf0.format(sum(d.v) / 1000)}k</div>
          <div class="b" style="display:flex;flex-direction:column-reverse;background:none;height:${sum(d.v) / max * 72}%;border-radius:7px 7px 2px 2px;overflow:hidden">${d.v.map((v, j) => `<i style="display:block;height:${v / (sum(d.v) || 1) * 100}%;background:${PCOL[j % 4]}"></i>`).join('')}</div>
          <div class="lbl">${MSHORT[+d.m.slice(5) - 1]}</div></div>`).join('')}</div>
        <div class="legend">${profs.map((p, j) => `<span><i style="background:${PCOL[j % 4]}"></i>${esc(p.name)}</span>`).join('')}</div>
        <table class="t" style="margin-top:10px"><thead><tr><th>Ay</th>${profs.map(p => `<th>${esc(p.name)}</th>`).join('')}<th>Pay</th></tr></thead><tbody>
        ${data.slice().reverse().map(d => `<tr><td>${mShort(d.m)}</td>${d.v.map(v => `<td>${tl0(v)}</td>`).join('')}<td>%${pct(d.v[0], sum(d.v))} / %${pct(d.v[1] || 0, sum(d.v))}</td></tr>`).join('')}</tbody></table>` },
      { k: 'kat', label: 'Kategoriler', html: `<p class="sub" style="margin:0 0 8px">Son 3 ay toplamı, kişilere göre.</p><ul class="cats plainbars">${catList.map(([c, vs]) => `<li><span class="nm">${CATICON[c] || ''} ${esc(c)}</span><span class="amt">${tl0(sum(vs))}</span>
          <span class="meta"><span class="stackbar" style="flex:1;height:8px">${vs.map((v, j) => `<i style="width:${v / (sum(vs) || 1) * 100}%;background:${PCOL[j % 4]}"></i>`).join('')}</span><span class="sub">${vs.map(v => '%' + pct(v, sum(vs))).join(' / ')}</span></span></li>`).join('')}</ul>` },
      { k: 'gelir', label: 'Gelir ve kalan', html: `<table class="t"><thead><tr><th>Ay</th>${profs.map(p => `<th>${esc(p.name)}</th>`).join('')}</tr></thead><tbody>
        ${data.slice().reverse().map(d => `<tr><td>${mShort(d.m)}</td>${profs.map((p, j) => `<td>${d.i[j] ? `<span class="${d.i[j] - d.v[j] >= 0 ? 'pos' : 'neg'}">${sgn0(d.i[j] - d.v[j])}</span><br><span class="sub">gelir ${tl0(d.i[j])}</span>` : `<span class="sub">gelir yok</span>`}</td>`).join('')}</tr>`).join('')}</tbody></table>
        <p class="sub" style="margin:8px 0 0">Kalan = o kişinin geliri − harcaması.</p>` },
    ])}`;
}

/* ---------- Yıl özeti ---------- */
function yearData(y) {
  const months = Array.from({ length: 12 }, (_, i) => `${y}-${String(i + 1).padStart(2, '0')}`);
  const sts = profStatements().filter(s => s.month.startsWith(y));
  const rows = spendRows(sts);
  const bm = months.map(m => ({ m, v: sum(rows.filter(r => r.st.month === m), r => amtTL(r.t, r.st)), i: incomeOf(m) }));
  const has = bm.filter(d => d.v > 0);
  const spend = sum(bm, d => d.v), inc = sum(bm, d => d.i);
  const cats = Object.entries(catTotals(sts)).sort((a, b) => b[1] - a[1]);
  const merch = {}; rows.forEach(({ t, st }) => { const k = merchantKey(t.desc); merch[k] = merch[k] || { v: 0, n: 0, c: catOf(t) }; merch[k].v += amtTL(t, st); merch[k].n++; });
  const wd = [0, 0, 0, 0, 0, 0, 0]; rows.forEach(({ t, st }) => { wd[(new Date(t.date + 'T12:00:00').getDay() + 6) % 7] += amtTL(t, st); });
  return { y, bm, has, spend, inc, cats, merch: Object.entries(merch).sort((a, b) => b[1].v - a[1].v).slice(0, 10),
    fees: sum(rows.filter(r => isFeeRow(r.t)), r => r.t.tl), tak: rows.filter(r => r.t.taksitToplam && r.t.taksitNo === 1).length,
    max: has.reduce((a, d) => d.v > a.v ? d : a, has[0] || { v: 0 }), min: has.reduce((a, d) => d.v < a.v ? d : a, has[0] || { v: 0 }), wd, n: rows.length };
}
function yearBody(d) {
  const top = d.cats.slice(0, 6), cmax = top.length ? top[0][1] : 1;
  return `<div class="stats four"><div class="stat"><div class="l">Toplam harcama</div><div class="v">${tl0(d.spend)}</div></div>
      <div class="stat"><div class="l">Aylık ortalama</div><div class="v">${tl0(d.spend / (d.has.length || 1))}</div></div>
      <div class="stat"><div class="l">Gelir</div><div class="v">${d.inc ? tl0(d.inc) : '—'}</div></div>
      <div class="stat"><div class="l">Tasarruf</div><div class="v ${d.inc - d.spend >= 0 ? 'pos' : 'neg'}">${d.inc ? '%' + pct(d.inc - d.spend, d.inc) : '—'}</div></div></div>
    ${miniBars(d.bm.map(x => ({ l: MSHORT[+x.m.slice(5) - 1], v: x.v, sel: x === d.max })), { h: 140 })}
    <p class="insight" style="margin-top:10px">${d.has.length} ayın verisi var. En pahalı ay <b>${d.max.m ? MONTHS[+d.max.m.slice(5) - 1] : '—'}</b> (${tl0(d.max.v)}), en ucuzu <b>${d.min.m ? MONTHS[+d.min.m.slice(5) - 1] : '—'}</b> (${tl0(d.min.v)}).
      En çok harcanan gün <b>${['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'][d.wd.indexOf(Math.max(...d.wd))]}</b>. Bankaya ${tl0(d.fees)} faiz ve ücret ödendi; ${d.tak} yeni taksitli alışveriş yapıldı.</p>
    <h3 class="bt-h">En çok harcanan kategoriler</h3>
    <ul class="cats plainbars">${top.map(([c, v]) => `<li><span class="nm">${CATICON[c] || ''} ${esc(c)}</span><span class="amt">${tl0(v)}</span><span class="meta"><span class="bar"><i style="width:${v / cmax * 100}%;background:${CATCOL[c]}"></i></span><span class="sub">%${pct(v, d.spend)}</span></span></li>`).join('')}</ul>
    <h3 class="bt-h">En çok harcanan yerler</h3>
    <ul class="list-plain bt-items">${d.merch.slice(0, 5).map(([m, o], i) => `<li><span>${i + 1}. ${esc(m)} <span class="sub">${o.n} işlem</span></span><b>${tl0(o.v)}</b></li>`).join('')}</ul>`;
}
function viewYil() {
  const years = [...new Set(monthKeys().map(m => m.slice(0, 4)))].sort();
  if (!years.length) return pageHead('Yıl özeti') + viewEmpty();
  const y = years.includes(S.year) ? S.year : years[years.length - 1];
  const d = yearData(y);
  return pageHead('Yıl özeti', `${esc(isHane() ? 'Hane' : profName(S.profile))} · ${y}`) +
    `<div class="chips">${years.map(x => `<button class="chip" aria-pressed="${x === y}" onclick="S.year='${x}';render()">${x}</button>`).join('')}</div>
    <section class="card" id="yil-card"><h2>${y}<button class="pngbtn noexp" onclick="exportYear('${y}')">${DL_ICON}PNG</button></h2>${yearBody(d)}</section>`;
}
window.exportYear = async y => {
  toast('Görsel hazırlanıyor…', 1500);
  try { await saveImages([{ url: await renderPoster(`${y} yıl özeti`, esc(isHane() ? 'Hane' : profName(S.profile)), yearBody(yearData(y))), name: `ekstrem-yil-${y}-${fileTag()}.png` }]); }
  catch (e) { console.error(e); toast('Görsel oluşturulamadı: ' + (e.message || e), 4000); }
};

/* ---------- Uygulama kilidi ---------- */
const nat = (plugin, method, opts = {}) => window.Capacitor.nativePromise(plugin, method, opts);
async function pinHash(pin, salt) {
  const data = new TextEncoder().encode(salt + ':' + pin);
  if (window.crypto && crypto.subtle) return [...new Uint8Array(await crypto.subtle.digest('SHA-256', data))].map(b => b.toString(16).padStart(2, '0')).join('');
  let h = 2166136261; for (const b of data) { h ^= b; h = Math.imul(h, 16777619) >>> 0; } return 'f' + h.toString(16);
}
async function bioAvailable() {
  if (!isNative()) return false;
  try { const r = await nat('BiometricAuthNative', 'checkBiometry'); return !!(r && r.isAvailable); } catch (e) { return false; }
}
async function bioAuth() {
  try { await nat('BiometricAuthNative', 'internalAuthenticate', { reason: 'Ekstrem\'i açmak için doğrula', androidTitle: 'Ekstrem', androidSubtitle: 'Kilidi aç', cancelTitle: 'PIN gir', allowDeviceCredential: false }); return true; }
  catch (e) { return false; }
}
let lockedAt = 0, lockOpen = false;
// Paylaşımla açılan pencere başka bir ekrana geçince kapanır; orada parmak izi penceresi açılmaz, PIN sorulur
function lockGate(noBio) {
  if (!S.lock || !S.lock.hash || lockOpen) return Promise.resolve();
  const bio = S.lock.bio && !noBio;
  lockOpen = true;
  return new Promise(res => {
    let pin = '';
    const el = document.createElement('div'); el.id = 'lock'; el.className = 'lock';
    el.innerHTML = `<div class="lk-in"><div class="lk-brand">Ekstrem</div><p class="lk-msg" id="lkMsg">PIN'ini gir</p><div class="lk-dots" id="lkDots"></div>
      <div class="lk-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-n="${n}">${n}</button>`).join('')}
        <button data-a="bio" ${bio ? '' : 'style="visibility:hidden"'} aria-label="Parmak izi">☝︎</button><button data-n="0">0</button><button data-a="del" aria-label="Sil">⌫</button></div>
      <button class="lk-forgot" data-a="forgot">PIN'i unuttum</button></div>`;
    document.body.appendChild(el);
    const dots = () => { $('#lkDots').innerHTML = Array.from({ length: S.lock.len || 4 }, (_, i) => `<i class="${i < pin.length ? 'on' : ''}"></i>`).join(''); };
    const done = () => { el.remove(); lockOpen = false; res(); };
    const check = async () => {
      if (await pinHash(pin, S.lock.salt) === S.lock.hash) return done();
      pin = ''; dots(); $('#lkMsg').textContent = 'PIN yanlış, tekrar dene'; el.querySelector('.lk-dots').classList.add('shake'); setTimeout(() => el.querySelector('.lk-dots') && el.querySelector('.lk-dots').classList.remove('shake'), 400);
    };
    el.onclick = async e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.n != null && pin.length < (S.lock.len || 4)) { pin += b.dataset.n; dots(); if (pin.length === (S.lock.len || 4)) check(); }
      else if (b.dataset.a === 'del') { pin = pin.slice(0, -1); dots(); }
      else if (b.dataset.a === 'bio') { if (await bioAuth()) done(); }
      else if (b.dataset.a === 'forgot') {
        if (!confirm('PIN olmadan uygulama açılamaz. Tüm veriler silinip uygulama sıfırlanacak. Android uygulaması kapanırken Belgeler › Ekstrem klasörüne yedek yazar; sıfırladıktan sonra oradan geri yükleyebilirsin. Devam edilsin mi?')) return;
        await Promise.all(['statements', 'incomes', 'kv'].map(s => Store.clear(s))); await load(); done(); render();
      }
    };
    dots();
    if (bio) bioAuth().then(ok => { if (ok && lockOpen) done(); });
  });
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { lockedAt = Date.now(); return; }
  if (S.lock && S.lock.hash && lockedAt && Date.now() - lockedAt > 60000) lockGate();
});
async function setupPin() {
  const ask = (title, sub) => new Promise(r => {
    openSheet(`<h3>${title}</h3><p class="sub">${sub}</p><input class="inp" id="pinIn" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" style="font-size:24px;letter-spacing:.4em;text-align:center">
      <button class="btn block" id="pinOk">Devam</button><button class="btn ghost block" onclick="closeSheet()">Vazgeç</button>`, () => r(null));
    setTimeout(() => $('#pinIn').focus(), 60);
    $('#pinOk').onclick = () => { const v = $('#pinIn').value.trim(); if (!/^\d{4,6}$/.test(v)) return toast('4-6 haneli bir PIN gir'); closeSheet(true); r(v); };
  });
  const a = await ask('PIN belirle', '4-6 haneli bir PIN seç. Uygulama açılışta ve bir dakikadan uzun arka planda kaldıktan sonra PIN sorar.'); if (!a) return;
  const b = await ask('PIN\'i tekrar gir', 'Doğrulamak için aynı PIN\'i gir.'); if (!b) return;
  if (a !== b) return toast('PIN\'ler eşleşmedi, tekrar dene', 3500);
  const salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
  S.lock = { hash: await pinHash(a, salt), salt, len: a.length, bio: false };
  if (await bioAvailable()) S.lock.bio = confirm('Parmak izi ya da yüz tanıma ile de açılsın mı?');
  await saveKV('lock', S.lock); toast('Uygulama kilidi açıldı'); openSettings();
}
window.setupPin = setupPin;
window.removePin = async () => {
  if (!confirm('Uygulama kilidi kaldırılsın mı?')) return;
  S.lock = null; await Store.del('kv', 'lock'); toast('Kilit kaldırıldı'); openSettings();
};
window.toggleBio = async on => {
  if (on && !(await bioAvailable())) { toast('Bu telefonda biyometrik doğrulama kullanılamıyor'); return openSettings(); }
  S.lock.bio = !!on; await saveKV('lock', S.lock); openSettings();
};

/* ---------- Son ödeme hatırlatıcısı ---------- */
async function scheduleReminders(interactive) {
  if (!isNative()) return;
  try {
    const pend = await nat('LocalNotifications', 'getPending');
    if (pend && pend.notifications && pend.notifications.length) await nat('LocalNotifications', 'cancel', { notifications: pend.notifications.map(n => ({ id: n.id })) });
    if (!S.reminders.on) return;
    let perm = await nat('LocalNotifications', 'checkPermissions');
    if (perm.display !== 'granted') {
      if (!interactive) return;
      perm = await nat('LocalNotifications', 'requestPermissions');
      if (perm.display !== 'granted') { toast('Bildirim izni verilmedi; Android ayarlarından açabilirsin.', 4500); return; }
    }
    const now = Date.now(), list = [];
    const seen = new Set();
    S.statements.filter(s => !s.manual && s.sonOdeme).forEach((s, i) => {
      const key = s.bank + s.sonOdeme + s.profile; if (seen.has(key)) return; seen.add(key);
      const [y, m, d] = s.sonOdeme.split('-').map(Number);
      const at = new Date(y, m - 1, d - S.reminders.days, 10, 0, 0);
      if (at.getTime() <= now + 60000) return;
      list.push({ id: 1000 + i, title: 'Son ödeme yaklaşıyor', body: `${s.bank} (${profName(s.profile)}): ${s.borcTL || '-'} ₺, son ödeme ${dTR(s.sonOdeme)}`,
        schedule: { at: at.toISOString(), allowWhileIdle: true }, smallIcon: 'ic_stat_ekstrem' });
    });
    if (list.length) await nat('LocalNotifications', 'schedule', { notifications: list });
    if (interactive) toast(list.length ? `${list.length} hatırlatıcı kuruldu` : 'Yaklaşan son ödeme yok; yeni ekstre yüklenince kurulur', 3500);
  } catch (e) { console.error(e); if (interactive) toast('Hatırlatıcı kurulamadı: ' + (e.message || e), 4500); }
}
window.setReminder = async (on, days) => {
  S.reminders = { on: !!on, days: days || S.reminders.days || 2 }; await saveKV('reminders', S.reminders);
  await scheduleReminders(true); openSettings();
};
function settingsExtra() {
  const lockOn = S.lock && S.lock.hash;
  return `<label class="f">Uygulama kilidi</label>
    ${lockOn ? `<p class="sub" style="margin:0 0 6px">Açık: ${S.lock.len} haneli PIN${S.lock.bio ? ' ve parmak izi' : ''}.</p>
      ${isNative() ? `<div class="seg" role="group" aria-label="Biyometrik"><button style="flex:1" aria-pressed="${!!S.lock.bio}" onclick="toggleBio(true)">Parmak izi açık</button><button style="flex:1" aria-pressed="${!S.lock.bio}" onclick="toggleBio(false)">Yalnızca PIN</button></div>` : ''}
      <button class="btn ghost block" onclick="closeSheet(true);setupPin()">PIN'i değiştir</button><button class="btn ghost block" onclick="removePin()">Kilidi kaldır</button>`
      : `<p class="sub" style="margin:0 0 6px">Uygulama açılırken PIN ya da parmak izi sorulsun. Telefonu başkası kullandığında harcamaların görünmez.</p><button class="btn ghost block" onclick="closeSheet(true);setupPin()">PIN belirle</button>`}
    <label class="f">Son ödeme hatırlatıcısı</label>
    ${isNative() ? `<p class="sub" style="margin:0 0 6px">Ekstredeki son ödeme tarihinden önce telefon bildirimi gelir (saat 10.00).</p>
      <div class="seg" role="group" aria-label="Hatırlatıcı">${[[0, 'Kapalı'], [1, '1 gün önce'], [2, '2 gün önce'], [3, '3 gün önce']].map(([d, l]) =>
        `<button style="flex:1" aria-pressed="${d ? S.reminders.on && S.reminders.days === d : !S.reminders.on}" onclick="setReminder(${d ? 'true' : 'false'},${d || 0})">${l}</button>`).join('')}</div>`
      : '<p class="sub" style="margin:0">Android uygulamasında çalışır.</p>'}`;
}

/* ---------- Paylaş → Ekstrem ---------- */
function b64ToBytes(b64) { const bin = atob(b64); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }
async function peekShared() {
  if (!isNative()) return null;
  try { const r = await nat('SendIntent', 'checkSendIntentReceived'); return r && r.url ? r : null; } catch (e) { return null; }
}
async function checkSharedFiles(r) {
  if (!r || !r.url) return;
  const items = [r, ...(r.additionalItems || [])].filter(x => x && x.url);
  const files = [], paths = [];
  for (const it of items) {
    const path = decodeURIComponent(it.url);
    try {
      const f = await nat('Filesystem', 'readFile', { path });
      const name = it.title || path.split('/').pop() || 'ekstre.pdf';
      if (!/pdf/i.test(it.type || '') && !/\.pdf$/i.test(name)) continue;
      files.push(new File([b64ToBytes(f.data)], name, { type: 'application/pdf' })); paths.push(path);
    } catch (e) { console.error(e); }
  }
  if (!files.length) { toast('Paylaşılan dosya okunamadı. PDF ekstreyi "+ Ekstre" ile seçebilirsin.', 5000); return; }
  await importFiles(files);
  for (const p of paths) { try { await nat('Filesystem', 'deleteFile', { path: p }); } catch (e) { /* geçici kopya */ } }
}
// Başka bir pencerede (paylaşımla açılan) veri değiştiyse ana pencere yeniden yükler
const REV = 'ekstrem_rev';
let seenRev = (() => { try { return localStorage.getItem(REV); } catch (e) { return null; } })();
function bumpRev() { const v = String(Date.now()); seenRev = v; try { localStorage.setItem(REV, v); } catch (e) { /* yok */ } }
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState !== 'visible') return;
  let r = null; try { r = localStorage.getItem(REV); } catch (e) { return; }
  if (r && r !== seenRev) { seenRev = r; await load(); render(); }
});
