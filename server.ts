import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = 3000;

  app.use(express.json());

  // Shared Gemini client instance with required User-Agent
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // AI Script Generation Endpoint for izAIpro voiceover
  app.post('/api/ai/script', async (req, res) => {
    try {
      const { prompt, parcelInfo, companyInfo, voiceTone } = req.body;
      const model = 'gemini-3.8-flash';

      let parcelContext = '';
      if (parcelInfo) {
        parcelContext = `
Aktif Parsel Bilgileri:
- İl / İlçe: ${parcelInfo.city || ''} / ${parcelInfo.district || ''}
- Mahalle / Mevkii: ${parcelInfo.neighborhood || ''}
- Ada / Parsel: Ada ${parcelInfo.adaNo || '-'} Parsel ${parcelInfo.parselNo || '-'}
- Alan (m²): ${parcelInfo.areaM2 ? parcelInfo.areaM2 + ' m²' : ''}
- Satış Fiyatı: ${parcelInfo.price || ''}
- Nitelik / Açıklama: ${parcelInfo.description || ''}
`;
      }

      let companyContext = '';
      if (companyInfo) {
        companyContext = `
Firma ve İletişim Bilgileri:
- Firma / Marka Adı: ${companyInfo.companyName || ''}
- İletişim Telefonu: ${companyInfo.phone || ''}
- Web Sitesi: ${companyInfo.web || ''}
`;
      }

      const systemPrompt = `Sen Türkiye'nin en profesyonel gayrimenkul video senaristi ve seslendirme uzmanısın.
Kullanıcının gayrimenkul/arsa parseli için sosyal medya (Reels, TikTok, YouTube, Instagram) videolarına tam oturan akıcı, çarpıcı ve satış odaklı bir Türkçe seslendirme metni yazacaksın.
Kurallar:
1. Metin konuşma dilinde olmalı, telaffuzu akıcı ve ritmik olmalı.
2. Yaklaşık 20-35 saniye sürecek uzunlukta (50-80 kelime) olmalı.
3. Varsa ada, parsel, konum, alan büyüklüğü ve fiyat gibi can alıcı detayları metinde doğal şekilde geçir.
4. Varsa firma adı, telefon veya web sitesi bilgilerini metnin sonunda dinleyicileri harekete geçirecek profesyonel ve sıcak bir kapanış çağrısı (Call to Action) olarak mutlaka ekle (Örnek: "Detaylı bilgi ve randevu için [Firma Adı] ile iletişime geçin, arayın: [Telefon]").
5. Çıktıda ASLA parantez içi sahne notu, müzik işareti, başlık veya yönlendirme yazma. SADECE spikerin seslendireceği düz metni döndür.
6. İstenen Anlatım Tonu: ${voiceTone || 'Kurumsal & Dinamik'}.`;

      const userMessage = `${systemPrompt}\n\n${parcelContext}\n${companyContext}\nKullanıcı Promptu / Tercihi: ${prompt || 'Bu parsel ve firma bilgileriyle en etkili satış ve tanıtım metnini oluştur.'}`;

      const response = await ai.models.generateContent({
        model,
        contents: userMessage,
      });

      const script = response.text?.trim() || '';
      res.json({ success: true, script });
    } catch (error: any) {
      console.error('Gemini API script error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Yapay zeka metin üretimi başarısız oldu.',
      });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`3D Parsel Studio Server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
