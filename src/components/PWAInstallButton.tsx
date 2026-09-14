import React, { useState } from 'react';
import { Download, Smartphone, X, CheckCircle2, Share2, PlusSquare } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'panel';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // Zaten PWA olarak kuruluysa butonu gizle veya yüklü rozeti göster
  if (isInstalled) {
    if (variant === 'panel') {
      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Uygulama Cihaza Yüklendi (PWA Aktif)</span>
        </div>
      );
    }
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      setIsInstalling(true);
      try {
        await install();
      } finally {
        setIsInstalling(false);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      // Chrome/Edge/Diğer tarayıcılar için bilgilendirme
      setShowIOSGuide(true);
    }
  };

  return (
    <>
      <button
        id={`pwa-install-btn-${variant}`}
        onClick={handleInstallClick}
        disabled={isInstalling}
        title="Uygulamayı telefona veya masaüstüne uygulama (PWA) olarak yükleyin"
        className={
          variant === 'header'
            ? 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-md hover:shadow-sky-500/20 transition-all active:scale-95'
            : 'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg hover:shadow-sky-500/20 transition-all active:scale-98'
        }
      >
        <Download className="w-3.5 h-3.5" />
        <span>{isIOS ? 'Telefona Yükle' : 'Uygulamayı Yükle'}</span>
      </button>

      {/* iOS / Manuel Yükleme Rehberi Modalı */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-5 shadow-2xl text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-sky-400" />
                <h3 className="text-sm font-bold text-white">
                  {isIOS ? 'iPhone / iPad\'e Yükle' : 'Cihaza Uygulama Olarak Ekle'}
                </h3>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs leading-relaxed text-slate-300">
              {isIOS ? (
                <>
                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                    <Share2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white">1. Adım:</strong> Safari tarayıcısının altındaki <span className="text-sky-300 font-semibold">Paylaş</span> simgesine dokunun.
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                    <PlusSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white">2. Adım:</strong> Menüyü aşağı kaydırıp <span className="text-emerald-300 font-semibold">"Ana Ekrana Ekle"</span> seçeneğine dokunun.
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white">3. Adım:</strong> Sağ üstteki <span className="text-amber-300 font-semibold">"Ekle"</span> butonuna basın. Uygulama telefonunuzun ana ekranında yerel uygulama gibi çalışacaktır!
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p>
                    Tarayıcınızın adres çubuğundaki veya menüsündeki <strong className="text-white">"Uygulamayı Yükle"</strong> simgesine tıklayarak uygulamayı bilgisayarınıza veya Android cihazınıza bağımsız bir uygulama olarak yükleyebilirsiniz.
                  </p>
                  <p className="text-slate-400">
                    Uygulama tam ekran modunda, adres çubuğu olmadan ve çevrimdışı önbellek desteğiyle daha hızlı çalışır.
                  </p>
                </>
              )}
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-semibold text-white transition active:scale-98"
            >
              Anladım, Kapat
            </button>
          </div>
        </div>
      )}
    </>
  );
};
