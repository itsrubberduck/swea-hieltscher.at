/* ══════════════════════════════════════════════════════════════════
   bauen.mjs — schnürt die ganze Seite in eine einzige Datei.
   Aufruf:  node bauen.mjs
   Ergebnis: vorschau.html — läuft per Doppelklick, ohne Server.

   Für den echten Betrieb bitte index.html hochladen (Module,
   getrennte Dateien, besseres Zwischenspeichern). Diese Datei ist
   nur zum Ansehen ohne Server gedacht.
   ══════════════════════════════════════════════════════════════════ */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = dirname(fileURLToPath(import.meta.url));
const lies = (p) => readFileSync(join(hier, p), 'utf8');
const b64  = (p) => readFileSync(join(hier, p)).toString('base64');

/* ── Schriften einbetten ────────────────────────────────────────── */
function schriftenEinbetten (css) {
  return css.replace(/url\('\.\.\/fonts\/([^']+)'\)/g, (m, datei) => {
    const p = join('assets/fonts', datei);
    if (!existsSync(join(hier, p))) return m;
    return `url('data:font/woff2;base64,${b64(p)}')`;
  });
}

/* ── JavaScript bündeln ─────────────────────────────────────────── */
const REIHE = [
  'assets/js/util.js',
  'assets/js/inhalt.js',
  'assets/js/atem.js',
  'assets/js/roto.js',
  'assets/js/pigment.js',
  'assets/js/artefakte.js',
  'assets/js/raum.js',
  'assets/js/feld.js',
  'assets/js/main.js'
];

function entModulen (quelle) {
  return quelle
    .replace(/^\s*import[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^\s*import\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^export\s+(function|const|let|class)/gm, '$1')
    .replace(/^export\s+\{[^}]*\};?\s*$/gm, '');
}

function dreiEinbetten () {
  const cjs = lies('assets/vendor/three.cjs');
  return `const T = (function(){
  const module = { exports: {} };
  const exports = module.exports;
  ${cjs}
  return module.exports;
})();
const THREE = T;\n`;
}

let js = '';
js += dreiEinbetten();
for (const f of REIHE) {
  let q = entModulen(lies(f));
  if (f.endsWith('main.js')) {
    /* Kein dynamisches Nachladen im Bündel */
    q = q.replace(
      /const \{ pigmentAufbauen \} = await import\([^)]*\);\s*/,
      ''
    );
  }
  js += `\n/* ── ${f} ─────────────────────────────────────── */\n${q}\n`;
}

/* ── Zusammensetzen ─────────────────────────────────────────────── */
let html = lies('index.html');

const css = ['01-grund', '02-feld', '03-raum', '04-schrift']
  .map(n => schriftenEinbetten(lies(`assets/css/${n}.css`)))
  .join('\n\n');

/* Achtung: Ersetzungen IMMER als Funktion übergeben.
   Ein „$'" oder „$&" im eingefügten Text würde sonst als
   Ersetzungsmuster gelesen und das halbe Dokument verschlucken. */
const sicher = (s) => () => s;

html = html
  .replace(/<!-- Wer index\.html doppelklickt[\s\S]*?<\/script>\n/, '')
  .replace(/\s*<link rel="preload"[^>]*>/g, '')
  .replace(/\s*<link rel="stylesheet"[^>]*>/g, '')
  .replace('</head>', sicher(`<style>\n${css}\n</style>\n</head>`))
  .replace(
    /<script type="module" src="assets\/js\/main\.js"><\/script>/,
    sicher(`<script>\n(function(){\n${js.replace(/<\/script/gi, '<\\/script')}\n})();\n</script>`)
  );

writeFileSync(join(hier, 'vorschau.html'), html);
console.log('vorschau.html geschrieben —', (html.length / 1024 / 1024).toFixed(2), 'MB');
