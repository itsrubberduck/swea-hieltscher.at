/* ── kleine Werkzeuge ─────────────────────────────────────────── */

export const $  = (s, w = document) => w.querySelector(s);
export const $$ = (s, w = document) => [...w.querySelectorAll(s)];

export const klemme = (v, a, b) => Math.min(b, Math.max(a, v));
export const misch  = (a, b, t) => a + (b - a) * t;
export const bogen  = (t) => t * t * (3 - 2 * t);           // smoothstep
export const raus   = (t) => 1 - Math.pow(1 - t, 3);         // easeOutCubic
export const rein   = (t) => t * t * t;
export const sanft  = (t) => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;

/** Gedämpfte Annäherung, bildratenunabhängig. */
export const zieh = (ist, soll, rate, dt) =>
  misch(soll, ist, Math.exp(-rate * dt));

/** Deterministischer Zufall — dieselbe Seite sieht immer gleich aus. */
export function saatZufall (saat) {
  let s = saat >>> 0;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;  s >>>= 0;
    return s / 4294967296;
  };
}

export const hex2rgb = (h) => {
  const n = parseInt(h.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export const cssFarbe = (name) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export const ruhigGewuenscht = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
  document.documentElement.dataset.ruhe === 'an';

export const grobzeiger = () =>
  window.matchMedia('(hover: none) and (pointer: coarse)').matches;

/** Speichert Einstellungen lokal — verlässt niemals das Gerät. */
export const merke = {
  lies (k, vor) { try { const v = localStorage.getItem('swea:' + k); return v === null ? vor : v; } catch { return vor; } },
  schreib (k, v) { try { localStorage.setItem('swea:' + k, v); } catch {} }
};
