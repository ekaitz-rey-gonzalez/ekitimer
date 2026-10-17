/*!
 * EKITIMER — wca
 * Lectura de datos públicos de la WCA: competiciones, resultados oficiales, mezclas y grupos (sin DOM).
 * Copyright (C) 2026 EKITIMER contributors · GPL-3.0-or-later
 */
'use strict';
const WCA_API = 'https://www.worldcubeassociation.org/api/v0';

// Evento WCA → categoría de EKITIMER (los eventos retirados sin mezclas útiles no aparecen)
const WCA_EVENTS = {
  '333': '3x3', '222': '2x2', '444': '4x4', '555': '5x5', '666': '6x6', '777': '7x7',
  '333bf': '3x3bld', '333fm': '3x3fmc', '333oh': '3x3oh', 'clock': 'clock', 'minx': 'megaminx',
  'pyram': 'pyraminx', 'skewb': 'skewb', 'sq1': 'square1', '444bf': '4x4bld', '555bf': '5x5bld',
  '333mbf': 'mbld', '333ft': '3x3'
};
const WCA_EVENT_ORDER = ['333', '222', '444', '555', '666', '777', '333bf', '333fm', '333oh', 'clock', 'minx',
  'pyram', 'skewb', 'sq1', '444bf', '555bf', '333mbf', '333ft'];
const WCA_EVENT_NAMES = { '333ft': '3×3×3 con los pies' };
const wcaEventName = e => WCA_EVENT_NAMES[e] || (WCA_EVENTS[e] && WCA[WCA_EVENTS[e]] ? WCA[WCA_EVENTS[e]].name : e);

// Tipos de ronda de la WCA: rank ordena las rondas; las «combined» (con corte) comparten nombre
const WCA_ROUNDS = {
  '0': { rank: 0, label: 'Clasificatoria' }, 'h': { rank: 0, label: 'Clasificatoria' },
  '1': { rank: 1, label: 'Primera ronda' }, 'd': { rank: 1, label: 'Primera ronda' },
  '2': { rank: 2, label: 'Segunda ronda' }, 'e': { rank: 2, label: 'Segunda ronda' },
  '3': { rank: 3, label: 'Semifinal' }, 'g': { rank: 3, label: 'Semifinal' },
  'b': { rank: 4, label: 'Final B' },
  'f': { rank: 5, label: 'Final' }, 'c': { rank: 5, label: 'Final' }
};
const wcaRound = t => WCA_ROUNDS[t] || { rank: 9, label: 'Ronda ' + t };

function normWcaId(s) { return String(s || '').trim().toUpperCase(); }
function validWcaId(s) { return /^\d{4}[A-Z]{4}\d{2}$/.test(normWcaId(s)); }

/** Agrupa las mezclas de /competitions/{id}/scrambles por evento → ronda → juego de mezclas (A, B…). */
function buildScrambleTree(list) {
  const events = {};
  for (const x of Array.isArray(list) ? list : []) {
    if (!x || !WCA_EVENTS[x.event_id] || typeof x.scramble !== 'string') continue;
    const ev = events[x.event_id] || (events[x.event_id] = { eventId: x.event_id, cat: WCA_EVENTS[x.event_id], rounds: {} });
    const rk = String(x.round_id != null ? x.round_id : x.round_type_id);
    const rd = ev.rounds[rk] || (ev.rounds[rk] = { roundId: x.round_id, typeId: x.round_type_id, ...wcaRound(x.round_type_id), sets: {} });
    const g = String(x.group_id || 'A');
    const set = rd.sets[g] || (rd.sets[g] = { group: g, scrambles: [], extras: [] });
    (x.is_extra ? set.extras : set.scrambles).push({ num: x.scramble_num, scramble: x.scramble.trim() });
  }
  const out = [];
  for (const e of WCA_EVENT_ORDER) {
    const ev = events[e]; if (!ev) continue;
    const rounds = Object.values(ev.rounds).sort((a, b) => a.rank - b.rank || (a.roundId || 0) - (b.roundId || 0));
    rounds.forEach((r, i) => {
      r.index = i + 1; // número de ronda (1, 2, 3…) como en el WCIF: «333-r2»
      r.sets = Object.values(r.sets).sort((a, b) => a.group.localeCompare(b.group, 'en', { numeric: true }));
      for (const s of r.sets) { s.scrambles.sort((a, b) => a.num - b.num); s.extras.sort((a, b) => a.num - b.num); }
    });
    out.push({ eventId: e, cat: ev.cat, name: wcaEventName(e), rounds });
  }
  return out;
}

/** Resultado oficial en texto. value: centésimas (o movimientos en FMC, o codificado en MBLD). */
function fmtWcaValue(eventId, v, isAverage) {
  if (v == null || v === 0) return '';
  if (v === -1) return 'DNF';
  if (v === -2) return 'DNS';
  if (eventId === '333fm') return isAverage ? (v / 100).toFixed(2) : String(v);
  if (eventId === '333mbf') {
    const m = decodeMbf(v);
    if (!m) return String(v);
    const t = m.seconds == null ? '' : ' ' + (m.seconds >= 3600 ? Math.floor(m.seconds / 3600) + ':' + String(Math.floor(m.seconds / 60) % 60).padStart(2, '0') : Math.floor(m.seconds / 60)) + ':' + String(m.seconds % 60).padStart(2, '0');
    return `${m.solved}/${m.attempted}${t}`;
  }
  const c = v, min = Math.floor(c / 6000), s = (c % 6000) / 100;
  return min > 0 ? `${min}:${s.toFixed(2).padStart(5, '0')}` : s.toFixed(2);
}
// Multi-BLD (formato actual 0DDTTTTTMM): DD = 99 − puntos, TTTTT = segundos, MM = fallados
function decodeMbf(v) {
  if (!(v > 0)) return null;
  const s = String(v).padStart(10, '0');
  if (s[0] !== '0') return null; // formato antiguo, poco frecuente
  const diff = 99 - parseInt(s.slice(1, 3), 10), secs = parseInt(s.slice(3, 8), 10), missed = parseInt(s.slice(8, 10), 10);
  const solved = diff + missed;
  return { solved, attempted: solved + missed, seconds: secs === 99999 ? null : secs, points: diff };
}

/** Resultados del competidor en una competición, indexados por round_id. */
function resultsByRound(results, compId) {
  const map = {};
  for (const r of Array.isArray(results) ? results : []) if (r && r.competition_id === compId) map[r.round_id] = r;
  return map;
}
/** Competiciones con resultados del competidor, de la más reciente a la más antigua. */
function competitionsWithResults(comps, results) {
  const ids = new Set((Array.isArray(results) ? results : []).map(r => r.competition_id));
  return (Array.isArray(comps) ? comps : [])
    .filter(c => c && ids.has(c.id))
    .sort((a, b) => (b.start_date || '').localeCompare(a.start_date || ''));
}

// ---- WCIF público: grupos y reglas de cada ronda ----
function wcifActivities(wcif) {
  const map = {};
  const walk = a => { if (!a) return; map[a.id] = a.activityCode; (a.childActivities || []).forEach(walk); };
  for (const v of (wcif && wcif.schedule && wcif.schedule.venues) || []) for (const room of v.rooms || []) (room.activities || []).forEach(walk);
  return map;
}
/**
 * Grupo en el que compitió una persona en una ronda («333-r1-g2» → 2) y el juego de mezclas probable (B).
 * La WCA no publica qué juego usó cada grupo; normalmente el grupo n usa el n-ésimo juego.
 */
function probableGroup(wcif, wcaId, eventId, roundIndex, setCount) {
  if (!wcif || !Array.isArray(wcif.persons)) return null;
  const p = wcif.persons.find(x => x && x.wcaId === wcaId);
  if (!p || !Array.isArray(p.assignments)) return null;
  const acts = wcifActivities(wcif), prefix = `${eventId}-r${roundIndex}-g`;
  for (const a of p.assignments) {
    if (a.assignmentCode !== 'competitor') continue;
    const code = acts[a.activityId];
    if (code && code.startsWith(prefix)) {
      const n = parseInt(code.slice(prefix.length), 10);
      if (!(n > 0)) continue;
      const letter = setCount && n > setCount ? null : String.fromCharCode(64 + n);
      return { number: n, letter };
    }
  }
  return null;
}
/** Corte y límite de tiempo de una ronda según el WCIF. */
function wcifRoundRules(wcif, eventId, roundIndex) {
  const ev = wcif && Array.isArray(wcif.events) && wcif.events.find(e => e.id === eventId);
  const rd = ev && Array.isArray(ev.rounds) && ev.rounds.find(r => r.id === `${eventId}-r${roundIndex}`);
  if (!rd) return null;
  const out = { format: rd.format || null, cutoff: null, limit: null, cumulative: false };
  if (rd.cutoff && rd.cutoff.numberOfAttempts > 0 && rd.cutoff.attemptResult > 0) out.cutoff = { attempts: rd.cutoff.numberOfAttempts, value: rd.cutoff.attemptResult };
  if (rd.timeLimit && rd.timeLimit.centiseconds > 0) {
    if (Array.isArray(rd.timeLimit.cumulativeRoundIds) && rd.timeLimit.cumulativeRoundIds.length) out.cumulative = true;
    else out.limit = rd.timeLimit.centiseconds;
  }
  return out;
}

/** Objetivo para repetir una ronda: tu media oficial (o tu mejor single en «mejor de 3»). */
function officialTarget(result, type) {
  if (!result) return null;
  const v = type === 'bo' ? result.best : result.average;
  return v > 0 ? v : null;
}
// ==WCA END==
