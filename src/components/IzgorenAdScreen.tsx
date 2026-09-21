import React, { useState } from 'react';
import {
  Globe,
  ExternalLink,
  Upload,
  FileCode2,
  MapPin,
  Phone,
  Mail,
  Compass,
  Layers,
  Mountain,
  CheckCircle2,
  Building2,
  ShieldCheck,
  ArrowUpRight,
} from 'lucide-react';

interface IzgorenAdScreenProps {
  onUploadFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  uploadLoading: boolean;
  uploadMsg: { text: string; isError: boolean } | null;
  onDismiss?: () => void;
  secondsRemaining?: number;
}

export const IzgorenAdScreen: React.FC<IzgorenAdScreenProps> = ({
  onUploadFile,
  fileInputRef,
  uploadLoading,
  uploadMsg,
  onDismiss,
  secondsRemaining,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const syntheticEvent = {
        target: {
          files: e.dataTransfer.files,
        },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      onUploadFile(syntheticEvent);
    }
  };

  const services = [
    {
      icon: Building2,
      title: 'İmar Uygulamaları & 18. Madde',
      desc: 'Parselasyon planları, şuyulandırma, tevhit, ifraz, terk ve ihdas işlemleri.',
    },
    {
      icon: Compass,
      title: 'Kadastro & Aplikasyon Hizmetleri',
      desc: 'Sınır tespiti, halihazır harita üretimi, kotlu kroki ve röperli kroki çalışmaları.',
    },
    {
      icon: Layers,
      title: '3D Lidar & İHA / Drone Haritalama',
      desc: 'Yüksek çözünürlüklü ortofoto, renkli nokta bulutu ve sayısal arazi modelleri (DEM).',
    },
    {
      icon: Mountain,
      title: 'Kamulaştırma & Altyapı Projeleri',
      desc: 'Enerji iletim hatları, karayolu, gölet ve baraj kamulaştırma mühendislik planları.',
    },
    {
      icon: ShieldCheck,
      title: 'Maden & Kübaj Hesaplamaları',
      desc: 'Açık ocak hacim hesapları, hafriyat kontrolleri ve deformasyon ölçümleri.',
    },
    {
      icon: Globe,
      title: 'CBS & Sayısal Şehir Modelleme',
      desc: 'Coğrafi Bilgi Sistemleri (CBS) veri üretimi, 3D parsel ve şehir modelleri.',
    },
  ];

  return (
    <div className="relative w-full h-full min-h-screen overflow-y-auto bg-slate-950 text-slate-100 flex flex-col items-center justify-between px-4 pt-4 pb-8 sm:pt-6 sm:pb-12 z-20">
      
      {/* Arka Plan Mimari Çizgi Efekti */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-35" />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-sky-950/20 via-slate-950/80 to-slate-950" />

      {/* 10 Saniyelik Açılış Geri Sayımı & Hemen Haritaya Geç Üst Çubuğu */}
      <div className="sticky top-2 z-30 mb-4 flex flex-wrap items-center justify-center gap-2 p-1.5 sm:p-2 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-sky-400/40 shadow-2xl shadow-black/80 max-w-xl w-full">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sky-500/20 text-sky-300 text-xs font-bold font-mono">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
          <span>{typeof secondsRemaining === 'number' ? `Açılış: ${secondsRemaining}sn` : 'Açılış Ekranı'}</span>
        </div>
        <span className="text-[11px] text-slate-300 hidden sm:inline">
          {typeof secondsRemaining === 'number' && secondsRemaining > 0
            ? `${secondsRemaining} saniye sonra uydu altlığı açılacaktır`
            : 'Uydu altlığı haritasına geçebilirsiniz'}
        </span>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-300 hover:to-blue-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-md shadow-sky-500/25 ml-auto sm:ml-0"
            title="Beklemeden Uydu Haritasına Geç"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Hemen Uydu Haritasına Geç</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Üst Logo ve Başlık Alanı */}
      <div className="relative z-10 w-full max-w-5xl flex flex-col items-center text-center space-y-4">
        
        {/* Kurumsal Rozet */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-500/10 border border-sky-400/30 text-sky-300 text-xs font-semibold tracking-wide shadow-lg shadow-sky-950/50">
          <ShieldCheck className="w-4 h-4 text-sky-400" />
          <span>TMMOB Harita Mühendislik & Müşavirlik Hizmetleri</span>
        </div>

        {/* Firma Ana Başlığı */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white drop-shadow-md">
            İzgören Harita Mühendislik
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Bursa ve Türkiye genelinde yüksek hassasiyetli kadastro, imar uygulamaları, 
            3D Lidar ve insansız hava aracı (İHA) fotogrametri çözümleri.
          </p>
        </div>

        {/* Resmi Web Sitesi Butonu */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <a
            href="https://www.izgorenharita.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs sm:text-sm shadow-xl shadow-sky-500/25 transition active:scale-95"
            title="İzgören Harita Resmi Web Sitesini Ziyaret Edin"
          >
            <Globe className="w-4 h-4 text-slate-950" />
            <span>www.izgorenharita.com</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>

          <a
            href="tel:05323950263"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-850 border border-white/15 hover:border-sky-400/40 text-slate-200 hover:text-white font-semibold text-xs sm:text-sm transition active:scale-95"
          >
            <Phone className="w-4 h-4 text-emerald-400" />
            <span>0532 395 02 63</span>
          </a>
        </div>
      </div>

      {/* ORTA BÖLÜM: KML YÜKLEME KARTI (Sadece KML yüklenince harita altlıkları açılır) */}
      <div className="relative z-10 w-full max-w-3xl my-8">
        <div className="p-5 sm:p-7 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-950/90 border-2 border-sky-400/50 shadow-2xl shadow-black/80 backdrop-blur-xl">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-white/10">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <FileCode2 className="w-5 h-5 text-sky-400" />
                <span>3D Harita ve Altlıkları Başlatın</span>
              </h2>
              <p className="text-xs text-sky-200/80 mt-0.5">
                Kendi parselinizin 3D uydu ve arazi modelini görüntülemek için dosya yükleyin
              </p>
            </div>
            <span className="self-start sm:self-center text-[10px] font-mono font-bold text-sky-300 bg-sky-500/20 px-2.5 py-1 rounded-full border border-sky-400/30">
              KML • KMZ • GeoJSON
            </span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".kml,.kmz,.geojson,.json"
            onChange={onUploadFile}
            className="hidden"
          />

          {/* Sürükle - Bırak & Tıkla Yükle Alanı */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`mt-5 py-7 px-4 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 text-center transition cursor-pointer ${
              isDragOver
                ? 'border-sky-300 bg-sky-500/20 scale-[1.01]'
                : 'border-sky-400/40 hover:border-sky-300 bg-sky-500/5 hover:bg-sky-500/10'
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-300 mb-1">
              <Upload className="w-6 h-6 animate-bounce" />
            </div>
            <div className="space-y-1">
              <span className="font-bold text-white text-sm sm:text-base block">
                {uploadLoading ? 'Dosya İşleniyor ve Harita Hazırlanıyor...' : '📁 KML veya KMZ Dosyanızı Buraya Sürükleyin veya Seçin'}
              </span>
              <p className="text-xs text-slate-400 max-w-md">
                TKGM Parsel Sorgu, Netcad, Google Earth veya Harita Kadastro KML/KMZ dosyaları desteklenir.
              </p>
            </div>
          </div>

          {/* Yükleme Geri Bildirim Mesajı */}
          {uploadMsg && (
            <div
              className={`mt-4 p-3 rounded-xl text-xs flex items-center gap-2.5 ${
                uploadMsg.isError
                  ? 'bg-red-500/20 text-red-200 border border-red-500/40'
                  : 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="font-medium">{uploadMsg.text}</span>
            </div>
          )}

          {/* Doğrudan Uydu Altlığına Geçiş Butonu */}
          {onDismiss && (
            <div className="mt-4 pt-3 border-t border-white/10 flex justify-center">
              <button
                type="button"
                onClick={onDismiss}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-750 border border-sky-400/40 hover:border-sky-400 text-sky-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer shadow-lg"
              >
                <Globe className="w-4 h-4 text-sky-400" />
                <span>Dosya Yüklemeden Doğrudan Uydu Altlığı Haritasını Aç</span>
                <ArrowUpRight className="w-3.5 h-3.5 opacity-80" />
              </button>
            </div>
          )}

        </div>
      </div>

      {/* ALT BÖLÜM: HİZMETLER VE KURUMSAL İLETİŞİM */}
      <div className="relative z-10 w-full max-w-5xl space-y-6">
        
        {/* Hizmet Kartları Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {services.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-sky-400/30 transition duration-200 flex items-start gap-3"
              >
                <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-400/20 flex items-center justify-center text-sky-400 shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* İletişim Şeridi */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          
          {/* Adres Bilgisi */}
          <div className="flex items-center gap-2.5 text-slate-300 text-center md:text-left">
            <MapPin className="w-4 h-4 text-rose-400 shrink-0 hidden sm:block" />
            <span>Kırcaali Mah., Kayalı Sok., Birel İş Merkezi No:22 Kat:2/8 Osmangazi / BURSA</span>
          </div>

          {/* İletişim Linkleri */}
          <div className="flex items-center gap-3">
            <a
              href="mailto:bilgi@izgorenharita.com"
              className="flex items-center gap-1.5 text-slate-300 hover:text-white transition"
            >
              <Mail className="w-3.5 h-3.5 text-sky-400" />
              <span>bilgi@izgorenharita.com</span>
            </a>

            <span className="text-slate-600">•</span>

            <a
              href="https://www.izgorenharita.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sky-400 hover:text-sky-300 font-semibold transition"
            >
              <span>izgorenharita.com</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

        </div>

      </div>

    </div>
  );
};
