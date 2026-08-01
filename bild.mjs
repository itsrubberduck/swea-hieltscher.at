/* ══════════════════════════════════════════════════════════════════
   bild.mjs — rendert das Feld ohne Browser.
   Der Shader aus pigment.js ist hier in JavaScript nachgebaut,
   damit man das Ergebnis prüfen kann, ohne die Seite zu öffnen.
   Aufruf: node bild.mjs [breite] [höhe] [datei]
   ══════════════════════════════════════════════════════════════════ */

import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { KREISE, WOLKEN, GERADEN, MASS } from './assets/js/inhalt.js';

const hier = dirname(fileURLToPath(import.meta.url));

/* ── Rauschen (identisch zum GLSL) ──────────────────────────────── */
const mod289 = x => x - Math.floor(x / 289) * 289;
const permute1 = x => mod289((x * 34 + 1) * x);
function snoise (x0i, y0i) {
  const C0 = 0.211324865405187, C1 = 0.366025403784439,
        C2 = -0.577350269189626, C3 = 0.024390243902439;
  const s = (x0i + y0i) * C1;
  let ix = Math.floor(x0i + s), iy = Math.floor(y0i + s);
  const t = (ix + iy) * C0;
  let x0 = x0i - ix + t, y0 = y0i - iy + t;
  const i1x = x0 > y0 ? 1 : 0, i1y = x0 > y0 ? 0 : 1;
  const x1 = x0 + C0 - i1x, y1 = y0 + C0 - i1y;
  const x2 = x0 + C2,       y2 = y0 + C2;
  ix = mod289(ix); iy = mod289(iy);
  const p0 = permute1(permute1(iy)        + ix);
  const p1 = permute1(permute1(iy + i1y)  + ix + i1x);
  const p2 = permute1(permute1(iy + 1)    + ix + 1);
  const grad = (p, px, py) => {
    const xv = 2 * ((p * C3) % 1) - 1;
    const h = Math.abs(xv) - 0.5;
    const ox = Math.floor(xv + 0.5);
    const a0 = xv - ox;
    let m = Math.max(0.5 - (px * px + py * py), 0);
    m = m * m; m = m * m;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    return m * (a0 * px + h * py);
  };
  return 130 * (grad(p0, x0, y0) + grad(p1, x1, y1) + grad(p2, x2, y2));
}
function fbm (x, y) {
  let s = 0, a = 0.5;
  for (let i = 0; i < 4; i++) { s += a * snoise(x, y); x *= 2.07; y *= 2.07; a *= 0.5; }
  return s;
}

/* ── Hilfen ─────────────────────────────────────────────────────── */
const hex = h => { const n = parseInt(h.slice(1), 16); return [((n>>16)&255)/255, ((n>>8)&255)/255, (n&255)/255]; };
const kl = (v,a,b) => Math.min(b, Math.max(a, v));
const mi = (a,b,t) => a + (b-a)*t;
const ss = (a,b,x) => { const t = kl((x-a)/(b-a),0,1); return t*t*(3-2*t); };

const PAPIER = hex('#efe5d1');

/* ── Der Kreis-Shader, Punkt für Punkt ──────────────────────────── */
function kreisFarbe (u, v, K, zeit, nah) {
  const px = (u - .5) * 2, py = (v - .5) * 2;
  const r00 = Math.hypot(px, py);
  if (r00 > 1.3) return null;
  const t = zeit * 0.05 + K.saat * 0.7;

  const wax = fbm(px*0.80 + K.saat + t*0.15, py*0.80 + K.saat + t*0.15);
  const way = fbm(px*0.80 + K.saat + 37 - t*0.11, py*0.80 + K.saat + 37 - t*0.11);
  const wbx = fbm(px*2.10 - K.saat, py*2.10 - K.saat);
  const wby = fbm(px*2.10 - K.saat + 19, py*2.10 - K.saat + 19);
  const pwx = px + wax*0.235 + wbx*0.055;
  const pwy = py + way*0.235 + wby*0.055;

  const r0 = Math.hypot(pwx, pwy);
  const ang = Math.atan2(pwy, pwx);
  const cx = Math.cos(ang), cy = Math.sin(ang);
  const ruhe = Math.pow(ss(0, 0.36, r00), 1.7);

  const wack = (fbm(cx*0.95 + t, cy*0.95 + t) * 0.085
             +  fbm(cx*2.20 - t*.55, cy*2.20 - t*.55) * 0.026) * ruhe;
  let r = r0 * (1 + wack);
  r /= (1 + nah * 0.055);

  const anz = K.farben.length;
  const rw = r + 0.070*Math.sin(r*5.6 + K.saat*1.7) + 0.038*Math.sin(r*11.3 - K.saat);
  const bandF = rw * K.ringe + fbm(ang*0.75 + K.saat, r*1.3 + K.saat) * 0.30 * ruhe;
  let band = Math.floor(((bandF % anz) + anz) % anz);
  const naechst = (band + 1) % anz;
  const inBand = bandF - Math.floor(bandF);

  const c0 = hex(K.farben[band]), c1 = hex(K.farben[naechst]);
  const b = ss(0.80, 1, inBand) * 0.62;
  let c = [mi(c0[0],c1[0],b), mi(c0[1],c1[1],b), mi(c0[2],c1[2],b)];

  const qx = ang*6.0, qy = r*26;
  const strich  = fbm(qx, qy) * ruhe;
  const strich2 = snoise(ang*17, r*78) * ruhe;
  c = c.map(x => x * (1 + strich*0.11 + strich2*0.035));

  const e = 0.008;
  const hx = fbm(qx+e, qy) - fbm(qx-e, qy);
  const hy = fbm(qx, qy+e) - fbm(qx, qy-e);
  let nx = -hx*1.7*ruhe, ny = -hy*1.7*ruhe, nz = 1;
  const nl = Math.hypot(nx,ny,nz); nx/=nl; ny/=nl; nz/=nl;
  const L = [-0.42, 0.58, 0.70]; const Ll = Math.hypot(...L);
  const licht = kl((nx*L[0] + ny*L[1] + nz*L[2]) / Ll, 0, 1);
  c = c.map(x => x * (0.89 + licht*0.23));

  c = c.map(x => x * (1 + fbm(px*1.35 + K.saat*0.9, py*1.35 + K.saat*0.9)*0.12));

  const duenn = ss(0.46, -0.24, fbm(px*2.2 + K.saat*.4, py*2.2 + K.saat*.4));
  c = c.map((x,i) => mi(x, PAPIER[i], duenn*0.22));

  const saum = ss(0.78,0.955,r) * (1 - ss(0.955,1.02,r));
  c = c.map(x => x * (1 - saum*0.16));

  let a = 1 - ss(0.945, 1.005, r);
  a *= 0.93 + 0.07*strich;

  if (K.luecke > 0.001) {
    const d = Math.abs(((ang - K.lueckeWo + Math.PI) % (2*Math.PI) + 2*Math.PI) % (2*Math.PI) - Math.PI);
    const auf = ss(K.luecke, K.luecke + 0.34, d);
    a *= mi(1, auf, ss(0.42, 0.72, r));
  }

  if (a < 0.004) return null;
  return [c[0], c[1], c[2], kl(a,0,1)];
}

function wolkeFarbe (u, v, W, zeit) {
  const px = (u-.5)*2, py = (v-.5)*2;
  const t = zeit*0.018 + W.saat;
  const n = fbm(px*1.15+t, py*1.15+t)*0.55 + fbm(px*3.3-t*.7, py*3.3-t*.7)*0.18;
  const r = Math.hypot(px,py) + n*0.42;
  let m = 1 - ss(0.05, 0.98, r);
  m = Math.pow(Math.max(m,0), 1.5);
  const saum = ss(0.55,0.86,r) * (1 - ss(0.86,1.0,r));
  const c = hex(W.farbe).map(x => x*(1+saum*0.30));
  const a = m * W.staerke;
  if (a < 0.003) return null;
  return [c[0],c[1],c[2],a];
}

/* ══════════════════════════════════════════════════════════════════ */
const B = parseInt(process.argv[2] || '1200', 10);
const H = parseInt(process.argv[3] || '750', 10);
const DATEI = process.argv[4] || 'vorschau-feld.png';
const ZEIT = 12;
const buf = new Float32Array(B*H*3);

/* Papier */
for (let y = 0; y < H; y++) for (let x = 0; x < B; x++) {
  const u = x/B, v = y/H;
  let c = [...PAPIER];
  const g = (cx,cy,rx,ry,col,st) => {
    const d = Math.hypot((u-cx)/rx, (v-cy)/ry);
    const w = (1 - ss(0, 1, d)) * st;
    const cc = hex(col);
    c = c.map((q,i) => mi(q, cc[i], w));
  };
  g(0.22,0.18,0.62,0.50,'#f7f0de',1);
  g(0.84,0.72,0.55,0.62,'#eadfc6',1);
  g(0.48,1.10,0.75,0.58,'#e3d5ba',1);
  const vig = ss(0.40, 1.0, Math.hypot((u-0.38)/1.2, (v-0.30)/0.95));
  c = c.map(q => q * (1 - vig*0.17));
  const i = (y*B+x)*3; buf[i]=c[0]; buf[i+1]=c[1]; buf[i+2]=c[2];
}

/* Kamera */
const seite = B/H, hochFormat = seite < 0.95;
const fov = hochFormat ? 54 : 42;
const brenn = (H/2) / Math.tan(fov*Math.PI/360);
const halbH = Math.tan(fov*Math.PI/360) * 12;

function malen (obj, lage, groesse, shader) {
  const d = 12 - lage.z;
  const k = brenn / d;
  const sx = B/2 + lage.x * k, sy = H/2 - lage.y * k;
  const sr = groesse * k;
  const x0 = Math.max(0, Math.floor(sx-sr*1.3)), x1 = Math.min(B, Math.ceil(sx+sr*1.3));
  const y0 = Math.max(0, Math.floor(sy-sr*1.3)), y1 = Math.min(H, Math.ceil(sy+sr*1.3));
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const u = (x - sx)/(2*sr) + .5, v = (y - sy)/(2*sr) + .5;
    if (u < -.15 || u > 1.15 || v < -.15 || v > 1.15) continue;
    const c = shader(u, v);
    if (!c) continue;
    const i = (y*B+x)*3;
    buf[i]   = mi(buf[i],   c[0], c[3]);
    buf[i+1] = mi(buf[i+1], c[1], c[3]);
    buf[i+2] = mi(buf[i+2], c[2], c[3]);
  }
}

/* Wolken, dann Kreise von hinten nach vorn */
for (const w of WOLKEN) {
  const f = hochFormat ? 1.35 : 1;
  malen(w, { x: w.x*halbH, y: w.y*halbH*f, z: w.z }, halbH*w.r*0.5*f, (u,v)=>wolkeFarbe(u,v,w,ZEIT));
}
const sortiert = [...KREISE].sort((a,b) => {
  const la = hochFormat?a.hoch:a.weit, lb = hochFormat?b.hoch:b.weit;
  return la.z - lb.z;
});
for (const K of sortiert) {
  const l = hochFormat ? K.hoch : K.weit;
  const s = halbH * l.r * (hochFormat ? MASS.hoch : MASS.weit);
  malen(K, { x: l.x*halbH, y: l.y*halbH, z: l.z }, s,
        (u,v) => kreisFarbe(u,v,K,ZEIT,0));
}

/* Kandinskys Geraden */
const tusche = hex('#15120e');
for (const g of GERADEN) {
  const x1 = g.x1*B, y1 = g.y1*H, x2 = g.x2*B, y2 = g.y2*H;
  const n = Math.ceil(Math.hypot(x2-x1, y2-y1)*2);
  const op = 0.16 + (1-g.tiefe)*0.34;
  for (let i = 0; i <= n; i++) {
    const t = i/n, cx = mi(x1,x2,t), cy = mi(y1,y2,t);
    const rad = g.dicke * Math.min(Math.max(B/1200, 0.42), 1.15) / 2;
    for (let dy = -Math.ceil(rad); dy <= Math.ceil(rad); dy++)
      for (let dx = -Math.ceil(rad); dx <= Math.ceil(rad); dx++) {
        const X = Math.round(cx+dx), Y = Math.round(cy+dy);
        if (X<0||Y<0||X>=B||Y>=H) continue;
        const a = op * kl(1 - (Math.hypot(dx,dy) - rad + .5), 0, 1);
        if (a <= 0) continue;
        const i2 = (Y*B+X)*3;
        buf[i2]   = mi(buf[i2],   tusche[0], a);
        buf[i2+1] = mi(buf[i2+1], tusche[1], a);
        buf[i2+2] = mi(buf[i2+2], tusche[2], a);
      }
  }
}

/* Faser oben drauf */
for (let y = 0; y < H; y++) for (let x = 0; x < B; x++) {
  const n = (snoise(x*0.9, y*0.9)*0.5+0.5);
  const f = 1 - (1-n)*0.055;
  const i = (y*B+x)*3;
  buf[i]*=f; buf[i+1]*=f; buf[i+2]*=f;
}

/* ── PNG schreiben ──────────────────────────────────────────────── */
function png (breite, hoehe, daten) {
  const roh = Buffer.alloc(hoehe*(breite*3+1));
  for (let y = 0; y < hoehe; y++) {
    roh[y*(breite*3+1)] = 0;
    for (let x = 0; x < breite*3; x++) {
      const v = daten[y*breite*3+x];
      roh[y*(breite*3+1)+1+x] = Math.round(kl(Math.pow(kl(v,0,1), 1/1.0), 0, 1)*255);
    }
  }
  const crcT = [];
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c>>>1) : c>>>1; crcT[n] = c>>>0; }
  const crc = b => { let c = 0xFFFFFFFF; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c>>>8); return (c ^ 0xFFFFFFFF)>>>0; };
  const chunk = (typ, d) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(d.length);
    const tb = Buffer.from(typ, 'ascii');
    const cr = Buffer.alloc(4); cr.writeUInt32BE(crc(Buffer.concat([tb, d])));
    return Buffer.concat([len, tb, d, cr]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(breite,0); ihdr.writeUInt32BE(hoehe,4);
  ihdr[8]=8; ihdr[9]=2; ihdr[10]=0; ihdr[11]=0; ihdr[12]=0;
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(roh, { level: 6 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

writeFileSync(join(hier, DATEI), png(B, H, buf));
console.log(DATEI, '→', B + '×' + H);
