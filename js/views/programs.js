// Programmes (modèles de séance) : liste et éditeur.
import { html, useState } from '../lib.js';
import { getData, getProgram, upsertProgram, deleteProgram } from '../store.js';
import { Icon, nav, back, TopBar, confirmDialog, toast, Empty } from '../ui.js';
import { pickExercises } from '../picker.js';
import { getExercise } from '../exercises.js';
import { MuscleThumb } from '../body.js';
import { mainMuscleNames } from '../stats.js';
import { uid } from '../utils.js';

export function Programs() {
  const programs = getData().programs;
  return html`<div class="page programs">
    <${TopBar}
      title="Mes programmes"
      onBack=${() => back('/profile')}
      right=${html`<button class="icon-btn" aria-label="Nouveau programme" onClick=${() => nav('/program/new')}><${Icon} name="plus" size=${22} /></button>`}
    />
    ${!programs.length && html`<${Empty} icon="layers" title="Aucun programme" text="Crée un programme pour démarrer tes séances en un geste." />`}
    <div class="stack">
      ${programs.map(
        (p) => html`<button class="card program-row" onClick=${() => nav('/program/' + p.id)}>
          <span class="program-row-text">
            <b>${p.name}</b>
            <small>${p.exercises.length} exercice${p.exercises.length > 1 ? 's' : ''} · ${mainMuscleNames(p.exercises.map((e) => e.exerciseId)).join(' • ') || '—'}</small>
          </span>
          <${Icon} name="chevron-right" size=${18} class="muted" />
        </button>`
      )}
    </div>
    <button class="btn btn-dashed btn-block" onClick=${() => nav('/program/new')}><${Icon} name="plus" size=${18} /> Nouveau programme</button>
  </div>`;
}

export function ProgramEditor({ id }) {
  const existing = id !== 'new' ? getProgram(id) : null;
  const [draft, setDraft] = useState(() =>
    existing ? JSON.parse(JSON.stringify(existing)) : { id: uid(), name: '', exercises: [] }
  );
  if (id !== 'new' && !existing) {
    return html`<div class="page"><${TopBar} title="Programme introuvable" onBack=${() => back('/programs')} /></div>`;
  }
  const upd = (fn) => {
    const d = JSON.parse(JSON.stringify(draft));
    fn(d);
    setDraft(d);
  };

  const add = async () => {
    const ids = await pickExercises({ multi: true });
    if (ids && ids.length) upd((d) => ids.forEach((exerciseId) => d.exercises.push({ exerciseId, sets: 3, reps: '8-12' })));
  };

  const save = () => {
    if (!draft.name.trim()) {
      toast('Donne un nom au programme', { icon: 'info' });
      return;
    }
    upsertProgram({ ...draft, name: draft.name.trim() });
    toast(existing ? 'Programme enregistré' : 'Programme créé');
    back('/new');
  };

  const remove = async () => {
    const ok = await confirmDialog({ title: `Supprimer « ${existing.name} » ?`, message: 'Tes séances passées ne sont pas affectées.', confirmLabel: 'Supprimer', danger: true });
    if (ok) {
      deleteProgram(existing.id);
      toast('Programme supprimé', { icon: 'trash-2' });
      back('/new');
    }
  };

  return html`<div class="page program-editor">
    <${TopBar}
      title=${existing ? 'Programme' : 'Nouveau programme'}
      onBack=${() => back('/new')}
      backIcon="x"
      right=${html`<button class="text-btn strong" onClick=${save}>Enregistrer</button>`}
    />
    <label class="form-label" for="pg-name">Nom</label>
    <input id="pg-name" class="field" type="text" placeholder="Ex. : Push, Dos/Biceps…" value=${draft.name} onInput=${(e) => (draft.name = e.target.value)} onBlur=${(e) => upd((d) => (d.name = e.target.value))} />

    <div class="section-title"><h2>Exercices</h2><span class="muted small">${draft.exercises.length}</span></div>
    <div class="stack">
      ${draft.exercises.map((pe, i) => {
        const ex = getExercise(pe.exerciseId);
        return html`<div class="card pg-ex" key=${pe.exerciseId + i}>
          <div class="pg-ex-head">
            <${MuscleThumb} muscle=${ex.muscle} secondary=${ex.secondary} size=${42} />
            <b>${ex.name}</b>
            <div class="pg-ex-move">
              <button class="icon-btn small" aria-label="Monter" disabled=${i === 0} onClick=${() => upd((d) => ([d.exercises[i - 1], d.exercises[i]] = [d.exercises[i], d.exercises[i - 1]]))}><${Icon} name="arrow-up" size=${18} /></button>
              <button class="icon-btn small" aria-label="Descendre" disabled=${i === draft.exercises.length - 1} onClick=${() => upd((d) => ([d.exercises[i + 1], d.exercises[i]] = [d.exercises[i], d.exercises[i + 1]]))}><${Icon} name="arrow-down" size=${18} /></button>
              <button class="icon-btn small danger" aria-label="Retirer" onClick=${() => upd((d) => d.exercises.splice(i, 1))}><${Icon} name="trash-2" size=${18} /></button>
            </div>
          </div>
          <div class="pg-ex-fields">
            <div class="pg-field">
              <small>Séries</small>
              <div class="stepper">
                <button aria-label="Moins de séries" onClick=${() => upd((d) => (d.exercises[i].sets = Math.max(1, (d.exercises[i].sets || 3) - 1)))}><${Icon} name="minus" size=${16} /></button>
                <span>${pe.sets || 3}</span>
                <button aria-label="Plus de séries" onClick=${() => upd((d) => (d.exercises[i].sets = Math.min(20, (d.exercises[i].sets || 3) + 1)))}><${Icon} name="plus" size=${16} /></button>
              </div>
            </div>
            <div class="pg-field">
              <small>Répétitions</small>
              <input class="field small" type="text" inputmode="text" placeholder="8-12" value=${pe.reps || ''} onInput=${(e) => (pe.reps = e.target.value)} onBlur=${(e) => upd((d) => (d.exercises[i].reps = e.target.value))} />
            </div>
          </div>
        </div>`;
      })}
    </div>
    <button class="btn btn-dashed btn-block" onClick=${add}><${Icon} name="plus" size=${18} /> Ajouter des exercices</button>
    <button class="btn btn-light btn-block" onClick=${save}>Enregistrer</button>
    ${existing && html`<button class="link-btn danger center" onClick=${remove}>Supprimer le programme</button>`}
  </div>`;
}
