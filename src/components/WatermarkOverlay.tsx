import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Phone,
  Globe,
  Building2,
  MapPin,
  Tag,
  GripHorizontal,
  Plus,
  Minus,
  RotateCcw,
  Maximize2,
} from 'lucide-react';
import { WatermarkConfig, ParcelInfo } from '../types';

interface WatermarkOverlayProps {
  config: WatermarkConfig;
  activeParcel: ParcelInfo | null;
  onUpdateConfig?: (partial: Partial<WatermarkConfig>) => void;
}

export const WatermarkOverlay: React.FC<WatermarkOverlayProps> = ({
  config,
  activeParcel,
  onUpdateConfig,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  // Track window resizing for accurate ratio bounds
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Dragging Logic (Kaydırma) ---
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    initialLeft: number;
    initialTop: number;
  }>({ clientX: 0, clientY: 0, initialLeft: 0, initialTop: 0 });

  const handleDragPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    isDraggingRef.current = true;
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      initialLeft: rect.left,
      initialTop: rect.top,
    };

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handleDragPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !onUpdateConfig) return;

    const card = cardRef.current;
    const cardW = card ? card.offsetWidth : 320;
    const cardH = card ? card.offsetHeight : 140;

    const dx = e.clientX - dragStartRef.current.clientX;
    const dy = e.clientY - dragStartRef.current.clientY;

    const newLeft = Math.max(8, Math.min(windowSize.width - cardW - 8, dragStartRef.current.initialLeft + dx));
    const newTop = Math.max(8, Math.min(windowSize.height - cardH - 8, dragStartRef.current.initialTop + dy));

    const maxAvailX = Math.max(1, windowSize.width - cardW - 16);
    const maxAvailY = Math.max(1, windowSize.height - cardH - 16);

    const xRatio = Math.max(0, Math.min(1, (newLeft - 8) / maxAvailX));
    const yRatio = Math.max(0, Math.min(1, (newTop - 8) / maxAvailY));

    onUpdateConfig({
      customPosition: { xRatio, yRatio },
    });
  };

  const handleDragPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // --- Corner Resize Logic (Büyütme & Küçültme Sürüklemesi) ---
  const isResizingRef = useRef<boolean>(false);
  const resizeStartRef = useRef<{ clientX: number; clientY: number; initialScale: number }>({
    clientX: 0,
    clientY: 0,
    initialScale: 1.0,
  });

  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    isResizingRef.current = true;
    resizeStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      initialScale: typeof config.scale === 'number' && config.scale > 0 ? config.scale : 1.0,
    };
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handleResizePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizingRef.current || !onUpdateConfig) return;
    const dx = e.clientX - resizeStartRef.current.clientX;
    const dy = e.clientY - resizeStartRef.current.clientY;
    // Diagonal distance determines scale change
    const delta = (dx + dy) / 220;
    const newScale = Math.max(0.4, Math.min(2.5, Number((resizeStartRef.current.initialScale + delta).toFixed(2))));
    onUpdateConfig({ scale: newScale });
  };

  const handleResizePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isResizingRef.current) {
      isResizingRef.current = false;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Scale buttons step handlers (+ and -)
  const handleScaleStep = useCallback(
    (step: number) => {
      if (!onUpdateConfig) return;
      const current = typeof config.scale === 'number' && config.scale > 0 ? config.scale : 1.0;
      const updated = Math.max(0.4, Math.min(2.5, Number((current + step).toFixed(2))));
      onUpdateConfig({ scale: updated });
    },
    [config.scale, onUpdateConfig]
  );

  const handleResetPositionAndScale = useCallback(() => {
    if (!onUpdateConfig) return;
    onUpdateConfig({ customPosition: null, scale: 1.0 });
  }, [onUpdateConfig]);

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
    if (config.customPosition) return 'top left';
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

  // Compute custom position style if user has dragged the watermark
  const customStyle: React.CSSProperties = {
    opacity: config.opacity ?? 0.85,
    transform: userScale !== 1 ? `scale(${userScale})` : undefined,
    transformOrigin: getTransformOrigin(config.position),
  };

  if (config.customPosition && typeof config.customPosition.xRatio === 'number') {
    const cardW = 320 * userScale;
    const cardH = 140 * userScale;
    const maxAvailX = Math.max(1, windowSize.width - cardW - 16);
    const maxAvailY = Math.max(1, windowSize.height - cardH - 16);
    const leftPx = 8 + config.customPosition.xRatio * maxAvailX;
    const topPx = 8 + config.customPosition.yRatio * maxAvailY;

    customStyle.left = `${leftPx}px`;
    customStyle.top = `${topPx}px`;
    customStyle.bottom = 'auto';
    customStyle.right = 'auto';
  }

  const isCustomModified = !!config.customPosition || userScale !== 1.0;

  return (
    <>
      {/* Separate Floating Ada/Parsel Badge if configured */}
      {config.adaParselPosition !== 'inside' && adaParselDisplay && (
        <div
          className={`absolute z-30 pointer-events-none transition-all duration-300 scale-90 sm:scale-95 md:scale-100 ${
            separateBadgePositions[config.adaParselPosition] || 'top-3 left-3 sm:top-6 sm:left-6'
          }`}
          style={{
            opacity: config.opacity ?? 0.85,
            transform: userScale !== 1 ? `scale(${userScale})` : undefined,
            transformOrigin: config.adaParselPosition?.includes('right') ? 'top right' : 'top left',
          }}
        >
          <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-slate-950/90 backdrop-blur-xl border border-amber-400/40 shadow-2xl shadow-black text-amber-300 font-mono text-[11px] sm:text-xs select-none">
            <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 shrink-0" />
            <span className="font-bold tracking-wide">{adaParselDisplay}</span>
            {activeParcel?.areaM2 ? (
              <span className="text-[9px] sm:text-[10px] text-white/70 border-l border-white/20 pl-1.5 sm:pl-2">
                {activeParcel.areaM2.toLocaleString('tr-TR')} m²
              </span>
            ) : null}
          </div>
        </div>
      )}

      {/* Main Watermark Banner (Serbestçe Sürüklenebilir & Büyütülebilir) */}
      <div
        ref={cardRef}
        className={`absolute z-30 transition-shadow duration-200 max-w-[calc(100%-1rem)] sm:max-w-[340px] pointer-events-auto select-none group/watermark ${
          config.customPosition ? '' : positionClasses[config.position] || positionClasses['bottom-right']
        }`}
        style={customStyle}
      >
        <div className="relative flex flex-col gap-1.5 p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-slate-950/92 backdrop-blur-xl border border-white/20 shadow-2xl shadow-black/95 text-white">
          
          {/* Top Bar: Sürükleme (Kaydırma) Tutamacı ve Büyütme/Küçültme Araçları */}
          <div className="flex items-center justify-between gap-1.5 pb-1 border-b border-white/10">
            {/* Sürükleme Tutamacı */}
            <div
              onPointerDown={handleDragPointerDown}
              onPointerMove={handleDragPointerMove}
              onPointerUp={handleDragPointerUp}
              onPointerCancel={handleDragPointerUp}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white cursor-grab active:cursor-grabbing transition-colors text-[9px] font-semibold tracking-wider uppercase select-none"
              title="Filigranı Ekranda İstediğin Yere Sürükle & Kaydır"
            >
              <GripHorizontal className="w-3 h-3 text-sky-400" />
              <span>KAYDIR</span>
            </div>

            {/* Büyütme / Küçültme Kontrolleri */}
            <div className="flex items-center gap-1">
              {/* Küçült (-) Butonu */}
              <button
                type="button"
                onClick={() => handleScaleStep(-0.1)}
                className="w-5 h-5 flex items-center justify-center rounded bg-white/5 hover:bg-sky-500/20 active:bg-sky-500/40 text-slate-300 hover:text-sky-300 border border-white/10 transition cursor-pointer"
                title="Filigranı Küçült (-%10)"
              >
                <Minus className="w-2.5 h-2.5" />
              </button>

              {/* Ölçek Yüzdesi */}
              <span className="text-[9px] font-mono font-bold px-1 text-sky-400 bg-sky-500/10 rounded border border-sky-400/20">
                %{Math.round(userScale * 100)}
              </span>

              {/* Büyüt (+) Butonu */}
              <button
                type="button"
                onClick={() => handleScaleStep(0.1)}
                className="w-5 h-5 flex items-center justify-center rounded bg-white/5 hover:bg-sky-500/20 active:bg-sky-500/40 text-slate-300 hover:text-sky-300 border border-white/10 transition cursor-pointer"
                title="Filigranı Büyüt (+%10)"
              >
                <Plus className="w-2.5 h-2.5" />
              </button>

              {/* Sıfırla Butonu (Sürükleme veya boyut değişmişse görünür) */}
              {isCustomModified && (
                <button
                  type="button"
                  onClick={handleResetPositionAndScale}
                  className="w-5 h-5 flex items-center justify-center rounded bg-white/5 hover:bg-amber-500/20 text-slate-400 hover:text-amber-300 border border-white/10 transition cursor-pointer ml-0.5"
                  title="Varsayılan Boyut ve Konuma Sıfırla"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          </div>

          {/* Logo & Company / Brand Name */}
          <div className="flex items-center gap-2 sm:gap-2.5 pt-0.5">
            {config.logoUrl ? (
              <img
                src={config.logoUrl}
                alt="Firma Logo"
                className="w-8 h-8 sm:w-10 sm:h-10 object-contain rounded-xl bg-white/10 p-0.5 border border-white/10 shrink-0 shadow"
              />
            ) : (
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-sky-500/30 to-blue-600/30 border border-sky-400/40 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-sky-400" />
              </div>
            )}

            <div className="flex flex-col overflow-hidden min-w-0">
              <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold text-sky-400 truncate">
                {config.companyName || 'İzgören Emlak Yatırım Danışmanlık'}
              </span>
              {/* Location: İl / İlçe / Mahalle */}
              <div className="flex items-center gap-1 text-white font-bold text-xs sm:text-sm tracking-tight truncate">
                <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                <span className="truncate">{locationTitle}</span>
              </div>
            </div>
          </div>

          {/* Parcel Info & Price Row */}
          <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-white/10 text-[11px] sm:text-xs">
            {/* Ada / Parsel (Inside Mode) */}
            {config.adaParselPosition === 'inside' && adaParselDisplay ? (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/10 border border-white/10 font-mono text-[10px] sm:text-[11px] text-amber-300 truncate">
                <span className="font-semibold">{adaParselDisplay}</span>
              </div>
            ) : activeParcel?.areaM2 ? (
              <div className="text-[11px] font-mono text-slate-300 font-medium">
                Alan: <span className="text-white font-bold">{activeParcel.areaM2.toLocaleString('tr-TR')} m²</span>
              </div>
            ) : (
              <div />
            )}

            {/* Price Tag */}
            {(config.priceTag || activeParcel?.price) && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/30 font-semibold text-[10px] sm:text-[11px] text-emerald-300 shrink-0 ml-auto">
                <Tag className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                <span>{config.priceTag || activeParcel?.price}</span>
              </div>
            )}
          </div>

          {/* Description or Quality Tag if available */}
          {activeParcel?.description && (
            <div className="text-[10px] text-slate-400 line-clamp-1 border-t border-white/5 pt-0.5">
              {activeParcel.description}
            </div>
          )}

          {/* Contact Info: Phone & Web */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10 text-[10px] sm:text-xs text-slate-300">
            <div className="flex items-center gap-1 font-medium truncate">
              <Phone className="w-2.5 h-2.5 text-sky-400 shrink-0" />
              <span className="truncate">{config.phone || '0532 395 02 63'}</span>
            </div>
            <div className="flex items-center gap-1 text-slate-300 truncate font-mono text-[10px] sm:text-[11px]">
              <Globe className="w-2.5 h-2.5 text-sky-400 shrink-0" />
              <span className="truncate">{config.web || 'www.izgorenemlak.com'}</span>
            </div>
          </div>

          {/* Köşe Boyutlandırma Tutamacı (Sağ Alt - Sürükleyerek Büyütme/Küçültme) */}
          <div
            onPointerDown={handleResizePointerDown}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            onPointerCancel={handleResizePointerUp}
            className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-900 border border-sky-400/80 shadow-md flex items-center justify-center text-sky-400 cursor-nwse-resize hover:bg-sky-500 hover:text-slate-950 transition-all opacity-70 hover:opacity-100 group-hover/watermark:opacity-100 z-10"
            title="Köşeden Çekerek Büyüt veya Küçült"
          >
            <Maximize2 className="w-2.5 h-2.5 rotate-90" />
          </div>

        </div>
      </div>
    </>
  );
};
