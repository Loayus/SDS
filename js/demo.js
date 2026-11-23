// Données de démonstration (8 semaines de Push / Pull / Legs avec progression).
import { getData, commit } from './store.js';
import { uid, DAY, startOfDay } from './utils.js';

const PLAN = {
  Push: [
    ['developpe-couche', 70, 4, 8],
    ['developpe-incline-halteres', 26, 4, 10],
    ['ecarte-poulie-milieu', 15, 3, 12],
    ['elevations-laterales', 10, 3, 14],
    ['extension-triceps-corde', 25, 3, 12],
    ['routine-abdos', 'time', 600],
  ],
  Pull: [
    ['tractions', 0, 4, 8],
    ['tirage-horizontal-serre', 60, 4, 10],
    ['tirage-vertical-large', 55, 3, 12],
    ['face-pull', 20, 3, 15],
    ['curl-neutre-halteres', 14, 3, 10],
  ],
  Legs: [
    ['squat', 90, 4, 6],
    ['presse-cuisses', 160, 3, 12],
    ['leg-curl', 40, 3, 12],
    ['hip-thrust', 80, 3, 12],
    ['tapis-de-course', 'cardio', 900, 2.2],
  ],
};

const round = (w, step = 2.5) => Math.round(w / step) * step;

export function addDemoData() {
  const data = getData();
  const today = startOfDay(Date.now());
  const order = ['Push', 'Pull', 'Legs'];
  const offsets = [1, 3, 5]; // lundi/mercredi/vendredi environ
  let k = 0;
  for (let w = 8; w >= 0; w--) {
    for (const off of offsets) {
      const day = today - w * 7 * DAY - (6 - off) * DAY;
      if (day > today) continue;
      if (Math.random() < 0.12) continue; // quelques séances manquées
      const name = order[k++ % 3];
      const prog = (8 - w) / 8; // 0 → 1
      const start = day + (17 + Math.floor(Math.random() * 3)) * 3600000 + Math.floor(Math.random() * 50) * 60000;
      const exercises = PLAN[name].map(([exerciseId, base, nSets, reps], idx) => {
        if (base === 'time') return { exerciseId, sets: [{ duration: nSets + Math.round(prog * 4) * 30 }] };
        if (base === 'cardio') return { exerciseId, sets: [{ duration: nSets + Math.round(prog * 5) * 60, distance: Math.round((reps + prog * 0.8) * 100) / 100 }] };
        const top = base ? round(base * (1 + 0.12 * prog)) : 0;
        const sets = [];
        for (let i = 0; i < nSets; i++) {
          const r = Math.max(4, reps - (i >= 2 ? 1 : 0) - (Math.random() < 0.25 ? 1 : 0) + (base ? 0 : Math.round(prog * 3)));
          const set = { weight: top, reps: r };
          if (idx === 0 && i === nSets - 1 && base) {
            set.drops = [
              { weight: round(top * 0.8), reps: Math.max(3, r - 3) },
              { weight: round(top * 0.6), reps: Math.max(2, r - 4) },
            ];
          }
          sets.push(set);
        }
        if (idx === 0 && base) sets.unshift({ weight: round(top * 0.5), reps: 10, warmup: true });
        return { exerciseId, sets };
      });
      const duration = (55 + Math.floor(Math.random() * 30)) * 60;
      data.sessions.push({ id: uid(), name, programId: name.toLowerCase(), startedAt: start, endedAt: start + duration * 1000, duration, exercises, demo: true });
    }
  }
  commit();
}

export function removeDemoData() {
  const data = getData();
  data.sessions = data.sessions.filter((s) => !s.demo);
  commit();
}

export function hasDemoData() {
  return getData().sessions.some((s) => s.demo);
}
