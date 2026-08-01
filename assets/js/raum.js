/* ══════════════════════════════════════════════════════════════════
   RAUM — der Inhalt windet sich vom Mittelpunkt nach außen.
   Man scrollt nicht durch eine Seite, man reist eine Spirale entlang.
   Schnelle Bewegung zoomt heraus (man sieht die Komposition),
   Stillstand zoomt heran (man kann lesen).
   ══════════════════════════════════════════════════════════════════ */

import { $, $$, klemme, misch, zieh, saatZufall, raus, ruhigGewuenscht, grobzeiger } from './util.js';

/* ── Die Spirale ────────────────────────────────────────────────── */
function spiraleBauen (schritte = 3000, dichte = 96, start = 2.4) {
  const punkte = [];
  let laenge = 0;
  let vx = 0, vy = 0;
  for (let i = 0; i < schritte; i++) {
    const th = start + i * 0.02;
    const r  = dichte * (th - start) + 40;
    const x  = Math.cos(th) * r;
    const y  = Math.sin(th) * r;
    if (i > 0) laenge += Math.hypot(x - vx, y - vy);
    punkte.push({ x, y, s: laenge });
    vx = x; vy = y;
  }
  return {
    punkte,
    laenge,
    /** Punkt und Tangente bei Bogenlänge s. */
    bei (s) {
      s = klemme(s, 0, laenge);
      let lo = 0, hi = punkte.length - 1;
      while (lo < hi - 1) {
        const m = (lo + hi) >> 1;
        if (punkte[m].s < s) lo = m; else hi = m;
      }
      const a = punkte[lo], b = punkte[hi];
      const t = b.s === a.s ? 0 : (s - a.s) / (b.s - a.s);
      const x = misch(a.x, b.x, t), y = misch(a.y, b.y, t);
      const dx = b.x - a.x, dy = b.y - a.y;
      const l = Math.hypot(dx, dy) || 1;
      return { x, y, tx: dx / l, ty: dy / l };
    }
  };
}

/* ── Inhalte in Fragmente zerlegen ──────────────────────────────────
   Es wird über ALLE Kinder gelaufen, nicht über eine Auswahlliste:
   sonst bleibt irgendwann ein Absatz liegen und landet vor dem Titel.
   Die Dokumentreihenfolge ist zugleich die Reihenfolge der Reise. ── */
function artVon (el) {
  const k = el.classList;
  if (k.contains('gross'))               return 'gross';
  if (k.contains('hinweis-medizinisch')) return 'hinweis';
  if (k.contains('klein'))               return 'hinweis';
  if (el.tagName === 'BLOCKQUOTE')       return 'zitat';
  if (el.tagName === 'A')                return 'tat';
  return 'text';
}

function fragmenteSammeln (raum) {
  const roh = [];
  const nimm = (el, art) => { if (el) roh.push({ el, art: art || artVon(el) }); };

  /* Überschrift + folgende Absätze gehören zusammen. */
  const bündeln = (kinder) => {
    let sammel = null;
    for (const kind of kinder) {
      if (kind.tagName === 'H3') {
        sammel = document.createElement('div');
        sammel.className = 'sammler';
        kind.replaceWith(sammel);
        sammel.append(kind);
        roh.push({ el: sammel, art: 'text' });
        continue;
      }
      if (sammel && kind.tagName === 'P' && !kind.classList.contains('gross')) {
        sammel.append(kind);
        continue;
      }
      sammel = null;
      nimm(kind);
    }
  };

  for (const kind of [...raum.children]) {
    const k = kind.classList;
    if (k.contains('raum__kopf'))      { nimm(kind, 'kopf'); continue; }
    if (k.contains('artefakt'))        { nimm(kind, 'modul'); continue; }
    if (k.contains('formular')) {
      /* Ein Formular am Stück wird höher als der Bildschirm. Also wandert
         jede Frage als eigenes Fragment auf die Spirale — man beantwortet
         sie eine nach der anderen, im Gehen.
         Das leere <form> bleibt stehen: die Felder tragen form="anfrage"
         und gehören ihm weiterhin an, auch von außerhalb. */
      for (const e of [...kind.children]) {
        nimm(e, e.classList.contains('formular__senden') ? 'senden'
              : e.classList.contains('klein')            ? 'hinweis'
              : 'frage');
      }
      kind.hidden = true;
      continue;
    }
    if (k.contains('kontakt'))         { nimm(kind, 'kontakt'); continue; }
    if (k.contains('raum__leib'))      { bündeln([...kind.children]); continue; }
    if (k.contains('raum__fuss'))      { for (const e of [...kind.children]) nimm(e); continue; }
    if (k.contains('werke'))           { for (const e of [...kind.children]) nimm(e, 'werk'); continue; }
    if (k.contains('liste') || k.contains('weg')) {
      for (const e of [...kind.children]) nimm(e, 'punkt');
      continue;
    }
    nimm(kind);                        // alles Übrige — nichts bleibt liegen
  }
  return roh;
}

/* ── Ein Raum ───────────────────────────────────────────────────── */
function raumBauen (el, id) {
  const roh = fragmenteSammeln(el);
  const tafel = document.createElement('div');
  tafel.className = 'tafel';

  const wuerfel = saatZufall(id.length * 7919 + roh.length * 104729);

  const frag = roh.map((r, i) => {
    const box = document.createElement('div');
    box.className = 'fragment';
    box.dataset.art = r.art;
    box.style.setProperty('--fr', ((wuerfel() - .5) * 2.4).toFixed(2) + 'deg');
    r.el.replaceWith(box);
    box.append(r.el);
    tafel.append(box);
    return { box, art: r.art, i, x: 0, y: 0, s: 0, gefunden: false, nah: 0 };
  });

  /* Reste aufräumen, die nun leer sind */
  ['.raum__leib', '.werke', '.liste', '.weg', '.raum__fuss'].forEach(w => {
    const n = $(w, el);
    if (n && !n.children.length) n.remove();
  });

  el.append(tafel);

  /* Kompass */
  const kompass = document.createElement('div');
  kompass.className = 'kompass';
  kompass.innerHTML =
    `<svg viewBox="0 0 40 40" aria-hidden="true">
       <circle class="kompass__bahn" cx="20" cy="20" r="16"/>
       <circle class="kompass__weg" cx="20" cy="20" r="16"
               stroke-dasharray="100.53" stroke-dashoffset="100.53"/>
     </svg>
     <p class="kompass__text"><b data-zahl>0</b>&thinsp;/&thinsp;${frag.length} gefunden</p>`;
  el.append(kompass);

  /* Wie man sich bewegt — bleibt als leiser Hinweis stehen. */
  const geste = document.createElement('p');
  geste.className = 'geste';
  geste.innerHTML = grobzeiger()
    ? 'Ziehen &middot; oben rechts zurück'
    : '<b>←</b><b>→</b> weiter <span data-nebensache>&middot; Scrollen &middot; Ziehen </span>' +
      '&middot; <b>Esc</b> zurück';
  el.append(geste);

  return { el, id, tafel, frag, kompass, geste, spirale: null, laenge: 0 };
}

/* ── Fragmente auf die Spirale setzen ───────────────────────────── */
function anordnen (raum, spirale) {
  const { frag } = raum;
  let s = 0;
  let vorher = 0;
  for (const f of frag) {
    const b = f.box.getBoundingClientRect();
    const gross = Math.max(b.width, b.height) || 320;
    /* Reichlich Luft: zwei Fragmente dürfen sich nie berühren, auch die
       breiten nicht. Lieber eine längere Reise als ein Gedränge. */
    const abstand = (vorher + gross) * 0.70 + 175;
    s += vorher === 0 ? 0 : abstand;
    const p = spirale.bei(s);
    f.x = p.x; f.y = p.y; f.s = s;
    f.box.style.setProperty('--fx', p.x.toFixed(1));
    f.box.style.setProperty('--fy', p.y.toFixed(1));
    vorher = gross;
  }
  raum.laenge = s;
  raum.spirale = spirale;
}

/* ══════════════════════════════════════════════════════════════════ */
export function raeumeAufbauen (opt) {
  const { pigment, klang, aufWechsel } = opt;
  const spirale = spiraleBauen();

  const raeume = new Map();
  $$('#dokument .raum').forEach(el => {
    const id = el.dataset.kreis || el.id;
    const r = raumBauen(el, el.id);
    raeume.set(el.id, r);
  });

  let aktiv = null;                                  // offener Raum
  const kam = { s: 0, sZiel: 0, k: 1, kIst: 1, ox: 0, oy: 0, oxIst: 0, oyIst: 0, tempo: 0 };
  let laeuft = false, zuletzt = 0;
  let zeigerX = 0, zeigerY = 0;

  /* ── Bewegung ─────────────────────────────────────────────────── */
  const schwung = { v: 0 };

  /* Wann zuletzt jemand etwas getan hat — davon hängt das Einrasten ab. */
  let letzteEingabe = 0;
  let eingerastet = true;

  function reisen (ds) {
    if (!aktiv) return;
    kam.sZiel = klemme(kam.sZiel + ds, 0, aktiv.laenge);
    aktiv.el.dataset.bewegt = '1';
    letzteEingabe = performance.now();
    eingerastet = false;
  }

  function zuFragment (i) {
    if (!aktiv) return;
    const f = aktiv.frag[klemme(i, 0, aktiv.frag.length - 1)];
    if (!f) return;
    kam.sZiel = f.s;
    schwung.v = 0;
    aktiv.el.dataset.bewegt = '1';
    letzteEingabe = performance.now();
    eingerastet = true;                 // gezieltes Springen rastet sofort
  }

  /* Kommt die Bewegung zur Ruhe, zieht es die Kamera auf das nächste
     Fragment — man bleibt nie zwischen zwei Texten stehen. */
  function einrasten () {
    if (!aktiv || eingerastet || schwung.v !== 0) return;
    if (performance.now() - letzteEingabe < 260) return;
    const f = aktiv.frag[nahestes()];
    if (!f) return;
    kam.sZiel = f.s;
    eingerastet = true;
  }

  function nahestes () {
    if (!aktiv) return -1;
    let best = 0, bd = Infinity;
    aktiv.frag.forEach((f, i) => {
      const d = Math.abs(f.s - kam.sZiel);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }

  /* ── Bild für Bild ────────────────────────────────────────────── */
  function bild (jetzt) {
    if (!laeuft) return;
    requestAnimationFrame(bild);
    const dt = Math.min((jetzt - zuletzt) / 1000, 0.05);
    zuletzt = jetzt;
    if (!aktiv) return;

    /* Schwung ausklingen lassen, dann einrasten */
    if (Math.abs(schwung.v) > 0.5) {
      reisen(schwung.v * dt);
      schwung.v *= Math.pow(0.02, dt);
    } else { schwung.v = 0; einrasten(); }

    const vorS = kam.s;
    kam.s = zieh(kam.s, kam.sZiel, 6.5, dt);
    const tempo = Math.abs(kam.s - vorS) / Math.max(dt, 1e-4);
    kam.tempo = zieh(kam.tempo, tempo, 4, dt);

    /* Tempo bestimmt die Höhe: schnell = Überblick, still = Nähe */
    const t = klemme(kam.tempo / 1800, 0, 1);
    kam.k = misch(1, 0.52, raus(t));
    kam.kIst = zieh(kam.kIst, kam.k, 3.4, dt);

    /* Zeiger schiebt das Bild leicht */
    kam.ox = zeigerX * 42;
    kam.oy = zeigerY * 30;
    kam.oxIst = zieh(kam.oxIst, kam.ox, 2.6, dt);
    kam.oyIst = zieh(kam.oyIst, kam.oy, 2.6, dt);

    const p = aktiv.spirale.bei(kam.s);
    const k = kam.kIst;
    const tx = -(p.x + kam.oxIst) * k;
    const ty = -(p.y + kam.oyIst) * k;
    aktiv.tafel.style.setProperty('--tx', tx.toFixed(1) + 'px');
    aktiv.tafel.style.setProperty('--ty', ty.toFixed(1) + 'px');
    aktiv.tafel.style.setProperty('--tk', k.toFixed(4));

    /* Nähe je Fragment */
    const mitte = { x: p.x + kam.oxIst, y: p.y + kam.oyIst };
    let neu = 0;
    for (const f of aktiv.frag) {
      const d = Math.hypot(f.x - mitte.x, f.y - mitte.y) * k;
      const nah = klemme(1 - (d - 40) / 460, 0, 1);
      f.nah = nah;
      f.box.style.setProperty('--fo', (0.07 + nah * 0.93).toFixed(3));
      f.box.style.setProperty('--fbl', ((1 - nah) * 5).toFixed(2) + 'px');
      if (nah > 0.72) {
        if (!f.box.hasAttribute('data-nah')) f.box.setAttribute('data-nah', '');
        if (!f.gefunden) { f.gefunden = true; neu++; }
      } else if (f.box.hasAttribute('data-nah')) f.box.removeAttribute('data-nah');
    }
    if (neu) { kompassStellen(); klang && klang.gefunden(); }
  }

  function kompassStellen () {
    if (!aktiv) return;
    const g = aktiv.frag.filter(f => f.gefunden).length;
    const anteil = g / aktiv.frag.length;
    const weg = $('.kompass__weg', aktiv.el);
    const zahl = $('[data-zahl]', aktiv.el);
    if (weg) weg.setAttribute('stroke-dashoffset', (100.53 * (1 - anteil)).toFixed(2));
    if (zahl) zahl.textContent = g;
  }

  /* ── Eingaben ─────────────────────────────────────────────────── */
  function bindeRaum (r) {
    const el = r.el;

    /* Impressum und Datenschutz sind bewusst lineare Lesedokumente.
       Dort übernimmt der Browser das native Scrollen. */
    if (el.classList.contains('raum--recht')) return;

    /* Rad / Trackpad: der Weg windet sich */
    el.addEventListener('wheel', e => {
      if (!aktiv || aktiv !== r) return;
      e.preventDefault();
      const d = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      reisen(d * (e.deltaMode === 1 ? 22 : 1.15));
      schwung.v = 0;
    }, { passive: false });

    /* Ziehen: entlang der Tangente reisen */
    let zieht = false, lx = 0, ly = 0, vs = 0, gezogen = 0, zeigerId = null;
    el.addEventListener('pointerdown', e => {
      if (e.target.closest('a, button, input, textarea, label, select')) return;
      zieht = true; gezogen = 0; zeigerId = e.pointerId;
      lx = e.clientX; ly = e.clientY; vs = 0;
      schwung.v = 0;
      el.setPointerCapture(e.pointerId);
      el.dataset.zieht = '1';
    });
    el.addEventListener('pointermove', e => {
      if (!aktiv || aktiv !== r) return;
      const b = el.getBoundingClientRect();
      zeigerX = (e.clientX - b.width / 2) / b.width * 2;
      zeigerY = (e.clientY - b.height / 2) / b.height * 2;
      if (!zieht || e.pointerId !== zeigerId) return;
      const dx = e.clientX - lx, dy = e.clientY - ly;
      lx = e.clientX; ly = e.clientY;
      gezogen += Math.hypot(dx, dy);
      const p = aktiv.spirale.bei(kam.s);
      const ds = -(dx * p.tx + dy * p.ty) / Math.max(kam.kIst, .3);
      reisen(ds);
      vs = ds / 0.016;
      eingerastet = false;
    });
    const los = e => {
      if (!zieht) return;
      zieht = false;
      delete el.dataset.zieht;
      if (Math.abs(vs) > 60) schwung.v = klemme(vs, -9000, 9000);
      try { el.releasePointerCapture(zeigerId); } catch {}
    };
    el.addEventListener('pointerup', los);
    el.addEventListener('pointercancel', los);
    el.addEventListener('pointerleave', () => { zeigerX = 0; zeigerY = 0; });

    /* Tastatur: die Spirale Fragment für Fragment abgehen */
    el.addEventListener('keydown', e => {
      if (!aktiv || aktiv !== r) return;
      if (e.target.closest('input, textarea')) return;
      const i = nahestes();
      switch (e.key) {
        /* Nur die Pfeile führen. Die Leertaste bleibt der Leertaste. */
        case 'ArrowDown': case 'ArrowRight': case 'PageDown':
          e.preventDefault(); zuFragment(i + 1); break;
        case 'ArrowUp': case 'ArrowLeft': case 'PageUp':
          e.preventDefault(); zuFragment(i - 1); break;
        case 'Home': e.preventDefault(); zuFragment(0); break;
        case 'End':  e.preventDefault(); zuFragment(r.frag.length - 1); break;
      }
    });

    /* Fokus zieht die Kamera nach — so bleibt Tab benutzbar */
    el.addEventListener('focusin', e => {
      if (!aktiv || aktiv !== r) return;
      const box = e.target.closest('.fragment');
      if (!box) return;
      const f = r.frag.find(f => f.box === box);
      if (f) { kam.sZiel = f.s; schwung.v = 0; }
    });
  }
  raeume.forEach(bindeRaum);

  /* ── Jede Frage bekommt ihren eigenen Weiter ──────────────────────
     Auf der Spirale sieht man immer nur eine Frage. Ohne einen
     sichtbaren nächsten Schritt weiß niemand, wie es weitergeht. */
  raeume.forEach(r => {
    r.frag.forEach((f, i) => {
      if (f.art !== 'frage') return;
      const letzte = !r.frag.slice(i + 1).some(x => x.art === 'frage');

      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'weiter';
      b.innerHTML = (letzte ? 'zum Absenden' : 'weiter') +
        ' <span class="weiter__pfeil" aria-hidden="true">→</span>';
      b.addEventListener('click', () => zuFragment(i + 1));
      f.box.append(b);

      /* Enter im Textfeld heißt dasselbe — und schickt nichts ab. */
      f.box.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        if (e.target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        zuFragment(i + 1);
      });
    });
  });

  /* ── Öffnen / Schließen ───────────────────────────────────────── */
  function messen () {
    raeume.forEach(r => {
      const war = r.el.hasAttribute('data-offen');
      if (!war) { r.el.style.visibility = 'hidden'; r.el.style.opacity = '0'; r.el.style.display = 'block'; }
      anordnen(r, spirale);
      if (!war) { r.el.style.removeProperty('display'); r.el.style.removeProperty('visibility'); r.el.style.removeProperty('opacity'); }
    });
  }

  function oeffnen (raumId) {
    const r = raeume.get(raumId);
    if (!r || aktiv === r) return;
    if (aktiv) aktiv.el.removeAttribute('data-offen');
    aktiv = r;
    kam.s = -180; kam.sZiel = 0; kam.kIst = 0.5; schwung.v = 0;
    r.el.setAttribute('data-offen', '');
    delete r.el.dataset.bewegt;
    r.frag.forEach(f => { f.gefunden = false; });
    kompassStellen();
    document.documentElement.dataset.modus = 'raum';
    document.documentElement.dataset.raum = r.id;
    if (pigment) pigment.hinein(r.el.dataset.kreis || 'bild');
    if (klang) klang.hinein(r.el.dataset.kreis || 'bild');
    if (!laeuft) { laeuft = true; zuletzt = performance.now(); requestAnimationFrame(bild); }
    /* Fokus in den Raum legen, ohne zu springen */
    r.el.setAttribute('tabindex', '-1');
    r.el.focus({ preventScroll: true });
    aufWechsel && aufWechsel(r.id);
  }

  function schliessen () {
    if (!aktiv) return;
    aktiv.el.removeAttribute('data-offen');
    aktiv = null;
    document.documentElement.dataset.modus = 'feld';
    delete document.documentElement.dataset.raum;
    if (pigment) pigment.hinaus();
    if (klang) klang.hinaus();
    aufWechsel && aufWechsel(null);
  }

  addEventListener('resize', () => { clearTimeout(messen._t); messen._t = setTimeout(messen, 180); });
  requestAnimationFrame(() => requestAnimationFrame(messen));

  return { oeffnen, schliessen, messen, raeume, istOffen: () => !!aktiv, aktiverRaum: () => aktiv && aktiv.id };
}
