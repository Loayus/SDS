// Calculs dérivés : volumes, records, progression, répartition musculaire.
import { getData, sessionsDesc } from './store.js';
import { getExercise, MUSCLES, exType } from './exercises.js';
import { e1rm, startOfWeek, startOfDay, addDays, DAY } from './utils.js';

/** Séries « de travail » (hors échauffement). */
export const workSets = (entry) => entry.sets.filter((s) => !s.warmup);

/** Exercice de musculation (charge × reps), par opposition à durée / cardio. */
export const isStrength = (entry) => exType(entry.exerciseId) === 'weight';

/** Durée (s) et distance (km) cumulées d'un exercice de durée / cardio. */
export function entryDuration(entry) {
  let duration = 0,
    distance = 0,
    maxDuration = 0;
  for (const s of entry.sets) {
    duration += s.duration || 0;
    distance += s.distance || 0;
    maxDuration = Math.max(maxDuration, s.duration || 0);
  }
  return { duration, distance: Math.round(distance * 100) / 100, maxDuration };
}

/** Cardio d'une séance : { duration (s), distance (km) }. */
export function sessionCardio(session) {
  let duration = 0,
    distance = 0;
  for (const e of session.exercises)
    if (exType(e.exerciseId) === 'cardio') {
      const d = entryDuration(e);
      duration += d.duration;
      distance += d.distance;
    }
  return { duration, distance: Math.round(distance * 100) / 100 };
}

export function setVolume(s) {
  let v = (s.weight || 0) * (s.reps || 0);
  for (const d of s.drops || []) v += (d.weight || 0) * (d.reps || 0);
  return v;
}

export function entryVolume(entry) {
  return workSets(entry).reduce((a, s) => a + setVolume(s), 0);
}

export function sessionVolume(session) {
  return session.exercises.reduce((a, e) => a + entryVolume(e), 0);
}

export function sessionSetCount(session) {
  return session.exercises.reduce((a, e) => a + (isStrength(e) ? workSets(e).length : 0), 0);
}

export function sessionReps(session) {
  let n = 0;
  for (const e of session.exercises)
    for (const s of workSets(e)) {
      n += s.reps || 0;
      for (const d of s.drops || []) n += d.reps || 0;
    }
  return n;
}

/** Estimation des calories (MET ≈ 5 pour la musculation). */
export function sessionCalories(session, bodyWeight = getData().profile.bodyWeight || 75) {
  return Math.round(5 * bodyWeight * ((session.duration || 0) / 3600));
}

/** Indicateurs d'un exercice dans une séance. */
export function entryMetrics(entry) {
  let maxWeight = 0;
  let maxWeightReps = 0;
  let best1rm = 0;
  let maxReps = 0;
  let bestSetVol = 0;
  for (const s of workSets(entry)) {
    const parts = [{ weight: s.weight, reps: s.reps }, ...(s.drops || [])];
    for (const p of parts) {
      if (p.weight > maxWeight || (p.weight === maxWeight && p.reps > maxWeightReps)) {
        maxWeight = p.weight;
        maxWeightReps = p.reps;
      }
      best1rm = Math.max(best1rm, e1rm(p.weight, p.reps));
      maxReps = Math.max(maxReps, p.reps || 0);
    }
    bestSetVol = Math.max(bestSetVol, (s.weight || 0) * (s.reps || 0));
  }
  const d = entryDuration(entry);
  return {
    maxWeight,
    maxWeightReps,
    best1rm,
    maxReps,
    volume: entryVolume(entry),
    bestSetVol,
    sets: workSets(entry).length,
    duration: d.duration,
    distance: d.distance,
    maxDuration: d.maxDuration,
  };
}

/** Historique d'un exercice : [{ session, entry, m }] du plus ancien au plus récent. */
export function exerciseHistory(exerciseId) {
  const out = [];
  const list = sessionsDesc();
  for (let i = list.length - 1; i >= 0; i--) {
    const s = list[i];
    for (const entry of s.exercises) {
      if (entry.exerciseId === exerciseId) out.push({ session: s, entry, m: entryMetrics(entry) });
    }
  }
  return out;
}

/** Dernière performance d'un exercice avant une date (pour « Précédent »). */
export function lastEntry(exerciseId, beforeTs = Infinity, excludeId = null) {
  for (const s of sessionsDesc()) {
    if (s.startedAt >= beforeTs || s.id === excludeId) continue;
    const e = s.exercises.find((x) => x.exerciseId === exerciseId);
    if (e) return { session: s, entry: e };
  }
  return null;
}

/** Records d'un exercice à partir d'un historique. */
export function recordsFrom(history) {
  const r = { maxWeight: null, best1rm: null, maxReps: null, maxVolume: null, maxDuration: null, maxDistance: null, totalDuration: 0, totalDistance: 0 };
  for (const h of history) {
    const { m, session } = h;
    r.totalDuration += m.duration || 0;
    r.totalDistance += m.distance || 0;
    if (m.duration > 0 && (!r.maxDuration || m.duration > r.maxDuration.value)) r.maxDuration = { value: m.duration, session };
    if (m.distance > 0 && (!r.maxDistance || m.distance > r.maxDistance.value)) r.maxDistance = { value: m.distance, session };
    if (m.maxWeight > 0 && (!r.maxWeight || m.maxWeight > r.maxWeight.value || (m.maxWeight === r.maxWeight.value && m.maxWeightReps > r.maxWeight.reps)))
      r.maxWeight = { value: m.maxWeight, reps: m.maxWeightReps, session };
    if (m.best1rm > 0 && (!r.best1rm || m.best1rm > r.best1rm.value)) r.best1rm = { value: m.best1rm, session };
    if (m.maxReps > 0 && (!r.maxReps || m.maxReps > r.maxReps.value)) r.maxReps = { value: m.maxReps, session };
    if (m.volume > 0 && (!r.maxVolume || m.volume > r.maxVolume.value)) r.maxVolume = { value: m.volume, session };
  }
  return r;
}

/**
 * Records battus par une séance (comparée aux séances antérieures).
 * Renvoie { [exerciseId]: ['weight' | '1rm' | 'reps' | 'volume'] }
 */
export function sessionPRs(session) {
  const out = {};
  for (const entry of session.exercises) {
    const before = exerciseHistory(entry.exerciseId).filter((h) => h.session.startedAt < session.startedAt && h.session.id !== session.id);
    if (!before.length) continue; // première fois : pas de « record »
    const prev = recordsFrom(before);
    const m = entryMetrics(entry);
    const kinds = [];
    if (!isStrength(entry)) {
      if (m.distance > 0 && prev.maxDistance && m.distance > prev.maxDistance.value) kinds.push('distance');
      if (m.duration > 0 && prev.maxDuration && m.duration > prev.maxDuration.value) kinds.push('duration');
      if (kinds.length) out[entry.exerciseId] = kinds;
      continue;
    }
    if (m.maxWeight > 0 && (!prev.maxWeight || m.maxWeight > prev.maxWeight.value)) kinds.push('weight');
    if (m.best1rm > 0 && (!prev.best1rm || m.best1rm > prev.best1rm.value + 0.01)) kinds.push('1rm');
    if (m.maxWeight === 0 && m.maxReps > 0 && (!prev.maxReps || m.maxReps > prev.maxReps.value)) kinds.push('reps');
    if (m.volume > 0 && prev.maxVolume && m.volume > prev.maxVolume.value) kinds.push('volume');
    if (kinds.length) out[entry.exerciseId] = kinds;
  }
  return out;
}

/** Exercices pratiqués au moins une fois, avec résumé. */
export function practicedExercises() {
  const map = new Map();
  const list = sessionsDesc();
  for (let i = list.length - 1; i >= 0; i--) {
    const s = list[i];
    for (const e of s.exercises) {
      let x = map.get(e.exerciseId);
      if (!x) {
        x = { exerciseId: e.exerciseId, count: 0, first: null, last: null, history: [] };
        map.set(e.exerciseId, x);
      }
      const m = entryMetrics(e);
      x.count++;
      x.first = x.first || { session: s, m };
      x.last = { session: s, m, entry: e };
      x.history.push({ session: s, entry: e, m });
    }
  }
  return [...map.values()].map((x) => ({ ...x, ex: getExercise(x.exerciseId), records: recordsFrom(x.history) }));
}

/** Sessions dans [from, to). */
export function sessionsBetween(from, to) {
  return getData().sessions.filter((s) => s.startedAt >= from && s.startedAt < to);
}

export function summarize(list) {
  let volume = 0,
    duration = 0,
    sets = 0,
    calories = 0,
    cardioDuration = 0,
    cardioDistance = 0;
  for (const s of list) {
    volume += sessionVolume(s);
    duration += s.duration || 0;
    sets += sessionSetCount(s);
    calories += sessionCalories(s);
    const c = sessionCardio(s);
    cardioDuration += c.duration;
    cardioDistance += c.distance;
  }
  return { count: list.length, volume, duration, sets, calories, cardioDuration, cardioDistance: Math.round(cardioDistance * 100) / 100 };
}

/** Nombre de séances par semaine sur n semaines (la dernière = semaine courante). */
export function weeklyCounts(n = 8, now = Date.now()) {
  const cur = startOfWeek(now);
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const from = addDays(cur, -7 * i);
    const to = addDays(from, 7);
    out.push({ from, count: sessionsBetween(from, to).length });
  }
  return out;
}

/** Semaines consécutives (jusqu'à la semaine courante ou précédente) avec ≥ 1 séance. */
export function weekStreak(now = Date.now()) {
  let wk = startOfWeek(now);
  let streak = 0;
  if (!sessionsBetween(wk, addDays(wk, 7)).length) wk = addDays(wk, -7); // la semaine en cours peut être vide
  while (sessionsBetween(wk, addDays(wk, 7)).length) {
    streak++;
    wk = addDays(wk, -7);
  }
  return streak;
}

/**
 * Répartition musculaire : nombre de séries par muscle
 * (1 pour le muscle principal, 0,5 pour les secondaires).
 */
export function muscleSets(list) {
  const out = Object.fromEntries(Object.keys(MUSCLES).filter((k) => !MUSCLES[k].noBody).map((k) => [k, 0]));
  for (const s of list)
    for (const e of s.exercises) {
      const ex = getExercise(e.exerciseId);
      if (ex.type === 'cardio' || MUSCLES[ex.muscle]?.noBody) continue;
      const n = workSets(e).length;
      out[ex.muscle] = (out[ex.muscle] || 0) + n;
      for (const m of ex.secondary || []) out[m] = (out[m] || 0) + n * 0.5;
    }
  return out;
}

/** Normalise en niveaux 0..1 pour la carte du corps. */
export function toLevels(counts) {
  const max = Math.max(0, ...Object.values(counts));
  if (!max) return {};
  const out = {};
  for (const [k, v] of Object.entries(counts)) if (v > 0) out[k] = 0.25 + 0.75 * (v / max);
  return out;
}

/** Muscles d'une liste d'exercices (pour aperçu programme/séance). */
export function musclesOfExercises(ids) {
  const counts = {};
  for (const id of ids) {
    const ex = getExercise(id);
    if (MUSCLES[ex.muscle]?.noBody) continue;
    counts[ex.muscle] = (counts[ex.muscle] || 0) + 1;
    for (const m of ex.secondary || []) counts[m] = (counts[m] || 0) + 0.35;
  }
  return counts;
}

/** Principaux muscles (noms) d'une liste d'exercices. */
export function mainMuscleNames(ids, max = 3) {
  const counts = {};
  for (const id of ids) {
    const m = getExercise(id).muscle;
    counts[m] = (counts[m] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([m]) => MUSCLES[m]?.name || m);
}

/** Séries temporelles de volume pour les statistiques. */
export function volumeSeries(range, now = Date.now()) {
  const pts = [];
  if (range === '12m') {
    const d = new Date(now);
    for (let i = 11; i >= 0; i--) {
      const from = new Date(d.getFullYear(), d.getMonth() - i, 1).getTime();
      const to = new Date(d.getFullYear(), d.getMonth() - i + 1, 1).getTime();
      pts.push({ x: from, y: summarize(sessionsBetween(from, to)).volume });
    }
  } else {
    const days = range === '30d' ? 30 : 7;
    const today = startOfDay(now);
    for (let i = days - 1; i >= 0; i--) {
      const from = addDays(today, -i);
      pts.push({ x: from, y: summarize(sessionsBetween(from, addDays(from, 1))).volume });
    }
  }
  return pts;
}

/** Bornes de la période courante et précédente. */
export function periodBounds(range, now = Date.now()) {
  const end = addDays(startOfDay(now), 1);
  let start;
  if (range === '12m') {
    const d = new Date(now);
    start = new Date(d.getFullYear(), d.getMonth() - 11, 1).getTime();
    const prevStart = new Date(d.getFullYear(), d.getMonth() - 23, 1).getTime();
    return { start, end, prevStart, prevEnd: start };
  }
  const days = range === '30d' ? 30 : 7;
  start = end - days * DAY;
  start = startOfDay(start + DAY / 2); // robustesse changement d'heure
  return { start, end, prevStart: addDays(start, -days), prevEnd: start };
}

/** Niveau « gamifié » : 1 niveau toutes les 5 séances. */
export function levelInfo(nbSessions) {
  const level = 1 + Math.floor(nbSessions / 5);
  return { level, progress: (nbSessions % 5) / 5, toNext: 5 - (nbSessions % 5) };
}
