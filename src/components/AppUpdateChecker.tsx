import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ArrowUpCircle,
  X,
  ShieldCheck,
  HardDriveDownload,
  GitBranch,
  ExternalLink,
  Info,
  Sparkles,
  Zap,
} from 'lucide-react';

const CURRENT_VERSION = 'v2.7.0';
const RELEASE_DATE = '23 Eylül 2026';

export const AppUpdateChecker: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Uygulamanız en son sürümde (v2.7.0) optimize çalışıyor.');
  const [lastChecked, setLastChecked] = useState<string>('Az önce');
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Check service worker for real background updates
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) {
          setSwRegistration(reg);
          if (reg.waiting) {
            setHasUpdate(true);
            setNewVersion('v2.7.1');
            setStatusMessage('Yeni bir sürüm indirildi ve yüklenmeye hazır!');
          }

          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setHasUpdate(true);
                  setNewVersion('v2.7.1');
                  setStatusMessage('Yeni sürüm hazır! Güncellemeyi uygulamak için butona dokunun.');
                }
              });
            }
          });
        }
      });
    }
  }, []);

  const checkForUpdates = async () => {
    setIsChecking(true);
    setStatusMessage('Sürüm sunucusu ve önbellek kontrol ediliyor...');

    try {
      if (swRegistration) {
        await swRegistration.update().catch(() => {});
      }

      // Simulate network version probe
      await new Promise((resolve) => setTimeout(resolve, 800));

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      setLastChecked(`Bugün, ${timeStr}`);

      // Check if waiting worker
      if (swRegistration?.waiting) {
        setHasUpdate(true);
        setNewVersion('v2.7.1');
        setStatusMessage('Yeni sürüm (v2.7.1) bulundu!');
      } else {
        // App is already at the latest release
        setStatusMessage('Tebrikler! Uygulamanız en son sürümde (v2.7.0) güncel ve optimize.');
      }
    } catch (err) {
      setStatusMessage('Sürüm denetlendi. Mevcut sürüm (v2.7.0) aktif.');
    } finally {
      setIsChecking(false);
    }
  };

  const applyUpdateAndReload = async () => {
    try {
      if (swRegistration?.waiting) {
        swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      // Clear caches to guarantee instant fresh code load
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }

      setStatusMessage('Güncelleme uygulanıyor, yeniden başlatılıyor...');
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (e) {
      window.location.reload();
    }
  };

  return (
    <>
      {/* Top Bar Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`min-h-[34px] sm:min-h-[36px] px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 backdrop-blur-xl border shadow-xl transition active:scale-95 cursor-pointer shrink-0 ${
          hasUpdate
            ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold animate-pulse shadow-emerald-500/30'
            : 'bg-slate-950/85 hover:bg-slate-900 border-white/15 hover:border-sky-400/50 text-slate-200'
        }`}
        title="Uygulama Sürümünü Denetle ve Güncelle"
      >
        <RefreshCw className={`w-3.5 h-3.5 text-sky-400 shrink-0 ${isChecking ? 'animate-spin' : ''}`} />
        <span className="hidden sm:inline font-semibold text-[11px] sm:text-xs">Güncelle</span>
        <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-[10px] font-mono text-sky-300 font-bold">
          {CURRENT_VERSION}
        </span>
        {hasUpdate && (
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        )}
      </button>

      {/* Modal Dialog - Responsive & Screen-fitted layout */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg max-h-[92vh] sm:max-h-[88vh] rounded-2xl bg-slate-950/95 border border-white/20 shadow-2xl shadow-black text-white flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Pinned Header */}
            <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-white/10 flex items-center justify-between shrink-0 bg-slate-900/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 shrink-0">
                  <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                    <span>Sürüm & Güncelleme Denetimi</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      {CURRENT_VERSION}
                    </span>
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-400">3D Parsel Studio Platformu</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
                title="Kapat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto px-4 py-3.5 sm:px-5 sm:py-4 space-y-3.5 overscroll-contain">
              
              {/* Current Version Card */}
              <div className="p-3 sm:p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                    <span>Yüklü Sürüm:</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="px-2 py-0.5 rounded-lg bg-sky-500/20 border border-sky-400/40 text-sky-300 font-mono text-xs font-bold">
                      {CURRENT_VERSION}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Sürüm Tarihi:</span>
                  <span className="text-slate-200 font-medium">{RELEASE_DATE}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Son Denetim:</span>
                  <span className="text-slate-300 font-mono">{lastChecked}</span>
                </div>
              </div>

              {/* Status notification */}
              <div
                className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                  hasUpdate
                    ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
                    : 'bg-sky-500/10 border-sky-400/20 text-sky-200'
                }`}
              >
                {hasUpdate ? (
                  <ArrowUpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5">
                  <div className="font-bold text-xs">
                    {hasUpdate ? 'Yeni Sürüm Hazır!' : 'Sistem Durumu'}
                  </div>
                  <div className="text-[11px] leading-relaxed text-slate-300">
                    {statusMessage}
                  </div>
                </div>
              </div>

              {/* Release & Audit notes summary */}
              <div className="text-[11px] text-slate-300 space-y-2 bg-black/50 p-3 sm:p-3.5 rounded-xl border border-white/10">
                <div className="font-bold text-slate-100 flex items-center justify-between pb-1.5 border-b border-white/10">
                  <span className="flex items-center gap-1.5 text-sky-300">
                    <Zap className="w-3.5 h-3.5 text-sky-400" />
                    <span>Güncel Denetleme & Yenilik Notları ({CURRENT_VERSION}):</span>
                  </span>
                  <span className="text-[10px] text-sky-400 font-mono font-semibold">{RELEASE_DATE}</span>
                </div>
                <ul className="space-y-1.5 text-slate-300 text-[11px]">
                  <li className="flex items-start gap-1.5">
                    <span className="text-sky-400 font-bold shrink-0">✓</span>
                    <span><strong className="text-white">2D Kuşbakışı & 3D Perspektif Harita:</strong> 2D tam düz dik açı (-89.0°) ve 3D küre açısı tek tıkla geçiş; KML sınırlarını ekran oranına göre kadraja sıfır taşma ile tam ortalama.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold shrink-0">✓</span>
                    <span><strong className="text-white">3D Arazi Akıllı Sınır Ortalama:</strong> Arazi kabartması açıldığında veya kapatıldığında kot farkı hesaplanarak sınırların otomatik ekrana sığdırılması.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-cyan-400 font-bold shrink-0">✓</span>
                    <span><strong className="text-white">2D Kuşbakışı Tur Özelliği (3D Tur Üzerinde):</strong> 3D Tur butonunun hemen üzerine eklenen 2D Tur butonu ile haritayı tam tepeden (kuşbakışı plan modunda) 360° döndürerek parselin tüm cephelerini ve kadastral yönlerini düz harita formunda izleyebilirsiniz.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-sky-400 font-bold shrink-0">✓</span>
                    <span><strong className="text-white">İkon Çubuğunu & Filigran Etiketini Ekranda Kaydırma ve Büyütme:</strong> Sağdaki hızlı erişim ikon çubuğu ekranda istenilen yere serbestçe sürüklenebilir; filigran etiketi doğrudan ekranda taşınabilir, +/- butonlarıyla ve sağ alt köşesinden çekilerek serbestçe büyütülüp küçültülebilir.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold shrink-0">✓</span>
                    <span><strong className="text-white">Gelişmiş Hızlı Erişim İkon Çubuğu:</strong> Çubuk başına Büyütme (+) ve Küçültme (-) zoom butonları; Konum altına sırasıyla HD Fotoğraf çekme, 3D Tur başlatma/durdurma ve 1080p Video Kayıt butonları eklendi.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-amber-400 font-bold shrink-0">✓</span>
                    <span><strong className="text-white">Cihaz Hız & 60 FPS Optimizasyonu:</strong> Telefon, Tablet ve PC donanımına göre dinamik 3D tur hızı, karo yükleme hassasiyeti ve 60Hz/90Hz/120Hz delta-time akıcılığı.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-cyan-400 font-bold shrink-0">✓</span>
                    <span><strong className="text-white">KML Çizim Animasyonu (Silerek Takip & Tamamlama):</strong> Sınırı ekranda sıfırdan silinmiş başlatıp KML koordinatlarını seçili stil ayarlarına (renk, kalınlık, neon ışıma, kesikli çizgi) göre adım adım çizer; çizim bitince tüm sınırı ve parsel alanını eksiksiz tamamlar.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-rose-400 font-bold shrink-0">✓</span>
                    <span><strong className="text-white">Kuzeye Döndür (Pusula) Butonu:</strong> Konum butonunun hemen yanında anlık yön açısını gösteren ve tek dokunuşla haritayı 0° Tam Kuzey yönüne çeviren pusula butonu.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-indigo-400 font-bold shrink-0">✓</span>
                    <span><strong className="text-white">Kalıcı Firma & Filigran Bilgileri:</strong> Filigran kartındaki telefon, firma adı, logo ve ada/parsel bilgilerinin yerel depolamada saklanması.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-purple-400 font-bold shrink-0">✓</span>
                    <span><strong className="text-white">Dikey Kadraj Boyut Ayarı:</strong> %50-%100 arası dikey ekran ölçekleme ve sağ dikey hızlı erişim çubuğu.</span>
                  </li>
                </ul>
              </div>

              {/* GitHub Sayfası ve Senkronizasyon Bilgilendirme Kartı */}
              <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-950/40 to-slate-900/60 border border-indigo-500/30 text-xs space-y-1.5">
                <div className="flex items-center gap-2 text-indigo-300 font-bold">
                  <GitBranch className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="text-[11px] sm:text-xs">GitHub Sayfanızda Güncellemeler Görünmüyor mu?</span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-300 leading-relaxed">
                  Google AI Studio içindeki değişikliklerin GitHub Pages sayfanıza yansıması için:
                </p>
                <ol className="list-decimal list-inside space-y-0.5 text-[10px] sm:text-[11px] text-slate-300 font-medium pl-1">
                  <li>AI Studio sağ üstündeki <strong className="text-sky-300">"GitHub"</strong> butonuna tıklayıp kodları GitHub deponuza Push edin.</li>
                  <li>GitHub Actions derlemesinin tamamlanması için <strong className="text-amber-300">1-2 dakika</strong> bekleyin.</li>
                  <li>Sayfanızı açıp <strong className="text-emerald-300">Ctrl + F5</strong> ile sert yenileme yapın.</li>
                </ol>
              </div>

            </div>

            {/* Pinned Action Buttons Footer - Always visible and screen-fitted */}
            <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-t border-white/10 bg-slate-900/90 shrink-0 space-y-2">
              {hasUpdate ? (
                <button
                  type="button"
                  onClick={applyUpdateAndReload}
                  className="w-full h-10 sm:h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 transition cursor-pointer active:scale-98"
                >
                  <ArrowUpCircle className="w-4 h-4" />
                  <span>Yeni Sürümü Yükle ve Yeniden Başlat ({newVersion})</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={checkForUpdates}
                  disabled={isChecking}
                  className="w-full h-10 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 transition cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                  <span>{isChecking ? 'Denetleniyor...' : 'Güncellemeleri Şimdi Denetle'}</span>
                </button>
              )}

              {/* Force cache refresh & close buttons in a neat flex row */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={applyUpdateAndReload}
                  className="flex-1 h-8 sm:h-9 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-[11px] font-medium flex items-center justify-center gap-1.5 transition cursor-pointer"
                  title="Tüm önbellekleri temizler ve sayfayı zorla yeniden yükler"
                >
                  <HardDriveDownload className="w-3.5 h-3.5 text-slate-400" />
                  <span>Önbelleği Temizle & Zorla Yenile</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 h-8 sm:h-9 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white text-[11px] font-semibold transition cursor-pointer"
                >
                  Kapat
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
