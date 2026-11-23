// Données de l'application, persistées dans le localStorage de l'appareil.
import { DEFAULT_PROGRAMS, V1_DEFAULT_PROGRAMS, ID_MAP, programSignature, isLegacyId, setCustomExercises, getExercise, exType } from './exercises.js';
import { uid, parseNum, numToInput } from './utils.js';

const DATA_KEY = 'sds:data';
const ACTIVE_KEY = 'sds:active';
export const SCHEMA_VERSION = 2;

function defaultData() {
  return {
    version: SCHEMA_VERSION,
    profile: {
      name: '',
      onboarded: false,
      bodyWeight: 75,
      restDefault: 90,
      sound: true,
      wakeLock: true,
      goal: { type: 'weekly', weekly: 3, exerciseId: null, target: null },
      createdAt: Date.now(),
    },
    sessions: [],
    programs: JSON.parse(JSON.stringify(DEFAULT_PROGRAMS)),
    customExercises: [],
  };
}

function readJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('Lecture impossible', key, e);
    return null;
  }
}

/** Complète un objet de données (anciennes versions, import partiel). */
function normalize(d) {
  const def = defaultData();
  if (!d || typeof d !== 'object') return def;
  const out = {
    ...def,
    ...d,
    profile: { ...def.profile, ...(d.profile || {}), goal: { ...def.profile.goal, ...((d.profile || {}).goal || {}) } },
    sessions: Array.isArray(d.sessions) ? d.sessions : [],
    programs: Array.isArray(d.programs) ? d.programs : def.programs,
    customExercises: Array.isArray(d.customExercises) ? d.customExercises : [],
  };
  if ((d.version || 1) < 2) migrateV2(out);
  else remapIds(out);
  out.version = SCHEMA_VERSION;
  return out;
}

const remap = (id) => ID_MAP[id] || id;

/** Remplace les anciens identifiants d'exercice regroupés (idempotent). */
function remapIds(d) {
  d.sessions = d.sessions.map((s) => ({ ...s, exercises: (s.exercises || []).map((e) => ({ ...e, exerciseId: remap(e.exerciseId) })) }));
  d.programs = d.programs.map((p) => ({ ...p, exercises: (p.exercises || []).map((e) => ({ ...e, exerciseId: remap(e.exerciseId) })) }));
  if (d.profile.goal && d.profile.goal.exerciseId) d.profile.goal = { ...d.profile.goal, exerciseId: remap(d.profile.goal.exerciseId) };
}

/**
 * Version 1 → 2 : nouvelle liste d'exercices.
 * - séances : anciens exercices regroupés sur leur équivalent (l'historique est conservé) ;
 * - programmes par défaut non modifiés : remplacés par les nouveaux ;
 * - autres programmes : exercices retirés de la liste supprimés du modèle.
 */
function migrateV2(d) {
  const fresh = Object.fromEntries(DEFAULT_PROGRAMS.map((p) => [p.id, p]));
  d.programs = d.programs.map((p) => {
    if (V1_DEFAULT_PROGRAMS[p.id] && V1_DEFAULT_PROGRAMS[p.id] === programSignature(p) && fresh[p.id]) {
      return JSON.parse(JSON.stringify(fresh[p.id]));
    }
    return { ...p, exercises: (p.exercises || []).map((e) => ({ ...e, exerciseId: remap(e.exerciseId) })).filter((e) => !isLegacyId(e.exerciseId)) };
  });
  remapIds(d);
}

/** Séance en cours : anciens identifiants remplacés. */
function remapActive(a) {
  if (!a || !Array.isArray(a.exercises)) return null;
  return { ...a, exercises: a.exercises.map((e) => ({ ...e, exerciseId: remap(e.exerciseId) })) };
}

const storedData = readJSON(DATA_KEY);
let data = normalize(storedData);
let active = remapActive(readJSON(ACTIVE_KEY));
setCustomExercises(data.customExercises);
// persiste immédiatement une migration de schéma
if (storedData && (storedData.version || 1) < SCHEMA_VERSION) {
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(active));
  } catch {}
}

const listeners = new Set();
let saveError = null;

export const getData = () => data;
export const getActive = () => active;
export const getSaveError = () => saveError;

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  listeners.forEach((fn) => fn());
}

function write(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
    saveError = null;
  } catch (e) {
    saveError = e;
    console.error('Sauvegarde impossible', e);
  }
}

/** Enregistre les données principales et rafraîchit l'interface. */
export function commit() {
  setCustomExercises(data.customExercises);
  write(DATA_KEY, data);
  emit();
}

/** Enregistre la séance en cours et rafraîchit l'interface. */
export function commitActive() {
  write(ACTIVE_KEY, active);
  emit();
}

export function replaceData(next) {
  data = normalize(next);
  commit();
}

/** Demande au navigateur de ne pas effacer les données (si supporté). */
export function requestPersistence() {
  try {
    navigator.storage?.persist?.().catch(() => {});
  } catch {}
}

// ---------------------------------------------------------------------------
// Séances

/** Séances triées de la plus récente à la plus ancienne. */
let sortedCache = { src: null, len: -1, out: [] };
export function sessionsDesc() {
  const s = data.sessions;
  if (sortedCache.src !== s || sortedCache.len !== s.length || sortedCache.dirty) {
    sortedCache = { src: s, len: s.length, out: [...s].sort((a, b) => b.startedAt - a.startedAt) };
  }
  return sortedCache.out;
}
function invalidateSorted() {
  sortedCache.dirty = true;
}

export function getSession(id) {
  return data.sessions.find((s) => s.id === id) || null;
}

/** Crée une série éditable (valeurs sous forme de texte). */
export function newSet(partial = {}) {
  return { id: uid(), weight: '', reps: '', min: '', sec: '', km: '', done: false, warmup: false, drops: [], ...partial };
}

export function newDrop(partial = {}) {
  return { id: uid(), weight: '', reps: '', ...partial };
}

export function newEntry(exerciseId, nbSets = exType(exerciseId) === 'weight' ? 3 : 1, target = '') {
  return {
    id: uid(),
    exerciseId,
    target: target || '',
    note: '',
    sets: Array.from({ length: Math.max(1, nbSets) }, () => newSet()),
  };
}

/** Nouvel exercice calqué sur une performance précédente (échauffements et dégressifs inclus). */
export function newEntryLike(exerciseId, prevEntry, target = '') {
  const e = newEntry(exerciseId, prevEntry ? prevEntry.sets.length : undefined, target);
  if (prevEntry)
    e.sets.forEach((s, i) => {
      const p = prevEntry.sets[i];
      s.warmup = !!p?.warmup;
      s.drops = (p?.drops || []).map(() => newDrop());
    });
  return e;
}

/** Démarre une séance (programme, séance précédente ou vide). */
export function startSession({ name = 'Séance libre', programId = null, entries = [] } = {}) {
  active = {
    id: uid(),
    name,
    programId,
    startedAt: Date.now(),
    pausedAt: null,
    pausedTotal: 0,
    exercises: entries,
    note: '',
    rest: null,
  };
  commitActive();
  return active;
}

export function elapsedSec(s, now = Date.now()) {
  if (!s) return 0;
  const end = s.pausedAt || now;
  return Math.max(0, (end - s.startedAt - (s.pausedTotal || 0)) / 1000);
}

export function togglePause() {
  if (!active) return;
  if (active.pausedAt) {
    active.pausedTotal = (active.pausedTotal || 0) + (Date.now() - active.pausedAt);
    active.pausedAt = null;
  } else {
    active.pausedAt = Date.now();
  }
  commitActive();
}

/** Convertit une séance éditable (texte) en séance enregistrée (nombres). */
export function cleanEntries(entries) {
  const out = [];
  for (const e of entries) {
    const sets = [];
    const type = exType(e.exerciseId);
    for (const s of e.sets) {
      if (type === 'time') {
        const duration = Math.round((parseNum(s.min) || 0) * 60 + (parseNum(s.sec) || 0));
        if (duration > 0) sets.push({ duration });
        continue;
      }
      if (type === 'cardio') {
        const duration = Math.round((parseNum(s.min) || 0) * 60);
        const distance = parseNum(s.km);
        if (duration > 0 || (distance && distance > 0)) {
          const set = { duration: Math.max(0, duration) };
          if (distance && distance > 0) set.distance = Math.round(distance * 100) / 100;
          sets.push(set);
        }
        continue;
      }
      const reps = parseNum(s.reps);
      if (!reps || reps <= 0) continue;
      const weight = parseNum(s.weight) || 0;
      const drops = (s.drops || [])
        .map((d) => ({ weight: parseNum(d.weight) || 0, reps: parseNum(d.reps) }))
        .filter((d) => d.reps && d.reps > 0)
        .map((d) => ({ weight: Math.max(0, d.weight), reps: Math.round(d.reps) }));
      const set = { weight: Math.max(0, weight), reps: Math.round(reps) };
      if (s.warmup) set.warmup = true;
      if (drops.length) set.drops = drops;
      sets.push(set);
    }
    if (sets.length) {
      const entry = { exerciseId: e.exerciseId, sets };
      if (e.note && e.note.trim()) entry.note = e.note.trim();
      out.push(entry);
    }
  }
  return out;
}

/** Inverse de cleanEntries : prépare une séance enregistrée pour l'édition. */
export function toEditableEntries(entries) {
  return (entries || []).map((e) => ({
    id: uid(),
    exerciseId: e.exerciseId,
    target: '',
    note: e.note || '',
    sets: e.sets.map((s) =>
      s.duration != null || s.distance != null
        ? newSet({ ...durationFields(s, exType(e.exerciseId)), done: true })
        : newSet({
        weight: numToInput(s.weight),
        reps: numToInput(s.reps),
        done: true,
        warmup: !!s.warmup,
        drops: (s.drops || []).map((d) => newDrop({ weight: numToInput(d.weight), reps: numToInput(d.reps) })),
      })
    ),
  }));
}

/** Série de durée/cardio enregistrée → champs de saisie. */
export function durationFields(s, type) {
  const d = s.duration || 0;
  if (type === 'time') return { min: d >= 60 ? String(Math.floor(d / 60)) : d ? '0' : '', sec: d % 60 ? String(d % 60) : d ? '0' : '' };
  return { min: d ? numToInput(Math.round((d / 60) * 100) / 100) : '', km: numToInput(s.distance) };
}

/** Termine la séance en cours et l'ajoute à l'historique. */
export function finishActive() {
  if (!active) return null;
  const now = Date.now();
  const duration = Math.round(elapsedSec(active, now));
  const session = {
    id: active.id,
    name: (active.name || 'Séance').trim() || 'Séance',
    programId: active.programId || null,
    startedAt: active.startedAt,
    endedAt: now,
    duration,
    exercises: cleanEntries(active.exercises),
  };
  if (active.note && active.note.trim()) session.note = active.note.trim();
  data.sessions.push(session);
  invalidateSorted();
  active = null;
  write(ACTIVE_KEY, null);
  commit();
  return session;
}

export function discardActive() {
  active = null;
  commitActive();
}

/** Ajoute ou remplace une séance de l'historique. */
export function upsertSession(session) {
  const i = data.sessions.findIndex((s) => s.id === session.id);
  if (i >= 0) data.sessions[i] = session;
  else data.sessions.push(session);
  invalidateSorted();
  commit();
}

export function deleteSession(id) {
  data.sessions = data.sessions.filter((s) => s.id !== id);
  invalidateSorted();
  commit();
}

// ---------------------------------------------------------------------------
// Programmes

export function getProgram(id) {
  return data.programs.find((p) => p.id === id) || null;
}

export function upsertProgram(p) {
  const i = data.programs.findIndex((x) => x.id === p.id);
  if (i >= 0) data.programs[i] = p;
  else data.programs.push(p);
  commit();
}

export function deleteProgram(id) {
  data.programs = data.programs.filter((p) => p.id !== id);
  commit();
}

// ---------------------------------------------------------------------------
// Exercices personnalisés

export function addCustomExercise({ name, muscle, equipment, type = 'weight' }) {
  const ex = { id: 'perso-' + uid(), name: name.trim(), muscle, secondary: [], equipment: equipment || 'autre', type, custom: true };
  data.customExercises.push(ex);
  commit();
  return ex;
}

export function updateCustomExercise(ex) {
  const i = data.customExercises.findIndex((x) => x.id === ex.id);
  if (i >= 0) data.customExercises[i] = ex;
  commit();
}

export function deleteCustomExercise(id) {
  data.customExercises = data.customExercises.filter((x) => x.id !== id);
  commit();
}

export function exerciseUsageCount(id) {
  let n = 0;
  for (const s of data.sessions) if (s.exercises.some((e) => e.exerciseId === id)) n++;
  return n;
}

// ---------------------------------------------------------------------------
// Sauvegarde / restauration

export function exportPayload() {
  return {
    app: 'SDS',
    exportedAt: new Date().toISOString(),
    version: SCHEMA_VERSION,
    data,
    active,
  };
}

/** Valide un fichier de sauvegarde. Lève une erreur explicite si invalide. */
export function parseBackup(text) {
  let obj;
  try {
    obj = JSON.parse(text);
  } catch {
    throw new Error("Ce fichier n'est pas un JSON valide.");
  }
  const d = obj && obj.app === 'SDS' ? obj.data : obj;
  if (!d || typeof d !== 'object' || !Array.isArray(d.sessions)) {
    throw new Error("Ce fichier n'est pas une sauvegarde SDS.");
  }
  for (const s of d.sessions) {
    if (!s || typeof s.startedAt !== 'number' || !Array.isArray(s.exercises)) {
      throw new Error('Sauvegarde corrompue : séance invalide.');
    }
  }
  return { data: d, active: obj.active || null };
}

export function importBackup({ data: d, active: a }) {
  data = normalize(d);
  data.profile.onboarded = true;
  active = remapActive(a);
  invalidateSorted();
  write(ACTIVE_KEY, active);
  commit();
}

export function resetAll() {
  data = defaultData();
  active = null;
  invalidateSorted();
  write(ACTIVE_KEY, null);
  commit();
}

// Réexport pratique
export { getExercise };
