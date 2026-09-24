import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  BaseMapType,
  CameraState,
  ParcelInfo,
  ParcelStyle,
  VideoFormatType,
  WatermarkConfig,
} from '../types';
import {
  Mountain,
  Eye,
  EyeOff,
  LocateFixed,
  MapPin,
  Crosshair,
  Sparkles,
  Compass,
  PenTool,
  Plus,
  Minus,
  Camera,
  Rotate3d,
  RotateCw,
  Video,
  Square,
  GripVertical,
} from 'lucide-react';
import {
  getDeviceOptimizationProfile,
  DeviceOptimizationProfile,
} from '../utils/deviceOptimizer';

declare const Cesium: any;

interface CesiumViewerProps {
  baseMap: BaseMapType;
  videoFormat: VideoFormatType;
  cameraState: CameraState;
  onCameraChange: (partial: Partial<CameraState>) => void;
  activeParcel: ParcelInfo | null;
  parcelStyle: ParcelStyle;
  watermarkConfig: WatermarkConfig;
  isTerrainActive: boolean;
  onToggleTerrain: () => void;
  onViewerReady?: (methods: ViewerMethods) => void;
  screenHeightPercent?: number;
  showMapControls?: boolean;
  children?: React.ReactNode;
}

export interface ViewerMethods {
  takeSnapshot: () => void;
  startVideoRecording: () => Promise<boolean>;
  stopVideoRecording: () => void;
  isRecording: boolean;
  flyToParcel: (targetPitch?: number, targetHeading?: number) => void;
  flyToDeviceLocation: () => void;
  resetToNorth?: () => void;
  set2DView: () => void;
  set3DView: () => void;
  zoomIn?: () => void;
  zoomOut?: () => void;
  toggleTour?: () => void;
  toggle2DTour?: () => void;
  toggle3DTour?: () => void;
  toggleVideoRecording?: () => void;
}

// 2D Canvas Watermark Renderer for Video & Snapshot (Proportionally scaled to recording dimensions)
function renderWatermarkToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: WatermarkConfig,
  parcel: ParcelInfo | null,
  logoImg: HTMLImageElement | null
) {
  if (!config.visible) return;

  // Proportional watermark scaling according to recording / video dimensions & user watermark scale
  const isPortrait = height > width;
  const baseDim = isPortrait ? width : Math.min(width, height);
  const userScale = typeof config.scale === 'number' && config.scale > 0 ? config.scale : 1.0;
  // 1080p base scale factor with user custom scaling
  const scale = Math.max(0.4, Math.min(3.5, (baseDim / 950) * userScale));
  const cardW = Math.min(345 * scale, width - 24 * scale);
  const cardH = 136 * scale;
  const margin = Math.max(10, 18 * scale);
  const opacity = config.opacity ?? 0.85;

  let cardX = width - cardW - margin;
  let cardY = height - cardH - margin;

  if (config.customPosition && typeof config.customPosition.xRatio === 'number') {
    const maxAvailW = Math.max(1, width - cardW - margin * 2);
    const maxAvailH = Math.max(1, height - cardH - margin * 2);
    cardX = margin + config.customPosition.xRatio * maxAvailW;
    cardY = margin + config.customPosition.yRatio * maxAvailH;
  } else {
    switch (config.position) {
      case 'bottom-left':
        cardX = margin;
        cardY = height - cardH - margin;
        break;
      case 'bottom-center':
        cardX = (width - cardW) / 2;
        cardY = height - cardH - margin;
        break;
      case 'top-left':
        cardX = margin;
        cardY = margin;
        break;
      case 'top-right':
        cardX = width - cardW - margin;
        cardY = margin;
        break;
      case 'top-center':
        cardX = (width - cardW) / 2;
        cardY = margin;
        break;
      case 'bottom-right':
      default:
        cardX = width - cardW - margin;
        cardY = height - cardH - margin;
        break;
    }
  }

  // Location display string
  const locParts = [parcel?.city, parcel?.district, parcel?.neighborhood].filter(Boolean);
  const locationTitle = locParts.length > 0 ? locParts.join(' / ') : '3D Küresel Uydu Haritası';

  // Ada / Parsel display string
  let adaParselText = '';
  if (config.adaParselText) {
    adaParselText = config.adaParselText;
  } else if (parcel?.adaNo || parcel?.parselNo) {
    const adaStr = parcel.adaNo ? `Ada: ${parcel.adaNo}` : '';
    const parselStr = parcel.parselNo ? `Parsel: ${parcel.parselNo}` : '';
    adaParselText = [adaStr, parselStr].filter(Boolean).join(' / ');
  }

  // Draw Separate Ada/Parsel Badge if not inside
  if (config.adaParselPosition && config.adaParselPosition !== 'inside' && adaParselText) {
    const badgeW = Math.min(200 * scale, width - 24 * scale);
    const badgeH = 34 * scale;
    let bX = margin;
    let bY = margin;

    switch (config.adaParselPosition) {
      case 'top-right':
        bX = width - badgeW - margin;
        bY = margin;
        break;
      case 'bottom-left':
        bX = margin;
        bY = height - badgeH - margin;
        break;
      case 'bottom-right':
        bX = width - badgeW - margin;
        bY = height - badgeH - margin;
        break;
      case 'top-left':
      default:
        bX = margin;
        bY = margin;
        break;
    }

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = 'rgba(2, 6, 23, 0.92)';
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.roundRect(bX, bY, badgeW, badgeH, 10 * scale);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.font = `bold ${12 * scale}px "Plus Jakarta Sans", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`📍 ${adaParselText}`, bX + badgeW / 2, bY + badgeH / 2);
    ctx.restore();
  }

  // Draw Main Watermark Card
  ctx.save();
  ctx.globalAlpha = opacity;

  // Background Box
  ctx.fillStyle = 'rgba(2, 6, 23, 0.92)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 16 * scale);
  ctx.fill();
  ctx.stroke();

  // Subtle top highlight line inside card
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
  ctx.lineWidth = 1 * scale;
  ctx.beginPath();
  ctx.moveTo(cardX + 16 * scale, cardY + 1);
  ctx.lineTo(cardX + cardW - 16 * scale, cardY + 1);
  ctx.stroke();

  // Logo or Logo Icon Box
  const logoSize = 36 * scale;
  const logoX = cardX + 12 * scale;
  const logoY = cardY + 12 * scale;

  if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(logoX, logoY, logoSize, logoSize, 8 * scale);
    ctx.clip();
    ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
    ctx.restore();
  } else {
    ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
    ctx.lineWidth = 1 * scale;
    ctx.beginPath();
    ctx.roundRect(logoX, logoY, logoSize, logoSize, 8 * scale);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = `bold ${16 * scale}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🏛️', logoX + logoSize / 2, logoY + logoSize / 2);
  }

  // Company Name
  const textLeft = logoX + logoSize + 10 * scale;
  const companyName = config.companyName || 'İzgören Emlak Yatırım Danışmanlık';
  ctx.fillStyle = '#38bdf8';
  ctx.font = `bold ${11 * scale}px "Plus Jakarta Sans", system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(companyName.toUpperCase(), textLeft, cardY + 13 * scale);

  // Location Title
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${13 * scale}px "Plus Jakarta Sans", system-ui, sans-serif`;
  ctx.fillText(`📍 ${locationTitle}`, textLeft, cardY + 28 * scale);

  // Divider Line 1
  const divY1 = cardY + 54 * scale;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1 * scale;
  ctx.beginPath();
  ctx.moveTo(cardX + 12 * scale, divY1);
  ctx.lineTo(cardX + cardW - 12 * scale, divY1);
  ctx.stroke();

  // Middle Row: Ada/Parsel & Price & Area
  const midY = divY1 + 6 * scale;

  if (config.adaParselPosition === 'inside' && adaParselText) {
    // Amber Ada/Parsel Pill
    ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
    ctx.lineWidth = 1 * scale;
    ctx.beginPath();
    ctx.roundRect(cardX + 12 * scale, midY, 140 * scale, 22 * scale, 6 * scale);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.font = `bold ${10 * scale}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(adaParselText, cardX + 12 * scale + 70 * scale, midY + 11 * scale);
  } else if (parcel?.areaM2) {
    ctx.fillStyle = '#cbd5e1';
    ctx.font = `500 ${11 * scale}px monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Alan: ${parcel.areaM2.toLocaleString('tr-TR')} m²`, cardX + 12 * scale, midY + 11 * scale);
  }

  // Price Tag on Right
  const price = config.priceTag || parcel?.price;
  if (price) {
    const pW = Math.min(120 * scale, cardW * 0.4);
    const pX = cardX + cardW - pW - 12 * scale;
    ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
    ctx.lineWidth = 1 * scale;
    ctx.beginPath();
    ctx.roundRect(pX, midY, pW, 22 * scale, 6 * scale);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#34d399';
    ctx.font = `bold ${11 * scale}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`🏷️ ${price}`, pX + pW / 2, midY + 11 * scale);
  }

  // Divider Line 2
  const divY2 = cardY + 88 * scale;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.beginPath();
  ctx.moveTo(cardX + 12 * scale, divY2);
  ctx.lineTo(cardX + cardW - 12 * scale, divY2);
  ctx.stroke();

  // Footer Row: Phone & Web
  const phone = config.phone || '0532 395 02 63';
  const web = config.web || 'www.izgorenemlak.com';

  ctx.fillStyle = '#e2e8f0';
  ctx.font = `600 ${11 * scale}px "Plus Jakarta Sans", monospace`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`📞 ${phone}`, cardX + 14 * scale, cardY + 108 * scale);

  ctx.fillStyle = '#94a3b8';
  ctx.font = `500 ${10 * scale}px monospace`;
  ctx.textAlign = 'right';
  ctx.fillText(`🌐 ${web}`, cardX + cardW - 14 * scale, cardY + 108 * scale);

  ctx.restore();
}

// Smoothly samples points along a polygon perimeter between startFraction and endFraction (0..1)
function getSmoothPerimeterWaterFlow(
  coords: { lng: number; lat: number; alt?: number }[],
  startFrac: number,
  endFrac: number,
  sampleCount: number = 36
): any[] {
  if (coords.length < 2 || typeof Cesium === 'undefined') return [];

  // Ensure closed loop
  const isClosed =
    Math.abs(coords[0].lng - coords[coords.length - 1].lng) < 1e-6 &&
    Math.abs(coords[0].lat - coords[coords.length - 1].lat) < 1e-6;
  const loopCoords = isClosed ? coords : [...coords, coords[0]];

  // Calculate cumulative segment distances in degrees
  let totalLen = 0;
  const segLens: number[] = [];
  for (let i = 0; i < loopCoords.length - 1; i++) {
    const p1 = loopCoords[i];
    const p2 = loopCoords[i + 1];
    const avgLat = ((p1.lat + p2.lat) * Math.PI) / 360;
    const dx = (p2.lng - p1.lng) * Math.cos(avgLat);
    const dy = p2.lat - p1.lat;
    const d = Math.hypot(dx, dy);
    segLens.push(d);
    totalLen += d;
  }

  if (totalLen <= 0) return [];

  const getPositionAt = (fraction: number) => {
    fraction = ((fraction % 1) + 1) % 1;
    const target = fraction * totalLen;
    let acc = 0;
    for (let i = 0; i < segLens.length; i++) {
      const len = segLens[i];
      if (acc + len >= target || i === segLens.length - 1) {
        const segT = len > 0 ? Math.max(0, Math.min(1, (target - acc) / len)) : 0;
        const p1 = loopCoords[i];
        const p2 = loopCoords[i + 1];
        const lng = p1.lng + segT * (p2.lng - p1.lng);
        const lat = p1.lat + segT * (p2.lat - p1.lat);
        const alt = (p1.alt || 0) + segT * ((p2.alt || 0) - (p1.alt || 0));
        return Cesium.Cartesian3.fromDegrees(lng, lat, alt);
      }
      acc += len;
    }
    return Cesium.Cartesian3.fromDegrees(loopCoords[0].lng, loopCoords[0].lat, loopCoords[0].alt || 0);
  };

  const points: any[] = [];
  startFrac = ((startFrac % 1) + 1) % 1;
  endFrac = ((endFrac % 1) + 1) % 1;
  const span = endFrac >= startFrac ? endFrac - startFrac : 1 - startFrac + endFrac;

  for (let i = 0; i <= sampleCount; i++) {
    const f = (startFrac + (i / sampleCount) * span) % 1;
    points.push(getPositionAt(f));
  }
  return points;
}

export const CesiumViewer: React.FC<CesiumViewerProps> = ({
  baseMap,
  videoFormat,
  cameraState,
  onCameraChange,
  activeParcel,
  parcelStyle,
  watermarkConfig,
  isTerrainActive,
  onToggleTerrain,
  onViewerReady,
  screenHeightPercent = 100,
  showMapControls = true,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const currentLayerRef = useRef<any>(null);
  const terrainProviderRef = useRef<any>(null);
  const parcelEntitiesRef = useRef<any[]>([]);
  const parcelCenterRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const isTouringRef = useRef<boolean>(cameraState.isTouring);
  const tourModeRef = useRef<'2d' | '3d'>(cameraState.tourMode || '3d');
  const tourSpeedRef = useRef<number>(cameraState.tourSpeed);
  const headingRef = useRef<number>(cameraState.heading);
  const pitchRef = useRef<number>(cameraState.pitch);
  const rangeRef = useRef<number>(cameraState.range);
  const isRecordingRef = useRef<boolean>(false);
  const logoImageRef = useRef<HTMLImageElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const isFlyingRef = useRef<boolean>(false);

  // Synchronized refs to decouple metadata updates (watermark) from 3D map engine lifecycle
  const activeParcelRef = useRef<ParcelInfo | null>(activeParcel);
  const watermarkConfigRef = useRef<WatermarkConfig>(watermarkConfig);
  const onCameraChangeRef = useRef(onCameraChange);
  const baseMapRef = useRef<BaseMapType>(baseMap);
  const isTerrainActiveRef = useRef<boolean>(isTerrainActive);
  const isPenToolRef = useRef<boolean>(!!parcelStyle.penTool);
  const lastRenderedCoordsKeyRef = useRef<string>('');

  useEffect(() => {
    isPenToolRef.current = !!parcelStyle.penTool;
    if (viewerRef.current && !viewerRef.current.isDestroyed()) {
      viewerRef.current.scene.requestRender();
    }
  }, [parcelStyle.penTool]);

  useEffect(() => {
    activeParcelRef.current = activeParcel;
  }, [activeParcel]);

  useEffect(() => {
    watermarkConfigRef.current = watermarkConfig;
  }, [watermarkConfig]);

  useEffect(() => {
    onCameraChangeRef.current = onCameraChange;
  }, [onCameraChange]);

  useEffect(() => {
    baseMapRef.current = baseMap;
  }, [baseMap]);

  useEffect(() => {
    isTerrainActiveRef.current = isTerrainActive;
  }, [isTerrainActive]);

  // Cihaz Hız & Performans Profili (Telefon, Tablet, PC için otomatik hız ayarı)
  const [deviceProfile, setDeviceProfile] = useState<DeviceOptimizationProfile>(() =>
    getDeviceOptimizationProfile()
  );
  const deviceProfileRef = useRef<DeviceOptimizationProfile>(deviceProfile);

  useEffect(() => {
    deviceProfileRef.current = deviceProfile;
  }, [deviceProfile]);

  useEffect(() => {
    const handleResize = () => {
      const nextProfile = getDeviceOptimizationProfile();
      setDeviceProfile(nextProfile);
      deviceProfileRef.current = nextProfile;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [isCesiumReady, setIsCesiumReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [showGpsToast, setShowGpsToast] = useState(false);
  const [gpsToastMessage, setGpsToastMessage] = useState('📍 Konumunuz Algılandı');
  const deviceLocationCoordsRef = useRef<{ lng: number; lat: number } | null>(null);
  const userLocationEntityRef = useRef<any>(null);

  // Helper to place/update current user location marker pin on Cesium globe
  const updateUserLocationMarker = useCallback((lng: number, lat: number, label = 'Mevcut Konumunuz') => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed() || typeof Cesium === 'undefined') return;

    if (userLocationEntityRef.current) {
      viewer.entities.remove(userLocationEntityRef.current);
      userLocationEntityRef.current = null;
    }

    userLocationEntityRef.current = viewer.entities.add({
      name: label,
      position: Cesium.Cartesian3.fromDegrees(lng, lat, 2),
      point: {
        pixelSize: 15,
        color: Cesium.Color.fromCssColorString('#009EB5'),
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 3,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: `📍 ${label}`,
        font: 'bold 12px "Plus Jakarta Sans", system-ui, sans-serif',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.fromCssColorString('#020617'),
        outlineWidth: 4,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -16),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
  }, []);

  // Update Camera
  const updateCameraView = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer || typeof Cesium === 'undefined' || isFlyingRef.current) return;

    let targetCenter = parcelCenterRef.current;
    if (!targetCenter && activeParcelRef.current?.coordinates?.length) {
      const coords = activeParcelRef.current.coordinates;
      let sLng = 0;
      let sLat = 0;
      coords.forEach((c) => {
        sLng += c.lng;
        sLat += c.lat;
      });
      targetCenter = Cesium.Cartesian3.fromDegrees(sLng / coords.length, sLat / coords.length, 0);
      parcelCenterRef.current = targetCenter;
    }

    if (!targetCenter) return;

    try {
      viewer.camera.lookAt(
        targetCenter,
        new Cesium.HeadingPitchRange(
          Cesium.Math.toRadians(headingRef.current),
          Cesium.Math.toRadians(pitchRef.current),
          rangeRef.current
        )
      );
      // Unlock camera transform unless continuous tour is actively orbiting
      if (!isTouringRef.current) {
        viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
      }
    } catch (e) {
      console.warn('Camera update warning:', e);
    }
  }, []);

  // Sync refs
  useEffect(() => {
    isTouringRef.current = cameraState.isTouring;
    tourModeRef.current = cameraState.tourMode || '3d';
    if (cameraState.isTouring) {
      if (cameraState.tourMode === '2d') {
        // 2D Kuşbakışı Tur: Tam tepeden bakış açısı (-89.9° Cesium gimbal lock önler)
        pitchRef.current = -89.9;
        onCameraChangeRef.current({ pitch: -89.9, viewMode: '2d' });
      } else {
        // 3D Perspektif Tur: Eğer kuşbakışındaysa perspektif açısına (-38°) eğ
        if (pitchRef.current < -65) {
          pitchRef.current = -38;
          onCameraChangeRef.current({ pitch: -38, viewMode: '3d' });
        }
      }
      updateCameraView();
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.scene.requestRender();
      }
    } else if (viewerRef.current && typeof Cesium !== 'undefined') {
      try {
        viewerRef.current.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
      } catch (e) {}
      // User request: "3d pasif aktif ise kml sınırları tamamen ekrana ortala"
      if (activeParcelRef.current && activeParcelRef.current.coordinates && activeParcelRef.current.coordinates.length >= 3) {
        setTimeout(() => {
          centerOnParcel(deviceProfileRef.current.flyDuration);
        }, 60);
      }
    }
  }, [cameraState.isTouring, cameraState.tourMode, updateCameraView]);

  useEffect(() => {
    tourSpeedRef.current = cameraState.tourSpeed;
  }, [cameraState.tourSpeed]);

  useEffect(() => {
    headingRef.current = cameraState.heading;
    pitchRef.current = cameraState.pitch;
    rangeRef.current = cameraState.range;
  }, [cameraState.heading, cameraState.pitch, cameraState.range]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Pre-load custom watermark logo if given
  useEffect(() => {
    if (watermarkConfig.logoUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        logoImageRef.current = img;
      };
      img.src = watermarkConfig.logoUrl;
    } else {
      logoImageRef.current = null;
    }
  }, [watermarkConfig.logoUrl]);

  // Provider selector (Google & Esri with WebMercator tiling scheme for crisp tile loading)
  const getProvider = useCallback((type: BaseMapType) => {
    if (typeof Cesium === 'undefined') return null;

    try {
      if (type === 'google_satellite') {
        const p = new Cesium.UrlTemplateImageryProvider({
          url: 'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
          subdomains: ['0', '1', '2', '3'],
          tilingScheme: new Cesium.WebMercatorTilingScheme(),
          maximumLevel: 21,
          credit: 'Google Saf Uydu',
        });
        p.errorEvent?.addEventListener((err: any) => console.warn('Google Satellite tile error:', err));
        return p;
      }

      if (type === 'esri_satellite') {
        const p = new Cesium.UrlTemplateImageryProvider({
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          tilingScheme: new Cesium.WebMercatorTilingScheme(),
          maximumLevel: 19,
          credit: 'Esri World Imagery',
        });
        p.errorEvent?.addEventListener((err: any) => console.warn('Esri tile error:', err));
        return p;
      }

      // Default: Google Hybrid Satellite + Roads & Kadastro Names (High resolution, Turkish labels)
      const p = new Cesium.UrlTemplateImageryProvider({
        url: 'https://mt{s}.google.com/vt/lyrs=y&hl=tr&x={x}&y={y}&z={z}',
        subdomains: ['0', '1', '2', '3'],
        tilingScheme: new Cesium.WebMercatorTilingScheme(),
        maximumLevel: 21,
        credit: 'Google Hibrit Uydu',
      });
      p.errorEvent?.addEventListener((err: any) => console.warn('Google Hybrid tile error:', err));
      return p;
    } catch (err) {
      console.error('Altlık harita sağlayıcı hatası:', err);
      return new Cesium.UrlTemplateImageryProvider({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        tilingScheme: new Cesium.WebMercatorTilingScheme(),
        maximumLevel: 19,
      });
    }
  }, []);

  // Center camera precisely on the loaded parcel and immediately pre-stream satellite tiles
  // Aspect ratio and FOV aware to guarantee KML boundaries are completely visible and centered on phone, tablet, and PC
  const centerOnParcel = useCallback(
    (
      duration: number = 0.7,
      targetParcelOverride?: ParcelInfo,
      targetPitchOverride?: number,
      targetHeadingOverride?: number
    ) => {
      const viewer = viewerRef.current;
      const targetParcel = targetParcelOverride || activeParcelRef.current || activeParcel;
      if (!viewer || typeof Cesium === 'undefined' || !targetParcel || !targetParcel.coordinates || targetParcel.coordinates.length < 3) return;

      try {
        const coords = targetParcel.coordinates;
        let sumLng = 0;
        let sumLat = 0;
        let minLng = 180;
        let maxLng = -180;
        let minLat = 90;
        let maxLat = -90;

        coords.forEach((c) => {
          sumLng += c.lng;
          sumLat += c.lat;
          if (c.lng < minLng) minLng = c.lng;
          if (c.lng > maxLng) maxLng = c.lng;
          if (c.lat < minLat) minLat = c.lat;
          if (c.lat > maxLat) maxLat = c.lat;
        });

        const centerLng = sumLng / coords.length;
        const centerLat = sumLat / coords.length;

        // Query real terrain elevation if 3D terrain is active
        let terrainHeight = 0;
        if (viewer.scene.globe && isTerrainActiveRef.current) {
          const carto = Cesium.Cartographic.fromDegrees(centerLng, centerLat);
          const globeHeight = viewer.scene.globe.getHeight(carto);
          if (typeof globeHeight === 'number' && !isNaN(globeHeight) && globeHeight > -200) {
            terrainHeight = globeHeight;
          }
        }

        const centerCartesian = Cesium.Cartesian3.fromDegrees(centerLng, centerLat, terrainHeight);
        parcelCenterRef.current = centerCartesian;

        const cartesianPoints = coords.map((c) =>
          Cesium.Cartesian3.fromDegrees(c.lng, c.lat, terrainHeight)
        );
        const boundingSphere = Cesium.BoundingSphere.fromPoints(cartesianPoints);
        const radius = Math.max(boundingSphere.radius || 80, 30);

        // Aspect ratio & viewport aware optimal range:
        // Guarantees all KML boundaries fit completely within the canvas without edge clipping on any screen ratio
        const canvasWidth = viewer.canvas?.clientWidth || window.innerWidth || 800;
        const canvasHeight = viewer.canvas?.clientHeight || window.innerHeight || 600;
        const aspect = Math.max(0.2, canvasWidth / canvasHeight);
        const fovY = viewer.camera?.frustum?.fovy || Cesium.Math.toRadians(60);
        const tanHalfFovY = Math.tan(fovY / 2);
        const tanHalfFovX = tanHalfFovY * aspect;

        // Determine pitch:
        let targetPitchDeg = typeof targetPitchOverride === 'number'
          ? targetPitchOverride
          : (pitchRef.current <= -75 ? -89.0 : pitchRef.current);

        if (targetPitchDeg <= -88) {
          targetPitchDeg = -89.0;
        }

        const isTopDown2D = targetPitchDeg <= -75;

        // Comfortable padding (30% in 2D, 45% in 3D perspective to account for tilt foreshortening)
        const padMultiplier = isTopDown2D ? 1.30 : 1.45;
        const rangeY = (radius * padMultiplier) / tanHalfFovY;
        const rangeX = (radius * padMultiplier) / tanHalfFovX;
        let optimalRange = Math.max(rangeX, rangeY, radius * (isTopDown2D ? 2.2 : 2.7));
        optimalRange = Math.max(120, Math.min(15000, Math.round(optimalRange)));

        rangeRef.current = optimalRange;

        const targetHeadingDeg = typeof targetHeadingOverride === 'number'
          ? targetHeadingOverride
          : (isTopDown2D ? 0 : (headingRef.current || 0));

        headingRef.current = targetHeadingDeg;
        pitchRef.current = targetPitchDeg;

        // Prevent state re-renders from interrupting the smooth camera flight
        isFlyingRef.current = true;

        try {
          viewer.resize();
        } catch (e) {}

        try {
          viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
        } catch (e) {}

        const targetPitchRad = Cesium.Math.toRadians(targetPitchDeg);
        const targetHeadingRad = Cesium.Math.toRadians(targetHeadingDeg);

        try {
          viewer.camera.flyToBoundingSphere(boundingSphere, {
            offset: new Cesium.HeadingPitchRange(
              targetHeadingRad,
              targetPitchRad,
              optimalRange
            ),
            duration: duration,
            complete: () => {
              isFlyingRef.current = false;
              try {
                viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
                if (viewer.camera.positionCartographic) {
                  const actualHeight = Math.round(viewer.camera.positionCartographic.height);
                  rangeRef.current = actualHeight;
                  onCameraChangeRef.current({
                    range: actualHeight,
                    pitch: targetPitchDeg,
                    heading: targetHeadingDeg,
                    viewMode: isTopDown2D ? '2d' : '3d',
                  });
                }
                viewer.scene.requestRender();
              } catch (e) {}
            },
            cancel: () => {
              isFlyingRef.current = false;
            },
          });
        } catch (flyErr) {
          // Fallback: Doğrudan merkez kartesyen koordinatına kuşbakışı uç
          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(
              centerLng,
              centerLat,
              terrainHeight + optimalRange
            ),
            orientation: {
              heading: targetHeadingRad,
              pitch: targetPitchRad,
              roll: 0.0,
            },
            duration: duration,
            complete: () => {
              isFlyingRef.current = false;
              try {
                viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
                onCameraChangeRef.current({
                  pitch: targetPitchDeg,
                  heading: targetHeadingDeg,
                  viewMode: isTopDown2D ? '2d' : '3d',
                });
                viewer.scene.requestRender();
              } catch (e) {}
            },
            cancel: () => {
              isFlyingRef.current = false;
            },
          });
        }
      } catch (e) {
        console.warn('centerOnParcel error:', e);
        isFlyingRef.current = false;
        try {
          viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
        } catch (ignored) {}
      }
    },
    [activeParcel]
  );

  // Initialize Cesium
  useEffect(() => {
    let checkInterval: any = null;

    const tryInitCesium = () => {
      if (typeof Cesium === 'undefined') return false;
      if (!containerRef.current || viewerRef.current) return true;

      // Wait until DOM container has non-zero layout size
      if (containerRef.current.clientWidth < 10 || containerRef.current.clientHeight < 10) {
        return false;
      }

      try {
        // Disable Cesium Ion default token requirement
        Cesium.Ion.defaultAccessToken = '';

        const viewer = new Cesium.Viewer(containerRef.current, {
          sceneMode: Cesium.SceneMode.SCENE3D, // Gerçek 3D Harita Küresi & 3D Sinematik Tur ve Yükseklik Desteği
          baseLayer: false, // Critical: Stops Cesium from trying to fetch Ion Bing Maps without a token
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          animation: false,
          timeline: false,
          fullscreenButton: false,
          vrButton: false,
          infoBox: false,
          selectionIndicator: false,
          useBrowserRecommendedResolution: false, // Critical: Do NOT downsample resolution on retina/mobile screens
          orderIndependentTranslucency: false,
          contextOptions: {
            webgl: {
              preserveDrawingBuffer: true, // Crucial for snapshot and canvas recording
              alpha: false,
              antialias: true,
            },
          },
        });

        // Cihaz türüne (Telefon / Tablet / PC) göre otomatik çözünürlük ve arazi karo hassasiyeti
        const profile = deviceProfileRef.current;
        viewer.resolutionScale = profile.resolutionScale;

        // Ensure touch and gesture controls are active on mobile devices (Android & iOS)
        if (viewer.scene.screenSpaceCameraController) {
          viewer.scene.screenSpaceCameraController.enableRotate = true;
          viewer.scene.screenSpaceCameraController.enableTranslate = true;
          viewer.scene.screenSpaceCameraController.enableZoom = true;
          viewer.scene.screenSpaceCameraController.enableTilt = true;
          viewer.scene.screenSpaceCameraController.enableLook = true;
        }

        // Add user-selected Imagery Basemap Layer
        const initialProvider = getProvider(baseMap);
        if (initialProvider) {
          currentLayerRef.current = viewer.imageryLayers.addImageryProvider(initialProvider);
        }

        // Optimize visual scene & Maximize imagery clarity on flat map
        viewer.scene.globe.show = true;
        viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#0f172a');
        viewer.scene.globe.depthTestAgainstTerrain = false;
        viewer.scene.globe.enableLighting = false; // Prevents pitch black night side shadow
        if (viewer.scene.skyAtmosphere) {
          viewer.scene.skyAtmosphere.show = false;
        }
        viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#020617');

        // Cihaza göre dinamik karo yükleme hızı ve bellek optimizasyonu (Akıcı 60 FPS)
        viewer.scene.globe.maximumScreenSpaceError = profile.maximumScreenSpaceError;
        viewer.scene.globe.tileCacheSize = profile.tier === 'phone' ? 200 : profile.tier === 'tablet' ? 280 : 380;
        viewer.scene.globe.loadingDescendantLimit = profile.tier === 'phone' ? 16 : 24;
        viewer.scene.globe.preloadAncestors = true;
        viewer.scene.globe.preloadSiblings = false; // Prevents bandwidth contention

        // Set initial camera view to display flat satellite map over Turkey / region
        const initialMapCenter = Cesium.Cartesian3.fromDegrees(35.0, 39.0, 0);
        parcelCenterRef.current = initialMapCenter;

        try {
          viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
        } catch (e) {}

        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(35.0, 39.0, 950000),
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-89.5),
            roll: 0,
          },
        });

        // Setup clock tick listener for continuous cinematic 3D tour (Throttled React notification & delta-time for buttery 60fps)
        let lastHeadingNotification = 0;
        let lastFrameTime = performance.now();
        const onTick = () => {
          const now = performance.now();
          const dt = Math.min((now - lastFrameTime) / 1000, 0.1); // clamped delta time
          lastFrameTime = now;

          if (isTouringRef.current) {
            if (!parcelCenterRef.current && activeParcelRef.current?.coordinates?.length) {
              const coords = activeParcelRef.current.coordinates;
              let sLng = 0;
              let sLat = 0;
              coords.forEach((c) => {
                sLng += c.lng;
                sLat += c.lat;
              });
              parcelCenterRef.current = Cesium.Cartesian3.fromDegrees(sLng / coords.length, sLat / coords.length, 0);
            }

            if (parcelCenterRef.current) {
              const currentProf = deviceProfileRef.current;
              const baseSpeed = tourSpeedRef.current || currentProf.tourSpeed;
              // 60 FPS referanslı delta-time adımı: 60Hz, 90Hz ve 120Hz ekranlarda kasıntısız sabit hız
              const headingStep = baseSpeed * (dt * 60);
              const nextHeading = (headingRef.current + headingStep) % 360;
              headingRef.current = nextHeading;

              // 2D veya 3D Tur moduna göre pitch açısını koru
              if (tourModeRef.current === '2d') {
                pitchRef.current = -89.9;
              } else {
                if (pitchRef.current < -65) {
                  pitchRef.current = -38;
                }
              }

              updateCameraView();

              if (viewer && !viewer.isDestroyed()) {
                viewer.scene.requestRender();
              }

              // Cihaz profilinin throttle frekansına göre React state güncelle (UI lag önleme)
              if (now - lastHeadingNotification > currentProf.throttleNotificationMs) {
                lastHeadingNotification = now;
                onCameraChangeRef.current({ heading: Math.round(nextHeading * 10) / 10 });
              }
            }
          } else if (isPenToolRef.current) {
            // Pen Tool sınır takibi açıkken pürüzsüz 60 FPS kalem hareketi için render iste
            if (viewer && !viewer.isDestroyed()) {
              viewer.scene.requestRender();
            }
          }
        };

        viewer.clock.shouldAnimate = true;
        viewer.clock.onTick.addEventListener(onTick);

        viewerRef.current = viewer;
        setIsCesiumReady(true);

        // Background Asynchronous 3D Terrain Loader (Doesn't block Earth display)
        (async () => {
          try {
            if (Cesium.ArcGISTiledElevationTerrainProvider?.fromUrl) {
              const terrain = await Cesium.ArcGISTiledElevationTerrainProvider.fromUrl(
                'https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer'
              );
              terrainProviderRef.current = terrain;
              if (viewerRef.current && !viewerRef.current.isDestroyed() && isTerrainActiveRef.current) {
                viewerRef.current.terrainProvider = terrain;
                viewerRef.current.scene.globe.depthTestAgainstTerrain = true;
                viewerRef.current.scene.globe.terrainExaggeration = 1.8;
              }
            }
          } catch (terrainErr) {
            console.warn('3D Terrain yükleme notu:', terrainErr);
          }
        })();

        return true;
      } catch (err: any) {
        console.error('Cesium init error:', err);
        setInitError(err.message || 'Cesium 3D motoru başlatılamadı');
        return false;
      }
    };

    if (!tryInitCesium()) {
      checkInterval = setInterval(() => {
        const success = tryInitCesium();
        if (success) clearInterval(checkInterval);
      }, 200);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      if (viewerRef.current) {
        try {
          viewerRef.current.destroy();
          viewerRef.current = null;
        } catch (e) {
          console.warn(e);
        }
      }
    };
  }, [getProvider, updateCameraView, centerOnParcel]);

  // Dynamic ResizeObserver for seamless screen size adjustments & window resizing
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        try {
          viewerRef.current.resize();
        } catch (e) {}
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isCesiumReady]);

  // Handle Terrain Active / Passive Toggle & Auto-center parcel
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || typeof Cesium === 'undefined') return;

    try {
      if (isTerrainActive && terrainProviderRef.current) {
        viewer.terrainProvider = terrainProviderRef.current;
        viewer.scene.globe.depthTestAgainstTerrain = true;
        viewer.scene.globe.terrainExaggeration = 1.8;
      } else {
        viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
        viewer.scene.globe.depthTestAgainstTerrain = false;
        viewer.scene.globe.terrainExaggeration = 1.0;
      }

      // 3D arazi açıldığında veya kapandığında parseli arazi yüksekliğine göre tam ortala
      if (activeParcelRef.current && activeParcelRef.current.coordinates && activeParcelRef.current.coordinates.length >= 3) {
        setTimeout(() => {
          centerOnParcel(deviceProfileRef.current.flyDuration);
        }, 100);
      }
    } catch (e) {
      console.warn('Terrain toggle error:', e);
    }
  }, [isTerrainActive, centerOnParcel]);

  // Handle Base Map Change
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || typeof Cesium === 'undefined') return;

    try {
      const newProvider = getProvider(baseMap);
      if (newProvider) {
        viewer.imageryLayers.removeAll();
        currentLayerRef.current = viewer.imageryLayers.addImageryProvider(newProvider);
      }
    } catch (e) {
      console.error('Basemap switch error:', e);
    }
  }, [baseMap, getProvider]);

  // Handle Camera parameter changes from sliders
  useEffect(() => {
    if (!cameraState.isTouring) {
      updateCameraView();
    }
  }, [cameraState.pitch, cameraState.heading, cameraState.range, cameraState.isTouring, updateCameraView]);

  // Geometry fingerprint of the parcel (changes ONLY when actual boundary coordinates change)
  const parcelGeometryKey = useMemo(() => {
    if (!activeParcel || !activeParcel.coordinates || activeParcel.coordinates.length < 3) return '';
    const coords = activeParcel.coordinates;
    const len = coords.length;
    const first = coords[0];
    const last = coords[len - 1];
    return `${activeParcel.id || 'p'}_${len}_${first.lng.toFixed(6)}_${first.lat.toFixed(6)}_${last.lng.toFixed(6)}_${last.lat.toFixed(6)}`;
  }, [activeParcel?.id, activeParcel?.coordinates]);

  // Draw 3D Parcel with Water Flow Animation
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || typeof Cesium === 'undefined') return;

    // Check if boundary geometry actually changed (new file upload or sample parcel)
    const isNewGeometry = lastRenderedCoordsKeyRef.current !== parcelGeometryKey;

    // Clear previous entities
    if (parcelEntitiesRef.current.length > 0) {
      parcelEntitiesRef.current.forEach((e) => viewer.entities.remove(e));
      parcelEntitiesRef.current = [];
    }

    if (!parcelGeometryKey || !activeParcel || activeParcel.coordinates.length < 3) {
      lastRenderedCoordsKeyRef.current = '';
      return;
    }

    try {
      const coords = activeParcel.coordinates;
      const cartesianPoints = coords.map((c) =>
        Cesium.Cartesian3.fromDegrees(c.lng, c.lat, c.alt || 0)
      );

      // Ensure points form a closed ring for polylines and polygons
      const closedPoints = [...cartesianPoints];
      if (coords.length >= 3) {
        const first = coords[0];
        const last = coords[coords.length - 1];
        if (Math.abs(first.lng - last.lng) > 1e-6 || Math.abs(first.lat - last.lat) > 1e-6) {
          closedPoints.push(cartesianPoints[0]);
        }
      }

      // Parse colors
      const borderCesiumColor = Cesium.Color.fromCssColorString(parcelStyle.borderColor || '#38bdf8');
      const fillCesiumColor = Cesium.Color.fromCssColorString(parcelStyle.fillColor || '#38bdf8').withAlpha(
        Math.max(0, Math.min(1, parcelStyle.fillOpacity ?? 0.3))
      );

      const isExtruded = (parcelStyle.extrusionHeight || 0) > 0;
      const createdEntities: any[] = [];

      // Parsel merkezini ve arazi taban yüksekliğini tespit et
      let sumLng = 0;
      let sumLat = 0;
      coords.forEach((c) => {
        sumLng += c.lng;
        sumLat += c.lat;
      });
      const centerLng = sumLng / coords.length;
      const centerLat = sumLat / coords.length;

      let defaultTerrainHeight = 0;
      if (viewer.scene.globe) {
        const centerCarto = Cesium.Cartographic.fromDegrees(centerLng, centerLat);
        const gh = viewer.scene.globe.getHeight(centerCarto);
        if (typeof gh === 'number' && !isNaN(gh) && gh > -200) {
          defaultTerrainHeight = gh;
        }
      }

      const getCoordElevation = (lng: number, lat: number, directAlt?: number) => {
        if (typeof directAlt === 'number' && directAlt > 0) return directAlt;
        if (viewer.scene.globe) {
          const carto = Cesium.Cartographic.fromDegrees(lng, lat);
          const gh = viewer.scene.globe.getHeight(carto);
          if (typeof gh === 'number' && !isNaN(gh) && gh > -200) {
            return gh;
          }
        }
        return defaultTerrainHeight;
      };

      // Animasyonlu çizginin zeminle çakışmaması (z-fighting olmaması) için kot ekle
      const lineAltOffset = isExtruded ? (parcelStyle.extrusionHeight || 0) + 1.2 : 2.0;

      // Her köşe noktasının gerçek 3D koordinatı (arazi üstü)
      const elevatedPoints: any[] = coords.map((c) => {
        const alt = getCoordElevation(c.lng, c.lat, c.alt);
        return Cesium.Cartesian3.fromDegrees(c.lng, c.lat, alt + lineAltOffset);
      });

      const closedElevatedPoints = [...elevatedPoints];
      if (coords.length >= 3) {
        const first = coords[0];
        const last = coords[coords.length - 1];
        if (Math.abs(first.lng - last.lng) > 1e-6 || Math.abs(first.lat - last.lat) > 1e-6) {
          closedElevatedPoints.push(elevatedPoints[0]);
        }
      }

      // Pen Tool KML Çevre ve Mesafe Hesaplamaları
      const distances: number[] = [0];
      let totalPerimeter = 0;
      for (let i = 0; i < closedElevatedPoints.length - 1; i++) {
        const d = Cesium.Cartesian3.distance(closedElevatedPoints[i], closedElevatedPoints[i + 1]);
        totalPerimeter += d;
        distances.push(totalPerimeter);
      }
      if (totalPerimeter <= 0) totalPerimeter = 1;

      const speedMultiplier = Math.max(0.2, parcelStyle.penToolSpeed || 1.0);
      // Çizim süresi ~4.0 saniye / hız çarpanı, çizim bitince sınırı tamamlama ve hold süresi ~2.0 saniye
      const drawDurationMs = 4000 / speedMultiplier;
      const completeHoldMs = 2000 / speedMultiplier;
      const totalCycleMs = drawDurationMs + completeHoldMs;

      // Cesium'da GroundPolyline (clampToGround: true), dinamik CallbackProperty, PolylineGlowMaterialProperty ve PolylineDashMaterialProperty DESTEKLEMEZ.
      // Bu nedenle animasyonlu, ışıltılı (neon) veya kesikli çizgiler elevatedPoints ile clampToGround: false olarak çizilir.
      const isDynamicOrStyled = parcelStyle.penTool || parcelStyle.glowEffect || parcelStyle.dashedBorder || isExtruded;
      const shouldClampPolyline = !isDynamicOrStyled;

      // Dinamik Sınır Çizgisi: Sınırı silerek takip eder, adım adım çizer ve bitince sınırı tamamlar
      let polylinePositions: any;
      if (parcelStyle.penTool && closedElevatedPoints.length >= 2) {
        polylinePositions = new Cesium.CallbackProperty(() => {
          const now = Date.now();
          const elapsed = now % totalCycleMs;

          // Çizim tamamlandıysa ("bitince sınırı tamamla"): Tam kapalı KML sınırını göster
          if (elapsed >= drawDurationMs) {
            return closedElevatedPoints;
          }

          // Çizim aşaması ("silerek takip et"): Sınır sıfırdan başlar, KML koordinatlarını takip ederek çizer
          const progress = Math.max(0.0001, Math.min(0.9999, elapsed / drawDurationMs));
          const currentTargetDist = progress * totalPerimeter;

          const pts: any[] = [];
          for (let i = 0; i < distances.length - 1; i++) {
            pts.push(closedElevatedPoints[i]);
            if (currentTargetDist <= distances[i + 1]) {
              const d0 = distances[i];
              const d1 = distances[i + 1];
              const segLen = d1 - d0;
              const t = segLen > 1e-6 ? (currentTargetDist - d0) / segLen : 0;
              const tip = Cesium.Cartesian3.lerp(
                closedElevatedPoints[i],
                closedElevatedPoints[i + 1],
                t,
                new Cesium.Cartesian3()
              );
              pts.push(tip);
              break;
            }
          }

          // Cesium polyline en az 2 nokta gerektirir
          if (pts.length < 2) {
            pts.push(pts[0] || closedElevatedPoints[0]);
          }
          return pts;
        }, false);
      } else {
        polylinePositions = shouldClampPolyline ? closedPoints : closedElevatedPoints;
      }

      // Dinamik Poligon Dolgusu: Pen Tool aktifken çizim bitene kadar şeffaftır, sınır tamamlanınca görünür
      let polygonMaterial: any = fillCesiumColor;
      if (parcelStyle.penTool && closedPoints.length >= 2) {
        polygonMaterial = new Cesium.ColorMaterialProperty(
          new Cesium.CallbackProperty(() => {
            const elapsed = Date.now() % totalCycleMs;
            if (elapsed >= drawDurationMs) {
              return fillCesiumColor;
            }
            return Cesium.Color.TRANSPARENT;
          }, false)
        );
      }

      // 1. Base 3D Polygon
      const polygonConfig: any = {
        hierarchy: new Cesium.PolygonHierarchy(closedPoints),
        material: polygonMaterial,
      };

      if (isExtruded) {
        polygonConfig.height = 0;
        polygonConfig.heightReference = Cesium.HeightReference.RELATIVE_TO_GROUND;
        polygonConfig.extrudedHeight = parcelStyle.extrusionHeight;
        polygonConfig.extrudedHeightReference = Cesium.HeightReference.RELATIVE_TO_GROUND;
        polygonConfig.outline = true;
        polygonConfig.outlineColor = borderCesiumColor;
        polygonConfig.outlineWidth = Math.max(1, parcelStyle.borderWidth || 3);
      } else {
        polygonConfig.heightReference = Cesium.HeightReference.CLAMP_TO_GROUND;
      }

      const mainPolygonEntity = viewer.entities.add({
        name: activeParcel.name || 'Parsel Alanı',
        polygon: polygonConfig,
      });
      createdEntities.push(mainPolygonEntity);

      // 2. Base Polyline (Outline / Border - Stil ayarlarına göre takip eder ve çizer)
      let polylineMaterial: any;

      if (parcelStyle.dashedBorder) {
        polylineMaterial = new Cesium.PolylineDashMaterialProperty({
          color: borderCesiumColor,
          gapColor: Cesium.Color.TRANSPARENT,
          dashLength: 20.0,
        });
      } else if (parcelStyle.glowEffect) {
        polylineMaterial = new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.35,
          taperPower: 1.0,
          color: borderCesiumColor,
        });
      } else {
        polylineMaterial = new Cesium.ColorMaterialProperty(borderCesiumColor);
      }

      const mainPolylineEntity = viewer.entities.add({
        name: `${activeParcel.name || 'Parsel'} - Sınır`,
        polyline: {
          positions: polylinePositions,
          width: Math.max(1, parcelStyle.borderWidth || 4),
          material: polylineMaterial,
          clampToGround: shouldClampPolyline,
        },
      });
      createdEntities.push(mainPolylineEntity);

      // 4. Köşe Noktaları (Köşe Başlangıç / Bitiş Noktaları)
      if (parcelStyle.showStartEndMarkers && coords.length > 0) {
        coords.forEach((coord, idx) => {
          const elev = getCoordElevation(coord.lng, coord.lat, coord.alt);
          const ptEntity = viewer.entities.add({
            name: `Köşe Noktası ${idx + 1}`,
            position: Cesium.Cartesian3.fromDegrees(coord.lng, coord.lat, elev + lineAltOffset + 0.3),
            point: {
              pixelSize: Math.max(6, (parcelStyle.borderWidth || 4) + 3),
              color: borderCesiumColor,
              outlineColor: Cesium.Color.WHITE,
              outlineWidth: 2,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          });
          createdEntities.push(ptEntity);
        });
      }

      parcelEntitiesRef.current = createdEntities;
      lastRenderedCoordsKeyRef.current = parcelGeometryKey;

      viewer.scene.requestRender();

      // SADECE ve SADECE YENİ BİR PARSEL YÜKLENDİĞİNDE KAMERAYI ODAKLA
      // İl, ilçe, ada, parsel, fiyat gibi parsel ekranındaki metin değişikliklerinde kamerayı asla oynatma ve altlık haritayı yenileme!
      if (isNewGeometry) {
        centerOnParcel(0.8, activeParcel);
      }
    } catch (err) {
      console.error('Parcel render error:', err);
    }
  }, [parcelGeometryKey, parcelStyle, isCesiumReady, centerOnParcel]);

  // Handle format change & trigger resize
  useEffect(() => {
    const timer = setTimeout(() => {
      if (viewerRef.current) {
        viewerRef.current.resize();
        updateCameraView();
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [videoFormat, updateCameraView]);

  // Recording timer
  useEffect(() => {
    let timer: any = null;
    if (isRecording) {
      timer = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRecording]);

  // Snapshot action with Watermark Burned-in at 1080p Full HD
  const takeSnapshot = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    try {
      viewer.render();
      const canvas = viewer.canvas;

      // Ensure Full HD (1080p) minimum resolution for snapshots based on format
      let targetW = 1920;
      let targetH = 1080;
      switch (videoFormat) {
        case 'reels':
          targetW = 1080;
          targetH = 1920;
          break;
        case 'post':
          targetW = 1080;
          targetH = 1080;
          break;
        case 'portrait':
          targetW = 1080;
          targetH = 1350;
          break;
        case 'youtube':
        default:
          targetW = 1920;
          targetH = 1080;
          break;
      }

      const snapW = Math.max(targetW, canvas.width);
      const snapH = Math.round(snapW * (targetH / targetW));

      // Create composite canvas with watermark burned directly onto the image
      const offscreen = document.createElement('canvas');
      offscreen.width = snapW;
      offscreen.height = snapH;
      const ctx = offscreen.getContext('2d');
      if (!ctx) return;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // 1. Draw 3D Earth canvas with center-cover to avoid stretching
      const coverScale = Math.max(offscreen.width / canvas.width, offscreen.height / canvas.height);
      const drawW = canvas.width * coverScale;
      const drawH = canvas.height * coverScale;
      const drawX = (offscreen.width - drawW) / 2;
      const drawY = (offscreen.height - drawH) / 2;
      ctx.drawImage(canvas, drawX, drawY, drawW, drawH);

      // 2. Burn Watermark onto Image
      renderWatermarkToCanvas(
        ctx,
        offscreen.width,
        offscreen.height,
        watermarkConfigRef.current,
        activeParcelRef.current,
        logoImageRef.current
      );

      const dataUrl = offscreen.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `parsel_1080p_goruntu_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error('Screenshot capture failed:', e);
      alert('Ekran görüntüsü alınamadı. Tarayıcı izinlerini kontrol ediniz.');
    }
  }, [videoFormat]);

  // Start Video Recording with Watermark Burned-in directly into 1080p Full HD MP4 video!
  const startVideoRecording = useCallback(async (): Promise<boolean> => {
    const viewer = viewerRef.current;
    if (!viewer) return false;

    try {
      const viewerCanvas = viewer.canvas;

      // 1080p Full HD Resolution Sizing according to selected Aspect Ratio
      let targetW = 1920;
      let targetH = 1080;
      switch (videoFormat) {
        case 'reels':
          // 9:16 Full HD
          targetW = 1080;
          targetH = 1920;
          break;
        case 'post':
          // 1:1 Full HD
          targetW = 1080;
          targetH = 1080;
          break;
        case 'portrait':
          // 4:5 Full HD
          targetW = 1080;
          targetH = 1350;
          break;
        case 'youtube':
        default:
          // 16:9 Full HD
          targetW = 1920;
          targetH = 1080;
          break;
      }

      // Create offscreen composite canvas strictly at 1080p resolution
      const recordCanvas = document.createElement('canvas');
      recordCanvas.width = targetW;
      recordCanvas.height = targetH;
      const recordCtx = recordCanvas.getContext('2d');
      if (!recordCtx) return false;

      recordCtx.imageSmoothingEnabled = true;
      recordCtx.imageSmoothingQuality = 'high';

      isRecordingRef.current = true;

      // Frame rendering loop: Burns 3D globe + Watermark together at 1080p 30fps
      const renderFrame = () => {
        if (!isRecordingRef.current) return;

        // 1. Paint 3D WebGL Canvas with proportional cover scaling
        const coverScale = Math.max(recordCanvas.width / viewerCanvas.width, recordCanvas.height / viewerCanvas.height);
        const drawW = viewerCanvas.width * coverScale;
        const drawH = viewerCanvas.height * coverScale;
        const drawX = (recordCanvas.width - drawW) / 2;
        const drawY = (recordCanvas.height - drawH) / 2;

        recordCtx.drawImage(viewerCanvas, drawX, drawY, drawW, drawH);

        // 2. Paint Watermark with active settings at 1080p scale
        renderWatermarkToCanvas(
          recordCtx,
          recordCanvas.width,
          recordCanvas.height,
          watermarkConfigRef.current,
          activeParcelRef.current,
          logoImageRef.current
        );

        animFrameIdRef.current = requestAnimationFrame(renderFrame);
      };

      // Start loop
      animFrameIdRef.current = requestAnimationFrame(renderFrame);

      // Capture 30 FPS stream from 1080p composite canvas
      const stream = recordCanvas.captureStream(30);

      // MP4 priority
      const preferredMimeTypes = [
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
        'video/mp4;codecs=avc1',
        'video/mp4;codecs=h264',
        'video/mp4',
        'video/webm;codecs=h264',
        'video/webm;codecs=vp9',
        'video/webm',
      ];

      let selectedMimeType = '';
      for (const type of preferredMimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          break;
        }
      }

      // 12 Mbps bitrate for crystal-clear 1080p Full HD video recording
      const recorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType || undefined,
        videoBitsPerSecond: 12000000,
      });

      recordedChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        isRecordingRef.current = false;
        if (animFrameIdRef.current) {
          cancelAnimationFrame(animFrameIdRef.current);
          animFrameIdRef.current = null;
        }

        const isMp4 = selectedMimeType.includes('mp4');
        const blob = new Blob(recordedChunksRef.current, {
          type: isMp4 ? 'video/mp4' : selectedMimeType || 'video/mp4',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `parsel_1080p_video_${Date.now()}.mp4`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 100);
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      return true;
    } catch (err: any) {
      console.error('Video recording error:', err);
      isRecordingRef.current = false;
      alert('Video kaydı başlatılamadı: ' + (err.message || 'Hata'));
      return false;
    }
  }, [watermarkConfig, activeParcel, videoFormat]);

  const stopVideoRecording = useCallback(() => {
    isRecordingRef.current = false;
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const set2DView = useCallback(() => {
    isTouringRef.current = false;
    const targetPitch = -89.0;
    pitchRef.current = targetPitch;
    headingRef.current = 0;
    onCameraChangeRef.current({
      isTouring: false,
      pitch: targetPitch,
      heading: 0,
      viewMode: '2d',
    });
    centerOnParcel(
      deviceProfileRef.current.flyDuration,
      activeParcelRef.current || activeParcel,
      targetPitch,
      0
    );
  }, [centerOnParcel, activeParcel]);

  const set3DView = useCallback(() => {
    isTouringRef.current = false;
    const targetPitch = -38.0;
    pitchRef.current = targetPitch;
    onCameraChangeRef.current({
      isTouring: false,
      pitch: targetPitch,
      viewMode: '3d',
    });
    centerOnParcel(
      deviceProfileRef.current.flyDuration,
      activeParcelRef.current || activeParcel,
      targetPitch,
      headingRef.current
    );
  }, [centerOnParcel, activeParcel]);

  const resetToNorth = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer || typeof Cesium === 'undefined' || viewer.isDestroyed()) return;
    isTouringRef.current = false;
    headingRef.current = 0;
    onCameraChangeRef.current({ isTouring: false, heading: 0 });

    try {
      viewer.camera.flyTo({
        destination: viewer.camera.position,
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: viewer.camera.pitch,
          roll: 0,
        },
        duration: 0.6,
      });
    } catch {
      // ignore
    }
  }, []);

  const flyToParcel = useCallback(
    (targetPitch?: number, targetHeading?: number) => {
      centerOnParcel(
        deviceProfileRef.current.flyDuration,
        activeParcelRef.current || activeParcel,
        targetPitch,
        targetHeading
      );
    },
    [centerOnParcel, activeParcel]
  );

  const flyToDeviceLocation = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer || typeof Cesium === 'undefined') return;

    setGpsToastMessage('🔍 Konumunuz Alınıyor...');
    setShowGpsToast(true);

    const onLocationResolved = (
      lng: number,
      lat: number,
      label = 'Mevcut Konumunuz',
      altitude = 850,
      toast = '📍 Konumunuz Bulundu'
    ) => {
      deviceLocationCoordsRef.current = { lng, lat };
      try {
        localStorage.setItem(
          'parsel_last_device_pos',
          JSON.stringify({ lng, lat, label, timestamp: Date.now() })
        );
      } catch (e) {}

      parcelCenterRef.current = Cesium.Cartesian3.fromDegrees(lng, lat);
      updateUserLocationMarker(lng, lat, label);

      // Unlock camera transform so touch gesture panning works smoothly on mobile
      try {
        viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
      } catch (e) {}

      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(lng, lat, altitude),
        orientation: {
          heading: Cesium.Math.toRadians(headingRef.current || 0),
          pitch: Cesium.Math.toRadians(pitchRef.current || -45),
          roll: 0,
        },
        duration: 1.6,
        complete: () => {
          try {
            viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
          } catch (e) {}
        },
      });

      setGpsToastMessage(`${toast} (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      setShowGpsToast(true);
      setTimeout(() => setShowGpsToast(false), 4000);
    };

    // If known from earlier in session, fly to it immediately
    if (deviceLocationCoordsRef.current) {
      const { lng, lat } = deviceLocationCoordsRef.current;
      onLocationResolved(lng, lat, 'Mevcut Konumunuz', 850, '📍 Konuma Odaklanıldı');
    }

    // Two-tier GPS discovery optimized for iOS Safari and Android Chrome
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { longitude, latitude } = pos.coords;
          onLocationResolved(longitude, latitude, 'Mevcut Konumunuz', 850, '📍 Mevcut Konumunuz Bulundu');

          // High accuracy satellite lock refinement in background
          navigator.geolocation.getCurrentPosition(
            (gpsPos) => {
              const fineLng = gpsPos.coords.longitude;
              const fineLat = gpsPos.coords.latitude;
              deviceLocationCoordsRef.current = { lng: fineLng, lat: fineLat };
              updateUserLocationMarker(fineLng, fineLat, 'Mevcut GPS Konumunuz');
            },
            null,
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
          );
        },
        async (err) => {
          console.warn('GPS doğrudan alınamadı, alternatif konum deneniyor:', err.code, err.message);
          // Try IP lookup fallback
          let ipSuccess = false;
          try {
            const res = await fetch('https://ipwho.is/');
            const data = await res.json();
            if (data && data.success && data.latitude && data.longitude) {
              const city = data.city || 'Konumunuz';
              onLocationResolved(data.longitude, data.latitude, `Mevcut Konum (${city})`, 2200, `📍 Yaklaşık Konum: ${city}`);
              ipSuccess = true;
            }
          } catch (e) {}

          if (!ipSuccess) {
            try {
              const res2 = await fetch('https://ipapi.co/json/');
              const data2 = await res2.json();
              if (data2 && data2.latitude && data2.longitude) {
                const city = data2.city || 'Konumunuz';
                onLocationResolved(data2.longitude, data2.latitude, `Mevcut Konum (${city})`, 2200, `📍 Yaklaşık Konum: ${city}`);
                ipSuccess = true;
              }
            } catch (e) {}
          }

          if (!ipSuccess) {
            setGpsToastMessage('⚠️ Konum İzni Kapalı (Tarayıcı Ayarlarından İzin Veriniz)');
            setShowGpsToast(true);
            setTimeout(() => setShowGpsToast(false), 5000);
          }
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
      );
    } else {
      setGpsToastMessage('⚠️ Tarayıcınızda Konum Özelliği Desteklenmiyor');
      setShowGpsToast(true);
      setTimeout(() => setShowGpsToast(false), 4000);
    }
  }, [updateUserLocationMarker]);

  // Kamera Yakınlaştırma (Büyütme +)
  const handleZoomIn = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed() || typeof Cesium === 'undefined') return;

    if (isTouringRef.current) {
      const nextRange = Math.max(80, rangeRef.current * 0.75);
      rangeRef.current = nextRange;
      onCameraChangeRef.current({ range: nextRange });
      updateCameraView();
      return;
    }

    try {
      const height = viewer.camera.positionCartographic?.height || rangeRef.current || 1000;
      const moveAmount = Math.max(30, height * 0.35);
      viewer.camera.zoomIn(moveAmount);
      const newHeight = viewer.camera.positionCartographic?.height || Math.max(50, height - moveAmount);
      rangeRef.current = newHeight;
      onCameraChangeRef.current({ range: newHeight });
      viewer.scene.requestRender();
    } catch (e) {
      console.warn('ZoomIn error:', e);
    }
  }, [updateCameraView]);

  // Kamera Uzaklaştırma (Küçültme -)
  const handleZoomOut = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed() || typeof Cesium === 'undefined') return;

    if (isTouringRef.current) {
      const nextRange = Math.min(50000, rangeRef.current * 1.35);
      rangeRef.current = nextRange;
      onCameraChangeRef.current({ range: nextRange });
      updateCameraView();
      return;
    }

    try {
      const height = viewer.camera.positionCartographic?.height || rangeRef.current || 1000;
      const moveAmount = Math.max(40, height * 0.45);
      viewer.camera.zoomOut(moveAmount);
      const newHeight = viewer.camera.positionCartographic?.height || (height + moveAmount);
      rangeRef.current = newHeight;
      onCameraChangeRef.current({ range: newHeight });
      viewer.scene.requestRender();
    } catch (e) {
      console.warn('ZoomOut error:', e);
    }
  }, [updateCameraView]);

  // 2D Kuşbakışı Tur Başlat / Durdur
  const toggle2DTour = useCallback(() => {
    const isCurrently2DTouring = cameraState.isTouring && cameraState.tourMode === '2d';
    if (isCurrently2DTouring) {
      onCameraChangeRef.current({ isTouring: false });
    } else {
      onCameraChangeRef.current({
        isTouring: true,
        tourMode: '2d',
        pitch: -89.9,
        viewMode: '2d',
      });
    }
  }, [cameraState.isTouring, cameraState.tourMode]);

  // 3D Perspektif Tur Başlat / Durdur
  const toggle3DTour = useCallback(() => {
    const isCurrently3DTouring = cameraState.isTouring && (cameraState.tourMode === '3d' || !cameraState.tourMode);
    if (isCurrently3DTouring) {
      onCameraChangeRef.current({ isTouring: false });
    } else {
      const nextPitch = cameraState.pitch < -65 ? -38 : cameraState.pitch;
      onCameraChangeRef.current({
        isTouring: true,
        tourMode: '3d',
        pitch: nextPitch,
        viewMode: '3d',
      });
    }
  }, [cameraState.isTouring, cameraState.tourMode, cameraState.pitch]);

  // 1080p Video Kaydı Başlat / Durdur
  const toggleVideoRecording = useCallback(async () => {
    if (isRecording) {
      stopVideoRecording();
    } else {
      await startVideoRecording();
    }
  }, [isRecording, startVideoRecording, stopVideoRecording]);

  // Ekrandaki Hızlı Erişim İkon Çubuğu Serbestçe Sürükleme (Kaydırma) Durumu
  const [iconBarPos, setIconBarPos] = useState<{ x: number; y: number } | null>(null);
  const isDraggingBarRef = useRef<boolean>(false);
  const dragBarStartRef = useRef<{ clientX: number; clientY: number; startX: number; startY: number }>({
    clientX: 0,
    clientY: 0,
    startX: 0,
    startY: 0,
  });
  const iconBarRef = useRef<HTMLDivElement>(null);

  const handleBarPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const el = iconBarRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    isDraggingBarRef.current = true;
    dragBarStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startX: rect.left,
      startY: rect.top,
    };
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  }, []);

  const handleBarPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingBarRef.current) return;
    const dx = e.clientX - dragBarStartRef.current.clientX;
    const dy = e.clientY - dragBarStartRef.current.clientY;

    const el = iconBarRef.current;
    const barW = el ? el.offsetWidth : 48;
    const barH = el ? el.offsetHeight : 420;

    const minX = 8;
    const maxX = Math.max(8, window.innerWidth - barW - 8);
    const minY = 8;
    const maxY = Math.max(8, window.innerHeight - barH - 8);

    const newX = Math.min(maxX, Math.max(minX, dragBarStartRef.current.startX + dx));
    const newY = Math.min(maxY, Math.max(minY, dragBarStartRef.current.startY + dy));

    setIconBarPos({ x: newX, y: newY });
  }, []);

  const handleBarPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingBarRef.current) {
      isDraggingBarRef.current = false;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  }, []);

  // Expose Viewer methods to parent
  useEffect(() => {
    if (onViewerReady) {
      onViewerReady({
        takeSnapshot,
        startVideoRecording,
        stopVideoRecording,
        isRecording,
        flyToParcel,
        flyToDeviceLocation,
        resetToNorth,
        set2DView,
        set3DView,
        zoomIn: handleZoomIn,
        zoomOut: handleZoomOut,
        toggleTour: toggle3DTour,
        toggle2DTour,
        toggle3DTour,
        toggleVideoRecording,
      });
    }
  }, [
    onViewerReady,
    takeSnapshot,
    startVideoRecording,
    stopVideoRecording,
    isRecording,
    flyToParcel,
    flyToDeviceLocation,
    resetToNorth,
    set2DView,
    set3DView,
    handleZoomIn,
    handleZoomOut,
    toggle2DTour,
    toggle3DTour,
    toggleVideoRecording,
  ]);

  // Responsive device checks
  const isMobileScreen = typeof window !== 'undefined' && window.innerWidth < 640;
  const isTabletScreen = typeof window !== 'undefined' && window.innerWidth >= 640 && window.innerWidth < 1024;

  // Aspect ratio classes for container
  const getFormatClasses = () => {
    const isFull = (screenHeightPercent ?? 100) >= 99;

    // On mobile phone in reels or full-screen mode, provide edge-to-edge native display
    if (isMobileScreen && (isFull || videoFormat === 'reels')) {
      return 'w-full h-full rounded-none border-none shadow-none';
    }

    switch (videoFormat) {
      case 'reels':
        return isFull && isMobileScreen
          ? 'w-full h-full rounded-none border-none'
          : 'aspect-[9/16] rounded-2xl shadow-2xl border-2 border-sky-400/60 ring-4 ring-sky-500/20';
      case 'post':
        return 'aspect-square rounded-2xl shadow-2xl border-2 border-sky-400/60 ring-4 ring-sky-500/20';
      case 'portrait':
        return 'aspect-[4/5] rounded-2xl shadow-2xl border-2 border-sky-400/60 ring-4 ring-sky-500/20';
      case 'youtube':
      default:
        return isFull
          ? 'w-full h-full rounded-none border-none'
          : 'aspect-[16/9] rounded-2xl shadow-2xl border-2 border-sky-400/60 ring-4 ring-sky-500/20';
    }
  };

  // Dynamic height & sizing based on screenHeightPercent and device
  const getFormatStyle = (): React.CSSProperties => {
    const scale = Math.max(0.45, Math.min(1.0, (screenHeightPercent ?? 100) / 100));
    const isFull = (screenHeightPercent ?? 100) >= 99;

    // On mobile phone, seamlessly fill display when full height or in reels mode
    if (isMobileScreen && (isFull || videoFormat === 'reels')) {
      return {
        width: '100%',
        height: '100%',
        maxHeight: '100vh',
        maxWidth: '100vw',
      };
    }

    switch (videoFormat) {
      case 'reels': {
        const maxH = Math.min(960, Math.round(window.innerHeight * (isFull ? 1.0 : 0.88 * scale)));
        return {
          height: `${maxH}px`,
          maxHeight: `${maxH}px`,
          maxWidth: `${Math.round(maxH * (9 / 16))}px`,
          width: '100%',
        };
      }
      case 'post': {
        const maxH = Math.min(760, Math.round(Math.min(window.innerWidth * 0.9, window.innerHeight * 0.84) * scale));
        return {
          height: `${maxH}px`,
          maxHeight: `${maxH}px`,
          maxWidth: `${maxH}px`,
          width: '100%',
        };
      }
      case 'portrait': {
        const maxH = Math.min(840, Math.round(window.innerHeight * 0.86 * scale));
        return {
          height: `${maxH}px`,
          maxHeight: `${maxH}px`,
          maxWidth: `${Math.round(maxH * (4 / 5))}px`,
          width: '100%',
        };
      }
      case 'youtube':
      default: {
        if (isFull) {
          return {
            width: '100%',
            height: '100%',
          };
        }
        const maxH = Math.round(window.innerHeight * scale);
        const maxW = Math.min(window.innerWidth - 24, Math.round(maxH * (16 / 9)));
        return {
          height: `${maxH}px`,
          maxHeight: `${maxH}px`,
          maxWidth: `${maxW}px`,
          width: '100%',
        };
      }
    }
  };

  const formatTimer = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isEdgeToEdge = (screenHeightPercent ?? 100) >= 99 && (isMobileScreen || videoFormat === 'youtube');

  return (
    <div className={`relative w-full h-screen overflow-hidden bg-neutral-950 flex items-center justify-center ${isEdgeToEdge ? 'p-0' : 'p-1 sm:p-2'}`}>
      {/* 3D Canvas Box (Responsive Kadraj & Dinamik Ekran Boyu) */}
      <div
        id="cesiumContainer"
        style={getFormatStyle()}
        className={`relative overflow-hidden transition-all duration-300 ease-in-out bg-black ${getFormatClasses()}`}
      >
        <div ref={containerRef} className="w-full h-full touch-none select-none" />

        {/* Loading state or error */}
        {!isCesiumReady && !initError && (
          <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center gap-3 z-50 text-slate-200">
            <div className="w-10 h-10 border-4 border-sky-500/30 border-t-sky-400 rounded-full animate-spin" />
            <span className="text-xs font-semibold tracking-wider text-sky-400 uppercase">
              3D Uydu ve Yeryüzü Motoru Başlatılıyor...
            </span>
          </div>
        )}

        {initError && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center z-50">
            <p className="text-sm text-red-400 font-semibold mb-2">Başlatma Uyarısı</p>
            <p className="text-xs text-slate-300 max-w-md">{initError}</p>
          </div>
        )}

        {/* Recording active badge on the canvas */}
        {isRecording && (
          <div className="absolute top-5 left-5 z-40 flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-red-600/90 backdrop-blur-md text-white border border-red-400/50 shadow-lg animate-pulse pointer-events-none">
            <span className="w-2.5 h-2.5 rounded-full bg-white shadow" />
            <span className="text-xs font-mono font-bold tracking-widest">
              REC {formatTimer(recordingSeconds)}
            </span>
          </div>
        )}

        {/* GPS Location Notification Toast */}
        {showGpsToast && (
          <div className="absolute top-16 sm:top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-950/95 backdrop-blur-xl border border-sky-400/40 text-sky-300 shadow-2xl text-xs font-semibold animate-in fade-in slide-in-from-top-3 duration-300 pointer-events-none">
            <LocateFixed className="w-4 h-4 text-sky-400 animate-spin" />
            <span>{gpsToastMessage}</span>
          </div>
        )}

        {/* Ekran Sağı Dikey Çubuk: Büyüt/Küçült, 2D/3D, Ortala, Kuzey, Konum, HD Fotoğraf, 3D Tur, Kayıt */}
        {showMapControls && (
          <div
            ref={iconBarRef}
            style={
              iconBarPos
                ? {
                    left: `${iconBarPos.x}px`,
                    top: `${iconBarPos.y}px`,
                    transform: 'none',
                    right: 'auto',
                    bottom: 'auto',
                  }
                : undefined
            }
            className={`absolute z-30 flex flex-col items-center gap-1 sm:gap-1.5 p-1 rounded-xl bg-slate-950/85 backdrop-blur-xl border border-white/15 shadow-xl shadow-black/80 select-none scale-75 sm:scale-85 md:scale-90 lg:scale-100 transition-all max-h-[95vh] overflow-y-auto scrollbar-none ${
              iconBarPos ? '' : 'right-1.5 sm:right-3 top-1/2 -translate-y-1/2 origin-right'
            }`}
          >
            {/* 0. İkon Çubuğu Sürükleme (Kaydırma) Tutamacı */}
            <div
              onPointerDown={handleBarPointerDown}
              onPointerMove={handleBarPointerMove}
              onPointerUp={handleBarPointerUp}
              onPointerCancel={handleBarPointerUp}
              onDoubleClick={() => setIconBarPos(null)}
              className="flex items-center justify-center w-full py-1 rounded bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white cursor-grab active:cursor-grabbing transition-colors"
              title="İkon Çubuğunu Ekranda İstediğin Yere Kaydır & Taşı (Çift tıkla sıfırla)"
            >
              <GripVertical className="w-3.5 h-3.5 text-sky-400" />
            </div>

            {iconBarPos && (
              <button
                type="button"
                onClick={() => setIconBarPos(null)}
                className="w-full py-0.5 flex items-center justify-center text-[7px] font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/30 rounded transition cursor-pointer"
                title="İkon Çubuğunu Sağ Kenara Sıfırla"
              >
                SIFIRLA
              </button>
            )}

            {/* 1. Büyütme (+) Butonu */}
            <button
              id="btn-floating-zoom-in"
              onClick={handleZoomIn}
              className="group relative flex flex-col items-center justify-center w-10 sm:w-11 py-1 px-0.5 rounded-lg bg-white/5 hover:bg-sky-500/20 active:bg-sky-500/30 border border-white/10 hover:border-sky-400/60 text-slate-200 hover:text-sky-300 transition-all duration-200 active:scale-95 cursor-pointer"
              title="Haritayı Yakınlaştır (Büyüt +)"
            >
              <Plus className="w-3.5 h-3.5 text-sky-400 group-hover:scale-125 transition duration-200" />
              <span className="text-[8px] font-bold mt-0.5 text-slate-300 group-hover:text-sky-300 tracking-tight leading-tight">
                BÜYÜT
              </span>
            </button>

            {/* 2. Küçültme (-) Butonu */}
            <button
              id="btn-floating-zoom-out"
              onClick={handleZoomOut}
              className="group relative flex flex-col items-center justify-center w-10 sm:w-11 py-1 px-0.5 rounded-lg bg-white/5 hover:bg-sky-500/20 active:bg-sky-500/30 border border-white/10 hover:border-sky-400/60 text-slate-200 hover:text-sky-300 transition-all duration-200 active:scale-95 cursor-pointer"
              title="Haritayı Uzaklaştır (Küçült -)"
            >
              <Minus className="w-3.5 h-3.5 text-sky-400 group-hover:scale-125 transition duration-200" />
              <span className="text-[8px] font-bold mt-0.5 text-slate-300 group-hover:text-sky-300 tracking-tight leading-tight">
                KÜÇÜLT
              </span>
            </button>

            {/* Dikey Ayırıcı Çizgi */}
            <div className="w-5 h-px bg-white/10 my-0.5" />

            {/* 2D Kuşbakışı Düz Harita Butonu (Sınırları Ekrana Tam Ortalar) */}
            <button
              id="btn-view-2d-mode"
              onClick={set2DView}
              className={`group relative flex flex-col items-center justify-center w-10 sm:w-11 py-1 px-0.5 rounded-lg border transition-all duration-200 active:scale-95 cursor-pointer ${
                cameraState.pitch <= -75 && !cameraState.isTouring
                  ? 'bg-sky-500/25 border-sky-400 text-sky-200 shadow-md shadow-sky-500/20 ring-1 ring-sky-400/40'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
              title="2D Kuşbakışı Düz Harita (KML Sınırlarını Ekrana Tam Ortalar)"
            >
              <span className="text-[11px] font-black tracking-tight leading-tight">2D</span>
              <span className="text-[7px] font-bold text-sky-300 uppercase leading-none">DÜZ</span>
            </button>

            {/* 3D Perspektif Harita Butonu (Sınırları Ekrana Tam Ortalar) */}
            <button
              id="btn-view-3d-mode"
              onClick={set3DView}
              className={`group relative flex flex-col items-center justify-center w-10 sm:w-11 py-1 px-0.5 rounded-lg border transition-all duration-200 active:scale-95 cursor-pointer ${
                cameraState.pitch > -75 || cameraState.isTouring
                  ? 'bg-amber-500/25 border-amber-400 text-amber-200 shadow-md shadow-amber-500/20 ring-1 ring-amber-400/40'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
              title="3D Perspektif Harita (KML Sınırlarını Ekrana Tam Ortalar)"
            >
              <span className="text-[11px] font-black tracking-tight leading-tight">3D</span>
              <span className="text-[7px] font-bold text-amber-300 uppercase leading-none">KÜRE</span>
            </button>

            {/* Dikey Ayırıcı Çizgi */}
            <div className="w-5 h-px bg-white/10 my-0.5" />

            {/* KML Parsel Sınırlarını Ekrana Tam Ortala Butonu */}
            <button
              id="btn-center-parcel-fit"
              onClick={() => flyToParcel()}
              className="group relative flex flex-col items-center justify-center w-10 sm:w-11 py-1 px-0.5 rounded-lg bg-white/5 hover:bg-sky-500/20 active:bg-sky-500/30 border border-white/10 hover:border-sky-400/60 text-slate-200 hover:text-sky-300 transition-all duration-200 active:scale-95 cursor-pointer"
              title="KML Parsel Sınırlarını Ekrana Tam Ortala"
            >
              <Crosshair className="w-3.5 h-3.5 text-sky-400 group-hover:scale-110 transition duration-200" />
              <span className="text-[8px] font-bold mt-0.5 text-slate-300 group-hover:text-sky-300 tracking-tight leading-tight">
                ORTALA
              </span>
            </button>

            {/* Dikey Ayırıcı Çizgi */}
            <div className="w-5 h-px bg-white/10 my-0.5" />

            {/* Kuzeye Döndür (Pusula) Butonu */}
            <button
              id="btn-reset-north"
              onClick={resetToNorth}
              className={`group relative flex flex-col items-center justify-center w-10 sm:w-11 py-1 px-0.5 rounded-lg border transition-all duration-200 active:scale-95 cursor-pointer ${
                Math.abs((cameraState.heading || 0) % 360) < 2
                  ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                  : 'bg-rose-500/20 border-rose-400/80 text-rose-200 shadow-md shadow-rose-500/20 ring-1 ring-rose-400/40'
              }`}
              title="Haritayı Tam Kuzeye Çevir (0° - Kuzey Açısı)"
            >
              <div className="relative flex items-center justify-center">
                <Compass
                  className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform duration-300"
                  style={{ transform: `rotate(${-((cameraState.heading || 0) % 360)}deg)` }}
                />
              </div>
              <span className="text-[8px] font-bold mt-0.5 tracking-tight leading-tight">
                KUZEY
              </span>
              <span className="text-[7px] font-mono text-rose-300/80 font-semibold leading-none">
                {Math.round((cameraState.heading || 0) % 360)}°
              </span>
            </button>

            {/* Dikey Ayırıcı Çizgi */}
            <div className="w-5 h-px bg-white/10 my-0.5" />

            {/* GPS Konum Butonu */}
            <button
              id="btn-floating-my-location"
              onClick={flyToDeviceLocation}
              className="group relative flex flex-col items-center justify-center w-10 sm:w-11 py-1 px-0.5 rounded-lg bg-white/5 hover:bg-sky-500/20 active:bg-sky-500/30 border border-white/10 hover:border-sky-400/60 text-slate-200 hover:text-sky-300 transition-all duration-200 active:scale-95 cursor-pointer"
              title="Cihazımın GPS Konumuna Git"
            >
              <div className="relative flex items-center justify-center">
                <span className="absolute -inset-1 rounded-full bg-sky-400/20 group-hover:animate-ping opacity-0 group-hover:opacity-100 transition" />
                <LocateFixed className="w-3.5 h-3.5 text-sky-400 group-hover:scale-110 transition duration-200" />
              </div>
              <span className="text-[8px] font-bold mt-0.5 text-slate-300 group-hover:text-sky-300 tracking-tight leading-tight">
                KONUM
              </span>
            </button>

            {/* Dikey Ayırıcı Çizgi */}
            <div className="w-5 h-px bg-white/10 my-0.5" />

            {/* 1. HD Fotoğraf Butonu (Konum Altı - 1. Sıra) */}
            <button
              id="btn-floating-snapshot"
              onClick={takeSnapshot}
              className="group relative flex flex-col items-center justify-center w-10 sm:w-11 py-1 px-0.5 rounded-lg bg-white/5 hover:bg-emerald-500/20 active:bg-emerald-500/30 border border-white/10 hover:border-emerald-400/60 text-slate-200 hover:text-emerald-300 transition-all duration-200 active:scale-95 cursor-pointer"
              title="HD Fotoğraf Çek (1080p Ekran Görüntüsü İndir)"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition duration-200" />
              <span className="text-[8px] font-bold mt-0.5 text-slate-300 group-hover:text-emerald-300 tracking-tight leading-tight">
                HD FOTO
              </span>
            </button>

            {/* 2. 2D Tur Butonu (3D Tur Üzerinde - 360° Dönen Düz Harita) */}
            <button
              id="btn-floating-2d-tour"
              onClick={toggle2DTour}
              className={`group relative flex flex-col items-center justify-center w-10 sm:w-11 py-1 px-0.5 rounded-lg border transition-all duration-200 active:scale-95 cursor-pointer ${
                cameraState.isTouring && cameraState.tourMode === '2d'
                  ? 'bg-sky-500/30 border-sky-400 text-sky-200 shadow-md shadow-sky-500/30 ring-1 ring-sky-400/50'
                  : 'bg-white/5 border-white/10 text-slate-200 hover:bg-sky-500/20 hover:border-sky-400/60 hover:text-sky-300'
              }`}
              title={
                cameraState.isTouring && cameraState.tourMode === '2d'
                  ? '2D Kuşbakışı Turu Durdur'
                  : '2D Kuşbakışı Parsel Turunu Başlat (360° Dönen Düz Harita)'
              }
            >
              <RotateCw
                className={`w-3.5 h-3.5 text-sky-400 group-hover:scale-110 transition duration-200 ${
                  cameraState.isTouring && cameraState.tourMode === '2d' ? 'animate-spin' : ''
                }`}
              />
              <span className="text-[8px] font-bold mt-0.5 tracking-tight leading-tight">
                {cameraState.isTouring && cameraState.tourMode === '2d' ? 'DURDUR' : '2D TUR'}
              </span>
            </button>

            {/* 3. 3D Tur Butonu (Konum Altı - 3. Sıra) */}
            <button
              id="btn-floating-3d-tour"
              onClick={toggle3DTour}
              className={`group relative flex flex-col items-center justify-center w-10 sm:w-11 py-1 px-0.5 rounded-lg border transition-all duration-200 active:scale-95 cursor-pointer ${
                cameraState.isTouring && (cameraState.tourMode === '3d' || !cameraState.tourMode)
                  ? 'bg-amber-500/30 border-amber-400 text-amber-200 shadow-md shadow-amber-500/30 ring-1 ring-amber-400/50'
                  : 'bg-white/5 border-white/10 text-slate-200 hover:bg-amber-500/20 hover:border-amber-400/60 hover:text-amber-300'
              }`}
              title={
                cameraState.isTouring && (cameraState.tourMode === '3d' || !cameraState.tourMode)
                  ? '3D Perspektif Turu Durdur'
                  : '3D Perspektif Parsel Turunu Başlat'
              }
            >
              <Rotate3d
                className={`w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition duration-200 ${
                  cameraState.isTouring && (cameraState.tourMode === '3d' || !cameraState.tourMode) ? 'animate-spin' : ''
                }`}
              />
              <span className="text-[8px] font-bold mt-0.5 tracking-tight leading-tight">
                {cameraState.isTouring && (cameraState.tourMode === '3d' || !cameraState.tourMode) ? 'DURDUR' : '3D TUR'}
              </span>
            </button>

            {/* 4. 1080p Video Kaydı Butonu (Konum Altı - 4. Sıra) */}
            <button
              id="btn-floating-record"
              onClick={toggleVideoRecording}
              className={`group relative flex flex-col items-center justify-center w-10 sm:w-11 py-1 px-0.5 rounded-lg border transition-all duration-200 active:scale-95 cursor-pointer ${
                isRecording
                  ? 'bg-rose-600/40 border-rose-500 text-rose-200 shadow-lg shadow-rose-600/30 ring-1 ring-rose-400 animate-pulse'
                  : 'bg-white/5 border-white/10 text-slate-200 hover:bg-rose-500/20 hover:border-rose-400/60 hover:text-rose-300'
              }`}
              title={isRecording ? 'Video Kaydını Durdur ve MP4 İndir' : '1080p Full HD Video Kaydını Başlat'}
            >
              {isRecording ? (
                <div className="relative flex items-center justify-center">
                  <span className="absolute -inset-1 rounded-full bg-rose-500 animate-ping opacity-75" />
                  <Square className="w-3.5 h-3.5 text-rose-400 fill-rose-400 relative z-10" />
                </div>
              ) : (
                <Video className="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition duration-200" />
              )}
              <span className="text-[8px] font-bold mt-0.5 tracking-tight leading-tight">
                {isRecording ? 'DURDUR' : 'KAYIT'}
              </span>
            </button>
          </div>
        )}

        {/* Otomatik Cihaz Hız & Performans Optimizasyon Rozeti (Ekran Sol Alt) */}
        {showMapControls && (
          <div className="absolute bottom-2.5 left-2.5 z-20 hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md border border-white/10 text-[10px] text-slate-300 pointer-events-none select-none shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
            <span className="font-semibold text-sky-300">{deviceProfile.shortLabel}</span>
            <span className="text-slate-400">• Otomatik Hız & 60 FPS Optimize</span>
          </div>
        )}

        {/* Custom Watermark Overlay */}
        {children}
      </div>
    </div>
  );
};
