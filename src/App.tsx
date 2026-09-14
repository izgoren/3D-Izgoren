import React, { useState, useCallback } from 'react';
import {
  BaseMapType,
  VideoFormatType,
  CameraState,
  ParcelInfo,
  ParcelStyle,
  WatermarkConfig,
} from './types';
import { DEFAULT_PARCEL } from './data/demoParcels';
import { CesiumViewer, ViewerMethods } from './components/CesiumViewer';
import { ControlPanel } from './components/ControlPanel';
import { WatermarkOverlay } from './components/WatermarkOverlay';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
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
} from 'lucide-react';

export default function App() {
  // Base Map Layer (Default to Google Hybrid)
  const [baseMap, setBaseMap] = useState<BaseMapType>('google_hybrid');

  // Video Frame Format
  const [videoFormat, setVideoFormat] = useState<VideoFormatType>('reels');

  // 3D Camera State
  const [cameraState, setCameraState] = useState<CameraState>({
    pitch: -45,
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

  // Watermark Banner Config
  const [watermarkConfig, setWatermarkConfig] = useState<WatermarkConfig>({
    visible: true,
    companyName: 'İzgören Emlak Yatırım Danışmanlık',
    phone: '0532 395 02 63',
    web: 'www.izgorenemlak.com',
    adaParselText: '',
    priceTag: '',
    logoUrl: null,
    position: 'bottom-right',
    adaParselPosition: 'inside',
    opacity: 0.85,
    showLocationBadge: true,
    badgeStyle: 'glass',
  });

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

  const handleParcelLoaded = useCallback((parcel: ParcelInfo) => {
    setActiveParcel(parcel);
  }, []);

  const handleUpdateParcel = useCallback((partial: Partial<ParcelInfo>) => {
    setActiveParcel((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        ...partial,
      };
    });
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black flex flex-col font-sans select-none">
      
      {/* Top Floating Quick Bar */}
      <header className="absolute top-3 right-3 sm:top-4 sm:right-5 z-40 flex items-center gap-1.5 sm:gap-2">
        
        {/* Kadraj Hızlı Seçici */}
        <div className="flex items-center gap-0.5 sm:gap-1 p-1 rounded-xl bg-slate-950/80 backdrop-blur-xl border border-white/15 shadow-xl">
          <button
            onClick={() => setVideoFormat('reels')}
            className={`min-h-[34px] sm:min-h-[36px] px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
              videoFormat === 'reels'
                ? 'bg-sky-500 text-slate-950 font-bold shadow'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="9:16 Instagram Reels / TikTok"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">9:16</span>
          </button>

          <button
            onClick={() => setVideoFormat('post')}
            className={`min-h-[34px] sm:min-h-[36px] px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
              videoFormat === 'post'
                ? 'bg-sky-500 text-slate-950 font-bold shadow'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="1:1 Kare Gönderi"
          >
            <Square className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">1:1</span>
          </button>

          <button
            onClick={() => setVideoFormat('youtube')}
            className={`min-h-[34px] sm:min-h-[36px] px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
              videoFormat === 'youtube'
                ? 'bg-sky-500 text-slate-950 font-bold shadow'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="16:9 Tam Ekran YouTube"
          >
            <RectangleHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">16:9</span>
          </button>
        </div>

        {/* GPS Konum Butonu */}
        <button
          onClick={() => viewerMethods?.flyToDeviceLocation()}
          className="min-h-[34px] sm:min-h-[36px] p-2 sm:px-2.5 sm:py-2 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-white/15 hover:border-sky-400/50 text-sky-400 hover:text-sky-300 text-xs font-medium flex items-center gap-1.5 backdrop-blur-xl shadow-xl transition active:scale-95"
          title="Cihazımın GPS Konumuna Git"
        >
          <LocateFixed className="w-4 h-4 text-sky-400" />
          <span className="hidden lg:inline">Konumum</span>
        </button>

        {/* 3D Tur Hızlı Buton */}
        <button
          onClick={() => handleCameraChange({ isTouring: !cameraState.isTouring })}
          className={`min-h-[34px] sm:min-h-[36px] px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 backdrop-blur-xl border shadow-xl transition ${
            cameraState.isTouring
              ? 'bg-red-500 text-white border-red-400 animate-pulse'
              : 'bg-slate-950/80 hover:bg-slate-900 border-white/15 text-sky-400 hover:border-sky-400/50'
          }`}
          title="3D Sinematik Turu Başlat/Durdur"
        >
          <Rotate3d className={`w-4 h-4 ${cameraState.isTouring ? 'animate-spin' : ''}`} />
          <span className="hidden md:inline">
            {cameraState.isTouring ? 'Turu Durdur' : '3D Tur'}
          </span>
        </button>

        {/* HD Fotoğraf İndir Butonu */}
        <button
          onClick={() => viewerMethods?.takeSnapshot()}
          className="min-h-[34px] sm:min-h-[36px] p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-white/15 hover:border-sky-400/50 text-white text-xs font-medium flex items-center gap-1.5 backdrop-blur-xl shadow-xl transition"
          title="HD Fotoğraf Çek (PNG)"
        >
          <Camera className="w-4 h-4 text-sky-400" />
          <span className="hidden md:inline">HD Fotoğraf</span>
        </button>

        {/* Video Kaydı Hızlı Buton */}
        {viewerMethods?.isRecording ? (
          <button
            onClick={() => viewerMethods.stopVideoRecording()}
            className="min-h-[34px] sm:min-h-[36px] px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xl shadow-red-500/40 animate-pulse transition"
            title="Kaydı Durdur ve İndir"
          >
            <Square className="w-3.5 h-3.5 fill-white" />
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
            className="min-h-[34px] sm:min-h-[36px] px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:brightness-110 text-white text-xs font-bold flex items-center gap-1.5 shadow-xl shadow-red-500/20 transition"
            title="3D Video Kaydet"
          >
            <VideoIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Kayıt</span>
          </button>
        )}

        {/* Tam Ekran Toggle */}
        <button
          onClick={toggleFullscreen}
          className="min-h-[34px] sm:min-h-[36px] p-2 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-white/15 hover:border-white/30 text-slate-300 hover:text-white backdrop-blur-xl shadow-xl transition hidden sm:flex"
          title="Tam Ekran"
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>

        {/* PWA Kurulum Butonu */}
        <PWAInstallButton variant="header" />
      </header>

      {/* Main 3D Cesium Engine Viewport */}
      <main className="w-full h-full flex-1 relative">
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
        >
          {/* Watermark rendered INSIDE the Cesium container */}
          <WatermarkOverlay config={watermarkConfig} activeParcel={activeParcel} />
        </CesiumViewer>
      </main>

      {/* Floating Studio Control Panel */}
      <ControlPanel
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
      />

      {/* PWA Çevrimdışı Durum Rozeti */}
      <OfflineIndicator />
    </div>
  );
}
