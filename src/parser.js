/* Ziraat Bankkart ekstre ayrıştırıcı — pages: [{width, items:[{str,x,y,r}]}] */
(function (root) {
  const NUM = /^-?\d{1,3}(\.\d{3})*,\d{2}\+?$/;
  const DATE = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const toNum = s => parseFloat(s.replace('+', '').replace(/\./g, '').replace(',', '.'));
  const round2 = n => Math.round(n * 100) / 100;

  function rowsOf(items) {
    const sorted = items.filter(i => i.str.trim()).sort((a, b) => b.y - a.y || a.x - b.x);
    const rows = [];
    for (const it of sorted) {
      const last = rows[rows.length - 1];
      if (last && Math.abs(last.y - it.y) < 2.5) last.items.push(it);
      else rows.push({ y: it.y, items: [it] });
    }
    rows.forEach(r => r.items.sort((a, b) => a.x - b.x));
    return rows;
  }

  function parse(pages) {
    const W = pages[0].width || 595;
    let col = { tl: W * 0.770, usd: W * 0.866, bkl: W * 0.970, descEnd: W * 0.44, taksitEnd: W * 0.70 };
    const head = {}; const summary = {};
    const tx = []; let card = ''; let done = false; let inTable = false;

    // Sayfalar arasında üst üste binen satırları ayıkla (ekstre sayfaları kesilirken tekrar eden satırlar)
    const allRows = []; let prev = [];
    pages.forEach((p, pi) => {
      let rows = rowsOf(p.items);
      const sig = r => r.items.map(i => i.str.trim()).join('|');
      if (prev.length) {
        const ps = prev.map(sig), cs = rows.map(sig);
        for (let k = Math.min(ps.length, cs.length, 15); k > 0; k--) {
          if (ps.slice(-k).every((s, i) => s === cs[i])) { rows = rows.slice(k); break; }
        }
      }
      rows.forEach(r => allRows.push(Object.assign(r, { page: pi })));
      prev = rows.length ? rows : prev;
    });

    // Başlık alanları
    const labelMap = {
      'Hesap Kesim Tarihi': 'kesim', 'Son Ödeme Tarihi': 'sonOdeme', 'Dönem Borcu TL': 'borcTL',
      'Dönem Borcu USD': 'borcUSD', 'Asgari Ödeme Tutarı TL': 'asgariTL', 'Kart Limiti': 'limit'
    };
    for (const r of allRows.filter(r => r.page === 0)) {
      for (let i = 0; i < r.items.length; i++) {
        const key = labelMap[r.items[i].str.trim()];
        if (!key) continue;
        let j = i + 1; if (r.items[j] && r.items[j].str.trim() === ':') j++;
        if (r.items[j]) head[key] = r.items[j].str.replace(/\s*(TL|USD)$/, '').trim();
      }
      const tlH = r.items.find(i => i.str.trim() === 'TL Tutar');
      if (tlH) {
        const u = r.items.find(i => i.str.trim() === 'USD Tutar');
        const b = r.items.find(i => i.str.trim() === 'Bankkart Lira');
        col.tl = tlH.r; if (u) col.usd = u.r; if (b) col.bkl = b.r;
      }
    }

    for (let ri = 0; ri < allRows.length; ri++) {
      const r = allRows[ri];
      const first = r.items[0].str.trim();
      const line = r.items.map(i => i.str).join(' ');
      if (/İşlem Tarihi/.test(line) && /Açıklaması/.test(line)) { inTable = true; continue; }
      if (/^Bu ekstre döneminde|^Faiz ve Ücretler|^Devreden Bakiye/.test(first)) done = true;
      if (/Devreden Bakiye/.test(line)) {
        // sonraki satırlarda 5 adet "xx TL" değeri
        for (let k = ri + 1; k < Math.min(ri + 8, allRows.length); k++) {
          const txt = allRows[k].items.map(i => i.str.trim()).join(' ');
          const vals = [...txt.matchAll(/(\d{1,3}(?:\.\d{3})*,\d{2})\s*TL/g)].map(m => m[1]);
          if (vals.length >= 5) {
            const v = vals.map(toNum);
            Object.assign(summary, { devir: v[0], harcama: v[1], faiz: v[2], odeme: v[3], borc: v[4] });
            break;
          }
        }
      }
      if (done || !inTable) continue;
      const km = line.match(/KART NO\s*:\s*[\d#-]*?(\d{4})\s*\//);
      if (km) { card = km[1]; continue; }
      const dm = first.match(DATE);
      if (!dm) continue;
      const t = { date: `${dm[3]}-${dm[2]}-${dm[1]}`, card, tl: 0, usd: 0, bkl: 0, credit: false, taksit: '' };
      const desc = [];
      for (const it of r.items.slice(1)) {
        const s = it.str.trim();
        if (NUM.test(s) && it.x > col.descEnd) {
          const v = toNum(s); const plus = s.endsWith('+');
          const d = [['tl', col.tl], ['usd', col.usd], ['bkl', col.bkl]]
            .map(([k, x]) => [k, Math.abs(it.r - x)]).sort((a, b) => a[1] - b[1])[0][0];
          t[d] = v; if (plus && d !== 'bkl') t.credit = true;
        } else if (/Taksidi$/.test(s) || (it.x > col.descEnd * 0.95 && it.x < col.taksitEnd && /İşlemin/.test(s))) {
          t.taksit = s;
        } else desc.push(s);
      }
      t.desc = desc.join(' ').replace(/\s+/g, ' ').trim();
      tx.push(t);
    }

    // sınıflandır
    for (const t of tx) {
      const d = t.desc.toLocaleUpperCase('tr-TR');
      if (/ÖDEME-TEŞEKKÜR/.test(d)) t.type = 'payment';
      else if (t.tl === 0 && t.usd === 0) t.type = 'info';
      else if (t.credit) t.type = 'refund';
      else if (/^(BSMV|KKDF|OTOMATİK FATURA FAİZİ|NAKİT AVANS FAİZİ|NAKİT AVANS ÜCRETİ|ALIŞVERİŞ FAİZİ|GECİKME|YILLIK ÜYELİK|KART ÜCRETİ)/.test(d)) t.type = 'fee';
      else t.type = 'expense';
      const im = t.taksit.match(/([\d.,]+) TL İşlemin (\d+)\/(\d+)/);
      if (im) { t.taksitNo = +im[2]; t.taksitToplam = +im[3]; t.taksitTutar = toNum(im[1]); }
    }

    const sumT = f => round2(tx.filter(f).reduce((a, t) => a + t.tl, 0));
    const check = {
      harcamaFaiz: sumT(t => t.type === 'expense' || t.type === 'fee'),
      odemeIade: sumT(t => t.type === 'payment' || t.type === 'refund')
    };
    let ok = null;
    if (summary.harcama != null) {
      ok = Math.abs(check.harcamaFaiz - round2(summary.harcama + summary.faiz)) < 0.05 &&
           Math.abs(check.odemeIade - summary.odeme) < 0.05;
    }
    return { head, summary, tx, check, ok };
  }
  root.BankkartParser = { parse, toNum };
  if (typeof module !== 'undefined') module.exports = root.BankkartParser;
})(typeof window !== 'undefined' ? window : globalThis);
