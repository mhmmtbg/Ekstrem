/* Genel ekstre ayrıştırıcı (Akbank Axess, Yapı Kredi World ve benzer tablolu ekstreler) */
(function (root) {
  const EBCDIC = "\u0000\u0001\u0002\u0003\u009c\t\u0086\u007f\u0097\u008d\u008e\u000b\f\r\u000e\u000f\u0010\u0011\u0012\u0013\u009d\u0085\b\u0087\u0018\u0019\u0092\u008f\u001c\u001d\u001e\u001f\u0080\u0081\u0082\u0083\u0084\n\u0017\u001b\u0088\u0089\u008a\u008b\u008c\u0005\u0006\u0007\u0090\u0091\u0016\u0093\u0094\u0095\u0096\u0004\u0098\u0099\u009a\u009b\u0014\u0015\u009e\u001a \u00a0\u00e2\u00e4\u00e0\u00e1\u00e3\u00e5{\u00f1\u00c7.<(+!&\u00e9\u00ea\u00eb\u00e8\u00ed\u00ee\u00ef\u00ec\u00df\u011e\u0130*);^-/\u00c2\u00c4\u00c0\u00c1\u00c3\u00c5[\u00d1\u015f,%_>?\u00f8\u00c9\u00ca\u00cb\u00c8\u00cd\u00ce\u00cf\u00cc\u0131:\u00d6\u015e'=\u00dc\u00d8abcdefghi\u00ab\u00bb}`\u00a6\u00b1\u00b0jklmnopqr\u00aa\u00ba\u00e6\u00b8\u00c6\u00a4\u00b5\u00f6stuvwxyz\u00a1\u00bf]$@\u00ae\u00a2\u00a3\u00a5\u00b7\u00a9\u00a7\u00b6\u00bc\u00bd\u00be\u00ac|\u00af\u00a8\u00b4\u00d7\u00e7ABCDEFGHI\u00ad\u00f4~\u00f2\u00f3\u00f5\u011fJKLMNOPQR\u00b9\u00fb\\\u00f9\u00fa\u00ff\u00fc\u00f7STUVWXYZ\u00b2\u00d4#\u00d2\u00d3\u00d50123456789\u00b3\u00db\"\u00d9\u00da\u009f";
  const EB_FIX = { '~': 'ö', '\\': 'ü', '{': 'ç', ']': 'ş', '#': 'Ö', '¿': 'İ', '@': 'Ş', '|': 'ı', '¬': 'ı' };
  const AYLAR = { OCAK: 1, SUBAT: 2, MART: 3, NISAN: 4, MAYIS: 5, HAZIRAN: 6, TEMMUZ: 7, AGUSTOS: 8, EYLUL: 9, EKIM: 10, KASIM: 11, ARALIK: 12 };
  const norm = s => (s || '').toLocaleUpperCase('tr-TR').replace(/İ/g, 'I').replace(/Ş/g, 'S').replace(/Ğ/g, 'G')
    .replace(/Ü/g, 'U').replace(/Ö/g, 'O').replace(/Ç/g, 'C').replace(/\s+/g, ' ').trim();
  const pad = n => String(n).padStart(2, '0');

  function parseDate(s) {
    s = (s || '').trim();
    let m = s.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})$/);
    if (m) return `${m[3]}-${pad(m[2])}-${pad(m[1])}`;
    m = norm(s).match(/^(\d{1,2}) ([A-Z]+) (\d{4})$/);
    if (m && AYLAR[m[2]]) return `${m[3]}-${pad(AYLAR[m[2]])}-${pad(m[1])}`;
    return null;
  }
  function findDate(s) {
    const m = (s || '').match(/(\d{1,2}[\/.]\d{1,2}[\/.]\d{4})|(\d{1,2} [A-Za-zÇĞİÖŞÜçğıöşü]+ \d{4})/);
    return m ? parseDate(m[0]) : null;
  }

  // EBCDIC ile gömülmüş metni çöz (ör. Akbank Axess)
  function maybeDecode(pages) {
    const all = pages.map(p => p.items.map(i => i.str).join(' ')).join(' ');
    if (/Tarih|Tutar|TOPLAM|Borc|Borç/i.test(all)) return false;
    const dec = s => [...s].map(c => { const o = c.charCodeAt(0); return o === 0x20 ? ' ' : o < 256 ? EBCDIC[o] : c; }).join('');
    if (!/Tarih|Tutar|Toplam/i.test(dec(all))) return false;
    for (const p of pages) for (const it of p.items)
      it.str = dec(it.str).replace(/[~\\{\]#¿@|¬]/g, c => EB_FIX[c]);
    return true;
  }

  function rowsOf(items) {
    const sorted = items.filter(i => i.str.trim() && !i.rot).sort((a, b) => b.y - a.y || a.x - b.x);
    const rows = [];
    for (const it of sorted) {
      const last = rows[rows.length - 1];
      if (last && Math.abs(last.y - it.y) < 2.5) last.items.push(it); else rows.push({ y: it.y, items: [it] });
    }
    for (const r of rows) {
      r.items.sort((a, b) => a.x - b.x);
      const cells = []; let cur = null;
      for (const i of r.items) {
        if (cur && i.x - cur.r < 6) { cur.s += (i.x - cur.r < 0.8 ? '' : ' ') + i.str; cur.r = Math.max(cur.r, i.r); }
        else { cur = { x: i.x, r: i.r, s: i.str }; cells.push(cur); }
      }
      cells.forEach(c => c.s = c.s.replace(/\s+/g, ' ').trim());
      r.cells = cells.filter(c => c.s);
      r.text = r.cells.map(c => c.s).join(' ');
    }
    return rows.filter(r => r.cells.length);
  }

  function detectBank(text) {
    const t = norm(text);
    if (/ZIRAAT|BANKKART/.test(t)) return 'Ziraat Bankkart';
    if (/AXESS|AKBANK/.test(t)) return 'Akbank Axess';
    if (/WORLDCARD|YAPI VE KREDI|YAPIKREDI|YAPI KREDI/.test(t)) return 'Yapı Kredi World';
    if (/BONUS|GARANTI/.test(t)) return 'Garanti Bonus';
    if (/MAXIMUM|IS BANKASI|ISBANK/.test(t)) return 'İş Bankası Maximum';
    if (/CARDFINANS|QNB/.test(t)) return 'QNB CardFinans';
    if (/PARAF|HALKBANK/.test(t)) return 'Halkbank Paraf';
    if (/VAKIFBANK|VAKIF/.test(t)) return 'VakıfBank';
    if (/DENIZBANK/.test(t)) return 'DenizBank';
    if (/ENPARA/.test(t)) return 'Enpara';
    return 'Kredi kartı';
  }

  function parse(pages) {
    const decoded = maybeDecode(pages);
    const rows = []; let prevSig = [];
    pages.forEach((p, pi) => {
      let rs = rowsOf(p.items);
      if (prevSig.length) {  // sayfa geçişinde tekrar eden satırlar
        const cs = rs.map(r => r.text);
        for (let k = Math.min(prevSig.length, cs.length, 15); k > 0; k--)
          if (prevSig.slice(-k).every((s, i) => s === cs[i])) { rs = rs.slice(k); break; }
      }
      if (rs.length) prevSig = rs.map(r => r.text);
      rs.forEach(r => { r.page = pi; rows.push(r); });
    });
    const fullText = rows.map(r => r.text).join('\n');

    // Sayı biçimi: 1.234,56 (TR) mi 1,234.56 (US) mi?
    const tr = (fullText.match(/\d,\d{2}(?!\d)/g) || []).length, us = (fullText.match(/\d\.\d{2}(?!\d)/g) || []).length;
    const fmt = us > tr * 1.5 ? 'us' : 'tr';
    const AMT = fmt === 'tr' ? /^[+-]?\s*\d{1,3}(\.\d{3})*,\d{2}\s*(\+|-|\(-\)|TL)?$/ : /^[+-]?\s*\d{1,3}(,\d{3})*\.\d{2}\s*(\+|-|\(-\)|TL)?$/;
    const toNum = s => { let t = s.replace(/[^\d.,]/g, ''); t = fmt === 'tr' ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, ''); return parseFloat(t); };
    const isCredit = s => /^\s*\+|\+\s*$|\(-\)|^\s*-/.test(s);
    const firstAmount = s => { const re = fmt === 'tr' ? /[+-]?\d{1,3}(\.\d{3})*,\d{2}/ : /[+-]?\d{1,3}(,\d{3})*\.\d{2}/; const m = (s || '').match(re); return m ? toNum(m[0]) : null; };

    // Başlık alanları
    const head = {};
    const labelVal = (labelRe, pick) => {
      for (const r of rows) for (let i = 0; i < r.cells.length; i++) {
        const c = norm(r.cells[i].s);
        if (!labelRe.test(c)) continue;
        const rest = [r.cells[i].s.split(':').slice(1).join(':'), ...r.cells.slice(i + 1, i + 3).map(x => x.s)].join(' ').replace(/^[\s:]+/, '');
        const v = pick(rest); if (v != null) return v;
      }
      return null;
    };
    head.kesimISO = labelVal(/^HESAP KESIM TARIHI/, findDate);
    head.sonOdemeISO = labelVal(/^SON ODEME TARIHI/, findDate);
    head.borc = labelVal(/^DONEM BORCU(?! USD)/, firstAmount);
    const donemHarcama = labelVal(/^DONEM ICI HARCAMALAR/, firstAmount);

    // Tablo başlığı sütunları
    let col = null;
    const tx = []; let card = ''; let inTable = false; let done = false; let prev = null; let last = null;
    for (const r of rows) {
      const nt = norm(r.text);
      const hDate = r.cells.find(c => /ISLEM TARIHI/.test(norm(c.s)));
      const hAmt = r.cells.find(c => /TUTAR/.test(norm(c.s)) && !/KALAN/.test(norm(c.s)));
      if (hDate && hAmt) { col = { date: hDate.x, amt: hAmt.r }; inTable = true; continue; }
      if (!/^\d/.test(r.cells[0].s) || !inTable) {
        const cm0 = norm(r.text).match(/KART (NO|NUMARASI)\s*:?\s*[\d\s*#-]*?(?:\*{2,}|#{2,})[\s*#-]*(\d{4})\b/);
        if (cm0) { card = cm0[2]; last = null; if (inTable) continue; }
      }
      if (!inTable || done) continue;
      if (/PUAN OZETI|WORLDPUAN|MEVZUAT|FAIZ VE UCRET|BU EKSTRE DONEMINDE|GENEL TOPLAM|BONUS OZETI|MAXIPUAN/.test(nt)) { done = /GENEL TOPLAM|PUAN OZETI|MEVZUAT|WORLDPUAN|BONUS OZETI|MAXIPUAN/.test(nt); continue; }
      const cells = r.cells.filter(c => c.x >= col.date - 14);
      if (!cells.length) continue;
      const amtCell = cells.find(c => AMT.test(c.s) && Math.abs(c.r - col.amt) < 30);
      const date = parseDate(cells[0].s);
      if (!date) {
        const cm = r.text.match(/(?:\*{2,}|#{2,})[\s*#-]*(\d{4})\b/);
        if (cm && !amtCell) { card = cm[1]; last = null; continue; }
        if (/ONCEKI (DONEM|AYDAN)/.test(nt) && amtCell) { prev = toNum(amtCell.s); continue; }
        if (last && /taksi[td]/i.test(r.text) && !amtCell) { last.extra = (last.extra || '') + ' ' + r.text; }
        continue;
      }
      if (!amtCell) { last = null; continue; }
      const descCells = cells.slice(1).filter(c => c !== amtCell && c.r < col.amt - 40);
      const t = { date, card, tl: toNum(amtCell.s), usd: 0, bkl: 0, credit: isCredit(amtCell.s), taksit: '',
        desc: descCells.map(c => c.s).join(' ') };
      tx.push(t); last = t;
    }

    for (const t of tx) {
      const all = t.desc + ' ' + (t.extra || '');
      let m;
      if ((m = all.match(/\(([\d.,]+)\s*TL\)\s*(\d+)\s*\/\s*(\d+)\s*\.?\s*taksit/i))) {          // Axess: (10.004,10 TL) 9/4.taksit
        t.taksitTutar = toNum(m[1]); t.taksitToplam = +m[2]; t.taksitNo = +m[3];
      } else if ((m = all.match(/([\d.,]+)\s*TL'?l[iı]k\s*i[sş]lemin\s*(\d+)\s*\/\s*(\d+)\s*taksidi/i))) { // YKB
        t.taksitTutar = toNum(m[1]); t.taksitNo = +m[2]; t.taksitToplam = +m[3];
      } else if ((m = all.match(/(\d+)\s*\/\s*(\d+)\s*\.?\s*taksi[td]/i))) {
        t.taksitNo = +m[1]; t.taksitToplam = +m[2];
      }
      if (t.taksitToplam) t.taksit = `${t.taksitNo}/${t.taksitToplam} taksit` + (t.taksitTutar ? ` (${t.taksitTutar.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL)` : '');
      t.desc = t.desc.replace(/\(or[ij]inal tutar\s*([\d.,]+).*?\)/i, '($1 döviz)').replace(/\([\d.,]+\s*TL\)\s*\d+\s*\/\s*\d+\s*\.?\s*taksit/i, '').replace(/\s+TR$/, '').replace(/\s+/g, ' ').trim();
      delete t.extra;
      const d = norm(t.desc);
      if (t.credit && /ODEME|ODEMENIZ|TESEKKUR|HESAPTAN|OTOMATIK ODEME/.test(d)) t.type = 'payment';
      else if (t.tl === 0) t.type = 'info';
      else if (t.credit) t.type = 'refund';
      else if (/^(BSMV|KKDF|.*FAIZI\b|.*FAIZ TUTARI|YILLIK UYELIK|KART UCRETI|NAKIT CEKIM UCRETI|NAKIT AVANS UCRETI)/.test(d)) t.type = 'fee';
      else t.type = 'expense';
    }

    const r2 = n => Math.round(n * 100) / 100;
    const debit = r2(tx.filter(t => t.type === 'expense' || t.type === 'fee').reduce((a, t) => a + t.tl, 0));
    const credit = r2(tx.filter(t => t.type === 'payment' || t.type === 'refund').reduce((a, t) => a + t.tl, 0));
    let ok = null;
    if (head.borc != null && prev != null) ok = Math.abs(r2(prev + debit - credit) - head.borc) < 0.05;
    else if (donemHarcama != null) ok = Math.abs(debit - donemHarcama) < 0.05;
    else if (head.borc != null) ok = Math.abs(debit - credit - head.borc) < 0.05;

    const fmtTR = n => n == null ? null : n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const outside = rows.filter(r => !/^\d/.test(r.cells[0].s)).map(r => r.text).slice(0, 40).join('\n') + '\n' + rows.slice(-25).map(r => r.text).join('\n');
    return { bank: detectBank(outside), decoded, fmt, head: { kesimISO: head.kesimISO, sonOdemeISO: head.sonOdemeISO, borcTL: fmtTR(head.borc) },
      summary: { devir: prev, harcama: debit, odeme: credit, borc: head.borc }, check: { debit, credit }, ok, tx };
  }
  root.GenericParser = { parse, parseDate, norm };
  if (typeof module !== 'undefined') module.exports = root.GenericParser;
})(typeof window !== 'undefined' ? window : globalThis);
