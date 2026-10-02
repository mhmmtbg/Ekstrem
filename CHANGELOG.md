# Değişiklik Günlüğü

## v1.4.0 — 2026-10-02

- Yeni bankalar: Halkbank Paraf, DenizBank, Enpara.com, İş Bankası Maximum, Garanti BBVA Bonus; QNB, VakıfBank, TEB, ING, Kuveyt Türk ve diğer bankaların tanınması
- Genel ayrıştırıcı yeniden yazıldı: iki satıra bölünen tablo başlıkları, çok satırlı açıklamalar, tarihsiz faiz/BSMV satırları, `+`/`CR`/`(-)` ile gösterilen alacaklar, farklı tarih biçimleri, farklı bankaların taksit yazımları, sayfa geçişinde tekrarlanan satırlar
- Yedek geri yükleme düzeltildi: mesaj uygulamalarında bozulan yedek metni artık kayıt kayıt kurtarılıyor, okunamayan kayıtlar raporlanıyor
- Yedek artık dosya olarak kaydediliyor ve paylaşılıyor (Belgeler › Ekstrem)
- Android'de uygulama kapanırken otomatik yedek

## v1.3.0 — 2026-10-02

- Plan ile gerçekleşen karşılaştırması: ekstresi yüklenen ay "gerçekleşti" sayılır; plan kalemleri ekstre, kart dışı kayıt ve girilen gelirlerle eşleştirilir
- Özet'te "Plan ile karşılaştırma" kartı: plan / gerçekleşen / fark tablosu, kalem bazında sapma çubukları, PNG çıktısı
- Gerçekleşen bilanço sonraki aylara devreder; ilk plan grafikte kesikli çizgi, bilanço tablosunda ayrı satır olarak görünür
- Eşleşmeyen kalemler için gerçek tutarın elle girilmesi; bir ayı plan değerleriyle hesaplama seçeneği
- Eksik kart ekstresi tespiti (önceki ay ekstresi gelen kartlara göre)
- Plan başlangıç ayı artık her ay kendiliğinden kaymıyor
- Taksitler her ekstrede aynı alışverişe göre tanınıyor
- Kopya ekstre tespiti ve tek dokunuşla temizleme; ekstre silme
- Plan görselleri: her panel ayrı görsel, bilanço için tablo görünümü, hepsini ayrı dosyalar olarak kaydetme
- Kategori kuralları genelleştirildi

## v1.2.0 — 2026-09-29

- Plan sekmesi: 3/6/12 aylık nakit akışı, taksitlerin otomatik yansıması, gelir ve gider kalemleri, aylık bilanço ve devir, taksit takvimi, gider dağılımı
- Özet fişi ve plan panelleri için PNG çıktısı (Android'de Belgeler › Ekstrem klasörüne kayıt ve paylaşım)
- Koyu tema (telefona göre, açık, koyu)
- Yapı Kredi taksitlerinin okunması düzeltildi
- Sabit imza anahtarı: yeni sürümler eskisinin üstüne kurulur

## v1.1.0 — 2026-09-23

- Akbank Axess ve Yapı Kredi World ekstreleri; tablo düzenindeki diğer ekstreler için genel ayrıştırıcı
- Ben / Eşim / Hane sekmeleri, kart sahipliği
- Kart dışı harcama girişi
- Yeni görsel tasarım: fiş görünümünde özet, harcama takvimi, simgeli kategoriler
- Android geri hareketi desteği, alt menünün içeriği örtmesi düzeltildi

## v1.0.0 — 2026-09-19

İlk sürüm.

- Ziraat Bankkart ekstrelerinin ayrıştırılması ve banka toplamıyla doğrulama
- Kategoriler, ay ay özet, işlem araması, gelir girişi
- Yerel veri saklama, yedekleme ve geri yükleme
