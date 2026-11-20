// Nouvelle séance : choix d'un programme, d'une séance passée ou séance libre.
import { html, useState } from '../lib.js';
import { getData, getActive, startSession, newEntry, newEntryLike, discardActive, sessionsDesc } from '../store.js';
import { Icon, nav, back, TopBar, Segmented, actionSheet } from '../ui.js';
import { getExercise } from '../exercises.js';
import { MuscleThumb, BodyPair } from '../body.js';
import { musclesOfExercises, toLevels, mainMuscleNames } from '../stats.js';
import { fmtRelDay, fmtDuration } from '../utils.js';
import { SessionThumb } from './common.js';

let lastTab = 'programs';
let lastProgram = null;

/** Vérifie s'il y a déjà une séance en cours avant d'en lancer une autre. */
async function ensureNoActive() {
  if (!getActive()) return true;
  const r = await actionSheet({
    title: 'Une séance est déjà en cours',
    message: 'Tu peux la reprendre ou l’abandonner pour en démarrer une nouvelle.',
    actions: [
      { label: 'Reprendre la séance en cours', icon: 'play', value: 'resume' },
      { label: 'Abandonner et démarrer la nouvelle', icon: 'trash-2', value: 'discard', danger: true },
    ],
  });
  if (r === 'resume') {
    nav('/live', { replace: true });
    return false;
  }
  if (r === 'discard') {
    discardActive();
    return true;
  }
  return false;
}

export async function launch({ name, programId = null, entries = [] }) {
  if (!(await ensureNoActive())) return;
  startSession({ name, programId, entries });
  nav('/live', { replace: true });
}

export function repeatSession(session) {
  return launch({
    name: session.name,
    programId: session.programId || null,
    entries: session.exercises.map((e) => newEntryLike(e.exerciseId, e)),
  });
}

export function NewSession() {
  const data = getData();
  const [tab, setTab] = useState(lastTab);
  const programs = data.programs;
  const [pid, setPid] = useState(() => (lastProgram && (lastProgram === 'free' || programs.some((p) => p.id === lastProgram)) ? lastProgram : programs[0]?.id || 'free'));
  const [excluded, setExcluded] = useState({});

  const program = programs.find((p) => p.id === pid) || null;
  const select = (id) => {
    lastProgram = id;
    setPid(id);
    setExcluded({});
  };
  const changeTab = (t) => {
    lastTab = t;
    setTab(t);
  };

  const exIds = program ? program.exercises.map((e) => e.exerciseId) : [];
  const levels = toLevels(musclesOfExercises(exIds));
  const included = program ? program.exercises.filter((_, i) => !excluded[i]) : [];

  const start = () => {
    if (!program) return launch({ name: 'Séance libre' });
    launch({
      name: program.name,
      programId: program.id,
      entries: included.map((pe) => newEntry(pe.exerciseId, pe.sets || 3, pe.reps || '')),
    });
  };

  const recents = sessionsDesc().slice(0, 20);

  return html`<div class="page new-session">
    <${TopBar}
      title="Nouvelle séance"
      onBack=${() => back('/')}
      right=${html`<button class="icon-btn" aria-label="Paramètres" onClick=${() => nav('/settings')}><${Icon} name="settings" size=${22} /></button>`}
    />

    ${getActive() &&
    html`<button class="card active-banner" onClick=${() => nav('/live', { replace: true })}>
      <span class="pulse-dot"></span>
      <span class="active-banner-text"><small>Séance en cours</small><b>${getActive().name}</b></span>
      <span class="text-btn small">Reprendre</span>
    </button>`}

    <${Segmented}
      value=${tab}
      onChange=${changeTab}
      options=${[
        { value: 'programs', label: 'Programmes' },
        { value: 'recent', label: 'Refaire une séance' },
      ]}
    />

    ${tab === 'programs'
      ? html`
          <div class="chips program-chips">
            <button class=${'chip' + (pid === 'free' ? ' active' : '')} onClick=${() => select('free')}>Séance libre</button>
            ${programs.map((p) => html`<button class=${'chip' + (pid === p.id ? ' active' : '')} onClick=${() => select(p.id)}>${p.name}</button>`)}
            <button class="chip ghost" onClick=${() => nav('/program/new')}><${Icon} name="plus" size=${14} /> Programme</button>
          </div>

          ${program
            ? html`<button class="card hero-card" onClick=${() => nav('/program/' + program.id)}>
                <div class="hero-art"><${BodyPair} levels=${levels} gap="#16161b" height=${150} /></div>
                <div class="hero-text">
                  <div class="hero-name">${program.name}</div>
                  <div class="hero-sub">${mainMuscleNames(exIds).join(' • ') || 'Aucun exercice'}</div>
                </div>
                <span class="hero-edit"><${Icon} name="pencil" size=${16} /></span>
              </button>`
            : html`<div class="card hero-card free">
                <div class="hero-art free-art"><${Icon} name="dumbbell" size=${64} stroke=${1.4} /></div>
                <div class="hero-text">
                  <div class="hero-name">Séance libre</div>
                  <div class="hero-sub">Ajoute tes exercices au fur et à mesure</div>
                </div>
              </div>`}

          <button class="btn btn-gradient btn-block" onClick=${start} disabled=${program && !included.length}>
            <${Icon} name="play" size=${18} fill="currentColor" />
            Démarrer la séance
          </button>

          ${program &&
          html`<div class="section-title">
              <h2>Exercices</h2>
              <span class="muted small">${included.length}/${program.exercises.length} exercices</span>
            </div>
            ${!program.exercises.length &&
            html`<div class="card empty-card">
              <span>Ce programme est vide.</span>
              <button class="text-btn small" onClick=${() => nav('/program/' + program.id)}>Ajouter des exercices</button>
            </div>`}
            <div class="stack">
              ${program.exercises.map((pe, i) => {
                const ex = getExercise(pe.exerciseId);
                const on = !excluded[i];
                return html`<button class=${'card ex-row' + (on ? '' : ' off')} onClick=${() => setExcluded({ ...excluded, [i]: on })}>
                  <${MuscleThumb} muscle=${ex.muscle} secondary=${ex.secondary} size=${50} />
                  <span class="ex-row-text">
                    <span>${ex.name}</span>
                    <small>${pe.sets || 3} × ${pe.reps || '—'} reps</small>
                  </span>
                  <span class=${'check-circle' + (on ? ' on' : '')}>${on && html`<${Icon} name="check" size=${16} stroke=${3} />`}</span>
                </button>`;
              })}
            </div>`}
        `
      : html`<div class="stack">
          ${!recents.length &&
          html`<div class="card empty-card"><${Icon} name="history" size=${22} /><span>Tes séances terminées apparaîtront ici pour les refaire en un geste.</span></div>`}
          ${recents.map(
            (s) => html`<div class="card recent-row">
              <${SessionThumb} session=${s} size=${50} />
              <button class="recent-row-text" onClick=${() => nav('/session/' + s.id)}>
                <span>${s.name}</span>
                <small>${fmtRelDay(s.startedAt)} · ${fmtDuration(s.duration)}</small>
                <small class="dim">${s.exercises.map((e) => getExercise(e.exerciseId).name).slice(0, 3).join(', ')}${s.exercises.length > 3 ? '…' : ''}</small>
              </button>
              <button class="btn btn-small" onClick=${() => repeatSession(s)}><${Icon} name="repeat" size=${16} /> Refaire</button>
            </div>`
          )}
        </div>`}
  </div>`;
}

