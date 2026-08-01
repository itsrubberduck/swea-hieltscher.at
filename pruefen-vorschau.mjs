/* Prüft die gebündelte vorschau.html in jsdom — läuft sie eigenständig? */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const req = createRequire('/tmp/vend/');
const { JSDOM } = req('jsdom');
const html = readFileSync('vorschau.html', 'utf8');

const virtual = new (req('jsdom').VirtualConsole)();
const meldungen = [];
virtual.on('jsdomError', e => meldungen.push('ERR ' + (e.detail?.message || e.message)));
virtual.on('error', (...a) => meldungen.push('err ' + a.join(' ')));
virtual.on('warn',  (...a) => meldungen.push('warn ' + a.join(' ')));

const dom = new JSDOM(html, {
  runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: virtual,
  url: 'file:///x/vorschau.html',
  /* jsdom kennt weder matchMedia noch WebGL — beides nachstellen, BEVOR das Skript läuft. */
  beforeParse (w) {
    w.matchMedia = q => ({ matches: false, media: q, onchange: null,
      addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){}, dispatchEvent(){return false;} });
    w.HTMLCanvasElement.prototype.getContext = () => null;
    w.Element.prototype.setPointerCapture = () => {};
    w.Element.prototype.releasePointerCapture = () => {};
    w.Element.prototype.getBoundingClientRect = () => ({ width: 320, height: 200, top: 0, left: 0, right: 320, bottom: 200, x: 0, y: 0, toJSON(){} });
  }
});
const w = dom.window;

await new Promise(r => setTimeout(r, 900));
const d = w.document, el = d.documentElement;
const ok = [];
ok.push(['data-js gesetzt', el.dataset.js === 'an']);
ok.push(['Modus Feld', el.dataset.modus === 'feld']);
ok.push(['Tafeln gebaut', d.querySelectorAll('.tafel').length === 10]);
ok.push(['Fragmente', d.querySelectorAll('.fragment').length > 60]);
ok.push(['Schrift eingebettet', /data:font\/woff2;base64/.test(html)]);
ok.push(['keine externen Dateien', !/(src|href)="assets\//.test(html)]);
d.querySelector('.feld__kreise a').dispatchEvent(new w.MouseEvent('click', {bubbles:true, cancelable:true}));
await new Promise(r => setTimeout(r, 150));
ok.push(['Raum öffnet', el.dataset.modus === 'raum']);
for (const [n, v] of ok) console.log(v ? '  ✓ ' + n : '  ✗ ' + n);
const echt = meldungen.filter(m => !/WebGL|Could not parse CSS|not implemented/i.test(m));
if (echt.length) { console.log('\n  Meldungen:'); echt.slice(0,6).forEach(m => console.log('   ·', m.slice(0,160))); }
process.exit(ok.every(o => o[1]) ? 0 : 1);
