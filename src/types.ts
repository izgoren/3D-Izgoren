export type BaseMapType = 'google_hybrid' | 'google_satellite' | 'esri_satellite';

export type VideoFormatType = 'youtube' | 'reels' | 'post' | 'portrait';

export interface CameraState {
  pitch: number; // in degrees, e.g. -45
  heading: number; // in degrees, 0-360
  range: number; // in meters, 100-5000
  tourSpeed: number; // speed multiplier, e.g. 0.3
  isTouring: boolean;
  tourMode?: '2d' | '3d'; // 2D Kuşbakışı Tur veya 3D Perspektif Tur
  elevation: number; // calculated altitude above ground
  viewMode?: '2d' | '3d'; // 2D Kuşbakışı veya 3D Perspektif Modu
}

export interface ParcelCoordinate {
  lng: number;
  lat: number;
  alt?: number;
}

export interface ParcelInfo {
  id: string;
  name: string;
  city: string;
  district?: string;
  neighborhood?: string;
  adaNo?: string;
  parselNo?: string;
  price?: string;
  description?: string;
  areaM2: number;
  perimeterM: number;
  coordinates: ParcelCoordinate[];
}

export interface ParcelStyle {
  borderColor: string;
  borderWidth: number;
  fillColor: string;
  fillOpacity: number;
  extrusionHeight: number; // in meters for 3D volume effect
  dashedBorder: boolean;
  glowEffect: boolean;
  showStartEndMarkers: boolean;
  penTool: boolean; // KML sınırını silerek takip eden ve bitince tamamlayan çizim animasyonu
  penToolSpeed?: number; // 0.5x, 1x, 2x
  showEdgeDimensions?: boolean; // Parsel cephe/kenar boylarını çizgilere paralel yazdırma
}

export interface WatermarkConfig {
  visible: boolean;
  companyName: string;
  phone: string;
  web: string;
  adaParselText: string;
  priceTag: string;
  logoUrl: string | null;
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'bottom-center' | 'top-center';
  adaParselPosition: 'inside' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  opacity: number; // 0.1 to 1.0
  scale?: number; // 0.4 to 2.5 (1.0 = 100% standard size)
  showLocationBadge: boolean;
  badgeStyle: 'glass' | 'solid' | 'minimal';
  customPosition?: { xRatio: number; yRatio: number } | null; // Ekranda serbestçe sürüklenmiş oranlı konum (0 to 1)
}

export interface RecordingStatus {
  isRecording: boolean;
  seconds: number;
  mediaRecorder: MediaRecorder | null;
}
