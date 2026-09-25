import { CameraState, ParcelStyle, WatermarkConfig, BaseMapType, VideoFormatType } from '../types';
import { WATERMARK_STORAGE_KEY, saveDefaultCompanyInfo, loadDefaultCompanyInfo } from './watermarkStorage';

export const TOUR_SETTINGS_KEY = 'PARSEL_STUDIO_DEFAULT_3D_TOUR';
export const STYLE_SETTINGS_KEY = 'PARSEL_STUDIO_DEFAULT_STYLE';
export const ICON_BAR_SETTINGS_KEY = 'PARSEL_STUDIO_ICON_BAR_PREFS';

export interface DefaultTourSettings {
  tourSpeed: number;
  pitch: number;
  range: number;
  baseMap?: BaseMapType;
  videoFormat?: VideoFormatType;
  savedAt?: string;
}

export interface DefaultStyleSettings extends ParcelStyle {
  savedAt?: string;
}

export interface IconBarPrefs {
  scale: number; // 0.8, 1.0, 1.25
  isHidden: boolean;
}

/**
 * 3D Tur ayarlarını varsayılan olarak kaydeder
 */
export function saveDefaultTourSettings(settings: {
  tourSpeed: number;
  pitch: number;
  range: number;
  baseMap?: BaseMapType;
  videoFormat?: VideoFormatType;
}): boolean {
  try {
    const data: DefaultTourSettings = {
      tourSpeed: settings.tourSpeed,
      pitch: settings.pitch,
      range: settings.range,
      baseMap: settings.baseMap,
      videoFormat: settings.videoFormat,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(TOUR_SETTINGS_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('Failed to save default tour settings:', e);
    return false;
  }
}

/**
 * Kayıtlı 3D Tur varsayılan ayarlarını getirir
 */
export function loadDefaultTourSettings(): DefaultTourSettings | null {
  try {
    const raw = localStorage.getItem(TOUR_SETTINGS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load default tour settings:', e);
    return null;
  }
}

/**
 * Parsel stil ayarlarını varsayılan olarak kaydeder
 */
export function saveDefaultStyleSettings(style: ParcelStyle): boolean {
  try {
    const data: DefaultStyleSettings = {
      ...style,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STYLE_SETTINGS_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('Failed to save default style settings:', e);
    return false;
  }
}

/**
 * Kayıtlı parsel stil varsayılanlarını getirir
 */
export function loadDefaultStyleSettings(): DefaultStyleSettings | null {
  try {
    const raw = localStorage.getItem(STYLE_SETTINGS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load default style settings:', e);
    return null;
  }
}

/**
 * İkon barı tercihlerini kaydeder
 */
export function saveIconBarPrefs(prefs: Partial<IconBarPrefs>): boolean {
  try {
    const existing = loadIconBarPrefs();
    const data: IconBarPrefs = {
      ...existing,
      ...prefs,
    };
    localStorage.setItem(ICON_BAR_SETTINGS_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * İkon barı tercihlerini getirir
 */
export function loadIconBarPrefs(): IconBarPrefs {
  try {
    const raw = localStorage.getItem(ICON_BAR_SETTINGS_KEY);
    if (!raw) return { scale: 1.0, isHidden: false };
    const parsed = JSON.parse(raw);
    return {
      scale: typeof parsed.scale === 'number' ? parsed.scale : 1.0,
      isHidden: !!parsed.isHidden,
    };
  } catch (e) {
    return { scale: 1.0, isHidden: false };
  }
}

/**
 * Tüm ayarları (3D Tur, Firma ve Stil) tek tıkla varsayılan olarak kaydeder
 */
export function saveAllDefaults(params: {
  tour: { tourSpeed: number; pitch: number; range: number; baseMap?: BaseMapType; videoFormat?: VideoFormatType };
  company: WatermarkConfig;
  style: ParcelStyle;
}): boolean {
  const tOk = saveDefaultTourSettings(params.tour);
  const cOk = saveDefaultCompanyInfo(params.company);
  const sOk = saveDefaultStyleSettings(params.style);
  return tOk && cOk && sOk;
}

/**
 * Tüm kayıtlı varsayılanları sıfırlar
 */
export function resetAllDefaults(): boolean {
  try {
    localStorage.removeItem(TOUR_SETTINGS_KEY);
    localStorage.removeItem(WATERMARK_STORAGE_KEY);
    localStorage.removeItem(STYLE_SETTINGS_KEY);
    localStorage.removeItem(ICON_BAR_SETTINGS_KEY);
    return true;
  } catch (e) {
    return false;
  }
}
