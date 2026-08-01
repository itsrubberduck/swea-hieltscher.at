/* ══════════════════════════════════════════════════════════════════
   ARTEFAKTE — in jedem Raum liegt ein Ding, das man anfassen kann.
   Saite, Kreis, Scheibe, Wurzel, Feld.
   ══════════════════════════════════════════════════════════════════ */

import { $, $$, klemme, misch } from './util.js';
import { TRIGRAMME } from './inhalt.js';
import { figurZeichnen, spurZeichnen } from './roto.js';

/* ── Klang: ein sehr leiser, gestrichener Ton ───────────────────── */
let hof = null;
function klangAn () {
  if (hof) return hof;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  hof = new AC();
  return hof;
}
export function tonSpielen (hz, dauer = 1.6, art = 'triangle', lautstaerke = 0.055) {
  if (document.documentElement.dataset.ton !== 'an') return;
  const c = klangAn();
  if (!c) return;
  if (c.state === 'suspended') c.resume();
  const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
  o.type = art; o.frequency.value = hz;
  f.type = 'lowpass'; f.frequency.value = 2600; f.Q.value = 0.7;
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.exponentialRampToValueAtTime(lautstaerke, c.currentTime + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dauer);
  o.connect(f); f.connect(g); g.connect(c.destination);
  o.start(); o.stop(c.currentTime + dauer + 0.05);
}

/* ══════════════════════════════════════════════════════════════════
   DIE SAITE — Klang
   ══════════════════════════════════════════════════════════════════ */
function saiteBauen (wurzel) {
  const halter = $('.saite', wurzel);
  if (!halter) return;
  const pfad = $('path', halter);
  if (!pfad) return;

  const B = 1000, H = 220, M = H / 2;
  /* Die vier Saiten der Violine */
  const TOENE = [196.00, 293.66, 440.00, 659.25];   // g d a e'

  let zupf = 0, ziel = 0, ort = 0.5, freq = 440, zeit = 0;
  let laeuft = false;

  function zeichne (t) {
    zeit = t / 1000;
    zupf = misch(zupf, ziel, 0.06);
    ziel *= 0.955;

    let d = `M0 ${M}`;
    const n = 60;
    for (let i = 1; i <= n; i++) {
      const x = (i / n) * B;
      const u = i / n;
      /* Grundschwingung + zwei Obertöne, an der Zupfstelle angeregt */
      const h  = Math.sin(Math.PI * u)       * Math.sin(zeit * 15.5) * 1.0
               + Math.sin(Math.PI * u * 2)   * Math.sin(zeit * 31.0) * 0.34
               + Math.sin(Math.PI * u * 3)   * Math.sin(zeit * 46.5) * 0.16;
      const lokal = Math.exp(-Math.pow((u - ort) * 3.2, 2));
      const y = M + h * zupf * (0.45 + lokal * 0.8);
      d += `L${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    pfad.setAttribute('d', d);

    if (zupf > 0.4) halter.setAttribute('data-schwingt', '');
    else halter.removeAttribute('data-schwingt');

    if (zupf > 0.05 || ziel > 0.05) requestAnimationFrame(zeichne);
    else { laeuft = false; pfad.setAttribute('d', `M0 ${M} L${B} ${M}`); }
  }

  function anregen (staerke, x) {
    ort = klemme(x, 0.03, 0.97);
    ziel = Math.max(ziel, klemme(staerke, 6, 46));
    freq = TOENE[Math.min(3, Math.floor(ort * 4))];
    if (!laeuft) { laeuft = true; requestAnimationFrame(zeichne); }
  }

  let letztes = null;
  halter.addEventListener('pointermove', e => {
    const b = halter.getBoundingClientRect();
    const x = (e.clientX - b.left) / b.width;
    const y = (e.clientY - b.top) / b.height;
    const nah = Math.abs(y - 0.5) < 0.20;
    if (nah && letztes !== null && Math.abs(x - letztes) > 0.012) {
      anregen(Math.abs(x - letztes) * 320, x);
      if (Math.random() < 0.09) tonSpielen(freq, 1.4, 'sawtooth', 0.03);
    }
    letztes = nah ? x : null;
  });
  halter.addEventListener('pointerdown', e => {
    const b = halter.getBoundingClientRect();
    const x = (e.clientX - b.left) / b.width;
    anregen(40, x);
    tonSpielen(TOENE[Math.min(3, Math.floor(x * 4))], 2.4, 'sawtooth', 0.05);
  });
  halter.addEventListener('pointerleave', () => { letztes = null; });
}

/* ══════════════════════════════════════════════════════════════════
   DER KREIS — Bagua. Man führt die Figur um den Kreis.
   ══════════════════════════════════════════════════════════════════ */
function baguaBauen (wurzel) {
  const halter = $('.bagua', wurzel);
  if (!halter) return;
  const svg = $('svg', halter);
  if (!svg) return;

  const B = 600, H = 460, CX = 300, CY = 250, RX = 210, RY = 96;
  svg.setAttribute('viewBox', `0 0 ${B} ${H}`);

  const gRing = $('.bagua__ring', svg);
  const gTri  = $('.bagua__trigramme', svg);
  const gFig  = $('.bagua__figur', svg);
  const gSpur = $('.bagua__spur', svg);
  const NS = 'http://www.w3.org/2000/svg';

  /* Der Kreis, schräg gesehen */
  const bahn = document.createElementNS(NS, 'ellipse');
  bahn.setAttribute('cx', CX); bahn.setAttribute('cy', CY);
  bahn.setAttribute('rx', RX); bahn.setAttribute('ry', RY);
  bahn.setAttribute('fill', 'none');
  bahn.setAttribute('stroke', 'currentColor');
  gRing.append(bahn);
  gRing.style.color = 'var(--tusche-fern)';
  bahn.style.strokeDasharray = '2 8';
  bahn.style.opacity = '.45';

  /* Acht Trigramme */
  const marken = TRIGRAMME.map((t, i) => {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const x = CX + Math.cos(a) * (RX + 46);
    const y = CY + Math.sin(a) * (RY + 52);
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    t.zeichen.forEach((z, j) => {
      const y0 = -16 + j * 7;
      if (z) {
        const r = document.createElementNS(NS, 'rect');
        r.setAttribute('x', -13); r.setAttribute('y', y0);
        r.setAttribute('width', 26); r.setAttribute('height', 3.4);
        g.append(r);
      } else {
        [-13, 3].forEach(x0 => {
          const r = document.createElementNS(NS, 'rect');
          r.setAttribute('x', x0); r.setAttribute('y', y0);
          r.setAttribute('width', 10); r.setAttribute('height', 3.4);
          g.append(r);
        });
      }
    });
    const tx = document.createElementNS(NS, 'text');
    tx.setAttribute('y', 22);
    tx.textContent = t.wort;
    g.append(tx);
    gTri.append(g);
    return { g, winkel: (i / 8) * Math.PI * 2 - Math.PI / 2, daten: t };
  });

  const figPfade = [];
  for (let i = 0; i < 7; i++) {
    const p = document.createElementNS(NS, 'path');
    gFig.append(p); figPfade.push(p);
  }
  const spurPfad = document.createElementNS(NS, 'path');
  gSpur.append(spurPfad);

  let winkel = -Math.PI / 2;
  let zielWinkel = winkel;
  let gefuehrt = false, letzteFuehrung = 0;
  let strecke = 0;
  const spur = [];
  let letztesBild = -1;

  halter.addEventListener('pointermove', e => {
    const b = svg.getBoundingClientRect();
    const x = ((e.clientX - b.left) / b.width) * B - CX;
    const y = ((e.clientY - b.top) / b.height) * H - CY;
    zielWinkel = Math.atan2(y / (RY / RX), x);
    gefuehrt = true; letzteFuehrung = performance.now();
  });
  halter.addEventListener('pointerleave', () => { gefuehrt = false; });

  function schleife (t) {
    requestAnimationFrame(schleife);
    if (!halter.closest('.raum[data-offen]') && !document.documentElement.dataset.schrift) return;

    /* Ohne Führung geht die Figur von selbst weiter. */
    if (!gefuehrt || performance.now() - letzteFuehrung > 2600) zielWinkel += 0.0055;

    /* kürzester Weg */
    let d = zielWinkel - winkel;
    while (d >  Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    const schritt = d * 0.055;
    winkel += schritt;
    strecke += Math.abs(schritt) * RX;

    const x = CX + Math.cos(winkel) * RX;
    const y = CY + Math.sin(winkel) * RY;
    /* vorne = größer */
    const tiefe = (Math.sin(winkel) + 1) / 2;
    const groesse = misch(0.68, 1.16, tiefe);
    /* seitlich = volle Breite, vorn/hinten = gestaucht */
    const drehung = Math.cos(winkel);

    const bild = Math.floor(performance.now() / 125);   // 8 Bilder je Sekunde
    if (bild !== letztesBild) {
      letztesBild = bild;
      const phase = (strecke / 78) % 1;
      const teile = figurZeichnen(phase, bild, drehung || 0.2, true);
      figPfade.forEach((p, i) => {
        p.setAttribute('d', teile[i] || '');
        p.setAttribute('transform',
          `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${groesse.toFixed(3)})`);
        p.setAttribute('stroke-width', (2.5 / groesse).toFixed(2));
      });

      spur.push({ x, y });
      if (spur.length > 46) spur.shift();
      spurPfad.setAttribute('d', spurZeichnen(spur.map(p => [p.x, p.y]), bild));
    }

    /* Trigramm unter der Figur hervorheben */
    marken.forEach(m => {
      let dd = Math.abs(((winkel - m.winkel + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      const nah = dd > Math.PI - 0.42;
      if (nah) m.g.setAttribute('data-aktiv', '');
      else m.g.removeAttribute('data-aktiv');
    });
  }
  requestAnimationFrame(schleife);
}

/* ══════════════════════════════════════════════════════════════════
   DIE SCHEIBE — Atem
   ══════════════════════════════════════════════════════════════════ */
function atemBauen (wurzel, atem) {
  const wort = $('.atem__wort', wurzel);
  if (!wort) return;
  const setze = p => { wort.textContent = p === 'ein' ? 'ein' : 'aus'; };
  setze(atem.phase());
  atem.beiPhase(setze);
}

/* ══════════════════════════════════════════════════════════════════
   DIE WURZEL — ein Strang, der sich verzweigt
   ══════════════════════════════════════════════════════════════════ */
function wurzelBauen (wurzel) {
  const halter = $('.wurzelwerk', wurzel);
  if (!halter) return;
  const svg = $('svg', halter);
  const NS = 'http://www.w3.org/2000/svg';
  const B = 600, H = 320;
  svg.setAttribute('viewBox', `0 0 ${B} ${H}`);

  const pfade = [];
  function ast (x, y, winkel, laenge, dicke, tiefe) {
    if (tiefe > 4 || laenge < 8) return;
    const n = 6;
    let d = `M${x.toFixed(1)} ${y.toFixed(1)}`;
    let cx = x, cy = y, cw = winkel;
    for (let i = 0; i < n; i++) {
      cw += (Math.sin((tiefe + 1) * 3.1 + i * 1.7) * 0.26);
      cx += Math.cos(cw) * (laenge / n);
      cy += Math.sin(cw) * (laenge / n);
      d += `L${cx.toFixed(1)} ${cy.toFixed(1)}`;
    }
    pfade.push({ d, dicke, laenge: laenge * 1.25, tiefe });
    ast(cx, cy, cw - 0.5 - tiefe * 0.05, laenge * 0.66, dicke * 0.6, tiefe + 1);
    ast(cx, cy, cw + 0.55 + tiefe * 0.05, laenge * 0.7,  dicke * 0.62, tiefe + 1);
  }
  ast(B / 2, 10, Math.PI / 2, 92, 3.4, 0);

  pfade.forEach((p, i) => {
    const el = document.createElementNS(NS, 'path');
    el.setAttribute('d', p.d);
    el.setAttribute('stroke-width', p.dicke.toFixed(2));
    el.style.strokeDasharray = p.laenge.toFixed(1);
    el.style.strokeDashoffset = p.laenge.toFixed(1);
    el.style.transition = `stroke-dashoffset 1.1s cubic-bezier(.22,1,.28,1) ${(p.tiefe * 0.34 + i * 0.012).toFixed(2)}s`;
    el.style.opacity = (1 - p.tiefe * 0.14).toFixed(2);
    svg.append(el);
  });

  /* Wächst, sobald das Fragment nah genug ist. */
  const box = halter.closest('.fragment');
  if (!box) return;
  const beobachter = new MutationObserver(() => {
    if (box.hasAttribute('data-nah')) {
      $$('path', svg).forEach(p => { p.style.strokeDashoffset = '0'; });
    }
  });
  beobachter.observe(box, { attributes: true, attributeFilter: ['data-nah'] });
}

/* ══════════════════════════════════════════════════════════════════ */
export function artefakteAufbauen (atem) {
  saiteBauen(document);
  baguaBauen(document);
  atemBauen(document, atem);
  wurzelBauen(document);
}
