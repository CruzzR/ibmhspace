/**
 * U.Y.U.T v2.0 — app.js
 * Multi-object astronomy tracking, top-spots, export, heatmap, mobile drawers.
 */

(() => {
  'use strict';

  /* ══════════════════════════════════════════════════════
     CONSTANTS
  ══════════════════════════════════════════════════════ */
  const TARGETS = {
    hilal:    { id: 'hilal',    emoji: '🌙', label: 'Hilal',    img: 'https://images.unsplash.com/photo-1543722530-d2c3201371e7?w=400&q=80' },
    meteor:   { id: 'meteor',   emoji: '☄️', label: 'Meteor',   img: 'https://images.unsplash.com/photo-1470813740244-df37b8c1edcb?w=400&q=80' },
    iss:      { id: 'iss',      emoji: '🛰️', label: 'ISS',      img: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400&q=80' },
    milkyway: { id: 'milkyway', emoji: '🌌', label: 'Milky Way',img: 'https://images.unsplash.com/photo-1507499739999-097706ad8914?w=400&q=80' },
  };

  /* ══════════════════════════════════════════════════════
     STATE
  ══════════════════════════════════════════════════════ */
  let map, darkLayer, streetLayer, spotsLayerGroup, heatmapLayerGroup;
  let spotsData    = [];
  let activeSpotId = null;
  let heatmapOn    = false;
  let lastDate     = '';
  let lastCriteria = 'mabims_2021';
  let activeTarget = 'hilal';

  // Settings state
  const settings = {
    heatmap:  false,
    sat:      false,
    units:    'km',
    mapTheme: 'dark',
  };
  let satInterval = null;

  const $ = id => document.getElementById(id);

  /* ══════════════════════════════════════════════════════
     BOOT
  ══════════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', () => {
    _initMap();
    _initControls();
    _initTargetChips();
    IBMAssistant.init();
    _loadSpots();
    _checkHealth();
    window.addEventListener('resize', () => map && map.invalidateSize());
  });

  /* ══════════════════════════════════════════════════════
     MAP
  ══════════════════════════════════════════════════════ */
  function _initMap() {
    map = L.map('map', { center: [-2.5489, 118.0149], zoom: 5 });

    streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      { attribution: '© OpenStreetMap contributors', maxZoom: 19 });
    darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      { attribution: '© CARTO', maxZoom: 19 });
    darkLayer.addTo(map);

    L.control.layers(
      { 'Dark (Astronomi)': darkLayer, 'Street Map': streetLayer }, {},
      { position: 'topright' }
    ).addTo(map);

    spotsLayerGroup   = L.layerGroup().addTo(map);
    heatmapLayerGroup = L.layerGroup();
  }

  /* ══════════════════════════════════════════════════════
     TARGET CHIPS
  ══════════════════════════════════════════════════════ */
  function _initTargetChips() {
    const container = $('target-chips');
    if (!container) return;
    container.innerHTML = '';
    Object.values(TARGETS).forEach(t => {
      const btn = document.createElement('button');
      btn.className = 'target-chip' + (t.id === activeTarget ? ' active' : '');
      btn.dataset.target = t.id;
      btn.textContent = `${t.emoji} ${t.label}`;
      btn.addEventListener('click', () => _setTarget(t.id));
      container.appendChild(btn);
    });
    _updateTargetBanner();
  }

  /** Sync the mobile sticky target bar active chip */
  function _syncMobileBar(id) {
    document.querySelectorAll('#mobile-target-bar .mob-chip').forEach(c => {
      c.classList.toggle('active', c.dataset.target === id);
    });
  }

  function _setTarget(id) {
    if (!TARGETS[id]) return;
    activeTarget = id;

    // Update desktop chips
    document.querySelectorAll('.target-chip').forEach(c => {
      c.classList.toggle('active', c.dataset.target === id);
    });
    // Update mobile sticky bar
    _syncMobileBar(id);
    // Update sidebar mobile select
    const mob = $('target-select-mobile');
    if (mob) mob.value = id;

    // Show/hide criteria (only relevant for hilal)
    const criteriaGrp = $('criteria-group');
    if (criteriaGrp) criteriaGrp.style.display = id === 'hilal' ? '' : 'none';

    _updateTargetBanner();
    _updateAITargetCtx();
    _loadSpots();
  }

  function _updateTargetBanner() {
    const t = TARGETS[activeTarget];
    if (!t) return;
    const img   = $('target-banner-img');
    const label = $('target-banner-label');
    if (img)   { img.src = t.img; img.alt = t.label; img.style.display = ''; }
    if (label) label.textContent = `${t.emoji} ${t.label}`;
    const el = $('target-banner');
    if (el) el.style.display = '';
  }

  function _updateAITargetCtx() {
    const t = TARGETS[activeTarget];
    const el = $('ai-target-label');
    if (!el || !t) return;
    el.textContent = `${t.emoji} ${t.label}`;
    // Reset spot label when target changes without a new spot selected
    const spot = $('ai-spot-label');
    if (spot && !activeSpotId) spot.textContent = '— pilih spot di peta';
  }

  /* ══════════════════════════════════════════════════════
     CONTROLS
  ══════════════════════════════════════════════════════ */
  function _initControls() {
    const d = $('date-input');
    if (d) {
      d.value = new Date().toISOString().split('T')[0];
      d.addEventListener('change', _loadSpots);
    }
    $('criteria-select')?.addEventListener('change', _loadSpots);
    $('load-btn')?.addEventListener('click', _loadSpots);
    $('target-select-mobile')?.addEventListener('change', e => _setTarget(e.target.value));
  }

  /* ══════════════════════════════════════════════════════
     LOAD SPOTS
  ══════════════════════════════════════════════════════ */
  async function _loadSpots() {
    lastDate     = $('date-input')?.value     || new Date().toISOString().split('T')[0];
    lastCriteria = $('criteria-select')?.value || 'mabims_2021';
    const btn = $('load-btn');
    if (btn) btn.disabled = true;
    _setStatus('Menghitung prediksi…', false, true);

    try {
      const url = `/api/spots?date=${lastDate}&criteria=${lastCriteria}&target=${activeTarget}`;
      const res  = await fetch(url);
      const json = await res.json();
      if (json.status !== 'ok') throw new Error(json.message || 'Respons tidak valid');

      spotsData = json.data.spots;
      _renderSpotList(spotsData);
      _renderMapMarkers(spotsData);
      if (heatmapOn) _renderHeatmap(spotsData);
      _loadTopSpots();

      const vis = spotsData.filter(s => s.visibility.visible).length;
      _setStatus(`${spotsData.length} spot · ${vis} kondisi baik · ${lastDate}`);

      const exportBtn = $('export-btn');
      if (exportBtn) exportBtn.disabled = false;

    } catch (e) {
      _setStatus(`Gagal memuat: ${e.message}`, true);
    } finally {
      if (btn) btn.disabled = false;
      _hideLoading();
      setTimeout(() => map && map.invalidateSize(), 100);
    }
  }

  /* ══════════════════════════════════════════════════════
     TOP SPOTS
  ══════════════════════════════════════════════════════ */
  async function _loadTopSpots() {
    const section = $('top-spots-section');
    const list    = $('top-spots-list');
    if (!section || !list) return;

    try {
      const res  = await fetch(`/api/top-spots?date=${lastDate}&criteria=${lastCriteria}&target=${activeTarget}&n=3`);
      const json = await res.json();
      if (json.status !== 'ok') return;

      const spots = json.data.top_spots;
      section.style.display = '';
      list.innerHTML = '';

      spots.forEach((spot, rank) => {
        const v     = spot.visibility;
        const color = VisibilityEngine.scoreColor(v.score);
        const t     = TARGETS[activeTarget] || TARGETS.hilal;
        const card  = document.createElement('div');
        card.className = 'top-card';
        card.innerHTML = `
          <div class="top-card-img-wrap">
            <img src="${t.img}" alt="${spot.name}"
                 class="top-card-img"
                 onerror="this.src='https://images.unsplash.com/photo-1543722530-d2c3201371e7?w=120&q=60'" />
            <span class="top-rank">#${rank + 1}</span>
          </div>
          <div class="top-card-body">
            <div class="top-card-name">${spot.name}</div>
            <div class="top-card-province">${spot.province || ''} · ↑${spot.elevation}m</div>
            <div class="top-card-score">
              <span class="score-bar-wrap">
                <span class="score-bar-fill" style="width:${v.score}%;background:${color}"></span>
              </span>
              <span style="color:${color};font-weight:700;font-size:.78rem">${v.score}/100</span>
            </div>
            <div class="top-card-badge">
              <span class="badge ${v.visible ? 'badge-green' : v.score >= 35 ? 'badge-amber' : 'badge-red'}">
                ${v.visible ? '✓ Baik' : v.score >= 35 ? '~ Batas' : '✗ Kurang'}
              </span>
              <span class="badge badge-muted">⬤ ${spot.light_pollution}</span>
            </div>
          </div>
        `;
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => _selectSpot(spot.id));
        list.appendChild(card);
      });
    } catch (_) { /* silent */ }
  }

  /* ══════════════════════════════════════════════════════
     SPOT LIST
  ══════════════════════════════════════════════════════ */
  function _renderSpotList(spots) {
    const list = $('spot-list');
    if (!list) return;
    list.innerHTML = '';
    if (!spots.length) { list.innerHTML = '<div class="empty-state">Tidak ada spot.</div>'; return; }

    spots.forEach(spot => {
      const vis = spot.visibility;
      const cls = VisibilityEngine.scoreClass(vis.score);
      const card = document.createElement('div');
      card.className  = `spot-card ${cls}`;
      card.dataset.id = spot.id;
      card.innerHTML  = `
        <div class="spot-name">${spot.name}</div>
        <div class="spot-province">${spot.province || ''} · ↑${spot.elevation ?? 0}m</div>
        <div class="spot-meta">
          ${_visBadge(vis)}
          <span class="badge badge-muted">⬤ ${spot.light_pollution}</span>
          <span class="spot-score">${vis.score}/100</span>
        </div>
      `;
      card.addEventListener('click', () => _selectSpot(spot.id));
      list.appendChild(card);
    });
  }

  function _visBadge(vis) {
    if (vis.visible)     return `<span class="badge badge-green">✓ Terlihat</span>`;
    if (vis.score >= 35) return `<span class="badge badge-amber">~ Batas</span>`;
    return                      `<span class="badge badge-red">✗ Tidak Terlihat</span>`;
  }

  /* ══════════════════════════════════════════════════════
     MAP MARKERS
  ══════════════════════════════════════════════════════ */
  function _renderMapMarkers(spots) {
    spotsLayerGroup.clearLayers();
    spots.forEach(spot => {
      const vis   = spot.visibility;
      const color = VisibilityEngine.scoreColor(vis.score);
      const icon  = L.divIcon({
        className: '',
        html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};
               border:2px solid #fff;box-shadow:0 0 10px ${color}99;cursor:pointer"></div>`,
        iconSize: [18,18], iconAnchor: [9,9], popupAnchor: [0,-14],
      });
      L.marker([spot.lat, spot.lon], { icon })
        .bindPopup(_popupHtml(spot), { maxWidth: 260 })
        .on('click', () => _selectSpot(spot.id))
        .addTo(spotsLayerGroup);
    });
  }

  function _popupHtml(spot) {
    const h = spot.hilal || {};
    const v = spot.visibility;
    const t = TARGETS[activeTarget] || TARGETS.hilal;
    const src = h.source === 'ephem' ? '🔭 live' : h.source === 'sample' ? '📄 sample' : '⚙ demo';
    return `
      <div style="min-width:200px;font-family:var(--font-body)">
        <img src="${t.img}" alt="${spot.name}"
             style="width:100%;height:72px;object-fit:cover;border-radius:5px;margin-bottom:.4rem"
             onerror="this.style.display='none'" />
        <strong style="font-size:.88rem">${spot.name}</strong>
        <div style="color:var(--muted);font-size:.7rem;margin:.1rem 0 .4rem">${spot.province||''} · ${src}</div>
        <div style="display:grid;grid-template-columns:auto 1fr;gap:.2rem .6rem;font-size:.78rem">
          ${_paramRowsHtml(h, v)}
        </div>
        <div style="margin-top:.4rem;padding-top:.35rem;border-top:1px solid var(--border);
                    font-size:.78rem;font-weight:700;color:${VisibilityEngine.scoreColor(v.score)}">
          ${v.label||''}: ${v.score}/100 · ${VisibilityEngine.statusLabel(v.visible)}
        </div>
        <button onclick="window._selectSpotFromPopup('${spot.id}')"
          style="margin-top:.4rem;width:100%;background:var(--accent);color:#fff;
                 border:none;border-radius:5px;padding:.3rem;font-size:.75rem;font-weight:600;cursor:pointer">
          Analisis + AI ↗
        </button>
      </div>`;
  }

  function _paramRowsHtml(h, v) {
    const pairs = activeTarget === 'hilal'
      ? [['Elongasi', h.elongation + '°'], ['Ketinggian', h.altitude + '°'],
         ['Umur Bulan', h.age_hours + ' jam'], ['Iluminasi', h.illumination + '%']]
      : activeTarget === 'meteor'
      ? [['Radian Alt.', (h.radiant_altitude||'—') + '°'],
         ['Interferensi ☽', (h.moon_interference||'—') + '%'],
         ['Transparansi', (h.transparency||'—') + '/10']]
      : activeTarget === 'iss'
      ? [['Elevasi', (h.elevation_angle||'—') + '°'],
         ['Durasi', (h.visibility_window||'—') + ' min'],
         ['Azimuth', (h.azimuth||'—') + '°'],
         ['Magnitudo', h.magnitude||'—']]
      : [['Gal. Alt.', (h.galactic_center_altitude||'—') + '°'],
         ['Fase ☽', (h.moon_phase_pct||'—') + '%'],
         ['Bortle', h.bortle_class||'—'],
         ['Mag. Batas', h.limiting_magnitude||'—']];
    return pairs.map(([k,v]) =>
      `<span style="color:var(--muted)">${k}</span><span>${v}</span>`
    ).join('');
  }

  window._selectSpotFromPopup = id => _selectSpot(id);

  /* ══════════════════════════════════════════════════════
     HEATMAP
  ══════════════════════════════════════════════════════ */
  const POLLUTION_R = {
    'sangat rendah': { r: 55000, o: .08 },
    'rendah':        { r: 40000, o: .13 },
    'sedang':        { r: 28000, o: .22 },
    'tinggi':        { r: 20000, o: .38 },
  };

  function _renderHeatmap(spots) {
    heatmapLayerGroup.clearLayers();
    spots.forEach(spot => {
      const p = POLLUTION_R[spot.light_pollution] || { r: 30000, o: .15 };
      L.circle([spot.lat, spot.lon], {
        radius: p.r, color: 'transparent',
        fillColor: '#e8a838', fillOpacity: p.o, interactive: false,
      }).addTo(heatmapLayerGroup);
    });
  }

  /* ══════════════════════════════════════════════════════
     SELECT SPOT
  ══════════════════════════════════════════════════════ */
  async function _selectSpot(id) {
    activeSpotId = id;
    const spot   = spotsData.find(s => s.id === id);
    if (!spot) return;

    document.querySelectorAll('.spot-card').forEach(c => c.classList.remove('active'));
    const card = document.querySelector(`.spot-card[data-id="${id}"]`);
    if (card) { card.classList.add('active'); card.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }

    if (window.matchMedia('(max-width: 768px)').matches) {
      UyutUI.closeSidebar(); UyutUI.openAI();
    }

    map.flyTo([spot.lat, spot.lon], 9, { duration: 1.0 });
    setTimeout(() => map.invalidateSize(), 300);

    _setStatus(`Menganalisis ${spot.name}…`, false, true);
    try {
      const res  = await fetch('/api/predict-hilal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: lastDate || new Date().toISOString().split('T')[0],
          lat: spot.lat, lon: spot.lon,
          elevation: spot.elevation || 0,
          criteria: lastCriteria || 'mabims_2021',
          target: activeTarget,
        }),
      });
      const json = await res.json();
      if (json.status !== 'ok') throw new Error(json.message);
      const d = json.data;
      spot.hilal      = d.hilal;
      spot.visibility = d.visibility;
      _renderDetailPanel(spot, d.all_criteria);
      IBMAssistant.setContext(d.hilal, d.visibility, activeTarget);
      IBMAssistant.autoNarrate(spot.name);
      _setStatus(`${spot.name} · skor ${d.visibility.score}/100`);
    } catch (_) {
      _renderDetailPanel(spot, null);
      IBMAssistant.setContext(spot.hilal, spot.visibility, activeTarget);
      IBMAssistant.autoNarrate(spot.name);
      _setStatus(`${spot.name} · data cache`);
    }
  }

  /* ══════════════════════════════════════════════════════
     DETAIL PANEL
  ══════════════════════════════════════════════════════ */
  function _renderDetailPanel(spot, allCriteria) {
    const panel = $('detail-panel');
    if (!panel) return;
    const h = spot.hilal || {};
    const v = spot.visibility;
    const scores = allCriteria || VisibilityEngine.scoreAll(h);
    const t = TARGETS[activeTarget] || TARGETS.hilal;

    const barsHtml = Object.entries(scores).map(([, s]) => {
      const fill = VisibilityEngine.scoreColor(s.score);
      return `<div class="crit-row">
        <div class="crit-label">
          <span>${s.label || s.criteria}</span>
          <span style="color:${fill}">${s.score}/100 · ${s.visible ? '✓' : '✗'}</span>
        </div>
        <div class="crit-bar-track">
          <div class="crit-bar-fill" style="width:${s.score}%;background:${fill}"></div>
        </div>
      </div>`;
    }).join('');

    const src = h.source === 'ephem' ? '<span style="color:var(--green);font-size:.65rem">● live</span>'
              : h.source === 'sample' ? '<span style="color:var(--amber);font-size:.65rem">● sample</span>'
              : '<span style="color:var(--muted);font-size:.65rem">● demo</span>';

    panel.innerHTML = `
      <img src="${t.img}" alt="${t.label}"
           style="width:100%;height:80px;object-fit:cover;border-radius:6px;margin-bottom:.5rem"
           onerror="this.style.display='none'" />
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.4rem">
        <h3 style="margin:0">${spot.name}</h3>${src}
      </div>
      <div class="data-grid">
        ${_detailParamRows(h, v)}
      </div>
      <div style="margin-top:.6rem">
        <h3 style="margin-bottom:.25rem">Kriteria Visibilitas</h3>
        <div class="criteria-bars">${barsHtml}</div>
      </div>
      <div style="margin-top:.5rem;font-size:.68rem;color:var(--muted)">
        ⏰ ${h.sunset_utc ? 'Maghrib: ' + h.sunset_utc : t.emoji + ' ' + t.label}
      </div>`;
    panel.classList.add('open');
  }

  function _detailParamRows(h, v) {
    const colorV = VisibilityEngine.scoreColor(v.score);
    const base = `
      <div class="data-row"><span class="data-label">Status</span>
        <span class="data-val" style="color:${colorV};font-size:.78rem">${v.visible ? '✓ Baik' : '✗ Kurang'}</span></div>
      <div class="data-row"><span class="data-label">Skor</span>
        <span class="data-val" style="color:${colorV}">${v.score}/100</span></div>`;
    if (activeTarget === 'hilal') return base + `
      <div class="data-row"><span class="data-label">Elongasi</span><span class="data-val">${h.elongation??'—'}°</span></div>
      <div class="data-row"><span class="data-label">Ketinggian</span><span class="data-val">${h.altitude??'—'}°</span></div>
      <div class="data-row"><span class="data-label">Umur</span><span class="data-val">${h.age_hours??'—'} jam</span></div>
      <div class="data-row"><span class="data-label">Iluminasi</span><span class="data-val">${h.illumination??'—'}%</span></div>`;
    if (activeTarget === 'meteor') return base + `
      <div class="data-row"><span class="data-label">Radian Alt.</span><span class="data-val">${h.radiant_altitude??'—'}°</span></div>
      <div class="data-row"><span class="data-label">Interferensi ☽</span><span class="data-val">${h.moon_interference??'—'}%</span></div>
      <div class="data-row"><span class="data-label">Transparansi</span><span class="data-val">${h.transparency??'—'}/10</span></div>`;
    if (activeTarget === 'iss') return base + `
      <div class="data-row"><span class="data-label">Elevasi</span><span class="data-val">${h.elevation_angle??'—'}°</span></div>
      <div class="data-row"><span class="data-label">Durasi</span><span class="data-val">${h.visibility_window??'—'} min</span></div>
      <div class="data-row"><span class="data-label">Azimuth</span><span class="data-val">${h.azimuth??'—'}°</span></div>
      <div class="data-row"><span class="data-label">Magnitudo</span><span class="data-val">${h.magnitude??'—'}</span></div>`;
    return base + `
      <div class="data-row"><span class="data-label">Gal. Alt.</span><span class="data-val">${h.galactic_center_altitude??'—'}°</span></div>
      <div class="data-row"><span class="data-label">Fase ☽</span><span class="data-val">${h.moon_phase_pct??'—'}%</span></div>
      <div class="data-row"><span class="data-label">Bortle</span><span class="data-val">${h.bortle_class??'—'}</span></div>
      <div class="data-row"><span class="data-label">Mag. Batas</span><span class="data-val">${h.limiting_magnitude??'—'}</span></div>`;
  }

  /* ══════════════════════════════════════════════════════
     HEALTH CHECK
  ══════════════════════════════════════════════════════ */
  async function _checkHealth() {
    try {
      const res  = await fetch('/api/health');
      const json = await res.json();
      const d    = json.data;
      const badge = $('health-badge');
      if (!badge) return;
      badge.className = `health-badge${d.ephem === 'aktif' ? ' ok' : ''}`;
      badge.innerHTML = `<span class="health-dot"></span>
        <span class="hide-xs">v${d.version} · ephem:${d.ephem.split(' ')[0]} · Granite:${d.granite.split(' ')[0]}</span>`;
    } catch { /* silent */ }
  }

  /* ══════════════════════════════════════════════════════
     EXPORT — PNG + TXT
  ══════════════════════════════════════════════════════ */
  function _buildExportPreview() {
    const t = TARGETS[activeTarget] || TARGETS.hilal;
    const top = [...spotsData].sort((a,b) => b.visibility.score - a.visibility.score).slice(0, 3);

    const rows = top.map((s, i) => {
      const v = s.visibility;
      const bar = v.score;
      const color = v.score >= 60 ? '#2ecc8e' : v.score >= 35 ? '#e8a838' : '#e85858';
      return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #1e2e45">
        <div style="font-size:1.1rem;width:22px;text-align:center;font-weight:700;color:#c89b3c">${i+1}</div>
        <div style="flex:1">
          <div style="font-size:.85rem;font-weight:600;color:#d4e0f0">${s.name}</div>
          <div style="font-size:.7rem;color:#6b839e">${s.province||''} · Bortle ${s.bortle??'—'}</div>
          <div style="height:4px;background:#1e2e45;border-radius:3px;margin-top:4px;overflow:hidden">
            <div style="height:100%;width:${bar}%;background:${color};border-radius:3px"></div>
          </div>
        </div>
        <div style="font-weight:700;color:${color};font-size:.85rem">${bar}/100</div>
      </div>`;
    }).join('');

    return `
      <div id="export-card" style="background:#0e1724;color:#d4e0f0;border-radius:10px;padding:20px;
                                    font-family:Inter,sans-serif;width:340px;max-width:100%">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
          <span style="font-size:1.3rem">${t.emoji}</span>
          <div>
            <div style="font-size:.9rem;font-weight:700">${t.label} — Top Spots</div>
            <div style="font-size:.7rem;color:#6b839e">${lastDate} · U.Y.U.T v2.0</div>
          </div>
          <div style="margin-left:auto;background:#054ada;color:#fff;border-radius:3px;padding:2px 6px;font-size:.65rem;font-weight:700">IBM</div>
        </div>
        ${rows}
        <div style="margin-top:10px;font-size:.65rem;color:#6b839e;text-align:center">
          Dihasilkan oleh U.Y.U.T · Powered by IBM Granite AI
        </div>
      </div>`;
  }

  function _buildReportLines() {
    const t = TARGETS[activeTarget] || TARGETS.hilal;
    const lines = [
      '================================================',
      `  U.Y.U.T v2.0 — Laporan Observasi`,
      `  Target   : ${t.emoji} ${t.label}`,
      `  Tanggal  : ${lastDate}`,
      `  Kriteria : ${lastCriteria.toUpperCase()}`,
      `  Dibuat   : ${new Date().toLocaleString('id-ID')}`,
      '================================================', '',
    ];
    [...spotsData].sort((a,b) => b.visibility.score - a.visibility.score)
      .forEach((s, i) => {
        const v = s.visibility;
        const h = s.hilal || {};
        lines.push(`${i+1}. ${s.name} (${s.province||'—'})`);
        lines.push(`   Koordinat : ${s.lat}, ${s.lon}  Elev: ${s.elevation}m`);
        lines.push(`   Bortle    : ${s.bortle||'—'}  Polusi: ${s.light_pollution}`);
        lines.push(`   Status    : ${v.visible ? '✓ BAIK' : '✗ KURANG'} (skor ${v.score}/100)`);
        if (activeTarget === 'hilal') {
          lines.push(`   Elongasi  : ${h.elongation}°`);
          lines.push(`   Ketinggian: ${h.altitude}°`);
          lines.push(`   Umur      : ${h.age_hours} jam`);
        }
        lines.push('');
      });
    lines.push('================================================');
    lines.push('  Dihasilkan oleh U.Y.U.T · IBM Granite AI');
    lines.push('================================================');
    return lines;
  }

  /* ══════════════════════════════════════════════════════
     HELPERS
  ══════════════════════════════════════════════════════ */

  /** Canvas rounded-rect path helper (replaces CanvasRenderingContext2D.roundRect for older browsers) */
  function _roundRect(ctx, x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function _setStatus(msg, isError = false, loading = false) {
    const el = $('status-bar');
    if (!el) return;
    el.textContent = loading ? '⏳ ' + msg : msg;
    el.style.color = isError ? 'var(--red)' : 'var(--muted)';
  }

  function _hideLoading() {
    const el = $('loading-overlay');
    if (el) el.classList.add('hidden');
  }

  /* ══════════════════════════════════════════════════════
     PUBLIC UI API
  ══════════════════════════════════════════════════════ */
  window.UyutUI = {
    setTarget: _setTarget,

    toggleSidebar() {
      const s = $('sidebar'); const b = $('sidebar-backdrop');
      const open = s?.classList.toggle('open');
      b?.classList.toggle('active', open);
      if (open) { $('ai-panel')?.classList.remove('open'); $('ai-backdrop')?.classList.remove('active'); }
      setTimeout(() => map?.invalidateSize(), 300);
    },
    closeSidebar() {
      $('sidebar')?.classList.remove('open');
      $('sidebar-backdrop')?.classList.remove('active');
      setTimeout(() => map?.invalidateSize(), 300);
    },
    toggleAI() {
      const a = $('ai-panel'); const b = $('ai-backdrop');
      const open = a?.classList.toggle('open');
      b?.classList.toggle('active', open);
      if (open) { $('sidebar')?.classList.remove('open'); $('sidebar-backdrop')?.classList.remove('active'); }
      setTimeout(() => map?.invalidateSize(), 300);
    },
    openAI()  {
      $('ai-panel')?.classList.add('open');
      $('ai-backdrop')?.classList.add('active');
      setTimeout(() => map?.invalidateSize(), 300);
    },
    closeAI() {
      $('ai-panel')?.classList.remove('open');
      $('ai-backdrop')?.classList.remove('active');
      setTimeout(() => map?.invalidateSize(), 300);
    },
    /** Export summary card as PNG using native Canvas API */
    exportReport() {
      if (!spotsData.length) return;
      const t   = TARGETS[activeTarget] || TARGETS.hilal;
      const top = [...spotsData].sort((a,b) => b.visibility.score - a.visibility.score).slice(0, 3);

      const canvas = $('export-canvas');
      if (!canvas) return;
      const W = 680, H = 80 + top.length * 64 + 50;
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');

      // Background
      ctx.fillStyle = '#0e1724';
      ctx.fillRect(0, 0, W, H);

      // Header row
      ctx.fillStyle = '#d4e0f0';
      ctx.font      = 'bold 15px Inter, sans-serif';
      ctx.fillText(`${t.emoji} ${t.label} — Top Spots`, 20, 32);
      ctx.fillStyle = '#6b839e';
      ctx.font      = '12px Inter, sans-serif';
      ctx.fillText(`${lastDate} · U.Y.U.T v2.0 · IBM Granite AI`, 20, 52);

      // Divider
      ctx.strokeStyle = '#1e2e45'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(20, 64); ctx.lineTo(W - 20, 64); ctx.stroke();

      // Spot rows
      top.forEach((s, i) => {
        const v   = s.visibility;
        const y   = 80 + i * 64;
        const col = v.score >= 60 ? '#2ecc8e' : v.score >= 35 ? '#e8a838' : '#e85858';

        // Rank
        ctx.fillStyle = '#c89b3c'; ctx.font = 'bold 14px Inter, sans-serif';
        ctx.fillText(`#${i + 1}`, 20, y + 18);

        // Name
        ctx.fillStyle = '#d4e0f0'; ctx.font = 'bold 13px Inter, sans-serif';
        ctx.fillText(s.name, 48, y + 18);

        // Province + elevation
        ctx.fillStyle = '#6b839e'; ctx.font = '11px Inter, sans-serif';
        ctx.fillText(`${s.province || ''} · Bortle ${s.bortle ?? '—'}`, 48, y + 34);

        // Score bar track
        const barX = 48, barY = y + 43, barW = W - 140, barH = 6;
        ctx.fillStyle = '#1e2e45';
        _roundRect(ctx, barX, barY, barW, barH, 3);
        ctx.fill();

        // Score bar fill
        ctx.fillStyle = col;
        _roundRect(ctx, barX, barY, barW * (v.score / 100), barH, 3);
        ctx.fill();

        // Score text
        ctx.fillStyle = col; ctx.font = 'bold 13px Inter, sans-serif';
        ctx.fillText(`${v.score}/100`, W - 80, y + 51);
      });

      // Footer
      ctx.fillStyle = '#6b839e'; ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Dihasilkan oleh U.Y.U.T · Powered by IBM Granite AI', W / 2, H - 14);
      ctx.textAlign = 'left';

      const a = document.createElement('a');
      a.href     = canvas.toDataURL('image/png');
      a.download = `uyut-${activeTarget}-${lastDate}.png`;
      a.click();
    },
    downloadReport() {
      if (!spotsData.length) return;
      const blob = new Blob([_buildReportLines().join('\n')], { type: 'text/plain;charset=utf-8' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `uyut-${activeTarget}-${lastDate}.txt`; a.click();
      URL.revokeObjectURL(url);
    },

    /* ── Settings modal ────────────────────────── */
    openSettings() {
      $('settings-modal')?.classList.add('open');
      $('settings-backdrop')?.classList.add('active');
    },
    closeSettings() {
      $('settings-modal')?.classList.remove('open');
      $('settings-backdrop')?.classList.remove('active');
    },

    /** Heatmap toggle wired from settings modal */
    settingToggleHeatmap(btn) {
      settings.heatmap = !settings.heatmap;
      btn.setAttribute('aria-checked', String(settings.heatmap));
      // mirror to map
      heatmapOn = settings.heatmap;
      $('heatmap-btn')?.classList.toggle('active', heatmapOn);
      if (heatmapOn) { _renderHeatmap(spotsData); heatmapLayerGroup.addTo(map); }
      else            { heatmapLayerGroup.removeFrom(map); }
    },

    /** Satellite refresh toggle */
    settingToggleSat(btn) {
      settings.sat = !settings.sat;
      btn.setAttribute('aria-checked', String(settings.sat));
      if (settings.sat && activeTarget === 'iss') {
        satInterval = setInterval(_loadSpots, 30000);
      } else {
        clearInterval(satInterval); satInterval = null;
      }
    },

    /** Distance units (km / miles) */
    settingSetUnits(unit, btn) {
      settings.units = unit;
      document.querySelectorAll('#setting-units .unit-chip').forEach(c =>
        c.classList.toggle('active', c.dataset.unit === unit));
    },

    /** Map tile theme */
    settingSetMapTheme(theme, btn) {
      settings.mapTheme = theme;
      document.querySelectorAll('#setting-map-theme .unit-chip').forEach(c =>
        c.classList.toggle('active', c.dataset.theme === theme));
      if (theme === 'dark') {
        if (!map.hasLayer(darkLayer))   darkLayer.addTo(map);
        if (map.hasLayer(streetLayer))  map.removeLayer(streetLayer);
      } else {
        if (!map.hasLayer(streetLayer)) streetLayer.addTo(map);
        if (map.hasLayer(darkLayer))    map.removeLayer(darkLayer);
      }
    },

    /* Expose heatmap toggle for the sidebar button too */
    toggleHeatmap() {
      heatmapOn = !heatmapOn;
      settings.heatmap = heatmapOn;
      $('heatmap-btn')?.classList.toggle('active', heatmapOn);
      // Sync setting toggle button state
      const settBtn = $('setting-heatmap');
      if (settBtn) settBtn.setAttribute('aria-checked', String(heatmapOn));
      if (heatmapOn) { _renderHeatmap(spotsData); heatmapLayerGroup.addTo(map); }
      else            { heatmapLayerGroup.removeFrom(map); }
    },
  };

})();
