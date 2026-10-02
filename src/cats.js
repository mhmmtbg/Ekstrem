/* Varsayılan kategori kuralları: [kategori, renk, anahtar kelimeler] — büyük harf, Türkçe */
(function (root) {
  const CATEGORIES = [
    ['Market', '#2f7d4f', ['MAĞAZACILIK', 'MAGAZACILIK', 'UNLU MAM', 'YUMURTA', 'PAZAR ALIŞ', 'MANAV', 'KASAP', 'SÜPERMARKET', 'KURUYEMİŞ', 'KURUYEMIS', 'BİM', 'BIM ', 'BIM AS', 'A101', 'ŞOK', 'SOK-', 'FİLE', 'FILE ', 'MİGROS', 'MIGROS', 'CARREFOUR', 'METRO GROS', 'MARKET', 'GIDA', 'FIRIN', 'TEKEL', 'ROSSMANN', 'GRATİS', 'GRATIS', 'KASAP', 'ET VE ET', 'ŞOK MARKET', 'HAKMAR', 'ONUR MARKET', 'MACRO CENTER', 'KİM MARKET']],
    ['Restoran & Kafe', '#c2571a', ['SOSYAL TES', 'LOKANTA', 'RESTORAN', 'RESTAURANT', 'RESTAU', 'KAFE', 'CAFE', 'COFFE', 'KAHVE', 'SBUX', 'SBX ', 'STARBUCKS', 'ARABICA', 'ARABİCA', 'CARIBOU', 'DÖNER', 'DONER', 'KEBAP', 'KEBAB', 'BÖREK', 'BOREK', 'ÇORBA', 'CORBA', 'BURGER', 'MCDONALDS', 'KÖFTE', 'KOFTE', 'PİDE', 'PIDE', 'LAHMACUN', 'KÜNEFE', 'KADAYIF', 'BAKLAVA', 'USTA', 'ASPAVA', 'ASPA', 'ÇİĞK', 'TANTUN', 'DÜRÜM', 'BÜFE', 'BUFE', 'TRENDYOL YEMEK', 'YEMEKSEPETİ', 'YEMEK', 'DOMİNOS', 'SUBWAY', 'GURME', 'SÜTLÜ', 'SUTLU', 'BALIKÇI', 'OTOMAT', 'MUTFAĞI', 'YERİ', 'PİZZA', 'PIZZA', 'KFC', 'POPEYES', 'SİMİT', 'SIMIT', 'PASTANE', 'TATLI', 'MEYHANE', 'IZGARA']],
    ['Evcil Hayvan', '#a0522d', ['VETERİNER', 'VETERINER', 'PETSHO', 'PET SHOP', 'PETSHOP']],
    ['Akaryakıt', '#8a3fa0', ['PETROL', 'AKARYAKIT', 'AKARYAKI', 'SHELL', 'OPET', 'POAŞ', 'POAS', 'BP ', 'BPET', 'TOTAL', 'AYGAZ', 'BENZIN', 'PET.', 'YAKIT', ' PET ', 'AYTEMİZ', 'AYTEMIZ', 'TP PETROL', 'LUKOIL', 'KADOIL']],
    ['Faturalar', '#1f6f99', ['KİRA', 'AİDAT', 'ENERJİSA', 'ENERJISA', 'ASKİ', 'ASKI', 'BAŞKENTGAZ', 'BASKENTGAZ', 'DOĞALGA', 'TÜRK TELEKOM', 'TURKCELL', 'VODAFONE', 'SUPERONLINE', 'FATURA', 'PAYCELL']],
    ['Online Alışveriş', '#d9480f', ['AMAZON.COM', 'HEPSİPAY', 'HEPSIBURADA', 'TRENDYOL', 'N11', 'PAZARAMA', 'ETSY', 'EBAY', 'SAHIBINDEN', 'GETİR', 'GOGETİR', 'TRENDYOLGO']],
    ['Ulaşım', '#3b5bdb', ['EGO KART', 'OTOGAR', 'THY', 'PEGASUS', 'AJET', 'UBER', 'TAKSİ', 'TAXI', 'OTOYOL', 'PARK', 'OBİLET', 'OBILET', 'ENUYGUN', 'HGS', 'OGS', 'BİLET', 'İSTANBULKART', 'ISTANBULKART', 'KENTKART', 'MARTI', 'BİTAKSİ']],
    ['Abonelik & Dijital', '#6741d9', ['OCULUS', 'STEAM', 'GOOGLE', 'YOUTUBE', 'CLAUDE', 'ANTHROPIC', 'PLAYSTATION', 'MICROSOFT', 'AMZNPRIME', 'NETFLIX', 'SPOTIFY', 'APPLE', 'LINKEDIN', 'DISNEY', 'BLUTV', 'EXXEN', 'GAIN', 'ICLOUD', 'CHATGPT', 'OPENAI']],
    ['Sağlık', '#e03131', ['ECZANE', 'OPTİK', 'OPTIK', 'TIP MER', 'HASTANE', 'KLİNİK', 'DİŞ ', 'LABORATUVAR']],
    ['Giyim', '#c2255c', ['TEKSTIL', 'TEKSTİL', 'BOYNER', 'ZARA', 'DEFACTO', 'COLINS', 'UNIQLO', 'LCW', 'LC WAIKIKI', 'KOTON', 'MAVİ', 'ZARA', 'H&M', 'DERI', 'DERİ', 'DECATHLON', 'FLO ']],
    ['Elektronik', '#0b7285', ['MEDIA MARKT', 'MEDİA MARKT', 'MEDIA MARK', 'DYSON', 'SAMSUNG', 'MEDIAMARKT', 'TEKNOSA', 'VATAN', 'APPLE STORE', 'ARÇELİK', 'ARCELIK', 'BEKO', 'VESTEL']],
    ['Ev & Hırdavat', '#5c7cfa', ['TARIM', 'DAYANIKLI', 'TOHUMCULUK', 'HIRDAVA', 'HIRDAVAT', 'KARACA', 'KOÇTAŞ', 'IKEA', 'BAUHAUS', 'ENGLISH HOME', 'MADAME COCO', 'PAŞABAHÇE', 'PASABAHCE', 'TEKZEN']],
    ['Oto', '#495057', ['OTO PARÇA', 'OTO YIKAMA', 'OTOMOTİ', 'SİGORTA', 'SIGORTA', 'MOTO', 'LASTİK', 'LASTIK', 'OTOPARK']],
    ['Vergi & Resmi', '#862e9c', ['GIB', 'VERGİ', 'NOTER', 'KKB KREDI', 'TAPU', 'NÜFUS']],
    ['Emeklilik & Birikim', '#087f5b', ['EMEKLİLİK', 'BİREYSEL EMEKLİLİK', 'HAYAT SİGORTA']],
    ['Seyahat & Konaklama', '#f08c00', ['BEACH', 'TATİL', 'TATIL', 'OTEL', 'HOTEL', 'HAMAM', 'ETSTUR', 'GETYOURGUIDE', 'DUTYFREE', 'MUZE', 'MÜZE', 'HAVAALANI', 'HEDİYELİK', 'KAYAK', 'TUR ', 'THY DUTY', 'JOLLY', 'TATILBUDUR', 'BOOKING', 'AIRBNB']],
    ['Eğlence & Kültür', '#e8590c', ['ÇİÇEK', 'CICEK', 'BUBİLET', 'BİLETİX', 'SİNEMA', 'CINEMA', 'OYUNCAK', 'BASIN YAYIN', 'KİTAP', 'KITAP', 'TİYATRO', 'TIYATRO', 'KONSER', 'D&R', 'IDEFIX']],
    ['Nakit Avans', '#343a40', ['NAKİT AVANS - ', 'NAKIT AVANS -']],
    ['Faiz & Ücret', '#868e96', ['BSMV', 'KKDF', 'FAİZİ', 'FAIZI', 'NAKİT AVANS ÜCRETİ', 'ÜCRETİ']],
  ];
  const OTHER = ['Diğer', '#adb5bd'];
  // Türkçe harfleri sadeleştir: eşleşme İ/I, Ş/S farkına takılmasın
  function upper(s) {
    return (s || '').toLocaleUpperCase('tr-TR').replace(/İ/g, 'I').replace(/Ş/g, 'S').replace(/Ğ/g, 'G')
      .replace(/Ü/g, 'U').replace(/Ö/g, 'O').replace(/Ç/g, 'C').replace(/\s+/g, ' ');
  }
  // userRules: [{kw, cat}] — önce kullanıcı kuralları
  function categorize(desc, userRules) {
    const d = upper(desc).replace(/^\d{2}\/\d{2}\s+/, '');
    for (const r of userRules || []) if (r.kw && d.includes(upper(r.kw))) return r.cat;
    if (/^(BSMV|KKDF|OTOMATIK FATURA FAIZI|NAKIT AVANS FAIZI|NAKIT AVANS UCRETI)/.test(d)) return 'Faiz & Ücret';
    if (/^NAKIT AVANS/.test(d)) return 'Nakit Avans';
    for (const [cat, , kws] of CATEGORIES) for (const k of kws) if (d.includes(upper(k))) return cat;
    return OTHER[0];
  }
  root.BKCats = { CATEGORIES, OTHER, categorize, upper };
  if (typeof module !== 'undefined') module.exports = root.BKCats;
})(typeof window !== 'undefined' ? window : globalThis);
