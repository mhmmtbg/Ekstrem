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
    let m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4}|\d{2})$/);
    if (m && +m[2] >= 1 && +m[2] <= 12 && +m[1] >= 1 && +m[1] <= 31) return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${pad(m[2])}-${pad(m[1])}`;
    m = norm(s).match(/^(\d{1,2}) ([A-Z]+) (\d{4})$/);
    if (m && AYLAR[m[2]]) return `${m[3]}-${pad(AYLAR[m[2]])}-${pad(m[1])}`;
    return null;
  }
  function findDate(s) {
    const m = (s || '').match(/(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4})|(\d{1,2} [A-Za-zÇĞİÖŞÜçğıöşü]+ \d{4})/);
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

  // Sıra önemli: kendi adını taşıyan banka, ortak program adlarından (Bonus, Maximum) önce gelir
  const BANKS = [
    [/ZIRAAT KATILIM/, 'Ziraat Katılım'], [/ZIRAAT|BANKKART/, 'Ziraat Bankkart'], [/AXESS|AKBANK/, 'Akbank Axess'],
    [/WORLDCARD|YAPI VE KREDI|YAPIKREDI|YAPI KREDI/, 'Yapı Kredi World'], [/DENIZBANK/, 'DenizBank'], [/ENPARA/, 'Enpara'],
    [/HALK BANKASI|HALKBANK|PARAF/, 'Halkbank Paraf'], [/VAKIF KATILIM/, 'Vakıf Katılım'], [/VAKIFBANK|VAKIFLAR BANKASI|VAKIFKART/, 'VakıfBank'],
    [/KUVEYT TURK|KUVEYTTURK/, 'Kuveyt Türk'], [/TURKIYE FINANS|HAPPY CARD/, 'Türkiye Finans'], [/ALBARAKA/, 'Albaraka'], [/EMLAK KATILIM/, 'Emlak Katılım'],
    [/TURK EKONOMI BANKASI|TEB A\.S|CEPTETEB|\bTEB\b/, 'TEB'], [/ING BANK|\bING\b/, 'ING'], [/QNB|CARDFINANS|FINANSBANK/, 'QNB'],
    [/SEKERBANK/, 'Şekerbank'], [/FIBABANKA/, 'Fibabanka'], [/ODEABANK/, 'Odeabank'], [/HSBC/, 'HSBC'], [/ANADOLUBANK/, 'Anadolubank'],
    [/BURGAN/, 'Burgan Bank'], [/ALTERNATIF ?BANK/, 'Alternatif Bank'], [/PAPARA/, 'Papara'],
    [/GARANTI|BONUS/, 'Garanti Bonus'], [/IS BANKASI|ISBANK|MAXIMUM/, 'İş Bankası Maximum'],
  ];
  function detectBank(text) {
    const t = norm(text);
    for (const [re, name] of BANKS) if (re.test(t)) return name;
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
    const NUM = fmt === 'tr' ? '(?:\\d{1,3}(?:\\.\\d{3})+|\\d+),\\d{2}' : '(?:\\d{1,3}(?:,\\d{3})+|\\d+)\\.\\d{2}';
    const AMT = new RegExp(`^(?:[+-]\\s*)?${NUM}\\s*(?:\\+|-|\\(-\\)|CR|ALACAK)?\\s*(?:TL|TRY|₺)?$`, 'i');
    const AMT_TAIL = new RegExp(`^(.*\\S)\\s+((?:[+-]\\s*)?${NUM}\\s*(?:\\+|-|\\(-\\))?\\s*(?:TL|TRY|₺)?)$`, 'i');
    const toNum = s => { let t = s.replace(/[^\d.,]/g, ''); t = fmt === 'tr' ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, ''); return parseFloat(t); };
    const isCredit = s => /^\s*\+|\+\s*(TL|TRY|₺)?\s*$|\(-\)|^\s*-|CR\s*$|ALACAK/i.test(s);
    const firstAmount = s => { const m = (s || '').match(new RegExp(`[+-]?${NUM}`)); return m ? toNum(m[0]) : null; };

    // Başlık alanları: değer aynı satırda yoksa hemen alttaki satıra da bakılır
    const head = {};
    const labelVal = (labelRe, pick) => {
      for (let ri = 0; ri < rows.length; ri++) {
        const r = rows[ri];
        for (let i = 0; i < r.cells.length; i++) {
          const c = norm(r.cells[i].s);
          if (!labelRe.test(c)) continue;
          const rest = [r.cells[i].s.split(':').slice(1).join(':'), ...r.cells.slice(i + 1, i + 3).map(x => x.s)].join(' ').replace(/^[\s:]+/, '');
          let v = pick(rest); if (v != null) return v;
          const nx = rows[ri + 1];
          if (nx && nx.page === r.page && r.y - nx.y < 13) {
            const near = nx.cells.filter(x => x.x >= r.cells[i].x - 10 && x.x < (r.cells[i + 2] ? r.cells[i + 2].x : 1e9)).map(x => x.s).join(' ');
            v = pick(near); if (v != null) return v;
          }
        }
      }
      return null;
    };
    const LBL = {
      kesim: /^(HESAP KESIM TARIHI|EKSTRE TARIHI|EKSTRE KESIM TARIHI|KESIM TARIHI|HESAP OZETI (KESIM )?TARIHI|DONEM SONU TARIHI)/,
      son: /^SON ODEME TARIHI/,
      borc: /^(DONEM BORCU(NUZ)?(?! USD)(?! \$)|HESAP OZETI BORCU|EKSTRE BORCU|HESAP BAKIYESI|TOPLAM DONEM BORCU|GUNCEL DONEM BORCU|DONEM SONU BORCU|TOPLAM BORC(UNUZ)?\b)/,
      prev: /^(ONCEKI HESAP BAKIYE|ONCEKI DONEM (EKSTRE )?BORCU|ONCEKI EKSTRE BORCU|BIR ONCEKI (EKSTRE|DONEM|HESAP OZETI) (BORCU|BAKIYE))/,
    };
    head.kesimISO = labelVal(LBL.kesim, findDate);
    if (!head.kesimISO) { // "Ekstre Dönemi 17/08/2026-17/09/2026" → bitiş tarihi
      const m = fullText.match(/EKSTRE D[ÖO]NEM[İI]\s*:?\s*\S+\s*[-–]\s*(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4})/i);
      if (m) head.kesimISO = parseDate(m[1]);
    }
    head.sonOdemeISO = labelVal(LBL.son, findDate);
    head.borc = labelVal(LBL.borc, firstAmount);
    const headPrev = labelVal(LBL.prev, firstAmount);
    const donemHarcama = labelVal(/^DONEM ICI HARCAMALAR/, firstAmount);
    const headCard = labelVal(/^KART (NUMARASI|NO)/, s => { const m = (s || '').match(/(?:\*{2,}|#{2,}|X{2,})[\s*#X-]*(\d{4})\b/i); return m ? m[1] : null; }) || '';

    // Tablo başlığı: "TUTAR" içeren kısa bir hücre ve ±16 pt içinde, solunda "TARİH" içeren bir hücre
    const AMT_HEAD = c => { const n = norm(c.s); return n.length < 26 && !/\d/.test(n) && /TUTAR/.test(n) && !/KALAN|TAKSIT|PUAN|BONUS|USD|DOVIZ|ORIJINAL|ORJINAL|EURO/.test(n); };
    const headerAt = new Map();
    rows.forEach((r, i) => {
      const a = r.cells.find(AMT_HEAD); if (!a) return;
      for (let j = Math.max(0, i - 3); j <= Math.min(rows.length - 1, i + 3); j++) {
        const q = rows[j]; if (q.page !== r.page || Math.abs(q.y - r.y) > 16) continue;
        const d = q.cells.find(c => /TARIH/.test(norm(c.s)) && c.x < a.x && norm(c.s).length < 20);
        if (d) {
          // Başlık bandı: yakındaki, tutar ya da tarih içermeyen satırlar (başlık iki satıra bölünebilir)
          const band = rows.filter(z => z.page === r.page && Math.abs(z.y - r.y) <= 16 &&
            !z.cells.some(c => AMT.test(c.s) || parseDate(c.s) || /^\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\s/.test(c.s) || /\*{3,}/.test(c.s)));
          const dx = Math.min(...band.flatMap(z => z.cells.filter(c => /^(ISLEM|TARIH|ISLEM TARIHI|TARIHI)$/.test(norm(c.s))).map(c => c.x)), d.x);
          headerAt.set(i, { date: dx, amt: a.r, amtX: a.x, band: new Set(band) });
          break;
        }
      }
    });
    const isHeaderBand = r => [...headerAt.values()].some(h => h.band.has(r));
    const STOP = /^(GENEL TOPLAM|ARA TOPLAM|TOPLAM)\b|PUAN OZETI|WORLDPUAN|MEVZUAT|BONUS OZETI|EKSTRE OZETI|FAIZ ORANLARI|KREDI KARTI FAIZ/;

    let col = null, inTable = false, done = false, prev = null, card = '', lastDate = null;
    const tx = [], orphans = [], prevCandidates = [];
    const amountCellOf = cells => {
      let best = null;
      for (const c of cells) {
        if (!AMT.test(c.s)) continue;
        const d = Math.abs(c.r - col.amt);
        if (d < 45 && (!best || d < best.d)) best = { c, d };
      }
      if (best) return best.c;
      // Tutar açıklamayla aynı hücreye yapışmışsa ayır
      for (const c of cells) {
        const m = c.s.match(AMT_TAIL);
        if (m && Math.abs(c.r - col.amt) < 45) { const a = { x: c.r - 40, r: c.r, s: m[2] }; c.s = m[1]; c.r = a.x - 1; cells.push(a); return a; }
      }
      return null;
    };
    rows.forEach((r, i) => {
      if (headerAt.has(i)) { col = headerAt.get(i); inTable = true; done = false; return; }
      if (isHeaderBand(r)) return;
      const nt = norm(r.text);
      const cm0 = nt.match(/KART (NO|NUMARASI)\s*:?\s*[\d\s*#X-]*?(?:\*{2,}|#{2,}|X{2,})[\s*#X-]*(\d{4})\b/);
      if (cm0 && !/^\d{1,2}[\/.-]/.test(r.cells[0].s)) { card = cm0[2]; if (inTable) return; }
      if (!inTable || done) return;
      if (STOP.test(nt)) { done = true; return; }
      const cells = r.cells.filter(c => c.x >= col.date - 16).map(c => ({ ...c }));
      if (!cells.length) return;
      // Tarih açıklamayla aynı hücreye yapışmışsa ayır
      let date = parseDate(cells[0].s);
      if (!date) {
        const m = cells[0].s.match(/^(\d{1,2}[\/.-]\d{1,2}[\/.-](?:\d{4}|\d{2})|\d{1,2} [A-Za-zÇĞİÖŞÜçğıöşü]+ \d{4})\s+(.+)$/);
        if (m && parseDate(m[1])) { date = parseDate(m[1]); cells.splice(0, 1, { x: cells[0].x, r: cells[0].x + 40, s: m[1] }, { x: cells[0].x + 45, r: cells[0].r, s: m[2] }); }
      }
      const amtCell = amountCellOf(cells);
      if (!date) {
        const cm = r.text.match(/(?:\*{2,}|#{2,}|X{2,})[\s*#X-]*(\d{4})\b/i);
        if (cm && !amtCell) { card = cm[1]; return; }
        const textCells = cells.filter(c => c !== amtCell && /[A-Za-zÇĞİÖŞÜçğıöşü]{2}/.test(c.s));
        if (amtCell) {
          const txt = norm(textCells.map(c => c.s).join(' '));
          if (/ONCEKI|DEVIR|BAKIYENIZ/.test(txt)) { prev = toNum(amtCell.s); return; }
          if (!txt) { prevCandidates.push({ r, v: toNum(amtCell.s) }); return; }
          if (/FAIZ|BSMV|KKDF|UCRET|MASRAF|KOMISYON|VERGI|GECIKME/.test(txt) && !/TOPLAM/.test(txt)) {
            tx.push({ date: lastDate || head.kesimISO, card, tl: toNum(amtCell.s), usd: 0, bkl: 0, credit: isCredit(amtCell.s), taksit: '', desc: textCells.map(c => c.s).join(' '), row: r, page: r.page, extra: '' });
          }
          return;
        }
        if (textCells.length) orphans.push({ r, text: textCells.filter(c => c.r < col.amt + 5 || /taksi[td]|\d+\s*\/\s*\d+/i.test(c.s)).map(c => c.s).join(' ') });
        return;
      }
      lastDate = date;
      if (!amtCell) return;
      const rest = cells.slice(1).filter(c => c !== amtCell);
      const descCells = rest.filter(c => c.r < col.amt - 40 && !/^\d{1,2}\s*\/\s*\d{1,2}$/.test(c.s) && !/^[\d.,]+\s*\/\s*\d+\s*-\s*\d+$/.test(c.s) && !(AMT.test(c.s) && c.x > col.date + 150));
      const extraCells = rest.filter(c => !descCells.includes(c));
      tx.push({ date, card, tl: toNum(amtCell.s), usd: 0, bkl: 0, credit: isCredit(amtCell.s), taksit: '',
        desc: descCells.map(c => c.s).join(' '), extra: extraCells.map(c => c.s).join(' '), row: r, page: r.page });
    });
    // Önceki dönem borcu metni ile tutarı ayrı satırlardaysa (ör. Halkbank) birleştir
    if (prev == null) for (const pc of prevCandidates) {
      const near = rows.filter(z => z.page === pc.r.page && Math.abs(z.y - pc.r.y) <= 10 && z !== pc.r).map(z => norm(z.text)).join(' ');
      if (/ONCEKI|DEVIR/.test(near)) { prev = pc.v; break; }
    }
    if (prev == null && headPrev != null) prev = headPrev;
    // Tarih satırının üstüne/altına taşan açıklama satırlarını en yakın işleme bağla
    for (const o of orphans) {
      if (!o.text) continue;
      let best = null;
      // Taksit alt satırı (ör. Yapı Kredi "…TL'lik işlemin 2 / 6 taksidi") her zaman üstteki işleme aittir
      const isInst = /taksi[td]|\d+\s*\/\s*\d+/i.test(o.text) && !/[A-Za-z]{4,}.*[A-Za-z]{4,}/.test(o.text.replace(/taksi[td]\w*|i[sş]lemin|TL'?l[iı]k/gi, ''));
      for (const t of tx) {
        if (!t.row || t.row.page !== o.r.page) continue;
        if (isInst && t.row.y < o.r.y) continue;
        const d = Math.abs(t.row.y - o.r.y);
        if (d <= (isInst ? 13 : 9.5) && (!best || d < best.d || (d === best.d && t.row.y > o.r.y))) best = { t, d };
      }
      if (!best) continue;
      const t = best.t;
      if (isInst) t.extra += ' ' + o.text;
      else if (o.r.y > t.row.y) t.desc = (o.text + ' ' + t.desc).trim();
      else t.desc = (t.desc + ' ' + o.text).trim();
    }

    for (const t of tx) {
      const all = t.desc + ' ' + (t.extra || '');
      let m;
      if ((m = all.match(/\(([\d.,]+)\s*TL\)\s*(\d+)\s*\/\s*(\d+)\s*\.?\s*taksit/i))) {          // Axess: (12.000,00 TL) 6/2.taksit
        t.taksitTutar = toNum(m[1]); t.taksitToplam = +m[2]; t.taksitNo = +m[3];
      } else if ((m = all.match(/([\d.,]+)\s*TL'?l[iı]k\s*i[sş]lemin\s*(\d+)\s*\/\s*(\d+)\s*taksidi/i))) { // Yapı Kredi
        t.taksitTutar = toNum(m[1]); t.taksitNo = +m[2]; t.taksitToplam = +m[3];
      } else if ((m = all.match(/(\d+)\s*\/\s*(\d+)\s*\.?\s*taksi[td]\w*\s*(?:\(([\d.,]+)\))?/i))) {     // İş Bankası: 4/8 taksidi (665,52)
        t.taksitNo = +m[1]; t.taksitToplam = +m[2]; if (m[3]) t.taksitTutar = toNum(m[3]);
      } else if ((m = all.match(/([\d.,]+)\s*\/\s*(\d{1,2})\s*-\s*(\d{1,2})(?!\d)/))) {                 // DenizBank: 895.99/3-2
        t.taksitToplam = +m[2]; t.taksitNo = +m[3];
      } else if ((m = all.match(/taksit\s*:?\s*(\d{1,2})\s*\/\s*(\d{1,2})(?!\d)/i) || (t.extra || '').match(/(?:^|\s)(\d{1,2})\s*\/\s*(\d{1,2})(?:\s|$)/))) { // Enpara: Taksit sütununda 5/5
        t.taksitNo = +m[1]; t.taksitToplam = +m[2];
      }
      if (!(t.taksitNo >= 1 && t.taksitToplam >= t.taksitNo && t.taksitToplam <= 48)) { delete t.taksitNo; delete t.taksitToplam; delete t.taksitTutar; }
      if ((m = t.desc.match(/\((?:İ|I)şlem tutarı:\s*([\d.,]+)\s*TL\)/i)) && t.taksitToplam && !t.taksitTutar) t.taksitTutar = toNum(m[1]);
      if (t.taksitToplam) t.taksit = `${t.taksitNo}/${t.taksitToplam} taksit` + (t.taksitTutar ? ` (${t.taksitTutar.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL)` : '');
      t.desc = t.desc.replace(/\(or[ij]inal tutar\s*([\d.,]+).*?\)/i, '($1 döviz)').replace(/\([\d.,]+\s*TL\)\s*\d+\s*\/\s*\d+\s*\.?\s*taksit/i, '')
        .replace(/\((?:İ|I)şlem tutarı:\s*[\d.,]+\s*TL\)/i, '').replace(/\(Faiz oranı:[^)]*\)/i, '').replace(/\s+TR$/, '').replace(/\s+/g, ' ').trim();
      delete t.extra; delete t.row;
      if (!t.card) t.card = headCard;
      const d = norm(t.desc);
      if (t.credit && /ODEME|ODEMENIZ|TESEKKUR|HESAPTAN|AKTARIM|TAHSILAT|VIRMAN|OTOMATIK ODEME/.test(d) && !/IADE/.test(d)) t.type = 'payment';
      else if (t.tl === 0) t.type = 'info';
      else if (t.credit) t.type = 'refund';
      else if (/\bBSMV\b|\bKKDF\b|FAIZ|YILLIK (UYELIK )?UCRET|KART UCRET|UYELIK UCRET|AVANS UCRET|CEKIM UCRET|GECIKME|MASRAF|KOMISYON/.test(d)) t.type = 'fee';
      else t.type = 'expense';
    }
    if (!head.kesimISO && tx.length) head.kesimISO = tx.map(t => t.date).sort().pop();
    // Sayfa geçişinde tekrar basılan işlemler: toplam ancak tekrar atılınca tutuyorsa at
    const sumOk = list => {
      if (head.borc == null || prev == null) return null;
      const deb = list.filter(t => t.type === 'expense' || t.type === 'fee').reduce((a, t) => a + t.tl, 0);
      const cre = list.filter(t => t.type === 'payment' || t.type === 'refund').reduce((a, t) => a + t.tl, 0);
      return Math.abs(Math.round((prev + deb - cre) * 100) / 100 - head.borc) < 0.05;
    };
    if (sumOk(tx) === false) {
      const key = t => `${t.date}|${t.tl}|${norm(t.desc).slice(0, 12)}`;
      const drop = new Set();
      for (let p = 0; p < pages.length - 1; p++) {
        const a = tx.filter(t => t.page === p), b = tx.filter(t => t.page === p + 1);
        for (let k = Math.min(3, a.length, b.length); k > 0; k--)
          if (a.slice(-k).every((t, i) => key(t) === key(b[i]))) { b.slice(0, k).forEach(t => drop.add(t)); break; }
      }
      const cand = tx.filter(t => !drop.has(t));
      if (drop.size && sumOk(cand)) { tx.length = 0; tx.push(...cand); }
    }
    tx.forEach(t => delete t.page);

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
