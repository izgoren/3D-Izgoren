import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  BaseMapType,
  CameraState,
  ParcelInfo,
  ParcelStyle,
  VideoFormatType,
  WatermarkConfig,
} from '../types';
import { Mountain, Eye, EyeOff, LocateFixed, MapPin } from 'lucide-react';

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
  children?: React.ReactNode;
}

export interface ViewerMethods {
  takeSnapshot: () => void;
  startVideoRecording: () => Promise<boolean>;
  stopVideoRecording: () => void;
  isRecording: boolean;
  flyToParcel: () => void;
  flyToDeviceLocation: () => void;
}

// 2D Canvas Watermark Renderer for Video & Snapshot
function renderWatermarkToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: WatermarkConfig,
  parcel: ParcelInfo | null,
  logoImg: HTMLImageElement | null
) {
  if (!config.visible) return;

  const scale = Math.max(0.65, Math.min(1.4, Math.min(width, height) / 900));
  const cardW = 340 * scale;
  const cardH = 135 * scale;
  const margin = 20 * scale;
  const opacity = config.opacity ?? 0.85;

  let cardX = width - cardW - margin;
  let cardY = height - cardH - margin;

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

  // Location display string
  const locParts = [parcel?.city, parcel?.district, parcel?.neighborhood].filter(Boolean);
  const locationTitle = locParts.length > 0 ? locParts.join(' / ') : 'Türkiye Kadastro Parseli';

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
    const badgeW = 200 * scale;
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
    const pW = 120 * scale;
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
  const tourSpeedRef = useRef<number>(cameraState.tourSpeed);
  const headingRef = useRef<number>(cameraState.heading);
  const pitchRef = useRef<number>(cameraState.pitch);
  const rangeRef = useRef<number>(cameraState.range);
  const isRecordingRef = useRef<boolean>(false);
  const logoImageRef = useRef<HTMLImageElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  const [isCesiumReady, setIsCesiumReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [showGpsToast, setShowGpsToast] = useState(false);
  const [gpsToastMessage, setGpsToastMessage] = useState('📍 Konumunuz Algılandı');
  const deviceLocationCoordsRef = useRef<{ lng: number; lat: number } | null>(null);

  // Sync refs
  useEffect(() => {
    isTouringRef.current = cameraState.isTouring;
  }, [cameraState.isTouring]);

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

  // Provider selector with Ultra HD resolution settings
  const getProvider = useCallback((type: BaseMapType) => {
    if (typeof Cesium === 'undefined') return null;

    try {
      if (type === 'google_satellite') {
        const p = new Cesium.UrlTemplateImageryProvider({
          url: 'https://mt{s}.google.com/vt/lyrs=s&scale=2&x={x}&y={y}&z={z}',
          subdomains: ['0', '1', '2', '3'],
          tileWidth: 512,
          tileHeight: 512,
          maximumLevel: 22,
          credit: 'Google Saf Uydu HD',
        });
        p.errorEvent?.addEventListener((err: any) => console.warn('Google Satellite tile error:', err));
        return p;
      }

      if (type === 'yandex_hybrid') {
        const p = new Cesium.UrlTemplateImageryProvider({
          url: 'https://sat0{s}.maps.yandex.net/tiles?l=sat,skl&x={x}&y={y}&z={z}&lang=tr_TR',
          subdomains: ['1', '2', '3', '4'],
          maximumLevel: 20,
          credit: 'Yandex Hibrit Uydu HD',
        });
        p.errorEvent?.addEventListener((err: any) => console.warn('Yandex Hybrid tile error:', err));
        return p;
      }

      if (type === 'yandex_satellite') {
        const p = new Cesium.UrlTemplateImageryProvider({
          url: 'https://sat0{s}.maps.yandex.net/tiles?l=sat&x={x}&y={y}&z={z}&lang=tr_TR',
          subdomains: ['1', '2', '3', '4'],
          maximumLevel: 20,
          credit: 'Yandex Saf Uydu HD',
        });
        p.errorEvent?.addEventListener((err: any) => console.warn('Yandex Satellite tile error:', err));
        return p;
      }

      // Default: Google Hybrid Satellite + Roads & Kadastro Names in Ultra HD (scale=2, 512x512, zoom 22)
      const p = new Cesium.UrlTemplateImageryProvider({
        url: 'https://mt{s}.google.com/vt/lyrs=y&hl=tr&scale=2&x={x}&y={y}&z={z}',
        subdomains: ['0', '1', '2', '3'],
        tileWidth: 512,
        tileHeight: 512,
        maximumLevel: 22,
        credit: 'Google Hibrit Uydu HD',
      });
      p.errorEvent?.addEventListener((err: any) => console.warn('Google Hybrid tile error:', err));
      return p;
    } catch (err) {
      console.error('Altlık harita sağlayıcı hatası:', err);
      return new Cesium.UrlTemplateImageryProvider({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        maximumLevel: 19,
      });
    }
  }, []);

  // Update Camera
  const updateCameraView = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer || !parcelCenterRef.current || typeof Cesium === 'undefined') return;

    try {
      viewer.camera.lookAt(
        parcelCenterRef.current,
        new Cesium.HeadingPitchRange(
          Cesium.Math.toRadians(headingRef.current),
          Cesium.Math.toRadians(pitchRef.current),
          rangeRef.current
        )
      );
    } catch (e) {
      console.warn('Camera update warning:', e);
    }
  }, []);

  // Center camera precisely on the loaded parcel taking 3D terrain into account
  const centerOnParcel = useCallback(
    (duration: number = 1.4) => {
      const viewer = viewerRef.current;
      if (!viewer || typeof Cesium === 'undefined' || !activeParcel || activeParcel.coordinates.length < 3) return;

      try {
        const coords = activeParcel.coordinates;
        let sumLng = 0;
        let sumLat = 0;
        coords.forEach((c) => {
          sumLng += c.lng;
          sumLat += c.lat;
        });
        const centerLng = sumLng / coords.length;
        const centerLat = sumLat / coords.length;

        // Query real terrain elevation if 3D terrain is active
        let terrainHeight = 0;
        if (viewer.scene.globe && isTerrainActive) {
          const carto = Cesium.Cartographic.fromDegrees(centerLng, centerLat);
          const globeHeight = viewer.scene.globe.getHeight(carto);
          if (typeof globeHeight === 'number' && !isNaN(globeHeight) && globeHeight > -200) {
            terrainHeight = globeHeight;
          }
        }

        const centerCartesian = Cesium.Cartesian3.fromDegrees(centerLng, centerLat, terrainHeight);
        parcelCenterRef.current = centerCartesian;

        // Compute optimal camera distance from parcel radius
        const cartesianPoints = coords.map((c) =>
          Cesium.Cartesian3.fromDegrees(c.lng, c.lat, terrainHeight)
        );
        const boundingSphere = Cesium.BoundingSphere.fromPoints(cartesianPoints);
        const radius = boundingSphere.radius || 150;
        const optimalRange = Math.max(280, Math.min(4500, Math.round(radius * 3.2)));
        rangeRef.current = optimalRange;
        onCameraChange({ range: optimalRange });

        // Smoothly fly camera to center parcel on 3D terrain
        const targetSphere = new Cesium.BoundingSphere(centerCartesian, radius);
        viewer.camera.flyToBoundingSphere(targetSphere, {
          duration: duration,
          offset: new Cesium.HeadingPitchRange(
            Cesium.Math.toRadians(headingRef.current),
            Cesium.Math.toRadians(pitchRef.current),
            optimalRange
          ),
          complete: () => {
            updateCameraView();
          },
        });
      } catch (e) {
        console.warn('centerOnParcel error:', e);
        updateCameraView();
      }
    },
    [activeParcel, isTerrainActive, onCameraChange, updateCameraView]
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

        // Set device resolution scale for high-DPI (Retina, 4K, Mobile, Tablet) crystal clarity
        const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
        viewer.resolutionScale = Math.min(Math.max(dpr, 1.0), 2.0);

        // Add user-selected Imagery Basemap Layer with Ultra HD filtering
        const initialProvider = getProvider(baseMap);
        if (initialProvider) {
          const layer = viewer.imageryLayers.addImageryProvider(initialProvider);
          if (typeof Cesium.TextureMinificationFilter !== 'undefined') {
            layer.minificationFilter = Cesium.TextureMinificationFilter.LINEAR_MIPMAP_LINEAR;
            layer.magnificationFilter = Cesium.TextureMagnificationFilter.LINEAR;
          }
          currentLayerRef.current = layer;
        }

        // Optimize visual scene & Maximize imagery clarity
        viewer.scene.globe.show = true;
        viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#0f172a');
        viewer.scene.globe.depthTestAgainstTerrain = false;
        viewer.scene.globe.enableLighting = false; // Prevents pitch black night side shadow
        viewer.scene.skyAtmosphere.show = true;

        // Force Cesium to load higher-resolution tiles sooner (Lower screen space error = crisper textures)
        viewer.scene.globe.maximumScreenSpaceError = 1.25; // Default is 2.0 (1.25 requests higher zoom levels earlier)
        viewer.scene.globe.tileCacheSize = 400; // Cache more HD tiles in GPU/RAM
        viewer.scene.globe.loadingDescendantLimit = 32;
        viewer.scene.globe.preloadAncestors = true;
        viewer.scene.globe.preloadSiblings = true;

        // Default parcel center (Bursa)
        parcelCenterRef.current = Cesium.Cartesian3.fromDegrees(28.981, 40.224);

        // Setup clock tick listener for continuous cinematic 3D tour
        const onTick = () => {
          if (isTouringRef.current && parcelCenterRef.current) {
            const nextHeading = (headingRef.current + tourSpeedRef.current) % 360;
            headingRef.current = nextHeading;
            onCameraChange({ heading: Math.round(nextHeading * 10) / 10 });
            updateCameraView();
          }
        };

        viewer.clock.onTick.addEventListener(onTick);

        viewerRef.current = viewer;
        setIsCesiumReady(true);

        // Device GPS Geolocation as default initial location on phones and tablets
        if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const { longitude, latitude } = pos.coords;
              deviceLocationCoordsRef.current = { lng: longitude, lat: latitude };
              setGpsToastMessage(`📍 Cihaz Konumu Algılandı (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
              setShowGpsToast(true);
              setTimeout(() => setShowGpsToast(false), 4500);

              if (viewerRef.current && !viewerRef.current.isDestroyed()) {
                const userCartesian = Cesium.Cartesian3.fromDegrees(longitude, latitude);
                parcelCenterRef.current = userCartesian;
                viewerRef.current.camera.flyTo({
                  destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, 1200),
                  orientation: {
                    heading: Cesium.Math.toRadians(headingRef.current),
                    pitch: Cesium.Math.toRadians(pitchRef.current),
                    roll: 0,
                  },
                  duration: 2.2,
                  complete: () => {
                    updateCameraView();
                  },
                });
              }
            },
            (err) => {
              console.warn('Cihaz konumu alınamadı (varsayılan parsel merkezi kullanılıyor):', err.message);
              setTimeout(() => {
                centerOnParcel(1.2);
              }, 400);
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
          );
        } else {
          setTimeout(() => {
            centerOnParcel(1.2);
          }, 400);
        }

        // Background Asynchronous 3D Terrain Loader (Doesn't block Earth display)
        (async () => {
          try {
            if (Cesium.ArcGISTiledElevationTerrainProvider?.fromUrl) {
              const terrain = await Cesium.ArcGISTiledElevationTerrainProvider.fromUrl(
                'https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer'
              );
              terrainProviderRef.current = terrain;
              if (viewerRef.current && !viewerRef.current.isDestroyed() && isTerrainActive) {
                viewerRef.current.terrainProvider = terrain;
                viewerRef.current.scene.globe.depthTestAgainstTerrain = true;
                viewerRef.current.scene.globe.terrainExaggeration = 1.8;
                // 3D arazi aktifleştiğinde yüklenen parseli otomatik tam ortala
                setTimeout(() => {
                  centerOnParcel(1.2);
                }, 350);
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
  }, [getProvider, onCameraChange, updateCameraView, centerOnParcel]);

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
      if (activeParcel && activeParcel.coordinates.length >= 3) {
        setTimeout(() => {
          centerOnParcel(1.2);
        }, 200);
      }
    } catch (e) {
      console.warn('Terrain toggle error:', e);
    }
  }, [isTerrainActive, activeParcel, centerOnParcel]);

  // Handle Base Map Change
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || typeof Cesium === 'undefined') return;

    try {
      const newProvider = getProvider(baseMap);
      if (newProvider) {
        viewer.imageryLayers.removeAll();
        const layer = viewer.imageryLayers.addImageryProvider(newProvider);
        if (typeof Cesium.TextureMinificationFilter !== 'undefined') {
          layer.minificationFilter = Cesium.TextureMinificationFilter.LINEAR_MIPMAP_LINEAR;
          layer.magnificationFilter = Cesium.TextureMagnificationFilter.LINEAR;
        }
        currentLayerRef.current = layer;
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

  // Draw 3D Parcel with Water Flow Animation (Başlangıç/Bitiş kaldırıldı, su akışı uygulandı)
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || typeof Cesium === 'undefined') return;

    // Clear previous entities
    if (parcelEntitiesRef.current.length > 0) {
      parcelEntitiesRef.current.forEach((e) => viewer.entities.remove(e));
      parcelEntitiesRef.current = [];
    }

    if (!activeParcel || activeParcel.coordinates.length < 3) return;

    try {
      const coords = activeParcel.coordinates;
      const cartesianPoints = coords.map((c) =>
        Cesium.Cartesian3.fromDegrees(c.lng, c.lat, c.alt || 0)
      );

      // Parse colors
      const borderCesiumColor = Cesium.Color.fromCssColorString(parcelStyle.borderColor || '#38bdf8');
      const fillCesiumColor = Cesium.Color.fromCssColorString(parcelStyle.fillColor || '#38bdf8').withAlpha(
        parcelStyle.fillOpacity
      );

      // Outline material: dashed, solid, or animated glow
      let polylineMaterial: any = borderCesiumColor;
      if (parcelStyle.dashedBorder) {
        polylineMaterial = new Cesium.PolylineDashMaterialProperty({
          color: borderCesiumColor,
          gapColor: Cesium.Color.YELLOW.withAlpha(0.8),
          dashLength: 20.0,
        });
      } else if (parcelStyle.glowEffect) {
        polylineMaterial = new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.25,
          color: borderCesiumColor,
        });
      }

      const createdEntities: any[] = [];

      // 1. Base 3D Polygon & Polyline
      const mainEntity = viewer.entities.add({
        name: activeParcel.name,
        polyline: {
          positions: cartesianPoints,
          width: parcelStyle.borderWidth,
          material: polylineMaterial,
          clampToGround: parcelStyle.extrusionHeight === 0,
        },
        polygon: {
          hierarchy: new Cesium.PolygonHierarchy(cartesianPoints),
          material: fillCesiumColor,
          heightReference:
            parcelStyle.extrusionHeight > 0
              ? Cesium.HeightReference.RELATIVE_TO_GROUND
              : Cesium.HeightReference.CLAMP_TO_GROUND,
          extrudedHeight: parcelStyle.extrusionHeight > 0 ? parcelStyle.extrusionHeight : undefined,
          outline: true,
          outlineColor: borderCesiumColor,
          outlineWidth: parcelStyle.borderWidth,
        },
      });
      createdEntities.push(mainEntity);

      // 2. Canlı Su Akışı Animasyonu (Sınır hattı boyunca su gibi kesintisiz, pürüzsüz dalga akışı)
      if (parcelStyle.animateLine) {
        // Birincil Su Akışı Dalgası
        const waterWaveEntity1 = viewer.entities.add({
          name: `${activeParcel.name} - Su Akışı 1`,
          polyline: {
            positions: new Cesium.CallbackProperty(() => {
              // 3.2 saniyelik pürüzsüz sürekli su döngüsü
              const t = (Date.now() % 3200) / 3200;
              return getSmoothPerimeterWaterFlow(coords, t, t + 0.32, 40);
            }, false),
            width: parcelStyle.borderWidth + 4,
            material: new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.45,
              color: Cesium.Color.fromCssColorString('#38bdf8'),
            }),
            clampToGround: true,
          },
        });
        createdEntities.push(waterWaveEntity1);

        // İkincil Karşıt Su Dalgası (Kesintisiz çift su dalgası görünümü)
        const waterWaveEntity2 = viewer.entities.add({
          name: `${activeParcel.name} - Su Akışı 2`,
          polyline: {
            positions: new Cesium.CallbackProperty(() => {
              const t = ((Date.now() + 1600) % 3200) / 3200;
              return getSmoothPerimeterWaterFlow(coords, t, t + 0.28, 36);
            }, false),
            width: parcelStyle.borderWidth + 2,
            material: new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.35,
              color: Cesium.Color.fromCssColorString('#a5f3fc'),
            }),
            clampToGround: true,
          },
        });
        createdEntities.push(waterWaveEntity2);
      }

      parcelEntitiesRef.current = createdEntities;

      // 3D arazi aktifte veya düz zeminde parseli tam ortala
      centerOnParcel(1.4);
    } catch (err) {
      console.error('Parcel render error:', err);
    }
  }, [activeParcel, parcelStyle, centerOnParcel]);

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

  // Snapshot action with Watermark Burned-in
  const takeSnapshot = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    try {
      viewer.render();
      const canvas = viewer.canvas;

      // Create composite canvas with watermark burned directly onto the image
      const offscreen = document.createElement('canvas');
      offscreen.width = canvas.width;
      offscreen.height = canvas.height;
      const ctx = offscreen.getContext('2d');
      if (!ctx) return;

      // 1. Draw 3D Earth canvas
      ctx.drawImage(canvas, 0, 0, offscreen.width, offscreen.height);

      // 2. Burn Watermark onto Image
      renderWatermarkToCanvas(
        ctx,
        offscreen.width,
        offscreen.height,
        watermarkConfig,
        activeParcel,
        logoImageRef.current
      );

      const dataUrl = offscreen.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `parsel_goruntusu_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error('Screenshot capture failed:', e);
      alert('Ekran görüntüsü alınamadı. Tarayıcı izinlerini kontrol ediniz.');
    }
  }, [watermarkConfig, activeParcel]);

  // Start Video Recording with Watermark Burned-in directly into the MP4 video!
  const startVideoRecording = useCallback(async (): Promise<boolean> => {
    const viewer = viewerRef.current;
    if (!viewer) return false;

    try {
      const viewerCanvas = viewer.canvas;

      // Create offscreen composite canvas for recording
      const recordCanvas = document.createElement('canvas');
      recordCanvas.width = viewerCanvas.width;
      recordCanvas.height = viewerCanvas.height;
      const recordCtx = recordCanvas.getContext('2d');
      if (!recordCtx) return false;

      isRecordingRef.current = true;

      // Frame rendering loop: Burns 3D globe + Watermark together at 30fps
      const renderFrame = () => {
        if (!isRecordingRef.current) return;

        // 1. Paint 3D WebGL Canvas
        recordCtx.drawImage(viewerCanvas, 0, 0, recordCanvas.width, recordCanvas.height);

        // 2. Paint Watermark with active settings
        renderWatermarkToCanvas(
          recordCtx,
          recordCanvas.width,
          recordCanvas.height,
          watermarkConfig,
          activeParcel,
          logoImageRef.current
        );

        animFrameIdRef.current = requestAnimationFrame(renderFrame);
      };

      // Start loop
      animFrameIdRef.current = requestAnimationFrame(renderFrame);

      // Capture 30 FPS stream from composite canvas
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

      const recorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType || undefined,
        videoBitsPerSecond: 8000000,
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
        a.download = `parsel_3d_video_${Date.now()}.mp4`;
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
  }, [watermarkConfig, activeParcel]);

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

  const flyToParcel = useCallback(() => {
    centerOnParcel(1.5);
  }, [centerOnParcel]);

  const flyToDeviceLocation = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer || typeof Cesium === 'undefined') return;

    if (deviceLocationCoordsRef.current) {
      const { lng, lat } = deviceLocationCoordsRef.current;
      parcelCenterRef.current = Cesium.Cartesian3.fromDegrees(lng, lat);
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(lng, lat, 1200),
        orientation: {
          heading: Cesium.Math.toRadians(headingRef.current),
          pitch: Cesium.Math.toRadians(pitchRef.current),
          roll: 0,
        },
        duration: 1.6,
        complete: () => updateCameraView(),
      });
      setGpsToastMessage(`📍 Cihaz Konumuna Yakınlaşıldı (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      setShowGpsToast(true);
      setTimeout(() => setShowGpsToast(false), 3500);
    } else if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { longitude, latitude } = pos.coords;
          deviceLocationCoordsRef.current = { lng: longitude, lat: latitude };
          parcelCenterRef.current = Cesium.Cartesian3.fromDegrees(longitude, latitude);
          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, 1200),
            orientation: {
              heading: Cesium.Math.toRadians(headingRef.current),
              pitch: Cesium.Math.toRadians(pitchRef.current),
              roll: 0,
            },
            duration: 1.6,
            complete: () => updateCameraView(),
          });
          setGpsToastMessage(`📍 Cihaz Konumu Algılandı (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
          setShowGpsToast(true);
          setTimeout(() => setShowGpsToast(false), 3500);
        },
        (err) => {
          alert('Cihaz konumu alınamadı. Lütfen cihazınızın konum servisini ve tarayıcı iznini kontrol ediniz.');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, [updateCameraView]);

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
      });
    }
  }, [onViewerReady, takeSnapshot, startVideoRecording, stopVideoRecording, isRecording, flyToParcel, flyToDeviceLocation]);

  // Aspect ratio classes for container
  const getFormatClasses = () => {
    switch (videoFormat) {
      case 'reels':
        return 'w-full max-w-[min(405px,92vw)] max-h-[min(720px,78vh,calc(100dvh-130px))] aspect-[9/16] rounded-2xl shadow-2xl border-2 border-sky-400/60 ring-4 ring-sky-500/20';
      case 'post':
        return 'w-full max-w-[min(580px,88vw)] max-h-[min(580px,75vh,calc(100dvh-140px))] aspect-square rounded-2xl shadow-2xl border-2 border-sky-400/60 ring-4 ring-sky-500/20';
      case 'portrait':
        return 'w-full max-w-[min(460px,88vw)] max-h-[min(580px,78vh,calc(100dvh-130px))] aspect-[4/5] rounded-2xl shadow-2xl border-2 border-sky-400/60 ring-4 ring-sky-500/20';
      case 'youtube':
      default:
        return 'w-full h-full rounded-none border-none';
    }
  };

  const formatTimer = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-neutral-950 flex items-center justify-center">
      {/* 3D Canvas Box (Responsive Kadraj) */}
      <div
        id="cesiumContainer"
        className={`relative overflow-hidden transition-all duration-300 ease-in-out bg-black ${getFormatClasses()}`}
      >
        <div ref={containerRef} className="w-full h-full" />

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
          <div className="absolute top-16 sm:top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-950/90 backdrop-blur-xl border border-sky-400/40 text-sky-300 shadow-2xl text-xs font-semibold animate-in fade-in slide-in-from-top-3 duration-300">
            <LocateFixed className="w-4 h-4 text-sky-400 animate-spin" />
            <span>{gpsToastMessage}</span>
          </div>
        )}

        {/* Quick 3D Terrain Kabartma Aktif / Pasif Toggle Button & GPS Button */}
        <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
          {/* GPS Konumuma Git Butonu */}
          <button
            onClick={flyToDeviceLocation}
            className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl backdrop-blur-md bg-slate-950/80 hover:bg-slate-900 border border-white/20 hover:border-sky-400/60 text-sky-400 hover:text-sky-300 flex items-center gap-1.5 text-xs font-semibold shadow-xl transition active:scale-95 cursor-pointer"
            title="Cihazımın GPS Konumuna Git"
          >
            <LocateFixed className="w-4 h-4" />
            <span className="hidden sm:inline">Konumum</span>
          </button>

          <button
            onClick={onToggleTerrain}
            className={`px-3 py-1.5 rounded-xl backdrop-blur-md border flex items-center gap-2 text-xs font-semibold shadow-xl transition cursor-pointer ${
              isTerrainActive
                ? 'bg-emerald-950/80 border-emerald-400/80 text-emerald-300 hover:bg-emerald-900/90 shadow-emerald-950/50'
                : 'bg-black/70 border-white/20 text-slate-400 hover:text-white hover:bg-black/90'
            }`}
            title="3D Arazi Topoğrafyası ve Dağ/Tepe Kabartmasını Aç / Kapat"
          >
            <Mountain className={`w-4 h-4 ${isTerrainActive ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">3D Arazi Kabartması:</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                isTerrainActive
                  ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                  : 'bg-white/10 text-slate-400 border border-white/10'
              }`}
            >
              {isTerrainActive ? 'AKTİF' : 'PASİF'}
            </span>
          </button>
        </div>

        {/* Custom Watermark Overlay */}
        {children}
      </div>
    </div>
  );
};
