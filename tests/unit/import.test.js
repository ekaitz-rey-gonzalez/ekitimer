const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const M = require('../helpers/load').load();
const fixture = f => fs.readFileSync(path.join(__dirname, '..', 'fixtures', f), 'utf8');

test('tipos de scramble de csTimer → categorías', () => {
  const ids = ['333', '222so', '444wca', 'mgmp', 'sqrs', 'r3ni', '333ni', 'pyrso', 'ftoso', '444bld', '333o', 'pyrm', 'input'];
  assert.deepEqual(ids.map(M.csScrToCat),
    ['3x3', '2x2', '4x4', 'megaminx', 'square1', 'mbld', '3x3bld', 'pyraminx', null, '4x4bld', '3x3', 'pyraminx', '3x3']);
  assert.equal(M.csEvName('ftoso'), 'FTO');
});

test('export de csTimer', () => {
  const cs = {
    session1: [[[0, 12345], "R U R' U'", '', 1700000000], [[2000, 11000], 'F2 B2', 'buen solve', 1700000100],
      [[-1, 9000], 'L2', '', 1700000200], [[0, 15000, 8000, 3000], 'D', '', 1700000300]],
    session2: [[[0, 45678], 'R++ D--', '', 1700001000]],
    session3: [[[0, 30000], 'x', '', 1700002000]],
    session4: [[[0, 28000], "R' U' F", '', 1700003000]],
    session5: [[[0, 1800000], '1. R', '3/4', 1700004000], [[-1, 900000], '..', '2/2', 1700005000]],
    session6: [],
    properties: { sessionN: 6, sessionData: JSON.stringify({
      1: { name: 'main', opt: {} }, 2: { name: 'mega', opt: { scrType: 'mgmp' } }, 3: { name: 'fto', opt: { scrType: 'ftoso' } },
      4: { name: 'fmc', opt: { scrType: '333fm' } }, 5: { name: 'multi', opt: { scrType: 'r3ni' } }, 6: { name: 'vacía', opt: {} } }) }
  };
  const r = M.detectImport(JSON.stringify(cs));
  assert.equal(r.source, 'csTimer');
  assert.equal(r.groups.length, 4);
  assert.equal(r.skipped, 1);
  assert.deepEqual([...r.skippedEv], ['FTO']);
  const main = r.groups[0];
  assert.equal(main.name, 'main');
  assert.equal(main.solves[0].time, 12.345);
  assert.equal(main.solves[1].time, 11, '+2 guardado sin sumar');
  assert.equal(main.solves[1].penalty, '+2');
  assert.equal(main.solves[1].comment, 'buen solve');
  assert.equal(main.solves[2].penalty, 'DNF');
  assert.equal(main.solves[3].time, 15, 'multifase: tiempo total');
  assert.equal(main.solves[0].date, new Date(1700000000000).toISOString());
  assert.equal(r.groups.find(g => g.cat === '3x3fmc').solves[0].time, 28);
  const mb = r.groups.find(g => g.cat === 'mbld');
  assert.deepEqual({ ...mb.solves[0].mbld }, { s: 3, a: 4 });
  assert.equal(mb.solves[1].penalty, 'DNF');
});

test('csTimer con sesiones en texto y sessionData como objeto', () => {
  const r = M.detectImport(JSON.stringify({ session1: JSON.stringify([[[0, 1000], 'R', '', 1]]), properties: { sessionData: { 1: { name: 'x' } } } }));
  assert.equal(r.groups.length, 1);
  assert.equal(r.groups[0].name, 'x');
});

test('no duplica al importar dos veces', () => {
  const r = M.detectImport(fixture('cstimer.txt'));
  const plan = M.planImport(r, []);
  assert.equal(plan.add, 4);
  const existing = plan.groups.flatMap(g => g.solves.map(s => ({ ...s })));
  const again = M.planImport(r, existing);
  assert.equal(again.add, 0);
  assert.equal(again.dup, 4);
});

test('Twisty Timer: el +2 viene sumado y se resta', () => {
  const tw = 'Puzzle,Category,Time(millis),Date(millis),Scramble,Penalty,Comment\n' +
    '"333";"Normal";"12340";"1700000000000";"R U R\' U\'";"0";"null"\n' +
    '"333";"Normal";"14000";"1700000001000";"F2";"1";"con +2"\n' +
    '"333";"OH";"25000";"1700000002000";"L";"0";""\n' +
    '"222";"Normal";"3000";"1700000003000";"R U";"2";"null"\n' +
    '"sq1";"Normal";"20000";"1700000004000";"(1,0) / (3,3) /";"0";"a; b"\n' +
    '"fto";"Normal";"20000";"1700000005000";"x";"0";""\n';
  const r = M.detectImport(tw);
  assert.equal(r.source, 'Twisty Timer');
  const g = r.groups.find(x => x.cat === '3x3');
  assert.equal(g.solves.length, 2);
  assert.equal(g.solves[1].time, 12);
  assert.equal(g.solves[1].penalty, '+2');
  assert.equal(g.solves[0].comment, '');
  assert.ok(r.groups.find(x => x.cat === '3x3oh'), 'subcategoría OH');
  assert.equal(r.groups.find(x => x.cat === '2x2').solves[0].penalty, 'DNF');
  assert.equal(r.groups.find(x => x.cat === 'square1').solves[0].comment, 'a; b');
  assert.equal(r.skipped, 1);
});

test('Cubic Timer (cabecera entre comillas y CRLF)', () => {
  const cu = '"Puzzle";"Category";"Time(millis)";"Date(millis)";"Scramble";"Penalty";"Comment"\r\n"333";"Normal";"9990";"1700000000000";"R";"0";""\r\n';
  const r = M.detectImport(cu);
  assert.equal(r.source, 'Cubic Timer');
  assert.equal(r.groups[0].solves[0].time, 9.99);
});

test('copias de EKITIMER y archivos no válidos', () => {
  assert.equal(M.detectImport(JSON.stringify({ app: 'ekitimer', solves: [] })).source, 'EKITIMER');
  assert.ok(M.detectImport(JSON.stringify({ app: 'ekitimer' })).error);
  assert.ok(M.detectImport('hola').error);
  assert.ok(M.detectImport('').error);
  assert.ok(M.detectImport('{"a":1}').error);
  assert.ok(M.detectImport(fixture('twisty.csv')).groups.length >= 2);
});
