/* ══════════════════════════════════════════════════════════════════
   ROTO — eine gezeichnete Figur, die den Kreis geht.
   Die Linie „kocht": acht Bilder je Sekunde bekommt jeder Punkt
   einen neuen kleinen Versatz. Genau so sieht handgezeichnete
   Rotoskopie aus — die Kontur zittert, weil sie jedes Mal neu
   gezogen wurde.
   ══════════════════════════════════════════════════════════════════ */

/* Schneller, wiederholbarer Hash: gleicher Punkt im gleichen Bild
   bekommt immer denselben Versatz. */
function hash (a, b, c) {
  let h = (a * 374761393 + b * 668265263 + c * 2246822519) >>> 0;
  h = (h ^ (h >>> 13)) * 1274126177 >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296 - 0.5;
}

/* ── Das Gerüst ─────────────────────────────────────────────────── */
/**
 * Baguah-Gang: tief, gleitend, Oberkörper zur Kreismitte gedreht,
 * vordere Hand auf Brusthöhe nach innen, hintere Hand am Ellbogen.
 * phase 0..1 = ein Doppelschritt.
 */
function gerüst (phase, innenLinks) {
  const w = phase * Math.PI * 2;
  const A = 0.42;                        // Schrittweite
  const sink = 0.06 * Math.cos(w * 2);   // der Körper hebt und senkt sich leicht

  const beugung = 0.55;                  // die Knie bleiben immer gebeugt
  const beinL = { winkel:  A * Math.sin(w),          knie: beugung + 0.25 * (1 + Math.sin(w)) / 2 };
  const beinR = { winkel:  A * Math.sin(w + Math.PI), knie: beugung + 0.25 * (1 + Math.sin(w + Math.PI)) / 2 };

  const OB = 52 * (1 - sink);            // Beckenhöhe
  const p = {};
  p.becken = [0, -OB];
  p.brust  = [ 1.5, -OB - 26];
  p.hals   = [ 2.0, -OB - 36];
  p.kopf   = [ 2.6, -OB - 45];

  const bein = (seite, b) => {
    const hx = seite * 6.5, hy = -OB + 1;
    const kx = hx + Math.sin(b.winkel) * 20;
    const ky = hy + 20 * Math.cos(b.winkel) * 0.94;
    const fx = kx + Math.sin(b.winkel * 0.35) * 18;
    const fy = ky + 22 * (1 - b.knie * 0.28);
    return [[hx, hy], [kx, ky], [fx, Math.min(fy, 0)]];
  };
  p.beinL = bein(-1, beinL);
  p.beinR = bein( 1, beinR);

  /* Arme: die Haltung bleibt, sie atmet nur */
  const at = Math.sin(w * 0.5) * 2.2;
  const s = innenLinks ? -1 : 1;
  const schulterV = [ s * 8, -OB - 30];
  const schulterH = [-s * 8, -OB - 29];
  p.armV = [
    schulterV,
    [ s * 20, -OB - 22 + at * .4],
    [ s * 30, -OB - 30 + at]                    // vordere Hand, nach innen offen
  ];
  p.armH = [
    schulterH,
    [ s * 2,  -OB - 16 + at * .3],
    [ s * 16, -OB - 22 + at * .6]               // hintere Hand am vorderen Ellbogen
  ];
  return p;
}

/* ── Zeichnen ───────────────────────────────────────────────────── */
function kochLinie (punkte, bild, kanal, staerke = 1.5) {
  let d = '';
  punkte.forEach((pt, i) => {
    const jx = hash(i, bild, kanal) * staerke * 2;
    const jy = hash(i, bild, kanal + 977) * staerke * 2;
    const x = pt[0] + jx, y = pt[1] + jy;
    if (i === 0) d += `M${x.toFixed(1)} ${y.toFixed(1)}`;
    else {
      const v = punkte[i - 1];
      const mx = (v[0] + pt[0]) / 2 + hash(i, bild, kanal + 31) * staerke * 3;
      const my = (v[1] + pt[1]) / 2 + hash(i, bild, kanal + 53) * staerke * 3;
      d += `Q${mx.toFixed(1)} ${my.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
  });
  return d;
}

function kreisLinie (cx, cy, r, bild, kanal, staerke = 1.2) {
  const n = 12;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return kochLinie(pts, bild, kanal, staerke) + 'Z';
}

/**
 * Erzeugt die Pfade der Figur.
 * @param phase  0..1  Position im Schrittzyklus
 * @param bild   ganzzahlig — wechselt 8× pro Sekunde
 * @param drehung -1..1  1 = von der Seite, 0 = frontal/von hinten
 */
export function figurZeichnen (phase, bild, drehung = 1, innenLinks = true) {
  const g = gerüst(phase, innenLinks);
  /* Frontale Ansicht staucht die Figur in der Breite */
  const q = Math.max(Math.abs(drehung), 0.22);
  const S = ([x, y]) => [x * q * Math.sign(drehung || 1), y];
  const K = (arr) => arr.map(S);

  const st = 1.4;
  const teile = [];
  teile.push(kochLinie([S(g.becken), S(g.brust), S(g.hals)], bild, 1, st * 1.1));
  teile.push(kreisLinie(...S(g.kopf), 7.2, bild, 2, st * 0.8));
  teile.push(kochLinie(K(g.beinL), bild, 3, st));
  teile.push(kochLinie(K(g.beinR), bild, 4, st));
  teile.push(kochLinie(K(g.armV),  bild, 5, st));
  teile.push(kochLinie(K(g.armH),  bild, 6, st));
  /* Schultern als ein Strich */
  teile.push(kochLinie([S([-8, g.brust[1] - 4]), S([8, g.brust[1] - 4])], bild, 7, st * 0.9));
  return teile;
}

/** Die Bahn, die die Figur schon zurückgelegt hat. */
export function spurZeichnen (punkte, bild) {
  if (punkte.length < 2) return '';
  return kochLinie(punkte, bild, 91, 1.1);
}
