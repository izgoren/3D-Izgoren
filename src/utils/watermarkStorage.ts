import { WatermarkConfig } from '../types';

export const WATERMARK_STORAGE_KEY = 'PARSEL_STUDIO_DEFAULT_WATERMARK';

export interface DefaultCompanyInfo {
  companyName: string;
  phone: string;
  web: string;
  priceTag?: string;
  logoUrl: string | null;
  position?: WatermarkConfig['position'];
  adaParselPosition?: WatermarkConfig['adaParselPosition'];
  opacity?: number;
  scale?: number;
  showLocationBadge?: boolean;
  customPosition?: { xRatio: number; yRatio: number } | null;
  savedAt?: string;
}

/**
 * Saves current company watermark info as default to localStorage
 */
export function saveDefaultCompanyInfo(config: WatermarkConfig): boolean {
  try {
    const dataToSave: DefaultCompanyInfo = {
      companyName: config.companyName || '',
      phone: config.phone || '',
      web: config.web || '',
      priceTag: config.priceTag || '',
      logoUrl: config.logoUrl || null,
      position: config.position || 'bottom-right',
      adaParselPosition: config.adaParselPosition || 'inside',
      opacity: typeof config.opacity === 'number' ? config.opacity : 0.85,
      scale: typeof config.scale === 'number' ? config.scale : 1.0,
      showLocationBadge: config.showLocationBadge ?? true,
      customPosition: config.customPosition || null,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(WATERMARK_STORAGE_KEY, JSON.stringify(dataToSave));
    return true;
  } catch (e) {
    console.error('Failed to save default company info to localStorage:', e);
    return false;
  }
}

/**
 * Loads default company watermark info from localStorage if present
 */
export function loadDefaultCompanyInfo(): DefaultCompanyInfo | null {
  try {
    const raw = localStorage.getItem(WATERMARK_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load default company info from localStorage:', e);
    return null;
  }
}

/**
 * Clears saved default company info from localStorage
 */
export function clearDefaultCompanyInfo(): boolean {
  try {
    localStorage.removeItem(WATERMARK_STORAGE_KEY);
    return true;
  } catch (e) {
    console.error('Failed to clear default company info from localStorage:', e);
    return false;
  }
}

/**
 * Checks if saved default company info exists in localStorage
 */
export function hasSavedDefaultCompanyInfo(): boolean {
  try {
    return !!localStorage.getItem(WATERMARK_STORAGE_KEY);
  } catch {
    return false;
  }
}
