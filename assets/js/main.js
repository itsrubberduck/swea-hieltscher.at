/* ══════════════════════════════════════════════════════════════════
   MAIN — alles zusammenführen.
   Ohne JavaScript bleibt ein gesetztes Dokument. Mit JavaScript
   wird daraus ein Raum. Beides trägt denselben Inhalt.
   ══════════════════════════════════════════════════════════════════ */

import { $, $$, merke, ruhigGewuenscht } from './util.js';
import { atemUhr } from './atem.js';
import { feldAufbauen } from './feld.js';
import { raeumeAufbauen } from './raum.js';
import { artefakteAufbauen } from './artefakte.js';

const wurzel = document.documentElement;

/* ── Einstellungen: bleiben auf dem Gerät ───────────────────────── */
const einst = {
  schrift: merke.lies('schrift', 'aus'),
  ton:     merke.lies('ton', 'aus'),
  ruhe:    merke.lies('ruhe', 'aus')
};
for (const [k, v] of Object.entries(einst)) if (v === 'an') wurzel.dataset[k] = 'an';

/* ── Los ────────────────────────────────────────────────────────── */
wurzel.dataset.js = 'an';
wurzel.dataset.modus = 'feld';
$('[data-jahr]') && ($('[data-jahr]').textContent = new Date().getFullYear());

const atem = atemUhr();

/* Pigment ist Kür. Fällt es aus, läuft alles weiter. */
let pigment = null;
if (!matchMedia('(prefers-reduced-motion: reduce)').matches || true) {
  try {
    const { pigmentAufbauen } = await import('./pigment.js');
    pigment = pigmentAufbauen($('#pigment'), atem);
    if (pigment) {
      wurzel.dataset.pigment = 'an';
      addEventListener('resize', () => pigment.ordnen());
      addEventListener('orientationchange', () => setTimeout(() => pigment.ordnen(), 220));
    }
  } catch (e) {
    console.warn('Pigment nicht verfügbar — die Seite läuft ohne.', e);
  }
}
if (!pigment) wurzel.dataset.pigmentlos = 'an';

/* ── Räume ──────────────────────────────────────────────────────── */
const raeume = raeumeAufbauen({
  pigment,
  aufWechsel (id) {
    const z = $('#zurueck');
    if (id) { z.hidden = false; }
    else { z.hidden = true; feld && feld.zuruecksetzen(); }
  }
});

/* ── Feld ───────────────────────────────────────────────────────── */
const feld = feldAufbauen(pigment, (zielId) => {
  geheZu(zielId, true);
});

/* ── Artefakte ──────────────────────────────────────────────────── */
artefakteAufbauen(atem);

/* ══ Wege durch die Seite ═════════════════════════════════════════ */
/* Bei file:// wirft pushState. Dann merken wir uns die Adresse eben nicht —
   die Seite muss trotzdem laufen. */
let geschichteGeht = true;
function merkeWeg (raumId) {
  if (!geschichteGeht) return;
  try {
    history.pushState({ raum: raumId }, '', raumId ? '#' + raumId : location.pathname + location.search);
  } catch { geschichteGeht = false; }
}

function geheZu (raumId, ausFeld = false) {
  if (!raumId || raumId === 'feld') { zurueckInsFeld(); return; }
  const el = document.getElementById(raumId);
  if (!el || !el.classList.contains('raum')) return;
  raeume.oeffnen(raumId);
  if (location.hash !== '#' + raumId) merkeWeg(raumId);
}

function zurueckInsFeld (vonGeschichte = false) {
  raeume.schliessen();
  if (!vonGeschichte && location.hash) merkeWeg(null);
}

$('#zurueck').addEventListener('click', () => zurueckInsFeld());

addEventListener('keydown', e => {
  if (e.key === 'Escape' && raeume.istOffen()) { e.preventDefault(); zurueckInsFeld(); }
});

addEventListener('popstate', () => {
  const h = location.hash.slice(1);
  if (h) raeume.oeffnen(h); else zurueckInsFeld(true);
});

/* Direkter Einstieg über einen Link */
if (location.hash.length > 1) {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const h = location.hash.slice(1);
    if (document.getElementById(h)) raeume.oeffnen(h);
  }));
}

/* Rechtliches ist über den Rand erreichbar — auch im Feld */
$$('a[href^="#raum-"]').forEach(a => {
  if (a.closest('.feld__kreise')) return;
  a.addEventListener('click', e => {
    e.preventDefault();
    geheZu(a.getAttribute('href').slice(1));
  });
});

/* ══ Werkzeug ═════════════════════════════════════════════════════ */
$$('#werkzeug [data-schalter]').forEach(b => {
  const k = b.dataset.schalter;
  const stelle = (an) => {
    b.setAttribute('aria-pressed', an ? 'true' : 'false');
    if (an) wurzel.dataset[k] = 'an'; else delete wurzel.dataset[k];
    merke.schreib(k, an ? 'an' : 'aus');
  };
  stelle(einst[k] === 'an');
  b.addEventListener('click', () => {
    const an = b.getAttribute('aria-pressed') !== 'true';
    stelle(an);
    if (k === 'schrift') {
      if (an) { raeume.schliessen(); pigment && pigment.anhalten(); }
      else { pigment && pigment.weiter(); requestAnimationFrame(() => raeume.messen()); }
    }
    if (k === 'ruhe' && pigment) an ? pigment.anhalten() : pigment.weiter();
  });
});

/* ── Nichts läuft im Hintergrund weiter ─────────────────────────── */
document.addEventListener('visibilitychange', () => {
  if (!pigment) return;
  if (document.hidden) pigment.anhalten();
  else if (wurzel.dataset.ruhe !== 'an' && wurzel.dataset.schrift !== 'an') pigment.weiter();
});

/* ── Ein leiser Empfang ─────────────────────────────────────────── */
requestAnimationFrame(() => wurzel.dataset.bereit = 'ja');
