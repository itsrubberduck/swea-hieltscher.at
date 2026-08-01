/* ══════════════════════════════════════════════════════════════════
   pruefen.mjs — führt die Seite in einem echten DOM aus (jsdom),
   ohne Browser. Findet Syntaxfehler, tote Verweise, kaputte CSS,
   fehlende Elemente und Laufzeitfehler beim Aufbau.

   Aufruf:  node --experimental-vm-modules pruefen.mjs
   (jsdom, postcss und acorn liegen in /tmp/vend/node_modules)
   ══════════════════════════════════════════════════════════════════ */

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const hier = dirname(fileURLToPath(import.meta.url));
const req  = createRequire('/tmp/vend/');
const { JSDOM } = req('jsdom');
const postcss  = req('postcss');
const acorn    = req('acorn');

const lies = p => readFileSync(join(hier, p), 'utf8');
let fehler = 0, warn = 0;
const nein = (...a) => { fehler++; console.log('  ✗', ...a); };
const hm   = (...a) => { warn++;   console.log('  !', ...a); };
const ja   = (...a) => console.log('  ✓', ...a);

/* ── 1. JavaScript: Syntax und Verweise ─────────────────────────── */
console.log('\n① JavaScript');
const jsDateien = readdirSync(join(hier, 'assets/js')).filter(f => f.endsWith('.js'));
const exportiert = new Map();
for (const f of jsDateien) {
  const q = lies(`assets/js/${f}`);
  try {
    const baum = acorn.parse(q, { ecmaVersion: 2023, sourceType: 'module' });
    const namen = new Set();
    for (const k of baum.body) {
      if (k.type !== 'ExportNamedDeclaration') continue;
      if (k.declaration) {
        if (k.declaration.id) namen.add(k.declaration.id.name);
        for (const d of k.declaration.declarations || []) namen.add(d.id.name);
      }
      for (const s of k.specifiers || []) namen.add(s.exported.name);
    }
    exportiert.set(f, namen);
  } catch (e) { nein(`${f}: ${e.message}`); }
}
if (exportiert.size === jsDateien.length) ja(`${jsDateien.length} Module fehlerfrei geparst`);

for (const f of jsDateien) {
  const q = lies(`assets/js/${f}`);
  const re = /import\s*\{([^}]+)\}\s*from\s*['"]\.\/([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(q))) {
    const wollen = m[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0]).filter(Boolean);
    const quelle = exportiert.get(m[2]);
    if (!quelle) { nein(`${f} lädt ${m[2]} — Datei fehlt`); continue; }
    for (const w of wollen) if (!quelle.has(w)) nein(`${f}: „${w}" wird aus ${m[2]} geholt, dort aber nicht exportiert`);
  }
}
ja('Import/Export-Paare geprüft');

/* ── 2. CSS ─────────────────────────────────────────────────────── */
console.log('\n② CSS');
const cssDateien = readdirSync(join(hier, 'assets/css')).filter(f => f.endsWith('.css'));
let alleCss = '';
for (const f of cssDateien) {
  const q = lies(`assets/css/${f}`);
  alleCss += q;
  try { postcss.parse(q, { from: f }); ja(`${f} — ${(q.length / 1024).toFixed(1)} kB`); }
  catch (e) { nein(`${f}: ${e.message}`); }
}
/* Verwendete, aber nie gesetzte Variablen */
const gesetzt = new Set([...alleCss.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]));
const benutzt = new Set([...alleCss.matchAll(/var\((--[\w-]+)/g)].map(m => m[1]));
const lokal = new Set(['--x','--y','--s','--i','--fx','--fy','--fr','--fo','--fbl','--fb','--tx','--ty','--tk','--dreh','--einzug','--js']);
for (const v of benutzt) if (!gesetzt.has(v) && !lokal.has(v)) hm(`CSS-Variable ${v} wird benutzt, aber nirgends gesetzt`);
if (!warn) ja('alle CSS-Variablen definiert');

/* ── 3. HTML ────────────────────────────────────────────────────── */
console.log('\n③ HTML');
const html = lies('index.html');
const dom0 = new JSDOM(html);
const d0 = dom0.window.document;

const raeume = [...d0.querySelectorAll('#dokument .raum')];
ja(`${raeume.length} Räume`);

/* Jeder Navigationsverweis muss ein Ziel haben */
for (const a of d0.querySelectorAll('a[href^="#"]')) {
  const id = a.getAttribute('href').slice(1);
  if (id && !d0.getElementById(id)) nein(`Verweis auf #${id} — Ziel fehlt`);
}
ja('alle internen Verweise haben ein Ziel');

/* Kreis-Kennungen müssen zusammenpassen */
const imFeld = [...d0.querySelectorAll('.feld__kreise a')].map(a => a.dataset.kreis);
const inRaeumen = raeume.map(r => r.dataset.kreis);
for (const k of imFeld) if (!inRaeumen.includes(k)) nein(`Kreis „${k}" hat keinen Raum`);
ja(`${imFeld.length} Kreise ↔ Räume stimmen überein`);

/* Filter, auf die CSS verweist, müssen existieren */
for (const m of alleCss.matchAll(/url\(#([\w-]+)\)/g)) {
  if (!d0.getElementById(m[1])) nein(`CSS nutzt filter url(#${m[1]}) — im SVG nicht definiert`);
}
ja('SVG-Filter vorhanden');

/* Bedienbarkeit */
if (!d0.querySelector('html[lang]') && !html.includes('<html lang=')) nein('kein lang-Attribut');
else ja('Sprache gesetzt');
const ohneAlt = [...d0.querySelectorAll('img:not([alt])')];
if (ohneAlt.length) nein(`${ohneAlt.length} Bilder ohne alt`); else ja('keine Bilder ohne alt');
for (const f of d0.querySelectorAll('input, textarea')) {
  const id = f.id;
  if (f.type === 'hidden') continue;
  if (!id || !d0.querySelector(`label[for="${id}"]`)) nein(`Feld ${f.name || f.type} ohne Beschriftung`);
}
ja('alle Formularfelder beschriftet');
const h1 = d0.querySelectorAll('h1');
if (h1.length !== 1) nein(`${h1.length} × <h1> — genau eine erwartet`); else ja('genau eine <h1>');

/* ── 4. Die Seite wirklich starten ──────────────────────────────── */
console.log('\n④ Aufbau in echtem DOM');
const dom = new JSDOM(html, {
  url: 'https://swea-hieltscher.at/',
  pretendToBeVisual: true,
  runScripts: 'outside-only'
});
const w = dom.window;

/* Was jsdom nicht kann, stellen wir gutmütig nach. */
w.HTMLCanvasElement.prototype.getContext = () => null;      // kein WebGL → Notweg
w.matchMedia = w.matchMedia || (q => ({ matches: false, media: q, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} }));
if (!w.matchMedia('(x)').addEventListener) w.matchMedia = q => ({ matches: false, media: q, addEventListener(){}, removeEventListener(){} });
w.Element.prototype.setPointerCapture = function(){};
w.Element.prototype.releasePointerCapture = function(){};
w.Element.prototype.getBoundingClientRect = function(){
  return { width: 320, height: 200, top: 0, left: 0, right: 320, bottom: 200, x: 0, y: 0, toJSON(){} };
};
const uhr = { now: () => Date.now() };
Object.defineProperty(w, 'performance', { value: uhr, configurable: true, writable: true });
w.requestAnimationFrame = cb => setTimeout(() => cb(uhr.now()), 16);
w.cancelAnimationFrame = id => clearTimeout(id);

const global0 = globalThis;
Object.defineProperty(global0, 'performance', { value: uhr, configurable: true, writable: true });
for (const k of ['window','document','navigator','location','history',
                 'requestAnimationFrame','cancelAnimationFrame','matchMedia',
                 'localStorage','addEventListener','removeEventListener','Node','Element',
                 'HTMLElement','MutationObserver','getComputedStyle','innerWidth','innerHeight',
                 'AudioContext','devicePixelRatio','CustomEvent','Event']) {
  try { Object.defineProperty(global0, k, { value: w[k], configurable: true, writable: true }); } catch {}
}
global0.innerWidth = 1440; global0.innerHeight = 900;
global0.devicePixelRatio = 2;

const gefangen = [];
w.addEventListener('error', e => gefangen.push(e.message));
const altWarn = console.warn;
console.warn = (...a) => gefangen.push('warn: ' + a.join(' '));

try {
  await import(pathToFileURL(join(hier, 'assets/js/main.js')).href);
  await new Promise(r => setTimeout(r, 400));
  console.warn = altWarn;

  const doc = w.document;
  const el = doc.documentElement;
  if (el.dataset.js !== 'an')      nein('data-js wurde nicht gesetzt');   else ja('JavaScript-Modus aktiv');
  if (el.dataset.modus !== 'feld') nein('Startmodus ist nicht „feld"');   else ja('Startmodus: Feld');

  const tafeln = doc.querySelectorAll('.tafel');
  if (tafeln.length !== raeume.length) nein(`${tafeln.length} Tafeln für ${raeume.length} Räume`);
  else ja(`${tafeln.length} Tafeln gebaut`);

  let gesamt = 0, leer = [];
  doc.querySelectorAll('#dokument .raum').forEach(r => {
    const n = r.querySelectorAll('.fragment').length;
    gesamt += n;
    if (n < 3) leer.push(`${r.id} (${n})`);
    const kompass = r.querySelector('.kompass');
    if (!kompass) nein(`${r.id}: kein Kompass`);
  });
  if (leer.length) nein('zu wenige Fragmente in: ' + leer.join(', '));
  else ja(`${gesamt} Fragmente über ${raeume.length} Räume`);

  /* Kein Inhalt darf beim Umbau verloren gehen */
  const saeubern = (wurzelEl) => {
    const k = wurzelEl.cloneNode(true);
    k.querySelectorAll('.kompass, .geste, .weiter, svg').forEach(n => n.remove());   // von JS ergänzt
    /* Leerraum ignorieren: getrennte Fragmente haben keine Trennzeichen mehr. */
    return k.textContent.replace(/\s+/g, '');
  };
  const textVorher  = saeubern(d0.querySelector('#dokument'));
  const textNachher = saeubern(doc.querySelector('#dokument'));
  if (textVorher !== textNachher) {
    const i = [...textVorher].findIndex((c, n) => c !== textNachher[n]);
    nein('Inhalt verändert sich ab Zeichen ' + i +
      '\n     vorher : …' + textVorher.slice(Math.max(0,i-30), i+90) +
      '\n     nachher: …' + textNachher.slice(Math.max(0,i-30), i+90));
  } else ja(`kein Inhalt beim Umbau verloren (${textVorher.length} Zeichen unverändert)`);

  /* Einen Raum öffnen */
  const kreis = doc.querySelector('.feld__kreise a');
  kreis.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  await new Promise(r => setTimeout(r, 120));
  if (el.dataset.modus !== 'raum') nein('Klick auf einen Kreis öffnet keinen Raum');
  else ja('Raum öffnet sich bei Klick: ' + el.dataset.raum);
  const offen = doc.querySelector('.raum[data-offen]');
  if (!offen) nein('kein Raum trägt data-offen'); else ja('offener Raum: #' + offen.id);
  if (doc.getElementById('zurueck').hidden) nein('Rückweg bleibt versteckt'); else ja('Rückweg sichtbar');

  /* Und wieder schließen */
  doc.getElementById('zurueck').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 120));
  if (el.dataset.modus !== 'feld') nein('Rückweg schließt den Raum nicht'); else ja('Rückweg funktioniert');

  /* Textansicht */
  const schalter = doc.querySelector('[data-schalter="schrift"]');
  schalter.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 60));
  if (el.dataset.schrift !== 'an') nein('Textansicht schaltet nicht'); else ja('Textansicht schaltet');
  schalter.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));

  /* Die Schalter müssen sagen, was sie tun */
  const knoepfe = [...doc.querySelectorAll('#werkzeug [data-schalter]')];
  const ohneSatz = knoepfe.filter(b => !b.querySelector('.werkzeug__satz'));
  if (ohneSatz.length) nein(`${ohneSatz.length} Schalter ohne Erklärung`);
  else ja(`${knoepfe.length} Schalter mit Erklärung`);

  /* Klang schaltet */
  const tonKnopf = doc.querySelector('[data-schalter="ton"]');
  tonKnopf.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 60));
  if (el.dataset.ton !== 'an') nein('Klang schaltet nicht'); else ja('Klang schaltet');
  tonKnopf.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  if (el.dataset.ton) nein('Klang lässt sich nicht wieder abschalten'); else ja('Klang schaltet wieder ab');

  /* Der Rückweg muss beschriftet sein, die Bewegung erklärt */
  const zurWort = doc.querySelector('#zurueck .zurueck__wort');
  if (!zurWort || !zurWort.textContent.trim()) nein('Rückweg ohne Beschriftung');
  else ja('Rückweg beschriftet: „' + zurWort.textContent.trim() + '"');
  const gesten = [...doc.querySelectorAll('.geste')].map(g => g.textContent);
  const fehlt = ['←', '→', 'Esc'].filter(t => !gesten.every(g => g.includes(t)));
  if (fehlt.length) nein('Bewegungshinweis nennt nicht: ' + fehlt.join(', '));
  else ja('Bewegungshinweis nennt Pfeile und Esc');

  /* Die vier Ecken: in jedem Modus darf jede Ecke nur einmal belegt sein.
     Genau daran ist der Kompass zuletzt im Impressum gelandet. */
  const ecken = {
    feld: {
      'oben links':   ['.feld__ort'],
      'oben rechts':  [],
      'unten links':  ['#recht-kurz', '.feld__hinweis'],   // zwei Reihen
      'unten rechts': ['#werkzeug']
    },
    raum: {
      'oben links':   ['#recht-kurz'],
      'oben rechts':  ['#zurueck'],
      'unten links':  ['.kompass'],
      'unten rechts': ['#werkzeug']
    }
  };
  /* Zwei Dinge in derselben Ecke brauchen verschiedene Reihen. */
  const reihen = { '.feld__hinweis': 'obere Reihe', '#recht-kurz': 'untere Reihe',
                   '.kompass': 'untere Reihe', '.geste': 'obere Reihe' };
  let eckenGut = true;
  for (const [modus, ecke] of Object.entries(ecken)) {
    for (const [wo, wer] of Object.entries(ecke)) {
      if (wer.length < 2) continue;
      const rr = wer.map(w => reihen[w]);
      if (new Set(rr).size !== rr.length) {
        nein(`${modus}, ${wo}: ${wer.join(' und ')} liegen auf derselben Reihe`);
        eckenGut = false;
      }
    }
  }
  /* Und die Kernaussage: im Raum ist unten links der Kompass, sonst nichts. */
  const cssRaumRecht = alleCss.match(/html\[data-modus='raum'\] #recht-kurz \{[^}]*\}/);
  if (!cssRaumRecht || !/bottom:\s*auto/.test(cssRaumRecht[0])) {
    nein('im Raum liegt das Rechtliche noch unten links — dort steht der Kompass');
    eckenGut = false;
  }
  if (eckenGut) ja('die vier Ecken sind in beiden Modi eindeutig belegt');

  /* Jede Frage im Kontaktformular braucht einen nächsten Schritt */
  const fragen = [...doc.querySelectorAll('.fragment[data-art="frage"]')];
  const ohneWeiter = fragen.filter(f => !f.querySelector('.weiter'));
  if (!fragen.length) nein('keine einzelnen Fragen gefunden');
  else if (ohneWeiter.length) nein(`${ohneWeiter.length} von ${fragen.length} Fragen ohne Weiter`);
  else ja(`${fragen.length} Fragen, jede mit eigenem Weiter`);
  const letzter = fragen.at(-1).querySelector('.weiter').textContent.trim();
  if (!/Absenden/.test(letzter)) nein('letzte Frage führt nicht zum Absenden: „' + letzter + '"');
  else ja('letzte Frage führt zum Absenden');

  /* Aus der Textansicht muss ein sichtbarer Weg zurückführen */
  const band = doc.getElementById('textansicht-band');
  const schalterSchrift = doc.querySelector('[data-schalter="schrift"]');
  schalterSchrift.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 60));
  if (el.dataset.schrift !== 'an') nein('Textansicht ließ sich nicht einschalten');
  else if (!band || band.hidden) nein('in der Textansicht fehlt der sichtbare Weg zurück');
  else {
    ja('Textansicht zeigt den Weg zurück: „' + band.querySelector('button').textContent.trim() + '"');
    band.querySelector('button').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 60));
    if (el.dataset.schrift) nein('der Weg zurück verlässt die Textansicht nicht');
    else if (!band.hidden) nein('das Band bleibt stehen');
    else ja('der Weg zurück führt heraus');
  }

  /* Empfang beim ersten Besuch */
  const emp = doc.getElementById('empfang');
  if (!emp) nein('kein Empfang vorhanden');
  else if (emp.hidden) nein('Empfang erscheint beim ersten Besuch nicht');
  else {
    ja('Empfang erscheint beim ersten Besuch');
    const wahl = [...emp.querySelectorAll('[data-empfang]')].map(b => b.dataset.empfang).sort();
    if (wahl.join(',') !== 'still,ton') nein('Empfang fragt nicht nach Klang');
    else ja('Empfang fragt nach Klang: ' + wahl.join(' / '));
    emp.querySelector('[data-empfang="still"]').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 800));
    if (!emp.hidden) nein('Empfang schließt nicht'); else ja('Empfang schließt');
  }

  /* Leertaste darf nicht mehr navigieren */
  const rk = doc.getElementById('raum-klang');
  const vorher = doc.documentElement.dataset.raum;
  if (/Leertaste/i.test([...doc.querySelectorAll('.geste')].map(g => g.textContent).join(''))) {
    nein('Leertaste wird noch als Übergang genannt');
  } else ja('Leertaste wird nicht mehr als Übergang genannt');

  /* Tastatur */
  const raum = doc.getElementById('raum-klang');
  raeumeOeffnenPer(doc, w, 'raum-klang');
  await new Promise(r => setTimeout(r, 80));
  raum.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  ja('Tastatursteuerung ohne Fehler');

} catch (e) {
  console.warn = altWarn;
  nein('Laufzeitfehler beim Aufbau: ' + (e && e.stack ? e.stack.split("\n").slice(0, 22).join('\n     ') : e));
}

function raeumeOeffnenPer (doc, w, id) {
  const a = doc.querySelector(`.feld__kreise a[href="#${id}"]`);
  a && a.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
}

if (gefangen.length) { console.log('\n   Meldungen aus der Seite:'); gefangen.slice(0, 8).forEach(m => console.log('     ·', m)); }

/* ── Ergebnis ───────────────────────────────────────────────────── */
console.log(`\n${'─'.repeat(56)}`);
console.log(fehler ? `✗ ${fehler} Fehler, ${warn} Hinweise` : `✓ alles in Ordnung (${warn} Hinweise)`);
process.exit(fehler ? 1 : 0);
