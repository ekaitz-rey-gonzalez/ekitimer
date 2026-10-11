const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../helpers/load').load();
const I = Infinity;

test('unidades: singles truncados a centésimas y FMC en movimientos×100', () => {
  assert.equal(M.unitsOf('3x3', 12.345, null), 1234);
  assert.equal(M.unitsOf('3x3', 12.345, '+2'), 1434);
  assert.equal(M.unitsOf('3x3', 5, 'DNF'), I);
  assert.equal(M.unitsOf('3x3', 0.29, null), 29);
  assert.equal(M.unitsOf('3x3', 1.1, null), 110);
  assert.equal(M.unitsOf('3x3fmc', 28, null), 2800);
});

test('resultado de ronda según el formato WCA', () => {
  assert.equal(M.roundResult([1000, 1200, 1100, 900, 1300], 'ao'), 1100);
  assert.equal(M.roundResult([1000, I, 1100, 900, 1300], 'ao'), 1133);
  assert.equal(M.roundResult([1000, I, I, 900, 1300], 'ao'), I);
  assert.equal(M.roundResult([1000, 1000, 1001], 'mo'), 1000);
  assert.equal(M.roundResult([1000, 1001, 1001], 'mo'), 1001);
  assert.equal(M.roundResult([1000, I, 900], 'mo'), I);
  assert.equal(M.roundResult([I, I, 900], 'bo'), 900);
  assert.equal(M.roundResult([I, I, I], 'bo'), I);
  assert.equal(M.roundResult([2800, 3000, 3100], 'mo'), 2967, 'media FMC 29.67');
});

test('intentos descartados (entre paréntesis)', () => {
  assert.deepEqual(M.trimmedIdx([5, 3, 9, 3, 9]), [1, 4]);
  assert.deepEqual(M.trimmedIdx([I, 1, 2, 3, I]), [1, 4]);
  assert.deepEqual(M.trimmedIdx([7, 7, 7, 7, 7]), [0, 4]);
});

test('corte: hay que bajar estrictamente del tiempo', () => {
  assert.equal(M.cutoffFailed([6000, 6100], 2, 6000), true);
  assert.equal(M.cutoffFailed([6000, 5999], 2, 6000), false);
  assert.equal(M.cutoffFailed([7000], 2, 6000), false, 'aún quedan intentos');
  assert.equal(M.cutoffFailed([I], 1, 6000), true);
  assert.equal(M.cutoffFailed([I, I], 2, null), false);
});

test('mejor y peor media posibles', () => {
  assert.deepEqual(M.bpaWpa([1000, 1200, 1100, 900], 'ao'), { bpa: 1000, wpa: 1100 });
  assert.deepEqual(M.bpaWpa([1000, I, 1100, 900], 'ao'), { bpa: 1000, wpa: I });
});

test('tiempo necesario: ejemplo con redondeo WCA', () => {
  // 11.20 9.87 12.34 DNF → con 12.45 la media es 11.9967 → 12.00, así que hacen falta 12.44
  assert.deepEqual(M.needFor([1120, 987, 1234, I], 5, 'ao', 1200, 1), { kind: 'max', max: 1244 });
  assert.deepEqual(M.needFor([12500, 11500], 3, 'mo', 12000, 1), { kind: 'max', max: 11998 });
  assert.deepEqual(M.needFor([2800, 3100], 3, 'mo', 3000, 100), { kind: 'max', max: 3000 });
  assert.equal(M.needFor([1000, 1200, 1100], 5, 'ao', 1100, 1), null);
});

test('tiempo necesario coincide con fuerza bruta (3000 casos)', () => {
  const brute = (prev, type, target, step) => {
    const f = x => M.roundResult(prev.concat([x]), type);
    if (f(I) < target) return { kind: 'any' };
    let best = null;
    for (let x = 0; x <= 40000; x += step) if (f(x) < target) best = x;
    return best === null ? { kind: 'impossible' } : { kind: 'max', max: best };
  };
  let seed = 1;
  const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
  for (let t = 0; t < 3000; t++) {
    const type = ['ao', 'mo', 'bo'][t % 3], n = type === 'ao' ? 5 : 3;
    const step = t % 7 === 0 && type === 'mo' ? 100 : 1;
    let prev = Array.from({ length: n - 1 }, () => (rnd() < 0.12 ? I : 800 + Math.floor(rnd() * 800)));
    if (step === 100) prev = prev.map(v => (v === I ? I : Math.round(v / 100) * 100));
    const target = 700 + Math.floor(rnd() * 1100);
    assert.deepEqual(M.needFor(prev, n, type, target, step), brute(prev, type, target, step), JSON.stringify({ prev, type, target }));
  }
});
