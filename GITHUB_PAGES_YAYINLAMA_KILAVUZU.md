# GitHub Pages Yayınlama ve PWA Kurulum Kılavuzu

Bu proje **Vite + React + PWA (Progressive Web App)** standartlarında yapılandırılmıştır. Hem GitHub Pages üzerinde ücretsiz olarak barındırılabilir hem de kullanıcılar tarafından mobil cihazlara (iOS / Android) veya bilgisayarlara yerel bir uygulama gibi yüklenebilir.

---

## 🚀 1. GitHub Sayfanızda (GitHub Pages) Yayınlama Adımları

Uygulamayı kendi GitHub hesabınızda yayınlamak için aşağıdaki 3 kolay adımı takip edebilirsiniz:

### 1. Adım: Projeyi GitHub Deposuna Gönderin (Push)
Terminalinizde projenin kök dizininde şu komutları çalıştırın (veya GitHub Desktop / VS Code ile gönderin):

```bash
git add .
git commit -m "feat: PWA desteği ve GitHub Pages otomatik dağıtım iş akışı eklendi"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADINIZ/DEPO_ADINIZ.git
git push -u origin main
```

### 2. Adım: GitHub Pages'i Aktifleştirin
1. GitHub'da deponuzun sayfasına gidin (örn: `https://github.com/yilmazserdar7/parsel-3d-studio`).
2. Üst menüden **Settings (Ayarlar)** sekmesine tıklayın.
3. Sol menüden **Pages** seçeneğine tıklayın.
4. **"Build and deployment"** başlığı altındaki **Source** kısmında:
   - Seçenek olarak **"GitHub Actions"** seçin.
5. Hazırladığımız `.github/workflows/deploy.yml` iş akışı otomatik olarak devreye girecektir.

### 3. Adım: Sitenizin Keyfini Çıkarın!
- GitHub Actions sekmesinde build işlemi ~1-2 dakika içinde yeşil tik alarak tamamlanır.
- Siteniz şu adreste canlı yayına geçecektir:
  👉 **`https://KULLANICI_ADINIZ.github.io/DEPO_ADINIZ/`**

> **Not:** `vite.config.ts` içerisindeki `base: './'` ayarı sayesinde uygulamanız hem ana alan adında hem de GitHub Pages alt klasöründe (`/depo-adi/`) hiçbir 404 hatası olmadan pürüzsüzce çalışır.

---

## 📱 2. PWA (Progressive Web App) Özellikleri

Uygulamanıza şu PWA bileşenleri ve standartları entegre edilmiştir:

1. **Web App Manifest (`manifest.webmanifest`)**:
   - `id`, `name`, `short_name`, `theme_color`, `background_color`, `display: 'standalone'`
   - 192x192, 512x512 ve %15 koruma alanlı Maskable ikonlar
2. **Service Worker (Workbox)**:
   - Cesium CDN, Google Fonts ve uygulama varlıkları için otomatik çevrimdışı önbellekleme (Offline caching).
   - Yeni bir sürüm yayınlandığında otomatik arka plan güncellemesi (`registerType: 'autoUpdate'`).
3. **Uygulama İçi Kurulum Butonu (`PWAInstallButton`)**:
   - Üst çubukta ve Kontrol Paneli "Kayıt & Dışa Aktar" sekmesinde yer alır.
   - Android & PC: Tek tıkla yerel masaüstü / mobil uygulama olarak yükler.
   - iOS Safari: 3 adımlı "Ana Ekrana Ekle" Türkçe rehber penceresi sunar.
4. **Çevrimdışı Durum Göstergesi (`OfflineIndicator`)**:
   - İnternet bağlantısı kesildiğinde kullanıcıyı bilgilendiren zarif rozet.
