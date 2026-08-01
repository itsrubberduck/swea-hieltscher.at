/* ══════════════════════════════════════════════════════════════════
   KLANG — die Seite klingt leise mit.

   Jeder Kreis hat einen eigenen Ton. Näherst du dich einem Kreis,
   schwillt sein Ton an; entfernst du dich, verklingt er. Darunter
   liegt ein sehr leiser Grundton, der mit dem Atem heller und
   dunkler wird. Nichts davon ist Musik im Vordergrund — es ist der
   Raumton eines Ateliers.

   Alles bleibt aus, bis jemand den Klang einschaltet. Browser
   erlauben Ton ohnehin erst nach einer Berührung.
   ══════════════════════════════════════════════════════════════════ */

import { klemme } from './util.js';

/* Pentatonik auf A — es kann nichts falsch klingen, egal welche
   Kreise gleichzeitig anschwellen. */
const TOENE = {
  bild:      220.00,  // a
  klang:     329.63,  // e'
  kreis:     146.83,  // d
  atem:      261.63,  // c'
  wurzel:    110.00,  // A
  feldraum:  392.00,  // g'
  weg:       196.00,  // g
  begegnung: 293.66   // d'
};

/** Die vier Saiten der Violine — für den Klang-Raum. */
export const SAITEN = [196.00, 293.66, 440.00, 659.25];

export function klangAufbauen (atem) {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;

  let hof = null, meister = null, filter = null;
  let grund = null, grundGain = null;
  const stimmen = new Map();
  let an = false, aufgebaut = false;

  function aufbauen () {
    if (aufgebaut) return;
    hof = new AC();

    meister = hof.createGain();
    meister.gain.value = 0;
    filter = hof.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2200;
    filter.Q.value = 0.4;
    filter.connect(meister);
    meister.connect(hof.destination);

    /* Grundton: zwei leicht verstimmte Oszillatoren — das trägt. */
    grundGain = hof.createGain();
    grundGain.gain.value = 0.055;
    grundGain.connect(filter);
    grund = [55, 55.15, 82.5].map((hz, i) => {
      const o = hof.createOscillator();
      o.type = i === 2 ? 'sine' : 'triangle';
      o.frequency.value = hz;
      const g = hof.createGain();
      g.gain.value = i === 2 ? 0.35 : 1;
      o.connect(g); g.connect(grundGain);
      o.start();
      return o;
    });

    /* Für jeden Kreis eine schlafende Stimme. */
    for (const [id, hz] of Object.entries(TOENE)) {
      const o = hof.createOscillator();
      o.type = 'sine';
      o.frequency.value = hz;
      const ob = hof.createOscillator();     // eine Quinte darüber, sehr leise
      ob.type = 'sine';
      ob.frequency.value = hz * 1.5;
      const g = hof.createGain();
      g.gain.value = 0;
      const gb = hof.createGain();
      gb.gain.value = 0.28;
      o.connect(g); ob.connect(gb); gb.connect(g);
      g.connect(filter);
      o.start(); ob.start();
      stimmen.set(id, g);
    }
    aufgebaut = true;
  }

  /* Der Grundton atmet mit. */
  let uhr = null;
  function atmenLassen () {
    if (uhr) return;
    uhr = setInterval(() => {
      if (!an || !hof || hof.state !== 'running') return;
      const a = atem.wert();                     // -1 .. 1
      filter.frequency.setTargetAtTime(1500 + (a + 1) * 900, hof.currentTime, 0.6);
      grundGain.gain.setTargetAtTime(0.040 + (a + 1) * 0.012, hof.currentTime, 0.6);
    }, 220);
  }

  /** Ein einzelner, angeschlagener Ton. */
  function schlagen (hz, dauer = 1.8, art = 'triangle', staerke = 0.10) {
    if (!an || !hof) return;
    if (hof.state === 'suspended') hof.resume();
    const o = hof.createOscillator(), g = hof.createGain();
    o.type = art; o.frequency.value = hz;
    const t = hof.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(staerke, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
    o.connect(g); g.connect(filter);
    o.start(t); o.stop(t + dauer + 0.05);
  }

  return {
    get an () { return an; },

    einschalten () {
      aufbauen();
      if (hof.state === 'suspended') hof.resume();
      an = true;
      atmenLassen();
      meister.gain.setTargetAtTime(0.85, hof.currentTime, 0.5);
      /* Damit sofort klar ist, dass es wirkt: eine ruhige Quinte. */
      schlagen(220, 2.4, 'triangle', 0.09);
      setTimeout(() => schlagen(329.63, 3.0, 'triangle', 0.07), 260);
    },

    ausschalten () {
      if (!aufgebaut) { an = false; return; }
      an = false;
      meister.gain.setTargetAtTime(0.0001, hof.currentTime, 0.35);
      stimmen.forEach(g => g.gain.setTargetAtTime(0, hof.currentTime, 0.3));
    },

    /** Annäherung an einen Kreis: seine Stimme schwillt an. */
    naehe (id, v) {
      if (!an || !aufgebaut) return;
      const g = stimmen.get(id);
      if (!g) return;
      g.gain.setTargetAtTime(klemme(v, 0, 1) * 0.075, hof.currentTime, 0.20);
    },

    /** Man taucht in einen Kreis ein. */
    hinein (id) {
      if (!an) return;
      const hz = TOENE[id] || 220;
      schlagen(hz, 3.2, 'triangle', 0.11);
      setTimeout(() => schlagen(hz * 2, 2.4, 'sine', 0.05), 180);
      stimmen.forEach((g, k) => g.gain.setTargetAtTime(k === id ? 0.045 : 0, hof.currentTime, 0.5));
    },

    hinaus () {
      if (!an || !aufgebaut) return;
      stimmen.forEach(g => g.gain.setTargetAtTime(0, hof.currentTime, 0.5));
      schlagen(110, 2.6, 'sine', 0.06);
    },

    /** Ein Fragment wird zum ersten Mal gefunden. */
    gefunden () {
      if (!an) return;
      const skala = [440, 523.25, 587.33, 659.25, 783.99];
      schlagen(skala[Math.floor(Math.random() * skala.length)], 1.4, 'sine', 0.035);
    },

    schlagen,

    /** Falls der Browser den Ton erst nach einer Berührung erlaubt. */
    wecken () { if (an && hof && hof.state === 'suspended') hof.resume(); }
  };
}
