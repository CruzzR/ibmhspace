# U.Y.U.T — Hilal Prediction & Astronomy Spot Recommendation System
## Powered by IBM Watsonx Granite AI · v2.0

> **U.Y.U.T** (*Ulumul Yaqin Untuk Tanda-tanda* — *Signs of Certain Knowledge*) is an AI-powered Islamic astronomy web platform combining real-time ephemeris calculations, interactive maps, and IBM Granite narrative intelligence to support Hijri month determination and sky observation across Indonesia.

---

## 🏆 Challenge Assessment Components

---

### 1. Problem Statement

#### Fragmented Astronomy Data for Hilal Observation in Indonesia

National *rukyatul hilal* (crescent moon observation) teams and astrophotography communities in Indonesia face one unresolved structural problem: **no single unified platform** consolidates all the data needed to determine the optimal observation point. Every user must manually access three separate sources:

- **BMKG (Meteorology Agency)** — weather data, cloud cover, and humidity per station
- **Ephemeris Calculator** — moon position (elongation, altitude, moon age)
- **Bortle Light Pollution Map** — night sky quality at each candidate location

**The cascading negative impact is real:**

| Problem | Field Consequence |
|---|---|
| Data scattered across 3+ separate platforms | Spotting process takes 2–4× longer than necessary |
| No integrated visibility scoring | Spot selection relies on intuition rather than data |
| Manual multi-variable field analysis | Prone to calculation errors under time pressure |
| No contextual recommendation narrative | Field teams struggle to justify and communicate spot decisions |

The result: the observation spot determination (*spotting*) process becomes **slow, imprecise, and prone to manual analysis errors** — especially when decisions must be made within hours of sunset on conjunction day.

---

### 2. Technical & AI Approach

#### AI Side — IBM Watsonx / Granite LLM (Watsonx Co-Assistant)

**U.Y.U.T** integrates IBM Granite as a smart narrative engine that transforms complex multi-variable spatial data into natural-language recommendations. Rather than displaying raw elongation figures or Bortle indices, Granite processes the full combination of parameters (moon position, weather, light pollution, topographic elevation) and produces recommendation narratives that field operators can act on immediately — including the technical reasoning behind every visibility score.

- **Model input:** multi-spot ephemeris data + Bortle scores + active visibility criteria (Wujudul Hilal / MABIMS 2021 / Odeh)
- **Model output:** distinct contextual narrative per observation target, streamed via Server-Sent Events (SSE) in real-time
- **Fallback:** full demo mode available when Granite is not configured — the platform remains 100% functional

#### Technical Side — Architecture Stack

| Layer | Technology & Role |
|---|---|
| **Backend API** | Python Flask REST API — serves ephemeris calculations, visibility scoring, and Granite routing |
| **Astronomy Engine** | `ephem` library — computes elongation, altitude, azimuth, moon age, and other celestial object positions in real-time |
| **Responsive Frontend** | Vanilla JS (ES2022) + Leaflet.js 1.9.4 + Tailwind CSS — full interactive map UI running in-browser |
| **Heatmap Overlay** | Leaflet.heat plugin — visualises Bortle Scale light pollution distribution across observation regions |
| **Export Engine** | html2canvas 1.4.1 — exports spot summary cards as print-ready PNG and structured TXT reports |
| **AI Streaming** | IBM Watsonx SDK + SSE — Granite narrative delivered incrementally for a responsive UX |

---

### 3. Relevance to Challenge Theme

#### Why U.Y.U.T Is Central to Astronomy Exploration & IBM AI

**U.Y.U.T is not just a hilal calculator** — it is designed as a real **Decision Support System (DSS)** that merges astronomical data exploration with IBM AI to serve three primary user segments across Indonesia:

| User Segment | Specific Need | Value Delivered by U.Y.U.T |
|---|---|---|
| **National Hilal Teams** (Kemenag, Islamic Orgs) | Accurate, verifiable Hijri month determination | Multi-criteria scoring (Wujudul Hilal / MABIMS 2021 / Odeh) + AI narrative per spot |
| **Astrophotography Community** | Dark-sky location selection for Milky Way, ISS transit, meteor showers | Real-time Bortle heatmap + automatic top-3 recommendations per target |
| **Public & Academic Education** | Accessible understanding of Islamic astronomical phenomena | Interactive map visualisation + shareable exported reports |

Relevance to the IBM challenge theme:
- **Astronomy Exploration:** The platform integrates 4 celestial targets (Hilal, Meteor Shower, ISS Transit, Milky Way) into one interface — the first comprehensive web-based astronomy exploration tool built for Indonesia.
- **IBM AI Utilisation (Watsonx/Granite):** Granite acts not as a chatbot but as a *reasoning layer* that interprets complex spatial data into actionable recommendations — a precise, context-aware AI usage pattern.
- **Real Social Impact:** The solution directly affects the lives of over 230 million Muslims in Indonesia who depend on hilal observation results to determine Eid and Ramadan.

---

## 🌙 Core Features v2.0

### Multi-Object Astronomy Tracking

| Target | Description | Key Parameters |
|---|---|---|
| 🌙 **Hilal** | Hijri new month prediction | Elongation, Altitude, Moon Age |
| ☄️ **Meteor Shower** | Perseids / Geminids | Radiant Altitude, Moon Interference |
| 🛰️ **ISS Transit** | International Space Station pass | Elevation Angle, Duration, Azimuth |
| 🌌 **Milky Way** | Galaxy astrophotography | Bortle Class, Galactic Core Altitude |

### Interactive Map (Leaflet.js)
- 🗺️ Dark mode & Street mode tile layers
- 📍 5 Indonesian observation spots with dynamic colour-coded markers
- 🌡️ **Light pollution heatmap** overlay (Bortle Scale)
- 🔍 Rich popup with photo + ephemeris data

### Top Spot Recommendations
- 🏆 3 best recommendation cards per target, generated automatically
- High-resolution category images per observation type
- Colour-coded visibility score progress bars

### AI Co-Assistant (IBM Granite)
- 💬 Distinct contextual narrative per observation target
- 🔄 Real-time Server-Sent Events streaming
- Full demo mode when Granite is not yet configured

### Export & Reports
- 📸 **PNG Export** of summary card (via html2canvas)
- 📄 **TXT Download** of full report for all spots
- 100% dynamic data from backend — no hardcoded values

---

## 🚀 Getting Started

### Prerequisites
```
Python 3.11+
pip (package manager)
```

### 1. Clone & Install

```bash
git clone https://github.com/your-username/ibmh.git
cd ibmh/backend
pip install -r requirements.txt
```

Or install manually:

```bash
pip install flask flask-cors python-dotenv ephem requests
```

### 2. Configure IBM Watsonx *(optional — demo mode works without this)*

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and fill in your credentials:

```env
IBM_WATSONX_URL=https://us-south.ml.cloud.ibm.com
IBM_WATSONX_APIKEY=your_ibm_cloud_api_key_here
IBM_PROJECT_ID=your_watsonx_project_id_here
```

> ⚠️ **Never commit `backend/.env` to Git.** It is listed in `.gitignore`.
> Get your API key from [IBM Cloud](https://cloud.ibm.com/iam/apikeys) and your Project ID from [watsonx.ai](https://eu-de.dataplatform.cloud.ibm.com/wx/home).

### 3. Run the Server

```bash
cd backend
python app.py
```

Open **http://localhost:5000** in your browser.

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | ephem & Granite status check |
| `GET` | `/api/targets` | List of available observation targets |
| `GET` | `/api/spots?date=&criteria=&target=` | All spots + visibility scores |
| `GET` | `/api/top-spots?date=&criteria=&target=&n=3` | Top N spot recommendations |
| `POST` | `/api/predict-hilal` | Hilal prediction for custom coordinates |
| `POST` | `/api/narrate` | Granite AI narrative (SSE streaming) |
| `GET` | `/api/ephemeris` | Sample ephemeris data |

### Example: `/api/spots`
```
GET /api/spots?date=2025-06-01&criteria=mabims_2021&target=hilal
```

### Example: `/api/predict-hilal`
```json
POST /api/predict-hilal
{
  "date": "2025-06-01",
  "lat": -7.137,
  "lon": 112.433,
  "elevation": 110,
  "criteria": "mabims_2021",
  "target": "hilal"
}
```

---

## 🏗️ Project Structure

```
ibmh/
├── backend/
│   ├── app.py              # Flask app — all API endpoints
│   ├── requirements.txt    # Python dependencies
│   └── .env.example        # IBM Watsonx config template (safe to commit)
│   # .env                  # YOUR credentials — never commit this file
├── assets/
│   ├── css/style.css       # Dark astronomy theme, responsive
│   ├── js/
│   │   ├── app.js          # Main frontend logic, multi-object, export
│   │   ├── ibm-assistant.js # Granite chat widget (SSE)
│   │   └── visibility-engine.js # Client-side scoring
│   └── images/             # Placeholder metadata
├── data/
│   └── ephemeris_hilal.json # Sample observation data
├── docs/
│   └── Pitch_Deck_UYUT.md  # 6-slide pitch deck
├── .agents/skills/         # Custom Bob AI skills
├── .gitignore              # Protects .env and cache files
├── skills-lock.json
└── index.html              # SPA shell
```

---

## 🔭 Technical Architecture

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

---

## 🎯 Hilal Visibility Criteria

| Criteria | Min Altitude | Min Elongation | Moon Age |
|---|---|---|---|
| **Wujudul Hilal** | >0° | >0° | — |
| **MABIMS 2021** | ≥3° | ≥6.4° | — |
| **Odeh Criteria** | ≥5° | ≥8° | ≥12 hours |

---

## 🌏 Indonesian Observation Spots

| Spot | Province | Elevation | Bortle |
|---|---|---|---|
| Bukit Condrodipo | East Java | 110 m | 3 |
| Pantai Kartini | Central Java | 2 m | 4 |
| Tanjung Kodok | East Java | 40 m | 3 |
| Bosscha Observatory | West Java | 1,310 m | 2 |
| BMKG Jakarta | DKI Jakarta | 10 m | 7 |

---

## 📦 Technology Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3.11, Flask 3.x, flask-cors, ephem 4.x |
| **AI Model** | IBM watsonx.ai, Granite-20b-Multilingual |
| **Frontend** | Vanilla JS (ES2022), Leaflet.js 1.9.4 |
| **Map Tiles** | CartoDB Dark Matter, OpenStreetMap |
| **Export** | html2canvas 1.4.1 |
| **Font** | Inter (Google Fonts) |

---

## 🔒 Security Notes

- **API keys and credentials** are loaded exclusively from `backend/.env` via `python-dotenv` — they are never hardcoded in source code.
- `backend/.env` is listed in `.gitignore` and **must not be committed to any repository**.
- `backend/.env.example` contains only placeholder values and is safe to commit.
- The application runs in full **demo mode** when no IBM credentials are present, so the `.env` file is entirely optional for evaluation.

---

## 📣 Market Impact

| Segment | Scale | Need |
|---|---|---|
| **Islamic Organisations** (NU, Muhammadiyah, Persis) | 200+ orgs | Standardised rukyat & hisab |
| **BMKG / Ministry of Religious Affairs** | National agencies | National prediction dashboard |
| **Astronomy Community** | 50,000+ members | Multi-target observation platform |
| **Islamic Schools & Pesantren** | 27,000+ institutions | Hijri calendar education |
| **Dark Sky Tourism** | 500,000+/year | Astrophotography spot recommendations |

---

## 📄 License

MIT License — Free to use for educational and research purposes.

---

> *"Merging modern artificial intelligence with centuries-old Islamic timekeeping wisdom."*

*U.Y.U.T v2.0 · IBM Watsonx Hackathon 2025 · Built with IBM Bob AI*
