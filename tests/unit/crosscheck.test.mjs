// Contraste con cubing.js (la librería de scrambles de la WCA): mismas posiciones y mezclas válidas.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { puzzles } from 'cubing/puzzles';
import { randomScrambleForEvent } from 'cubing/scramble';
const require = createRequire(import.meta.url);
const E = require('../helpers/load.js').load();

test('Megaminx: los 12 centros acaban donde dice cubing.js', async () => {
  const kp = await puzzles.megaminx.kpuzzle();
  const names = ['U', 'R', 'F', 'L', 'BL', 'BR', 'C', 'A', 'I', 'E', 'BF', 'D'];
  const P = E.megaPuzzle();
  const col = { U: '#ffffff', F: '#1b7a3a', R: '#e53935', BR: '#1e4fd8', BL: '#ffd600', L: '#7b3fa0', D: '#9e9e9e', BF: '#9be35a', I: '#ff8f00', A: '#4fd1e0', C: '#fff1c1', E: '#f48fb1' };
  const byCol = Object.fromEntries(Object.entries(col).map(([k, v]) => [v, k]));
  const center = {};
  P.st.forEach((s, i) => { if (center[s.f] === undefined) center[s.f] = i; });
  const algs = ['R++', 'D++', 'R-- D++', 'R++ D-- R++ D++ U'];
  for (let i = 0; i < 3; i++) algs.push((await randomScrambleForEvent('minx')).toString());
  for (const alg of algs) {
    const exp = kp.defaultPattern().applyAlg(alg).patternData.CENTERS.pieces;
    const mine = E.megaState(alg);
    names.forEach((f, pos) => assert.equal(byCol[mine[center[f]]], names[exp[pos]], `${alg}: cara ${f}`));
  }
});

test('Square-1: las mezclas oficiales son válidas en el simulador', async () => {
  for (let i = 0; i < 20; i++) {
    const s = (await randomScrambleForEvent('sq1')).toString();
    assert.ok(E.sq1State(s).valid, s);
  }
});

test('Clock: el simulador entiende las mezclas oficiales', async () => {
  const s = (await randomScrambleForEvent('clock')).toString();
  const c = E.simClock(s);
  assert.equal(c.front.length, 9);
  assert.ok(c.front.some(v => v !== 0) || c.back.some(v => v !== 0));
});
