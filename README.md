# U.Y.U.T — AI-Powered Astronomy Spotting & Hilal Prediction
## Powered by IBM Watsonx Granite AI · v2.0

> **U.Y.U.T** (*Unified Yield for Universal Tracking*) is an AI decision-support platform for Islamic astronomy and night-sky observation across Indonesia. It combines real-time ephemeris calculations, interactive GIS maps, and IBM Granite AI insights to optimize celestial spotting.

---

## 📌 Context & Challenge Alignment

### 1. Problem Statement
* **Fragmented Data:** Observers must jump between separate apps for weather forecasts, ephemeris data, and light pollution maps (Bortle Scale).
* **Manual & Imprecise Spotting:** Cross-referencing spatial data manually is slow, error-prone, and inefficient for time-sensitive events.
* **Complex Data:** Technical figures are difficult for field teams and the public to interpret quickly.

### 2. Technical & AI Approach
* **IBM Watsonx Granite AI:** Leverages **Granite-20b-Multilingual** (*Watsonx Co-Assistant*) via Server-Sent Events (SSE) streaming to turn complex spatial/astronomical data into clear, natural language recommendations.
* **Precision Backend:** Python Flask REST API integrated with PyEphem for real-time coordinate calculations.
* **Interactive GIS Frontend:** Leaflet.js with Light Pollution Heatmaps (Bortle Scale) and a mobile-first Tailwind CSS design.

### 3. Challenge Relevance
* **Real-World Impact:** Serves as an actionable decision-support tool for national Hilal sighting teams, observatories, astrophotographers, and public educators.
* **IBM Ecosystem Showcase:** Demonstrates seamless integration of IBM Granite LLMs with GIS mapping to convert raw data into actionable spatial intelligence.

---

## 🌙 Core Features

### Multi-Object Astronomy Tracking
| Target | Description | Key Parameters |
|---|---|---|
| 🌙 Hilal | Hijri calendar prediction | Elongation, Altitude, Moon Age |
| ☄️ Meteor Shower | Perseids / Geminids | Radiant Altitude, Moon Interference |
| 🛰️ ISS Transit | Space Station passes | Elevation, Duration, Azimuth |
| 🌌 Milky Way | Deep-sky photography | Bortle Class, Core Altitude |

### Key Platform Capabilities
- 🗺️ Interactive GIS Maps: Dark/Street mode tiles, dynamic status markers, and **Bortle Heatmap Overlays**.
- 🏆 Top Spot Recommendations: Automatically ranks top 3 observation points with visibility progress bars.
- 💬 Watsonx Co-Assistant: Live contextual guidance tailored to each target.
- 📸 One-Click Export: Instant PNG summary cards and downloadable full TXT field reports.

---

## 🚀 Quick Start

### Prerequisites
`Python 3.11+` & `pip`

### 1. Installation
```bash
cd backend
pip install flask flask-cors python-dotenv ephem requests

```

### 2. IBM Watsonx Config (Optional)

Create `backend/.env`:

```env
IBM_WATSONX_URL=[https://us-south.ml.cloud.ibm.com](https://us-south.ml.cloud.ibm.com)
IBM_WATSONX_APIKEY=your_api_key
IBM_PROJECT_ID=your_project_id

```

### 3. Run Server

```bash
python backend/app.py

```

Open **`http://localhost:5000`** in your browser.

---

## 📡 API Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | System & Granite status |
| `GET` | `/api/spots?target=&date=` | Spatial data & visibility scores |
| `GET` | `/api/top-spots?target=&n=3` | Top N location recommendations |
| `POST` | `/api/predict-hilal` | Custom coordinate predictions |
| `POST` | `/api/narrate` | Granite AI response stream (SSE) |

---

## 📦 Tech Stack

| Layer | Technology |
| --- | --- |
| **Backend** | Python 3.11, Flask 3.x, PyEphem 4.x |
| **AI Engine** | IBM watsonx.ai (Granite-20b-Multilingual) |
| **Frontend** | Vanilla JS (ES2022), Leaflet.js 1.9.4, Tailwind CSS |
| **Export** | html2canvas 1.4.1 |

---

## 📄 License

MIT License

---

*U.Y.U.T v2.0 · IBM Hackathon Submission*

```

```
