/* ---------- Tema ---------- */
const MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>';
const SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>';
const DL_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-3px;margin-right:4px"><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/></svg>';
const mqDark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
function resolvedTheme() { return S.theme === 'auto' ? (mqDark && mqDark.matches ? 'dark' : 'light') : S.theme; }
function applyTheme() {
  const t = resolvedTheme();
  document.documentElement.setAttribute('data-theme', t);
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = t === 'dark' ? '#13254A' : '#1C3F7A';
  try { localStorage.setItem('ekstrem_theme', S.theme); } catch (e) { /* depolama yoksa önemli değil */ }
  const b = $('#btnTheme');
  if (b) { b.innerHTML = t === 'dark' ? SUN : MOON; b.setAttribute('aria-label', t === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'); }
}
if (mqDark && mqDark.addEventListener) mqDark.addEventListener('change', () => { if (S.theme === 'auto') { applyTheme(); render(); } });
window.setTheme = t => { S.theme = t; saveKV('theme', t); applyTheme(); render(); };

/* ---------- Görsel (PNG) dışa aktarma ---------- */
function dataUrlToBlob(u) {
  const [h, b] = u.split(','); const bin = atob(b); const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: (h.match(/data:([^;]+)/) || [])[1] || 'image/png' });
}
// html-to-image satır içi SVG grafikleri siyah çiziyor; dışa aktarım sırasında her SVG'yi
// renkleri ve yazı tipi gömülü bir <img> ile geçici olarak değiştiriyoruz.
let svgFontCSS = null;
function svgFonts() {
  if (svgFontCSS != null) return svgFontCSS;
  svgFontCSS = '';
  for (const sh of document.styleSheets) {
    let rules; try { rules = sh.cssRules; } catch (e) { continue; }
    for (const r of rules) if (r.type === CSSRule.FONT_FACE_RULE && /Bricolage/.test(r.cssText)) svgFontCSS += r.cssText + '\n';
  }
  return svgFontCSS;
}
const SVG_PROPS = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-linejoin', 'stroke-linecap', 'stroke-dasharray', 'opacity', 'font-size', 'font-weight', 'font-family', 'paint-order'];
async function svgToImg(svg) {
  const clone = svg.cloneNode(true);
  const src = [...svg.querySelectorAll('*')], dst = [...clone.querySelectorAll('*')];
  src.forEach((el, i) => {
    if (el.classList && el.classList.contains('noexp')) { dst[i].remove(); return; }
    const cs = getComputedStyle(el);
    SVG_PROPS.forEach(p => { const v = cs.getPropertyValue(p); if (v) dst[i].style.setProperty(p, v); });
  });
  const r = svg.getBoundingClientRect();
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', r.width); clone.setAttribute('height', r.height);
  const st = document.createElementNS('http://www.w3.org/2000/svg', 'style'); st.textContent = svgFonts(); clone.insertBefore(st, clone.firstChild);
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone));
  const cs = getComputedStyle(svg);
  img.style.cssText = `width:${r.width}px;height:${r.height}px;display:block;margin:${cs.margin}`;
  try { await img.decode(); } catch (e) { /* çizim yine denenir */ }
  return img;
}
async function nodeToPng(node, ratio = 2.5) {
  const swaps = [];
  for (const svg of node.querySelectorAll('svg.flow')) { const img = await svgToImg(svg); svg.replaceWith(img); swaps.push([svg, img]); }
  try { return await nodeToPngRaw(node, ratio); } finally { swaps.forEach(([svg, img]) => img.replaceWith(svg)); }
}
async function nodeToPngRaw(node, ratio) {
  node.classList.add('exporting');
  const own = getComputedStyle(node).backgroundColor;
  const bg = /rgba\(.*,\s*0\)$|transparent/.test(own) ? getComputedStyle(document.body).backgroundColor : own;
  try {
    await (document.fonts && document.fonts.ready);
    const opts = { pixelRatio: ratio, backgroundColor: bg, filter: n => !(n.classList && n.classList.contains('noexp')) };
    // İlk çağrıda Android WebView bazen görselleri eksik çizer; ikinci çağrı güvenilir sonuç verir.
    await htmlToImage.toPng(node, opts).catch(() => null);
    return await htmlToImage.toPng(node, opts);
  } finally { node.classList.remove('exporting'); }
}
async function exportNode(node, name) {
  if (!node) return;
  toast('Görsel hazırlanıyor…', 1500);
  try { const url = await nodeToPng(node); await saveImage(url, name); }
  catch (e) { console.error(e); toast('Görsel oluşturulamadı: ' + (e.message || e), 4000); }
}
async function saveImage(dataUrl, name) { return saveImages([{ url: dataUrl, name }]); }
async function saveImages(list) {
  const cap = window.Capacitor;
  const native = !!(cap && cap.isNativePlatform && cap.isNativePlatform() && cap.nativePromise);
  const uris = []; let savedDocs = 0;
  if (native) for (const it of list) {
    const data = it.url.split(',')[1];
    try { const r = await cap.nativePromise('Filesystem', 'writeFile', { path: 'Ekstrem/' + it.name, data, directory: 'DOCUMENTS', recursive: true }); uris.push(r.uri); savedDocs++; }
    catch (e) { try { const r = await cap.nativePromise('Filesystem', 'writeFile', { path: it.name, data, directory: 'CACHE' }); uris.push(r.uri); } catch (e2) { /* paylaşım yine denenir */ } }
  }
  let files = []; try { files = list.map(it => new File([dataUrlToBlob(it.url)], it.name, { type: 'image/png' })); } catch (e) { /* eski tarayıcı */ }
  const nativeShare = native && uris.length > 0;
  const webShare = !nativeShare && files.length && navigator.canShare && navigator.canShare({ files });
  const many = list.length > 1;
  const where = savedDocs ? `${savedDocs === 1 ? 'Görsel' : savedDocs + ' görsel'} telefonda Belgeler › Ekstrem klasörüne kaydedildi.` : '';
  openSheet(`<h3>${many ? list.length + ' görsel hazır' : 'Görsel hazır'}</h3><p class="sub">${esc(where || list.map(i => i.name).join(', '))}</p>
    <div class="${many ? 'png-grid' : ''}">${list.map(it => `<img src="${it.url}" alt="${esc(it.name)} önizlemesi" class="png-preview">`).join('')}</div>
    ${nativeShare || webShare ? `<button class="btn block" id="imgShare">${many ? 'Hepsini paylaş' : 'Paylaş'} (WhatsApp, Galeri, Drive…)</button>` : ''}
    ${savedDocs ? '' : `<button class="btn ghost block" id="imgDl">${many ? 'Hepsini cihaza indir' : 'Cihaza indir'}</button>`}
    <button class="btn ghost block" onclick="closeSheet()">Kapat</button>`);
  const sh = $('#imgShare');
  if (sh) sh.onclick = async () => {
    try {
      if (nativeShare) await cap.nativePromise('Share', 'share', { title: 'Ekstrem', files: uris, dialogTitle: 'Görselleri paylaş' });
      else await navigator.share({ files, title: 'Ekstrem' });
    } catch (e) { if (!/cancel|abort/i.test(String(e && (e.message || e.name)))) toast('Paylaşım açılamadı: ' + (e.message || e), 4000); }
  };
  const dl = $('#imgDl');
  if (dl) dl.onclick = async () => {
    for (const it of list) {
      const a = document.createElement('a'); a.href = URL.createObjectURL(dataUrlToBlob(it.url)); a.download = it.name;
      document.body.appendChild(a); a.click(); a.remove();
      await new Promise(r => setTimeout(r, 400));
    }
    toast('İndirme başlamadıysa bu uygulama sürümü dosya indirmeyi desteklemiyor; ekran görüntüsü alabilirsin.', 5000);
  };
}
const fileTag = () => slug(isHane() ? 'hane' : profName(S.profile));
window.exportReceipt = () => exportNode($('#main .receipt-wrap'), `ekstrem-fis-${S.month}-${fileTag()}.png`);

/* ---------- Plan: hesap ---------- */
const addM = (k, n) => { let [y, m] = k.split('-').map(Number); m += n; y += Math.floor((m - 1) / 12); m = ((m - 1) % 12 + 12) % 12 + 1; return y + '-' + String(m).padStart(2, '0'); };
const mDiff = (a, b) => { const [y1, m1] = a.split('-').map(Number), [y2, m2] = b.split('-').map(Number); return (y2 - y1) * 12 + (m2 - m1); };
const nowMonth = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
// Başlangıç seçilmediyse: kalemlerin en erken başladığı ay (en fazla 11 ay geri), yoksa bu ay
function defaultStart() {
  const now = nowMonth(), floor = addM(now, -11);
  const st = visibleItems().map(it => it.start).filter(m => m < now && m >= floor).sort()[0];
  return st || now;
}
const planStart = () => S.plan.start || defaultStart();
const planMonths = () => Array.from({ length: S.plan.horizon }, (_, i) => addM(planStart(), i));
const planScope = () => isHane() ? 'hane' : S.profile;
const savePlan = () => saveKV('plan', S.plan);
const sgn = v => (v > 0.004 ? '+' : v < -0.004 ? '−' : '') + nf.format(Math.abs(v));
const sgn0 = v => (v > 0.5 ? '+' : v < -0.5 ? '−' : '') + nf0.format(Math.abs(v));
const kfmt = v => { const a = Math.abs(v); return (a >= 1000 ? (a / 1000).toLocaleString('tr-TR', { maximumFractionDigits: a >= 10000 ? 0 : 1 }) + 'k' : nf0.format(a)); };
const itemActive = (it, m) => { const d = mDiff(it.start, m); return d >= 0 && (!it.months || d < it.months); };
const visibleItems = () => S.plan.items.filter(it => isHane() || it.scope === S.profile);
const scopeLabel = s => s === 'hane' ? 'Ortak' : profName(s);

// Taksit kimliği: aynı alışveriş her ekstrede aynı anahtarı alır
const srcKey = st => { const p = st.id.split('_'); return p[0] + '_' + (p[2] || '') + '_' + st.profile; };
const instKey = (st, t) => `${st.id.split('_')[0]}|${t.card || ''}|${merchantKey(t.desc)}|${Math.round(t.tl)}|${t.taksitToplam}|${addM(st.month, -t.taksitNo)}`;
// Her plan ayı için, o aydan ÖNCEKİ son ekstreden kalan taksitleri yansıt.
// Böylece gerçekleşmiş bir ayın "planlanan" taksiti, o ayın kendi ekstresi gelince değişmez.
function autoInstallments(months) {
  const bySrc = {};
  for (const st of S.statements) { if (st.manual || !inProfile(st)) continue; (bySrc[srcKey(st)] = bySrc[srcKey(st)] || []).push(st); }
  const out = [];
  for (const list of Object.values(bySrc)) {
    list.sort((a, b) => a.month.localeCompare(b.month));
    for (const m of months) {
      let src = null; for (const s of list) if (s.month < m) src = s;
      if (!src) continue;
      const j = mDiff(src.month, m);
      for (const t of src.tx) {
        if (t.type !== 'expense' || !t.taksitToplam || !(t.taksitNo < t.taksitToplam)) continue;
        const no = t.taksitNo + j; if (no > t.taksitToplam) continue;
        out.push({ key: instKey(src, t), month: m, amount: t.tl, name: merchantKey(t.desc), no, of: t.taksitToplam, st: src, t });
      }
    }
  }
  return out;
}

/* ---------- Gerçekleşme ---------- */
const nameMatch = (a, b) => { const x = BKCats.upper(a || '').trim(), y = BKCats.upper(b || '').trim(); return !!x && !!y && (x.includes(y) || y.includes(x)); };
const profOk = (it, profile) => !isHane() || it.scope === 'hane' || it.scope === profile;
// Bir önceki ayda ekstresi gelen kartlar bu ay da beklenir
function expectedSources(m) {
  const sts = S.statements.filter(s => !s.manual && inProfile(s));
  const prev = [...new Set(sts.filter(s => s.month < m).map(s => s.month))].sort().pop();
  return prev ? [...new Set(sts.filter(s => s.month === prev).map(s => s.bank + '|' + s.profile))] : [];
}
function actualOf(m, pr) {
  const ck = `${planScope()}|${m}`, mode = S.plan.real[ck];
  const sts = stmtsOf(m), cardSts = sts.filter(s => !s.manual), manSts = sts.filter(s => s.manual);
  const have = new Set(cardSts.map(s => s.bank + '|' + s.profile));
  const missing = expectedSources(m).filter(x => !have.has(x)).map(x => { const [bank, profile] = x.split('|'); return { bank, profile }; });
  let status = mode === 'off' ? 'off' : mode === 'on' ? 'real' : !cardSts.length ? (m < nowMonth() ? 'waiting' : 'plan') : missing.length ? 'partial' : 'real';
  const base = { status, missing, forced: mode || null, hasData: cardSts.length > 0 };
  if (status !== 'real') return base;
  const ov = id => S.plan.act[`${ck}|${id}`];
  const sum = l => l.reduce((a, x) => a + x, 0);
  const rows = spendRows(cardSts);
  const takAct = sum(rows.filter(r => r.t.taksitToplam && r.t.type === 'expense').map(r => amtTL(r.t, r.st)));
  const cardOther = sum(rows.filter(r => !(r.t.taksitToplam && r.t.type === 'expense')).map(r => amtTL(r.t, r.st)));
  let manLeft = manSts.flatMap(st => st.tx.map(t => ({ t, profile: st.profile })));
  const L = [], I = [];
  const push = (arr, o) => { const v = ov(o.id); if (v != null) { o.act = v; o.src = 'elle'; } arr.push(o); };
  push(L, { id: '__tak', name: 'Kart taksitleri', plan: pr.takT, act: takAct, src: 'ekstre' });
  const kartIt = pr.gider.find(it => it.auto === 'kart'), nakitIt = pr.gider.find(it => it.auto === 'nakit');
  for (const it of pr.gider) {
    if (it === kartIt || it === nakitIt) continue;
    const hit = manLeft.filter(x => nameMatch(x.t.desc, it.name) && profOk(it, x.profile));
    manLeft = manLeft.filter(x => !hit.includes(x));
    push(L, hit.length ? { id: it.id, name: it.name, plan: it.amount, act: sum(hit.map(x => x.t.tl)), src: 'kart dışı kayıt' }
      : { id: it.id, name: it.name, plan: it.amount, act: it.amount, src: 'varsayıldı' });
  }
  if (kartIt) push(L, { id: kartIt.id, name: kartIt.name, plan: kartIt.amount, act: cardOther, src: 'ekstre' });
  else if (Math.abs(cardOther) >= 1) push(L, { id: '__card', name: 'Plan dışı kart harcaması', plan: 0, act: cardOther, src: 'ekstre' });
  const manT = sum(manLeft.map(x => x.t.tl));
  if (nakitIt) push(L, { id: nakitIt.id, name: nakitIt.name, plan: nakitIt.amount, act: manT, src: 'kart dışı kayıt' });
  else if (manT >= 1) push(L, { id: '__man', name: 'Plan dışı kart dışı harcama', plan: 0, act: manT, src: 'kart dışı kayıt' });
  // Gelir: Ekle sekmesinde girilen gelirlerle eşleştir
  let incLeft = S.incomes.filter(i => i.month === m && inProfile(i));
  for (const it of pr.gelir) {
    const hit = incLeft.filter(i => nameMatch(i.source, it.name) && profOk(it, i.profile));
    incLeft = incLeft.filter(i => !hit.includes(i));
    push(I, hit.length ? { id: it.id, name: it.name, plan: it.amount, act: sum(hit.map(i => i.amount)), src: 'girilen gelir' }
      : { id: it.id, name: it.name, plan: it.amount, act: it.amount, src: 'varsayıldı' });
  }
  const extra = {}; incLeft.forEach(i => { extra[i.source] = (extra[i.source] || 0) + i.amount; });
  Object.entries(extra).forEach(([n, v]) => push(I, { id: '__inc:' + n, name: n, plan: 0, act: v, src: 'girilen gelir' }));
  const r2 = v => Math.round(v * 100) / 100;
  return { ...base, lines: L, incLines: I, takAct: r2(L[0].act), giderAct: r2(sum(L.slice(1).map(l => l.act))), gelirAct: r2(sum(I.map(l => l.act))),
    assumed: [...L, ...I].filter(l => l.src === 'varsayıldı').length };
}

function planCalc(monthsArg) {
  S.plan.real = S.plan.real || {}; S.plan.act = S.plan.act || {};
  const months = monthsArg || planMonths(), scope = planScope();
  const allInst = autoInstallments(months);
  const inst = allInst.filter(x => !S.plan.excl[x.key]);
  const items = visibleItems();
  const rows = [];
  const r2 = v => Math.round(v * 100) / 100;
  months.forEach((m, idx) => {
    const tak = inst.filter(x => x.month === m);
    const gider = items.filter(it => it.kind === 'gider' && itemActive(it, m));
    const gelir = items.filter(it => it.kind === 'gelir' && itemActive(it, m));
    const sum = l => l.reduce((a, x) => a + x.amount, 0);
    const ck = `${scope}|${m}`;
    const carryManual = S.plan.carry[ck] != null;
    const autoCarry = idx === 0 ? 0 : rows[idx - 1].bal;
    const pAutoCarry = idx === 0 ? 0 : rows[idx - 1].planBal;
    const carry = carryManual ? S.plan.carry[ck] : autoCarry;
    const pCarry = carryManual ? S.plan.carry[ck] : pAutoCarry;
    const pTak = sum(tak), pGider = sum(gider), pGelir = sum(gelir);
    const planBal = r2(pGelir + pCarry - pTak - pGider);
    const act = actualOf(m, { takT: pTak, gider, gelir });
    const real = act.status === 'real';
    const takT = real ? act.takAct : pTak, giderT = real ? act.giderAct : pGider, gelirT = real ? act.gelirAct : pGelir;
    const bal = r2(gelirT + carry - takT - giderT);
    rows.push({ m, idx, tak, takT, gider, giderT, gelir, gelirT, carry, carryManual, autoCarry, bal,
      pTak, pGider, pGelir, pCarry, planBal, act, real });
  });
  return { months, rows, inst, allInst, items, anyReal: rows.some(r => r.real) };
}

/* ---------- Plan: infografikler ---------- */
function flowChart(rows) {
  const W = 360, H = 250, top = 26, bottom = 30, padX = 6;
  const upv = r => r.gelirT + Math.max(r.carry, 0);
  const dnv = r => r.takT + r.giderT + Math.max(-r.carry, 0);
  const maxUp = Math.max(1, ...rows.map(upv), ...rows.map(r => Math.max(r.bal, 0, r.planBal)));
  const maxDn = Math.max(1, ...rows.map(dnv), ...rows.map(r => Math.max(-r.bal, 0, -r.planBal)));
  const k = (H - top - bottom) / (maxUp + maxDn);
  const y0 = top + maxUp * k;
  const band = (W - padX * 2) / rows.length, bw = Math.min(24, band * 0.46);
  const GAP = 2, R = 4;
  // Veri ucu yuvarlak, taban düz dikdörtgen
  const seg = (x, y, h, cls, roundTop, roundBottom) => {
    if (h < 0.5) return '';
    const r = Math.min(R, h / 2), w = bw;
    const tl = roundTop ? r : 0, bl = roundBottom ? r : 0;
    return `<path class="${cls}" d="M${x},${y + tl} a${tl},${tl} 0 0 1 ${tl},${-tl} h${w - 2 * tl} a${tl},${tl} 0 0 1 ${tl},${tl} v${h - tl - bl} a${bl},${bl} 0 0 1 ${-bl},${bl} h${-(w - 2 * bl)} a${bl},${bl} 0 0 1 ${-bl},${-bl} z"/>`;
  };
  let bars = '', hits = '', labels = '', pts = [];
  rows.forEach((r, i) => {
    const cx = padX + band * (i + 0.5), x = cx - bw / 2;
    // Yukarı: gelir, sonra artı devir
    const ups = [['m-gelir', r.gelirT], ['m-devpos', Math.max(r.carry, 0)]].filter(s => s[1] > 0);
    let y = y0 - 1;
    ups.forEach(([cls, v], j) => {
      const h = v * k - (j ? GAP : 0); const yy = y - (j ? GAP : 0) - h;
      bars += seg(x, yy, h, cls, j === ups.length - 1, false); y = yy;
    });
    // Aşağı: eksi devir, taksit, planlı gider
    const dns = [['m-devneg', Math.max(-r.carry, 0)], ['m-taksit', r.takT], ['m-gider', r.giderT]].filter(s => s[1] > 0);
    y = y0 + 1;
    dns.forEach(([cls, v], j) => {
      const h = v * k - (j ? GAP : 0); const yy = y + (j ? GAP : 0);
      bars += seg(x, yy, h, cls, false, j === dns.length - 1); y = yy + h;
    });
    pts.push([cx, y0 - r.bal * k, r, y0 - r.planBal * k]);
    labels += `<text class="ax ${r.real ? 'real' : ''}" x="${cx}" y="${H - 9}" text-anchor="middle">${MSHORT[+r.m.slice(5) - 1]}${r.real ? ' ✓' : ''}</text>`;
    hits += `<rect class="hit noexp" x="${cx - band / 2}" y="0" width="${band}" height="${H}" onclick="planFocus('${r.m}')"><title>${mLabel(r.m)}: bilanço ${sgn(r.bal)} ₺</title></rect>`;
  });
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const minP = pts.reduce((a, p) => p[2].bal < a[2].bal ? p : a, pts[0]);
  const lastP = pts[pts.length - 1];
  const lbl = (p, anchor) => {
    const above = p[2].bal >= 0 ? p[1] - 9 : p[1] + 16;
    return `<text class="val" x="${p[0]}" y="${above}" text-anchor="${anchor}">${sgn0(p[2].bal)}</text>`;
  };
  const anyReal = rows.some(r => r.real), drift = rows.some(r => Math.abs(r.bal - r.planBal) >= 1);
  const ghost = anyReal && drift ? `<path class="planline" d="${pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[3].toFixed(1)).join(' ')}"/>` +
    pts.filter(p => p[2].real).map(p => `<circle class="plandot" cx="${p[0]}" cy="${p[3]}" r="4"/>`).join('') : '';
  const valLabels = lbl(lastP, 'end') + (minP !== lastP && minP[2].bal < 0 ? lbl(minP, 'middle') : '');
  return `<svg class="flow" viewBox="0 0 ${W} ${H}" role="img" aria-label="Aylık gelir, gider ve bilanço grafiği">
    <defs>
      <pattern id="hPos" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" class="hp-bg"/><rect width="2.2" height="5" class="hp-fg"/></pattern>
      <pattern id="hNeg" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(135)"><rect width="5" height="5" class="hn-bg"/><rect width="2.2" height="5" class="hn-fg"/></pattern>
    </defs>
    <line class="zero" x1="0" x2="${W}" y1="${y0}" y2="${y0}"/>
    ${bars}
    ${ghost}
    <path class="balline" d="${line}"/>
    ${pts.map(p => `<circle class="baldot ${p[2].bal < 0 ? 'neg' : ''}" cx="${p[0]}" cy="${p[1]}" r="4.5"/>`).join('')}
    ${valLabels}${labels}${hits}
  </svg>`;
}
const flowLegend = rows => { const any = rows && rows.some(r => r.real); return `<div class="legend flowleg">
  <span><i class="lg m-gelir"></i>Gelir</span><span><i class="lg lg-pos"></i>Artı devir</span>
  <span><i class="lg m-taksit"></i>Taksit</span><span><i class="lg m-gider"></i>${any ? 'Diğer gider' : 'Planlı gider'}</span>
  <span><i class="lg lg-neg"></i>Eksi devir</span><span><i class="lg lg-line"></i>Bilanço</span>
  ${any ? '<span><i class="lg lg-plan"></i>İlk plan</span><span>✓ Gerçekleşen ay</span>' : ''}</div>`; };
const FLOW_LEGEND = flowLegend();

function planStats(calc) {
  const { rows } = calc;
  const tg = rows.reduce((a, r) => a + r.gelirT, 0), tx = rows.reduce((a, r) => a + r.takT + r.giderT, 0);
  const last = rows[rows.length - 1], worst = rows.reduce((a, r) => r.bal < a.bal ? r : a, rows[0]);
  const negs = rows.filter(r => r.bal < 0);
  const sentence = !tg && !tx ? 'Henüz plan kalemi yok. Aşağıdan gelir ve gider ekle; taksitler kendiliğinden gelir.'
    : negs.length ? `${rows.length} ayın ${negs.length}'${negs.length === 1 ? 'inde' : 'sinde'} bilanço eksiye düşüyor; en sıkışık ay <b>${MONTHS[+worst.m.slice(5) - 1]}</b> (<span class="neg">${sgn0(worst.bal)} ₺</span>).`
    : `Plan boyunca her ay artıda kalıyorsun; dönem sonunda <b class="pos">${sgn0(last.bal)} ₺</b> birikmiş oluyor.`;
  const reals = rows.filter(r => r.real);
  let realTxt = '';
  if (reals.length) {
    const d = last.bal - last.planBal;
    const names = reals.map(r => MONTHS[+r.m.slice(5) - 1]).join(', ');
    realTxt = `<p class="insight realnote">${names} gerçekleşti. ${Math.abs(d) < 1 ? 'Sonuç planla aynı.' :
      `Gerçekleşenlere göre dönem sonu <b>${sgn0(last.bal)} ₺</b>; ilk planda <b>${sgn0(last.planBal)} ₺</b> idi (<span class="${d < 0 ? 'neg' : 'pos'}">${sgn0(d)} ₺</span>).`}</p>`;
  }
  return `<p class="insight">${sentence}</p>${realTxt}
    <div class="stats four">
      <div class="stat"><div class="l">Toplam gelir</div><div class="v">${tl0(tg)}</div></div>
      <div class="stat"><div class="l">Toplam gider</div><div class="v">${tl0(tx)}</div></div>
      <div class="stat"><div class="l">Dönem sonu</div><div class="v ${last.bal < 0 ? 'neg' : 'pos'}">${sgn0(last.bal)} ₺</div></div>
      <div class="stat"><div class="l">En sıkışık ay</div><div class="v">${mShort(worst.m)}</div></div>
    </div>`;
}

function spendBreakdown(calc) {
  const agg = {};
  calc.rows.forEach(r => {
    if (r.takT) { agg['Kart taksitleri'] = agg['Kart taksitleri'] || { v: 0, t: 1 }; agg['Kart taksitleri'].v += r.takT; }
    r.gider.forEach(it => { agg[it.name] = agg[it.name] || { v: 0, t: 0 }; agg[it.name].v += it.amount; });
  });
  const list = Object.entries(agg).sort((a, b) => b[1].v - a[1].v);
  if (!list.length) return '<p class="sub">Plan döneminde gider yok.</p>';
  const tot = list.reduce((a, x) => a + x[1].v, 0), max = list[0][1].v;
  return `<ul class="cats plainbars">${list.map(([n, o]) => `<li><span class="nm">${esc(n)}</span><span class="amt">${tl0(o.v)}</span>
    <span class="meta"><span class="bar"><i class="${o.t ? 'm-taksit' : 'm-gider'}" style="width:${o.v / max * 100}%"></i></span><span class="sub">%${nf0.format(o.v / tot * 100)}</span></span></li>`).join('')}</ul>`;
}

function ledgerHTML(calc) {
  const { rows } = calc;
  const who = isHane() ? 'HANE' : up(profName(S.profile));
  return `<div class="receipt-wrap"><div class="receipt plan-rc" role="group" aria-label="Aylık bilanço">
    <div class="rc-head"><div class="shop">Ekstrem</div>
      <div class="meta">${S.plan.horizon} AYLIK PLAN · ${who}<br>${up(mLabel(rows[0].m))} – ${up(mLabel(rows[rows.length - 1].m))}</div></div>
    ${rows.map((r, i) => {
      const next = rows[i + 1] ? MONTHS[+rows[i + 1].m.slice(5) - 1] : MONTHS[+addM(r.m, 1).slice(5) - 1];
      const cLbl = i === 0 ? 'Başlangıç bakiyesi' : `Devir (${MONTHS[+rows[i - 1].m.slice(5) - 1]})`;
      const st = r.act.status;
      const tagTxt = r.real ? ' · GERÇEKLEŞTİ ✓' : st === 'partial' ? ' · KISMEN (EKSTRE EKSİK)' : st === 'waiting' ? ' · EKSTRE BEKLENİYOR' : '';
      return `<section class="mb ${r.real ? 'is-real' : ''}" id="mb-${r.m}"><hr class="rc-rule">
      <div class="mh">${up(mLabel(r.m))}${tagTxt}</div>
      <button class="ln carry" onclick="editCarry('${r.m}')" aria-label="${cLbl} düzenle"><span class="lbl">${cLbl}${r.carryManual ? ' ✎' : ''}</span><span class="dots"></span><span class="v">${sgn(r.carry)}</span><span class="noexp edit" aria-hidden="true">düzenle</span></button>
      ${r.real ? [...r.act.incLines.map(l => rcLine(l.name + (l.src === 'varsayıldı' ? '*' : ''), '+' + nf.format(l.act))),
          ...r.act.lines.filter(l => Math.abs(l.act) >= 0.005 || l.plan).map(l => rcLine(l.name + (l.src === 'varsayıldı' ? '*' : ''), (l.act < 0 ? '+' : '−') + nf.format(Math.abs(l.act))))].join('') : `
      ${r.gelir.map(it => rcLine(it.name, '+' + nf.format(it.amount))).join('')}
      ${r.takT ? rcLine(`Kart taksitleri (${r.tak.length})`, '−' + nf.format(r.takT)) : ''}
      ${r.gider.map(it => rcLine(it.name, '−' + nf.format(it.amount))).join('')}
      ${!r.gelir.length && !r.takT && !r.gider.length ? '<div class="ln small"><span class="lbl">Kalem yok</span></div>' : ''}`}
      <div class="balrow"><span>${r.real ? 'GERÇEKLEŞEN' : 'BİLANÇO'}</span><b class="${r.bal < 0 ? 'neg' : 'pos'}">${sgn(r.bal)} ₺</b></div>
      ${r.real ? `${rcLine('Planlanan bilanço', sgn(r.planBal), 'small')}${rcLine('Fark', sgn(r.bal - r.planBal), 'small')}
        ${r.act.assumed ? '<div class="ln small"><span class="lbl">* takip edilemedi, plandaki tutar varsayıldı</span></div>' : ''}
        <button class="cmpbtn noexp" onclick="openCompare('${r.m}')">Plan karşılaştırmasını aç</button>` :
        (st === 'partial' || st === 'waiting') ? `<button class="cmpbtn noexp" onclick="openCompare('${r.m}')">${st === 'partial' ? 'Eksik ekstreyi gör' : 'Durumu gör'}</button>` : ''}
      <div class="carrynote">${Math.abs(r.bal) < 0.005 ? `${next} ayına devir yok` : `${next} ayına ${r.bal > 0 ? 'gelir' : 'gider'} olarak devreder`}</div>
      </section>`;
    }).join('')}
    <hr class="rc-rule double">
    <div class="total"><span class="lbl">DÖNEM SONU</span><span class="amt ${rows[rows.length - 1].bal < 0 ? 'neg' : ''}">${(() => { const [ip, dp] = nf.format(Math.abs(rows[rows.length - 1].bal)).split(','); return (rows[rows.length - 1].bal < 0 ? '−' : '') + ip + `<small>,${dp} ₺</small>`; })()}</span></div>
  </div></div>`;
}

function ganttHTML(calc) {
  const { months, allInst } = calc;
  if (!allInst.length) return '<p class="sub">Yüklü ekstrelerde plan dönemine yansıyan taksit yok.</p>';
  const groups = {};
  allInst.forEach(x => {
    const g = groups[x.key] = groups[x.key] || { key: x.key, name: x.name, src: srcLabel(x.t, x.st), of: x.of, last: x.no, cells: {}, total: 0, st: x.st };
    g.cells[x.month] = x; g.total += x.amount; g.last = Math.max(g.last, x.no); g.end = addM(x.month, x.of - x.no);
  });
  const list = Object.values(groups).sort((a, b) => b.total - a.total);
  const showVals = months.length <= 6;
  const colTot = m => allInst.filter(x => x.month === m && !S.plan.excl[x.key]).reduce((a, x) => a + x.amount, 0);
  const endIn = list.filter(g => g.last === g.of && !S.plan.excl[g.key]);
  const firstT = colTot(months[0]), lastT = colTot(months[months.length - 1]);
  return `<p class="insight">Taksit yükü ${mShort(months[0])} ayında <b>${tl0(firstT)}</b>, ${mShort(months[months.length - 1])} ayında <b>${tl0(lastT)}</b>.
      ${endIn.length ? `${endIn.length} taksit bu dönemde bitiyor.` : ''}</p>
    <div class="gantt" style="--n:${months.length}">
      <div class="gh"></div>${months.map(m => `<div class="gh">${MSHORT[+m.slice(5) - 1]}</div>`).join('')}
      ${list.map(g => {
        const off = !!S.plan.excl[g.key];
        return `<button class="gname ${off ? 'off' : ''}" onclick="toggleInst('${g.key}')"><b>${esc(g.name)}</b><span>${esc(g.src)} · ${off ? 'plan dışı' : `biter ${mShort(g.end)}`}</span></button>` +
          months.map(m => { const c = g.cells[m]; return c ? `<div class="gc on ${off ? 'off' : ''} ${c.no === c.of ? 'end' : ''}" title="${esc(g.name)} ${c.no}/${c.of}: ${tl(c.amount)}">${showVals ? kfmt(c.amount) : ''}</div>` : '<div class="gc"></div>'; }).join('');
      }).join('')}
      <div class="gname gtot"><b>Toplam</b></div>${months.map(m => `<div class="gc tot">${kfmt(colTot(m))}</div>`).join('')}
    </div>
    <p class="sub noexp" style="margin:10px 0 0">Bir taksiti erken kapattıysan satırına dokunup plandan çıkarabilirsin. Son taksit koyu kenarlı gösterilir.</p>`;
}

/* ---------- Plan: kalemler ve öneriler ---------- */
function suggestions() {
  const out = [], items = visibleItems(), scope = planScope();
  const has = (kind, name) => items.some(it => it.kind === kind && BKCats.upper(it.name) === BKCats.upper(name));
  // Gelir önerisi: en son girilen ayın gelir kalemleri
  const incs = S.incomes.filter(inProfile);
  if (incs.length) {
    const lastM = incs.map(i => i.month).sort().pop();
    const bySrc = {};
    incs.filter(i => i.month === lastM).forEach(i => { const key = i.source + (isHane() ? '|' + i.profile : ''); bySrc[key] = bySrc[key] || { name: i.source, v: 0, profile: i.profile }; bySrc[key].v += i.amount; });
    Object.values(bySrc).forEach(s => { if (!has('gelir', s.name)) out.push({ kind: 'gelir', name: s.name, amount: s.v, scope: isHane() ? s.profile : scope, txt: `${s.name} ${tl0(s.v)}, her ay${isHane() ? ' (' + profName(s.profile) + ')' : ''}` }); });
  }
  // Kart harcaması tahmini: son 3 ekstre ayının taksitsiz harcama ortalaması
  if (!items.some(it => it.auto === 'kart')) {
    const ms = [...new Set(S.statements.filter(s => !s.manual && inProfile(s)).map(s => s.month))].sort().slice(-3);
    if (ms.length) {
      const tot = ms.reduce((a, m) => a + spendRows(stmtsOf(m).filter(s => !s.manual)).filter(r => !r.t.taksitToplam).reduce((x, r) => x + amtTL(r.t, r.st), 0), 0);
      const avg = Math.round(tot / ms.length / 100) * 100;
      if (avg > 0) out.push({ kind: 'gider', name: 'Kart harcaması (tahmini)', amount: avg, scope: isHane() ? 'hane' : scope, auto: 'kart', txt: `Taksitsiz kart harcaması ~${tl0(avg)}/ay (son ${ms.length} ay ort.)` });
    }
  }
  if (!items.some(it => it.auto === 'nakit')) {
    const ms = [...new Set(S.statements.filter(s => s.manual && inProfile(s)).map(s => s.month))].sort().slice(-3);
    if (ms.length) {
      const avg = Math.round(ms.reduce((a, m) => a + stmtsOf(m).filter(s => s.manual).reduce((x, s) => x + s.tx.reduce((y, t) => y + t.tl, 0), 0), 0) / ms.length / 100) * 100;
      if (avg > 0) out.push({ kind: 'gider', name: 'Kart dışı harcamalar (tahmini)', amount: avg, scope: isHane() ? 'hane' : scope, auto: 'nakit', txt: `Kart dışı harcama ~${tl0(avg)}/ay` });
    }
  }
  return out;
}
const spanText = it => it.months === 1 ? `${mShort(it.start)}, tek sefer` : !it.months ? `${mShort(it.start)} itibarıyla her ay` : `${mShort(it.start)} – ${mShort(addM(it.start, it.months - 1))}, ${it.months} ay`;

function itemsCard() {
  const items = visibleItems().slice().sort((a, b) => (a.kind === b.kind ? b.amount - a.amount : a.kind === 'gelir' ? -1 : 1));
  const sug = suggestions();
  const row = it => `<li onclick="editPlanItem('${it.id}')" style="cursor:pointer"><span style="min-width:0"><b>${esc(it.name)}</b>${isHane() ? `<span class="pill">${esc(scopeLabel(it.scope))}</span>` : ''}<br><span class="sub">${spanText(it)}</span></span>
    <b class="${it.kind === 'gelir' ? 'pos' : ''}" style="white-space:nowrap">${it.kind === 'gelir' ? '+' : '−'}${nf.format(it.amount)}</b></li>`;
  return `<section class="card"><h2>Plan kalemleri<small>dokun, düzenle</small></h2>
    ${sug.length ? `<div class="sugs"><span class="sub">Öneriler:</span>${sug.map((s, i) => `<button class="chip sug" onclick="addSuggestion(${i})">+ ${esc(s.txt)}</button>`).join('')}</div>` : ''}
    ${items.length ? `<ul class="list-plain">${items.map(row).join('')}</ul>` : '<p class="sub">Henüz gelir ya da gider eklemedin.</p>'}
    <div class="row" style="gap:8px;margin-top:12px"><button class="btn ghost" style="flex:1" onclick="editPlanItem(null,'gelir')">+ Gelir</button>
      <button class="btn ghost" style="flex:1" onclick="editPlanItem(null,'gider')">+ Gider</button></div></section>`;
}

let lastCalc = null;
function viewPlan() {
  const calc = lastCalc = planCalc();
  const { rows } = calc;
  const range = `${mShort(rows[0].m)} – ${mShort(rows[rows.length - 1].m)}`;
  const monthOpts = Array.from({ length: 15 }, (_, i) => addM(nowMonth(), i - 3));
  if (!monthOpts.includes(planStart())) monthOpts.unshift(planStart());
  return `
  <div class="plan-ctl">
    <label class="sub" for="pStart">Başlangıç</label>
    <select class="inp" id="pStart" onchange="setPlan('start', this.value)">${monthOpts.map(m => `<option value="${m}" ${m === planStart() ? 'selected' : ''}>${mLabel(m)}${m === nowMonth() ? ' (bu ay)' : ''}</option>`).join('')}</select>
    <div class="seg" role="group" aria-label="Plan süresi">${[3, 6, 12].map(n => `<button aria-pressed="${S.plan.horizon === n}" onclick="setPlan('horizon',${n})">${n} ay</button>`).join('')}</div>
  </div>

  <section class="card" id="pv-flow"><h2>Nakit akışı<small>${range}</small><button class="pngbtn noexp" onclick="exportPlanPart('akis')" aria-label="Nakit akışını PNG kaydet">${DL_ICON}PNG</button></h2>
    ${planStats(calc)}
    ${flowChart(rows)}
    ${flowLegend(rows)}
    <p class="sub noexp" style="margin:8px 0 0">Bir aya dokununca o ayın bilançosuna gidersin.</p></section>

  <section class="card" id="pv-ledger"><h2>Aylık bilanço<small>devirler dahil</small><button class="pngbtn noexp" onclick="exportPlanPart('bilanco')" aria-label="Aylık bilançoyu PNG kaydet">${DL_ICON}PNG</button></h2>
    ${ledgerHTML(calc)}
    <p class="sub noexp" style="margin:0">Devir satırına dokunarak tutarı elle değiştirebilirsin; sonraki aylar yeni tutardan hesaplanır. Bir ayın kart ekstreleri yüklenince o ay gerçekleşen değerlerle hesaplanır ve farkı sonraki aylara devreder.</p></section>

  <section class="card" id="pv-tak"><h2>Taksit takvimi<small>ekstrelerden</small><button class="pngbtn noexp" onclick="exportPlanPart('taksit')" aria-label="Taksit takvimini PNG kaydet">${DL_ICON}PNG</button></h2>
    ${ganttHTML(calc)}</section>

  <section class="card" id="pv-dist"><h2>Gider nereye gidecek?<small>${range} toplamı</small><button class="pngbtn noexp" onclick="exportPlanPart('gider')" aria-label="Gider dağılımını PNG kaydet">${DL_ICON}PNG</button></h2>
    ${spendBreakdown(calc)}</section>

  ${itemsCard()}

  <button class="btn block" style="margin:0 0 8px" onclick="openExportMenu()">${DL_ICON}Plan görsellerini kaydet</button>`;
}

/* ---------- Plan ve gerçekleşen karşılaştırması ---------- */
function compareBody(r, calc) {
  const a = r.act, mName = MONTHS[+r.m.slice(5) - 1];
  const miss = () => a.missing.map(x => `${esc(x.bank)}${isHane() ? ' (' + esc(profName(x.profile)) + ')' : ''}`).join(', ');
  if (!r.real) {
    if (a.status === 'partial') return `<p class="insight">${mName} için <b>${miss()}</b> ekstresi henüz yüklenmedi. Tüm kartların ekstresi gelene kadar bu ay plan değerleriyle hesaplanıyor.</p>
      <button class="btn ghost block noexp" onclick="setReal('${r.m}','on')">Eksik olsa da gerçekleşen olarak say</button>`;
    if (a.status === 'waiting') return `<p class="insight">${mName} ayının kart ekstreleri henüz yüklenmedi; bu ay plan değerleriyle hesaplanıyor.</p>`;
    if (a.status === 'off') return `<p class="insight">${mName} ayını plan değerleriyle hesaplamayı seçtin; yüklü ekstreler bu ayın bilançosuna yansımıyor.</p>
      <button class="btn ghost block noexp" onclick="setReal('${r.m}',null)">Gerçekleşen değerleri kullan</button>`;
    return `<p class="insight">${mName} henüz gerçekleşmedi.</p>`;
  }
  const pX = r.pTak + r.pGider, aX = r.takT + r.giderT, dX = aX - pX, dG = r.gelirT - r.pGelir;
  const pNet = r.pGelir - pX, aNet = r.gelirT - aX;
  const lines = [...a.incLines.map(l => ({ ...l, inc: true })), ...a.lines];
  const real = lines.filter(l => l.src !== 'varsayıldı' && Math.abs(l.act - l.plan) >= 1);
  const big = real.sort((x, y) => Math.abs(y.act - y.plan) - Math.abs(x.act - x.plan))[0];
  const last = calc.rows[calc.rows.length - 1];
  let s = Math.abs(dX) < 1 ? `${mName} ayında planladığın kadar harcadın.` :
    `${mName} ayında planın <b class="${dX > 0 ? 'neg' : 'pos'}">${nf0.format(Math.abs(dX))} ₺ ${dX > 0 ? 'üzerinde' : 'altında'}</b> harcadın.`;
  if (Math.abs(dG) >= 1) s += ` Gelir planın <b class="${dG < 0 ? 'neg' : 'pos'}">${nf0.format(Math.abs(dG))} ₺ ${dG < 0 ? 'altında' : 'üzerinde'}</b> gerçekleşti.`;
  if (big) s += ` En büyük sapma <b>${esc(big.name)}</b>: planlanan ${nf0.format(big.plan)} ₺ yerine ${nf0.format(big.act)} ₺.`;
  if (last !== r && Math.abs(last.bal - last.planBal) >= 1)
    s += ` Bu fark sonraki aylara devredildi: dönem sonu tahmini <b>${sgn0(last.bal)} ₺</b> (ilk planda ${sgn0(last.planBal)} ₺).`;
  const max = Math.max(1, ...lines.map(l => Math.max(l.plan, Math.abs(l.act))));
  const row = l => {
    const d = l.act - l.plan, bad = l.inc ? d < 0 : d > 0;
    const cls = l.inc ? 'm-gelir' : l.id === '__tak' ? 'm-taksit' : 'm-gider';
    return `<li class="cmpline" onclick="editActual('${r.m}','${esc(l.id).replace(/'/g, "\\'")}')">
      <div class="row"><span class="nm">${esc(l.name)}${l.src === 'varsayıldı' ? ' <span class="tag">varsayıldı</span>' : l.src === 'elle' ? ' <span class="tag">elle</span>' : ''}</span>
        <b class="${Math.abs(d) < 1 ? '' : bad ? 'neg' : 'pos'}">${Math.abs(d) < 1 ? 'planda' : sgn0(d) + ' ₺'}</b></div>
      <div class="pbar"><i class="pl" style="width:${l.plan / max * 100}%"></i><i class="ac ${cls}" style="width:${Math.max(0, l.act) / max * 100}%"></i></div>
      <div class="sub">Plan ${nf0.format(l.plan)} · Gerçekleşen ${nf0.format(l.act)}${l.src !== 'varsayıldı' && l.src !== 'elle' ? ' · ' + l.src : ''}</div></li>`;
  };
  const sharedNote = !isHane() && S.plan.items.some(it => it.scope === 'hane')
    ? `<p class="sub" style="margin-top:-2px">Ortak (hane) plan kalemleri bu kişisel görünümde yer almaz; tam karşılaştırma için Hane sekmesine geç.</p>` : '';
  return `<p class="insight">${s}</p>${sharedNote}
    <table class="cmptab"><thead><tr><th></th><th>Plan</th><th>Gerçekleşen</th><th>Fark</th></tr></thead><tbody>
      <tr><th>Gelir</th><td>${nf0.format(r.pGelir)}</td><td>${nf0.format(r.gelirT)}</td><td class="${dG < -0.5 ? 'neg' : dG > 0.5 ? 'pos' : ''}">${sgn0(dG)}</td></tr>
      <tr><th>Gider</th><td>${nf0.format(pX)}</td><td>${nf0.format(aX)}</td><td class="${dX > 0.5 ? 'neg' : dX < -0.5 ? 'pos' : ''}">${sgn0(dX)}</td></tr>
      <tr><th>Ay sonucu</th><td>${sgn0(pNet)}</td><td>${sgn0(aNet)}</td><td class="${aNet - pNet < -0.5 ? 'neg' : aNet - pNet > 0.5 ? 'pos' : ''}">${sgn0(aNet - pNet)}</td></tr>
      <tr class="bal"><th>Bilanço</th><td>${sgn0(r.planBal)}</td><td>${sgn0(r.bal)}</td><td class="${r.bal - r.planBal < -0.5 ? 'neg' : r.bal - r.planBal > 0.5 ? 'pos' : ''}">${sgn0(r.bal - r.planBal)}</td></tr>
    </tbody></table>
    <p class="sub" style="margin:4px 0 12px">Tutarlar ₺. Bilanço önceki aylardan gelen devri de içerir.</p>
    <div class="legend" style="margin:0 0 4px"><span><i class="lg lg-planbar"></i>Plan</span><span><i class="lg m-gider"></i>Gerçekleşen</span></div>
    <ul class="cmplist">${lines.map(row).join('')}</ul>
    ${a.assumed ? `<p class="sub">"varsayıldı" etiketli kalemler ekstrede ya da girilen kayıtlarda bulunamadı; plandaki tutarla gerçekleştiği kabul edildi.<span class="noexp"> Dokunup gerçek tutarı girebilirsin.</span></p>` : ''}
    <p class="sub noexp">Eşleştirme: taksitler ve "kart harcaması" ekstreden, "kart dışı" kalemler Ekle sekmesindeki kayıtlardan, gelirler girilen gelirlerden gelir. Kalem adıyla aynı adı taşıyan kart dışı kayıt ya da gelir o kaleme sayılır.</p>
    ${a.forced === 'on' ? `<button class="btn ghost block noexp" onclick="setReal('${r.m}',null)">Eksik ekstre kontrolüne dön</button>` :
      `<button class="btn ghost block noexp" onclick="setReal('${r.m}','off')">Bu ayı plan değerleriyle hesapla</button>`}`;
}
const statusBadge = r => r.real ? '<span class="badge">✓ Gerçekleşti</span>' : r.act.status === 'partial' ? '<span class="badge warn">Ekstre eksik</span>'
  : r.act.status === 'waiting' ? '<span class="badge warn">Ekstre bekleniyor</span>' : r.act.status === 'off' ? '<span class="badge warn">Plan değeri</span>' : '';
// Özet sayfası kartı
function planCompareCard(k) {
  if (!k || !visibleItems().length) return '';
  const calc = planCalc(); const r = calc.rows.find(x => x.m === k);
  if (!r || r.act.status === 'plan') return '';
  return `<section class="card" id="ov-cmp"><h2>Plan ile karşılaştırma<small>${statusBadge(r)}</small>${r.real ? `<button class="pngbtn noexp" onclick="exportCompare('${k}')" aria-label="Karşılaştırmayı PNG kaydet">${DL_ICON}PNG</button>` : ''}</h2>
    ${compareBody(r, calc)}
    <button class="btn block noexp" style="margin-top:8px" onclick="go('plan')">Planı aç</button></section>`;
}
window.openCompare = m => {
  const calc = planCalc(); const r = calc.rows.find(x => x.m === m); if (!r) return;
  openSheet(`<h3>${mLabel(m)}: plan ve gerçekleşen</h3><div style="margin:6px 0 10px">${statusBadge(r)}</div>${compareBody(r, calc)}
    ${r.real ? `<button class="btn block" onclick="exportCompare('${m}')">${DL_ICON}PNG kaydet</button>` : ''}`);
};
window.setReal = (m, v) => {
  const ck = `${planScope()}|${m}`;
  if (v) S.plan.real[ck] = v; else delete S.plan.real[ck];
  savePlan(); closeSheet(true); render();
  toast(v === 'off' ? 'Bu ay plan değerleriyle hesaplanıyor' : 'Gerçekleşen değerler kullanılıyor; sonraki aylar güncellendi');
};
window.editActual = (m, id) => {
  const calc = planCalc(); const r = calc.rows.find(x => x.m === m); if (!r || !r.real) return;
  const l = [...r.act.incLines.map(x => ({ ...x, inc: true })), ...r.act.lines].find(x => x.id === id); if (!l) return;
  const key = `${planScope()}|${m}|${id}`, has = S.plan.act[key] != null;
  openSheet(`<h3>${esc(l.name)} · ${mLabel(m)}</h3>
    <p class="sub">Plan: ${tl(l.plan)}. Şu an gerçekleşen: ${tl(l.act)} (${esc(l.src)}).</p>
    <label class="f" for="avIn">Gerçekleşen tutar (₺)</label><input class="inp" id="avIn" inputmode="decimal" value="${nf.format(Math.abs(l.act))}">
    <button class="btn block" id="avSave">Kaydet</button>
    ${has ? '<button class="btn ghost block" id="avReset">Otomatik hesaba dön</button>' : ''}
    <p class="sub" style="margin-top:12px">Elle girilen tutar bu ayın bilançosunu ve sonraki ayların devrini değiştirir.</p>`);
  $('#avSave').onclick = () => {
    const v = parseNum($('#avIn').value);
    if (!isFinite(v) || v < 0) return toast('Geçerli bir tutar gir, örneğin 12.500');
    S.plan.act[key] = v; savePlan(); closeSheet(true); render(); toast('Gerçekleşen tutar güncellendi');
  };
  const rs = $('#avReset'); if (rs) rs.onclick = () => { delete S.plan.act[key]; savePlan(); closeSheet(true); render(); toast('Otomatik hesaba dönüldü'); };
};
window.exportCompare = async m => {
  const calc = planCalc(); const r = calc.rows.find(x => x.m === m); if (!r) return;
  toast('Görsel hazırlanıyor…', 1500);
  try {
    const url = await renderPoster('Plan ve gerçekleşen', `${esc(isHane() ? 'Hane' : profName(S.profile))} · ${mLabel(m)}`, compareBody(r, calc));
    await saveImages([{ url, name: `ekstrem-karsilastirma-${m}-${fileTag()}.png` }]);
  } catch (e) { console.error(e); toast('Görsel oluşturulamadı: ' + (e.message || e), 4000); }
};

/* ---------- Plan: eylemler ---------- */
window.setPlan = (k, v) => { S.plan[k] = v; savePlan(); render(); };
window.planFocus = m => {
  const el = document.getElementById('mb-' + m); if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
};
window.toggleInst = key => {
  const g = (lastCalc ? lastCalc.allInst : []).find(x => x.key === key); if (!g) return;
  const off = !!S.plan.excl[key];
  openSheet(`<h3>${esc(g.name)}</h3><p class="sub">${esc(srcLabel(g.t, g.st))} · aylık ${tl(g.amount)} · ${g.of} taksit</p>
    <p>${off ? 'Bu taksit şu an plana dahil değil.' : 'Bu taksit, kalan ayları boyunca plana gider olarak ekleniyor.'}</p>
    <button class="btn block" id="tiGo">${off ? 'Plana geri ekle' : 'Plandan çıkar (erken kapattım)'}</button>
    <button class="btn ghost block" onclick="closeSheet()">Vazgeç</button>`);
  $('#tiGo').onclick = () => { if (off) delete S.plan.excl[key]; else S.plan.excl[key] = true; savePlan(); closeSheet(true); render(); };
};
window.editCarry = m => {
  const r = lastCalc.rows.find(x => x.m === m); if (!r) return;
  const first = r.idx === 0;
  let sign = r.carry < 0 ? -1 : 1;
  openSheet(`<h3>${first ? 'Başlangıç bakiyesi' : 'Devir'} · ${mLabel(m)}</h3>
    <p class="sub">${first ? 'Planın ilk ayına elindeki parayla (ya da borçla) başla.' : `Otomatik hesap: ${mShort(addM(m, -1))} bilançosu ${sgn(r.autoCarry)} ₺.`}
      Artı tutar ${MONTHS[+m.slice(5) - 1]} ayına gelir, eksi tutar gider olarak eklenir.</p>
    <div class="seg" role="group" aria-label="Yön" style="margin-top:12px">
      <button style="flex:1" data-sign="1" aria-pressed="${sign > 0}">Artı (gelir)</button><button style="flex:1" data-sign="-1" aria-pressed="${sign < 0}">Eksi (gider)</button></div>
    <label class="f" for="cv">Tutar (₺)</label><input class="inp" id="cv" inputmode="decimal" value="${nf.format(Math.abs(r.carry))}">
    <button class="btn block" id="cvSave">Devri kaydet</button>
    ${r.carryManual ? `<button class="btn ghost block" id="cvAuto">Otomatik hesaba dön${first ? ' (0 ₺)' : ` (${sgn(r.autoCarry)} ₺)`}</button>` : ''}`);
  document.querySelectorAll('[data-sign]').forEach(b => b.onclick = () => { sign = +b.dataset.sign; document.querySelectorAll('[data-sign]').forEach(x => x.setAttribute('aria-pressed', x === b)); });
  const ck = `${planScope()}|${m}`;
  $('#cvSave').onclick = () => {
    const v = parseNum($('#cv').value);
    if (!isFinite(v)) return toast('Geçerli bir tutar gir, örneğin 2.500,00');
    S.plan.carry[ck] = sign * Math.abs(v); savePlan(); closeSheet(true); render(); toast('Devir güncellendi; sonraki aylar yeniden hesaplandı');
  };
  const au = $('#cvAuto'); if (au) au.onclick = () => { delete S.plan.carry[ck]; savePlan(); closeSheet(true); render(); toast('Devir otomatik hesaba döndü'); };
};
window.addSuggestion = i => {
  const s = suggestions()[i]; if (!s) return;
  S.plan.items.push({ id: 'p' + Date.now(), kind: s.kind, name: s.name, amount: s.amount, start: planStart(), months: 0, scope: s.scope, auto: s.auto });
  savePlan(); render(); toast(`${s.name} plana eklendi`);
};
const NAME_SUG = { gelir: ['Maaş', 'Ek gelir', 'Prim / ikramiye', 'Kira geliri', 'Burs', 'Yatırım getirisi'],
  gider: ['Kira', 'Aidat', 'Faturalar', 'Market', 'Kredi taksidi', 'Okul / kurs', 'Sigorta', 'Yakıt', 'Tatil', 'Birikim', 'Kart harcaması (tahmini)'] };
window.editPlanItem = (id, kind) => {
  const ex = id ? S.plan.items.find(x => x.id === id) : null;
  const it = ex || { kind: kind || 'gider', name: '', amount: 0, start: planStart(), months: 0, scope: isHane() ? 'hane' : S.profile };
  let k = it.kind;
  const rep = it.months === 1 ? 'once' : !it.months ? 'monthly' : 'n';
  const monthOpts = Array.from({ length: 18 }, (_, i) => addM(nowMonth(), i - 3));
  if (!monthOpts.includes(it.start)) monthOpts.unshift(it.start);
  openSheet(`<h3>${ex ? 'Kalemi düzenle' : 'Plana kalem ekle'}</h3>
    <div class="seg" role="group" aria-label="Tür" style="margin-top:10px">
      <button style="flex:1" data-kind="gelir" aria-pressed="${k === 'gelir'}">Gelir</button><button style="flex:1" data-kind="gider" aria-pressed="${k === 'gider'}">Gider</button></div>
    <label class="f" for="piName">Ad</label><input class="inp" id="piName" list="piNames" value="${esc(it.name)}" placeholder="Örn. maaş, kira, okul taksidi" autocomplete="off">
    <datalist id="piNames"></datalist>
    <label class="f" for="piAmt">Aylık tutar (₺)</label><input class="inp" id="piAmt" inputmode="decimal" value="${it.amount ? nf.format(it.amount) : ''}" placeholder="0,00">
    <div class="row" style="gap:10px;align-items:flex-end">
      <div style="flex:1"><label class="f" for="piStart">Başlangıç ayı</label><select class="inp" id="piStart">${monthOpts.map(m => `<option value="${m}" ${m === it.start ? 'selected' : ''}>${mLabel(m)}</option>`).join('')}</select></div>
      <div style="flex:1"><label class="f" for="piRep">Tekrar</label><select class="inp" id="piRep">
        <option value="monthly" ${rep === 'monthly' ? 'selected' : ''}>Her ay (süresiz)</option>
        <option value="n" ${rep === 'n' ? 'selected' : ''}>Belirli sayıda ay</option>
        <option value="once" ${rep === 'once' ? 'selected' : ''}>Tek seferlik</option></select></div></div>
    <div id="piNWrap" ${rep === 'n' ? '' : 'hidden'}><label class="f" for="piN">Kaç ay sürecek</label><input class="inp" id="piN" inputmode="numeric" value="${it.months > 1 ? it.months : 3}"></div>
    ${isHane() ? `<label class="f" for="piScope">Kime ait</label><select class="inp" id="piScope">${[...S.profiles.map(p => [p.id, p.name]), ['hane', 'Ortak (hane)']].map(([v, l]) => `<option value="${v}" ${v === it.scope ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>` : ''}
    <button class="btn block" id="piSave">${ex ? 'Değişiklikleri kaydet' : 'Plana ekle'}</button>
    ${ex ? '<button class="btn danger block" id="piDel">Kalemi sil</button>' : ''}`);
  const fillNames = () => { $('#piNames').innerHTML = NAME_SUG[k].map(n => `<option>${esc(n)}</option>`).join(''); };
  fillNames();
  document.querySelectorAll('[data-kind]').forEach(b => b.onclick = () => { k = b.dataset.kind; fillNames(); document.querySelectorAll('[data-kind]').forEach(x => x.setAttribute('aria-pressed', x === b)); });
  $('#piRep').onchange = e => { $('#piNWrap').hidden = e.target.value !== 'n'; };
  $('#piSave').onclick = () => {
    const name = $('#piName').value.trim(), amount = parseNum($('#piAmt').value);
    if (!name) return toast('Kaleme bir ad ver, örneğin "Kira".');
    if (!isFinite(amount) || amount <= 0) return toast('Geçerli bir tutar gir, örneğin 15.000');
    const r = $('#piRep').value, n = parseInt($('#piN').value, 10);
    if (r === 'n' && !(n >= 2)) return toast('Ay sayısı en az 2 olmalı.');
    const data = { kind: k, name, amount: Math.round(amount * 100) / 100, start: $('#piStart').value, months: r === 'once' ? 1 : r === 'monthly' ? 0 : n,
      scope: isHane() ? $('#piScope').value : S.profile };
    if (ex) Object.assign(ex, data); else S.plan.items.push({ id: 'p' + Date.now(), ...data });
    savePlan(); closeSheet(true); render(); toast(ex ? 'Kalem güncellendi' : `${name} plana eklendi`);
  };
  const del = $('#piDel'); if (del) del.onclick = () => { S.plan.items = S.plan.items.filter(x => x !== ex); savePlan(); closeSheet(true); render(); toast('Kalem silindi'); };
};

/* ---------- Plan: görsel ---------- */
const planFileBase = () => `ekstrem-plan-${planStart()}-${S.plan.horizon}ay-${fileTag()}`;
// Aylık bilançonun görsel için sıkı tablo hâli (6'şar aylık bloklar)
function balanceTable(calc) {
  const f = v => Math.abs(v) >= 1e6 ? (Math.abs(v) / 1e6).toLocaleString('tr-TR', { maximumFractionDigits: 2 }) + ' mn' : nf0.format(Math.abs(v));
  const s = v => (v > 0.5 ? '+' : v < -0.5 ? '−' : '') + f(v);
  const chunks = []; for (let i = 0; i < calc.rows.length; i += 3) chunks.push(calc.rows.slice(i, i + 3));
  const items = visibleItems().filter(it => calc.rows.some(r => itemActive(it, r.m)));
  const itemLine = it => `<li><span>${esc(it.name)}${isHane() ? ` <span class="pill">${esc(scopeLabel(it.scope))}</span>` : ''}<br><span class="sub">${spanText(it)}</span></span><b>${it.kind === 'gelir' ? '+' : '−'}${nf0.format(it.amount)} ₺</b></li>`;
  return chunks.map(ch => `<table class="btab"><thead><tr><th></th>${ch.map(r => `<th>${mLabel(r.m).replace(/ (\d{2})(\d{2})$/, ' $2')}${r.real ? ' ✓' : ''}</th>`).join('')}</tr></thead><tbody>
      <tr><th>Devir</th>${ch.map(r => `<td class="${r.carry < 0 ? 'neg' : ''}">${s(r.carry)}</td>`).join('')}</tr>
      <tr><th>Gelir</th>${ch.map(r => `<td>${r.gelirT ? '+' + f(r.gelirT) : '–'}</td>`).join('')}</tr>
      <tr><th>Taksit</th>${ch.map(r => `<td>${r.takT ? '−' + f(r.takT) : '–'}</td>`).join('')}</tr>
      <tr><th>${calc.anyReal ? 'Diğer gider' : 'Planlı gider'}</th>${ch.map(r => `<td>${r.giderT ? '−' + f(r.giderT) : '–'}</td>`).join('')}</tr>
      <tr class="bal"><th>Bilanço</th>${ch.map(r => `<td class="${r.bal < 0 ? 'neg' : 'pos'}">${s(r.bal)}</td>`).join('')}</tr>
      ${calc.anyReal ? `<tr class="pl"><th>İlk plan</th>${ch.map(r => `<td>${s(r.planBal)}</td>`).join('')}</tr>` : ''}
    </tbody></table>`).join('') +
    `<p class="sub" style="margin:10px 0 0">Tutarlar ₺. Artı bilanço sonraki aya gelir, eksi bilanço gider olarak devreder.${calc.anyReal ? ' ✓ işaretli aylarda gerçekleşen değerler kullanıldı; "İlk plan" satırı gerçekleşmeler olmadan planlanan bilançodur.' : ''}</p>` +
    (items.length ? `<h3 class="bt-h">Plan kalemleri</h3><ul class="list-plain bt-items">${items.map(itemLine).join('')}</ul>` : '');
}
const PARTS = {
  akis: { title: 'Nakit akışı', body: c => planStats(c) + flowChart(c.rows) + flowLegend(c.rows) },
  tablo: { title: 'Aylık bilanço', body: c => balanceTable(c) },
  fis: { title: 'Aylık bilanço fişi', body: c => ledgerHTML(c) },
  taksit: { title: 'Taksit takvimi', body: c => ganttHTML(c) },
  gider: { title: 'Gider nereye gidecek?', body: c => spendBreakdown(c) },
};
async function renderPoster(title, sub, body) {
  const host = document.createElement('div'); host.className = 'poster-host';
  host.innerHTML = `<div class="poster">
    <div class="p-head"><div class="p-brand">Ekstrem</div><div class="p-title">${title}</div><div class="p-range">${sub}</div></div>
    <section class="card">${body}</section>
    <div class="p-foot">Oluşturulma ${dTR(new Date().toISOString().slice(0, 10))} · Ekstrem</div></div>`;
  document.body.appendChild(host);
  try { return await nodeToPng(host.firstElementChild); } finally { host.remove(); }
}
async function renderPart(key) {
  const calc = planCalc(), rows = calc.rows, p = PARTS[key];
  return renderPoster(p.title, `${esc(isHane() ? 'Hane' : profName(S.profile))} · ${mLabel(rows[0].m)} – ${mLabel(rows[rows.length - 1].m)}`, p.body(calc));
}
window.exportPlanPart = async key => {
  if (key === 'bilanco') {
    openSheet(`<h3>Aylık bilançoyu kaydet</h3><p class="sub">Tablo tek bakışta okunur; fiş her kalemi ay ay listeler ama uzun bir görsel olur.</p>
      <button class="btn block" onclick="closeSheet(true);exportPlanPart('tablo')">Tablo olarak (önerilen)</button>
      <button class="btn ghost block" onclick="closeSheet(true);exportPlanPart('fis')">Fiş olarak</button>`);
    return;
  }
  toast('Görsel hazırlanıyor…', 1500);
  try { await saveImages([{ url: await renderPart(key), name: `${planFileBase()}-${key}.png` }]); }
  catch (e) { console.error(e); toast('Görsel oluşturulamadı: ' + (e.message || e), 4000); }
};
window.openExportMenu = () => {
  openSheet(`<h3>Plan görsellerini kaydet</h3><p class="sub">Her panel telefon ekranına uygun ayrı bir görsel olarak kaydedilir.</p>
    ${[['akis', 'Nakit akışı', 'grafik ve özet'], ['tablo', 'Aylık bilanço', 'ay ay tablo ve kalemler'], ['fis', 'Aylık bilanço fişi', 'her ayın dökümü, uzun'], ['taksit', 'Taksit takvimi', 'hangi taksit ne zaman bitiyor'], ['gider', 'Gider dağılımı', 'toplam giderin kalemlere göre payı']]
      .map(([k, t, d]) => `<button class="expopt" onclick="closeSheet(true);exportPlanPart('${k}')"><b>${t}</b><span>${d}</span>${DL_ICON}</button>`).join('')}
    <button class="btn block" onclick="closeSheet(true);exportAllParts()">Hepsini ayrı görseller olarak kaydet</button>`);
};
window.exportAllParts = async () => {
  toast('Görseller hazırlanıyor…', 2500);
  try {
    const list = [];
    for (const k of ['akis', 'tablo', 'taksit', 'gider']) list.push({ url: await renderPart(k), name: `${planFileBase()}-${k}.png` });
    await saveImages(list);
  } catch (e) { console.error(e); toast('Görseller oluşturulamadı: ' + (e.message || e), 4000); }
};
