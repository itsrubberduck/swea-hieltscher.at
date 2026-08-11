/* ══════════════════════════════════════════════════════════════════
   PIGMENT — gemalte Kreise in WebGL.
   Kein Vektor, kein Filter: die Farbe wird pro Bildpunkt gemalt.
   Ringgrenzen wackeln, Pinselspuren laufen um den Mittelpunkt,
   das Licht fällt schräg auf den Farbauftrag.
   ══════════════════════════════════════════════════════════════════ */

import * as T from '../vendor/three.module.js';
import { KREISE, WOLKEN, MASS } from './inhalt.js';
import { hex2rgb, klemme, misch, zieh, sanft, raus } from './util.js';

/* ── Rauschen ───────────────────────────────────────────────────── */
const RAUSCHEN = /* glsl */`
vec3 permute(vec3 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0))
                           + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
float fbm(vec2 p){
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * snoise(p); p *= 2.07; a *= 0.5; }
  return s;
}
`;

const V_SHADER = /* glsl */`
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/* ── Der gemalte Kreis ──────────────────────────────────────────── */
const F_KREIS = /* glsl */`
precision highp float;
varying vec2 vUv;

uniform float uZeit;
uniform float uAtem;      // -1 .. 1
uniform float uNah;       //  0 .. 1  Annäherung des Zeigers
uniform float uSaat;
uniform float uRinge;
uniform float uSicht;     //  0 .. 1  Sichtbarkeit
uniform float uRein;      //  0 .. 1  Kamera ist im Kreis
uniform float uLuecke;    //  0 = geschlossener Kreis, sonst Breite der Öffnung
uniform float uLueckeWo;  //  Winkel der Öffnung
uniform vec3  uFarben[8];
uniform int   uAnzahl;
uniform vec3  uPapier;

${RAUSCHEN}

vec3 farbeVon(int idx){
  vec3 c = uFarben[0];
  for (int i = 0; i < 8; i++) { if (i == idx) c = uFarben[i]; }
  return c;
}

void main(){
  vec2 p = (vUv - 0.5) * 2.0;
  float r00 = length(p);
  if (r00 > 1.3) discard;

  float t = uZeit * 0.05 + uSaat * 0.7;

  /* 0 — Feldverzerrung. Der wichtigste Griff:
         die Ringe sitzen dadurch NICHT auf einem gemeinsamen Mittelpunkt.
         Jeder Ring driftet ein Stück — so malt eine Hand, nie ein Zirkel. */
  vec2 wa = vec2(fbm(p * 0.80 + uSaat + t * 0.15),
                 fbm(p * 0.80 + uSaat + 37.0 - t * 0.11));
  vec2 wb = vec2(fbm(p * 2.10 - uSaat), fbm(p * 2.10 - uSaat + 19.0));
  vec2 pw = p + wa * 0.235 + wb * 0.055;

  float r0  = length(pw);
  float ang = atan(pw.y, pw.x);
  vec2  ring = vec2(cos(ang), sin(ang));

  /* Zur Mitte hin darf nichts winkelabhängig sein, sonst sternt es aus. */
  float ruhe = pow(smoothstep(0.0, 0.36, r00), 1.7);

  /* 1 — Der Umriss ist von Hand gezogen: große, langsame Wellen. */
  float wack = (fbm(ring * 0.95 + t) * 0.085
              + fbm(ring * 2.20 - t * 0.55) * 0.026) * ruhe;
  float r = r0 * (1.0 + wack);

  /* Atem und Annäherung weiten den Kreis. */
  r /= (1.0 + uAtem * 0.022 + uNah * 0.055);

  /* 2 — Ringe. Ungleich breit — so malt niemand mit dem Zirkel. */
  float rw = r + 0.070 * sin(r * 5.6 + uSaat * 1.7)
               + 0.038 * sin(r * 11.3 - uSaat);
  float bandF = rw * uRinge + fbm(vec2(ang * 0.75, r * 1.3) + uSaat) * 0.30 * ruhe;
  int   band  = int(floor(mod(bandF, float(uAnzahl))));
  int   naechst = int(mod(float(band) + 1.0, float(uAnzahl)));
  float inBand = fract(bandF);

  vec3 farbe = farbeVon(band);
  farbe = mix(farbe, farbeVon(naechst), smoothstep(0.80, 1.0, inBand) * 0.62);

  /* 3 — Pinselspuren laufen UM den Mittelpunkt. */
  vec2 q = vec2(ang * 6.0, r * 26.0);
  float strich  = fbm(q) * ruhe;
  float strich2 = snoise(vec2(ang * 17.0, r * 78.0)) * ruhe;
  farbe *= 1.0 + strich * 0.11 + strich2 * 0.035;

  /* 4 — Impasto: Licht fällt schräg auf den Farbauftrag. */
  float e = 0.008;
  float hx = fbm(q + vec2(e, 0.0)) - fbm(q - vec2(e, 0.0));
  float hy = fbm(q + vec2(0.0, e)) - fbm(q - vec2(0.0, e));
  vec3  n  = normalize(vec3(-hx * 1.7 * ruhe, -hy * 1.7 * ruhe, 1.0));
  float licht = clamp(dot(n, normalize(vec3(-0.42, 0.58, 0.70))), 0.0, 1.0);
  farbe *= 0.89 + licht * 0.23;

  /* 4b — Kein Ring ist in sich gleich hell. Große, weiche Schwankung. */
  farbe *= 1.0 + fbm(p * 1.35 + uSaat * 0.9) * 0.12;

  /* 5 — Wo die Farbe dünn liegt, scheint das Papier durch. */
  float duenn = smoothstep(0.46, -0.24, fbm(p * 2.2 + uSaat * 0.4));
  farbe = mix(farbe, uPapier, duenn * 0.22);

  /* 6 — Der dunkle Rand, den nasse Farbe beim Trocknen hinterlässt. */
  float saum = smoothstep(0.78, 0.955, r) * (1.0 - smoothstep(0.955, 1.02, r));
  farbe *= 1.0 - saum * 0.16;

  /* 7 — Kante. */
  float a = 1.0 - smoothstep(0.945, 1.005, r);
  a *= 0.93 + 0.07 * strich;

  /* 8 — Manche Kreise sind nicht geschlossen: der Strich hat abgesetzt.
         Die Öffnung betrifft nur die äußeren Ringe. */
  if (uLuecke > 0.001) {
    float d = abs(mod(ang - uLueckeWo + 3.14159265, 6.28318531) - 3.14159265);
    float auf = smoothstep(uLuecke, uLuecke + 0.34, d);
    a *= mix(1.0, auf, smoothstep(0.42, 0.72, r));
  }

  a *= uSicht;

  /* Beim Eintauchen wird die Farbe zur Atmosphäre. */
  farbe = mix(farbe, mix(farbe, uPapier, 0.55), uRein);

  if (a < 0.004) discard;
  gl_FragColor = vec4(farbe, a);
}
`;

/* ── Aquarellwolke ──────────────────────────────────────────────── */
const F_WOLKE = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform float uZeit, uSaat, uStaerke, uSicht;
uniform vec3  uFarbe;
${RAUSCHEN}
void main(){
  vec2 p = (vUv - 0.5) * 2.0;
  float t = uZeit * 0.018 + uSaat;
  float n  = fbm(p * 1.15 + t) * 0.55 + fbm(p * 3.3 - t * 0.7) * 0.18;
  float r  = length(p) + n * 0.42;
  float m  = 1.0 - smoothstep(0.05, 0.98, r);
  m = pow(max(m, 0.0), 1.5);
  /* Aquarell sammelt sich am Rand */
  float saum = smoothstep(0.55, 0.86, r) * (1.0 - smoothstep(0.86, 1.0, r));
  vec3 c = uFarbe * (1.0 + saum * 0.30);
  float a = m * uStaerke * uSicht;
  if (a < 0.003) discard;
  gl_FragColor = vec4(c, a);
}
`;

/* ══════════════════════════════════════════════════════════════════ */

export function pigmentAufbauen (leinwand, atem) {
  let renderer;
  try {
    renderer = new T.WebGLRenderer({
      canvas: leinwand, alpha: true, antialias: false,
      powerPreference: 'low-power', premultipliedAlpha: true
    });
  } catch (e) { return null; }
  if (!renderer.getContext()) return null;

  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearAlpha(0);

  const szene  = new T.Scene();
  const kamera = new T.PerspectiveCamera(42, 1, 0.1, 120);
  kamera.position.set(0, 0, 12);

  const HEIM = new T.Vector3(0, 0, 12);
  const papier = new T.Vector3(...hex2rgb('#fdf3f0'));
  const flaeche = new T.PlaneGeometry(2, 2, 1, 1);

  /* ── Wolken ─────────────────────────────────────────────── */
  const wolken = WOLKEN.map(w => {
    const m = new T.ShaderMaterial({
      vertexShader: V_SHADER, fragmentShader: F_WOLKE,
      transparent: true, depthWrite: false, depthTest: false,
      uniforms: {
        uZeit:    { value: 0 },
        uSaat:    { value: w.saat },
        uStaerke: { value: w.staerke },
        uSicht:   { value: 1 },
        uFarbe:   { value: new T.Vector3(...hex2rgb(w.farbe)) }
      }
    });
    const netz = new T.Mesh(flaeche, m);
    netz.renderOrder = -10;
    szene.add(netz);
    return { netz, mat: m, daten: w };
  });

  /* ── Kreise ─────────────────────────────────────────────── */
  const kreise = KREISE.map((k, i) => {
    const farben = new Array(8).fill(null).map((_, j) =>
      new T.Vector3(...hex2rgb(k.farben[j % k.farben.length])));
    const m = new T.ShaderMaterial({
      vertexShader: V_SHADER, fragmentShader: F_KREIS,
      transparent: true, depthWrite: false, depthTest: false,
      uniforms: {
        uZeit:  { value: 0 },
        uAtem:  { value: 0 },
        uNah:   { value: 0 },
        uSaat:  { value: k.saat },
        uRinge: { value: k.ringe },
        uSicht: { value: 1 },
        uRein:  { value: 0 },
        uLuecke:   { value: k.luecke || 0 },
        uLueckeWo: { value: k.lueckeWo || 0 },
        uAnzahl:{ value: k.farben.length },
        uFarben:{ value: farben },
        uPapier:{ value: papier }
      }
    });
    const netz = new T.Mesh(flaeche, m);
    netz.renderOrder = i;
    szene.add(netz);
    return {
      id: k.id, daten: k, netz, mat: m,
      nah: 0, sichtSoll: 1, reinSoll: 0,
      schirm: { x: 0, y: 0, r: 60 },
      dreh: (k.saat % 7 - 3) * 0.04
    };
  });

  /* ── Lage ───────────────────────────────────────────────── */
  let breite = 1, hoehe = 1, halbH = 4.6, hoch = false;

  function ordnen () {
    breite = leinwand.clientWidth  || innerWidth;
    hoehe  = leinwand.clientHeight || innerHeight;
    const seite = breite / hoehe;
    hoch = seite < 0.95;

    renderer.setSize(breite, hoehe, false);
    kamera.aspect = seite;
    kamera.fov = hoch ? 54 : 42;
    kamera.updateProjectionMatrix();

    halbH = Math.tan(T.MathUtils.degToRad(kamera.fov / 2)) * 12;

    kreise.forEach(k => {
      const l = hoch ? k.daten.hoch : k.daten.weit;
      const s = halbH * l.r * (hoch ? MASS.hoch : MASS.weit);
      k.netz.position.set(l.x * halbH, l.y * halbH, l.z);
      k.netz.scale.set(s, s, 1);
      k.netz.rotation.z = k.dreh;
      k.heim = k.netz.position.clone();
      k.radius = s;
    });

    wolken.forEach(w => {
      const f = hoch ? 1.35 : 1;
      w.netz.position.set(w.daten.x * halbH, w.daten.y * halbH * f, w.daten.z);
      const s = halbH * w.daten.r * 0.5 * f;
      w.netz.scale.set(s, s, 1);
    });
  }

  /* ── Zustand ────────────────────────────────────────────── */
  const zeiger = { x: 0, y: 0, zx: 0, zy: 0, aktiv: false };
  const kam = { x: 0, y: 0, z: 12, zx: 0, zy: 0, zz: 12 };
  let flug = null;            // { von, nach, t, dauer, ziel }
  let offen = null;
  let laeuft = true;
  let zuletzt = performance.now();

  const proj = new T.Vector3();

  function schirmLage (k) {
    proj.copy(k.netz.position).project(kamera);
    const x = (proj.x * 0.5 + 0.5) * breite;
    const y = (-proj.y * 0.5 + 0.5) * hoehe;
    /* Radius am Bildschirm: aus der Projektion eines Randpunkts */
    const rand = proj.clone();
    const p2 = new T.Vector3(
      k.netz.position.x + k.radius, k.netz.position.y, k.netz.position.z
    ).project(kamera);
    const r = Math.abs((p2.x - proj.x) * 0.5 * breite);
    k.schirm.x = x; k.schirm.y = y; k.schirm.r = Math.max(r, 24);
    return k.schirm;
  }

  /* ── Schleife ───────────────────────────────────────────── */
  const horcher = new Set();
  function bild (jetzt) {
    if (!laeuft) return;
    requestAnimationFrame(bild);
    const dt = Math.min((jetzt - zuletzt) / 1000, 0.05);
    zuletzt = jetzt;
    const z = jetzt / 1000;

    const a = atem.wert();           // -1 .. 1

    /* Zeiger dämpfen */
    zeiger.zx = zieh(zeiger.zx, zeiger.x, 3.2, dt);
    zeiger.zy = zieh(zeiger.zy, zeiger.y, 3.2, dt);

    /* Kamera: Parallaxe im Feld, Drift im Raum */
    if (flug) {
      flug.t = Math.min(flug.t + dt / flug.dauer, 1);
      const e = sanft(flug.t);
      kam.zx = misch(flug.von.x, flug.nach.x, e);
      kam.zy = misch(flug.von.y, flug.nach.y, e);
      kam.zz = misch(flug.von.z, flug.nach.z, e);
      if (flug.t >= 1) { flug.fertig && flug.fertig(); flug = null; }
    } else if (offen) {
      const k = offen;
      kam.zx = zieh(kam.zx, k.heim.x + Math.sin(z * 0.11) * 0.5, 1.2, dt);
      kam.zy = zieh(kam.zy, k.heim.y + Math.cos(z * 0.09) * 0.4, 1.2, dt);
      kam.zz = zieh(kam.zz, k.ziel_z + Math.sin(z * 0.07) * 0.25, 1.2, dt);
    } else {
      kam.x = zeiger.zx * halbH * 0.13;
      kam.y = zeiger.zy * halbH * 0.10;
      kam.z = 12 + zeiger.zy * 0.25;
      kam.zx = zieh(kam.zx, kam.x, 2.4, dt);
      kam.zy = zieh(kam.zy, kam.y, 2.4, dt);
      kam.zz = zieh(kam.zz, kam.z, 2.4, dt);
    }
    kamera.position.set(kam.zx, kam.zy, kam.zz);
    kamera.lookAt(kam.zx * 0.55, kam.zy * 0.55, offen ? offen.heim.z : -1);

    /* Kreise */
    for (const k of kreise) {
      k.mat.uniforms.uZeit.value = z;
      k.mat.uniforms.uAtem.value = a;
      k.mat.uniforms.uNah.value  = zieh(k.mat.uniforms.uNah.value, k.nah, 5.5, dt);
      k.mat.uniforms.uSicht.value= zieh(k.mat.uniforms.uSicht.value, k.sichtSoll, 3.0, dt);
      k.mat.uniforms.uRein.value = zieh(k.mat.uniforms.uRein.value, k.reinSoll, 2.2, dt);
      /* Sehr langsame Eigendrehung — Farbe steht nie still */
      k.netz.rotation.z = k.dreh + Math.sin(z * 0.035 + k.daten.saat) * 0.05;
      /* Trieb: jeder Kreis wandert minimal */
      const s = k.daten.saat;
      k.netz.position.x = k.heim.x + Math.sin(z * 0.052 + s) * halbH * 0.018;
      k.netz.position.y = k.heim.y + Math.cos(z * 0.041 + s * 1.7) * halbH * 0.015;
      /* Atem in der Größe */
      const p = 1 + a * 0.012 + k.mat.uniforms.uNah.value * 0.06;
      k.netz.scale.set(k.radius * p, k.radius * p, 1);
    }

    for (const w of wolken) w.mat.uniforms.uZeit.value = z;

    renderer.render(szene, kamera);

    /* Beschriftungen nachführen */
    for (const k of kreise) schirmLage(k);
    horcher.forEach(f => f(kreise));
  }

  /* ── Öffentliche Handhabe ───────────────────────────────── */
  const api = {
    kreise,
    ordnen,
    beiBild (f) { horcher.add(f); return () => horcher.delete(f); },

    zeigerAuf (x, y) {          // -1 .. 1
      zeiger.x = klemme(x, -1, 1);
      zeiger.y = klemme(y, -1, 1);
      zeiger.aktiv = true;
    },
    zeigerWeg () { zeiger.x = 0; zeiger.y = 0; zeiger.aktiv = false; },

    naehe (id, v) {
      const k = kreise.find(k => k.id === id);
      if (k) k.nah = v;
    },

    /** Kamera taucht in den Kreis ein. */
    hinein (id, fertig) {
      const k = kreise.find(k => k.id === id);
      if (!k) return;
      offen = k;
      /* Abstand, bei dem der Kreis den Schirm füllt */
      const tan = Math.tan(T.MathUtils.degToRad(kamera.fov / 2));
      k.ziel_z = k.heim.z + k.radius / (tan * 1.05);
      flug = {
        von: { x: kam.zx, y: kam.zy, z: kam.zz },
        nach:{ x: k.heim.x, y: k.heim.y, z: k.ziel_z },
        t: 0, dauer: 1.05, fertig
      };
      kreise.forEach(o => { o.sichtSoll = o === k ? 1 : 0; o.reinSoll = o === k ? 1 : 0; o.nah = 0; });
      wolken.forEach(w => w.mat.uniforms.uSicht.value = 0.45);
    },

    /** Zurück ins Feld. */
    hinaus (fertig) {
      offen = null;
      flug = {
        von: { x: kam.zx, y: kam.zy, z: kam.zz },
        nach:{ x: 0, y: 0, z: 12 },
        t: 0, dauer: 0.95, fertig
      };
      kreise.forEach(o => { o.sichtSoll = 1; o.reinSoll = 0; });
      wolken.forEach(w => w.mat.uniforms.uSicht.value = 1);
    },

    anhalten () { laeuft = false; },
    weiter () { if (!laeuft) { laeuft = true; zuletzt = performance.now(); requestAnimationFrame(bild); } },
    entsorgen () {
      laeuft = false;
      kreise.forEach(k => k.mat.dispose());
      wolken.forEach(w => w.mat.dispose());
      flaeche.dispose();
      renderer.dispose();
    }
  };

  ordnen();
  requestAnimationFrame(bild);
  return api;
}
