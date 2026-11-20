// Profil : niveau, objectif, accès progression / records / programmes / réglages.
import { html, useState } from '../lib.js';
import { getData, commit } from '../store.js';
import { Icon, nav, navRoot, ListRow, promptDialog, openOverlay, Stepper, Segmented } from '../ui.js';
import { ProgressBar } from '../charts.js';
import { LogoMark } from '../logo.js';
import { getExercise } from '../exercises.js';
import { pickExercises } from '../picker.js';
import { summarize, sessionsBetween, levelInfo, exerciseHistory, recordsFrom } from '../stats.js';
import { startOfWeek, addDays, fmtDuration, fmtVolumeShort, fmtWeight, parseNum, numToInput } from '../utils.js';

/** Calcule l'état de l'objectif. */
export function goalStatus(profile) {
  const g = profile.goal || { type: 'weekly', weekly: 3 };
  if (g.type === 'exercise' && g.exerciseId && g.target) {
    const r = recordsFrom(exerciseHistory(g.exerciseId));
    const best = r.maxWeight?.value || 0;
    return {
      title: `${getExercise(g.exerciseId).name} : ${fmtWeight(g.target)} kg`,
      sub: best ? `Record actuel : ${fmtWeight(best)} kg` : 'Pas encore réalisé',
      progress: Math.min(1, best / g.target),
    };
  }
  const wk = startOfWeek(Date.now());
  const n = sessionsBetween(wk, addDays(wk, 7)).length;
  const target = g.weekly || 3;
  return {
    title: `${target} séance${target > 1 ? 's' : ''} par semaine`,
    sub: `${n}/${target} cette semaine${n >= target ? ' — objectif atteint ✅' : ''}`,
    progress: Math.min(1, n / target),
  };
}

export function Profile() {
  const data = getData();
  const p = data.profile;
  const total = summarize(data.sessions);
  const lvl = levelInfo(total.count);
  const goal = goalStatus(p);

  const rename = async () => {
    const v = await promptDialog({ title: 'Ton prénom ou pseudo', value: p.name, placeholder: 'Athlète' });
    if (v != null && v.trim()) {
      p.name = v.trim();
      commit();
    }
  };

  return html`<div class="page profile">
    <header class="page-head center">
      <h1>Profil</h1>
      <button class="icon-btn abs-right" aria-label="Paramètres" onClick=${() => nav('/settings')}><${Icon} name="settings" size=${22} /></button>
    </header>

    <div class="profile-hero">
      <button class="profile-avatar" onClick=${rename} aria-label="Modifier le nom">
        <${LogoMark} size=${52} />
        <span class="profile-avatar-edit"><${Icon} name="pencil" size=${13} /></span>
      </button>
      <div class="profile-name">${p.name || 'Athlète'}</div>
      <div class="muted small">niveau ${lvl.level} · encore ${lvl.toNext} séance${lvl.toNext > 1 ? 's' : ''} avant le niveau ${lvl.level + 1}</div>
      <div class="profile-level"><${ProgressBar} value=${lvl.progress} height=${4} /></div>
    </div>

    <div class="tiles-3">
      <div class="card stat-tile"><div class="stat-value">${total.count}</div><div class="stat-label">Séances</div></div>
      <div class="card stat-tile"><div class="stat-value">${fmtVolumeShort(total.volume)}</div><div class="stat-label">Volume total</div></div>
      <div class="card stat-tile"><div class="stat-value">${fmtDuration(total.duration)}</div><div class="stat-label">Temps total</div></div>
    </div>

    <button class="card goal-card" onClick=${() => openOverlay(GoalSheet, {})}>
      <span class="goal-icon"><${Icon} name="target" size=${30} stroke=${1.6} /></span>
      <span class="goal-text">
        <small>Mon objectif</small>
        <b>${goal.title}</b>
        <span class="goal-progress">
          <${ProgressBar} value=${goal.progress} height=${6} />
          <em>${Math.round(goal.progress * 100)} %</em>
        </span>
        <small>${goal.sub}</small>
      </span>
      <${Icon} name="chevron-right" size=${18} class="muted" />
    </button>

    <div class="card list-card">
      <${ListRow} icon="trending-up" label="Progression par exercice" sub="Charges, 1RM estimé, volume" onClick=${() => nav('/progress')} />
      <${ListRow} icon="trophy" label="Mes records" onClick=${() => nav('/records')} />
      <${ListRow} icon="layers" label="Mes programmes" onClick=${() => nav('/programs')} />
      <${ListRow} icon="history" label="Mon historique" onClick=${() => navRoot('/history')} />
    </div>
    <div class="card list-card">
      <${ListRow} icon="settings" label="Paramètres" onClick=${() => nav('/settings')} />
      <${ListRow} icon="circle-help" label="Aide & installation" onClick=${() => nav('/help')} />
    </div>
  </div>`;
}

function GoalSheet({ close }) {
  const p = getData().profile;
  const g = p.goal || {};
  const [type, setType] = useState(g.type === 'exercise' ? 'exercise' : 'weekly');
  const [weekly, setWeekly] = useState(g.weekly || 3);
  const [exId, setExId] = useState(g.exerciseId || null);
  const [target, setTarget] = useState(g.target ? numToInput(g.target) : '');

  const save = () => {
    const t = parseNum(target);
    if (type === 'exercise' && (!exId || !t)) return;
    p.goal = { type, weekly, exerciseId: exId, target: t };
    commit();
    close(true);
  };
  const choose = async () => {
    const ids = await pickExercises({ multi: false, title: 'Exercice de l’objectif' });
    if (ids && ids[0]) setExId(ids[0]);
  };

  return html`<div class="sheet tall" role="dialog" aria-label="Mon objectif">
    <div class="sheet-grabber"></div>
    <div class="sheet-head"><div class="sheet-title">Mon objectif</div></div>
    <${Segmented}
      value=${type}
      onChange=${setType}
      options=${[
        { value: 'weekly', label: 'Régularité' },
        { value: 'exercise', label: 'Charge cible' },
      ]}
    />
    ${type === 'weekly'
      ? html`<div class="card row-between">
          <span>${weekly} séance${weekly > 1 ? 's' : ''} / semaine</span>
          <${Stepper} value=${weekly} min=${1} max=${7} onChange=${setWeekly} label="Séances par semaine" />
        </div>`
      : html`<div>
          <label class="form-label">Exercice</label>
          <button class="field field-btn" onClick=${choose}>
            ${exId ? getExercise(exId).name : 'Choisir un exercice'}
            <${Icon} name="chevron-right" size=${18} class="muted" />
          </button>
          <label class="form-label" for="goal-target">Charge à atteindre</label>
          <div class="field-wrap">
            <input id="goal-target" class="field" type="text" inputmode="decimal" placeholder="100" value=${target} onInput=${(e) => setTarget(e.target.value)} />
            <span class="field-suffix">kg</span>
          </div>
        </div>`}
    <div class="sheet-buttons">
      <button class="btn btn-light" disabled=${type === 'exercise' && (!exId || !parseNum(target))} onClick=${save}>Enregistrer</button>
      <button class="btn btn-ghost" onClick=${() => close(false)}>Annuler</button>
    </div>
  </div>`;
}
