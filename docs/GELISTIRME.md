# Geliştirme ve Derleme

## Mimari

Uygulamanın arayüzü tek bir HTML dosyasıdır: **`www/index.html`**. Saf HTML, CSS ve JavaScript ile yazılmıştır; çatı (framework) kullanmaz ve internet bağlantısı gerektirmez. PDF.js, html-to-image ve yazı tipleri dosyanın içine gömülüdür.

Android paketi [Capacitor](https://capacitorjs.com) ile üretilir: bu HTML dosyası bir Android WebView içinde çalışır. Dosya kaydetme ve paylaşma için Capacitor'ın Filesystem ve Share eklentileri, geri hareketi için App eklentisi kullanılır.

Kaynak kod `src/` klasöründedir ve `build.py` ile tek dosyada birleştirilir:

| Dosya | İçerik |
|---|---|
| `src.html` | Sayfa iskeleti, stiller (açık ve koyu tema jetonları), alt menü |
| `parser.js` | Ziraat Bankkart ayrıştırıcısı (sütun konumlarıyla; TL, USD, Bankkart Lira) |
| `generic.js` | Genel ayrıştırıcı: satır ve sütun tespiti, TR/US sayı biçimi, EBCDIC çözme (Akbank), alt satırdaki taksit bilgisi (Yapı Kredi), banka tespiti |
| `cats.js` | Kategori ve anahtar kelime listesi, Türkçe karakter sadeleştirme |
| `app.js` | Depolama (IndexedDB), içe aktarma, kopya tespiti, Özet, İşlemler, Aylar, Ekle, Ayarlar, gezinme geçmişi |
| `plan.js` | Tema, PNG çıktısı, plan hesabı, gerçekleşme eşleştirmesi, plan görünümleri; derlemede `app.js`'nin başlatma bölümünden önce eklenir |

### Doğrulama

Her ekstre ayrıştırıldıktan sonra bankanın kendi toplamıyla karşılaştırılır:

```
önceki dönem borcu + harcamalar (faiz dahil) − ödemeler − iadeler = dönem borcu
```

Bu tutmazsa içe aktarma ekranında uyarı gösterilir. Yeni bir banka desteği eklerken bu eşitliğin sağlanması hedeflenir.

### Veri modeli

Veriler cihazdaki IndexedDB'de üç tabloda tutulur (`statements`, `incomes`, `kv`). Yedek dosyası aynı yapının JSON hâlidir:

```json
{
  "app": "ekstrem", "v": 2,
  "statements": [
    { "id": "ziraat-bankkart_2026-09-28_4821", "bank": "Ziraat Bankkart", "kesim": "2026-09-28",
      "month": "2026-09", "profile": "me", "ok": true,
      "tx": [ { "i": 0, "date": "2026-09-03", "card": "4821", "desc": "MİGROS ÇANKAYA",
                "tl": 842.50, "usd": 0, "type": "expense" } ] }
  ],
  "incomes": [ { "id": "i1", "month": "2026-09", "source": "Maaş", "amount": 85000, "profile": "me" } ],
  "plan": { "start": "2026-08", "horizon": 6, "items": [], "carry": {}, "excl": {}, "real": {}, "act": {} },
  "rules": [], "cards": {}, "cardProfile": {}, "profiles": [], "theme": "auto"
}
```

- `type`: `expense` (harcama), `fee` (faiz/ücret), `refund` (iade), `payment` (ödeme).
- Kart dışı harcamalar `manual: true` işaretli, `manual_<kişi>_<ay>` kimlikli kayıtlarda tutulur.
- Taksitli işlemlerde `taksitNo`, `taksitToplam`, `taksitTutar` alanları bulunur.

## Web arayüzünü derleme

Gereken: Node.js 18+ ve Python 3.

```bash
cd src
npm install          # PDF.js, html-to-image ve yazı tiplerini indirir
python3 build.py     # src/dist/index.html ve ../www/index.html dosyalarını üretir
```

`www/index.html` doğrudan masaüstü tarayıcıda açılarak denenebilir (Chrome'da telefon görünümü önerilir).

## APK derleme

APK, GitHub Actions'ta `.github/workflows/build-apk.yml` ile derlenir:

1. Capacitor ile Android projesi oluşturulur, `www/` içeriği kopyalanır.
2. `android-res/` içindeki ikonlar Android projesine kopyalanır.
3. `keystore/debug.keystore` ile imzalanır; sürüm adı ve numarası ayarlanır.
4. `./gradlew assembleDebug` ile APK üretilir.

| Tetikleyici | Sonuç |
|---|---|
| `main` dalına gönderim ya da **Run workflow** | APK, çalışmanın **Artifacts** bölümünde `Ekstrem-apk` olarak |
| `v*` biçiminde etiket (ör. `v1.3.0`) ya da yayımlanan bir sürüm | Ayrıca [Releases](../../releases) sayfasında `Ekstrem-v1.3.0.apk` olarak yayımlanır; notlar CHANGELOG.md'den alınır |

Yeni sürüm yayımlamak için iki yol vardır:

- GitHub'da **Releases → Draft a new release**, etiket olarak `v1.3.0` yazıp **Publish release**. İş akışı APK'yı derleyip bu sürüme ekler.
- Ya da komut satırından:

```bash
git tag v1.3.0
git push origin v1.3.0
```

### İmza anahtarı hakkında

`keystore/debug.keystore`, her derlemenin aynı imzayı taşımasını ve yeni sürümlerin eskisinin üstüne veri kaybı olmadan kurulmasını sağlar. Bu anahtar herkese açık bir hata ayıklama anahtarıdır (parola: `android`). Kendi derlemenizi dağıtacaksanız kendi anahtarınızı üretip GitHub Secrets üzerinden kullanmanız önerilir.

## Bilinen sınırlamalar

- Yalnızca metin katmanı olan (taranmamış) PDF ekstreler okunur.
- Ziraat, Akbank Axess ve Yapı Kredi World dışındaki bankalarda sütun düzeni farklıysa bazı satırlar okunamayabilir; içe aktarma ekranındaki doğrulama rozeti bunu gösterir.
- Uygulama Google Play'de değildir; Play Store için hedef API seviyesinin yükseltilmesi ve AAB biçiminde imzalı paket gerekir.
