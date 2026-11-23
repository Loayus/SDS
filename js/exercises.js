// Bibliothèque d'exercices, groupes musculaires et programmes par défaut.

export const MUSCLES = {
  chest: { name: 'Pectoraux', side: 'front' },
  shoulders: { name: 'Épaules', side: 'front' },
  biceps: { name: 'Biceps', side: 'front' },
  triceps: { name: 'Triceps', side: 'back' },
  forearms: { name: 'Avant-bras', side: 'front' },
  abs: { name: 'Abdominaux', side: 'front' },
  obliques: { name: 'Obliques', side: 'front' },
  back: { name: 'Dos', side: 'back' },
  traps: { name: 'Trapèzes', side: 'back' },
  lowerback: { name: 'Lombaires', side: 'back' },
  quads: { name: 'Quadriceps', side: 'front' },
  hamstrings: { name: 'Ischio-jambiers', side: 'back' },
  glutes: { name: 'Fessiers', side: 'back' },
  calves: { name: 'Mollets', side: 'back' },
  adductors: { name: 'Adducteurs', side: 'front' },
  cardio: { name: 'Cardio', side: 'front', noBody: true },
};

/** Catégories utilisées pour filtrer la liste d'exercices. */
export const CATEGORIES = [
  { id: 'cardio', name: 'Cardio', muscles: ['cardio'] },
  { id: 'legs', name: 'Jambes', muscles: ['quads', 'hamstrings', 'glutes', 'calves', 'adductors'] },
  { id: 'back', name: 'Dos', muscles: ['back', 'lowerback'] },
  { id: 'chest', name: 'Pectoraux', muscles: ['chest'] },
  { id: 'shoulders', name: 'Épaules', muscles: ['shoulders', 'traps'] },
  { id: 'arms', name: 'Bras', muscles: ['biceps', 'triceps', 'forearms'] },
  { id: 'abs', name: 'Abdos', muscles: ['abs', 'obliques'] },
];

export const EQUIPMENT = {
  barre: 'Barre',
  halteres: 'Haltères',
  machine: 'Machine',
  poulie: 'Poulie',
  pdc: 'Poids du corps',
  smith: 'Smith',
  autre: 'Autre',
};

/**
 * Types d'exercice :
 *  - weight : charge (kg) × répétitions, dégressifs et échauffements possibles
 *  - time   : durée uniquement (min / s)
 *  - cardio : durée (min) + distance (km, facultative)
 */
export const TYPES = {
  weight: { name: 'Charge × reps' },
  time: { name: 'Durée' },
  cardio: { name: 'Cardio' },
};

// [id, nom, muscle principal, muscles secondaires, matériel, type]
const RAW = [
  // Cardio
  ['tapis-de-course', 'Tapis de running', 'cardio', [], 'machine', 'cardio'],
  ['velo', 'Vélo', 'cardio', [], 'machine', 'cardio'],
  ['rameur', 'Rameur', 'cardio', [], 'machine', 'cardio'],
  ['marche', 'Marche (machine de marche)', 'cardio', [], 'machine', 'cardio'],
  // Jambes
  ['adducteurs', 'Machine à adducteurs', 'adductors', [], 'machine'],
  ['abducteurs', 'Machine à abducteurs', 'glutes', [], 'machine'],
  ['hip-thrust', 'Machine à hip thrust', 'glutes', ['hamstrings'], 'machine'],
  ['leg-extension', 'Leg extension', 'quads', [], 'machine'],
  ['leg-curl', 'Leg curl', 'hamstrings', [], 'machine'],
  ['presse-cuisses', 'Leg press', 'quads', ['glutes', 'hamstrings'], 'machine'],
  ['hack-squat', 'Hack squat', 'quads', ['glutes'], 'machine'],
  ['squat', 'Squat', 'quads', ['glutes', 'hamstrings', 'lowerback'], 'barre'],
  ['fentes-bulgares', 'Fente bulgare', 'quads', ['glutes'], 'halteres'],
  // Dos
  ['tirage-vertical-large', 'Tirage vertical (prise large)', 'back', ['biceps'], null],
  ['tirage-vertical-serre', 'Tirage vertical (prise serrée)', 'back', ['biceps'], null],
  ['tirage-vertical', 'Tirage vertical (poulie)', 'back', ['biceps'], 'poulie'],
  ['tirage-horizontal-large', 'Tirage horizontal (prise large)', 'back', ['shoulders', 'traps', 'biceps'], null],
  ['tirage-horizontal-serre', 'Tirage horizontal (prise serrée)', 'back', ['biceps', 'traps'], null],
  ['tirage-bucheron', 'Tirage bûcheron', 'back', ['biceps'], 'halteres'],
  ['rowing-t', 'Tirage barre T', 'back', ['biceps', 'traps'], 'barre'],
  ['extensions-lombaires', 'Extension lombaire', 'lowerback', ['glutes', 'hamstrings'], null],
  ['tractions', 'Traction', 'back', ['biceps'], 'pdc'],
  // Pectoraux
  ['developpe-couche', 'Développé couché (barre)', 'chest', ['triceps', 'shoulders'], 'barre'],
  ['developpe-couche-halteres', 'Développé couché (haltère)', 'chest', ['triceps', 'shoulders'], 'halteres'],
  ['developpe-decline', 'Développé décliné (barre)', 'chest', ['triceps'], 'barre'],
  ['developpe-incline', 'Développé incliné (barre)', 'chest', ['shoulders', 'triceps'], 'barre'],
  ['developpe-incline-halteres', 'Développé incliné (haltère)', 'chest', ['shoulders', 'triceps'], 'halteres'],
  ['developpe-incline-smith', 'Développé incliné (à la Smith)', 'chest', ['shoulders', 'triceps'], 'smith'],
  ['presse-pectoraux', 'Presse à pectoraux assise', 'chest', ['triceps', 'shoulders'], 'machine'],
  ['pec-deck', 'Pec fly', 'chest', [], 'machine'],
  ['ecarte-poulie-basse', 'Écarté (poulie basse)', 'chest', ['shoulders'], 'poulie'],
  ['ecarte-poulie-milieu', 'Écarté (poulie milieu)', 'chest', [], 'poulie'],
  ['ecarte-poulie-haute', 'Écarté (poulie haute)', 'chest', [], 'poulie'],
  // Épaules
  ['developpe-epaules-halteres', 'Développé militaire (haltère)', 'shoulders', ['triceps'], 'halteres'],
  ['developpe-militaire-smith', 'Développé militaire (à la Smith)', 'shoulders', ['triceps'], 'smith'],
  ['developpe-epaules-machine', 'Développé militaire (machine)', 'shoulders', ['triceps'], 'machine'],
  ['elevations-laterales', 'Élévations latérales (haltère)', 'shoulders', [], 'halteres'],
  ['elevations-laterales-poulie', 'Élévations latérales (poulie)', 'shoulders', [], 'poulie'],
  ['elevations-frontales', 'Élévations frontales (haltère)', 'shoulders', [], 'halteres'],
  ['elevations-frontales-poulie', 'Élévations frontales (poulie)', 'shoulders', [], 'poulie'],
  ['rear-delt', 'Rear delt', 'shoulders', ['traps', 'back'], null],
  ['face-pull', 'Face pull', 'shoulders', ['traps', 'back'], 'poulie'],
  ['shrugs', 'Shrugs', 'traps', ['forearms'], null],
  // Biceps
  ['curl-marteau', 'Curl marteau (haltère)', 'biceps', ['forearms'], 'halteres'],
  ['curl-marteau-machine', 'Curl marteau (machine)', 'biceps', ['forearms'], 'machine'],
  ['curl-marteau-poulie', 'Curl marteau (poulie)', 'biceps', ['forearms'], 'poulie'],
  ['curl-neutre-halteres', 'Curl prise neutre (haltère)', 'biceps', ['forearms'], 'halteres'],
  ['curl-neutre-machine', 'Curl prise neutre (machine)', 'biceps', ['forearms'], 'machine'],
  ['curl-neutre-poulie', 'Curl prise neutre (poulie)', 'biceps', ['forearms'], 'poulie'],
  ['curl-neutre-barre', 'Curl prise neutre (barre)', 'biceps', ['forearms'], 'barre'],
  // Triceps
  ['extension-triceps-corde', 'Extension triceps corde (poulie haute)', 'triceps', [], 'poulie'],
  ['extension-triceps-poulie', 'Extension triceps triangle (poulie haute)', 'triceps', [], 'poulie'],
  ['extension-triceps-corde-basse', 'Extension triceps corde (poulie basse)', 'triceps', [], 'poulie'],
  ['extension-nuque-haltere', 'Extension triceps (haltère)', 'triceps', [], 'halteres'],
  ['barre-au-front', 'Barre au front', 'triceps', [], 'barre'],
  ['dips', 'Dips', 'triceps', ['chest', 'shoulders'], 'pdc'],
  // Abdos
  ['crunch-poulie', 'Abdos poulie', 'abs', [], 'poulie'],
  ['routine-abdos', 'Routine abdos', 'abs', ['obliques'], null, 'time'],
];

/**
 * Anciens exercices (version 1) : plus proposés, mais gardés pour afficher
 * correctement d'anciennes séances. [id, nom, muscle]
 */
const LEGACY = [
  ['developpe-couche-smith', 'Développé couché barre guidée', 'chest'],
  ['ecarte-halteres', 'Écarté couché haltères', 'chest'],
  ['pompes', 'Pompes', 'chest'],
  ['pull-over', 'Pull-over haltère', 'chest'],
  ['rowing-barre', 'Rowing barre', 'back'],
  ['rowing-machine', 'Rowing machine', 'back'],
  ['pull-over-poulie', 'Pull-over poulie haute', 'back'],
  ['souleve-de-terre', 'Soulevé de terre', 'lowerback'],
  ['developpe-militaire', 'Développé militaire (barre)', 'shoulders'],
  ['developpe-arnold', 'Développé Arnold', 'shoulders'],
  ['rowing-menton', 'Rowing menton', 'shoulders'],
  ['curl-incline', 'Curl incliné haltères', 'biceps'],
  ['curl-pupitre', 'Curl pupitre', 'biceps'],
  ['curl-concentre', 'Curl concentré', 'biceps'],
  ['developpe-couche-serre', 'Développé couché prise serrée', 'triceps'],
  ['kickback-triceps', 'Kickback haltère', 'triceps'],
  ['curl-poignets', 'Curl poignets', 'forearms'],
  ['curl-inverse', 'Curl inversé', 'forearms'],
  ['marche-fermier', 'Marche du fermier', 'forearms'],
  ['front-squat', 'Front squat', 'quads'],
  ['squat-smith', 'Squat barre guidée', 'quads'],
  ['goblet-squat', 'Goblet squat', 'quads'],
  ['fentes', 'Fentes haltères', 'quads'],
  ['step-up', 'Step-up', 'quads'],
  ['souleve-de-terre-roumain', 'Soulevé de terre roumain', 'hamstrings'],
  ['souleve-jambes-tendues', 'Soulevé de terre jambes tendues', 'hamstrings'],
  ['good-morning', 'Good morning', 'hamstrings'],
  ['pont-fessier', 'Pont fessier', 'glutes'],
  ['kickback-fessier', 'Kickback fessier poulie', 'glutes'],
  ['mollets-debout', 'Mollets debout', 'calves'],
  ['mollets-assis', 'Mollets assis', 'calves'],
  ['mollets-presse', 'Mollets à la presse', 'calves'],
  ['crunch', 'Crunch', 'abs'],
  ['crunch-machine', 'Crunch machine', 'abs'],
  ['releve-jambes', 'Relevé de jambes suspendu', 'abs'],
  ['releve-genoux', 'Relevé de genoux', 'abs'],
  ['roue-abdominale', 'Roue abdominale', 'abs'],
  ['gainage', 'Gainage (secondes)', 'abs'],
  ['russian-twist', 'Russian twist', 'obliques'],
];

/** Anciens identifiants regroupés sur un exercice de la nouvelle liste. */
export const ID_MAP = {
  'leg-curl-allonge': 'leg-curl',
  'leg-curl-assis': 'leg-curl',
  'tractions-supination': 'tractions',
  'rowing-haltere': 'tirage-bucheron',
  'tirage-horizontal': 'tirage-horizontal-serre',
  'ecarte-poulie': 'ecarte-poulie-milieu',
  'pec-deck-inverse': 'rear-delt',
  oiseau: 'rear-delt',
  'shrugs-halteres': 'shrugs',
  'shrugs-barre': 'shrugs',
  'curl-barre': 'curl-neutre-barre',
  'curl-ez': 'curl-neutre-barre',
  'curl-halteres': 'curl-neutre-halteres',
  'curl-poulie': 'curl-neutre-poulie',
  'extension-poulie-nuque': 'extension-triceps-corde-basse',
  'dips-pectoraux': 'dips',
};

export const BUILTIN_EXERCISES = RAW.map(([id, name, muscle, secondary, equipment, type]) => ({
  id,
  name,
  muscle,
  secondary,
  equipment,
  type: type || 'weight',
}));

const BUILTIN_MAP = Object.fromEntries(BUILTIN_EXERCISES.map((e) => [e.id, e]));
const LEGACY_MAP = Object.fromEntries(
  LEGACY.map(([id, name, muscle]) => [id, { id, name, muscle, secondary: [], equipment: null, type: 'weight', legacy: true }])
);

export const isLegacyId = (id) => !!LEGACY_MAP[id] || !!ID_MAP[id];

let customMap = {};

/** Appelé par le store pour enregistrer les exercices personnalisés. */
export function setCustomExercises(list) {
  customMap = Object.fromEntries((list || []).map((e) => [e.id, { type: 'weight', ...e }]));
}

export function getExercise(id) {
  const mapped = ID_MAP[id];
  return (
    customMap[id] ||
    BUILTIN_MAP[id] ||
    (mapped && BUILTIN_MAP[mapped]) ||
    LEGACY_MAP[id] || { id, name: 'Exercice supprimé', muscle: 'chest', secondary: [], equipment: null, type: 'weight', missing: true }
  );
}

/** Type d'un exercice : 'weight' | 'time' | 'cardio'. */
export const exType = (id) => getExercise(id).type || 'weight';

/** Exercices proposés (liste officielle + exercices perso). */
export function allExercises() {
  return [...BUILTIN_EXERCISES, ...Object.values(customMap)];
}

export function muscleName(id) {
  return MUSCLES[id]?.name || id;
}

/** Sous-titre d'un exercice : « Dos · Poulie », « Cardio », « Abdominaux · Durée »… */
export function exSubtitle(ex) {
  const parts = [MUSCLES[ex.muscle]?.name];
  if (ex.type === 'time') parts.push('Durée');
  else if (ex.type !== 'cardio' && ex.equipment && EQUIPMENT[ex.equipment]) parts.push(EQUIPMENT[ex.equipment]);
  if (ex.custom) parts.push('Perso');
  return parts.filter(Boolean).join(' · ');
}

/** Ligne descriptive d'un exercice de programme : « 4 × 8-10 reps », « 20 min »… */
export function programLine(pe) {
  const type = getExercise(pe.exerciseId).type || 'weight';
  const sets = pe.sets || (type === 'weight' ? 3 : 1);
  if (type === 'weight') return `${sets} × ${pe.reps || '—'} reps`;
  return `${sets > 1 ? sets + ' × ' : ''}${pe.reps || 'Durée libre'}`;
}

/** Programmes proposés au premier lancement (modifiables). */
export const DEFAULT_PROGRAMS = [
  {
    id: 'push',
    name: 'Push',
    exercises: [
      { exerciseId: 'developpe-couche', sets: 4, reps: '8-10' },
      { exerciseId: 'developpe-incline-halteres', sets: 4, reps: '8-10' },
      { exerciseId: 'ecarte-poulie-milieu', sets: 3, reps: '12-15' },
      { exerciseId: 'developpe-epaules-halteres', sets: 3, reps: '8-10' },
      { exerciseId: 'elevations-laterales', sets: 3, reps: '12-15' },
      { exerciseId: 'extension-triceps-corde', sets: 3, reps: '10-12' },
    ],
  },
  {
    id: 'pull',
    name: 'Pull',
    exercises: [
      { exerciseId: 'tractions', sets: 4, reps: '6-10' },
      { exerciseId: 'tirage-horizontal-serre', sets: 4, reps: '8-10' },
      { exerciseId: 'tirage-vertical-large', sets: 3, reps: '10-12' },
      { exerciseId: 'face-pull', sets: 3, reps: '12-15' },
      { exerciseId: 'curl-neutre-halteres', sets: 3, reps: '8-10' },
      { exerciseId: 'curl-marteau', sets: 3, reps: '10-12' },
    ],
  },
  {
    id: 'legs',
    name: 'Legs',
    exercises: [
      { exerciseId: 'squat', sets: 4, reps: '6-8' },
      { exerciseId: 'presse-cuisses', sets: 3, reps: '10-12' },
      { exerciseId: 'leg-curl', sets: 3, reps: '10-12' },
      { exerciseId: 'leg-extension', sets: 3, reps: '12-15' },
      { exerciseId: 'hip-thrust', sets: 3, reps: '10-12' },
      { exerciseId: 'fentes-bulgares', sets: 3, reps: '8-10' },
    ],
  },
  {
    id: 'full-body',
    name: 'Full body',
    exercises: [
      { exerciseId: 'squat', sets: 3, reps: '8' },
      { exerciseId: 'developpe-couche', sets: 3, reps: '8' },
      { exerciseId: 'tirage-horizontal-serre', sets: 3, reps: '8' },
      { exerciseId: 'developpe-epaules-halteres', sets: 3, reps: '8' },
      { exerciseId: 'crunch-poulie', sets: 3, reps: '15' },
    ],
  },
];

/** Programmes par défaut de la version 1 (pour les remplacer s'ils n'ont pas été modifiés). */
export const V1_DEFAULT_PROGRAMS = {
  push: 'Push|developpe-couche:4:8-10|developpe-incline-halteres:4:8-10|ecarte-poulie:3:12-15|developpe-epaules-halteres:3:8-10|elevations-laterales:3:12-15|extension-triceps-corde:3:10-12',
  pull: 'Pull|tractions:4:6-10|rowing-barre:4:8-10|tirage-horizontal:3:10-12|face-pull:3:12-15|curl-ez:3:8-10|curl-marteau:3:10-12',
  legs: 'Legs|squat:4:6-8|presse-cuisses:3:10-12|souleve-de-terre-roumain:3:8-10|leg-curl-allonge:3:10-12|leg-extension:3:12-15|mollets-debout:4:12-15',
  'full-body': 'Full body|squat:3:8|developpe-couche:3:8|rowing-barre:3:8|developpe-militaire:3:8|crunch:3:15',
};

export const programSignature = (p) => [p.name, ...p.exercises.map((e) => `${e.exerciseId}:${e.sets}:${e.reps}`)].join('|');
