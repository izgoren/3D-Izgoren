import React from 'react';
import {
  MapPin,
  Upload,
  CheckCircle2,
  Globe,
  Sparkles,
  FileCode2,
} from 'lucide-react';
import { ParcelInfo } from '../types';
import { DEFAULT_PARCEL } from '../data/demoParcels';
import { formatArea } from '../utils/geoUtils';
import { PriceInput } from './PriceInput';

interface ParcelTabProps {
  activeParcel: ParcelInfo | null;
  onParcelLoaded: (parcel: ParcelInfo) => void;
  onUpdateParcel: (partial: Partial<ParcelInfo>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadLoading: boolean;
  uploadMsg: { text: string; isError: boolean } | null;
}

export const ParcelTab: React.FC<ParcelTabProps> = ({
  activeParcel,
  onParcelLoaded,
  onUpdateParcel,
  fileInputRef,
  handleFileUpload,
  uploadLoading,
  uploadMsg,
}) => {
  const areaDetails = activeParcel ? formatArea(activeParcel.areaM2) : null;

  return (
    <div className="space-y-4">
      
      {/* 1. KML / KMZ / GEOJSON YÜKLEME KUTUSU (EN BAŞA ALINDI) */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-sky-500/15 via-blue-500/10 to-indigo-500/15 border-2 border-sky-400/50 shadow-xl shadow-sky-950/40 space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-[12px] font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
            <FileCode2 className="w-4 h-4 text-sky-400 shrink-0" />
            <span>Kendi Parsel Dosyanızı Yükleyin</span>
          </label>
          <span className="text-[9px] font-mono font-bold text-sky-300 bg-sky-500/25 px-2 py-0.5 rounded-full border border-sky-400/40">
            KML • KMZ • GeoJSON
          </span>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".kml,.kmz,.geojson,.json"
          onChange={handleFileUpload}
          className="hidden"
        />

        <button
          type="button"
          disabled={uploadLoading}
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-4 px-3 border-2 border-dashed border-sky-400/60 hover:border-sky-300 active:scale-98 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 flex flex-col items-center justify-center gap-1.5 text-center transition cursor-pointer shadow-inner"
        >
          <div className="w-8 h-8 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-300">
            <Upload className="w-4 h-4" />
          </div>
          <span className="font-bold text-white text-xs tracking-wide">
            {uploadLoading ? 'Dosya Ayrıştırılıyor...' : '📁 .KML, .KMZ veya .GeoJSON Dosyası Seçin'}
          </span>
          <span className="text-[10px] text-sky-200/80">
            Netcad, Google Earth, TKGM Parsel Sorgu veya Harita Kadastro Dosyası
          </span>
        </button>

        {uploadMsg && (
          <div
            className={`p-2.5 rounded-xl text-[11px] flex items-center gap-2 ${
              uploadMsg.isError
                ? 'bg-red-500/20 text-red-200 border border-red-500/40'
                : 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-medium">{uploadMsg.text}</span>
          </div>
        )}
      </div>

      {/* 2. MANUEL PARSEL BİLGİLERİ (ELLE GİRİŞ & DÜZENLEME) */}
      <div className="space-y-3 p-3.5 rounded-xl bg-white/5 border border-sky-400/30">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-rose-400" />
            Parsel Bilgileri (Elle Giriş & Düzenleme)
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

        {/* Yüzölçümü (m²) */}
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

        {/* Satış Bedeli / Fiyat (Otomatik Basamaklama & Döviz Cinsi Seçimi) */}
        <div className="pt-2 border-t border-white/10">
          <PriceInput
            value={activeParcel?.price || ''}
            onChange={(formatted) => onUpdateParcel({ price: formatted })}
            label="Satış Bedeli (Otomatik Basamaklı & Dövizli):"
            placeholder="Örn: 18500000"
          />
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

      {/* 3. AKTİF PARSEL DETAY KARTI VEYA BAŞLANGIÇ DURUMU */}
      {activeParcel && areaDetails ? (
        <div className="p-3.5 rounded-xl bg-white/5 border border-sky-400/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-white truncate">
              {activeParcel.name}
            </span>
            <span className="text-[10px] text-sky-400 font-mono">
              {activeParcel.coordinates?.length || 0} Köşe Noktası
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
                {activeParcel.perimeterM?.toLocaleString('tr-TR') || '0'} m
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

          {activeParcel.price && (
            <div className="text-[11px] text-emerald-300 flex items-center justify-between border-t border-white/10 pt-2">
              <span>Satış Bedeli:</span>
              <span className="font-mono font-bold text-emerald-400">
                {activeParcel.price}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-sky-950/40 border border-sky-500/30 space-y-2.5">
          <div className="flex items-center gap-2 text-sky-400">
            <Globe className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-xs font-bold text-white">3D Küresel Harita Hazır</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Yukarıdaki <strong>Kendi Parsel Dosyanızı Yükleyin</strong> butonundan KML/KMZ dosyanızı aktarabilir veya aşağıdaki örnek parselle hemen denemeye başlayabilirsiniz.
          </p>
          <div className="pt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onParcelLoaded(DEFAULT_PARCEL)}
              className="text-[11px] px-3 py-2 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 flex items-center gap-1.5 transition active:scale-95 cursor-pointer font-semibold"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Örnek Parseli Yükle (Bursa)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
