/* ══════════════════════════════════════════════════════════════════
   INHALT — die acht Kreise.
   Farben, Lage, Größe, Ringzahl. Alles andere steht im HTML.

   Lage: x und y in Einheiten der halben Sichthöhe, z in Weltmaß.
   Bei 16:10 ist der sichtbare Bereich x ∈ [-1.6, 1.6], y ∈ [-1, 1].
   Die Ränder dürfen überlaufen — ein Bild endet nicht am Blattrand.
   ══════════════════════════════════════════════════════════════════ */

const P = {
  zinnober: '#f2551b', safran:  '#fa9a16', karmin:  '#e11447', magenta: '#d21c93',
  altrosa:  '#f2879e', violett: '#7c31ad', violettH:'#a655cf', pflaume: '#5a2585',
  tiefviolett:'#43196a', himbeer: '#d81a6e', purpur:  '#a11a86', gold:    '#fdb92a',
  rosa:     '#f8c3cf', creme:   '#fdeae0', rost:    '#c8380f', tusche:  '#4a1330'
};

/** Der Anteil der halben Sichthöhe, den ein Kreis mit r = 1 einnimmt. */
export const MASS = { weit: 0.30, hoch: 0.24 };

/** Acht Kreise. Reihenfolge = Reihenfolge im HTML. */
export const KREISE = [
  {
    id: 'bild', ziel: 'raum-bild',
    farben: [P.gold, P.safran, P.zinnober, P.pflaume, P.karmin, P.violett, P.himbeer, P.rosa],
    ringe: 7, saat: 11, luecke: 0, lueckeWo: 0,
    weit: { x: -0.34, y:  0.02, z: -0.5, r: 1.30 },
    hoch: { x: -0.10, y:  0.24, z: -0.4, r: 1.15 }
  },
  {
    id: 'klang', ziel: 'raum-klang',
    farben: [P.gold, P.zinnober, P.violett, P.karmin, P.magenta, P.rosa],
    ringe: 5, saat: 23, luecke: 0.55, lueckeWo: -0.9,
    weit: { x:  0.80, y:  0.52, z: -1.4, r: 0.95 },
    hoch: { x:  0.30, y: -0.10, z: -1.2, r: 0.78 }
  },
  {
    id: 'kreis', ziel: 'raum-kreis',
    farben: [P.gold, P.zinnober, P.pflaume, P.karmin, P.rosa],
    ringe: 4, saat: 37, luecke: 0, lueckeWo: 0,
    weit: { x:  1.34, y: -0.16, z:  0.3, r: 0.72 },
    hoch: { x: -0.30, y: -0.36, z:  0.2, r: 0.72 }
  },
  {
    id: 'atem', ziel: 'raum-atem',
    farben: [P.gold, P.violett, P.himbeer, P.rosa],
    ringe: 3, saat: 53, luecke: 0.4, lueckeWo: 2.3,
    weit: { x: -1.20, y: -0.62, z:  0.7, r: 0.58 },
    hoch: { x:  0.26, y: -0.56, z:  0.5, r: 0.58 }
  },
  {
    id: 'wurzel', ziel: 'raum-wurzel',
    farben: [P.gold, P.rost, P.tiefviolett, P.himbeer, P.rosa],
    ringe: 4, saat: 71, luecke: 0, lueckeWo: 0,
    weit: { x:  0.20, y: -0.80, z: -0.7, r: 0.80 },
    hoch: { x:  0.30, y:  0.56, z: -0.9, r: 0.60 }
  },
  {
    id: 'feldraum', ziel: 'raum-feld',
    farben: [P.gold, P.safran, P.purpur, P.zinnober, P.karmin, P.magenta, P.rosa],
    ringe: 6, saat: 89, luecke: 0, lueckeWo: 0,
    weit: { x:  1.44, y:  0.92, z: -2.2, r: 0.62 },
    hoch: { x: -0.31, y:  0.62, z: -1.8, r: 0.50 }
  },
  {
    id: 'weg', ziel: 'raum-weg',
    farben: [P.gold, P.karmin, P.rosa],
    ringe: 2, saat: 103, luecke: 0.7, lueckeWo: 1.2,
    weit: { x: -0.14, y:  0.74, z: -2.6, r: 0.50 },
    hoch: { x:  0.03, y:  0.80, z: -2.4, r: 0.38 }
  },
  {
    id: 'begegnung', ziel: 'raum-begegnung',
    farben: [P.gold, P.violett, P.karmin, P.rosa],
    ringe: 3, saat: 127, luecke: 0, lueckeWo: 0,
    weit: { x:  0.62, y: -0.34, z:  1.0, r: 0.46 },
    hoch: { x: -0.26, y: -0.72, z:  0.8, r: 0.46 }
  }
];

/** Weiche Aquarellwolken weit hinten — reine Stimmung, kaum sichtbar. */
export const WOLKEN = [
  { farbe: P.safran,   x: -0.7, y:  0.7, z: -8.0, r: 3.6, saat: 5,  staerke: .18 },
  { farbe: P.himbeer,  x:  1.2, y: -0.6, z: -9.2, r: 4.2, saat: 13, staerke: .14 },
  { farbe: P.violettH, x: -1.5, y: -0.9, z: -9.8, r: 3.8, saat: 29, staerke: .12 }
];

/** Kandinskys Striche: kurz, mit einem Hauch Bogen. Marken, keine Kratzer. */
export const GERADEN = [
  { x1: 0.615, y1: 0.09, x2: 0.845, y2: 0.35, bug:  0.030, tiefe: .28, dicke: 2.6 },
  { x1: 0.085, y1: 0.66, x2: 0.305, y2: 0.42, bug: -0.022, tiefe: .58, dicke: 1.6 },
  { x1: 0.700, y1: 0.78, x2: 0.905, y2: 0.61, bug:  0.018, tiefe: .80, dicke: 1.1 },
  { x1: 0.470, y1: 0.14, x2: 0.505, y2: 0.33, bug: -0.014, tiefe: .44, dicke: 1.3 }
];

/** Die acht Trigramme für den Bagua-Raum. */
export const TRIGRAMME = [
  { name: 'Qian', zeichen: [1,1,1], wort: 'Himmel' },
  { name: 'Dui',  zeichen: [1,1,0], wort: 'See'    },
  { name: 'Li',   zeichen: [1,0,1], wort: 'Feuer'  },
  { name: 'Zhen', zeichen: [1,0,0], wort: 'Donner' },
  { name: 'Xun',  zeichen: [0,1,1], wort: 'Wind'   },
  { name: 'Kan',  zeichen: [0,1,0], wort: 'Wasser' },
  { name: 'Gen',  zeichen: [0,0,1], wort: 'Berg'   },
  { name: 'Kun',  zeichen: [0,0,0], wort: 'Erde'   }
];
