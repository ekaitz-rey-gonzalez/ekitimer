const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const M = require('../helpers/load').load();
const fx = f => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'wca', f), 'utf8'));

test('WCA ID: formato y normalización', () => {
  assert.equal(M.validWcaId('2017gonz50'), true);
  assert.equal(M.validWcaId(' 2017GONZ50 '), true);
  assert.equal(M.validWcaId('2017GON50'), false);
  assert.equal(M.validWcaId('20170GONZ5'), false);
  assert.equal(M.normWcaId(' 2017gonz50'), '2017GONZ50');
});

test('eventos y rondas de la WCA', () => {
  assert.equal(M.WCA_EVENTS.minx, 'megaminx');
  assert.equal(M.WCA_EVENTS['333mbf'], 'mbld');
  assert.equal(M.wcaEventName('333'), '3×3×3');
  assert.equal(M.wcaRound('d').label, 'Primera ronda');
  assert.equal(M.wcaRound('f').label, 'Final');
  assert.ok(M.wcaRound('1').rank < M.wcaRound('2').rank && M.wcaRound('2').rank < M.wcaRound('f').rank);
});

test('árbol de mezclas: eventos en orden WCA, rondas ordenadas, grupos y extras', () => {
  const tree = M.buildScrambleTree(fx('scrambles-BilbaoOpen2025.json'));
  assert.deepEqual(tree.map(e => e.eventId), ['333', '222', '444', '333bf', '333fm', 'minx', 'sq1', '333mbf']);
  const e333 = tree[0];
  assert.deepEqual(e333.rounds.map(r => [r.label, r.index, r.sets.map(s => s.group).join('')]),
    [['Primera ronda', 1, 'ABCD'], ['Segunda ronda', 2, 'ABC'], ['Final', 3, 'AB']]);
  const a = e333.rounds[0].sets[0];
  assert.deepEqual(a.scrambles.map(s => s.num), [1, 2, 3, 4, 5]);
  assert.deepEqual(a.extras.map(s => s.num), [1, 2]);
  assert.equal(tree.find(e => e.eventId === '444').rounds[0].typeId, 'd');
  const mbf = tree.find(e => e.eventId === '333mbf').rounds[0].sets[0].scrambles[0].scramble;
  assert.equal(mbf.split('\n').length, 4, 'Multi-BLD: una línea por cubo');
  assert.deepEqual(M.buildScrambleTree([]), []);
  assert.deepEqual(M.buildScrambleTree([{ event_id: 'magic', round_type_id: 'f', scramble: 'x' }]), [], 'eventos retirados fuera');
});

test('las mezclas oficiales se pueden dibujar', () => {
  const tree = M.buildScrambleTree(fx('scrambles-BilbaoOpen2025.json'));
  const s = id => tree.find(e => e.eventId === id).rounds[0].sets[0].scrambles[0].scramble;
  assert.ok(M.sq1State(s('sq1')).valid);
  const mega = M.megaState(s('minx'));
  assert.equal(mega.length, 132);
  const c = {}; M.cubeState(s('444'), 4).forEach(x => (c[x] = (c[x] || 0) + 1));
  assert.ok(Object.values(c).every(v => v === 16));
});

test('resultados oficiales en texto', () => {
  assert.equal(M.fmtWcaValue('333', 1358, true), '13.58');
  assert.equal(M.fmtWcaValue('333', 6543, false), '1:05.43');
  assert.equal(M.fmtWcaValue('333', -1), 'DNF');
  assert.equal(M.fmtWcaValue('333', -2), 'DNS');
  assert.equal(M.fmtWcaValue('333', 0), '');
  assert.equal(M.fmtWcaValue('333fm', 28, false), '28');
  assert.equal(M.fmtWcaValue('333fm', 3067, true), '30.67');
  assert.deepEqual({ ...M.decodeMbf(910124501) }, { solved: 9, attempted: 10, seconds: 1245, points: 8 });
  assert.equal(M.fmtWcaValue('333mbf', 910124501), '9/10 20:45');
});

test('competiciones con resultados, de la más reciente a la más antigua', () => {
  const list = M.competitionsWithResults(fx('competitions.json'), fx('results.json'));
  assert.deepEqual(list.map(c => c.id), ['BilbaoOpen2025', 'ViejaOpen2012'], 'sin la futura en la que no hay resultados');
  const byRound = M.resultsByRound(fx('results.json'), 'BilbaoOpen2025');
  assert.equal(byRound[899452].average, 1358);
  assert.equal(byRound[100001], undefined, 'solo de esa competición');
});

test('grupo probable y reglas de la ronda desde el WCIF', () => {
  const w = fx('wcif-BilbaoOpen2025.json');
  assert.deepEqual({ ...M.probableGroup(w, '2099TEST01', '333', 1, 4) }, { number: 1, letter: 'A' });
  assert.deepEqual({ ...M.probableGroup(w, '2099TEST01', '333', 2, 3) }, { number: 3, letter: 'C' });
  assert.deepEqual({ ...M.probableGroup(w, '2099TEST01', '444', 1, 3) }, { number: 2, letter: 'B' });
  assert.equal(M.probableGroup(w, '2099TEST01', '333', 2, 2).letter, null, 'grupo 3 sin juego C: no se adivina');
  assert.equal(M.probableGroup(w, '2099OTRA01', '333', 1, 4), null, 'sin asignaciones');
  assert.equal(M.probableGroup(w, '2099TEST01', 'sq1', 1, 2), null, 'solo cuenta «competitor», no juez');
  assert.equal(M.probableGroup(null, '2099TEST01', '333', 1, 4), null);
  assert.deepEqual({ ...M.wcifRoundRules(w, '444', 1) }, { format: 'a', cutoff: { attempts: 2, value: 7500 }, limit: 60000, cumulative: false });
  assert.equal(M.wcifRoundRules(w, '333bf', 1).cumulative, true);
  assert.equal(M.wcifRoundRules(w, '333bf', 1).limit, null);
  assert.equal(M.wcifRoundRules(w, 'pyram', 1), null);
});

test('objetivo de una ronda repetida', () => {
  assert.equal(M.officialTarget({ best: 1109, average: 1358 }, 'ao'), 1358);
  assert.equal(M.officialTarget({ best: 5800, average: 0 }, 'bo'), 5800);
  assert.equal(M.officialTarget({ best: -1, average: -1 }, 'ao'), null);
  assert.equal(M.officialTarget(null, 'ao'), null);
});
