const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../helpers/load').load();
const face = (s, N, f) => s.slice(f * N * N, (f + 1) * N * N).join('');
const solved = N => E.cubeState('', N).join('');

test('3×3: cada movimiento mueve los colores correctos (U blanco, F verde)', () => {
  assert.equal(face(E.cubeState('R', 3), 3, 0), 'WWGWWGWWG');
  assert.equal(face(E.cubeState('R', 3), 3, 2), 'GGYGGYGGY');
  assert.equal(face(E.cubeState('U', 3), 3, 2).slice(0, 3), 'RRR');
  assert.equal(face(E.cubeState('F', 3), 3, 0).slice(6), 'OOO');
  assert.equal(face(E.cubeState('L', 3), 3, 2)[0], 'W');
  assert.equal(face(E.cubeState('D', 3), 3, 2).slice(6), 'OOO');
  assert.equal(face(E.cubeState('B', 3), 3, 0).slice(0, 3), 'RRR');
});

test('identidades en cubos grandes', () => {
  assert.equal(E.cubeState("R U R' U' ".repeat(6), 3).join(''), solved(3));
  assert.equal(E.cubeState("Rw L' x'", 3).join(''), solved(3));
  assert.equal(E.cubeState("Rw R'", 4).join(''), E.cubeState('2R', 4).join(''));
  assert.equal(E.cubeState("3Rw Rw'", 6).join(''), E.cubeState('3R', 6).join(''));
});

test('los scrambles conservan el número de stickers de cada color', () => {
  for (const N of [2, 3, 4, 5, 6, 7]) {
    const c = {};
    E.cubeState(E.genScramble(`${N}x${N}`), N).forEach(x => (c[x] = (c[x] || 0) + 1));
    assert.ok(Object.values(c).every(v => v === N * N), `${N}x${N}`);
  }
});

test('Pyraminx y Skewb', () => {
  assert.equal(E.pyraState('U U U').join(''), E.pyraState('').join(''));
  assert.equal(E.pyraState('U')[9], 'G');
  assert.equal(E.pyraState('u')[10], 'R', 'la punta solo mueve la punta');
  assert.equal(E.skewbState('R R R').join(''), E.skewbState('').join(''));
  assert.equal(E.skewbState("R U L B R' U'").filter(x => x === 'W').length, 5);
});

test('Clock: las esquinas de delante y detrás suman 0 (mismo engranaje)', () => {
  for (let i = 0; i < 50; i++) {
    const c = E.simClock(E.genScramble('clock'));
    for (const k of [0, 2, 6, 8]) assert.equal((c.front[k] + c.back[[2, 1, 0, 5, 4, 3, 8, 7, 6][k]]) % 12, 0);
  }
});

test('Square-1: los scrambles generados siempre se pueden hacer', () => {
  for (let i = 0; i < 300; i++) assert.ok(E.sq1State(E.genSq1()).valid);
});

test('Megaminx: formato WCA y movimientos de orden 5', () => {
  assert.deepEqual(E.genMega().split('\n').map(l => l.split(' ').length), [11, 11, 11, 11, 11, 11, 11]);
  const id = E.megaState('').join();
  for (const m of ['R++', 'D++', 'U', 'F', 'BL']) assert.equal(E.megaState(Array(5).fill(m).join(' ')).join(), id, m);
  assert.equal(E.megaState('R++ R--').join(), id);
});

test('Clock y FMC con formato WCA', () => {
  assert.match(E.genScramble('clock'), /^(UR|DR|DL|UL|U|R|D|L|ALL)\d[+-]( \S+){8} y2( \S+){5}$/);
  const fmc = E.genScramble('3x3fmc');
  assert.ok(fmc.startsWith("R' U' F ") && fmc.endsWith(" R' U' F"));
});
