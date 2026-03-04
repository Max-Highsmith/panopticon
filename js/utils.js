/* ===================================================================
   PANOPTICON — Shared Utilities
   =================================================================== */

import { SCENARIOS } from './config.js';

// --- Formatting ---

export function formatAlt(alt) {
  if (alt === 'ground') return 'GROUND';
  if (alt == null) return '---';
  return Number(alt).toLocaleString() + ' ft';
}

export function formatSpd(gs) {
  return gs == null ? '---' : Math.round(gs) + ' kts';
}

export function formatHdg(hdg) {
  return hdg == null ? '---' : Math.round(hdg) + '\u00B0';
}

export function formatTime(s) {
  if (isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m + ':' + String(sec).padStart(2, '0');
}

// --- Color Mapping ---

export function getAltColor(alt) {
  if (alt === 'ground') return Cesium.Color.fromCssColorString('#ff4444');
  if (alt == null)      return Cesium.Color.fromCssColorString('#888888');
  if (alt < 5000)       return Cesium.Color.fromCssColorString('#ff6600');
  if (alt < 20000)      return Cesium.Color.fromCssColorString('#ffcc00');
  if (alt < 35000)      return Cesium.Color.fromCssColorString('#00ff41');
  return Cesium.Color.fromCssColorString('#00ccff');
}

// --- Time Conversion ---

export function secsToUTC(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')} UTC`;
}

export function secsToLocal(secs, activeScenario) {
  const sc = SCENARIOS[activeScenario];
  if (!sc || !sc.localTz) return '';
  const local = secs + sc.localTz.offset * 3600;
  const h = Math.floor(((local % 86400) + 86400) % 86400 / 3600);
  const m = Math.floor((((local % 3600) + 3600) % 3600) / 60);
  const s = Math.floor(((local % 60) + 60) % 60);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')} ${sc.localTz.name}`;
}

export function replayAbsDate(dateStr, secsSinceMidnight) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCSeconds(secsSinceMidnight);
  return d;
}

// --- Geodesic Extrapolation ---

export function extrapolate(lat, lon, gs, track, dtSec) {
  if (gs == null || track == null || gs === 0) return { lat, lon };
  const dist = gs * 0.514444 * dtSec;
  const R = 6371000;
  const trackRad = Cesium.Math.toRadians(track);
  const lat1 = Cesium.Math.toRadians(lat);
  const lon1 = Cesium.Math.toRadians(lon);
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(dist / R) + Math.cos(lat1) * Math.sin(dist / R) * Math.cos(trackRad)
  );
  const lon2 = lon1 + Math.atan2(
    Math.sin(trackRad) * Math.sin(dist / R) * Math.cos(lat1),
    Math.cos(dist / R) - Math.sin(lat1) * Math.sin(lat2)
  );
  return { lat: Cesium.Math.toDegrees(lat2), lon: Cesium.Math.toDegrees(lon2) };
}

// --- Trace Interpolation (Replay) ---

export function interpolateTrace(trace, absTime) {
  if (trace.length === 0) return null;
  if (absTime <= trace[0].t) return trace[0];
  if (absTime >= trace[trace.length - 1].t) return trace[trace.length - 1];

  for (let i = 0; i < trace.length - 1; i++) {
    if (trace[i].t <= absTime && absTime <= trace[i + 1].t) {
      const a = trace[i], b = trace[i + 1];
      const dt = b.t - a.t;
      if (dt === 0) return a;
      const frac = (absTime - a.t) / dt;

      const lerp = (va, vb, fallback) => {
        const na = typeof va === 'number' && !isNaN(va) ? va : null;
        const nb = typeof vb === 'number' && !isNaN(vb) ? vb : null;
        if (na != null && nb != null) return na + (nb - na) * frac;
        return na ?? nb ?? fallback;
      };

      return {
        lat:   lerp(a.lat, b.lat, 0),
        lon:   lerp(a.lon, b.lon, 0),
        alt:   lerp(a.alt, b.alt, 10000),
        gs:    lerp(a.gs, b.gs, 0),
        track: lerp(a.track, b.track, 0),
      };
    }
  }
  return trace[trace.length - 1];
}

// --- Cached DOM References ---

const domCache = new Map();

export function $(id) {
  if (!domCache.has(id)) {
    domCache.set(id, document.getElementById(id));
  }
  return domCache.get(id);
}
