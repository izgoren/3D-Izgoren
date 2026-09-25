import React, { useState, useRef } from 'react';
import {
  Layers,
  Video,
  Camera,
  RotateCw,
  Play,
  Square,
  Upload,
  Sparkles,
  Building,
  Image as ImageIcon,
  Palette,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  Sliders,
  Camera as CameraIcon,
  Video as VideoIcon,
  Compass,
  Maximize2,
  Minimize2,
  Trash2,
  CheckCircle2,
  MapPin,
  Box,
  Globe,
  Rotate3d,
  Mountain,
  Navigation,
  LocateFixed,
  X,
  Menu,
  Map,
  Save,
  BookmarkCheck,
  RotateCcw,
  Scaling,
  Crosshair,
  Cpu,
  Zap,
  PenTool,
} from 'lucide-react';
import {
  BaseMapType,
  VideoFormatType,
  CameraState,
  ParcelInfo,
  ParcelStyle,
  WatermarkConfig,
} from '../types';
import { parseKMLString, parseKMZFile, parseGeoJSON, formatArea } from '../utils/geoUtils';
import { getDeviceOptimizationProfile } from '../utils/deviceOptimizer';
import { ViewerMethods } from './CesiumViewer';
import { PWAInstallButton } from './PWAInstallButton';
import { ParcelTab } from './ParcelTab';
import { PriceInput } from './PriceInput';
import {
  saveDefaultCompanyInfo,
  loadDefaultCompanyInfo,
  hasSavedDefaultCompanyInfo,
  clearDefaultCompanyInfo,
} from '../utils/watermarkStorage';
import {
  saveDefaultTourSettings,
  loadDefaultTourSettings,
  saveDefaultStyleSettings,
  loadDefaultStyleSettings,
} from '../utils/settingsStorage';

interface ControlPanelProps {
  baseMap: BaseMapType;
  onBaseMapChange: (map: BaseMapType) => void;
  videoFormat: VideoFormatType;
  onVideoFormatChange: (format: VideoFormatType) => void;
  cameraState: CameraState;
  onCameraChange: (partial: Partial<CameraState>) => void;
  activeParcel: ParcelInfo | null;
  onParcelLoaded: (parcel: ParcelInfo) => void;
  onUpdateParcel: (partial: Partial<ParcelInfo>) => void;
  parcelStyle: ParcelStyle;
  onParcelStyleChange: (partial: Partial<ParcelStyle>) => void;
  watermarkConfig: WatermarkConfig;
  onWatermarkChange: (partial: Partial<WatermarkConfig>) => void;
  isTerrainActive: boolean;
  onToggleTerrain: () => void;
  viewerMethods: ViewerMethods | null;
  isOpen?: boolean;
  onToggleOpen?: () => void;
  screenHeightPercent: number;
  onScreenHeightPercentChange: (percent: number) => void;
  onClearParcel?: () => void;
}

type TabType = 'parcel' | 'camera' | 'style' | 'watermark' | 'export';

export const ControlPanel: React.FC<ControlPanelProps> = ({
  baseMap,
  onBaseMapChange,
  videoFormat,
  onVideoFormatChange,
  cameraState,
  onCameraChange,
  activeParcel,
  onParcelLoaded,
  onUpdateParcel,
  parcelStyle,
  onParcelStyleChange,
  watermarkConfig,
  onWatermarkChange,
  isTerrainActive,
  onToggleTerrain,
  viewerMethods,
  isOpen,
  onToggleOpen,
  screenHeightPercent,
  onScreenHeightPercentChange,
  onClearParcel,
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  const isCollapsed = isOpen !== undefined ? !isOpen : internalCollapsed;
  const setIsCollapsed = (collapsed: boolean) => {
    if (onToggleOpen && isOpen !== undefined) {
      if (collapsed === isOpen) {
        onToggleOpen();
      }
    } else {
      setInternalCollapsed(collapsed);
    }
  };

  const [activeTab, setActiveTab] = useState<TabType>('parcel');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ text: string; isError: boolean } | null>(null);

  const [hasSavedDefaults, setHasSavedDefaults] = useState<boolean>(() => hasSavedDefaultCompanyInfo());
  const [defaultSaveFeedback, setDefaultSaveFeedback] = useState<{ message: string; isError?: boolean } | null>(null);

  // 3D Tur varsayılan ayar durumu
  const [hasSavedTourDefaults, setHasSavedTourDefaults] = useState<boolean>(() => !!loadDefaultTourSettings());
  const [tourSaveFeedback, setTourSaveFeedback] = useState<{ message: string; isError?: boolean } | null>(null);

  // Parsel Stil varsayılan ayar durumu
  const [hasSavedStyleDefaults, setHasSavedStyleDefaults] = useState<boolean>(() => !!loadDefaultStyleSettings());
  const [styleSaveFeedback, setStyleSaveFeedback] = useState<{ message: string; isError?: boolean } | null>(null);

  const handleSaveTourDefaults = () => {
    const ok = saveDefaultTourSettings({
      tourSpeed: cameraState.tourSpeed,
      pitch: cameraState.pitch,
      range: cameraState.range,
      baseMap,
      videoFormat,
    });
    if (ok) {
      setHasSavedTourDefaults(true);
      setTourSaveFeedback({ message: '3D Tur ve kamera ayarları varsayılan olarak kaydedildi!' });
    } else {
      setTourSaveFeedback({ message: 'Kaydetme başarısız oldu.', isError: true });
    }
    setTimeout(() => setTourSaveFeedback(null), 3500);
  };

  const handleResetTourDefaults = () => {
    try {
      localStorage.removeItem('PARSEL_STUDIO_DEFAULT_3D_TOUR');
      setHasSavedTourDefaults(false);
      const prof = getDeviceOptimizationProfile();
      onCameraChange({ tourSpeed: prof.tourSpeed, pitch: -89.0, range: 650 });
      setTourSaveFeedback({ message: 'Tur ayarları fabrika değerlerine sıfırlandı.' });
    } catch (e) {
      setTourSaveFeedback({ message: 'Sıfırlama başarısız oldu.', isError: true });
    }
    setTimeout(() => setTourSaveFeedback(null), 3500);
  };

  const handleSaveStyleDefaults = () => {
    const ok = saveDefaultStyleSettings(parcelStyle);
    if (ok) {
      setHasSavedStyleDefaults(true);
      setStyleSaveFeedback({ message: 'Parsel stil ayarları varsayılan olarak kaydedildi!' });
    } else {
      setStyleSaveFeedback({ message: 'Kaydetme başarısız oldu.', isError: true });
    }
    setTimeout(() => setStyleSaveFeedback(null), 3500);
  };

  const handleResetStyleDefaults = () => {
    try {
      localStorage.removeItem('PARSEL_STUDIO_DEFAULT_STYLE');
      setHasSavedStyleDefaults(false);
      onParcelStyleChange({
        borderColor: '#38bdf8',
        borderWidth: 4,
        fillColor: '#38bdf8',
        fillOpacity: 0.25,
        extrusionHeight: 0,
        dashedBorder: false,
        glowEffect: true,
        showStartEndMarkers: false,
        penTool: false,
        penToolSpeed: 1,
        showEdgeDimensions: true,
      });
      setStyleSaveFeedback({ message: 'Stil ayarları fabrika varsayılanına sıfırlandı.' });
    } catch (e) {
      setStyleSaveFeedback({ message: 'Sıfırlama başarısız oldu.', isError: true });
    }
    setTimeout(() => setStyleSaveFeedback(null), 3500);
  };

  // Device type detection for optimal sizing
  const getDeviceInfo = () => {
    if (typeof window === 'undefined') return { type: 'pc', name: 'PC', label: '💻 PC (1080p)' };
    const w = window.innerWidth;
    if (w < 640) return { type: 'phone', name: 'Telefon', label: '📱 Telefon' };
    if (w < 1024) return { type: 'tablet', name: 'Tablet', label: '📟 Tablet' };
    return { type: 'pc', name: 'Bilgisayar', label: '💻 Masaüstü (PC)' };
  };

  const detectedDeviceInfo = getDeviceInfo();
  const deviceOptimizationProfile = getDeviceOptimizationProfile();

  const handleApplySpecificDevice = (type: 'phone' | 'tablet' | 'pc') => {
    if (type === 'phone') {
      onVideoFormatChange('reels');
      onScreenHeightPercentChange(100);
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setIsCollapsed(true);
      }
    } else if (type === 'tablet') {
      onVideoFormatChange('youtube');
      onScreenHeightPercentChange(100);
    } else {
      onVideoFormatChange('youtube');
      onScreenHeightPercentChange(100);
    }
  };

  const handleApplyOptimalDeviceSize = () => {
    handleApplySpecificDevice(detectedDeviceInfo.type as any);
  };

  const handleSaveDefaultWatermark = () => {
    const success = saveDefaultCompanyInfo(watermarkConfig);
    if (success) {
      setHasSavedDefaults(true);
      setDefaultSaveFeedback({
        message: 'Firma bilgileri başarıyla varsayılan olarak kaydedildi! Her açılışta otomatik yüklenecektir.',
      });
      setTimeout(() => setDefaultSaveFeedback(null), 5000);
    } else {
      setDefaultSaveFeedback({
        message: 'Kayıt sırasında bir hata oluştu.',
        isError: true,
      });
      setTimeout(() => setDefaultSaveFeedback(null), 5000);
    }
  };

  const handleRestoreDefaultWatermark = () => {
    const saved = loadDefaultCompanyInfo();
    if (saved) {
      onWatermarkChange({
        companyName: saved.companyName ?? watermarkConfig.companyName,
        phone: saved.phone ?? watermarkConfig.phone,
        web: saved.web ?? watermarkConfig.web,
        priceTag: saved.priceTag ?? watermarkConfig.priceTag,
        logoUrl: saved.logoUrl ?? watermarkConfig.logoUrl,
        position: saved.position ?? watermarkConfig.position,
        adaParselPosition: saved.adaParselPosition ?? watermarkConfig.adaParselPosition,
        opacity: saved.opacity ?? watermarkConfig.opacity,
        scale: saved.scale ?? watermarkConfig.scale ?? 1.0,
        showLocationBadge: saved.showLocationBadge ?? watermarkConfig.showLocationBadge,
      });
      setDefaultSaveFeedback({
        message: 'Kayıtlı varsayılan firma bilgileri geri yüklendi.',
      });
      setTimeout(() => setDefaultSaveFeedback(null), 4000);
    }
  };

  const handleClearDefaultWatermark = () => {
    clearDefaultCompanyInfo();
    setHasSavedDefaults(false);
    setDefaultSaveFeedback({
      message: 'Varsayılan firma kayıtları temizlendi.',
    });
    setTimeout(() => setDefaultSaveFeedback(null), 4000);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Handle file uploads (KML, KMZ, GeoJSON)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadLoading(true);
    setUploadMsg(null);

    const name = file.name.toLowerCase();

    try {
      if (name.endsWith('.kmz')) {
        const parcel = await parseKMZFile(file);
        onParcelLoaded(parcel);
        setUploadMsg({ text: `KMZ başarıyla yüklendi: ${parcel.name}`, isError: false });
      } else if (name.endsWith('.kml')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const text = event.target?.result as string;
            const parcel = parseKMLString(text, file.name.replace(/\.[^/.]+$/, ''));
            if (parcel) {
              onParcelLoaded(parcel);
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
            onParcelLoaded(parcel);
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

  // Handle Logo Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      onWatermarkChange({ logoUrl: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  // Quick preset colors
  const colorPresets = [
    { name: 'Sky Blue', hex: '#38bdf8' },
    { name: 'Altın Sarı', hex: '#facc15' },
    { name: 'Zümrüt Yeşil', hex: '#10b981' },
    { name: 'Mercan Kırmızı', hex: '#f43f5e' },
    { name: 'Mor Alev', hex: '#a855f7' },
    { name: 'Beyaz Saf', hex: '#ffffff' },
  ];

  const areaDetails = activeParcel ? formatArea(activeParcel.areaM2) : null;

  const handleToggleTour = () => {
    if (viewerMethods?.toggle3DTour) {
      viewerMethods.toggle3DTour();
    } else {
      const is3D = cameraState.isTouring && (cameraState.tourMode === '3d' || !cameraState.tourMode);
      if (is3D) {
        onCameraChange({ isTouring: false });
      } else {
        const nextPitch = cameraState.pitch < -65 ? -38 : cameraState.pitch;
        onCameraChange({ isTouring: true, tourMode: '3d', pitch: nextPitch, viewMode: '3d' });
      }
    }
  };

  const handleToggle2DTour = () => {
    if (viewerMethods?.toggle2DTour) {
      viewerMethods.toggle2DTour();
    } else {
      const is2D = cameraState.isTouring && cameraState.tourMode === '2d';
      if (is2D) {
        onCameraChange({ isTouring: false });
      } else {
        onCameraChange({ isTouring: true, tourMode: '2d', pitch: -89.9, viewMode: '2d' });
      }
    }
  };

  return (
    <>
      {/* Mobile Floating Action Dock (Visible only on mobile when panel is collapsed) */}
      {isCollapsed && (
        <div className="sm:hidden fixed bottom-3 inset-x-2 z-40 flex items-center justify-between gap-1 p-1.5 rounded-2xl bg-slate-950/95 backdrop-blur-xl border border-white/20 shadow-2xl shadow-black">
          <button
            onClick={() => setIsCollapsed(false)}
            className="h-10 px-2.5 rounded-xl bg-sky-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-sky-500/20 active:scale-95 transition shrink-0 cursor-pointer"
          >
            <Sliders className="w-4 h-4" />
            <span>Stüdyo</span>
          </button>

          <div className="flex items-center gap-1 shrink-0">
            {/* 2D / 3D Hızlı Buton */}
            <button
              onClick={() => {
                if (cameraState.pitch <= -75 && !cameraState.isTouring) {
                  viewerMethods?.set3DView();
                } else {
                  viewerMethods?.set2DView();
                }
              }}
              className="h-10 px-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white flex items-center justify-center font-black text-xs active:scale-95 transition cursor-pointer"
              title="2D / 3D Görünüm Değiştir (Sınırları Ortala)"
            >
              <span className={cameraState.pitch <= -75 && !cameraState.isTouring ? 'text-sky-400' : 'text-amber-400'}>
                {cameraState.pitch <= -75 && !cameraState.isTouring ? '2D' : '3D'}
              </span>
            </button>

            {/* GPS Konum Butonu */}
            <button
              onClick={() => viewerMethods?.flyToDeviceLocation()}
              className="h-10 px-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 text-sky-300 flex items-center gap-1 active:scale-95 transition cursor-pointer"
              title="Konumuma Git (GPS)"
            >
              <LocateFixed className="w-4 h-4 text-sky-400" />
              <span className="text-[11px] font-bold text-sky-200">Konum</span>
            </button>

            {/* 2D Tur Butonu */}
            <button
              onClick={handleToggle2DTour}
              className={`w-10 h-10 rounded-xl border flex items-center justify-center transition active:scale-95 cursor-pointer ${
                cameraState.isTouring && cameraState.tourMode === '2d'
                  ? 'bg-sky-500 text-slate-950 border-sky-400 font-black shadow-lg shadow-sky-500/30 animate-pulse'
                  : 'bg-white/10 text-sky-400 border-white/15'
              }`}
              title="2D Kuşbakışı Tur"
            >
              <RotateCw className={`w-4 h-4 ${cameraState.isTouring && cameraState.tourMode === '2d' ? 'animate-spin' : ''}`} />
            </button>

            {/* 3D Tur Butonu */}
            <button
              onClick={handleToggleTour}
              className={`w-10 h-10 rounded-xl border flex items-center justify-center transition active:scale-95 cursor-pointer ${
                cameraState.isTouring && (cameraState.tourMode === '3d' || !cameraState.tourMode)
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-lg shadow-amber-500/30 animate-pulse'
                  : 'bg-white/10 text-amber-400 border-white/15'
              }`}
              title="3D Perspektif Tur"
            >
              <Rotate3d className={`w-4 h-4 ${cameraState.isTouring && (cameraState.tourMode === '3d' || !cameraState.tourMode) ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => viewerMethods?.takeSnapshot()}
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white flex items-center justify-center active:scale-95 transition cursor-pointer"
              title="HD Fotoğraf"
            >
              <CameraIcon className="w-4 h-4 text-sky-400" />
            </button>

            {viewerMethods?.isRecording ? (
              <button
                onClick={() => viewerMethods.stopVideoRecording()}
                className="h-10 px-2.5 rounded-xl bg-red-600 text-white font-bold text-xs flex items-center gap-1 shadow-lg shadow-red-600/40 animate-pulse active:scale-95 cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-white" />
                <span>Durdur</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  if (!cameraState.isTouring) onCameraChange({ isTouring: true });
                  viewerMethods?.startVideoRecording();
                }}
                className="h-10 px-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold text-xs flex items-center gap-1 shadow-lg shadow-red-500/30 active:scale-95 cursor-pointer"
              >
                <VideoIcon className="w-4 h-4" />
                <span>Kayıt</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Backdrop for Mobile & Tablet when Drawer is open */}
      {!isCollapsed && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 transition-opacity"
          onClick={() => setIsCollapsed(true)}
        />
      )}

      {/* Main Studio Control Panel: Left Sliding Drawer for Phone, Tablet & Desktop */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-[90vw] sm:w-[385px] max-w-[420px] h-full flex flex-col bg-slate-950/95 backdrop-blur-2xl border-r border-white/15 shadow-2xl shadow-black transition-transform duration-300 ease-out select-none ${
          isCollapsed ? '-translate-x-full pointer-events-none' : 'translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          
          {/* Header Bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-slate-900/80 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 shrink-0">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-xs font-bold tracking-wider uppercase text-white">
                  3D Parsel Studio
                </h1>
                <p className="text-[10px] text-slate-400 font-mono">Video & Drone Kadrajı</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {viewerMethods?.isRecording && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-[10px] text-red-400 animate-pulse font-mono font-semibold mr-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  REC
                </span>
              )}
              
              {/* Haritayı Gör / Kapat Button */}
              <button
                onClick={() => setIsCollapsed(true)}
                className="h-8 px-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-medium flex items-center gap-1 transition active:scale-95 cursor-pointer"
                title="Paneli Kapat ve Haritayı Gör"
              >
                <span>Haritayı Gör</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs with comfortable touch targets - PARSEL BAŞTA */}
          <div className="flex items-center border-b border-white/10 bg-slate-950/80 p-1.5 gap-1 overflow-x-auto scrollbar-none shrink-0">
            <button
              onClick={() => setActiveTab('parcel')}
              className={`flex-1 min-w-[50px] min-h-[42px] py-1.5 px-2 rounded-xl text-[11px] font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'parcel'
                  ? 'bg-sky-500 text-slate-950 font-bold shadow'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Parsel</span>
            </button>

            <button
              onClick={() => setActiveTab('camera')}
              className={`flex-1 min-w-[50px] min-h-[42px] py-1.5 px-2 rounded-xl text-[11px] font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'camera'
                  ? 'bg-sky-500 text-slate-950 font-bold shadow'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>3D Tur</span>
            </button>

            <button
              onClick={() => setActiveTab('style')}
              className={`flex-1 min-w-[50px] min-h-[42px] py-1.5 px-2 rounded-xl text-[11px] font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'style'
                  ? 'bg-sky-500 text-slate-950 font-bold shadow'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Stil</span>
            </button>

            <button
              onClick={() => setActiveTab('watermark')}
              className={`flex-1 min-w-[50px] min-h-[42px] py-1.5 px-2 rounded-xl text-[11px] font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'watermark'
                  ? 'bg-sky-500 text-slate-950 font-bold shadow'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>Firma</span>
            </button>

            <button
              onClick={() => setActiveTab('export')}
              className={`flex-1 min-w-[50px] min-h-[42px] py-1.5 px-2 rounded-xl text-[11px] font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'export'
                  ? 'bg-sky-500 text-slate-950 font-bold shadow'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <VideoIcon className="w-3.5 h-3.5" />
              <span>Kayıt</span>
            </button>
          </div>

          {/* Tab Contents - Scrollable with comfortable touch padding */}
          <div className="flex-1 p-4 overflow-y-auto overscroll-contain space-y-4 text-xs">
            
            {/* TAB 1: PARSEL YÜKLE & YÖNET (BAŞA ALINDI) */}
            {activeTab === 'parcel' && (
              <ParcelTab
                activeParcel={activeParcel}
                onParcelLoaded={onParcelLoaded}
                onUpdateParcel={onUpdateParcel}
                fileInputRef={fileInputRef}
                handleFileUpload={handleFileUpload}
                uploadLoading={uploadLoading}
                uploadMsg={uploadMsg}
                onClearParcel={onClearParcel}
                onCenterOnParcel={() => viewerMethods?.flyToParcel()}
              />
            )}
            
            {/* TAB: 3D TUR & HARİTA */}
            {activeTab === 'camera' && (
              <div className="space-y-4">
                {/* 2D & 3D Görünüm Modu ve Otomatik Kadraj Ortalama */}
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                      <span>Harita Görünüm Modu</span>
                    </label>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 font-bold border border-sky-400/30">
                      {cameraState.pitch <= -75 && !cameraState.isTouring ? '2D Kuşbakışı' : '3D Perspektif'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* 2D Kuşbakışı Düz Harita Butonu */}
                    <button
                      type="button"
                      onClick={() => viewerMethods?.set2DView()}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition cursor-pointer active:scale-95 ${
                        cameraState.pitch <= -75 && !cameraState.isTouring
                          ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold shadow-md shadow-sky-500/25 ring-1 ring-sky-400'
                          : 'bg-white/5 text-slate-200 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <span>🗺️ 2D Kuşbakışı</span>
                      </div>
                      <span
                        className={`text-[9px] ${
                          cameraState.pitch <= -75 && !cameraState.isTouring
                            ? 'text-slate-950/80 font-semibold'
                            : 'text-slate-400'
                        }`}
                      >
                        Tam Düz & Sınırları Ortala
                      </span>
                    </button>

                    {/* 3D Perspektif Harita Butonu */}
                    <button
                      type="button"
                      onClick={() => viewerMethods?.set3DView()}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition cursor-pointer active:scale-95 ${
                        cameraState.pitch > -75 || cameraState.isTouring
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md shadow-amber-500/25 ring-1 ring-amber-400'
                          : 'bg-white/5 text-slate-200 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <span>🌐 3D Perspektif</span>
                      </div>
                      <span
                        className={`text-[9px] ${
                          cameraState.pitch > -75 || cameraState.isTouring
                            ? 'text-slate-950/80 font-semibold'
                            : 'text-slate-400'
                        }`}
                      >
                        Küresel & Sınırları Ortala
                      </span>
                    </button>
                  </div>

                  {/* KML Parsel Sınırlarını Ekrana Tam Ortala Butonu */}
                  <button
                    type="button"
                    onClick={() => viewerMethods?.flyToParcel()}
                    className="w-full py-2 px-3 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 text-sky-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer"
                  >
                    <Crosshair className="w-3.5 h-3.5 text-sky-400" />
                    <span>🎯 KML Sınırlarını Ekrana Tam Ortala</span>
                  </button>
                </div>

                {/* 2D ve 3D Tur Butonları */}
                <div className="grid grid-cols-2 gap-2">
                  {/* 2D Kuşbakışı Tur */}
                  <button
                    onClick={handleToggle2DTour}
                    className={`py-2.5 px-3 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition shadow-lg cursor-pointer active:scale-98 border ${
                      cameraState.isTouring && cameraState.tourMode === '2d'
                        ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-sky-500/30'
                        : 'bg-white/5 hover:bg-sky-500/20 border-white/10 hover:border-sky-400/50 text-sky-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <RotateCw className={`w-4 h-4 ${cameraState.isTouring && cameraState.tourMode === '2d' ? 'animate-spin text-slate-950' : 'text-sky-400'}`} />
                      <span className="text-xs">
                        {cameraState.isTouring && cameraState.tourMode === '2d' ? 'Durdur' : '2D Tur Başlat'}
                      </span>
                    </div>
                    <span className="text-[9px] opacity-80 font-normal">
                      360° Dönen Düz Harita
                    </span>
                  </button>

                  {/* 3D Perspektif Tur */}
                  <button
                    onClick={handleToggleTour}
                    className={`py-2.5 px-3 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition shadow-lg cursor-pointer active:scale-98 border ${
                      cameraState.isTouring && (cameraState.tourMode === '3d' || !cameraState.tourMode)
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-amber-500/30'
                        : 'bg-white/5 hover:bg-amber-500/20 border-white/10 hover:border-amber-400/50 text-amber-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Rotate3d className={`w-4 h-4 ${cameraState.isTouring && (cameraState.tourMode === '3d' || !cameraState.tourMode) ? 'animate-spin text-slate-950' : 'text-amber-400'}`} />
                      <span className="text-xs">
                        {cameraState.isTouring && (cameraState.tourMode === '3d' || !cameraState.tourMode) ? 'Durdur' : '3D Tur Başlat'}
                      </span>
                    </div>
                    <span className="text-[9px] opacity-80 font-normal">
                      Sinematik 3D Yörünge
                    </span>
                  </button>
                </div>

                {/* Otomatik Cihaz Hız & 60 FPS Optimizasyon Kartı */}
                <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-sky-500/10 border border-emerald-400/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Otomatik Cihaz Hız Optimizasyonu</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 font-mono font-bold">
                      {deviceOptimizationProfile.shortLabel}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-300 leading-relaxed">
                    {deviceOptimizationProfile.tier === 'phone'
                      ? 'Telefon işlemcisine ve dokunmatik ekrana göre 3D tur dönüş hızı ve grafik bellek kullanımı ultra akıcı 60 FPS için optimize edildi.'
                      : deviceOptimizationProfile.tier === 'tablet'
                      ? 'Tablet ekran çözünürlüğüne göre 3D tur dönüş hızı ve harita karo akışı otomatik dengelendi.'
                      : 'Masaüstü yüksek performanslı GPU donanım ivmelendirmesi aktif. Maksimum 3D dönüş akıcılığı ve kristal netlik.'}
                  </p>
                  <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[10px]">
                    <span className="text-slate-400">Önerilen Tur Hızı:</span>
                    <button
                      type="button"
                      onClick={() => onCameraChange({ tourSpeed: deviceOptimizationProfile.tourSpeed })}
                      className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 font-mono font-bold transition cursor-pointer"
                      title="Cihaz hızına göre kalibre et"
                    >
                      ⚡ {deviceOptimizationProfile.tourSpeed.toFixed(1)}x (Sıfırla)
                    </button>
                  </div>
                </div>

                {/* Altlık Harita Katmanları (Google & Esri - Yandex Kaldırıldı) */}
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-sky-400" />
                      <span>Altlık Harita Katmanı</span>
                    </label>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                      ⚡ Yüksek Çözünürlük
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Google Hibrit */}
                    <button
                      type="button"
                      onClick={() => onBaseMapChange('google_hybrid')}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 font-medium transition cursor-pointer active:scale-98 ${
                        baseMap === 'google_hybrid'
                          ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold shadow-md shadow-sky-500/20'
                          : 'bg-white/5 text-slate-200 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <Globe className="w-4 h-4" />
                      <span className="text-xs">Google Hibrit</span>
                      <span className={`text-[9px] truncate ${baseMap === 'google_hybrid' ? 'text-slate-950/80 font-semibold' : 'text-slate-400'}`}>
                        Uydu + Yol & İsim
                      </span>
                    </button>

                    {/* Google Saf */}
                    <button
                      type="button"
                      onClick={() => onBaseMapChange('google_satellite')}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 font-medium transition cursor-pointer active:scale-98 ${
                        baseMap === 'google_satellite'
                          ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold shadow-md shadow-sky-500/20'
                          : 'bg-white/5 text-slate-200 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span className="text-xs">Google Saf</span>
                      <span className={`text-[9px] truncate ${baseMap === 'google_satellite' ? 'text-slate-950/80 font-semibold' : 'text-slate-400'}`}>
                        Net Saf Uydu
                      </span>
                    </button>

                    {/* Esri Saf Uydu */}
                    <button
                      type="button"
                      onClick={() => onBaseMapChange('esri_satellite')}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 font-medium transition cursor-pointer active:scale-98 ${
                        baseMap === 'esri_satellite'
                          ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold shadow-md shadow-sky-500/20'
                          : 'bg-white/5 text-slate-200 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <Map className="w-4 h-4" />
                      <span className="text-xs">Esri Uydu</span>
                      <span className={`text-[9px] truncate ${baseMap === 'esri_satellite' ? 'text-slate-950/80 font-semibold' : 'text-slate-400'}`}>
                        ArcGIS HD
                      </span>
                    </button>
                  </div>

                  {/* GPS Konum Butonu */}
                  <button
                    type="button"
                    onClick={() => viewerMethods?.flyToDeviceLocation()}
                    className="w-full mt-1 p-2 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 text-sky-300 font-semibold flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer"
                  >
                    <LocateFixed className="w-3.5 h-3.5 text-sky-400" />
                    <span className="text-[11px]">📍 GPS Cihaz Konumuna Git</span>
                  </button>
                </div>

                {/* 3D Arazi & Gerçekçi Kabartma */}
                <div
                  className={`p-3 rounded-xl border transition-all ${
                    isTerrainActive
                      ? 'bg-gradient-to-br from-emerald-500/15 to-teal-500/10 border-emerald-500/40 shadow-lg shadow-emerald-950/20'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                      <Mountain className={`w-4 h-4 ${isTerrainActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                      3D Arazi Topoğrafyası & Kabartma
                    </span>
                    <button
                      type="button"
                      onClick={onToggleTerrain}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                        isTerrainActive
                          ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                          : 'bg-white/10 text-slate-300 hover:bg-white/20'
                      }`}
                    >
                      {isTerrainActive ? 'AKTİF' : 'PASİF'}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-300 leading-relaxed">
                    {isTerrainActive
                      ? 'ArcGIS 3D Yükseklik modeli aktif. Dağlar, yamaçlar ve vadiler 1.8x gerçekçi topoğrafik kabartma ile 3D modelleniyor.'
                      : 'Kabartma kapalı (Düz zemin modu). Topoğrafik eğim ve yükseltiler devre dışı.'}
                  </p>
                </div>

                {/* Telefon, Tablet ve PC Otomatik En İyi Görsel Boyut */}
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-sky-500/15 via-blue-500/10 to-indigo-500/15 border border-sky-400/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                      <span>Cihaza Özel En İyi Görsel Boyut</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/25 border border-sky-400/40 text-sky-200 font-semibold font-mono">
                      {detectedDeviceInfo.label}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-300 leading-relaxed">
                    Kullandığınız cihaza göre ekranı en verimli, net ve tam ölçekte kaplayan ideal görsel boyutunu tek tıkla otomatik uygular.
                  </p>

                  <button
                    type="button"
                    onClick={handleApplyOptimalDeviceSize}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 active:scale-98 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-sky-500/20 transition cursor-pointer"
                  >
                    <Scaling className="w-3.5 h-3.5" />
                    <span>⚡ {detectedDeviceInfo.name} İçin En İyi Boyuta Uyarla</span>
                  </button>

                  <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleApplySpecificDevice('phone')}
                      className={`p-1.5 rounded-lg border text-center transition cursor-pointer active:scale-95 ${
                        videoFormat === 'reels' && screenHeightPercent === 100
                          ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold shadow'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <div className="text-[10px] font-semibold">📱 Telefon</div>
                      <div className="text-[8px] opacity-75">9:16 Dikey</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApplySpecificDevice('tablet')}
                      className={`p-1.5 rounded-lg border text-center transition cursor-pointer active:scale-95 ${
                        screenHeightPercent === 100 && videoFormat !== 'reels'
                          ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold shadow'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <div className="text-[10px] font-semibold">📟 Tablet</div>
                      <div className="text-[8px] opacity-75">Geniş Ekran</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApplySpecificDevice('pc')}
                      className={`p-1.5 rounded-lg border text-center transition cursor-pointer active:scale-95 ${
                        videoFormat === 'youtube' && screenHeightPercent === 100
                          ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold shadow'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <div className="text-[10px] font-semibold">💻 PC (1080p)</div>
                      <div className="text-[8px] opacity-75">16:9 Full HD</div>
                    </button>
                  </div>
                </div>

                {/* Video Kadrajı Formatı */}
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider block">
                      Video Kadraj Oranı
                    </label>
                    <span className="text-[9px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-400/20">
                      1080p Full HD
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onVideoFormatChange('reels')}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer active:scale-98 ${
                        videoFormat === 'reels'
                          ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold shadow-md shadow-sky-500/20'
                          : 'bg-white/5 text-slate-200 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-[11px] font-semibold">9:16 Reels / Shorts</span>
                      <span className="text-[10px] opacity-75 font-mono">1080 × 1920 (1080p)</span>
                    </button>

                    <button
                      onClick={() => onVideoFormatChange('post')}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer active:scale-98 ${
                        videoFormat === 'post'
                          ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold shadow-md shadow-sky-500/20'
                          : 'bg-white/5 text-slate-200 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-[11px] font-semibold">1:1 Gönderi</span>
                      <span className="text-[10px] opacity-75 font-mono">1080 × 1080 (1080p)</span>
                    </button>

                    <button
                      onClick={() => onVideoFormatChange('portrait')}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer active:scale-98 ${
                        videoFormat === 'portrait'
                          ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold shadow-md shadow-sky-500/20'
                          : 'bg-white/5 text-slate-200 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-[11px] font-semibold">4:5 Portre Feed</span>
                      <span className="text-[10px] opacity-75 font-mono">1080 × 1350 (1080p)</span>
                    </button>

                    <button
                      onClick={() => onVideoFormatChange('youtube')}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer active:scale-98 ${
                        videoFormat === 'youtube'
                          ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold shadow-md shadow-sky-500/20'
                          : 'bg-white/5 text-slate-200 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-[11px] font-semibold">16:9 Full Screen</span>
                      <span className="text-[10px] opacity-75 font-mono">1920 × 1080 (Full HD)</span>
                    </button>
                  </div>
                </div>

                {/* Ekran Boyu & Kadraj Yüksekliği Ayarı */}
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Scaling className="w-3.5 h-3.5 text-sky-400" />
                      <span>Ekran Boyu & Kadraj Yüksekliği</span>
                    </label>
                    <span className="font-mono font-bold text-xs text-sky-300 px-2 py-0.5 rounded-md bg-sky-500/20 border border-sky-400/30">
                      %{screenHeightPercent}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-300 leading-relaxed">
                    Harita ve video kadrajının dikey boyutunu ve ekranı kaplama oranını ayarlayın.
                  </p>

                  <input
                    type="range"
                    min="50"
                    max="100"
                    step="5"
                    value={screenHeightPercent}
                    onChange={(e) => onScreenHeightPercentChange(parseInt(e.target.value, 10))}
                    className="w-full accent-sky-400 cursor-pointer h-1.5 bg-white/10 rounded-lg"
                  />

                  <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                    {[
                      { val: 100, label: 'Tam Ekran', sub: '%100' },
                      { val: 90, label: 'Geniş', sub: '%90' },
                      { val: 80, label: 'Standart', sub: '%80' },
                      { val: 65, label: 'Kompakt', sub: '%65' },
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => onScreenHeightPercentChange(item.val)}
                        className={`py-1.5 px-1 rounded-lg border text-center transition cursor-pointer active:scale-95 ${
                          screenHeightPercent === item.val
                            ? 'bg-sky-500 text-slate-950 font-bold border-sky-400 shadow-sm'
                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <div className="text-[10px] font-bold leading-tight">{item.label}</div>
                        <div className="text-[8px] opacity-75">{item.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pitch / Eğim */}
                <div className="space-y-1.5 bg-white/5 p-3 rounded-xl border border-white/10">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Kamera Eğimi (Pitch):</span>
                    <span className="text-sky-400 font-mono font-bold">{cameraState.pitch}°</span>
                  </div>
                  <input
                    type="range"
                    min="-90"
                    max="-5"
                    value={cameraState.pitch}
                    onChange={(e) => onCameraChange({ pitch: parseFloat(e.target.value) })}
                    className="w-full accent-sky-400 cursor-pointer h-1.5 bg-white/10 rounded-lg"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400">
                    <span>-90° (Kuşbakışı)</span>
                    <span>-45° (İzometrik)</span>
                    <span>-5° (Yatay)</span>
                  </div>
                </div>

                {/* Heading / Yön */}
                <div className="space-y-1.5 bg-white/5 p-3 rounded-xl border border-white/10">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Dönüş Açısı (Heading):</span>
                    <span className="text-sky-400 font-mono font-bold">
                      {Math.round(cameraState.heading)}°
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={cameraState.heading}
                    onChange={(e) => onCameraChange({ heading: parseFloat(e.target.value) })}
                    className="w-full accent-sky-400 cursor-pointer h-1.5 bg-white/10 rounded-lg"
                  />
                </div>

                {/* Range / Yükseklik */}
                <div className="space-y-1.5 bg-white/5 p-3 rounded-xl border border-white/10">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Mesafe (Range):</span>
                    <span className="text-sky-400 font-mono font-bold">{cameraState.range} m</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="4500"
                    step="50"
                    value={cameraState.range}
                    onChange={(e) => onCameraChange({ range: parseFloat(e.target.value) })}
                    className="w-full accent-sky-400 cursor-pointer h-1.5 bg-white/10 rounded-lg"
                  />
                </div>

                {/* Tur Hızı */}
                <div className="space-y-1.5 bg-white/5 p-3 rounded-xl border border-white/10">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Dönüş Tur Hızı:</span>
                    <span className="text-sky-400 font-mono font-bold">
                      {cameraState.tourSpeed.toFixed(1)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.2"
                    step="0.1"
                    value={cameraState.tourSpeed}
                    onChange={(e) => onCameraChange({ tourSpeed: parseFloat(e.target.value) })}
                    className="w-full accent-sky-400 cursor-pointer h-1.5 bg-white/10 rounded-lg"
                  />
                </div>

                {/* Reset & Quick Angles */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <button
                    onClick={() => onCameraChange({ pitch: -45, heading: 0 })}
                    className="py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-slate-300 font-medium text-center cursor-pointer"
                  >
                    Kuzey 45°
                  </button>
                  <button
                    onClick={() => onCameraChange({ pitch: -30, heading: 90 })}
                    className="py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-slate-300 font-medium text-center cursor-pointer"
                  >
                    Doğu 30°
                  </button>
                  <button
                    onClick={() => onCameraChange({ pitch: -90, heading: 0 })}
                    className={`py-1.5 px-2 rounded-lg border text-[10px] font-semibold text-center cursor-pointer transition-all ${
                      cameraState.pitch <= -85
                        ? 'bg-sky-500/25 border-sky-400/80 text-sky-200 shadow-sm'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                    }`}
                  >
                    Kuşbakışı
                  </button>
                </div>

                {/* 3D Tur Ayarlarını Varsayılan Olarak Kaydetme Kartı */}
                <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/15 via-sky-500/10 to-indigo-500/15 border border-amber-400/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs">
                      <BookmarkCheck className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>3D Tur Ayarlarını Varsayılan Yap</span>
                    </div>
                    {hasSavedTourDefaults && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/25 text-amber-200 font-medium border border-amber-400/40">
                        Kayıtlı Profil Aktif
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-300 leading-relaxed">
                    Dönüş tur hızı ({cameraState.tourSpeed.toFixed(1)}x), kamera mesafesi ({cameraState.range}m), açı ({cameraState.pitch}°) ve altlık haritayı varsayılan olarak kaydedin.
                  </p>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleSaveTourDefaults}
                      className="flex-1 py-1.5 px-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition cursor-pointer active:scale-95"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Varsayılan Olarak Kaydet</span>
                    </button>

                    {hasSavedTourDefaults && (
                      <button
                        type="button"
                        onClick={handleResetTourDefaults}
                        className="py-1.5 px-2.5 rounded-lg bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-400/40 text-slate-300 hover:text-red-300 text-xs font-medium transition cursor-pointer"
                        title="Varsayılan Tur Ayarlarını Sıfırla"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {tourSaveFeedback && (
                    <div
                      className={`text-[10px] font-semibold px-2 py-1 rounded text-center animate-in fade-in duration-200 ${
                        tourSaveFeedback.isError
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {tourSaveFeedback.message}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: STİL & GÖRÜNÜM */}
            {activeTab === 'style' && (
              <div className="space-y-4">
                {/* Sınır Rengi */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider block">
                      Sınır Çizgisi ve Dolgu Rengi
                    </label>
                    <div className="flex items-center gap-1.5 bg-white/10 px-2 py-0.5 rounded-lg border border-white/15">
                      <input
                        type="color"
                        value={parcelStyle.borderColor || '#38bdf8'}
                        onChange={(e) =>
                          onParcelStyleChange({ borderColor: e.target.value, fillColor: e.target.value })
                        }
                        className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                        title="Özel Renk Seç"
                      />
                      <span className="text-[10px] font-mono text-slate-300 uppercase">
                        {parcelStyle.borderColor || '#38bdf8'}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    {colorPresets.map((c) => (
                      <button
                        key={c.hex}
                        onClick={() =>
                          onParcelStyleChange({ borderColor: c.hex, fillColor: c.hex })
                        }
                        style={{ backgroundColor: c.hex }}
                        className={`h-8 rounded-lg border-2 transition cursor-pointer ${
                          parcelStyle.borderColor === c.hex ? 'border-white scale-110 shadow-lg' : 'border-black/30'
                        }`}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Sınır Kalınlığı */}
                <div className="space-y-1.5 bg-white/5 p-3 rounded-xl border border-white/10">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Sınır Çizgi Kalınlığı:</span>
                    <span className="text-sky-400 font-mono font-bold">{parcelStyle.borderWidth} px</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={parcelStyle.borderWidth}
                    onChange={(e) => onParcelStyleChange({ borderWidth: parseInt(e.target.value) })}
                    className="w-full accent-sky-400 cursor-pointer h-1.5 bg-white/10 rounded-lg"
                  />
                </div>

                {/* Dolgu Saydamlığı */}
                <div className="space-y-1.5 bg-white/5 p-3 rounded-xl border border-white/10">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Parsel İçi Saydamlık:</span>
                    <span className="text-sky-400 font-mono font-bold">
                      %{Math.round(parcelStyle.fillOpacity * 100)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.8"
                    step="0.05"
                    value={parcelStyle.fillOpacity}
                    onChange={(e) => onParcelStyleChange({ fillOpacity: parseFloat(e.target.value) })}
                    className="w-full accent-sky-400 cursor-pointer h-1.5 bg-white/10 rounded-lg"
                  />
                </div>

                {/* 3D Ekstrüzyon (Yükseklik Hacmi) */}
                <div className="space-y-1.5 bg-white/5 p-3 rounded-xl border border-white/10">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <Box className="w-3.5 h-3.5 text-amber-400" />
                      <span>3D Parsel Hacmi (Ekstrüzyon):</span>
                    </span>
                    <span className="text-sky-400 font-mono font-bold">
                      {parcelStyle.extrusionHeight} m
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="2"
                    value={parcelStyle.extrusionHeight}
                    onChange={(e) =>
                      onParcelStyleChange({ extrusionHeight: parseInt(e.target.value) })
                    }
                    className="w-full accent-sky-400 cursor-pointer h-1.5 bg-white/10 rounded-lg"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400">
                    <span>0m (Zemin)</span>
                    <span>20m (Bina/Sınır)</span>
                    <span>50m (Hava Sınırı)</span>
                  </div>
                </div>

                {/* Parlayan Neon Sınır (Glow) Toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex flex-col">
                    <span className="text-slate-200 font-medium text-xs">Parlama Efekti (Neon Glow)</span>
                    <span className="text-[10px] text-slate-400">Sınır çizgisine parlak neon ışıma ekler</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={parcelStyle.glowEffect}
                    onChange={(e) => onParcelStyleChange({ glowEffect: e.target.checked })}
                    className="w-4 h-4 accent-sky-400 cursor-pointer rounded"
                  />
                </div>

                {/* Kesikli Çizgi Animasyonu Toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex flex-col">
                    <span className="text-slate-200 font-medium text-xs">Kesikli Çizgi Stili</span>
                    <span className="text-[10px] text-slate-400">Düz çizgi yerine kesikli sınır çizgisi</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={parcelStyle.dashedBorder}
                    onChange={(e) => onParcelStyleChange({ dashedBorder: e.target.checked })}
                    className="w-4 h-4 accent-sky-400 cursor-pointer rounded"
                  />
                </div>

                {/* Pen Tool (KML Çizgilerini Takip Eden Çizim Aracı) */}
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-sky-500/15 via-blue-500/15 to-indigo-500/15 border border-sky-400/40 shadow-lg shadow-sky-500/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 shrink-0">
                        <PenTool className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-white font-bold flex items-center gap-1.5 text-xs">
                          <span>KML Çizim Animasyonu (Silerek Takip)</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-sky-400/20 text-sky-300 border border-sky-400/30">
                            PRO
                          </span>
                        </span>
                        <span className="text-[10px] text-slate-300">
                          Sınırı silerek sıfırdan çizer, çizim tamamlanınca tüm sınır ve parseli kapatır
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={parcelStyle.penTool}
                      onChange={(e) => onParcelStyleChange({ penTool: e.target.checked })}
                      className="w-4 h-4 accent-sky-400 cursor-pointer rounded shrink-0 ml-2"
                    />
                  </div>

                  {parcelStyle.penTool && (
                    <div className="space-y-3 pt-2 border-t border-white/10 animate-in fade-in duration-200">
                      {/* Çizim Hızı Seçenekleri */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-slate-300 flex items-center justify-between">
                          <span>Çizim & Tamamlama Hızı:</span>
                          <span className="text-[10px] font-mono text-sky-400">
                            {(parcelStyle.penToolSpeed || 1) === 0.5
                              ? '0.5x (Ağır)'
                              : (parcelStyle.penToolSpeed || 1) === 2
                              ? '2.0x (Hızlı)'
                              : '1.0x (Normal)'}
                          </span>
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { label: '0.5x Yavaş', val: 0.5 },
                            { label: '1.0x Normal', val: 1 },
                            { label: '2.0x Hızlı', val: 2 },
                          ].map((item) => (
                            <button
                              key={item.val}
                              type="button"
                              onClick={() => onParcelStyleChange({ penToolSpeed: item.val })}
                              className={`px-2 py-1.5 rounded-lg text-[10px] font-medium border transition cursor-pointer flex justify-center items-center ${
                                (parcelStyle.penToolSpeed || 1) === item.val
                                  ? 'bg-sky-500/20 border-sky-400 text-sky-200 font-bold'
                                  : 'bg-black/30 border-white/10 text-slate-400 hover:text-white'
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Stil Uyumluluk Bilgisi */}
                      <div className="p-2 rounded-lg bg-black/40 border border-white/10 text-[10px] text-slate-300 space-y-1">
                        <div className="flex items-center gap-1.5 text-sky-300 font-semibold">
                          <span>✓ Aktif Stil Ayarlarıyla Birebir Senkron:</span>
                        </div>
                        <p className="text-slate-400 leading-tight">
                          Çizgi rengi ({parcelStyle.borderColor || '#38bdf8'}), kalınlık ({parcelStyle.borderWidth}px), {parcelStyle.glowEffect ? 'neon parlama' : 'düz çizgi'} ve {parcelStyle.dashedBorder ? 'kesikli çizgi' : 'tam çizgi'} parametreleriyle KML sınırını silerek takip edip tamamlar.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Köşe Koordinat Noktaları Toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex flex-col">
                    <span className="text-slate-200 font-medium text-xs">Köşe Koordinat Noktaları</span>
                    <span className="text-[10px] text-slate-400">Parselin tüm köşe noktalarını haritada işaretle</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={parcelStyle.showStartEndMarkers}
                    onChange={(e) => onParcelStyleChange({ showStartEndMarkers: e.target.checked })}
                    className="w-4 h-4 accent-sky-400 cursor-pointer rounded"
                  />
                </div>

                {/* Parsel Cephe Boyları (Kenar Ölçüleri) Toggle */}
                <div className="p-3 rounded-xl bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-teal-500/10 border border-sky-400/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 shrink-0 text-xs font-bold">
                        📏
                      </div>
                      <div className="flex flex-col">
                        <span className="text-white font-bold flex items-center gap-1.5 text-xs">
                          <span>Parsel Cephe Boylarını Yazdır</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                            YENİ
                          </span>
                        </span>
                        <span className="text-[10px] text-slate-300">
                          Çizgilere paralel, iç içe girmeyecek şekilde stil renginde cephe uzunluklarını gösterir
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={parcelStyle.showEdgeDimensions !== false}
                      onChange={(e) => onParcelStyleChange({ showEdgeDimensions: e.target.checked })}
                      className="w-4 h-4 accent-sky-400 cursor-pointer rounded shrink-0 ml-2"
                    />
                  </div>
                  {parcelStyle.penTool && (
                    <div className="text-[9px] text-sky-300/90 bg-sky-500/10 px-2 py-1 rounded border border-sky-400/20 flex items-center gap-1">
                      <span>⚡ KML çizim animasyonu tamamlandığında cephe boyları otomatik yazdırılır.</span>
                    </div>
                  )}
                </div>

                {/* Stil Ayarlarını Varsayılan Olarak Kaydetme Kartı */}
                <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/15 via-sky-500/10 to-emerald-500/15 border border-amber-400/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs">
                      <BookmarkCheck className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Parsel Stilini Varsayılan Yap</span>
                    </div>
                    {hasSavedStyleDefaults && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/25 text-amber-200 font-medium border border-amber-400/40">
                        Kayıtlı Stil Aktif
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-300 leading-relaxed">
                    Sınır rengi ({parcelStyle.borderColor}), kalınlık ({parcelStyle.borderWidth}px), dolgu rengi, parlama ve cephe boyu tercihlerini varsayılan olarak kaydedin.
                  </p>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleSaveStyleDefaults}
                      className="flex-1 py-1.5 px-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition cursor-pointer active:scale-95"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Varsayılan Olarak Kaydet</span>
                    </button>

                    {hasSavedStyleDefaults && (
                      <button
                        type="button"
                        onClick={handleResetStyleDefaults}
                        className="py-1.5 px-2.5 rounded-lg bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-400/40 text-slate-300 hover:text-red-300 text-xs font-medium transition cursor-pointer"
                        title="Varsayılan Stili Sıfırla"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {styleSaveFeedback && (
                    <div
                      className={`text-[10px] font-semibold px-2 py-1 rounded text-center animate-in fade-in duration-200 ${
                        styleSaveFeedback.isError
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {styleSaveFeedback.message}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: FİRMA BİLGİLERİ (FİLİGRAN) */}
            {activeTab === 'watermark' && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider">
                    Filigran Kartını Göster
                  </span>
                  <input
                    type="checkbox"
                    checked={watermarkConfig.visible}
                    onChange={(e) => onWatermarkChange({ visible: e.target.checked })}
                    className="w-4 h-4 accent-sky-400 cursor-pointer rounded"
                  />
                </div>

                {/* Firma Bilgilerini Varsayılan Olarak Kaydet & Yönet */}
                <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/15 via-sky-500/10 to-emerald-500/15 border border-amber-400/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs">
                      <BookmarkCheck className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Firma Bilgilerini Varsayılan Yap</span>
                    </div>
                    {hasSavedDefaults && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/25 text-amber-200 font-medium border border-amber-400/40">
                        Kayıtlı Profil Aktif
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-300 leading-relaxed">
                    Firma adı, telefon, web, logo ve filigran ayarlarını tarayıcınıza kaydedin. Uygulama her açıldığında otomatik yüklenir.
                  </p>

                  {defaultSaveFeedback && (
                    <div
                      className={`p-2 rounded-lg text-[10px] font-medium flex items-center gap-1.5 animate-in fade-in duration-200 ${
                        defaultSaveFeedback.isError
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{defaultSaveFeedback.message}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={handleSaveDefaultWatermark}
                      className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-98 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Varsayılan Olarak Kaydet</span>
                    </button>

                    {hasSavedDefaults && (
                      <>
                        <button
                          type="button"
                          onClick={handleRestoreDefaultWatermark}
                          className="py-2 px-2.5 rounded-xl bg-white/10 hover:bg-white/15 active:scale-98 text-slate-200 text-xs font-semibold flex items-center gap-1 border border-white/15 transition cursor-pointer"
                          title="Varsayılan bilgileri geri yükle"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
                          <span>Geri Yükle</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleClearDefaultWatermark}
                          className="py-2 px-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition cursor-pointer"
                          title="Varsayılan kaydı temizle"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Firma Adı */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Firma / Marka Adı:</label>
                  <input
                    type="text"
                    value={watermarkConfig.companyName}
                    onChange={(e) => onWatermarkChange({ companyName: e.target.value })}
                    placeholder="Örn: İzgören Emlak Yatırım Danışmanlık"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                  />
                </div>

                {/* Telefon */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Telefon Numarası:</label>
                  <input
                    type="text"
                    value={watermarkConfig.phone}
                    onChange={(e) => onWatermarkChange({ phone: e.target.value })}
                    placeholder="Örn: 0532 395 02 63"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                  />
                </div>

                {/* Web / Instagram */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Web / Instagram:</label>
                  <input
                    type="text"
                    value={watermarkConfig.web}
                    onChange={(e) => onWatermarkChange({ web: e.target.value })}
                    placeholder="Örn: www.izgorenemlak.com"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                  />
                </div>

                {/* Fiyat Etiketi */}
                <div className="pt-1 border-t border-white/5">
                  <PriceInput
                    value={watermarkConfig.priceTag}
                    onChange={(formatted) => onWatermarkChange({ priceTag: formatted })}
                    label="Fiyat Etiketi (Otomatik Basamaklı & Dövizli):"
                    placeholder="Örn: 18500000"
                  />
                </div>

                {/* Logo Yükleme */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Firma Logosu:</label>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => logoInputRef.current?.click()}
                      className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 flex items-center justify-center gap-2 font-medium"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                      <span>{watermarkConfig.logoUrl ? 'Logoyu Değiştir' : 'Logo Yükle'}</span>
                    </button>

                    {watermarkConfig.logoUrl && (
                      <button
                        onClick={() => onWatermarkChange({ logoUrl: null })}
                        className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400"
                        title="Logoyu Kaldır"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {watermarkConfig.logoUrl && (
                    <div className="mt-2 flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={watermarkConfig.logoUrl}
                          alt="Logo Önizleme"
                          className="w-7 h-7 object-contain rounded-md bg-slate-900 p-0.5 border border-white/10 shrink-0"
                        />
                        <span className="text-[11px] text-slate-300 truncate">
                          Özel Logo Yüklendi
                        </span>
                      </div>
                      <button
                        onClick={() => onWatermarkChange({ logoUrl: null })}
                        className="text-[10px] text-red-400 hover:text-red-300 underline shrink-0 ml-2"
                      >
                        Kaldır
                      </button>
                    </div>
                  )}
                </div>

                {/* Filigran Boyutu & Ölçekleme */}
                <div className="pt-2 border-t border-white/10 space-y-2">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-300 font-medium flex items-center gap-1.5">
                      <Scaling className="w-3.5 h-3.5 text-sky-400" />
                      <span>Filigran Boyutu (Ölçekleme):</span>
                    </span>
                    <span className="text-sky-400 font-mono font-bold bg-sky-500/20 px-2 py-0.5 rounded border border-sky-400/30">
                      %{Math.round((watermarkConfig.scale ?? 1.0) * 100)}
                    </span>
                  </div>

                  <input
                    type="range"
                    min="40"
                    max="220"
                    step="5"
                    value={Math.round((watermarkConfig.scale ?? 1.0) * 100)}
                    onChange={(e) =>
                      onWatermarkChange({ scale: parseInt(e.target.value, 10) / 100 })
                    }
                    className="w-full accent-sky-400 cursor-pointer h-1.5 bg-white/10 rounded-lg"
                  />

                  <div className="grid grid-cols-6 gap-1 pt-0.5">
                    {[
                      { val: 0.6, label: '%60', desc: 'Mini' },
                      { val: 0.8, label: '%80', desc: 'Küçük' },
                      { val: 1.0, label: '%100', desc: 'Standart' },
                      { val: 1.25, label: '%125', desc: 'Büyük' },
                      { val: 1.5, label: '%150', desc: 'Geniş' },
                      { val: 2.0, label: '%200', desc: 'Dev' },
                    ].map((preset) => (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => onWatermarkChange({ scale: preset.val })}
                        className={`py-1 px-0.5 rounded-lg border text-center transition cursor-pointer active:scale-95 ${
                          Math.round((watermarkConfig.scale ?? 1.0) * 100) === Math.round(preset.val * 100)
                            ? 'bg-sky-500 text-slate-950 font-bold border-sky-400'
                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <div className="text-[10px] font-bold">{preset.label}</div>
                        <div className="text-[7px] opacity-75">{preset.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filigran Şeffaflığı (Opaklık) */}
                <div className="pt-2 border-t border-white/10 space-y-1.5">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-300 font-medium">Filigran Şeffaflığı / Opaklık:</span>
                    <span className="text-sky-400 font-mono font-bold">
                      %{Math.round((watermarkConfig.opacity ?? 0.85) * 100)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="100"
                    step="5"
                    value={Math.round((watermarkConfig.opacity ?? 0.85) * 100)}
                    onChange={(e) =>
                      onWatermarkChange({ opacity: parseInt(e.target.value) / 100 })
                    }
                    className="w-full accent-sky-400 cursor-pointer h-1.5 bg-white/10 rounded-lg"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400">
                    <span>%15 Saydam</span>
                    <span>%50 Yarı Saydam</span>
                    <span>%100 Net</span>
                  </div>
                </div>

                {/* Filigran Kartı Konumu */}
                <div className="pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] text-slate-400 block">Ana Filigran Konumu:</label>
                    {watermarkConfig.customPosition && (
                      <button
                        type="button"
                        onClick={() => onWatermarkChange({ customPosition: null })}
                        className="text-[10px] text-amber-300 hover:text-amber-200 underline font-semibold cursor-pointer"
                        title="Ekranda serbest sürüklenmiş konumu iptal et ve köşeye sabitle"
                      >
                        Köşeye Sıfırla
                      </button>
                    )}
                  </div>

                  {watermarkConfig.customPosition && (
                    <div className="flex items-center justify-between gap-2 p-1.5 mb-2 rounded-lg bg-sky-500/10 border border-sky-400/30 text-[10px]">
                      <span className="text-sky-300 font-medium">📌 Ekranda Serbest Kaydırılmış Konum Aktif</span>
                      <button
                        type="button"
                        onClick={() => onWatermarkChange({ customPosition: null })}
                        className="px-2 py-0.5 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-[9px] shrink-0"
                      >
                        Sabitle
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'bottom-right', label: 'Sağ Alt' },
                      { id: 'bottom-left', label: 'Sol Alt' },
                      { id: 'bottom-center', label: 'Alt Orta' },
                      { id: 'top-right', label: 'Sağ Üst' },
                      { id: 'top-left', label: 'Sol Üst' },
                      { id: 'top-center', label: 'Üst Orta' },
                    ].map((pos) => (
                      <button
                        key={pos.id}
                        onClick={() => onWatermarkChange({ position: pos.id as any, customPosition: null })}
                        className={`py-1.5 px-2 rounded-lg border text-[11px] font-medium transition ${
                          !watermarkConfig.customPosition && watermarkConfig.position === pos.id
                            ? 'bg-sky-500 text-slate-950 font-bold border-sky-400'
                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        {pos.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ada / Parsel Rozeti Konum Ayarı */}
                <div className="pt-2 border-t border-white/10">
                  <label className="text-[11px] text-amber-300 font-semibold block mb-1.5">
                    Ada / Parsel Rozet Konumu:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'inside', label: 'Filigran İçinde (Bütünleşik)' },
                      { id: 'top-left', label: 'Ayrı Sol Üst' },
                      { id: 'top-right', label: 'Ayrı Sağ Üst' },
                      { id: 'bottom-left', label: 'Ayrı Sol Alt' },
                      { id: 'bottom-right', label: 'Ayrı Sağ Alt' },
                    ].map((badgePos) => (
                      <button
                        key={badgePos.id}
                        onClick={() => onWatermarkChange({ adaParselPosition: badgePos.id as any })}
                        className={`py-1.5 px-2 rounded-lg border text-[10px] font-medium transition text-left ${
                          (watermarkConfig.adaParselPosition || 'inside') === badgePos.id
                            ? 'bg-amber-400 text-slate-950 font-bold border-amber-300 shadow-sm'
                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        {badgePos.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* İl / İlçe Rozeti Toggle */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[11px] text-slate-300 font-medium">İl / İlçe / Mahalle Rozetini Göster</span>
                  <input
                    type="checkbox"
                    checked={watermarkConfig.showLocationBadge ?? true}
                    onChange={(e) => onWatermarkChange({ showLocationBadge: e.target.checked })}
                    className="w-4 h-4 accent-sky-400 cursor-pointer rounded"
                  />
                </div>
              </div>
            )}

            {/* TAB 6: KAYIT & DIŞA AKTAR */}
            {activeTab === 'export' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-sky-500/10 to-blue-500/5 border border-sky-500/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-sky-300">
                      Sinematik 3D Video & Fotoğraf (1080p MP4)
                    </span>
                    <span className="text-[9px] font-mono text-emerald-400 font-bold bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-400/30">
                      1080p Full HD
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Instagram Reels, TikTok veya YouTube için filigranlı ve 3D kamera turlu 1080p Full HD kalitesinde MP4 formatında video kaydedin.
                  </p>
                </div>

                {/* Video Kaydı Butonu */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider block">
                      3D Video Kaydı (1080p MP4)
                    </label>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 font-mono">
                      1080p MP4
                    </span>
                  </div>

                  {viewerMethods?.isRecording ? (
                    <button
                      onClick={() => viewerMethods?.stopVideoRecording()}
                      className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-500/30 animate-pulse cursor-pointer"
                    >
                      <Square className="w-4 h-4 fill-white" />
                      <span>Kaydı Durdur ve 1080p MP4 İndir</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        // Automatically start 3D tour if not started
                        if (!cameraState.isTouring) {
                          onCameraChange({ isTouring: true });
                        }
                        viewerMethods?.startVideoRecording();
                      }}
                      className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 hover:brightness-110 transition cursor-pointer"
                    >
                      <VideoIcon className="w-4 h-4" />
                      <span>1080p MP4 Video Kaydını Başlat</span>
                    </button>
                  )}
                  <p className="text-[10px] text-slate-400 text-center">
                    Kayıt başlarken 3D sinematik tur devreye girer ve video 1080p yüksek çözünürlüklü MP4 olarak indirilir.
                  </p>
                </div>

                {/* HD Snapshot Butonu */}
                <div className="pt-2 border-t border-white/10 space-y-2">
                  <label className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider block">
                    HD Ekran Görüntüsü (PNG)
                  </label>
                  <button
                    onClick={() => viewerMethods?.takeSnapshot()}
                    className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold flex items-center justify-center gap-2 transition"
                  >
                    <CameraIcon className="w-4 h-4 text-sky-400" />
                    <span>Anlık HD Fotoğraf İndir</span>
                  </button>
                </div>

                {/* PWA Mobil & Masaüstü Uygulama Kurulumu */}
                <div className="pt-3 border-t border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider block">
                      PWA Uygulama Kurulumu
                    </label>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                      OFFLINE & APP
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Uygulamayı telefonunuza (iOS / Android) veya bilgisayarınıza bağımsız bir uygulama olarak yükleyin.
                  </p>
                  <PWAInstallButton variant="panel" />
                </div>
              </div>
            )}

          </div>

          {/* Sticky Drawer Footer Actions for Phone, Tablet & Desktop */}
          <div className="p-3 border-t border-white/10 bg-slate-900/95 shrink-0 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => viewerMethods?.takeSnapshot()}
              className="flex-1 h-9 px-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer"
              title="HD Fotoğraf Çek"
            >
              <CameraIcon className="w-3.5 h-3.5 text-sky-400" />
              <span>HD Foto</span>
            </button>

            <button
              type="button"
              onClick={handleToggle2DTour}
              className={`flex-1 h-9 px-1.5 rounded-xl border text-[11px] font-semibold flex items-center justify-center gap-1 active:scale-95 transition cursor-pointer ${
                cameraState.isTouring && cameraState.tourMode === '2d'
                  ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold animate-pulse shadow-md shadow-sky-500/30'
                  : 'bg-white/10 text-sky-400 border-white/15 hover:bg-white/15'
              }`}
              title="2D Kuşbakışı Tur"
            >
              <RotateCw className={`w-3.5 h-3.5 ${cameraState.isTouring && cameraState.tourMode === '2d' ? 'animate-spin' : ''}`} />
              <span>{cameraState.isTouring && cameraState.tourMode === '2d' ? 'Durdur' : '2D Tur'}</span>
            </button>

            <button
              type="button"
              onClick={handleToggleTour}
              className={`flex-1 h-9 px-1.5 rounded-xl border text-[11px] font-semibold flex items-center justify-center gap-1 active:scale-95 transition cursor-pointer ${
                cameraState.isTouring && (cameraState.tourMode === '3d' || !cameraState.tourMode)
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold animate-pulse shadow-md shadow-amber-500/30'
                  : 'bg-white/10 text-amber-400 border-white/15 hover:bg-white/15'
              }`}
              title="3D Perspektif Tur"
            >
              <Rotate3d className={`w-3.5 h-3.5 ${cameraState.isTouring && (cameraState.tourMode === '3d' || !cameraState.tourMode) ? 'animate-spin' : ''}`} />
              <span>{cameraState.isTouring && (cameraState.tourMode === '3d' || !cameraState.tourMode) ? 'Durdur' : '3D Tur'}</span>
            </button>

            {viewerMethods?.isRecording ? (
              <button
                type="button"
                onClick={() => viewerMethods.stopVideoRecording()}
                className="flex-1 h-9 px-2.5 rounded-xl bg-red-600 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/40 animate-pulse active:scale-95 cursor-pointer"
              >
                <Square className="w-3 h-3 fill-white" />
                <span>Durdur</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (!cameraState.isTouring) onCameraChange({ isTouring: true });
                  viewerMethods?.startVideoRecording();
                }}
                className="flex-1 h-9 px-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-md shadow-red-500/20 active:scale-95 cursor-pointer"
              >
                <VideoIcon className="w-3.5 h-3.5" />
                <span>Video</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </>
  );
};
