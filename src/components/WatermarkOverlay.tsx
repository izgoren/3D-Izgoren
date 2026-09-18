import React from 'react';
import { Phone, Globe, Building2, MapPin, Tag } from 'lucide-react';
import { WatermarkConfig, ParcelInfo } from '../types';

interface WatermarkOverlayProps {
  config: WatermarkConfig;
  activeParcel: ParcelInfo | null;
}

export const WatermarkOverlay: React.FC<WatermarkOverlayProps> = ({ config, activeParcel }) => {
  if (!config.visible) return null;

  const positionClasses: Record<string, string> = {
    'bottom-right': 'bottom-20 right-3 sm:bottom-6 sm:right-6',
    'bottom-left': 'bottom-20 left-3 sm:bottom-6 sm:left-6',
    'top-right': 'top-16 right-3 sm:top-20 sm:right-6',
    'top-left': 'top-16 left-3 sm:top-20 sm:left-6',
    'bottom-center': 'bottom-20 left-1/2 -translate-x-1/2 sm:bottom-6',
    'top-center': 'top-16 left-1/2 -translate-x-1/2 sm:top-20',
  };

  const separateBadgePositions: Record<string, string> = {
    'top-left': 'top-16 left-3 sm:top-20 sm:left-6',
    'top-right': 'top-16 right-3 sm:top-20 sm:right-6',
    'bottom-left': 'bottom-20 left-3 sm:bottom-6 sm:left-6',
    'bottom-right': 'bottom-20 right-3 sm:bottom-6 sm:right-6',
  };

  // Build Location String: İl / İlçe / Mahalle
  const locationParts = [
    activeParcel?.city,
    activeParcel?.district,
    activeParcel?.neighborhood,
  ].filter(Boolean);
  const locationTitle = locationParts.length > 0 ? locationParts.join(' / ') : '3D Küresel Uydu Haritası';

  // Ada Parsel Text
  const adaParselDisplay =
    config.adaParselText ||
    (activeParcel?.adaNo || activeParcel?.parselNo
      ? `Ada: ${activeParcel?.adaNo || '-'} / Parsel: ${activeParcel?.parselNo || '-'}`
      : null);

  const userScale = typeof config.scale === 'number' && config.scale > 0 ? config.scale : 1.0;

  const getTransformOrigin = (pos: string) => {
    switch (pos) {
      case 'bottom-right':
        return 'bottom right';
      case 'bottom-left':
        return 'bottom left';
      case 'top-right':
        return 'top right';
      case 'top-left':
        return 'top left';
      case 'bottom-center':
        return 'bottom center';
      case 'top-center':
        return 'top center';
      default:
        return 'bottom right';
    }
  };

  return (
    <>
      {/* Separate Floating Ada/Parsel Badge if configured */}
      {config.adaParselPosition !== 'inside' && adaParselDisplay && (
        <div
          className={`absolute z-30 pointer-events-none transition-all duration-300 ${
            separateBadgePositions[config.adaParselPosition] || 'top-3 left-3 sm:top-6 sm:left-6'
          }`}
          style={{
            opacity: config.opacity ?? 0.85,
            transform: userScale !== 1 ? `scale(${userScale})` : undefined,
            transformOrigin: config.adaParselPosition?.includes('right') ? 'top right' : 'top left',
          }}
        >
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/90 backdrop-blur-xl border border-amber-400/40 shadow-2xl shadow-black text-amber-300 font-mono text-xs select-none">
            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-bold tracking-wide">{adaParselDisplay}</span>
            {activeParcel?.areaM2 ? (
              <span className="text-[10px] text-white/70 border-l border-white/20 pl-2">
                {activeParcel.areaM2.toLocaleString('tr-TR')} m²
              </span>
            ) : null}
          </div>
        </div>
      )}

      {/* Main Watermark Banner */}
      <div
        className={`absolute z-30 pointer-events-none transition-all duration-300 max-w-[calc(100%-1.5rem)] sm:max-w-[360px] ${
          positionClasses[config.position] || positionClasses['bottom-right']
        }`}
        style={{
          opacity: config.opacity ?? 0.85,
          transform: userScale !== 1 ? `scale(${userScale})` : undefined,
          transformOrigin: getTransformOrigin(config.position),
        }}
      >
        <div className="flex flex-col gap-2 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-slate-950/90 backdrop-blur-xl border border-white/15 shadow-2xl shadow-black/90 text-white select-none">
          
          {/* Top bar: Logo & Company / Brand Name */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {config.logoUrl ? (
              <img
                src={config.logoUrl}
                alt="Firma Logo"
                className="w-9 h-9 sm:w-11 sm:h-11 object-contain rounded-xl bg-white/10 p-1 border border-white/10 shrink-0 shadow"
              />
            ) : (
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-sky-500/30 to-blue-600/30 border border-sky-400/40 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-sky-400" />
              </div>
            )}

            <div className="flex flex-col overflow-hidden min-w-0">
              <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold text-sky-400 truncate">
                {config.companyName || 'İzgören Emlak Yatırım Danışmanlık'}
              </span>
              {/* Location: İl / İlçe / Mahalle */}
              <div className="flex items-center gap-1 text-white font-bold text-xs sm:text-sm tracking-tight truncate">
                <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="truncate">{locationTitle}</span>
              </div>
            </div>
          </div>

          {/* Parcel Info & Price Row */}
          <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-white/10 text-[11px] sm:text-xs">
            {/* Ada / Parsel (Inside Mode) */}
            {config.adaParselPosition === 'inside' && adaParselDisplay ? (
              <div className="flex items-center gap-1.5 px-2 py-0.5 sm:py-1 rounded-md bg-white/10 border border-white/10 font-mono text-[10px] sm:text-[11px] text-amber-300 truncate">
                <span className="font-semibold">{adaParselDisplay}</span>
              </div>
            ) : (
              activeParcel?.areaM2 ? (
                <div className="text-[11px] font-mono text-slate-300 font-medium">
                  Alan: <span className="text-white font-bold">{activeParcel.areaM2.toLocaleString('tr-TR')} m²</span>
                </div>
              ) : <div />
            )}

            {/* Price Tag */}
            {(config.priceTag || activeParcel?.price) && (
              <div className="flex items-center gap-1 px-2 py-0.5 sm:py-1 rounded-md bg-emerald-500/20 border border-emerald-400/30 font-semibold text-[10px] sm:text-[11px] text-emerald-300 shrink-0 ml-auto">
                <Tag className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-400 shrink-0" />
                <span>{config.priceTag || activeParcel?.price}</span>
              </div>
            )}
          </div>

          {/* Description or Quality Tag if available */}
          {activeParcel?.description && (
            <div className="text-[10px] text-slate-400 line-clamp-1 border-t border-white/5 pt-1">
              {activeParcel.description}
            </div>
          )}

          {/* Contact Info: Phone & Web */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10 text-[10px] sm:text-xs text-slate-300">
            <div className="flex items-center gap-1 font-medium truncate">
              <Phone className="w-3 h-3 text-sky-400 shrink-0" />
              <span className="truncate">{config.phone || '0532 395 02 63'}</span>
            </div>
            <div className="flex items-center gap-1 text-slate-300 truncate font-mono text-[10px] sm:text-[11px]">
              <Globe className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-sky-400 shrink-0" />
              <span className="truncate">{config.web || 'www.izgorenemlak.com'}</span>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};
