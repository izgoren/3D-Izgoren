import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BaseMapType,
  VideoFormatType,
  CameraState,
  ParcelInfo,
  ParcelStyle,
  WatermarkConfig,
} from './types';
import { CesiumViewer, ViewerMethods } from './components/CesiumViewer';
import { ControlPanel } from './components/ControlPanel';
import { WatermarkOverlay } from './components/WatermarkOverlay';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { AppUpdateChecker } from './components/AppUpdateChecker';
import { IzgorenAdScreen } from './components/IzgorenAdScreen';
import { parseKMZFile, parseKMLString, parseGeoJSON } from './utils/geoUtils';
import { loadDefaultCompanyInfo } from './utils/watermarkStorage';
import {
  Smartphone,
  Square,
  RectangleHorizontal,
  Play,
  Camera,
  Maximize,
  Minimize,
  SlidersHorizontal,
  Video as VideoIcon,
  Rotate3d,
  LocateFixed,
  Compass,
  Scaling,
  Globe,
  Home,
  ArrowUpRight,
} from 'lucide-react';

export default function App() {
  // Base Map Layer (Default to Google Hybrid)
  const [baseMap, setBaseMap] = useState<BaseMapType>('google_hybrid');

  // Video Frame Format
  const [videoFormat, setVideoFormat] = useState<VideoFormatType>('reels');

  // 3D Parsel Studio Panel State (Open by default on desktop, closed on mobile)
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return false;
  });

  // 3D Camera State - Varsayılan ayar: Kuşbakışı görüntü (pitch: -90, heading: 0)
  const [cameraState, setCameraState] = useState<CameraState>({
    pitch: -90,
    heading: 0,
    range: 650,
    tourSpeed: 0.3,
    isTouring: false,
    elevation: 0,
  });

  // Active Loaded Parcel (Null by default so real current location is shown on startup)
  const [activeParcel, setActiveParcel] = useState<ParcelInfo | null>(null);

  // Parcel Styling
  const [parcelStyle, setParcelStyle] = useState<ParcelStyle>({
    borderColor: '#38bdf8',
    borderWidth: 5,
    fillColor: '#38bdf8',
    fillOpacity: 0.3,
    extrusionHeight: 0,
    dashedBorder: true,
    glowEffect: true,
    showStartEndMarkers: false,
    animateLine: true,
  });

  // Watermark Banner Config (Defaults restored from localStorage if previously saved)
  const [watermarkConfig, setWatermarkConfig] = useState<WatermarkConfig>(() => {
    const base: WatermarkConfig = {
      visible: true,
      companyName: 'İzgören Harita Mühendislik',
      phone: '0532 395 02 63',
      web: 'www.izgorenharita.com',
      adaParselText: '',
      priceTag: '',
      logoUrl: null,
      position: 'bottom-right',
      adaParselPosition: 'inside',
      opacity: 0.85,
      showLocationBadge: true,
      badgeStyle: 'glass',
    };
    const saved = loadDefaultCompanyInfo();
    if (saved) {
      return {
        ...base,
        ...saved,
      };
    }
    return base;
  });

  // Screen & Kadraj Height Scale (%50 - %100)
  const [screenHeightPercent, setScreenHeightPercent] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('PARSEL_STUDIO_SCREEN_HEIGHT');
        if (saved) {
          const parsed = parseInt(saved, 10);
          if (!isNaN(parsed) && parsed >= 40 && parsed <= 100) return parsed;
        }
      } catch (e) {}
    }
    return 100;
  });

  const [showScreenSizeMenu, setShowScreenSizeMenu] = useState(false);

  const handleScreenHeightChange = useCallback((percent: number) => {
    const clamped = Math.max(50, Math.min(100, percent));
    setScreenHeightPercent(clamped);
    try {
      localStorage.setItem('PARSEL_STUDIO_SCREEN_HEIGHT', clamped.toString());
    } catch (e) {}
  }, []);

  // 3D Arazi / Topoğrafya Kabartması Aktif / Pasif
  const [isTerrainActive, setIsTerrainActive] = useState<boolean>(true);

  // Cesium viewer exposed methods (video record, snapshot, etc.)
  const [viewerMethods, setViewerMethods] = useState<ViewerMethods | null>(null);

  // Fullscreen toggle state
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleCameraChange = useCallback((partial: Partial<CameraState>) => {
    setCameraState((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleParcelStyleChange = useCallback((partial: Partial<ParcelStyle>) => {
    setParcelStyle((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleWatermarkChange = useCallback((partial: Partial<WatermarkConfig>) => {
    setWatermarkConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  // Açılışta 10 saniye gösterilecek İzgören Harita tanıtım ekranı ve geri sayım durumu
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [splashSecondsLeft, setSplashSecondsLeft] = useState<number>(10);

  useEffect(() => {
    if (!showSplash) return;
    const timer = setInterval(() => {
      setSplashSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setShowSplash(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [showSplash]);

  const handleDismissSplash = useCallback(() => {
    setShowSplash(false);
  }, []);

  const handleShowSplash = useCallback(() => {
    setSplashSecondsLeft(10);
    setShowSplash(true);
  }, []);

  const handleParcelLoaded = useCallback((parcel: ParcelInfo) => {
    setActiveParcel(parcel);
    setShowSplash(false); // KML yüklenince anında uydu haritasına geç
    // Varsayılan ayar kuşbakışı görüntü (-90° dik açı)
    setCameraState((prev) => ({
      ...prev,
      pitch: -90,
      heading: 0,
    }));
  }, []);

  const handleUpdateParcel = useCallback((partial: Partial<ParcelInfo>) => {
    setActiveParcel((prev) => {
      if (!prev) {
        const ada = partial.adaNo || '';
        const parsel = partial.parselNo || '';
        const fallbackName = ada && parsel ? `Ada ${ada} Parsel ${parsel}` : (partial.name || 'Yeni Parsel');
        return {
          id: 'manual-parcel-' + Date.now(),
          name: fallbackName,
          city: partial.city ?? '',
          district: partial.district ?? '',
          neighborhood: partial.neighborhood ?? '',
          adaNo: ada,
          parselNo: parsel,
          areaM2: partial.areaM2 ?? 0,
          price: partial.price ?? '',
          description: partial.description ?? '',
          coordinates: [],
          ...partial,
        };
      }
      const updated = {
        ...prev,
        ...partial,
      };
      // Ada veya Parsel güncellenmiş ve özel ad verilmemişse başlığı senkronize et
      if (!partial.name && (partial.adaNo !== undefined || partial.parselNo !== undefined)) {
        const ada = updated.adaNo;
        const parsel = updated.parselNo;
        if (ada || parsel) {
          updated.name = `Ada ${ada || '-'} Parsel ${parsel || '-'}`;
        }
      }
      return updated;
    });
  }, []);

  // Dosya Yükleme Yönetimi
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ text: string; isError: boolean } | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadLoading(true);
    setUploadMsg(null);

    const name = file.name.toLowerCase();

    try {
      if (name.endsWith('.kmz')) {
        const parcel = await parseKMZFile(file);
        handleParcelLoaded(parcel);
        setUploadMsg({ text: `KMZ başarıyla yüklendi: ${parcel.name}`, isError: false });
      } else if (name.endsWith('.kml')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const text = event.target?.result as string;
            const parcel = parseKMLString(text, file.name.replace(/\.[^/.]+$/, ''));
            if (parcel) {
              handleParcelLoaded(parcel);
              setUploadMsg({ text: `KML başarıyla yüklendi: ${parcel.name}`, isError: false });
            }
          } catch (err: any) {
            setUploadMsg({ text: err.message || 'KML okuma hatası', isError: true });
          } finally {
            setUploadLoading(false);
          }
        };
        reader.readAsText(file);
        return;
      } else {
        // GeoJSON or JSON
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const text = event.target?.result as string;
            const parcel = parseGeoJSON(text, file.name.replace(/\.[^/.]+$/, ''));
            handleParcelLoaded(parcel);
            setUploadMsg({ text: `GeoJSON yüklendi: ${parcel.name}`, isError: false });
          } catch (err: any) {
            setUploadMsg({ text: err.message || 'GeoJSON okunamadı', isError: true });
          } finally {
            setUploadLoading(false);
          }
        };
        reader.readAsText(file);
        return;
      }
    } catch (err: any) {
      setUploadMsg({ text: err.message || 'Dosya okuma başarısız', isError: true });
    } finally {
      setUploadLoading(false);
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleClearParcel = useCallback(() => {
    setActiveParcel(null);
    setUploadMsg(null);
  }, []);

  // Parsel yüklü mü kontrolü (Sadece KML/KMZ yüklendiğinde veya parsel seçildiğinde harita altlıkları açılır)
  const isParcelLoaded = Boolean(activeParcel && activeParcel.coordinates && activeParcel.coordinates.length >= 3);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black flex flex-col font-sans select-none">
      
      {/* Unified Top Navigation Header (Ekrana Tam Sığdırma & Üst Üste Binmeyi Kesin Engelleyen Düzen) */}
      <header className="fixed top-0 inset-x-0 z-40 px-2 sm:px-4 py-2 flex items-center justify-between gap-1.5 sm:gap-3 pointer-events-none">
        
        {/* Sol Grup: 3D Parsel Studio Menü & Sürüm Güncelleyici */}
        <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto shrink-0">
          <button
            id="btn-toggle-studio-panel"
            onClick={() => setIsPanelOpen((prev) => !prev)}
            className={`min-h-[34px] sm:min-h-[36px] px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 sm:gap-2 backdrop-blur-xl border shadow-xl transition active:scale-95 cursor-pointer shrink-0 ${
              isPanelOpen
                ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-slate-950 border-sky-300 shadow-sky-500/25'
                : 'bg-slate-950/90 hover:bg-slate-900 border-sky-400/40 hover:border-sky-400 text-white shadow-black/80'
            }`}
            title="3D Parsel Studio Panelini Aç / Kapat"
          >
            <div
              className={`w-5 h-5 rounded-lg flex items-center justify-center transition shrink-0 ${
                isPanelOpen ? 'bg-slate-950/20 text-slate-950' : 'bg-sky-500/20 text-sky-400'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
            </div>
            <span className="tracking-wide hidden sm:inline">3D Parsel Studio</span>
            <span className="tracking-wide sm:hidden">Stüdyo</span>
            <span
              className={`hidden md:inline-block text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                isPanelOpen ? 'bg-slate-950/20 text-slate-950 font-bold' : 'bg-white/10 text-sky-300'
              }`}
            >
              {isPanelOpen ? 'Açık' : 'Menü'}
            </span>
          </button>

          <AppUpdateChecker />
        </div>

        {/* Sağ Grup: Hızlı Kadraj & Araçlar (Üst Üste Binmeyen & Ekran Boyutuna Uyum Sağlayan Esnek Bar) */}
        <div className="flex items-center gap-1 sm:gap-1.5 pointer-events-auto shrink-0 max-w-[calc(100vw-135px)] sm:max-w-none overflow-x-auto scrollbar-none py-0.5">
          {!showSplash ? (
            <>
              {/* Kadraj Hızlı Seçici */}
              <div className="flex items-center gap-0.5 p-0.5 sm:p-1 rounded-xl bg-slate-950/85 backdrop-blur-xl border border-white/15 shadow-xl shrink-0">
                <button
                  onClick={() => setVideoFormat('reels')}
                  className={`min-h-[32px] sm:min-h-[34px] px-1.5 sm:px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer shrink-0 ${
                    videoFormat === 'reels'
                      ? 'bg-sky-500 text-slate-950 font-bold shadow'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                  title="9:16 Instagram Reels / TikTok"
                >
                  <Smartphone className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">9:16</span>
                </button>

                <button
                  onClick={() => setVideoFormat('post')}
                  className={`min-h-[32px] sm:min-h-[34px] px-1.5 sm:px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer shrink-0 ${
                    videoFormat === 'post'
                      ? 'bg-sky-500 text-slate-950 font-bold shadow'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                  title="1:1 Kare Gönderi"
                >
                  <Square className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">1:1</span>
                </button>

                <button
                  onClick={() => setVideoFormat('youtube')}
                  className={`min-h-[32px] sm:min-h-[34px] px-1.5 sm:px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer shrink-0 ${
                    videoFormat === 'youtube'
                      ? 'bg-sky-500 text-slate-950 font-bold shadow'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                  title="16:9 Tam Ekran YouTube"
                >
                  <RectangleHorizontal className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">16:9</span>
                </button>
              </div>

              {/* Ekran Boyu Hızlı Seçici Popover */}
              <div className="relative shrink-0">
                <button
                  onClick={() => setShowScreenSizeMenu((prev) => !prev)}
                  className={`min-h-[32px] sm:min-h-[34px] px-2 sm:px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 sm:gap-1.5 backdrop-blur-xl border transition active:scale-95 cursor-pointer shadow-xl shrink-0 ${
                    screenHeightPercent < 100
                      ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold shadow-md shadow-sky-500/20'
                      : 'bg-slate-950/85 hover:bg-slate-900 border-white/15 text-slate-300 hover:text-white'
                  }`}
                  title="Ekran & Kadraj Boyunu Ayarla"
                >
                  <Scaling className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="font-mono text-[11px]">%{screenHeightPercent}</span>
                </button>

                {showScreenSizeMenu && (
                  <div className="absolute top-full mt-2 right-0 w-56 p-3 rounded-2xl bg-slate-950/95 backdrop-blur-2xl border border-sky-400/40 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1">
                        <Scaling className="w-3.5 h-3.5" />
                        Ekran Boyu
                      </span>
                      <span className="text-xs font-mono font-bold text-white px-2 py-0.5 rounded bg-sky-500/20 border border-sky-400/30">
                        %{screenHeightPercent}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="100"
                      step="5"
                      value={screenHeightPercent}
                      onChange={(e) => handleScreenHeightChange(parseInt(e.target.value, 10))}
                      className="w-full accent-sky-400 cursor-pointer h-1.5 bg-white/10 rounded-lg mb-2.5"
                    />
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { val: 100, label: '%100' },
                        { val: 90, label: '%90' },
                        { val: 80, label: '%80' },
                        { val: 65, label: '%65' },
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => {
                            handleScreenHeightChange(item.val);
                            setShowScreenSizeMenu(false);
                          }}
                          className={`py-1 px-1 rounded-lg text-[10px] font-bold transition text-center cursor-pointer ${
                            screenHeightPercent === item.val
                              ? 'bg-sky-500 text-slate-950 font-bold'
                              : 'bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 3D Tur Hızlı Buton */}
              <button
                onClick={() => handleCameraChange({ isTouring: !cameraState.isTouring })}
                className={`min-h-[32px] sm:min-h-[34px] px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 backdrop-blur-xl border shadow-xl transition cursor-pointer shrink-0 ${
                  cameraState.isTouring
                    ? 'bg-red-500 text-white border-red-400 animate-pulse'
                    : 'bg-slate-950/85 hover:bg-slate-900 border-white/15 text-sky-400 hover:border-sky-400/50'
                }`}
                title="3D Sinematik Turu Başlat/Durdur"
              >
                <Rotate3d className={`w-3.5 h-3.5 shrink-0 ${cameraState.isTouring ? 'animate-spin' : ''}`} />
                <span className="hidden md:inline">
                  {cameraState.isTouring ? 'Durdur' : '3D Tur'}
                </span>
              </button>

              {/* HD Fotoğraf İndir Butonu */}
              <button
                onClick={() => viewerMethods?.takeSnapshot()}
                className="min-h-[32px] sm:min-h-[34px] px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-slate-950/85 hover:bg-slate-900 border border-white/15 hover:border-sky-400/50 text-white text-xs font-medium flex items-center gap-1.5 backdrop-blur-xl shadow-xl transition cursor-pointer shrink-0"
                title="HD Fotoğraf Çek (PNG)"
              >
                <Camera className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="hidden md:inline">HD Fotoğraf</span>
              </button>

              {/* Video Kaydı Hızlı Buton */}
              {viewerMethods?.isRecording ? (
                <button
                  onClick={() => viewerMethods.stopVideoRecording()}
                  className="min-h-[32px] sm:min-h-[34px] px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xl shadow-red-500/40 animate-pulse transition cursor-pointer shrink-0"
                  title="Kaydı Durdur ve İndir"
                >
                  <Square className="w-3.5 h-3.5 fill-white shrink-0" />
                  <span>Durdur</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (!cameraState.isTouring) {
                      handleCameraChange({ isTouring: true });
                    }
                    viewerMethods?.startVideoRecording();
                  }}
                  className="min-h-[32px] sm:min-h-[34px] px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:brightness-110 text-white text-xs font-bold flex items-center gap-1.5 shadow-xl shadow-red-500/20 transition cursor-pointer shrink-0"
                  title="3D Video Kaydet"
                >
                  <VideoIcon className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">Kayıt</span>
                </button>
              )}

              {/* İzgören Harita Tanıtım Ekranını Aç Butonu */}
              <button
                onClick={handleShowSplash}
                className="min-h-[32px] sm:min-h-[34px] px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-slate-950/85 hover:bg-slate-900 border border-sky-400/30 hover:border-sky-400 text-sky-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 backdrop-blur-xl shadow-xl transition active:scale-95 cursor-pointer shrink-0"
                title="İzgören Harita Bilgi & Tanıtım Ekranını Göster"
              >
                <Home className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="hidden sm:inline">İzgören Tanıtım</span>
              </button>

              {/* Parseli Temizle Butonu (Parsel yüklüyse) */}
              {activeParcel && (
                <button
                  onClick={handleClearParcel}
                  className="min-h-[32px] sm:min-h-[34px] px-2 py-1 rounded-xl bg-slate-950/85 hover:bg-red-950/40 border border-white/15 hover:border-red-400/40 text-slate-300 hover:text-red-300 text-xs font-medium flex items-center gap-1 backdrop-blur-xl transition active:scale-95 cursor-pointer shrink-0"
                  title="Parseli Temizle"
                >
                  <span>Sıfırla</span>
                </button>
              )}
            </>
          ) : (
            /* Tanıtım Ekranı Üst Çubuğu: Haritaya Geç & Web Sitesi */
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleDismissSplash}
                className="min-h-[34px] sm:min-h-[36px] px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-300 hover:to-blue-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-sky-500/25 transition active:scale-95 cursor-pointer shrink-0"
                title="10 saniye beklemeden doğrudan uydu haritasına geç"
              >
                <Globe className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                <span>Haritaya Geç ({splashSecondsLeft}s)</span>
                <ArrowUpRight className="w-3 h-3 opacity-80 shrink-0" />
              </button>

              <a
                href="https://www.izgorenharita.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[34px] sm:min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-white/20 text-white font-semibold text-xs hidden sm:flex items-center gap-1.5 transition cursor-pointer shrink-0"
                title="İzgören Harita Web Sitesine Git"
              >
                <span>izgorenharita.com</span>
              </a>
            </div>
          )}

          {/* Tam Ekran Toggle */}
          <button
            onClick={toggleFullscreen}
            className="min-h-[32px] sm:min-h-[34px] p-2 rounded-xl bg-slate-950/85 hover:bg-slate-900 border border-white/15 hover:border-white/30 text-slate-300 hover:text-white backdrop-blur-xl shadow-xl transition hidden sm:flex items-center justify-center cursor-pointer shrink-0"
            title="Tam Ekran"
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
          </button>

          {/* PWA Kurulum Butonu */}
          <PWAInstallButton variant="header" />
        </div>
      </header>

      {/* Main Viewport: 3D Cesium Altlık Harita (Arka planda daima hazır ve sıcak) & Reklam / Dosya Yükleme Ekranı */}
      <main className="w-full h-full flex-1 relative overflow-hidden">
        <CesiumViewer
          baseMap={baseMap}
          videoFormat={videoFormat}
          cameraState={cameraState}
          onCameraChange={handleCameraChange}
          activeParcel={activeParcel}
          parcelStyle={parcelStyle}
          watermarkConfig={watermarkConfig}
          isTerrainActive={isTerrainActive}
          onToggleTerrain={() => setIsTerrainActive((prev) => !prev)}
          onViewerReady={setViewerMethods}
          screenHeightPercent={screenHeightPercent}
          showMapControls={!showSplash}
        >
          {/* Watermark rendered INSIDE the Cesium container when watermark is enabled and only on base map screen */}
          {!showSplash && watermarkConfig.visible && (activeParcel || isParcelLoaded) && (
            <WatermarkOverlay config={watermarkConfig} activeParcel={activeParcel} />
          )}
        </CesiumViewer>

        {/* Tanıtım ve Dosya Yükleme Ekranı (Sadece açılışta 10 saniye veya kullanıcı isteğiyle gösterilir) */}
        {showSplash && (
          <div className="absolute inset-0 z-20 overflow-y-auto bg-slate-950 transition-opacity duration-300">
            <IzgorenAdScreen
              onUploadFile={handleFileUpload}
              fileInputRef={fileInputRef}
              uploadLoading={uploadLoading}
              uploadMsg={uploadMsg}
              onDismiss={handleDismissSplash}
              secondsRemaining={splashSecondsLeft}
            />
          </div>
        )}
      </main>

      {/* Floating Studio Control Panel - Sadece altlık harita ekranında gösterilir */}
      {!showSplash && (
        <ControlPanel
          isOpen={isPanelOpen}
          onToggleOpen={() => setIsPanelOpen((prev) => !prev)}
          baseMap={baseMap}
          onBaseMapChange={setBaseMap}
          videoFormat={videoFormat}
          onVideoFormatChange={setVideoFormat}
          cameraState={cameraState}
          onCameraChange={handleCameraChange}
          activeParcel={activeParcel}
          onParcelLoaded={handleParcelLoaded}
          onUpdateParcel={handleUpdateParcel}
          parcelStyle={parcelStyle}
          onParcelStyleChange={handleParcelStyleChange}
          watermarkConfig={watermarkConfig}
          onWatermarkChange={handleWatermarkChange}
          isTerrainActive={isTerrainActive}
          onToggleTerrain={() => setIsTerrainActive((prev) => !prev)}
          viewerMethods={viewerMethods}
          screenHeightPercent={screenHeightPercent}
          onScreenHeightPercentChange={handleScreenHeightChange}
          onClearParcel={handleClearParcel}
        />
      )}

      {/* PWA Çevrimdışı Durum Rozeti */}
      <OfflineIndicator />
    </div>
  );
}
