<div align="center">

# 403Changer

**League of Legends için tek tıkla kostüm değiştirici.**

[![Sürüm](https://img.shields.io/github/v/release/onlyfourhundredthree/403Changer-Releases?color=c8aa6e&label=s%C3%BCr%C3%BCm&style=flat-square)](https://github.com/onlyfourhundredthree/403Changer-Releases/releases/latest)
[![İndirme](https://img.shields.io/github/downloads/onlyfourhundredthree/403Changer-Releases/total?color=c8aa6e&label=indirme&style=flat-square)](https://github.com/onlyfourhundredthree/403Changer-Releases/releases)

### [⬇️ Son sürümü indir](https://github.com/onlyfourhundredthree/403Changer-Releases/releases/latest)

</div>

> Bu depo **yalnızca kurulum dosyalarını** barındırır. 403Changer'ın kaynak kodu burada yayınlanmaz.

---

## İndirme

Her sürümün altında iki dosya bulunur:

| Dosya | Ne işe yarar |
| --- | --- |
| `403Changer_Setup_<sürüm>.exe` | **Kurulum dosyası.** Bunu indirip çalıştırın. |
| `update_package_<sürüm>.zip` | Uygulamanın otomatik güncellemesi için. Elle indirmeniz gerekmez. |

En güncel sürüm: **[Releases → Latest](https://github.com/onlyfourhundredthree/403Changer-Releases/releases/latest)**

## Kurulum

1. `403Changer_Setup_<sürüm>.exe` dosyasını indirin.
2. Çalıştırın. Windows SmartScreen uyarısı çıkarsa **Ek bilgi → Yine de çalıştır** deyin.
3. Kurulum bittikten sonra 403Changer'ı açın, Riot Client'ı başlatın.
4. İlk açılışta oyun klasörünü seçin (örn. `C:\Riot Games\League of Legends\Game`).
5. Mod yükleme sihirbazından **Şampiyon Skini** ya da **Diğer Modlar** seçin — gerisini uygulama halleder.

## Özellikler

- **Şampiyon skinleri:** Seçtiğiniz kostüm oyun başlarken otomatik enjekte edilir.
- **Diğer modlar:** Harita, font, seslendirme, VFX/SFX ve arayüz modları tek bir klasörde toplanır.
- **Chroma karmaşası yok:** Kostüm listesinde yalnızca gerçek skinler görünür.
- **Otomatik enjeksiyon:** Şampiyon seçiminden oyun başlangıcına kadar süreç kendiliğinden yürür.
- **Otomatik güncelleme:** Yeni sürüm çıktığında uygulama içinden güncellenir.
- **Kalıcı seçimler:** Son kullandığınız skin ve modlar hatırlanır.

## Gereksinimler

- Windows 10 / 11 (64-bit)
- Riot Client üzerinden kurulu League of Legends
- **LTK Manager patcher bileşenleri:** `ltk_patcher_host.exe` ve `ltk_patcher_dll.dll` dosyaları uygulamanın `injection\tools` klasöründe bulunmalıdır (LTK Manager kurulumundan kopyalanır). 403Changer bu dosyaları paketlemez, kullanıcı sağlar.

## Sık sorulanlar

<details>
<summary><b>Skin oyun içinde görünmüyor</b></summary>

- LTK patcher bileşenlerinin güncel olduğundan emin olun (yeni yama sonrası eski DLL hata verebilir).
- Riot Client → **Onar** ile oyun dosyalarını doğrulayın.
- League ve 403Changer'ı tamamen kapatıp yeniden başlatın.
- Hata sürüyorsa 403Changer log klasöründeki (marka menüsü → *log klasörü aç*) en yeni `runoverlay_*.log` dosyasını paylaşın.

</details>

<details>
<summary><b>Antivirüs / SmartScreen uyarısı</b></summary>

İmzasız bir kurulum dosyası olduğu için Windows uyarabilir. Dosyayı yalnızca bu depodan indirdiğinizden emin olun; SmartScreen'de **Ek bilgi → Yine de çalıştır** ile devam edebilirsiniz.

</details>

<details>
<summary><b>League artık açılmıyor / eski haline dönmek istiyorum</b></summary>

403Changer kapanırken League üzerindeki hook'u otomatik olarak temizler. Yine de bir sorun kalırsa uygulamayı kapatıp Riot Client'ı yeniden başlatın; gerekirse kurulumu kaldırın.

</details>

<details>
<summary><b>Güncelleme nasıl çalışıyor?</b></summary>

Uygulama açılışta bu depodaki en son sürümü kontrol eder, onay verirseniz `update_package_*.zip` dosyasını indirip kendini günceller.

</details>

## Destek & geri bildirim

- Hata bildirimi ve öneriler: **[Issues](https://github.com/onlyfourhundredthree/403Changer-Releases/issues)**
- Yeni sürüm bildirimleri: bu depoyu **Watch → Custom → Releases** ile takip edin.

## Yasal uyarı

403Changer, Riot Games ile bağlantılı değildir ve Riot Games tarafından onaylanmamıştır. League of Legends ve ilgili tüm markalar Riot Games, Inc. şirketine aittir. Üçüncü taraf yazılım kullanımı Riot Games Hizmet Şartları kapsamında risk taşır; sorumluluk kullanıcıya aittir. Uygulamayı kendi hesabınızda denemek size kalmıştır.

---

<div align="center">

## English

**403Changer** is a one-click skin changer for League of Legends.

This repository **only hosts release builds** — the source code is not published here.

1. Download `403Changer_Setup_<version>.exe` from [Releases](https://github.com/onlyfourhundredthree/403Changer-Releases/releases/latest) and run it (SmartScreen: *More info → Run anyway*).
2. Open 403Changer, start the Riot Client and point it at your `League of Legends\Game` folder.
3. Pick a **champion skin** or **other mods** — injection happens automatically when the game starts.

Requires Windows 10/11 (64-bit) and the LTK Manager patcher binaries (`ltk_patcher_host.exe`, `ltk_patcher_dll.dll`) inside `injection\tools`. Not affiliated with Riot Games; use at your own risk.

</div>
