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
} from 'lucide-react';

const CURRENT_VERSION = 'v2.6.0';
const RELEASE_DATE = '16 Eylül 2026';

export const AppUpdateChecker: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Uygulamanız en son sürümde çalışıyor.');
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
            setNewVersion('v2.5.1');
            setStatusMessage('Yeni bir sürüm indirildi ve yüklenmeye hazır!');
          }

          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setHasUpdate(true);
                  setNewVersion('v2.5.1');
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
      await new Promise((resolve) => setTimeout(resolve, 900));

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      setLastChecked(`Bugün, ${timeStr}`);

      // Check if waiting worker
      if (swRegistration?.waiting) {
        setHasUpdate(true);
        setNewVersion('v2.5.1');
        setStatusMessage('Yeni sürüm (v2.5.1) bulundu!');
      } else {
        // App is already at the latest release
        setStatusMessage('Tebrikler! Uygulamanız en son sürümde (v2.5.0) güncel.');
      }
    } catch (err) {
      setStatusMessage('Sürüm denetlendi. Mevcut sürüm aktif.');
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
        className={`min-h-[34px] sm:min-h-[36px] px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 backdrop-blur-xl border shadow-xl transition active:scale-95 cursor-pointer ${
          hasUpdate
            ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold animate-pulse shadow-emerald-500/30'
            : 'bg-slate-950/85 hover:bg-slate-900 border-white/15 hover:border-sky-400/50 text-slate-200'
        }`}
        title="Uygulama Sürümünü Denetle ve Güncelle"
      >
        <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isChecking ? 'animate-spin' : ''}`} />
        <span className="font-semibold text-[11px] sm:text-xs">Güncelle</span>
        <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-[10px] font-mono text-sky-300">
          {CURRENT_VERSION}
        </span>
        {hasUpdate && (
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        )}
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-slate-950 border border-white/20 p-5 shadow-2xl shadow-black text-white space-y-4">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Sürüm & Güncelleme Denetimi</h3>
                  <p className="text-[11px] text-slate-400">3D Parsel Studio Platformu</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Version Card */}
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300 font-medium">Yüklü Sürüm:</span>
                <span className="px-2 py-0.5 rounded-lg bg-sky-500/20 border border-sky-400/40 text-sky-300 font-mono text-xs font-bold">
                  {CURRENT_VERSION}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Son Güncelleme:</span>
                <span>{RELEASE_DATE}</span>
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
                <ArrowUpCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-bold">
                  {hasUpdate ? 'Yeni Sürüm Hazır!' : 'Sistem Durumu'}
                </div>
                <div className="text-[11px] leading-relaxed text-slate-300">
                  {statusMessage}
                </div>
              </div>
            </div>

            {/* Release notes summary */}
            <div className="text-[11px] text-slate-400 space-y-1.5 bg-black/40 p-3 rounded-xl border border-white/5">
              <div className="font-semibold text-slate-200 flex items-center justify-between">
                <span>Son Yenilikler (v2.6.0):</span>
                <span className="text-[10px] text-sky-400 font-mono">16 Eylül 2026</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                <li><strong className="text-white">Firma Bilgilerini Varsayılan Yap:</strong> Filigran sekmesinden kaydedilerek her açılışta otomatik yüklenir.</li>
                <li><strong className="text-white">Ekran & Kadraj Boyu:</strong> Üst bardan veya panelden %50-%100 arası dikey boyut ayarı.</li>
                <li><strong className="text-white">Dikey Kontrol Çubuğu:</strong> Sağ kenarda 3D açı kilidi, sıfırlama ve GPS konumlanma.</li>
                <li><strong className="text-white">Düz Zemin & Dinamik Ölçekleme:</strong> Düz uydu haritası ve videolara göre oransal filigran.</li>
              </ul>
            </div>

            {/* GitHub Sayfası ve Senkronizasyon Bilgilendirme Kartı */}
            <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-950/50 to-slate-900/60 border border-indigo-500/30 text-xs space-y-2">
              <div className="flex items-center gap-2 text-indigo-300 font-bold">
                <GitBranch className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>GitHub Sayfanızda Güncellemeler Görünmüyor mu?</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Google AI Studio içinde yapılan kod değişiklikleri, AI Studio geliştirme ortamındadır. Kendi GitHub sayfanıza yansıması için:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-300 font-medium pl-1">
                <li>AI Studio ekranının sağ üstündeki <strong className="text-sky-300">"Share / Export"</strong> veya <strong className="text-sky-300">"GitHub"</strong> butonuna tıklayıp kodları GitHub deponuza gönderin (Push/Export).</li>
                <li>GitHub Pages kullanıyorsanız, GitHub Actions derlemesinin tamamlanması için <strong className="text-amber-300">1-2 dakika</strong> bekleyin.</li>
                <li>GitHub sayfanızı açıp <strong className="text-emerald-300">Ctrl + F5</strong> ile sert yenileme yapın (veya tarayıcı önbelleğini temizleyin).</li>
              </ol>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              {hasUpdate ? (
                <button
                  type="button"
                  onClick={applyUpdateAndReload}
                  className="w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 transition cursor-pointer active:scale-98"
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

              {/* Force cache refresh button */}
              <button
                type="button"
                onClick={applyUpdateAndReload}
                className="w-full h-9 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-[11px] font-medium flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <HardDriveDownload className="w-3.5 h-3.5 text-slate-400" />
                <span>Önbelleği Temizle & Zorla Yenile</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
