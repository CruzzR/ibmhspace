"""
U.Y.U.T — Sistem Prediksi Hilal & Rekomendasi Spot Astronomi
Backend Flask · API entry point  v2.0
"""

import os
import json
import math
from datetime import datetime, timezone
from pathlib import Path

from flask import Flask, jsonify, request, Response, stream_with_context
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

# ─── Constants ────────────────────────────────────────────────────────────────

BASE_DIR   = Path(__file__).parent
DATA_DIR   = BASE_DIR.parent / "data"
SPOTS_FILE = DATA_DIR / "ephemeris_hilal.json"

CRITERIA = {
    "wujudul_hilal": {
        "min_altitude": 0.0,
        "min_elongation": 0.0,
        "min_age_hours": 0.0,
        "label": "Wujudul Hilal (Muhammadiyah)",
    },
    "mabims_2021": {
        "min_altitude": 3.0,
        "min_elongation": 6.4,
        "min_age_hours": 0.0,
        "label": "MABIMS 2021",
    },
    "odeh": {
        "min_altitude": 5.0,
        "min_elongation": 8.0,
        "min_age_hours": 12.0,
        "label": "Kriteria Odeh",
    },
}

# ── Observation targets ────────────────────────────────────────────────────────
OBSERVATION_TARGETS = {
    "hilal": {
        "id":    "hilal",
        "label": "🌙 Hilal & Awal Bulan Hijriah",
        "params": ["elongation", "altitude", "illumination", "age_hours"],
        "image_keyword": "crescent moon Islamic",
        "unsplash_id": "photo-1543722530-d2c3201371e7",
    },
    "meteor": {
        "id":    "meteor",
        "label": "☄️ Hujan Meteor (Perseids/Geminids)",
        "params": ["radiant_altitude", "moon_interference", "transparency"],
        "image_keyword": "meteor shower night sky",
        "unsplash_id": "photo-1470813740244-df37b8c1edcb",
    },
    "iss": {
        "id":    "iss",
        "label": "🛰️ Stasiun Luar Angkasa (ISS Transit)",
        "params": ["elevation_angle", "visibility_window", "azimuth"],
        "image_keyword": "ISS space station",
        "unsplash_id": "photo-1446776811953-b23d57bd21aa",
    },
    "milkyway": {
        "id":    "milkyway",
        "label": "🌌 Astrofotografi Milky Way Core",
        "params": ["galactic_center_altitude", "moon_phase", "bortle_class"],
        "image_keyword": "milky way galaxy astrophotography",
        "unsplash_id": "photo-1507499739999-097706ad8914",
    },
}

OBSERVATION_SPOTS = [
    # ── Sumatera ───────────────────────────────────────────────────────────────
    {"id": "sabang",       "name": "Sabang (Pulau Weh)",    "province": "Aceh",
     "lat":  5.892,  "lon":  95.322, "elevation": 30,   "light_pollution": "rendah",       "bortle": 3},
    {"id": "bmkg_mdn",     "name": "BMKG Medan",            "province": "Sumatera Utara",
     "lat":  3.560,  "lon":  98.675, "elevation": 22,   "light_pollution": "sedang",       "bortle": 5},
    {"id": "bukit_batu",   "name": "Bukit Batu Besar",      "province": "Riau",
     "lat":  1.117,  "lon": 104.052, "elevation": 45,   "light_pollution": "rendah",       "bortle": 3},
    # ── Jawa ───────────────────────────────────────────────────────────────────
    {"id": "bosscha",      "name": "Observatorium Bosscha", "province": "Jawa Barat",
     "lat": -6.825,  "lon": 107.617, "elevation": 1310, "light_pollution": "sangat rendah","bortle": 2},
    {"id": "bmkg_jkt",     "name": "BMKG Jakarta",          "province": "DKI Jakarta",
     "lat": -6.172,  "lon": 106.836, "elevation": 10,   "light_pollution": "tinggi",       "bortle": 7},
    {"id": "condrodipo",   "name": "Bukit Condrodipo",      "province": "Jawa Timur",
     "lat": -7.137,  "lon": 112.433, "elevation": 110,  "light_pollution": "rendah",       "bortle": 3},
    # ── Kalimantan ─────────────────────────────────────────────────────────────
    {"id": "tanjung_selor","name": "Tanjung Selor",         "province": "Kalimantan Utara",
     "lat":  2.838,  "lon": 117.372, "elevation": 15,   "light_pollution": "rendah",       "bortle": 3},
    # ── Sulawesi ───────────────────────────────────────────────────────────────
    {"id": "losari",       "name": "Pantai Losari",         "province": "Sulawesi Selatan",
     "lat": -5.143,  "lon": 119.406, "elevation": 2,    "light_pollution": "sedang",       "bortle": 5},
    {"id": "bmkg_mks",     "name": "BMKG Makassar",         "province": "Sulawesi Selatan",
     "lat": -5.059,  "lon": 119.554, "elevation": 5,    "light_pollution": "sedang",       "bortle": 5},
    # ── Nusa Tenggara ──────────────────────────────────────────────────────────
    {"id": "kupang_ntt",   "name": "Kupang (NTT)",          "province": "Nusa Tenggara Timur",
     "lat": -10.173, "lon": 123.607, "elevation": 80,   "light_pollution": "rendah",       "bortle": 3},
    # ── Maluku & Papua ─────────────────────────────────────────────────────────
    {"id": "ambon",        "name": "Observasi Ambon",       "province": "Maluku",
     "lat": -3.657,  "lon": 128.178, "elevation": 25,   "light_pollution": "rendah",       "bortle": 3},
    {"id": "biak_papua",   "name": "Biak (Papua)",          "province": "Papua",
     "lat": -1.191,  "lon": 136.106, "elevation": 40,   "light_pollution": "sangat rendah","bortle": 2},
]

# ─── Astronomy engine ─────────────────────────────────────────────────────────

def _try_import_ephem():
    try:
        import ephem
        return ephem
    except ImportError:
        return None


def compute_hilal_ephem(date_str: str, lat: float, lon: float, elevation: float = 0) -> dict:
    ephem = _try_import_ephem()
    if ephem is None:
        return _demo_hilal(date_str, lat, lon)

    observer = ephem.Observer()
    observer.lat       = str(lat)
    observer.lon       = str(lon)
    observer.elevation = float(elevation)
    observer.pressure  = 1013.25
    observer.horizon   = "-0:34"

    observer.date = date_str + " 12:00:00"
    sunset = observer.next_setting(ephem.Sun())
    observer.date = sunset

    moon = ephem.Moon(observer)
    sun  = ephem.Sun(observer)

    elongation   = float(ephem.separation(moon, sun)) * (180.0 / ephem.pi)
    altitude     = float(moon.alt) * (180.0 / ephem.pi)
    illumination = float(moon.phase)

    prev_new  = ephem.previous_new_moon(observer.date)
    age_hours = (float(observer.date) - float(prev_new)) * 24.0

    return {
        "date":         date_str,
        "lat":          lat,
        "lon":          lon,
        "elongation":   round(elongation,   2),
        "altitude":     round(altitude,     2),
        "illumination": round(illumination, 2),
        "age_hours":    round(age_hours,    2),
        "sunset_utc":   str(ephem.Date(sunset)),
        "source":       "ephem",
    }


def _demo_hilal(date_str: str, lat: float, lon: float) -> dict:
    seed = abs(lat) + abs(lon)
    alt  = round(3.2  + math.sin(seed) * 2.5,  2)
    elon = round(7.1  + math.cos(seed) * 1.8,  2)
    age  = round(15.4 + math.sin(seed * 0.7) * 4.0, 2)
    ill  = round(0.9  + math.cos(seed * 0.3) * 0.3,  2)
    return {
        "date":         date_str,
        "lat":          lat,
        "lon":          lon,
        "elongation":   max(0.0, elon),
        "altitude":     max(0.0, alt),
        "illumination": max(0.1, ill),
        "age_hours":    max(0.0, age),
        "sunset_utc":   date_str + " 11:05:00",
        "source":       "demo",
    }


def score_visibility(hilal_data: dict, criteria: str = "mabims_2021") -> dict:
    c    = CRITERIA.get(criteria, CRITERIA["mabims_2021"])
    alt  = hilal_data["altitude"]
    elon = hilal_data["elongation"]
    age  = hilal_data["age_hours"]

    passes = (
        alt  >= c["min_altitude"]   and
        elon >= c["min_elongation"] and
        age  >= c["min_age_hours"]
    )

    alt_score  = min(100.0, max(0.0, (alt  / 15.0) * 100.0))
    elon_score = min(100.0, max(0.0, (elon / 20.0) * 100.0))
    age_score  = min(100.0, max(0.0, (age  / 48.0) * 100.0))
    composite  = round(alt_score * 0.4 + elon_score * 0.4 + age_score * 0.2, 1)

    return {
        "criteria":   criteria,
        "label":      c["label"],
        "visible":    passes,
        "score":      composite,
        "details": {
            "altitude_ok":   alt  >= c["min_altitude"],
            "elongation_ok": elon >= c["min_elongation"],
            "age_ok":        age  >= c["min_age_hours"],
        },
    }


def _score_target(spot: dict, target_id: str, date_str: str) -> dict:
    """
    Compute visibility score for non-hilal targets using deterministic proxy values.
    Returns a unified score dict compatible with the hilal visibility schema.
    """
    seed = abs(spot["lat"]) + abs(spot["lon"])
    bortle = spot.get("bortle", 5)

    if target_id == "meteor":
        # Better score for dark (low bortle) sites at high elevation
        elev_bonus  = min(20, spot.get("elevation", 0) / 100)
        dark_bonus  = max(0, (9 - bortle) * 8)
        # Moon phase proxy — vary by date hash
        moon_phase  = (hash(date_str) % 30) / 30.0
        moon_penalty = moon_phase * 20  # full moon hurts meteor obs
        score = min(100, max(0, round(55 + dark_bonus + elev_bonus - moon_penalty + math.sin(seed) * 5, 1)))
        params = {
            "radiant_altitude":  round(45 + math.sin(seed) * 20, 1),
            "moon_interference": round(moon_phase * 100, 0),
            "transparency":      round(7.5 - bortle * 0.5, 1),
            "zenithal_hourly_rate": 100 if "Perseids" in date_str else 120,
        }
        visible = score >= 55

    elif target_id == "iss":
        # ISS visibility is location-independent mostly — elevation angle matters
        base = 60 + math.cos(seed * 0.5) * 15
        score = round(min(100, max(0, base)), 1)
        params = {
            "elevation_angle":   round(abs(math.sin(seed) * 70), 1),
            "visibility_window": round(2 + math.cos(seed * 0.3) * 4, 1),
            "azimuth":           round((hash(spot["id"]) % 360)),
            "magnitude":         round(-3.5 + math.cos(seed * 0.2) * 1.5, 1),
        }
        visible = params["elevation_angle"] > 10

    elif target_id == "milkyway":
        # Dark sites with low bortle = best milkyway
        dark_score  = max(0, (9 - bortle) * 11)
        elev_bonus  = min(15, spot.get("elevation", 0) / 120)
        moon_phase  = (hash(date_str) % 30) / 30.0
        moon_penalty = moon_phase * 25
        score = min(100, max(0, round(dark_score + elev_bonus - moon_penalty, 1)))
        params = {
            "galactic_center_altitude": round(30 + math.sin(seed) * 25, 1),
            "moon_phase_pct":           round(moon_phase * 100, 0),
            "bortle_class":             bortle,
            "limiting_magnitude":       round(7.5 - bortle * 0.4, 1),
        }
        visible = bortle <= 4 and score >= 40

    else:
        # Fallback to hilal
        hilal = compute_hilal_ephem(date_str, spot["lat"], spot["lon"], spot.get("elevation", 0))
        return score_visibility(hilal), hilal, {}

    return (
        {"criteria": target_id, "label": OBSERVATION_TARGETS[target_id]["label"],
         "visible": visible, "score": score, "details": params},
        params,
        params,
    )


# ─── IBM Watsonx / Granite helpers ────────────────────────────────────────────

def _build_prompt(question: str, obs_data: dict, score_data: dict, target_id: str = "hilal") -> str:
    target_label = OBSERVATION_TARGETS.get(target_id, {}).get("label", "Hilal")

    if target_id == "hilal":
        ctx = (
            f"Data Efemerida Hilal:\n"
            f"- Elongasi        : {obs_data.get('elongation', 'N/A')}°\n"
            f"- Ketinggian      : {obs_data.get('altitude',   'N/A')}°\n"
            f"- Umur Bulan      : {obs_data.get('age_hours',  'N/A')} jam\n"
            f"- Iluminasi       : {obs_data.get('illumination','N/A')}%\n"
        )
        sys_prompt = (
            "Kamu adalah asisten astronomi Islam bernama UYUT yang ahli dalam prediksi hilal. "
            "Jawab dalam Bahasa Indonesia dengan nada ilmiah namun mudah dipahami. "
            "Sertakan referensi kriteria (Wujudul Hilal / MABIMS 2021) jika relevan."
        )
    elif target_id == "meteor":
        ctx = (
            f"Data Hujan Meteor:\n"
            f"- Ketinggian Radian : {obs_data.get('radiant_altitude', 'N/A')}°\n"
            f"- Interferensi Bulan: {obs_data.get('moon_interference', 'N/A')}%\n"
            f"- Transparansi Langit: {obs_data.get('transparency', 'N/A')}/10\n"
        )
        sys_prompt = (
            "Kamu adalah asisten astronomi bernama UYUT yang ahli dalam pengamatan hujan meteor. "
            "Jawab dalam Bahasa Indonesia. Berikan tips waktu terbaik pengamatan, arah pandang, dan perlengkapan yang dibutuhkan."
        )
    elif target_id == "iss":
        ctx = (
            f"Data Lintasan ISS:\n"
            f"- Sudut Elevasi  : {obs_data.get('elevation_angle', 'N/A')}°\n"
            f"- Durasi Terlihat: {obs_data.get('visibility_window', 'N/A')} menit\n"
            f"- Azimuth        : {obs_data.get('azimuth', 'N/A')}°\n"
            f"- Magnitudo      : {obs_data.get('magnitude', 'N/A')}\n"
        )
        sys_prompt = (
            "Kamu adalah asisten pengamatan objek luar angkasa bernama UYUT. "
            "Jawab dalam Bahasa Indonesia. Berikan panduan melihat ISS dengan mata telanjang atau teropong."
        )
    else:  # milkyway
        ctx = (
            f"Data Astrofotografi Milky Way:\n"
            f"- Ketinggian Pusat Galaksi: {obs_data.get('galactic_center_altitude', 'N/A')}°\n"
            f"- Fase Bulan               : {obs_data.get('moon_phase_pct', 'N/A')}%\n"
            f"- Kelas Bortle             : {obs_data.get('bortle_class', 'N/A')}\n"
            f"- Magnitudo Batas          : {obs_data.get('limiting_magnitude', 'N/A')}\n"
        )
        sys_prompt = (
            "Kamu adalah asisten astrofotografi bernama UYUT yang ahli dalam fotografi Milky Way. "
            "Jawab dalam Bahasa Indonesia. Berikan saran pengaturan kamera (ISO, apertur, eksposur) dan waktu terbaik pemotretan."
        )

    common = (
        f"- Target Pengamatan: {target_label}\n"
        f"- Skor Visibilitas : {score_data.get('score', 'N/A')}/100 "
        f"({'BAIK' if score_data.get('visible') else 'KURANG MENDUKUNG'})\n"
    )
    return f"{sys_prompt}\n\n{ctx}{common}\nPertanyaan: {question}\nJawaban:"


def _get_granite_model():
    url    = os.getenv("IBM_WATSONX_URL", "")
    apikey = os.getenv("IBM_WATSONX_APIKEY", "")
    proj   = os.getenv("IBM_PROJECT_ID",  "")
    if not (url and apikey and proj):
        return None
    try:
        from ibm_watsonx_ai import Credentials
        from ibm_watsonx_ai.foundation_models import ModelInference
        creds = Credentials(url=url, api_key=apikey)
        return ModelInference(
            model_id="ibm/granite-20b-multilingual",
            credentials=creds,
            project_id=proj,
            params={"max_new_tokens": 512, "temperature": 0.3, "repetition_penalty": 1.1},
        )
    except Exception:
        return None


def _demo_narration(obs_data: dict, score_data: dict, question: str, target_id: str = "hilal") -> str:
    vis   = "**baik**" if score_data.get("visible") else "**kurang mendukung**"
    skor  = score_data.get("score", 0)
    label = OBSERVATION_TARGETS.get(target_id, {}).get("label", "Hilal")

    if target_id == "hilal":
        detail = (
            f"- Elongasi: {obs_data.get('elongation','N/A')}° (min. 6,4° MABIMS)\n"
            f"- Ketinggian: {obs_data.get('altitude','N/A')}° (min. 3° MABIMS)\n"
            f"- Umur Bulan: {obs_data.get('age_hours','N/A')} jam"
        )
        rec = ("Kondisi baik untuk observasi rukyat hilal. Pastikan horizon barat bebas awan."
               if score_data.get("visible") else
               "Kondisi kurang mendukung. Disarankan hisab mendahului rukyat.")
    elif target_id == "meteor":
        detail = (
            f"- Ketinggian Radian: {obs_data.get('radiant_altitude','N/A')}°\n"
            f"- Interferensi Bulan: {obs_data.get('moon_interference','N/A')}%\n"
            f"- Transparansi: {obs_data.get('transparency','N/A')}/10"
        )
        rec = ("Waktu terbaik pengamatan 01:00–04:00 WIB. Berbaring menghadap zenith."
               if score_data.get("visible") else
               "Bulan terlalu terang. Coba lokasi lebih gelap atau tunggu fase bulan baru.")
    elif target_id == "iss":
        detail = (
            f"- Sudut Elevasi: {obs_data.get('elevation_angle','N/A')}°\n"
            f"- Durasi: {obs_data.get('visibility_window','N/A')} menit\n"
            f"- Azimuth: {obs_data.get('azimuth','N/A')}°"
        )
        rec = ("ISS akan tampak sebagai bintang bergerak cepat. Cek NASA Spot the Station untuk jadwal pasti."
               if score_data.get("visible") else
               "ISS tidak melintas di atas cakrawala minimum. Coba tanggal lain.")
    else:
        detail = (
            f"- Ketinggian Pusat Galaksi: {obs_data.get('galactic_center_altitude','N/A')}°\n"
            f"- Kelas Bortle: {obs_data.get('bortle_class','N/A')}\n"
            f"- Magnitudo Batas: {obs_data.get('limiting_magnitude','N/A')}"
        )
        rec = ("Kondisi gelap ideal. Gunakan ISO 3200, f/2.8, eksposur 20-25 detik."
               if score_data.get("visible") else
               "Polusi cahaya atau bulan terlalu terang. Cari lokasi Bortle ≤3.")

    return (
        f"Kondisi pengamatan **{label}** diprediksi {vis} "
        f"dengan skor {skor}/100.\n\n"
        f"**Parameter Observasi:**\n{detail}\n\n"
        f"**Rekomendasi:** {rec}\n\n"
        f"*(Narasi mode demo — hubungkan IBM Watsonx untuk AI penuh)*"
    )


# ─── App factory ──────────────────────────────────────────────────────────────

def create_app() -> Flask:
    app = Flask(__name__, static_folder=str(BASE_DIR.parent), static_url_path="")
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    def ok(data, code=200):
        return jsonify({"status": "ok",    "data": data}), code

    def err(msg, code=400):
        return jsonify({"status": "error", "message": msg}), code

    @app.route("/")
    def index():
        return app.send_static_file("index.html")

    @app.errorhandler(404)
    def not_found(_):
        return err("Endpoint tidak ditemukan", 404)

    @app.errorhandler(500)
    def server_error(_):
        return err("Kesalahan server internal", 500)

    # ── GET /api/targets ─────────────────────────────────────────────────────
    @app.route("/api/targets", methods=["GET"])
    def get_targets():
        """Return list of available observation targets."""
        return ok(list(OBSERVATION_TARGETS.values()))

    # ── GET /api/spots ────────────────────────────────────────────────────────
    @app.route("/api/spots", methods=["GET"])
    def get_spots():
        date_str  = request.args.get("date",     datetime.now(timezone.utc).strftime("%Y-%m-%d"))
        criteria  = request.args.get("criteria", "mabims_2021")
        target_id = request.args.get("target",   "hilal")

        if criteria not in CRITERIA:
            return err(f"Kriteria tidak valid. Pilih: {', '.join(CRITERIA.keys())}")
        if target_id not in OBSERVATION_TARGETS:
            return err(f"Target tidak valid. Pilih: {', '.join(OBSERVATION_TARGETS.keys())}")

        result = []
        for spot in OBSERVATION_SPOTS:
            if target_id == "hilal":
                hilal = compute_hilal_ephem(date_str, spot["lat"], spot["lon"], spot.get("elevation", 0))
                vis   = score_visibility(hilal, criteria)
                obs_params = hilal
            else:
                vis, obs_params, _ = _score_target(spot, target_id, date_str)
                hilal = compute_hilal_ephem(date_str, spot["lat"], spot["lon"], spot.get("elevation", 0))
                obs_params = {**hilal, **obs_params}  # merge

            result.append({
                **spot,
                "hilal":      obs_params,
                "visibility": vis,
                "target":     target_id,
            })

        return ok({"date": date_str, "criteria": criteria, "target": target_id, "spots": result})

    # ── GET /api/top-spots ────────────────────────────────────────────────────
    @app.route("/api/top-spots", methods=["GET"])
    def get_top_spots():
        """Return top 3 recommended spots for a given target and date."""
        date_str  = request.args.get("date",     datetime.now(timezone.utc).strftime("%Y-%m-%d"))
        criteria  = request.args.get("criteria", "mabims_2021")
        target_id = request.args.get("target",   "hilal")
        n         = int(request.args.get("n", 3))

        scored = []
        for spot in OBSERVATION_SPOTS:
            if target_id == "hilal":
                hilal = compute_hilal_ephem(date_str, spot["lat"], spot["lon"], spot.get("elevation", 0))
                vis   = score_visibility(hilal, criteria)
            else:
                vis, obs_params, _ = _score_target(spot, target_id, date_str)
            scored.append({**spot, "visibility": vis})

        scored.sort(key=lambda s: s["visibility"]["score"], reverse=True)
        return ok({"top_spots": scored[:n], "date": date_str, "target": target_id})

    # ── POST /api/predict-hilal ───────────────────────────────────────────────
    @app.route("/api/predict-hilal", methods=["POST"])
    def predict_hilal():
        body      = request.get_json(force=True) or {}
        date_str  = body.get("date",      datetime.now(timezone.utc).strftime("%Y-%m-%d"))
        lat       = body.get("lat",       -7.137)
        lon       = body.get("lon",       112.433)
        elevation = body.get("elevation", 0)
        criteria  = body.get("criteria",  "mabims_2021")
        target_id = body.get("target",    "hilal")

        if criteria not in CRITERIA:
            return err(f"Kriteria tidak valid. Pilih: {', '.join(CRITERIA.keys())}")

        try:
            lat = float(lat); lon = float(lon); elevation = float(elevation)
        except (TypeError, ValueError):
            return err("lat, lon, elevation harus berupa angka")

        hilal        = compute_hilal_ephem(date_str, lat, lon, elevation)
        vis          = score_visibility(hilal, criteria)
        all_criteria = {k: score_visibility(hilal, k) for k in CRITERIA}

        # Additional target-specific params
        target_params = {}
        if target_id != "hilal":
            fake_spot = {"id": "custom", "lat": lat, "lon": lon,
                         "elevation": elevation, "bortle": 4, "light_pollution": "sedang"}
            t_vis, t_params, _ = _score_target(fake_spot, target_id, date_str)
            target_params = t_params

        return ok({
            "date":          date_str,
            "target":        target_id,
            "location":      {"lat": lat, "lon": lon, "elevation": elevation},
            "hilal":         {**hilal, **target_params},
            "visibility":    vis,
            "all_criteria":  all_criteria,
        })

    # ── POST /api/narrate ─────────────────────────────────────────────────────
    @app.route("/api/narrate", methods=["POST"])
    def narrate():
        body       = request.get_json(force=True) or {}
        question   = body.get("question",   "Bagaimana kondisi pengamatan hari ini?")
        obs_data   = body.get("hilal_data", body.get("obs_data", {}))
        score_data = body.get("score_data", {})
        target_id  = body.get("target",     "hilal")

        if not obs_data:
            return err("obs_data wajib disertakan")

        model  = _get_granite_model()
        prompt = _build_prompt(question, obs_data, score_data, target_id)

        if model is None:
            demo_text = _demo_narration(obs_data, score_data, question, target_id)

            def stream_demo():
                for word in demo_text.split(" "):
                    yield f"data: {word} \n\n"
            return Response(stream_with_context(stream_demo()), mimetype="text/event-stream")

        def stream_granite():
            try:
                for chunk in model.generate_text_stream(prompt=prompt):
                    yield f"data: {chunk}\n\n"
            except Exception as exc:
                yield f"data: [ERROR: {exc}]\n\n"

        return Response(stream_with_context(stream_granite()), mimetype="text/event-stream")

    # ── GET /api/ephemeris ────────────────────────────────────────────────────
    @app.route("/api/ephemeris", methods=["GET"])
    def get_ephemeris():
        try:
            with open(SPOTS_FILE, encoding="utf-8") as f:
                return ok(json.load(f))
        except FileNotFoundError:
            return err("File efemerida tidak ditemukan", 404)

    # ── GET /api/health ───────────────────────────────────────────────────────
    @app.route("/api/health", methods=["GET"])
    def health():
        ephem_ok   = _try_import_ephem() is not None
        granite_ok = _get_granite_model() is not None
        return ok({
            "version":   "2.0.0",
            "ephem":     "aktif" if ephem_ok   else "demo (pip install ephem)",
            "granite":   "aktif" if granite_ok else "demo (atur .env IBM_WATSONX_*)",
            "targets":   list(OBSERVATION_TARGETS.keys()),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    return app


if __name__ == "__main__":
    app = create_app()
    port = int(os.getenv("PORT", 5000))
    print(f"\n  ✦ U.Y.U.T v2.0 Backend running → http://localhost:{port}\n")
    app.run(debug=True, port=port)
