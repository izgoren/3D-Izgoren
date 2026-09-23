export type DeviceTier = 'phone' | 'tablet' | 'pc';

export interface DeviceOptimizationProfile {
  tier: DeviceTier;
  label: string;
  shortLabel: string;
  badge: string;
  tourSpeed: number; // 3D Tur dönüş hızı (açı / tick)
  flyDuration: number; // Parsel merkezleme uçuş süresi (saniye)
  resolutionScale: number; // Cesium canvas çözünürlük ölçeği
  maximumScreenSpaceError: number; // Uydu ve arazi karo yükleme hassasiyeti
  throttleNotificationMs: number; // React state bildirim frekansı (ms)
  targetFps: number;
  description: string;
}

/**
 * Cihaz türünü (Telefon, Tablet, PC) donanım özellikleri, dokunmatik desteği ve ekran genişliğine göre otomatik tespit eder.
 */
export function detectDeviceTier(): DeviceTier {
  if (typeof window === 'undefined') return 'pc';

  const ua = (navigator.userAgent || '').toLowerCase();
  const width = window.innerWidth || screen.width || 1024;
  const height = window.innerHeight || screen.height || 768;
  const minDim = Math.min(width, height);
  const maxDim = Math.max(width, height);
  const isTouch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;

  // 1. iPad ve iPadOS (Safari genellikle MacIntel olarak raporlar)
  const isIPad =
    ua.includes('ipad') ||
    (ua.includes('macintosh') && isTouch && maxDim >= 1024 && minDim >= 700);

  // 2. Android Tablet
  const isAndroidTablet =
    ua.includes('android') && !ua.includes('mobile') && (minDim >= 600 || maxDim >= 960);

  // 3. Genel Tablet tespiti
  const isTablet =
    isIPad ||
    isAndroidTablet ||
    ua.includes('tablet') ||
    ua.includes('playbook') ||
    ua.includes('silk') ||
    (isTouch && minDim >= 600 && maxDim <= 1366 && width <= 1024);

  if (isTablet) {
    return 'tablet';
  }

  // 4. Telefon tespiti (iPhone, Android Mobile, Windows Phone, vb.)
  const isMobileUA =
    ua.includes('mobile') ||
    ua.includes('iphone') ||
    ua.includes('ipod') ||
    ua.includes('blackberry') ||
    ua.includes('windows phone') ||
    (ua.includes('android') && ua.includes('mobile'));

  if (isMobileUA || (isTouch && width < 640)) {
    return 'phone';
  }

  // 5. Genişlik bazlı ek kontrol
  if (width < 640) {
    return 'phone';
  }
  if (width <= 1024 && isTouch) {
    return 'tablet';
  }

  return 'pc';
}

/**
 * Belirlenen cihaz sınıfına göre optimize edilmiş performans profilini döner.
 */
export function getDeviceOptimizationProfile(tierOverride?: DeviceTier): DeviceOptimizationProfile {
  const tier = tierOverride || detectDeviceTier();
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  switch (tier) {
    case 'phone':
      return {
        tier: 'phone',
        label: '📱 Telefon (Akıcı, Düşük Isınma & Pil Tasarrufu)',
        shortLabel: '📱 Telefon',
        badge: 'HIZ: TELEFON OPTİMİZE',
        tourSpeed: 0.22, // Yumuşak, mobil GPU'yu yormayan 3D tur hızı
        flyDuration: 0.55, // Hızlı, bekletmeyen anında merkezleme
        resolutionScale: Math.max(0.85, Math.min(dpr, 1.25)), // 3x-4x OLED panellerde aşırı ısınmayı önleyen kristal netlik
        maximumScreenSpaceError: 2.5, // 4G/5G veri tasarruflu ve ultra hızlı karo yükleme
        throttleNotificationMs: 280,
        targetFps: 60,
        description: 'Mobil işlemci ve batarya için optimize edilmiş akıcı 3D deneyim.',
      };

    case 'tablet':
      return {
        tier: 'tablet',
        label: '📟 Tablet (Dengeli Performans & Retina Netliği)',
        shortLabel: '📟 Tablet',
        badge: 'HIZ: TABLET OPTİMİZE',
        tourSpeed: 0.30, // Dengeli sinematik hız
        flyDuration: 0.70,
        resolutionScale: Math.max(1.0, Math.min(dpr, 1.5)),
        maximumScreenSpaceError: 2.0,
        throttleNotificationMs: 200,
        targetFps: 60,
        description: 'Büyük dokunmatik ekranlar için dengeli yüksek çözünürlük ve akıcılık.',
      };

    case 'pc':
    default:
      return {
        tier: 'pc',
        label: '💻 Masaüstü PC (Maksimum Detay & 60+ FPS)',
        shortLabel: '💻 Bilgisayar',
        badge: 'HIZ: MASAÜSTÜ MAX',
        tourSpeed: 0.38, // Canlı, yüksek tempolu 3D tur
        flyDuration: 0.85,
        resolutionScale: Math.max(1.0, Math.min(dpr, 2.0)),
        maximumScreenSpaceError: 1.5, // Maksimum uydu ve arazi detayı
        throttleNotificationMs: 140,
        targetFps: 60,
        description: 'Harici GPU ve güçlü işlemciler için en yüksek detay ve hız modu.',
      };
  }
}
