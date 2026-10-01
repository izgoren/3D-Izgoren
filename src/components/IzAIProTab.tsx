import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Upload,
  CheckCircle2,
  FileText,
  Wand2,
  Headphones,
  Trash2,
  HelpCircle,
  Video,
  Building,
  MapPin,
  Flame,
  Copy,
} from 'lucide-react';
import { ParcelInfo, VoiceoverConfig, VoiceoverSourceType, WatermarkConfig } from '../types';

interface IzAIProTabProps {
  activeParcel: ParcelInfo | null;
  watermarkConfig?: WatermarkConfig;
  config: VoiceoverConfig;
  onChangeConfig: (partial: Partial<VoiceoverConfig>) => void;
  onAudioPlayStateChange?: (isPlaying: boolean) => void;
}

type AutoStyleType = 'sales' | 'reels' | 'luxury' | 'kurumsal';

export const IzAIProTab: React.FC<IzAIProTabProps> = ({
  activeParcel,
  watermarkConfig,
  config,
  onChangeConfig,
  onAudioPlayStateChange,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<VoiceoverSourceType>(config.source || 'ai');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genFeedback, setGenFeedback] = useState<{ text: string; isError?: boolean } | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);

  // Auto Style Option for Parcel + Company generation
  const [selectedAutoStyle, setSelectedAutoStyle] = useState<AutoStyleType>('sales');

  // Speech Recognition (Sesli Not Konuşma)
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  // Audio Recording (Orjinal Seslendirme)
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // TTS Speech Synthesis State
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Initialize Speech Recognition & Voices
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setSpeechSupported(false);
      }

      // Load SpeechSynthesis Voices
      const updateVoices = () => {
        if ('speechSynthesis' in window) {
          const voices = window.speechSynthesis.getVoices();
          // Filter Turkish or fallback voices
          const trVoices = voices.filter((v) => v.lang.includes('tr') || v.lang.includes('TR'));
          setAvailableVoices(trVoices.length > 0 ? trVoices : voices.slice(0, 10));
        }
      };

      updateVoices();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = updateVoices;
      }
    }
  }, []);

  // Quick Prompt Presets for manual prompt customization
  const promptPresets = [
    {
      title: '💎 Lüks & Prestijli',
      prompt: 'Bu parseli lüks ve prestijli bir yaşam alanı, villa veya özel yatırım projesi olarak anlatan seçkin ve etkileyici bir dille tanıt.',
    },
    {
      title: '📈 Yüksek Prim & Yatırım',
      prompt: 'Bu arsanın bölgedeki değer artışını, stratejik lokasyonunu ve kaçırılmayacak prim potansiyelini vurgulayan satış odaklı bir metin yaz.',
    },
    {
      title: '⚡ Reels / TikTok Dinamik',
      prompt: 'Sosyal medya için 15 saniyede ada, parsel ve fiyatı vurucu cümlelerle öne çıkaran çok enerjik bir Reels seslendirme metni oluştur.',
    },
    {
      title: '🏛️ Kurumsal Portföy',
      prompt: 'Gayrimenkul yatırım danışmanlığı ciddiyetiyle teknik imar durumunu, alanı ve güven veren kurumsal marka vizyonunu anlatan sunum metni üret.',
    },
  ];

  // Detected Parcel & Company Information
  const hasParcel = !!(
    activeParcel &&
    (activeParcel.city || activeParcel.adaNo || activeParcel.parselNo || activeParcel.areaM2 || activeParcel.name)
  );

  const parcelDetailsList: string[] = [];
  if (activeParcel?.city) {
    const loc = [activeParcel.city, activeParcel.district, activeParcel.neighborhood].filter(Boolean).join(' / ');
    parcelDetailsList.push(loc);
  }
  if (activeParcel?.adaNo || activeParcel?.parselNo) {
    parcelDetailsList.push(`Ada: ${activeParcel.adaNo || '-'} / Parsel: ${activeParcel.parselNo || '-'}`);
  }
  if (activeParcel?.areaM2 && activeParcel.areaM2 > 0) {
    parcelDetailsList.push(`${activeParcel.areaM2.toLocaleString('tr-TR')} m²`);
  }
  if (activeParcel?.price || watermarkConfig?.priceTag) {
    parcelDetailsList.push(activeParcel?.price || watermarkConfig?.priceTag || '');
  }

  const hasCompany = !!(
    watermarkConfig &&
    (watermarkConfig.companyName || watermarkConfig.phone || watermarkConfig.web)
  );

  const companyDetailsList: string[] = [];
  if (watermarkConfig?.companyName) companyDetailsList.push(watermarkConfig.companyName);
  if (watermarkConfig?.phone) companyDetailsList.push(watermarkConfig.phone);
  if (watermarkConfig?.web) companyDetailsList.push(watermarkConfig.web);

  // Stop Speech Synthesis
  const stopTTS = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    onAudioPlayStateChange?.(false);
  }, [onAudioPlayStateChange]);

  // Speak specific text using Web Speech API
  const speakScript = useCallback(
    (textToSpeak: string) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        setGenFeedback({ text: 'Tarayıcınız ses sentezleme (TTS) özelliğini desteklemiyor.', isError: true });
        return;
      }

      const clean = textToSpeak.trim();
      if (!clean) {
        setGenFeedback({ text: 'Seslendirilecek metin bulunamadı. Lütfen önce metin oluşturun.', isError: true });
        return;
      }

      window.speechSynthesis.cancel(); // Stop any pending speech
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = 'tr-TR';
      utterance.rate = config.voiceSpeed || 1.0;
      utterance.pitch = config.voicePitch || 1.0;

      if (availableVoices.length > 0 && availableVoices[selectedVoiceIndex]) {
        utterance.voice = availableVoices[selectedVoiceIndex];
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        onAudioPlayStateChange?.(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        onAudioPlayStateChange?.(false);
      };

      utterance.onerror = (e) => {
        console.error('Speech error:', e);
        setIsSpeaking(false);
        onAudioPlayStateChange?.(false);
      };

      window.speechSynthesis.speak(utterance);
    },
    [config.voiceSpeed, config.voicePitch, availableVoices, selectedVoiceIndex, onAudioPlayStateChange]
  );

  // Toggle Speak / Stop for current generatedScript
  const togglePlayTTS = () => {
    if (isSpeaking) {
      stopTTS();
    } else {
      if (!config.generatedScript?.trim()) {
        handleAutoGenerateScript({ andSpeak: true });
      } else {
        speakScript(config.generatedScript);
      }
    }
  };

  // Main Automatic Script Generator (Uses entered Parcel + Company Info)
  const handleAutoGenerateScript = async (options?: { andSpeak?: boolean; customStyle?: AutoStyleType }) => {
    setIsGenerating(true);
    setGenFeedback(null);

    if (isSpeaking) {
      stopTTS();
    }

    const currentStyle = options?.customStyle || selectedAutoStyle;

    let stylePrompt = '';
    let voiceTone = 'Kurumsal & Dinamik';
    if (currentStyle === 'reels') {
      stylePrompt = 'Sosyal medya Reels/TikTok için 15-20 saniyede ada, parsel, konum, alan ve fiyatı çok enerjik biçimde vurgulayan vurucu bir satış metni oluştur.';
      voiceTone = 'Enerjik & Satış Odaklı';
    } else if (currentStyle === 'luxury') {
      stylePrompt = 'Bu parseli lüks ve prestijli bir yaşam alanı, villa projesi veya özel yatırım olarak tanıtan seçkin bir seslendirme metni yaz.';
      voiceTone = 'Seçkin & Prestijli';
    } else if (currentStyle === 'kurumsal') {
      stylePrompt = 'Gayrimenkul yatırım danışmanlığı güveniyle teknik imar detaylarını, konumu ve kurumsal vizyonu anlatan profesyonel bir portföy metni üret.';
      voiceTone = 'Kurumsal & Güven Verici';
    } else {
      stylePrompt = 'Bölgenin değer artışını, ada/parsel künyesini, alan büyüklüğünü ve kaçırılmayacak fiyat avantajını öne çıkaran satış ve prim odaklı bir seslendirme metni üret.';
      voiceTone = 'İkna Edici & Sıcak';
    }

    const companyInfoObj = {
      companyName: watermarkConfig?.companyName || '',
      phone: watermarkConfig?.phone || '',
      web: watermarkConfig?.web || '',
    };

    try {
      const res = await fetch('/api/ai/script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: stylePrompt,
          parcelInfo: activeParcel,
          companyInfo: companyInfoObj,
          voiceTone,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.script && typeof data.script === 'string') {
          const generatedText = data.script.trim();
          onChangeConfig({ generatedScript: generatedText, enabled: true, source: 'ai' });
          setGenFeedback({ text: '✨ Parsel ve firma bilgileriyle senaryo başarıyla oluşturuldu!' });
          setIsGenerating(false);

          if (options?.andSpeak) {
            setTimeout(() => {
              speakScript(generatedText);
            }, 300);
          }
          return;
        }
      }
    } catch (err) {
      console.warn('Backend API script generation failed, falling back to smart client generator:', err);
    }

    // Client-side intelligent generative script fallback
    setTimeout(() => {
      const city = activeParcel?.city || 'Bölgenin';
      const district = activeParcel?.district ? `${activeParcel.district}'de` : 'en gözde lokasyonunda';
      const neighborhood = activeParcel?.neighborhood ? `${activeParcel.neighborhood} mevkiinde, ` : '';
      const ada = activeParcel?.adaNo ? `Ada ${activeParcel.adaNo}` : '';
      const parsel = activeParcel?.parselNo ? `Parsel ${activeParcel.parselNo}` : '';
      const adaParsel = [ada, parsel].filter(Boolean).join(' ');
      const area = activeParcel?.areaM2 && activeParcel.areaM2 > 0
        ? `${activeParcel.areaM2.toLocaleString('tr-TR')} metrekare büyüklüğündeki`
        : 'geniş kullanım alanına sahip';
      const price = activeParcel?.price
        ? `${activeParcel.price} avantajlı fiyatıyla`
        : (watermarkConfig?.priceTag ? `${watermarkConfig.priceTag} fiyatıyla` : 'cazip yatırım fırsatıyla');
      const desc = activeParcel?.description
        ? `${activeParcel.description}.`
        : 'Hızla prim yapan bu değerli parsel sizleri bekliyor.';

      const compName = watermarkConfig?.companyName?.trim();
      const compPhone = watermarkConfig?.phone?.trim();
      const compWeb = watermarkConfig?.web?.trim();

      let cta = '';
      if (compName && compPhone) {
        cta = `Detaylı bilgi ve randevu için ${compName} ile iletişime geçin. Arayın: ${compPhone}${compWeb ? ` veya ${compWeb}` : ''}.`;
      } else if (compName) {
        cta = `Bu fırsatı kaçırmamak için ${compName} güvencesiyle hemen iletişime geçin.`;
      } else if (compPhone) {
        cta = `Hemen arayın, yerinde görün: ${compPhone}.`;
      } else {
        cta = `Detaylı bilgi ve yer gösterimi için hemen iletişime geçebilirsiniz.`;
      }

      let script = '';
      if (currentStyle === 'reels') {
        script = `Dikkat! ${city} ${district} kaçırılmayacak yatırım fırsatı! ${adaParsel ? adaParsel + ' numaralı, ' : ''}${area} arsamız satışta! ${price}! ${cta}`;
      } else if (currentStyle === 'luxury') {
        script = `Hayallerinizdeki seçkin proje için mükemmel bir fırsat! ${city} ${district}, ${neighborhood}${area} bu özel parsel ${adaParsel ? `(${adaParsel})` : ''} konumuyla ayrıcalık sunuyor. ${desc} ${price} sunulan bu portföy için ${cta}`;
      } else if (currentStyle === 'kurumsal') {
        script = `Geleceğe güvenle yatırım yapın. ${city} ${district}, ${neighborhood}${area} taşınmazımız satışa sunulmuştur. ${adaParsel ? adaParsel + ' künyeli parsel, ' : ''}${desc} ${price} ${cta}`;
      } else {
        script = `${city} ${district}, ${neighborhood}yükselen değerinde satılık arsa fırsatı! ${adaParsel ? adaParsel + ' numaralı, ' : ''}${area} parselimiz ${price} satışa sunuldu. ${desc} ${cta}`;
      }

      onChangeConfig({ generatedScript: script, enabled: true, source: 'ai' });
      setGenFeedback({ text: '✨ Parsel ve firma bilgileriyle senaryo başarıyla oluşturuldu!' });
      setIsGenerating(false);

      if (options?.andSpeak) {
        setTimeout(() => {
          speakScript(script);
        }, 300);
      }
    }, 450);
  };

  // Speech Recognition (Sesli Not) Toggle
  const toggleSpeechRecognition = () => {
    if (!speechSupported) {
      setGenFeedback({ text: 'Tarayıcınız ses tanıma (SpeechRecognition) özelliğini desteklemiyor.', isError: true });
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      return;
    }

    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.lang = 'tr-TR';
      rec.continuous = false;
      rec.interimResults = true;

      rec.onstart = () => {
        setIsListening(true);
        setGenFeedback({ text: '🎙️ Dinleniyor... Lütfen parsel hakkında sesli notunuzu konuşun.' });
      };

      rec.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((r: any) => r[0].transcript)
          .join('');
        onChangeConfig({ prompt: transcript });
      };

      rec.onerror = (e: any) => {
        console.error('Speech error:', e);
        setIsListening(false);
        setGenFeedback({ text: 'Ses tanıma hatası veya mikrofon izni verilmedi.', isError: true });
      };

      rec.onend = () => {
        setIsListening(false);
        setGenFeedback({ text: '✅ Sesli not metne dönüştürüldü! "Metin & Seslendirme Üret" butonuna dokunabilirsiniz.' });
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (e: any) {
      console.error('Recognition start error:', e);
      setIsListening(false);
      setGenFeedback({ text: 'Mikrofon başlatılamadı: ' + (e.message || ''), isError: true });
    }
  };

  // Microphone Audio Recording (Orjinal Kendi Sesin)
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        const url = URL.createObjectURL(audioBlob);
        onChangeConfig({
          originalAudioBlobUrl: url,
          originalAudioDuration: recordSeconds,
          source: 'original',
          enabled: true,
        });
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecordingAudio(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone error:', err);
      setGenFeedback({ text: 'Mikrofon izni alınamadı veya aygıt bulunamadı: ' + err.message, isError: true });
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      mediaRecorderRef.current.stop();
      setIsRecordingAudio(false);
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
      }
    }
  };

  // Upload Audio File
  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    onChangeConfig({
      originalAudioBlobUrl: url,
      source: 'original',
      enabled: true,
    });
    setGenFeedback({ text: `🎵 "${file.name}" ses dosyası yüklendi ve video kaydına bağlandı.` });
  };

  const handleCopyScript = () => {
    if (!config.generatedScript) return;
    navigator.clipboard.writeText(config.generatedScript);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-3.5">
      {/* 1. ÜST BAŞLIK & İZAİPRO ROZETİ */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-violet-600/25 via-fuchsia-600/20 to-amber-500/25 border-2 border-fuchsia-400/50 shadow-xl shadow-fuchsia-950/40 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-400 to-fuchsia-500 flex items-center justify-center text-slate-950 shadow">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black bg-gradient-to-r from-amber-300 via-fuchsia-200 to-white bg-clip-text text-transparent tracking-wide">
                  izAIpro
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-fuchsia-500/30 text-fuchsia-200 border border-fuchsia-400/40">
                  AI Ses & Video Stüdyosu
                </span>
              </div>
              <p className="text-[10px] text-slate-300">
                Parsel ve firma bilgilerinizle otomatik metin ve profesyonel Türkçe seslendirme
              </p>
            </div>
          </div>
        </div>

        {/* Ana Mod Seçici (AI Seslendirme vs Orijinal Seslendirme) */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10 mt-2">
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('ai');
              onChangeConfig({ source: 'ai' });
            }}
            className={`py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeSubTab === 'ai'
                ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md shadow-fuchsia-600/30'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5 text-amber-300" />
            <span>Yapay Zeka (AI) Seslendirme</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubTab('original');
              onChangeConfig({ source: 'original' });
            }}
            className={`py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeSubTab === 'original'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Mic className="w-3.5 h-3.5 text-amber-400" />
            <span>Orijinal (Kendi) Seslendirme</span>
          </button>
        </div>
      </div>

      {/* 2. MOD A: YAPAY ZEKA SESLENDİRME */}
      {activeSubTab === 'ai' && (
        <div className="space-y-3.5">
          {/* A. PARSEL & FİRMA BİLGİLERİYLE OTOMATİK METİN & SESLENDİRME KARTI (EN ÜSTTE & VURUCU) */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-violet-950/70 via-slate-900/90 to-fuchsia-950/70 border-2 border-fuchsia-400/50 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
                <span className="text-xs font-bold text-white">
                  Parsel & Firma ile Otomatik Metin ve Seslendirme
                </span>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                1 Tıkla Hazır
              </span>
            </div>

            {/* Algılanan Bilgiler Durum Rozetleri */}
            <div className="space-y-1.5 bg-black/40 p-2.5 rounded-xl border border-white/10 text-[11px]">
              {/* Parsel Bilgisi */}
              <div className="flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="text-[10px] text-slate-400 font-semibold block">Parsel Bilgisi:</span>
                  {hasParcel ? (
                    <span className="text-emerald-300 font-medium text-[11px]">
                      {parcelDetailsList.join(' • ')}
                    </span>
                  ) : (
                    <span className="text-amber-400/80 text-[10px] italic">
                      Parsel bilgisi henüz girilmedi (Parsel sekmesinden il/ada/parsel girebilir veya KML yükleyebilirsiniz).
                    </span>
                  )}
                </div>
              </div>

              {/* Firma Bilgisi */}
              <div className="flex items-start gap-1.5 pt-1.5 border-t border-white/5">
                <Building className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="text-[10px] text-slate-400 font-semibold block">Firma Bilgisi:</span>
                  {hasCompany ? (
                    <span className="text-sky-300 font-medium text-[11px]">
                      {companyDetailsList.join(' • ')}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-[10px] italic">
                      Firma bilgisi girilmedi (Firma sekmesinden marka adı ve telefon ekleyebilirsiniz).
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Senaryo Tarzı Seçimi (Satış, Reels, Lüks, Kurumsal) */}
            <div>
              <label className="text-[10px] text-slate-300 font-semibold block mb-1.5">
                Otomatik Senaryo Tonu:
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'sales', label: '📈 Satış & Prim', hint: 'Yatırım fırsatı & fiyat odaklı' },
                  { id: 'reels', label: '⚡ Reels / TikTok', hint: '15-20 sn vurucu ve dinamik' },
                  { id: 'luxury', label: '💎 Lüks & Prestij', hint: 'Villa & prestijli proje üslubu' },
                  { id: 'kurumsal', label: '🏛️ Kurumsal Portföy', hint: 'Güven veren teknik sunum' },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setSelectedAutoStyle(st.id as AutoStyleType)}
                    className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                      selectedAutoStyle === st.id
                        ? 'bg-gradient-to-r from-fuchsia-600/40 to-violet-600/40 border-fuchsia-400 text-white shadow'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <div className="text-[11px] font-bold">{st.label}</div>
                    <div className="text-[8px] text-slate-400">{st.hint}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 2 ANA BUTON: OTOMATİK METİN ÜRET & OTOMATİK METİN + SESLENDİR */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {/* Buton 1: Otomatik Metin Üret */}
              <button
                type="button"
                disabled={isGenerating}
                onClick={() => handleAutoGenerateScript({ andSpeak: false })}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 hover:opacity-95 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-fuchsia-600/25 transition cursor-pointer disabled:opacity-50"
                title="Girilen parsel ve firma bilgilerini kullanarak tanıtım metni oluştur"
              >
                <Wand2 className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>{isGenerating ? 'Metin Hazırlanıyor...' : '🪄 Otomatik Metin Üret'}</span>
              </button>

              {/* Buton 2: Otomatik Metin Üret ve Hemen Seslendir */}
              <button
                type="button"
                disabled={isGenerating}
                onClick={() => handleAutoGenerateScript({ andSpeak: true })}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:opacity-95 active:scale-95 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition cursor-pointer disabled:opacity-50"
                title="Parsel ve firma bilgilerinden metin üretir ve anında Türkçe seslendirir"
              >
                <Volume2 className="w-3.5 h-3.5 text-slate-950" />
                <span>⚡ Metin Üret ve Seslendir</span>
              </button>
            </div>
          </div>

          {/* B. ÖZEL SESLENDİRME & OYNATICI KONTROLÜ (AYRICA SESLENDİRME BUTONU) */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-sky-400/30 shadow-lg space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-1.5">
                <Headphones className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold text-white">
                  Seslendirme Oynatıcı & Kontrol Paneli
                </span>
              </div>
              {isSpeaking && (
                <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-rose-500/20 text-rose-300 border border-rose-400/40 flex items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                  <span>Şu An Seslendiriliyor</span>
                </span>
              )}
            </div>

            {/* BÜYÜK SESLENDİRME BUTONU (DİNLE / DURDUR) */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlayTTS}
                className={`flex-1 py-3 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2.5 shadow-xl transition cursor-pointer active:scale-98 ${
                  isSpeaking
                    ? 'bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white shadow-rose-600/30 ring-2 ring-rose-400'
                    : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/30 ring-2 ring-emerald-400/50'
                }`}
              >
                {isSpeaking ? (
                  <>
                    <Pause className="w-4 h-4" />
                    <span>Seslendirmeyi Durdur</span>
                    {/* Ses Dalgaları Görsel Efekti */}
                    <div className="flex items-center gap-0.5 ml-1">
                      <span className="w-1 h-3.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1 h-5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 h-2.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      <span className="w-1 h-4 bg-white rounded-full animate-bounce" style={{ animationDelay: '450ms' }} />
                    </div>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 text-slate-950" />
                    <span>Metni Seslendir (Dinle)</span>
                  </>
                )}
              </button>

              {config.generatedScript && (
                <button
                  type="button"
                  onClick={() => onChangeConfig({ generatedScript: '' })}
                  className="p-3 rounded-xl bg-white/10 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-white/10 transition cursor-pointer"
                  title="Metni Temizle"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Ses Hızı & Ton Ayarları */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-2 rounded-xl bg-black/40 border border-white/10">
                <div className="flex justify-between text-[10px] text-slate-300 mb-1 font-medium">
                  <span>Okuma Hızı:</span>
                  <span className="text-sky-300 font-mono font-bold">{config.voiceSpeed.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min={0.8}
                  max={1.4}
                  step={0.1}
                  value={config.voiceSpeed}
                  onChange={(e) => onChangeConfig({ voiceSpeed: parseFloat(e.target.value) })}
                  className="w-full accent-sky-400 cursor-pointer h-1.5 bg-white/10 rounded-lg"
                />
              </div>

              <div className="p-2 rounded-xl bg-black/40 border border-white/10">
                <div className="flex justify-between text-[10px] text-slate-300 mb-1 font-medium">
                  <span>Ses Tonu:</span>
                  <span className="text-amber-300 font-mono font-bold">{config.voicePitch.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={0.8}
                  max={1.2}
                  step={0.05}
                  value={config.voicePitch}
                  onChange={(e) => onChangeConfig({ voicePitch: parseFloat(e.target.value) })}
                  className="w-full accent-amber-400 cursor-pointer h-1.5 bg-white/10 rounded-lg"
                />
              </div>
            </div>

            {/* Mevcut Türkçe Sesler Varsa Seçici */}
            {availableVoices.length > 1 && (
              <div className="pt-1">
                <label className="text-[10px] text-slate-300 block mb-1 font-medium">
                  Seslendirici Tonu (Sistem Sesi):
                </label>
                <select
                  value={selectedVoiceIndex}
                  onChange={(e) => setSelectedVoiceIndex(parseInt(e.target.value, 10))}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-black/60 border border-white/10 text-white text-[11px] focus:outline-none focus:border-sky-400 cursor-pointer"
                >
                  {availableVoices.map((v, i) => (
                    <option key={i} value={i} className="bg-slate-900 text-white">
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* C. MEVCUT SENARYO METNİ & DÜZENLEME KUTUSU */}
          <div className="space-y-2 p-3 rounded-2xl bg-black/40 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                <span>Seslendirilecek Metin:</span>
              </span>

              <div className="flex items-center gap-2">
                {config.generatedScript && (
                  <>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {config.generatedScript.split(/\s+/).filter(Boolean).length} Kelime (~
                      {Math.round(config.generatedScript.split(/\s+/).filter(Boolean).length * 0.45)} sn)
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyScript}
                      className="text-[10px] text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer bg-white/10 px-2 py-0.5 rounded"
                      title="Metni Kopyala"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedScript ? 'Kopyalandı' : 'Kopyala'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            <textarea
              value={config.generatedScript}
              onChange={(e) => onChangeConfig({ generatedScript: e.target.value })}
              placeholder="Yukarıdaki 'Otomatik Metin Üret' butonuna basarak parsel ve firma bilgilerinizle anında metin oluşturabilir veya buraya dilediğiniz tanıtım metnini yazabilirsiniz..."
              rows={4}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950/80 border border-white/15 text-amber-100 text-xs font-sans leading-relaxed focus:outline-none focus:border-amber-400 placeholder:text-slate-500"
            />
          </div>

          {/* Geri Bildirim Bildirimi */}
          {genFeedback && (
            <div
              className={`p-2.5 rounded-xl text-[11px] flex items-center gap-2 ${
                genFeedback.isError
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{genFeedback.text}</span>
            </div>
          )}

          {/* D. GELİŞMİŞ: ÖZEL PROMPT YAZMA VEYA SESLİ NOT MİKROFONU (İSTEĞE BAĞLI) */}
          <details className="p-3 rounded-xl bg-white/5 border border-white/10 group">
            <summary className="text-[11px] font-bold text-fuchsia-300 cursor-pointer flex items-center justify-between select-none">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
                <span>Özel Prompt veya Sesli Not ile Özelleştir (Opsiyonel)</span>
              </span>
              <span className="text-[10px] text-slate-400 group-open:rotate-180 transition">▼</span>
            </summary>

            <div className="pt-3 space-y-3">
              {/* Hızlı İlham Şablonları */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-1 font-medium">
                  Örnek İlham Cümleleri:
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {promptPresets.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onChangeConfig({ prompt: p.prompt })}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-fuchsia-500/15 border border-white/10 hover:border-fuchsia-400/40 text-left transition cursor-pointer group/btn"
                    >
                      <span className="text-[10px] font-bold text-white group-hover/btn:text-fuchsia-300 block truncate">
                        {p.title}
                      </span>
                      <span className="text-[8px] text-slate-400 line-clamp-1 block">
                        {p.prompt}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt Kutusu & Sesli Not */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-slate-300 font-medium">
                    Özel Talimatınız veya Sesli Notunuz:
                  </label>

                  <button
                    type="button"
                    onClick={toggleSpeechRecognition}
                    className={`py-1 px-2.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
                      isListening
                        ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30 ring-1 ring-rose-300'
                        : 'bg-white/10 hover:bg-sky-500/20 text-sky-300 border border-sky-400/30'
                    }`}
                    title="Mikrofona konuşarak sesli not alın, yazıya dökülsün"
                  >
                    {isListening ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                        <span>Dinleniyor (Durdur)</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3 h-3 text-sky-400" />
                        <span>🎙️ Sesli Not Konuş</span>
                      </>
                    )}
                  </button>
                </div>

                <textarea
                  value={config.prompt}
                  onChange={(e) => onChangeConfig({ prompt: e.target.value })}
                  placeholder="Örn: Bu parseli Nilüfer'in yükselen değerinde, prim potansiyeli yüksek bir yatırım fırsatı olarak anlatan heyecanlı bir Reels metni oluştur..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-fuchsia-400 resize-none leading-relaxed"
                />

                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => handleAutoGenerateScript({ andSpeak: false })}
                  className="w-full py-2 px-3 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Özel Talimatla Senaryoyu Yeniden Üret</span>
                </button>
              </div>
            </div>
          </details>
        </div>
      )}

      {/* 3. MOD B: ORİJİNAL (KENDİ) SESLENDİRME */}
      {activeSubTab === 'original' && (
        <div className="space-y-3.5 p-3.5 rounded-xl bg-white/5 border border-amber-400/30 shadow-lg">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-amber-400" />
              <span>Kendi Sesinizi Kaydedin veya Yükleyin</span>
            </span>
            <span className="text-[9px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-400/30 font-medium">
              Stüdyo Kalitesi
            </span>
          </div>

          <p className="text-[10px] text-slate-300 leading-relaxed">
            Parsel tanıtımı için kendi konuşmanızı mikrofonunuzdan kaydedebilir veya hazır ses dosyanızı (.mp3, .wav, .m4a) ekleyebilirsiniz. Video kaydı başladığında ses videoya otomatik gömülür.
          </p>

          {/* Mikrofon Kayıt Kontrol Paneli */}
          <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-2.5 text-center">
            {isRecordingAudio ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                  <span className="font-mono text-base font-bold text-rose-400">
                    {formatSec(recordSeconds)}
                  </span>
                  <span className="text-[10px] text-rose-200 font-semibold">KAYDEDİLİYOR...</span>
                </div>
                <button
                  type="button"
                  onClick={stopAudioRecording}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 cursor-pointer active:scale-95"
                >
                  <MicOff className="w-4 h-4" />
                  <span>Ses Kaydını Durdur ve Kaydet</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={startAudioRecording}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/25 transition cursor-pointer active:scale-95"
                >
                  <Mic className="w-4 h-4" />
                  <span>🎤 Şimdi Kendi Sesinizi Kaydedin</span>
                </button>

                {config.originalAudioBlobUrl && (
                  <div className="p-2 rounded-lg bg-white/5 border border-emerald-500/30 text-left space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Kayıtlı Ses Dosyanız Aktif</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => onChangeConfig({ originalAudioBlobUrl: null })}
                        className="text-[9px] text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
                        title="Kaydı Sil"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Sil</span>
                      </button>
                    </div>

                    <audio
                      ref={audioPlayerRef}
                      src={config.originalAudioBlobUrl}
                      controls
                      className="w-full h-8 mt-1"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Veya Ses Dosyası Yükleme */}
          <div className="pt-2 border-t border-white/10">
            <label className="text-[10px] text-slate-400 block mb-1 font-medium">
              Veya Hazır Ses Dosyası Yükle (.mp3, .wav, .m4a):
            </label>
            <label className="w-full py-2 px-3 rounded-xl border border-dashed border-white/20 hover:border-sky-400 bg-white/5 hover:bg-white/10 flex items-center justify-center gap-2 text-slate-300 hover:text-white transition cursor-pointer text-xs">
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              <span>📁 Cihazınızdan Ses Dosyası Seçin</span>
              <input
                type="file"
                accept="audio/*,.mp3,.wav,.m4a,.aac"
                onChange={handleAudioFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}

      {/* 4. VİDEO KAYDI İLE ENTEGRASYON KARTI (SESİ VİDEOYA DAHİL ET) */}
      <div className="p-3 rounded-xl bg-gradient-to-br from-sky-500/10 via-indigo-500/10 to-fuchsia-500/15 border border-sky-400/40 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-sky-400" />
            <div>
              <span className="text-[11px] font-bold text-white block">
                Video Kaydına Seslendirmeyi Göm
              </span>
              <span className="text-[9px] text-slate-300 block">
                720p HD MP4 indirilirken ses otomatik videoya dahil edilir
              </span>
            </div>
          </div>

          <input
            type="checkbox"
            checked={config.includeInVideo}
            onChange={(e) => onChangeConfig({ includeInVideo: e.target.checked })}
            className="w-4 h-4 accent-sky-400 cursor-pointer rounded"
          />
        </div>

        <div className="text-[9px] text-slate-300/80 bg-black/30 p-2 rounded-lg leading-relaxed flex items-start gap-1.5 border border-white/5">
          <HelpCircle className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
          <span>
            {activeSubTab === 'ai'
              ? 'Yapay zeka seslendirmesi, 720p video kaydı başladığı anda senkronize başlatılır ve indirilen video dosyasında sesli olarak yer alır.'
              : 'Kaydettiğiniz veya yüklediğiniz orijinal ses, video kaydı başladığında baştan oynatılır ve videoya gömülür.'}
          </span>
        </div>
      </div>
    </div>
  );
};
