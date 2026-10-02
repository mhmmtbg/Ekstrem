# Kullanım

Uygulama beş sekmeden oluşur: **Özet**, **İşlemler**, **Aylar**, **Plan** ve **Ekle**. Üst banttaki **Ben / Eşim / Hane** sekmeleri hangi kişinin verisine bakıldığını seçer; Hane ikisinin toplamıdır. Ay düğmeleri hangi ayın gösterileceğini seçer.

## Ekstre yükleme

**+ Ekstre** ile bir ya da birden çok PDF seçilir. Bankanın e-postayla gönderdiği ekstre olduğu gibi kullanılır.

- Şifreli PDF'lerde şifre sorulur (bankanın e-postasında belirtilen şifre).
- İçe aktarma ekranında her ekstre için banka, ay, harcama sayısı ve doğrulama sonucu görünür:

| Rozet | Anlamı |
|---|---|
| ✓ Banka toplamıyla eşleşti | Ayrıştırılan işlemler bankanın dönem borcu hesabıyla birebir tutuyor |
| Banka toplamı tutmadı | Bazı satırlar okunamamış olabilir; ekstreyi kontrol edin |
| Doğrulanamadı | Ekstrede karşılaştırılacak toplam bulunamadı |

- Her kartın kime ait olduğu (Ben / Eşim) bir kez seçilir; aynı kartın sonraki ekstreleri otomatik o kişiye gider. Sonradan **Ayarlar → Kartlar**'dan değiştirilebilir.
- **Hangi aya yazılır?** Ekstre, kesim tarihinden 15 gün önceki aya yazılır. Böylece 28 Eylül kesimli ekstre ile 1 Ekim kesimli ekstre aynı aya (Eylül) düşer.
- **Aynı ekstreyi yeniden yüklemek** kopya oluşturmaz; eski kayıt yenisiyle değişir, elle verilen kategoriler ve notlar korunur. Eski bir sürümden kalan kopyalar varsa Özet'in üstünde uyarı çıkar; **Kopyaları sil, birini tut** düzeltir.
- Bir ekstreyi silmek için Özet'in altındaki **Ekstreler** kartında ya da **Ayarlar → Yüklü ekstreler**'de çöp kutusu simgesine dokunun.

## Özet

- **Fiş:** Ayın net harcaması (iadeler düşülmüş, faiz dahil) bankalara göre kalem kalem. Gelir girilmişse kalan ve tasarruf oranı da yazar.
- **Barkod:** Çizgiler kategorilerin renginde, her kategori harcamadaki payı kadar yer kaplar. Firuze çizgi gelirin nereye kadar yettiğini gösterir; gelir harcamadan fazlaysa aradaki boşluk kesik çizgiyle çizilir.
- **Fişi PNG kaydet:** Fiş kaşesi ve barkoduyla görsel olarak kaydedilir.
- **Plan ile karşılaştırma:** Ay plan dönemindeyse ve planda kalem varsa görünür (ayrıntısı aşağıda).
- **Nereye gitti?** Kategoriler, payları ve önceki aya göre farkları. Bir kategoriye dokunmak İşlemler'i o kategoriyle açar.
- **Harcama takvimi:** Koyulaştıkça o gün daha çok harcanmıştır. En yoğun gün kırmızı çerçevelidir.
- **En çok harcanan yerler, Kartlara göre, Taksitler** (ödenen/kalan noktalarıyla) ve **Ekstreler** listesi.
- **Döviz:** USD işlemleri olan ekstrelerde kur girilirse dövizli harcamalar toplama dahil edilir.

## İşlemler

- Arama kutusu işyeri, kategori, banka, kişi, tutar ve tarihte arar (`market ağustos`, `uber`, `1.250` gibi).
- Kapsam: seçili ay ya da tüm aylar. Tür: harcama, iade ya da ödeme. Kategori çipleriyle süzme.
- Bir işleme dokununca kategori ve not düzenlenir. **"İçinde şu ifade geçen tüm işlemlere uygula"** işaretliyse kategori bir kural olarak kaydedilir ve aynı işyerinin geçmiş ve gelecek tüm işlemlerine uygulanır. Kurallar **Ayarlar**'dan silinebilir.

## Aylar

Ay ay harcama sütunları ve gelir çizgisi, ay özet tablosu (harcama, gelir, kalan) ve seçilen bir kategorinin aylara göre seyri.

## Ekle

- **Kart dışı harcama:** Nakit, banka kartı, havale gibi ekstreye yansımayan harcamalar. Açıklama, tutar, tarih, kategori (boş bırakılırsa açıklamaya göre otomatik) ve ödeme şekli girilir. Kayıt tarihin düştüğü aya eklenir.
- **Gelir:** Ay, kaynak (maaş, ek gelir…) ve tutar. Önceki ayın gelirleri tek dokunuşla kopyalanabilir.

## Plan

### Plan dönemi

**Başlangıç** ayı ve süre (3, 6, 12 ay) seçilir. Başlangıç seçilmemişse plan, kalemlerin başladığı ilk aydan başlar.

### Kalemler

- **Kart taksitleri** eklenmez, kendiliğinden gelir: her ay için o aydan önceki son ekstredeki kalan taksitler yansıtılır. Erken kapatılan bir taksit **Taksit takvimi**'nde satırına dokunularak plandan çıkarılır.
- **+ Gelir / + Gider** ile kalem eklenir. Tekrar seçenekleri: her ay (süresiz), belirli sayıda ay, tek seferlik. Hane görünümünde kalemin kime ait olduğu (Ben, Eşim, Ortak) seçilir.
- **Öneriler:** Son girilen gelirler, son 3 ayın taksitsiz kart harcaması ortalaması ve kart dışı harcama ortalaması tek dokunuşla eklenebilir.

### Bilanço ve devir

Her ay için: `bilanço = devir + gelir − taksitler − giderler`. Artı bilanço sonraki aya gelir, eksi bilanço gider olarak devreder. Devir satırına dokunularak tutar elle değiştirilebilir; ilk ayın devri **başlangıç bakiyesi**dir. **Otomatik hesaba dön** elle girilen devri kaldırır.

### Plan ile gerçekleşen

Bir ayın kart ekstreleri yüklenince ay **gerçekleşti** sayılır ve plan değerleri yerine gerçek değerler kullanılır.

| Durum | Ne zaman | Hesap |
|---|---|---|
| ✓ Gerçekleşti | Ayın ekstreleri yüklü | Gerçek değerler |
| Ekstre eksik | Önceki ay ekstresi gelen bir kartın bu ayki ekstresi yok | Plan değerleri (istenirse "Eksik olsa da gerçekleşen olarak say") |
| Ekstre bekleniyor | Ay geçmiş ama hiç ekstre yok | Plan değerleri |
| Plan değeri | "Bu ayı plan değerleriyle hesapla" seçilmiş | Plan değerleri |

Plan kalemleri gerçek verilerle şöyle eşleşir:

| Plan kalemi | Gerçekleşen değer |
|---|---|
| Kart taksitleri | Ayın ekstrelerindeki taksit dilimleri |
| "Kart harcaması (tahmini)" | Ekstrelerdeki taksitsiz harcamalar (iadeler düşülmüş, faiz dahil) |
| "Kart dışı harcamalar (tahmini)" | Ekle sekmesinde girilen kart dışı kayıtlar |
| Diğer giderler (kira, kredi…) | Aynı adı taşıyan kart dışı kayıt varsa onun tutarı; yoksa plandaki tutar varsayılır |
| Gelirler | Aynı adı taşıyan girilmiş gelir; yoksa plandaki tutar varsayılır |

- Planda karşılığı olmayan harcama ve gelirler "Plan dışı" satırı olarak görünür.
- "varsayıldı" etiketli kalemlere dokunarak gerçek tutar elle girilebilir.
- Gerçekleşen ayın bilançosu sonraki aylara devreder; **ilk plan** (gerçekleşmeler olmadan hesaplanan) grafikte kesikli çizgi, bilanço tablosunda ayrı satır olarak görünür.
- Rapor Özet'te **Plan ile karşılaştırma** kartında ve Plan'daki bilanço fişinde **Plan karşılaştırmasını aç** bağlantısında yer alır.
- Kişisel görünümlerde (Ben / Eşim) yalnızca o kişiye ait kalemler karşılaştırılır; ortak kalemler için Hane görünümüne geçin.

### Görsel kaydetme

Her panelin köşesindeki **PNG** düğmesi yalnızca o paneli kaydeder. **Plan görsellerini kaydet** menüsünden tek bir panel ya da hepsi (ayrı dosyalar olarak) seçilir. Aylık bilanço tablo ya da fiş olarak kaydedilebilir.

Android uygulamasında görseller **Belgeler › Ekstrem** klasörüne kaydedilir ve paylaşım menüsüyle WhatsApp, Galeri ya da Drive'a gönderilebilir.

## Ayarlar

- **Görünüm:** Telefona göre, açık ya da koyu tema. Üst banttaki ay/güneş simgesi de temayı değiştirir.
- **Kişiler:** Ben ve Eşim adları değiştirilebilir.
- **Kartlar:** Kartlara ad verilir, sahibi değiştirilir.
- **Kategori kuralları** ve **yüklü ekstreler** listelenir, silinebilir.
- **Yedekleme:** Yedek dosya olarak indirilir ya da panoya kopyalanır; dosyadan ya da yapıştırılan metinden geri yüklenir. Geri yükleme mevcut verilerin yerine geçer.

## Sık sorulanlar

**Bir harcama yanlış kategoride.** İşleme dokunup doğru kategoriyi seçin; "tüm işlemlere uygula" işaretliyse aynı işyeri bundan sonra hep o kategoriye düşer.

**Fişteki toplam ekstredeki dönem borcundan farklı.** Fiş net harcamayı gösterir: önceki dönem borcu ve ödemeler dahil değildir, iadeler düşülmüştür. Ekstre listesindeki "dönem borcu" bankanın yazdığı tutardır.

**Yeni sürümü kurunca verilerim gider mi?** Hayır; aynı imzalı APK eskisinin üstüne kurulur. Yine de büyük güncellemelerden önce yedek almanız önerilir.
