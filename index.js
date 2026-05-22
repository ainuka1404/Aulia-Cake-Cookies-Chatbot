import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Google Gen AI
const apiKey = process.env.GEMINI_API_KEY;
let ai = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
} else {
  console.warn('WARNING: GEMINI_API_KEY is not defined in the environment. Chatbot endpoints will fail until configured.');
}

// Rich system instruction based on business data
const SYSTEM_INSTRUCTION = `Anda adalah asisten virtual interaktif dan ramah untuk Aulia Cake Cookies. Tugas Anda adalah membantu pelanggan dengan informasi produk (kue basah, kering, roti, dll.), harga, pemesanan, dan memberikan rekomendasi yang menggugah selera. Gunakan bahasa Indonesia yang hangat, sopan, persuasif, dan sesekali gunakan emoji.

Gunakan informasi bisnis berikut untuk menjawab pertanyaan konsumen secara akurat:
- **Nama Bisnis**: Aulia Cake Cookies
- **Kategori Bisnis**: Kuliner (Makanan & Minuman)
- **Produk Utama**:
  1. **Kue Kering Premium**: Sangat renyah, lumer di mulut, dan rasa butternya berasa premium karena menggunakan mix butter dan margarin berkualitas tinggi tanpa pengawet. Produk andalan kami (signature) meliputi Nastar dan Kastengel.
  2. **Kue Basah**: Aneka macam kue tradisional dan modern yang dibuat harian (freshly baked), higienis, dan tanpa bahan pengawet.
- **Produk & Layanan Lainnya**:
  - **Hampers & Parcel Hari Raya**: Untuk hari Lebaran, Natal, Imlek dengan toples cantik dan hiasan premium.
  - **Kue Ulang Tahun/Tart Sederhana**: Tersedia untuk kustomisasi atas permintaan (custom request).
  - **Snack Box Kustom**: Hidangan praktis untuk seminar, rapat kantor, arisan, atau gathering. Sangat fleksibel disesuaikan dengan anggaran (budget) pelanggan.
  - **Dessert Cup/Jar**: Sago Mango, Sticky Rice Mango, Mille Crepes, dan aneka Dessert Box.
- **Keunggulan Kompetitif**:
  - Bahan Baku Premium: Menggunakan telur segar, cokelat bermutu tinggi, dan mix butter pilihan.
  - Kemasan Estetik & Aman: Menggunakan wadah kedap udara (toples/box food-grade) yang disegel (sealed) atau diikat pita cantik untuk menjaga kesegaran.
  - Higienis & 100% Halal certified.
  - Pengiriman Cepat: Melayani pengiriman instan langsung ke lokasi pelanggan di daerah Gedangan, Sidoarjo, dan sekitarnya.
- **Lokasi Dapur Fisik**: Perumahan De Farda D5, Keboananom, Gedangan, Sidoarjo.
- **Cara Pemesanan**:
  - Melalui WhatsApp Bisnis resmi kami di nomor: **08975625700**
  - Mengunjungi profil media sosial kami untuk katalog visual dan cuplikan proses pembuatan (behind-the-scenes).
- **Sosial Media Resmi**:
  - Instagram: @AuliaCakeCookies (focus pada video dan foto menu aesthetic)
  - TikTok: @AuliaCakeCookies (video resep singkat, unboxing hampers, review pelanggan)
  - YouTube: Aulia Cake Cookies Channel
  - Website Katalog/Landing Page: auliakecookies.com (https://www.google.com/search?q=auliacakecookies.com)

**Gaya Komunikasi**:
- Selalu sambut pelanggan dengan hangat dan ramah. Gunakan sapaan seperti "Kak", "Bunda", atau "Kakak".
- Berikan saran paket snack box atau variasi kue kering yang cocok sesuai dengan kebutuhan acara atau jumlah anggaran mereka.
- Buat deskripsi kue kita terdengar sangat lezat, lumer di mulut (melt-in-mouth), harum mentega premium, dan memuaskan untuk menemani minum kopi/teh atau sebagai hadiah istimewa.
- Jika ditanya tentang harga spesifik yang belum tertulis, informasikan dengan sopan bahwa harga bisa bernegosiasi dan disesuaikan melalui chat WhatsApp di 08975625700.`;

// API routes
app.post('/api/chat', async (req, res) => {
  try {
    const { conversation } = req.body;

    if (!conversation || !Array.isArray(conversation)) {
      return res.status(400).json({ error: 'Conversation array is required.' });
    }

    if (!ai) {
      return res.status(500).json({ 
        error: 'API Key is missing or Google Gen AI client is not initialized.' 
      });
    }

    // Format conversation data to match the format accepted by `@google/genai` generateContent
    // Each element should have role: 'user' | 'model' and parts: [{ text: string }]
    const contents = conversation.map(item => {
      return {
        role: item.role === 'model' ? 'model' : 'user',
        parts: [{ text: item.text || '' }]
      };
    });

    // Call the generateContent method
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      }
    });

    const reply = response.text || 'Maaf, kami sedang mengalami kendala teknis saat memproses pesan Anda. Coba beberapa saat lagi ya Kak! 🍰';

    return res.json({ result: reply });

  } catch (error) {
    console.error('Error in chatbot API:', error);
    return res.status(500).json({ 
      error: 'Terjadi kesalahan sistem saat menghubungi asisten virtual Aulia Cake Cookies.', 
      details: error.message 
    });
  }
});

// Serve frontend static assets
app.use(express.static(path.join(__dirname, 'public')));

// Fallback to index.html for any frontend routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
