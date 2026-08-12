/**
 * U.Y.U.T — visibility-engine.js
 * Client-side hilal visibility scoring mirror of the Flask backend.
 * Used to compute/display results instantly from cached API data
 * without a round-trip.
 */

const VisibilityEngine = (() => {
  const CRITERIA = {
    wujudul_hilal: {
      min_altitude:   0,
      min_elongation: 0,
      min_age_hours:  0,
      label: 'Wujudul Hilal',
    },
    mabims_2021: {
      min_altitude:   3.0,
      min_elongation: 6.4,
      min_age_hours:  0,
      label: 'MABIMS 2021',
    },
    odeh: {
      min_altitude:   5.0,
      min_elongation: 8.0,
      min_age_hours:  12.0,
      label: 'Odeh',
    },
  };

  /**
   * Score hilal visibility.
   * @param {object} hilal  — { altitude, elongation, age_hours }
   * @param {string} key    — criteria key
   * @returns {{ criteria, label, visible, score, details }}
   */
  function score(hilal, key = 'mabims_2021') {
    const c   = CRITERIA[key] || CRITERIA.mabims_2021;
    const alt = hilal.altitude   ?? 0;
    const el  = hilal.elongation ?? 0;
    const age = hilal.age_hours  ?? 0;

    const visible = alt >= c.min_altitude && el >= c.min_elongation && age >= c.min_age_hours;

    const altScore  = Math.min(100, Math.max(0, (alt / 15) * 100));
    const elScore   = Math.min(100, Math.max(0, (el  / 20) * 100));
    const ageScore  = Math.min(100, Math.max(0, (age / 48) * 100));
    const composite = +(altScore * 0.4 + elScore * 0.4 + ageScore * 0.2).toFixed(1);

    return {
      criteria: key,
      label:    c.label,
      visible,
      score:    composite,
      details: {
        altitude_ok:   alt >= c.min_altitude,
        elongation_ok: el  >= c.min_elongation,
        age_ok:        age >= c.min_age_hours,
      },
    };
  }

  /**
   * Score against all criteria at once.
   * @returns {object} keyed by criteria name
   */
  function scoreAll(hilal) {
    return Object.fromEntries(
      Object.keys(CRITERIA).map(k => [k, score(hilal, k)])
    );
  }

  /**
   * Return CSS class string for a visibility score.
   * @param {number} s — 0..100
   */
  function scoreClass(s) {
    if (s >= 60) return 'visible';
    if (s >= 35) return 'borderline';
    return 'not-visible';
  }

  /**
   * Return CSS colour variable name for score.
   */
  function scoreColor(s) {
    if (s >= 60) return 'var(--green)';
    if (s >= 35) return 'var(--amber)';
    return 'var(--red)';
  }

  /** Human-readable status label in Bahasa Indonesia */
  function statusLabel(visible) {
    return visible ? '✓ Terlihat' : '✗ Tidak Terlihat';
  }

  return { score, scoreAll, scoreClass, scoreColor, statusLabel, CRITERIA };
})();
