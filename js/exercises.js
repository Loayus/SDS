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
};

/** Catégories utilisées pour filtrer la liste d'exercices. */
export const CATEGORIES = [
  { id: 'chest', name: 'Pectoraux', muscles: ['chest'] },
  { id: 'back', name: 'Dos', muscles: ['back', 'lowerback', 'traps'] },
  { id: 'shoulders', name: 'Épaules', muscles: ['shoulders'] },
  { id: 'arms', name: 'Bras', muscles: ['biceps', 'triceps', 'forearms'] },
  { id: 'legs', name: 'Jambes', muscles: ['quads', 'hamstrings', 'glutes', 'calves', 'adductors'] },
  { id: 'abs', name: 'Abdos', muscles: ['abs', 'obliques'] },
];

export const EQUIPMENT = {
  barre: 'Barre',
  halteres: 'Haltères',
  machine: 'Machine',
  poulie: 'Poulie',
  pdc: 'Poids du corps',
  smith: 'Barre guidée',
  ez: 'Barre EZ',
  kettlebell: 'Kettlebell',
  autre: 'Autre',
};

// [id, nom, muscle principal, muscles secondaires, matériel]
const RAW = [
  // Pectoraux
  ['developpe-couche', 'Développé couché', 'chest', ['triceps', 'shoulders'], 'barre'],
  ['developpe-couche-halteres', 'Développé couché haltères', 'chest', ['triceps', 'shoulders'], 'halteres'],
  ['developpe-incline', 'Développé incliné', 'chest', ['shoulders', 'triceps'], 'barre'],
  ['developpe-incline-halteres', 'Développé incliné haltères', 'chest', ['shoulders', 'triceps'], 'halteres'],
  ['developpe-decline', 'Développé décliné', 'chest', ['triceps'], 'barre'],
  ['developpe-couche-smith', 'Développé couché barre guidée', 'chest', ['triceps', 'shoulders'], 'smith'],
  ['developpe-incline-smith', 'Développé incliné barre guidée', 'chest', ['shoulders', 'triceps'], 'smith'],
  ['presse-pectoraux', 'Presse pectoraux', 'chest', ['triceps', 'shoulders'], 'machine'],
  ['ecarte-halteres', 'Écarté couché haltères', 'chest', [], 'halteres'],
  ['ecarte-poulie', 'Écarté poulie', 'chest', [], 'poulie'],
  ['ecarte-poulie-basse', 'Écarté poulie basse', 'chest', ['shoulders'], 'poulie'],
  ['pec-deck', 'Pec deck (butterfly)', 'chest', [], 'machine'],
  ['pompes', 'Pompes', 'chest', ['triceps', 'shoulders'], 'pdc'],
  ['dips-pectoraux', 'Dips pectoraux', 'chest', ['triceps', 'shoulders'], 'pdc'],
  ['pull-over', 'Pull-over haltère', 'chest', ['back'], 'halteres'],
  // Dos
  ['tractions', 'Tractions', 'back', ['biceps'], 'pdc'],
  ['tractions-supination', 'Tractions supination', 'back', ['biceps'], 'pdc'],
  ['tirage-vertical', 'Tirage vertical', 'back', ['biceps'], 'poulie'],
  ['tirage-vertical-serre', 'Tirage vertical prise serrée', 'back', ['biceps'], 'poulie'],
  ['tirage-horizontal', 'Tirage horizontal', 'back', ['biceps', 'traps'], 'poulie'],
  ['rowing-barre', 'Rowing barre', 'back', ['biceps', 'traps', 'lowerback'], 'barre'],
  ['rowing-haltere', 'Rowing haltère un bras', 'back', ['biceps'], 'halteres'],
  ['rowing-t', 'Rowing T-bar', 'back', ['biceps', 'traps'], 'barre'],
  ['rowing-machine', 'Rowing machine', 'back', ['biceps', 'traps'], 'machine'],
  ['pull-over-poulie', 'Pull-over poulie haute', 'back', [], 'poulie'],
  ['souleve-de-terre', 'Soulevé de terre', 'lowerback', ['glutes', 'hamstrings', 'back', 'traps'], 'barre'],
  ['extensions-lombaires', 'Extensions lombaires', 'lowerback', ['glutes', 'hamstrings'], 'pdc'],
  ['shrugs-halteres', 'Shrugs haltères', 'traps', ['forearms'], 'halteres'],
  ['shrugs-barre', 'Shrugs barre', 'traps', ['forearms'], 'barre'],
  // Épaules
  ['developpe-militaire', 'Développé militaire', 'shoulders', ['triceps'], 'barre'],
  ['developpe-epaules-halteres', 'Développé épaules haltères', 'shoulders', ['triceps'], 'halteres'],
  ['developpe-arnold', 'Développé Arnold', 'shoulders', ['triceps'], 'halteres'],
  ['developpe-epaules-machine', 'Développé épaules machine', 'shoulders', ['triceps'], 'machine'],
  ['elevations-laterales', 'Élévations latérales', 'shoulders', [], 'halteres'],
  ['elevations-laterales-poulie', 'Élévations latérales poulie', 'shoulders', [], 'poulie'],
  ['elevations-frontales', 'Élévations frontales', 'shoulders', [], 'halteres'],
  ['oiseau', 'Oiseau (deltoïdes postérieurs)', 'shoulders', ['traps', 'back'], 'halteres'],
  ['pec-deck-inverse', 'Pec deck inversé', 'shoulders', ['traps', 'back'], 'machine'],
  ['face-pull', 'Face pull', 'shoulders', ['traps', 'back'], 'poulie'],
  ['rowing-menton', 'Rowing menton', 'shoulders', ['traps'], 'barre'],
  // Biceps
  ['curl-barre', 'Curl barre', 'biceps', ['forearms'], 'barre'],
  ['curl-ez', 'Curl barre EZ', 'biceps', ['forearms'], 'ez'],
  ['curl-halteres', 'Curl haltères', 'biceps', ['forearms'], 'halteres'],
  ['curl-marteau', 'Curl marteau', 'biceps', ['forearms'], 'halteres'],
  ['curl-incline', 'Curl incliné haltères', 'biceps', [], 'halteres'],
  ['curl-pupitre', 'Curl pupitre', 'biceps', [], 'ez'],
  ['curl-poulie', 'Curl poulie', 'biceps', ['forearms'], 'poulie'],
  ['curl-concentre', 'Curl concentré', 'biceps', [], 'halteres'],
  // Triceps
  ['extension-triceps-poulie', 'Extension triceps poulie', 'triceps', [], 'poulie'],
  ['extension-triceps-corde', 'Extension triceps corde', 'triceps', [], 'poulie'],
  ['extension-poulie-nuque', 'Extension poulie au-dessus de la tête', 'triceps', [], 'poulie'],
  ['barre-au-front', 'Barre au front', 'triceps', [], 'ez'],
  ['extension-nuque-haltere', 'Extension nuque haltère', 'triceps', [], 'halteres'],
  ['dips', 'Dips', 'triceps', ['chest', 'shoulders'], 'pdc'],
  ['developpe-couche-serre', 'Développé couché prise serrée', 'triceps', ['chest'], 'barre'],
  ['kickback-triceps', 'Kickback haltère', 'triceps', [], 'halteres'],
  // Avant-bras
  ['curl-poignets', 'Curl poignets', 'forearms', [], 'barre'],
  ['curl-inverse', 'Curl inversé', 'forearms', ['biceps'], 'ez'],
  ['marche-fermier', 'Marche du fermier', 'forearms', ['traps'], 'halteres'],
  // Jambes
  ['squat', 'Squat', 'quads', ['glutes', 'hamstrings', 'lowerback'], 'barre'],
  ['front-squat', 'Front squat', 'quads', ['glutes', 'abs'], 'barre'],
  ['squat-smith', 'Squat barre guidée', 'quads', ['glutes'], 'smith'],
  ['goblet-squat', 'Goblet squat', 'quads', ['glutes'], 'halteres'],
  ['presse-cuisses', 'Presse à cuisses', 'quads', ['glutes', 'hamstrings'], 'machine'],
  ['hack-squat', 'Hack squat', 'quads', ['glutes'], 'machine'],
  ['fentes', 'Fentes haltères', 'quads', ['glutes', 'hamstrings'], 'halteres'],
  ['fentes-bulgares', 'Fentes bulgares', 'quads', ['glutes'], 'halteres'],
  ['step-up', 'Step-up', 'quads', ['glutes'], 'halteres'],
  ['leg-extension', 'Leg extension', 'quads', [], 'machine'],
  ['leg-curl-allonge', 'Leg curl allongé', 'hamstrings', ['calves'], 'machine'],
  ['leg-curl-assis', 'Leg curl assis', 'hamstrings', [], 'machine'],
  ['souleve-de-terre-roumain', 'Soulevé de terre roumain', 'hamstrings', ['glutes', 'lowerback'], 'barre'],
  ['souleve-jambes-tendues', 'Soulevé de terre jambes tendues', 'hamstrings', ['glutes', 'lowerback'], 'barre'],
  ['good-morning', 'Good morning', 'hamstrings', ['lowerback', 'glutes'], 'barre'],
  ['hip-thrust', 'Hip thrust', 'glutes', ['hamstrings'], 'barre'],
  ['pont-fessier', 'Pont fessier', 'glutes', ['hamstrings'], 'pdc'],
  ['kickback-fessier', 'Kickback fessier poulie', 'glutes', ['hamstrings'], 'poulie'],
  ['abducteurs', 'Abducteurs machine', 'glutes', [], 'machine'],
  ['adducteurs', 'Adducteurs machine', 'adductors', [], 'machine'],
  ['mollets-debout', 'Mollets debout', 'calves', [], 'machine'],
  ['mollets-assis', 'Mollets assis', 'calves', [], 'machine'],
  ['mollets-presse', 'Mollets à la presse', 'calves', [], 'machine'],
  // Abdos
  ['crunch', 'Crunch', 'abs', [], 'pdc'],
  ['crunch-poulie', 'Crunch à la poulie', 'abs', [], 'poulie'],
  ['crunch-machine', 'Crunch machine', 'abs', [], 'machine'],
  ['releve-jambes', 'Relevé de jambes suspendu', 'abs', ['obliques'], 'pdc'],
  ['releve-genoux', 'Relevé de genoux', 'abs', [], 'pdc'],
  ['roue-abdominale', 'Roue abdominale', 'abs', ['lowerback'], 'autre'],
  ['gainage', 'Gainage (secondes)', 'abs', ['obliques', 'lowerback'], 'pdc'],
  ['russian-twist', 'Russian twist', 'obliques', ['abs'], 'pdc'],
];

export const BUILTIN_EXERCISES = RAW.map(([id, name, muscle, secondary, equipment]) => ({
  id,
  name,
  muscle,
  secondary,
  equipment,
}));

const BUILTIN_MAP = Object.fromEntries(BUILTIN_EXERCISES.map((e) => [e.id, e]));

let customMap = {};

/** Appelé par le store pour enregistrer les exercices personnalisés. */
export function setCustomExercises(list) {
  customMap = Object.fromEntries((list || []).map((e) => [e.id, e]));
}

export function getExercise(id) {
  return (
    customMap[id] ||
    BUILTIN_MAP[id] || { id, name: 'Exercice supprimé', muscle: 'chest', secondary: [], equipment: 'autre', missing: true }
  );
}

export function allExercises() {
  return [...BUILTIN_EXERCISES, ...Object.values(customMap)];
}

export function muscleName(id) {
  return MUSCLES[id]?.name || id;
}

/** Programmes proposés au premier lancement (modifiables). */
export const DEFAULT_PROGRAMS = [
  {
    id: 'push',
    name: 'Push',
    exercises: [
      { exerciseId: 'developpe-couche', sets: 4, reps: '8-10' },
      { exerciseId: 'developpe-incline-halteres', sets: 4, reps: '8-10' },
      { exerciseId: 'ecarte-poulie', sets: 3, reps: '12-15' },
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
      { exerciseId: 'rowing-barre', sets: 4, reps: '8-10' },
      { exerciseId: 'tirage-horizontal', sets: 3, reps: '10-12' },
      { exerciseId: 'face-pull', sets: 3, reps: '12-15' },
      { exerciseId: 'curl-ez', sets: 3, reps: '8-10' },
      { exerciseId: 'curl-marteau', sets: 3, reps: '10-12' },
    ],
  },
  {
    id: 'legs',
    name: 'Legs',
    exercises: [
      { exerciseId: 'squat', sets: 4, reps: '6-8' },
      { exerciseId: 'presse-cuisses', sets: 3, reps: '10-12' },
      { exerciseId: 'souleve-de-terre-roumain', sets: 3, reps: '8-10' },
      { exerciseId: 'leg-curl-allonge', sets: 3, reps: '10-12' },
      { exerciseId: 'leg-extension', sets: 3, reps: '12-15' },
      { exerciseId: 'mollets-debout', sets: 4, reps: '12-15' },
    ],
  },
  {
    id: 'full-body',
    name: 'Full body',
    exercises: [
      { exerciseId: 'squat', sets: 3, reps: '8' },
      { exerciseId: 'developpe-couche', sets: 3, reps: '8' },
      { exerciseId: 'rowing-barre', sets: 3, reps: '8' },
      { exerciseId: 'developpe-militaire', sets: 3, reps: '8' },
      { exerciseId: 'crunch', sets: 3, reps: '15' },
    ],
  },
];
