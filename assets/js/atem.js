/* ══════════════════════════════════════════════════════════════════
   ATEM — eine gemeinsame Uhr für alles, was sich bewegt.
   Vier Sekunden ein, sechs Sekunden aus. Ein realer Ruheatem.
   Jede Bewegung auf dieser Seite hängt an diesem Takt.
   ══════════════════════════════════════════════════════════════════ */

const EIN = 4.0, AUS = 6.0, ZYKLUS = EIN + AUS;

export function atemUhr () {
  const start = performance.now() / 1000;
  const horcher = new Set();
  let letztePhase = '';

  function phaseJetzt () {
    const t = (performance.now() / 1000 - start) % ZYKLUS;
    return t < EIN ? 'ein' : 'aus';
  }

  /** -1 (ganz ausgeatmet) .. +1 (ganz eingeatmet) */
  function wert () {
    const t = (performance.now() / 1000 - start) % ZYKLUS;
    const p = t < EIN ? t / EIN : 1 - (t - EIN) / AUS;
    return Math.cos((1 - p) * Math.PI);
  }

  setInterval(() => {
    const p = phaseJetzt();
    if (p !== letztePhase) { letztePhase = p; horcher.forEach(f => f(p)); }
  }, 120);

  return {
    wert, phase: phaseJetzt,
    beiPhase (f) { horcher.add(f); return () => horcher.delete(f); },
    EIN, AUS, ZYKLUS
  };
}
