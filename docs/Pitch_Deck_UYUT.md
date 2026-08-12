# U.Y.U.T — Pitch Deck (6 Slides)
## *Ulumul Yaqin Untuk Tanda-tanda*
### IBM Watsonx Hackathon 2025

---

## SLIDE 1 — PROBLEM

### Penentuan Awal Bulan Hijriah: Masalah yang Belum Terpecahkan

**Konteks:**
- Lebih dari **2 miliar umat Islam** di dunia bergantung pada penentuan awal bulan Hijriah (Ramadhan, Eid, Dzulhijjah) untuk ibadah
- Indonesia memiliki **270+ juta penduduk Muslim** dengan 34 provinsi yang tersebar di 5.000 km kepulauan

**Masalah Utama:**

| Masalah | Dampak |
|---|---|
| Perbedaan kriteria (MABIMS vs Wujudul Hilal) | Perbedaan hari raya antar ormas Islam |
| Kurangnya data real-time lokasi observasi | Tim rukyat bepergian ke spot yang salah |
| Tidak ada sistem rekomendasi berbasis AI | Keputusan manual, tidak terstandarisasi |
| Informasi tersebar di banyak sumber | Susah diakses publik awam & lembaga |

**Statistik:**
- 🕌 Setiap tahun ada ~4 momen kritis penentuan awal bulan
- 📍 Ribah titik rukyat hilal di Indonesia belum terpetakan dengan baik
- 🌧️ 40% kegagalan rukyat disebabkan pemilihan lokasi yang tidak optimal

---

## SLIDE 2 — SOLUTION

### U.Y.U.T: Platform Prediksi Hilal & Multi-Object Astronomi Berbasis AI

**Visi:** Satu platform web yang menjawab semua kebutuhan pengamatan langit di Indonesia — dari penentuan awal bulan hingga astrofotografi Milky Way.

**Solusi Inti:**

```
┌─────────────────────────────────────────────────────┐
│                  U.Y.U.T Platform                   │
│                                                     │
│  🗺️  Peta Interaktif     📡  Real-time Ephemeris    │
│      5+ spot observasi       pyephem + ephem lib    │
│                                                     │
│  🤖  IBM Granite AI      📊  Multi-Criteria Score   │
│      Narasi kontekstual      MABIMS/Wujudul Hilal   │
│                                                     │
│  ☄️  Multi-Object        📱  Mobile-Responsive     │
│      Meteor,ISS,MilkyWay     Drawer UI + PWA-ready │
└─────────────────────────────────────────────────────┘
```

**Proposisi Nilai:**
- **Akurasi:** Kalkulasi ephemeris menggunakan library astronomi `ephem` yang digunakan oleh NASA dan observatorium dunia
- **Inklusivitas:** Mendukung MABIMS 2021, Wujudul Hilal, dan Odeh — semua kriteria aktif di Indonesia
- **AI-Powered:** IBM Granite memberikan narasi kontekstual dalam Bahasa Indonesia, mendukung terminologi Arab/Islam
- **Open:** Web-based, tidak perlu instalasi, berjalan di semua perangkat

---

## SLIDE 3 — TECH ARCHITECTURE

### Arsitektur Teknis U.Y.U.T v2.0

```
                    ┌──────────────────┐
                    │   Browser / PWA  │
                    │   index.html     │
                    │   Leaflet.js     │
                    │   app.js (ES22)  │
                    └────────┬─────────┘
                             │ REST API + SSE
                    ┌────────▼─────────┐
                    │  Flask Backend   │
                    │  Python 3.11     │
                    │                  │
          ┌─────────┤  /api/spots      ├──────────┐
          │         │  /api/top-spots  │          │
          │         │  /api/predict    │          │
          │         │  /api/narrate    │          │
          │         └────────┬─────────┘          │
          │                  │                    │
   ┌──────▼──────┐   ┌───────▼───────┐   ┌───────▼───────┐
   │  ephem 4.x  │   │ IBM watsonx   │   │  data/        │
   │  Astronomy  │   │ Granite-20b   │   │  ephemeris    │
   │  Engine     │   │ Multilingual  │   │  .json        │
   └─────────────┘   └───────────────┘   └───────────────┘
```

**Stack:**

| Layer | Teknologi | Alasan |
|---|---|---|
| **Ephemeris** | `pyephem 4.2` | Standar industri astronomi, presisi tinggi |
| **Backend** | Flask 3.x + CORS | Ringan, Python-native, SSE support |
| **AI Model** | IBM Granite-20b-Multilingual | Support Bahasa Indonesia + terminologi Arab |
| **Maps** | Leaflet.js 1.9.4 | Open-source, ringan, tanpa API key |
| **Tiles** | CartoDB Dark Matter | Tema gelap cocok untuk astronomi |
| **Export** | html2canvas 1.4.1 | PNG report tanpa backend |

---

## SLIDE 4 — IBM WATSONX INTEGRATION

### Integrasi IBM Granite: AI yang Memahami Konteks Islam & Astronomi

**Model yang Digunakan:** `ibm/granite-20b-multilingual`

> Dipilih karena kemampuan handle teks Bahasa Indonesia, Arabic script (هلال, رؤية), dan terminologi astronomi Islam secara bersamaan.

**Sistem Prompt Engineering per Target:**

```python
# Hilal
"Kamu adalah asisten astronomi Islam yang ahli dalam prediksi hilal.
Jawab dalam Bahasa Indonesia. Sertakan referensi MABIMS/Wujudul Hilal."

# Meteor  
"Kamu adalah asisten pengamatan hujan meteor.
Berikan tips waktu terbaik, arah pandang, dan perlengkapan."

# ISS
"Kamu adalah asisten pengamatan objek luar angkasa.
Panduan melihat ISS dengan mata telanjang atau teropong."

# Milky Way
"Kamu adalah asisten astrofotografi Milky Way.
Saran ISO, apertur, eksposur optimal."
```

**Fitur Streaming (Server-Sent Events):**
```
Client ──POST /api/narrate──► Flask
Flask  ──stream SSE──────────► Client
       "data: Berdasarkan \n\n"
       "data: data efemerida \n\n"
       "data: ..." 
```

**Demo Mode:** Narasi deterministik saat API Key belum dikonfigurasi — tidak ada error, aplikasi tetap berjalan penuh.

**Keunggulan vs GPT-4:**
- ✅ IBM Cloud deployment (on-premise compatible)
- ✅ Compliance enterprise & data privacy
- ✅ Multilingual tanpa fine-tuning
- ✅ Rate limit transparent & terkelola

---

## SLIDE 5 — MARKET IMPACT

### Dampak & Peluang Pasar

**Target Pengguna:**

| Segmen | Jumlah | Kebutuhan |
|---|---|---|
| **Ormas Islam** (NU, Muhammadiyah, Persis) | 200+ organisasi | Standarisasi rukyat & hisab |
| **BMKG / Kemenag RI** | Lembaga nasional | Dashboard prediksi nasional |
| **Komunitas Astronomi** | 50.000+ anggota | Platform observasi multi-target |
| **Pesantren & Sekolah Islam** | 27.000+ lembaga | Edukasi kalender Hijriah |
| **Wisatawan Dark Sky** | 500.000+/tahun | Rekomendasi spot astrofotografi |

**Roadmap:**

```
v1.0 (Now)        v2.0 (Now)         v3.0 (Q3 2025)    v4.0 (2026)
────────────      ──────────────     ──────────────     ──────────
Hilal prediksi  → Multi-Object     → Mobile App PWA  → API publik
Basic map       → Top Spots        → Weather API     → B2G contract
Flask backend   → IBM Granite AI   → 50+ spots       → IoT integration
                → Export PNG/TXT   → Notif push       → Nasional deploy
```

**Business Model:**
- 🆓 **Free tier:** Akses publik, demo mode AI
- 💼 **Pro (Lembaga):** Granite AI penuh, custom criteria, API access — Rp 500K/bulan
- 🏛️ **Enterprise (Kemenag/BMKG):** White-label, on-premise deployment — custom pricing

**KPI Target (12 bulan):**
- 10.000+ pengguna aktif bulanan
- 5 MOU dengan organisasi Islam nasional
- API digunakan oleh 50+ aplikasi pihak ketiga

---

## SLIDE 6 — DEMO

### Live Demo & Call to Action

**Demo Flow:**

```
1. Buka http://localhost:5000
   ↓
2. Pilih Target: 🌙 Hilal atau 🌌 Milky Way
   ↓
3. Pilih Tanggal → Klik "Hitung Prediksi"
   ↓
4. Lihat 5 spot di peta dengan warna skor
   ↓
5. Klik spot → Detail panel + Top 3 Recommendations
   ↓
6. AI Co-Assistant otomatis narasi kondisi pengamatan
   ↓
7. Toggle Heatmap polusi cahaya
   ↓
8. Export PNG laporan → Download TXT
```

**Screenshot Features:**
- Dark astronomy UI dengan tema bintang
- Peta dark Leaflet dengan marker berwarna (hijau/amber/merah)
- Top 3 recommendation cards dengan gambar Unsplash
- AI chat streaming Granite Bahasa Indonesia
- Mobile drawer responsive

**Tech Stack Demo:**
```
Python 3.11 + Flask 3.x + ephem 4.2
IBM Granite-20b-Multilingual (watsonx.ai)
Leaflet.js 1.9.4 + CartoDB Dark Tiles
html2canvas 1.4.1 + Vanilla JS ES2022
```

**Akses Kode:**
- 📁 Workspace: `/ibmh/`
- 🔧 Backend: `cd backend && python app.py`
- 🌐 Frontend: `http://localhost:5000`

---

### Tim & Kontak

| | |
|---|---|
| **Platform** | U.Y.U.T — Sistem Prediksi Hilal |
| **Versi** | 2.0.0 |
| **AI** | IBM Granite-20b-Multilingual |
| **Hackathon** | IBM Watsonx 2025 |
| **Stack** | Python · Flask · Leaflet · IBM Cloud |

> *"Menggabungkan kecerdasan buatan modern dengan kearifan penentuan waktu Islam yang telah berabad-abad lamanya."*

---
*Pitch Deck U.Y.U.T v2.0 · IBM Watsonx Hackathon 2025 · Dibuat dengan IBM Bob AI*
