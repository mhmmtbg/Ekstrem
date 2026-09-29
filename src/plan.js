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
const SVG_PROPS = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-linejoin', 'stroke-linecap', 'opacity', 'font-size', 'font-weight', 'font-family', 'paint-order'];
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
async function saveImage(dataUrl, name) {
  const cap = window.Capacitor;
  const b64 = dataUrl.split(',')[1];
  let uri = null, where = '';
  if (cap && cap.isNativePlatform && cap.isNativePlatform() && cap.nativePromise) {
    try {
      const r = await cap.nativePromise('Filesystem', 'writeFile', { path: 'Ekstrem/' + name, data: b64, directory: 'DOCUMENTS', recursive: true });
      uri = r.uri; where = `Telefonda Belgeler › Ekstrem klasörüne kaydedildi: ${name}`;
    } catch (e) {
      try { const r = await cap.nativePromise('Filesystem', 'writeFile', { path: name, data: b64, directory: 'CACHE' }); uri = r.uri; } catch (e2) { /* paylaşım yine denenir */ }
    }
  }
  let file = null; try { file = new File([dataUrlToBlob(dataUrl)], name, { type: 'image/png' }); } catch (e) { /* eski tarayıcı */ }
  const nativeShare = !!(uri && cap && cap.nativePromise);
  const webShare = !nativeShare && file && navigator.canShare && navigator.canShare({ files: [file] });
  openSheet(`<h3>Görsel hazır</h3><p class="sub">${esc(where || name)}</p>
    <img src="${dataUrl}" alt="Kaydedilen görselin önizlemesi" class="png-preview">
    ${nativeShare || webShare ? '<button class="btn block" id="imgShare">Paylaş (WhatsApp, Galeri, Drive…)</button>' : ''}
    ${where ? '' : '<button class="btn ghost block" id="imgDl">Cihaza indir</button>'}
    <button class="btn ghost block" onclick="closeSheet()">Kapat</button>`);
  const sh = $('#imgShare');
  if (sh) sh.onclick = async () => {
    try {
      if (nativeShare) await cap.nativePromise('Share', 'share', { title: name, files: [uri], dialogTitle: 'Görseli paylaş' });
      else await navigator.share({ files: [file], title: name });
    } catch (e) { if (!/cancel|abort/i.test(String(e && (e.message || e.name)))) toast('Paylaşım açılamadı: ' + (e.message || e), 4000); }
  };
  const dl = $('#imgDl');
  if (dl) dl.onclick = () => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(dataUrlToBlob(dataUrl)); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    toast('İndirme başlamadıysa bu uygulama sürümü dosya indirmeyi desteklemiyor; ekran görüntüsü alabilirsin.', 5000);
  };
}
const fileTag = () => slug(isHane() ? 'hane' : profName(S.profile));
window.exportReceipt = () => exportNode($('#main .receipt-wrap'), `ekstrem-fis-${S.month}-${fileTag()}.png`);

/* ---------- Plan: hesap ---------- */
const addM = (k, n) => { let [y, m] = k.split('-').map(Number); m += n; y += Math.floor((m - 1) / 12); m = ((m - 1) % 12 + 12) % 12 + 1; return y + '-' + String(m).padStart(2, '0'); };
const mDiff = (a, b) => { const [y1, m1] = a.split('-').map(Number), [y2, m2] = b.split('-').map(Number); return (y2 - y1) * 12 + (m2 - m1); };
const nowMonth = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
const planStart = () => S.plan.start || nowMonth();
const planMonths = () => Array.from({ length: S.plan.horizon }, (_, i) => addM(planStart(), i));
const planScope = () => isHane() ? 'hane' : S.profile;
const savePlan = () => saveKV('plan', S.plan);
const sgn = v => (v > 0.004 ? '+' : v < -0.004 ? '−' : '') + nf.format(Math.abs(v));
const sgn0 = v => (v > 0.5 ? '+' : v < -0.5 ? '−' : '') + nf0.format(Math.abs(v));
const kfmt = v => { const a = Math.abs(v); return (a >= 1000 ? (a / 1000).toLocaleString('tr-TR', { maximumFractionDigits: a >= 10000 ? 0 : 1 }) + 'k' : nf0.format(a)); };
const itemActive = (it, m) => { const d = mDiff(it.start, m); return d >= 0 && (!it.months || d < it.months); };
const visibleItems = () => S.plan.items.filter(it => isHane() || it.scope === S.profile);
const scopeLabel = s => s === 'hane' ? 'Ortak' : profName(s);

// Yüklü son ekstrelerden kalan taksitleri gelecek aylara yay
function autoInstallments() {
  const latest = {};
  for (const st of S.statements) {
    if (st.manual || !inProfile(st)) continue;
    const parts = st.id.split('_');
    const key = parts[0] + '_' + (parts[2] || '') + '_' + st.profile;
    if (!latest[key] || latest[key].kesim < st.kesim) latest[key] = st;
  }
  const out = [];
  for (const st of Object.values(latest)) for (const t of st.tx) {
    if (t.type !== 'expense' || !t.taksitToplam || !(t.taksitNo < t.taksitToplam)) continue;
    const key = `${st.id}|${t.i}`;
    for (let j = 1; j <= t.taksitToplam - t.taksitNo; j++)
      out.push({ key, month: addM(st.month, j), amount: t.tl, name: merchantKey(t.desc), no: t.taksitNo + j, of: t.taksitToplam, st, t });
  }
  return out;
}

function planCalc() {
  const months = planMonths(), scope = planScope();
  const allInst = autoInstallments().filter(x => months.includes(x.month));
  const inst = allInst.filter(x => !S.plan.excl[x.key]);
  const items = visibleItems();
  const rows = [];
  months.forEach((m, idx) => {
    const tak = inst.filter(x => x.month === m);
    const gider = items.filter(it => it.kind === 'gider' && itemActive(it, m));
    const gelir = items.filter(it => it.kind === 'gelir' && itemActive(it, m));
    const sum = l => l.reduce((a, x) => a + x.amount, 0);
    const autoCarry = idx === 0 ? 0 : rows[idx - 1].bal;
    const ck = `${scope}|${m}`;
    const carryManual = S.plan.carry[ck] != null;
    const carry = carryManual ? S.plan.carry[ck] : autoCarry;
    const takT = sum(tak), giderT = sum(gider), gelirT = sum(gelir);
    const bal = Math.round((gelirT + carry - takT - giderT) * 100) / 100;
    rows.push({ m, idx, tak, takT, gider, giderT, gelir, gelirT, carry, carryManual, autoCarry, bal });
  });
  return { months, rows, inst, allInst, items };
}

/* ---------- Plan: infografikler ---------- */
function flowChart(rows) {
  const W = 360, H = 250, top = 26, bottom = 30, padX = 6;
  const upv = r => r.gelirT + Math.max(r.carry, 0);
  const dnv = r => r.takT + r.giderT + Math.max(-r.carry, 0);
  const maxUp = Math.max(1, ...rows.map(upv), ...rows.map(r => Math.max(r.bal, 0)));
  const maxDn = Math.max(1, ...rows.map(dnv), ...rows.map(r => Math.max(-r.bal, 0)));
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
    pts.push([cx, y0 - r.bal * k, r]);
    labels += `<text class="ax" x="${cx}" y="${H - 9}" text-anchor="middle">${MSHORT[+r.m.slice(5) - 1]}</text>`;
    hits += `<rect class="hit noexp" x="${cx - band / 2}" y="0" width="${band}" height="${H}" onclick="planFocus('${r.m}')"><title>${mLabel(r.m)}: bilanço ${sgn(r.bal)} ₺</title></rect>`;
  });
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const minP = pts.reduce((a, p) => p[2].bal < a[2].bal ? p : a, pts[0]);
  const lastP = pts[pts.length - 1];
  const lbl = (p, anchor) => {
    const above = p[2].bal >= 0 ? p[1] - 9 : p[1] + 16;
    return `<text class="val" x="${p[0]}" y="${above}" text-anchor="${anchor}">${sgn0(p[2].bal)}</text>`;
  };
  const valLabels = lbl(lastP, 'end') + (minP !== lastP && minP[2].bal < 0 ? lbl(minP, 'middle') : '');
  return `<svg class="flow" viewBox="0 0 ${W} ${H}" role="img" aria-label="Aylık gelir, gider ve bilanço grafiği">
    <defs>
      <pattern id="hPos" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" class="hp-bg"/><rect width="2.2" height="5" class="hp-fg"/></pattern>
      <pattern id="hNeg" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(135)"><rect width="5" height="5" class="hn-bg"/><rect width="2.2" height="5" class="hn-fg"/></pattern>
    </defs>
    <line class="zero" x1="0" x2="${W}" y1="${y0}" y2="${y0}"/>
    ${bars}
    <path class="balline" d="${line}"/>
    ${pts.map(p => `<circle class="baldot ${p[2].bal < 0 ? 'neg' : ''}" cx="${p[0]}" cy="${p[1]}" r="4.5"/>`).join('')}
    ${valLabels}${labels}${hits}
  </svg>`;
}
const FLOW_LEGEND = `<div class="legend flowleg">
  <span><i class="lg m-gelir"></i>Gelir</span><span><i class="lg lg-pos"></i>Artı devir</span>
  <span><i class="lg m-taksit"></i>Taksit</span><span><i class="lg m-gider"></i>Planlı gider</span>
  <span><i class="lg lg-neg"></i>Eksi devir</span><span><i class="lg lg-line"></i>Bilanço</span></div>`;

function planStats(calc) {
  const { rows } = calc;
  const tg = rows.reduce((a, r) => a + r.gelirT, 0), tx = rows.reduce((a, r) => a + r.takT + r.giderT, 0);
  const last = rows[rows.length - 1], worst = rows.reduce((a, r) => r.bal < a.bal ? r : a, rows[0]);
  const negs = rows.filter(r => r.bal < 0);
  const sentence = !tg && !tx ? 'Henüz plan kalemi yok. Aşağıdan gelir ve gider ekle; taksitler kendiliğinden gelir.'
    : negs.length ? `${rows.length} ayın ${negs.length}'${negs.length === 1 ? 'inde' : 'sinde'} bilanço eksiye düşüyor; en sıkışık ay <b>${MONTHS[+worst.m.slice(5) - 1]}</b> (<span class="neg">${sgn0(worst.bal)} ₺</span>).`
    : `Plan boyunca her ay artıda kalıyorsun; dönem sonunda <b class="pos">${sgn0(last.bal)} ₺</b> birikmiş oluyor.`;
  return `<p class="insight">${sentence}</p>
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
      return `<section class="mb" id="mb-${r.m}"><hr class="rc-rule">
      <div class="mh">${up(mLabel(r.m))}</div>
      <button class="ln carry" onclick="editCarry('${r.m}')" aria-label="${cLbl} düzenle"><span class="lbl">${cLbl}${r.carryManual ? ' ✎' : ''}</span><span class="dots"></span><span class="v">${sgn(r.carry)}</span><span class="noexp edit" aria-hidden="true">düzenle</span></button>
      ${r.gelir.map(it => rcLine(it.name, '+' + nf.format(it.amount))).join('')}
      ${r.takT ? rcLine(`Kart taksitleri (${r.tak.length})`, '−' + nf.format(r.takT)) : ''}
      ${r.gider.map(it => rcLine(it.name, '−' + nf.format(it.amount))).join('')}
      ${!r.gelir.length && !r.takT && !r.gider.length ? '<div class="ln small"><span class="lbl">Kalem yok</span></div>' : ''}
      <div class="balrow"><span>BİLANÇO</span><b class="${r.bal < 0 ? 'neg' : 'pos'}">${sgn(r.bal)} ₺</b></div>
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
  return `
  <div class="plan-ctl">
    <label class="sub" for="pStart">Başlangıç</label>
    <select class="inp" id="pStart" onchange="setPlan('start', this.value)">${monthOpts.map(m => `<option value="${m}" ${m === planStart() ? 'selected' : ''}>${mLabel(m)}${m === nowMonth() ? ' (bu ay)' : ''}</option>`).join('')}</select>
    <div class="seg" role="group" aria-label="Plan süresi">${[3, 6, 12].map(n => `<button aria-pressed="${S.plan.horizon === n}" onclick="setPlan('horizon',${n})">${n} ay</button>`).join('')}</div>
  </div>

  <section class="card" id="pv-flow"><h2>Nakit akışı<small>${range}</small><button class="pngbtn noexp" onclick="exportPlanPart('pv-flow','akis')" aria-label="Nakit akışını PNG kaydet">${DL_ICON}PNG</button></h2>
    ${planStats(calc)}
    ${flowChart(rows)}
    ${FLOW_LEGEND}
    <p class="sub noexp" style="margin:8px 0 0">Bir aya dokununca o ayın bilançosuna gidersin.</p></section>

  <section class="card" id="pv-ledger"><h2>Aylık bilanço<small>devirler dahil</small><button class="pngbtn noexp" onclick="exportPlanPart('pv-ledger','bilanco')" aria-label="Aylık bilançoyu PNG kaydet">${DL_ICON}PNG</button></h2>
    ${ledgerHTML(calc)}
    <p class="sub noexp" style="margin:0">Devir satırına dokunarak tutarı elle değiştirebilirsin; sonraki aylar yeni tutardan hesaplanır.</p></section>

  <section class="card" id="pv-tak"><h2>Taksit takvimi<small>ekstrelerden</small><button class="pngbtn noexp" onclick="exportPlanPart('pv-tak','taksit')" aria-label="Taksit takvimini PNG kaydet">${DL_ICON}PNG</button></h2>
    ${ganttHTML(calc)}</section>

  <section class="card" id="pv-dist"><h2>Gider nereye gidecek?<small>${range} toplamı</small><button class="pngbtn noexp" onclick="exportPlanPart('pv-dist','gider')" aria-label="Gider dağılımını PNG kaydet">${DL_ICON}PNG</button></h2>
    ${spendBreakdown(calc)}</section>

  ${itemsCard()}

  <button class="btn block" style="margin:0 0 8px" onclick="exportPoster()">${DL_ICON}Planın tamamını tek görsel olarak kaydet</button>`;
}

/* ---------- Plan: eylemler ---------- */
window.setPlan = (k, v) => { S.plan[k] = k === 'start' ? (v === nowMonth() ? null : v) : v; savePlan(); render(); };
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
window.exportPlanPart = (id, part) => exportNode(document.getElementById(id), `${planFileBase()}-${part}.png`);
window.exportPoster = async () => {
  const calc = lastCalc || planCalc(); const { rows } = calc;
  const host = document.createElement('div'); host.className = 'poster-host';
  host.innerHTML = `<div class="poster">
    <div class="p-head"><div class="p-brand">Ekstrem</div>
      <div class="p-title">${S.plan.horizon} aylık plan · ${esc(isHane() ? 'Hane' : profName(S.profile))}</div>
      <div class="p-range">${mLabel(rows[0].m)} – ${mLabel(rows[rows.length - 1].m)}</div></div>
    <section class="card"><h2>Nakit akışı</h2>${planStats(calc)}${flowChart(rows)}${FLOW_LEGEND}</section>
    <section class="card"><h2>Aylık bilanço</h2>${ledgerHTML(calc)}</section>
    <section class="card"><h2>Taksit takvimi</h2>${ganttHTML(calc)}</section>
    <section class="card"><h2>Gider nereye gidecek?</h2>${spendBreakdown(calc)}</section>
    <div class="p-foot">Oluşturulma ${dTR(new Date().toISOString().slice(0, 10))} · Ekstrem</div></div>`;
  document.body.appendChild(host);
  try { await exportNode(host.firstElementChild, `${planFileBase()}.png`); } finally { host.remove(); }
};
