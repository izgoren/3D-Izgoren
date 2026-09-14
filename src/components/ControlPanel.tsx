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
import { ViewerMethods } from './CesiumViewer';
import { PWAInstallButton } from './PWAInstallButton';

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
}

type TabType = 'map' | 'camera' | 'parcel' | 'style' | 'watermark' | 'export';

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
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('map');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ text: string; isError: boolean } | null>(null);

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

  return (
    <>
      {/* Mobile Floating Action Dock (Visible only on mobile when panel is collapsed) */}
      {isCollapsed && (
        <div className="sm:hidden fixed bottom-4 inset-x-3 z-40 flex items-center justify-between p-2 rounded-2xl bg-slate-950/95 backdrop-blur-xl border border-white/20 shadow-2xl shadow-black">
          <button
            onClick={() => setIsCollapsed(false)}
            className="h-11 px-3.5 rounded-xl bg-sky-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-sky-500/20 active:scale-95 transition"
          >
            <Sliders className="w-4 h-4" />
            <span>Stüdyo Menüsü</span>
          </button>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onCameraChange({ isTouring: !cameraState.isTouring })}
              className={`w-11 h-11 rounded-xl border flex items-center justify-center transition active:scale-95 ${
                cameraState.isTouring
                  ? 'bg-red-500 text-white border-red-400 animate-pulse shadow-lg shadow-red-500/30'
                  : 'bg-white/10 text-sky-400 border-white/15'
              }`}
              title="3D Tur"
            >
              <Rotate3d className={`w-4 h-4 ${cameraState.isTouring ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => viewerMethods?.takeSnapshot()}
              className="w-11 h-11 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white flex items-center justify-center active:scale-95 transition"
              title="HD Fotoğraf"
            >
              <CameraIcon className="w-4 h-4 text-sky-400" />
            </button>

            {viewerMethods?.isRecording ? (
              <button
                onClick={() => viewerMethods.stopVideoRecording()}
                className="h-11 px-3 rounded-xl bg-red-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-red-600/40 animate-pulse active:scale-95"
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
                className="h-11 px-3 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-red-500/30 active:scale-95"
              >
                <VideoIcon className="w-4 h-4" />
                <span>Kayıt</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Studio Control Panel: Mobile Bottom Sheet / Desktop Floating Glass Card */}
      <div
        className={`${
          isCollapsed ? 'hidden sm:block' : 'fixed sm:absolute'
        } inset-x-0 bottom-0 sm:bottom-auto sm:top-5 sm:left-5 z-40 sm:max-w-[370px] w-full sm:w-[370px] select-none`}
      >
        <div className="rounded-t-3xl sm:rounded-2xl bg-slate-950/95 sm:bg-slate-950/90 backdrop-blur-2xl border-t sm:border border-white/15 shadow-2xl shadow-black/90 overflow-hidden flex flex-col max-h-[82vh] sm:max-h-[calc(100vh-40px)] transition-all duration-200">
          
          {/* Mobile Drag Indicator Handle */}
          <div
            className="sm:hidden pt-2.5 pb-1 flex justify-center cursor-pointer"
            onClick={() => setIsCollapsed(true)}
          >
            <div className="w-12 h-1.5 rounded-full bg-white/25 hover:bg-white/40" />
          </div>

          {/* Header Bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-slate-900/60">
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
              
              {/* Haritayı Gör / Kapat Button on Mobile */}
              <button
                onClick={() => setIsCollapsed(true)}
                className="sm:hidden min-h-[38px] px-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-medium flex items-center gap-1"
              >
                <span>Haritayı Gör</span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {/* Desktop Collapse Toggle */}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden sm:flex min-w-[36px] min-h-[36px] items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
                title={isCollapsed ? 'Paneli Genişlet' : 'Paneli Daralt'}
              >
                {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Navigation Tabs with comfortable touch targets */}
          {!isCollapsed && (
            <div className="flex items-center border-b border-white/10 bg-slate-950/60 p-1.5 gap-1 overflow-x-auto scrollbar-none">
              <button
                onClick={() => setActiveTab('map')}
                className={`flex-1 min-w-[50px] min-h-[42px] py-1.5 px-2 rounded-xl text-[11px] font-medium flex items-center justify-center gap-1.5 transition ${
                  activeTab === 'map'
                    ? 'bg-sky-500 text-slate-950 font-bold shadow'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Harita</span>
              </button>

              <button
                onClick={() => setActiveTab('camera')}
                className={`flex-1 min-w-[50px] min-h-[42px] py-1.5 px-2 rounded-xl text-[11px] font-medium flex items-center justify-center gap-1.5 transition ${
                  activeTab === 'camera'
                    ? 'bg-sky-500 text-slate-950 font-bold shadow'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>3D Tur</span>
              </button>

              <button
                onClick={() => setActiveTab('parcel')}
                className={`flex-1 min-w-[50px] min-h-[42px] py-1.5 px-2 rounded-xl text-[11px] font-medium flex items-center justify-center gap-1.5 transition ${
                  activeTab === 'parcel'
                    ? 'bg-sky-500 text-slate-950 font-bold shadow'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Parsel</span>
              </button>

              <button
                onClick={() => setActiveTab('style')}
                className={`flex-1 min-w-[50px] min-h-[42px] py-1.5 px-2 rounded-xl text-[11px] font-medium flex items-center justify-center gap-1.5 transition ${
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
                className={`flex-1 min-w-[50px] min-h-[42px] py-1.5 px-2 rounded-xl text-[11px] font-medium flex items-center justify-center gap-1.5 transition ${
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
                className={`flex-1 min-w-[50px] min-h-[42px] py-1.5 px-2 rounded-xl text-[11px] font-medium flex items-center justify-center gap-1.5 transition ${
                  activeTab === 'export'
                    ? 'bg-sky-500 text-slate-950 font-bold shadow'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <VideoIcon className="w-3.5 h-3.5" />
                <span>Kayıt</span>
              </button>
            </div>
          )}

          {/* Tab Contents - Scrollable with comfortable touch padding */}
          {!isCollapsed && (
            <div className="p-4 max-h-[calc(82vh-130px)] sm:max-h-[calc(100vh-210px)] overflow-y-auto overscroll-contain space-y-4 text-xs">
              
              {/* TAB 1: HARİTA & KADRAJ */}
              {activeTab === 'map' && (
                <div className="space-y-4">
                  {/* Altlık Harita Seçenekleri */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider">
                        Altlık Harita Katmanı
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono">4 Güvenilir Altlık</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => onBaseMapChange('google_hybrid')}
                        className={`p-3 rounded-xl border flex items-center gap-2.5 font-medium transition min-h-[52px] active:scale-98 cursor-pointer ${
                          baseMap === 'google_hybrid'
                            ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold shadow-md shadow-sky-500/20'
                            : 'bg-white/5 text-slate-200 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            baseMap === 'google_hybrid' ? 'bg-slate-950/20 text-slate-950' : 'bg-sky-500/20 text-sky-400'
                          }`}
                        >
                          <Globe className="w-4 h-4" />
                        </div>
                        <div className="text-left overflow-hidden">
                          <div className="text-xs font-bold leading-tight">Google Hibrit</div>
                          <div
                            className={`text-[10px] leading-tight truncate ${
                              baseMap === 'google_hybrid' ? 'text-slate-900/90 font-medium' : 'text-slate-400'
                            }`}
                          >
                            Uydu + Yol & İsimler
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => onBaseMapChange('google_satellite')}
                        className={`p-3 rounded-xl border flex items-center gap-2.5 font-medium transition min-h-[52px] active:scale-98 cursor-pointer ${
                          baseMap === 'google_satellite'
                            ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold shadow-md shadow-sky-500/20'
                            : 'bg-white/5 text-slate-200 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            baseMap === 'google_satellite' ? 'bg-slate-950/20 text-slate-950' : 'bg-sky-500/20 text-sky-400'
                          }`}
                        >
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div className="text-left overflow-hidden">
                          <div className="text-xs font-bold leading-tight">Google Saf Uydu</div>
                          <div
                            className={`text-[10px] leading-tight truncate ${
                              baseMap === 'google_satellite' ? 'text-slate-900/90 font-medium' : 'text-slate-400'
                            }`}
                          >
                            Yazısız Net Uydu
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => onBaseMapChange('esri')}
                        className={`p-3 rounded-xl border flex items-center gap-2.5 font-medium transition min-h-[52px] active:scale-98 cursor-pointer ${
                          baseMap === 'esri'
                            ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold shadow-md shadow-sky-500/20'
                            : 'bg-white/5 text-slate-200 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            baseMap === 'esri' ? 'bg-slate-950/20 text-slate-950' : 'bg-sky-500/20 text-sky-400'
                          }`}
                        >
                          <Layers className="w-4 h-4" />
                        </div>
                        <div className="text-left overflow-hidden">
                          <div className="text-xs font-bold leading-tight">Esri Dünya Uydu</div>
                          <div
                            className={`text-[10px] leading-tight truncate ${
                              baseMap === 'esri' ? 'text-slate-900/90 font-medium' : 'text-slate-400'
                            }`}
                          >
                            ArcGIS Yüksek Uydu
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => onBaseMapChange('carto_voyager')}
                        className={`p-3 rounded-xl border flex items-center gap-2.5 font-medium transition min-h-[52px] active:scale-98 cursor-pointer ${
                          baseMap === 'carto_voyager'
                            ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold shadow-md shadow-sky-500/20'
                            : 'bg-white/5 text-slate-200 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            baseMap === 'carto_voyager' ? 'bg-slate-950/20 text-slate-950' : 'bg-sky-500/20 text-sky-400'
                          }`}
                        >
                          <Navigation className="w-4 h-4" />
                        </div>
                        <div className="text-left overflow-hidden">
                          <div className="text-xs font-bold leading-tight">Carto Voyager</div>
                          <div
                            className={`text-[10px] leading-tight truncate ${
                              baseMap === 'carto_voyager' ? 'text-slate-900/90 font-medium' : 'text-slate-400'
                            }`}
                          >
                            Yol & Şehir Haritası
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* 3D Arazi & Gerçekçi Kabartma Aktif / Pasif */}
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
                        ? 'ArcGIS 3D Yükseklik modeli aktif. Dağlar, yamaçlar ve vadiler 1.8x gerçekçi topoğrafik kabartma ve güneş derinliğiyle 3D modelleniyor.'
                        : 'Kabartma kapalı (Düz zemin modu). Topoğrafik eğim ve yükseltiler devre dışı.'}
                    </p>
                  </div>

                {/* Video Kadrajı Formatı */}
                <div className="pt-3 border-t border-white/10">
                  <label className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider mb-2 block">
                    Video Kadraj Oranı
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onVideoFormatChange('reels')}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition ${
                        videoFormat === 'reels'
                          ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold shadow-md shadow-sky-500/20'
                          : 'bg-white/5 text-slate-200 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-[11px] font-semibold">9:16 Reels / Shorts</span>
                      <span className="text-[10px] opacity-75 font-mono">405 × 720</span>
                    </button>

                    <button
                      onClick={() => onVideoFormatChange('post')}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition ${
                        videoFormat === 'post'
                          ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold shadow-md shadow-sky-500/20'
                          : 'bg-white/5 text-slate-200 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-[11px] font-semibold">1:1 Gönderi</span>
                      <span className="text-[10px] opacity-75 font-mono">600 × 600</span>
                    </button>

                    <button
                      onClick={() => onVideoFormatChange('portrait')}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition ${
                        videoFormat === 'portrait'
                          ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold shadow-md shadow-sky-500/20'
                          : 'bg-white/5 text-slate-200 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-[11px] font-semibold">4:5 Portre Feed</span>
                      <span className="text-[10px] opacity-75 font-mono">480 × 600</span>
                    </button>

                    <button
                      onClick={() => onVideoFormatChange('youtube')}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition ${
                        videoFormat === 'youtube'
                          ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold shadow-md shadow-sky-500/20'
                          : 'bg-white/5 text-slate-200 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-[11px] font-semibold">16:9 Full Screen</span>
                      <span className="text-[10px] opacity-75 font-mono">YouTube & TV</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: 3D KAMERA & SİNEMATİK TUR */}
            {activeTab === 'camera' && (
              <div className="space-y-4">
                {/* 3D Cinematic Tour Main Button */}
                <button
                  onClick={() => onCameraChange({ isTouring: !cameraState.isTouring })}
                  className={`w-full py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-lg ${
                    cameraState.isTouring
                      ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-red-500/30'
                      : 'bg-gradient-to-r from-sky-500 to-blue-600 text-slate-950 shadow-sky-500/30'
                  }`}
                >
                  {cameraState.isTouring ? (
                    <>
                      <Square className="w-4 h-4 fill-white" />
                      <span>Sinematik Turu Durdur</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-slate-950" />
                      <span>3D Sinematik Turu Başlat</span>
                    </>
                  )}
                </button>

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
                    className="py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-slate-300 font-medium text-center"
                  >
                    Kuzey 45°
                  </button>
                  <button
                    onClick={() => onCameraChange({ pitch: -30, heading: 90 })}
                    className="py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-slate-300 font-medium text-center"
                  >
                    Doğu 30°
                  </button>
                  <button
                    onClick={() => onCameraChange({ pitch: -90, heading: 0 })}
                    className="py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-slate-300 font-medium text-center"
                  >
                    Kuşbakışı
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: PARSEL YÜKLE & YÖNET */}
            {activeTab === 'parcel' && (
              <div className="space-y-4">
                {/* Manuel Parsel Bilgileri (Elle Giriş & Düzenleme) */}
                <div className="space-y-3 p-3.5 rounded-xl bg-white/5 border border-sky-400/30">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-400" />
                      Parsel Bilgileri (Elle Giriş)
                    </span>
                    <span className="text-[10px] text-emerald-400 font-medium">Filigrana Yansır</span>
                  </div>

                  {/* İl & İlçe */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">İl:</label>
                      <input
                        type="text"
                        value={activeParcel?.city || ''}
                        onChange={(e) => onUpdateParcel({ city: e.target.value })}
                        placeholder="Örn: Bursa"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/15 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">İlçe:</label>
                      <input
                        type="text"
                        value={activeParcel?.district || ''}
                        onChange={(e) => onUpdateParcel({ district: e.target.value })}
                        placeholder="Örn: Nilüfer"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/15 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                      />
                    </div>
                  </div>

                  {/* Mahalle */}
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Mahalle / Mevkii:</label>
                    <input
                      type="text"
                      value={activeParcel?.neighborhood || ''}
                      onChange={(e) => onUpdateParcel({ neighborhood: e.target.value })}
                      placeholder="Örn: Özlüce / Görükle"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/15 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                    />
                  </div>

                  {/* Ada No & Parsel No */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-amber-300 font-semibold block mb-1">Ada No:</label>
                      <input
                        type="text"
                        value={activeParcel?.adaNo || ''}
                        onChange={(e) => onUpdateParcel({ adaNo: e.target.value })}
                        placeholder="Örn: 2412"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-amber-400/30 text-amber-300 font-mono text-xs font-bold placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-amber-300 font-semibold block mb-1">Parsel No:</label>
                      <input
                        type="text"
                        value={activeParcel?.parselNo || ''}
                        onChange={(e) => onUpdateParcel({ parselNo: e.target.value })}
                        placeholder="Örn: 8"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-amber-400/30 text-amber-300 font-mono text-xs font-bold placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  {/* Alan (m²) & Fiyat */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Yüzölçümü (m²):</label>
                      <input
                        type="number"
                        value={activeParcel?.areaM2 || ''}
                        onChange={(e) => onUpdateParcel({ areaM2: parseFloat(e.target.value) || 0 })}
                        placeholder="Örn: 2450"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/15 text-white font-mono text-xs placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-emerald-400 block mb-1">Satış Bedeli / Fiyat:</label>
                      <input
                        type="text"
                        value={activeParcel?.price || ''}
                        onChange={(e) => onUpdateParcel({ price: e.target.value })}
                        placeholder="Örn: 18.500.000 ₺"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-emerald-400/30 text-emerald-300 font-semibold text-xs placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>

                  {/* Nitelik & Açıklama */}
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Nitelik / Açıklama:</label>
                    <input
                      type="text"
                      value={activeParcel?.description || ''}
                      onChange={(e) => onUpdateParcel({ description: e.target.value })}
                      placeholder="Örn: İmarlı Arsa E=1.50 Konut Alanı"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/15 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                    />
                  </div>
                </div>

                {/* Upload File Box */}
                <div className="pt-2 border-t border-white/10">
                  <label className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider mb-2 block">
                    Kendi Parsel Dosyanızı Yükleyin
                  </label>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".kml,.kmz,.geojson,.json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  <button
                    disabled={uploadLoading}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3.5 px-3 border-2 border-dashed border-sky-400/40 hover:border-sky-400 rounded-xl bg-sky-500/5 hover:bg-sky-500/10 flex flex-col items-center justify-center gap-1 text-center transition cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-sky-400" />
                    <span className="font-semibold text-white text-xs">.KML, .KMZ veya .GeoJSON Seçin</span>
                    <span className="text-[10px] text-slate-400">
                      Netcad, Google Earth veya TKGM Kadastro Dosyası
                    </span>
                  </button>

                  {uploadMsg && (
                    <div
                      className={`mt-2 p-2 rounded-lg text-[11px] flex items-center gap-2 ${
                        uploadMsg.isError
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{uploadMsg.text}</span>
                    </div>
                  )}
                </div>

                {/* Aktif Parsel Detay Kartı */}
                {activeParcel && areaDetails && (
                  <div className="p-3.5 rounded-xl bg-white/5 border border-sky-400/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-white truncate">
                        {activeParcel.name}
                      </span>
                      <span className="text-[10px] text-sky-400 font-mono">
                        {activeParcel.coordinates.length} Köşe Noktası
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                        <span className="text-[10px] text-slate-400 block">Parsel Alanı:</span>
                        <span className="text-xs font-bold text-amber-300 font-mono">
                          {areaDetails.m2}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          ({areaDetails.donum})
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                        <span className="text-[10px] text-slate-400 block">Çevre Uzunluğu:</span>
                        <span className="text-xs font-bold text-sky-300 font-mono">
                          {activeParcel.perimeterM.toLocaleString('tr-TR')} m
                        </span>
                        <span className="text-[10px] text-slate-400 block">Sınır Çiti</span>
                      </div>
                    </div>

                    {activeParcel.adaNo && (
                      <div className="text-[11px] text-slate-300 flex items-center justify-between border-t border-white/10 pt-2">
                        <span>Ada / Parsel:</span>
                        <span className="font-mono font-bold text-white">
                          Ada {activeParcel.adaNo} • Parsel {activeParcel.parselNo}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: STİL & GÖRÜNÜM */}
            {activeTab === 'style' && (
              <div className="space-y-4">
                {/* Sınır Rengi */}
                <div>
                  <label className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider mb-2 block">
                    Sınır Çizgisi Rengi
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {colorPresets.map((c) => (
                      <button
                        key={c.hex}
                        onClick={() =>
                          onParcelStyleChange({ borderColor: c.hex, fillColor: c.hex })
                        }
                        style={{ backgroundColor: c.hex }}
                        className={`h-8 rounded-lg border-2 transition ${
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

                {/* Kesikli Çizgi Animasyonu Toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-slate-200 font-medium">Kesikli Çizgi Stili</span>
                  <input
                    type="checkbox"
                    checked={parcelStyle.dashedBorder}
                    onChange={(e) => onParcelStyleChange({ dashedBorder: e.target.checked })}
                    className="w-4 h-4 accent-sky-400 cursor-pointer rounded"
                  />
                </div>

                {/* Su Akışı Animasyonu */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-sky-500/10 to-teal-500/10 border border-sky-500/30">
                  <div className="flex flex-col">
                    <span className="text-white font-medium flex items-center gap-1.5 text-xs">
                      <span>🌊 Su Akışı Animasyonu (Canlı Dalga)</span>
                    </span>
                    <span className="text-[10px] text-slate-300">
                      Sınır hattı boyunca su gibi kesintisiz, pürüzsüz ve parlak akan nehir/su dalgası efekti
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={parcelStyle.animateLine}
                    onChange={(e) => onParcelStyleChange({ animateLine: e.target.checked })}
                    className="w-4 h-4 accent-sky-400 cursor-pointer rounded shrink-0 ml-2"
                  />
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
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Fiyat Etiketi (Opsiyonel):</label>
                  <input
                    type="text"
                    value={watermarkConfig.priceTag}
                    onChange={(e) => onWatermarkChange({ priceTag: e.target.value })}
                    placeholder="Örn: 18.500.000 ₺"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
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
                  <label className="text-[11px] text-slate-400 block mb-1.5">Ana Filigran Konumu:</label>
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
                        onClick={() => onWatermarkChange({ position: pos.id as any })}
                        className={`py-1.5 px-2 rounded-lg border text-[11px] font-medium transition ${
                          watermarkConfig.position === pos.id
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
                  <span className="text-xs font-bold text-sky-300 block mb-1">
                    Sinematik 3D Video & Fotoğraf (MP4)
                  </span>
                  <p className="text-[11px] text-slate-300">
                    Instagram Reels, TikTok veya YouTube için filigranlı ve 3D kamera turlu yüksek kaliteli MP4 formatında video kaydedin.
                  </p>
                </div>

                {/* Video Kaydı Butonu */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider block">
                      3D Video Kaydı (MP4)
                    </label>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 font-mono">
                      MP4 FORMATI
                    </span>
                  </div>

                  {viewerMethods?.isRecording ? (
                    <button
                      onClick={() => viewerMethods?.stopVideoRecording()}
                      className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-500/30 animate-pulse cursor-pointer"
                    >
                      <Square className="w-4 h-4 fill-white" />
                      <span>Kaydı Durdur ve MP4 İndir</span>
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
                      <span>MP4 Video Kaydını Başlat</span>
                    </button>
                  )}
                  <p className="text-[10px] text-slate-400 text-center">
                    Kayıt başlarken 3D kamera turu otomatik döner ve video MP4 dosyası olarak cihazınıza indirilir.
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
        )}

      </div>
    </div>
    </>
  );
};
