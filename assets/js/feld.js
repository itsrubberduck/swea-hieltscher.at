/* ══════════════════════════════════════════════════════════════════
   FELD — Ebene 0.
   Die Wörter hängen an den gemalten Kreisen und folgen ihnen.
   Nähe öffnet sie. Kein Menü, keine Knöpfe.
   ══════════════════════════════════════════════════════════════════ */

import { $, $$, klemme, misch, zieh, grobzeiger } from './util.js';
import { GERADEN } from './inhalt.js';

export function feldAufbauen (pigment, aufOeffnen, klang) {
  const wurzel = document.documentElement;
  const glieder = $$('.feld__kreise a');
  const nachId = new Map();
  glieder.forEach((a, i) => {
    a.style.setProperty('--i', i);
    nachId.set(a.dataset.kreis, { a, nah: 0, x: 0, y: 0, r: 60 });
  });

  const zeiger = { x: -9999, y: -9999, da: false };
  let fokus = null;
  let oeffnend = null;

  /* ── Kandinskys Geraden ───────────────────────────────────────── */
  const svg = $('#linien');
  const NS = 'http://www.w3.org/2000/svg';
  const gFern = $('#linien-fern'), gNah = $('#linien-nah');
  /* Strichstärke folgt der Bildbreite — auf dem Telefon sonst Balken. */
  const dickeFaktor = () => klemme(innerWidth / 1200, 0.42, 1.15);
  const linien = GERADEN.map(g => {
    const l = document.createElementNS(NS, 'line');
    l.setAttribute('stroke-width', (g.dicke * dickeFaktor()).toFixed(2));
    l.setAttribute('stroke-linecap', 'round');
    l.style.opacity = String(0.16 + (1 - g.tiefe) * 0.34);
    (g.tiefe > 0.5 ? gFern : gNah).append(l);
    return { el: l, daten: g };
  });

  function linienStellen (px, py) {
    const B = innerWidth, H = innerHeight;
    const f = dickeFaktor();
    for (const { el, daten } of linien) {
      el.setAttribute('stroke-width', (daten.dicke * f).toFixed(2));
      const p = (1 - daten.tiefe) * 34;
      const ox = -px * p, oy = -py * p;
      el.setAttribute('x1', (daten.x1 * B + ox).toFixed(1));
      el.setAttribute('y1', (daten.y1 * H + oy).toFixed(1));
      el.setAttribute('x2', (daten.x2 * B + ox).toFixed(1));
      el.setAttribute('y2', (daten.y2 * H + oy).toFixed(1));
    }
  }

  /* ── Zeiger ───────────────────────────────────────────────────── */
  function zeigerVon (e) {
    zeiger.x = e.clientX; zeiger.y = e.clientY; zeiger.da = true;
    const nx = (e.clientX / innerWidth) * 2 - 1;
    const ny = (e.clientY / innerHeight) * 2 - 1;
    pigment && pigment.zeigerAuf(nx, -ny);
    if (!wurzel.dataset.beruehrt) wurzel.dataset.beruehrt = 'ja';
  }
  addEventListener('pointermove', e => { if (wurzel.dataset.modus === 'feld') zeigerVon(e); }, { passive: true });
  addEventListener('pointerleave', () => {
    zeiger.da = false; zeiger.x = -9999;
    pigment && pigment.zeigerWeg();
  });

  /* Auf Fingergeräten gibt es keine Annäherung: alles ist offen. */
  const grob = grobzeiger();

  /* ── Bild für Bild: Wörter an die Kreise heften ───────────────── */
  function stellen (kreise) {
    if (wurzel.dataset.modus !== 'feld') return;
    let naechster = null, beste = 0;

    for (const k of kreise) {
      const eintrag = nachId.get(k.id);
      if (!eintrag) continue;
      const { x, y, r } = k.schirm;
      eintrag.x = x; eintrag.y = y; eintrag.r = r;

      let nah = 0;
      if (grob) {
        nah = 0.55;
      } else if (zeiger.da) {
        const d = Math.hypot(zeiger.x - x, zeiger.y - y);
        nah = klemme(1 - (d - r * 0.35) / (r * 1.15), 0, 1);
      }
      eintrag.nah = misch(eintrag.nah, nah, 0.16);
      if (eintrag.nah > beste) { beste = eintrag.nah; naechster = eintrag; }

      pigment && pigment.naehe(k.id, eintrag.nah);
      klang && klang.naehe(k.id, eintrag.nah);

      const s = 1 + eintrag.nah * 0.13;
      const a = eintrag.a;
      a.style.setProperty('--x', x.toFixed(1) + 'px');
      a.style.setProperty('--y', y.toFixed(1) + 'px');
      a.style.setProperty('--s', s.toFixed(3));
    }

    /* nur einer ist „nah" */
    for (const [, e] of nachId) {
      const ist = e === naechster && beste > 0.34;
      if (ist && !e.a.hasAttribute('data-nah')) e.a.setAttribute('data-nah', '');
      if (!ist && e.a.hasAttribute('data-nah')) e.a.removeAttribute('data-nah');
    }
    if (beste > 0.34) wurzel.dataset.fokus = naechster.a.dataset.kreis;
    else delete wurzel.dataset.fokus;

    linienStellen(
      (zeiger.da ? zeiger.x / innerWidth : 0.5) * 2 - 1,
      (zeiger.da ? zeiger.y / innerHeight : 0.5) * 2 - 1
    );
  }

  pigment && pigment.beiBild(stellen);

  /* ── Öffnen ───────────────────────────────────────────────────── */
  glieder.forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      if (oeffnend) return;
      oeffnend = a;
      a.setAttribute('data-oeffnet', '');
      const ziel = a.getAttribute('href').slice(1);
      aufOeffnen(ziel);
      setTimeout(() => { a.removeAttribute('data-oeffnet'); oeffnend = null; }, 900);
    });
    /* Tastatur: Fokus zählt als Annäherung */
    a.addEventListener('focus', () => {
      const e = nachId.get(a.dataset.kreis);
      if (e) e.nah = 1;
      a.setAttribute('data-nah', '');
    });
  });

  return {
    zuruecksetzen () {
      delete wurzel.dataset.fokus;
      glieder.forEach(a => a.removeAttribute('data-oeffnet'));
      oeffnend = null;
    }
  };
}
