// Carga los scripts del navegador que no usan el DOM para probarlos en Node.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const EXPORTS = [
  // puzzles.js
  'WCA', 'genScramble', 'genSq1', 'genMega', 'genClock', 'cubeState', 'pyraState', 'pyraPuzzle',
  'skewbState', 'skewbPuzzle', 'simClock', 'sq1State', 'megaPuzzle', 'megaState',
  // core.js
  'unitsOf', 'COMP_FMT', 'roundResult', 'trimmedIdx', 'cutoffFailed', 'bpaWpa', 'needFor',
  'csScrToCat', 'csEvName', 'parseCsTimer', 'parseCSV', 'parseTwisty', 'detectImport', 'planImport', 'sigOf'
];

function load() {
  const src = ['js/puzzles.js', 'js/core.js']
    .map(f => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^'use strict';$/m, ''))
    .join('\n');
  // Se ejecuta dentro de una función: las constantes de los scripts quedan en su ámbito, sin tocar el global.
  return new Function(`'use strict';\n${src}\nreturn {${EXPORTS.join(',')}};`)();
}

module.exports = { load, ROOT };
