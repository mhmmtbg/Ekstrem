# Ekstrem — GitHub ile APK derleme

1. GitHub'da yeni, **private** bir depo aç (ör. `ekstrem`) ya da mevcut deponu kullan.
2. Bu klasörün içeriğini (gizli `.github` klasörü ve `keystore` dahil) depoya yükle.
   Web arayüzünde: "Add file → Upload files" ile sürükle bırak. `.github` klasörü
   görünmüyorsa dosya gezgininde gizli dosyaları göster.
3. Depoda **Actions** sekmesi → "APK oluştur" → **Run workflow**.
4. ~5 dakika sonra işin sayfasında **Artifacts → Ekstrem-apk** zip'ini indir,
   içindeki `app-debug.apk` dosyasını telefona at ve kur.

`keystore/debug.keystore` her derlemede aynı imzanın kullanılmasını sağlar; böylece yeni
sürümleri eskisinin üstüne kurabilir, verilerini korursun. Bu dosyayı silme.

Kaynak kod `src/` klasöründe. Değişiklik yaparsan `src` klasöründe:
`npm i pdfjs-dist@3.11.174 html-to-image@1.11.13 @fontsource-variable/bricolage-grotesque @fontsource/ibm-plex-mono`
ve ardından `python3 build.py` ile `dist/index.html` üretilir; bunu `www/index.html` olarak kopyala.
