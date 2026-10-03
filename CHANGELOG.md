# Değişiklik Günlüğü

## v1.5.0 — 2026-10-03

- Yeni gezinme: sol menüden tüm sayfalar; Özet, Plan ve Ayarlar sekmeli panellerde, uzun listeler panelin içinde kayar; İşlemler'de arama sabit kalır
- Özet'te uyarı şeridi: bütçe aşımı, faiz ve ücret, abonelik zammı, kategorisiz işlemler, yaklaşan son ödeme
- Bütçeler: kategori sınırları, son ayların ortalamasından öneri, ay sonu tahmini, plandaki kart harcaması tahminiyle bağlantı
- Abonelikler: tekrarlayan ödemelerin bulunması, aylık/yıllık maliyet, zam uyarısı
- Faiz ve ücretler: türe ve bankaya göre, son 12 ay
- Kategorisizler: Diğer'e düşen işyerlerini tek dokunuşla sınıflandırma
- Bunu alırsam?: bir alışverişin peşin ya da taksitli olarak plana etkisi
- Hedefler: birikim hedefleri, plana göre yetişme durumu, plana aylık birikim kalemi
- Kişiler: hanede kimin ne kadar harcadığının trendi (borç/alacak hesabı yok)
- Yıl özeti ve PNG çıktısı
- Android: Paylaş → Ekstrem ile PDF içe aktarma, son ödeme hatırlatıcısı, PIN ve parmak izi kilidi
- Özet'teki plan karşılaştırması kısa tabloya indi; ayrıntısı ayrı pencerede

## v1.4.1 — 2026-10-03

- Plan başlangıç ayı ileri alındığında önceki aylar (gerçekleşen ya da planlanan) artık hesaptan düşmüyor; sonuçları ilk aya devir olarak geliyor. Bilançoda "Önceki aylar" bölümü görünür
- İlk devir satırından "Sıfırdan başla" ile önceki aylar sayılmadan plan kurulabilir, istenirse geri alınır
- Plan başlangıcından önceki gerçekleşmiş aylar için de Özet'te plan karşılaştırması gösterilir
- Karşılaştırmada, o aydan sonra başlayan plan kalemleri yüzünden harcamaların "plan dışı" sayıldığı durum uyarılır; kalemler tek dokunuşla o aydan başlatılabilir
- APK her derlemede depodaki aynı anahtarla imzalanır (önceki sürümler rastgele anahtarla imzalandığı için güncelleme olarak kurulamıyordu); derleme imzayı doğrular

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
