// Détail d'une séance enregistrée.
import { html } from '../lib.js';
import { getSession, deleteSession, upsertProgram } from '../store.js';
import { Icon, nav, back, TopBar, actionSheet, confirmDialog, toast } from '../ui.js';
import { getExercise, MUSCLES } from '../exercises.js';
import { BodyPair, MuscleThumb } from '../body.js';
import { sessionVolume, sessionSetCount, sessionCalories, sessionPRs, muscleSets, toLevels, entryVolume, sessionReps, sessionCardio, entryDuration } from '../stats.js';
import { fmtLongDate, fmtTime, fmtDuration, fmtKg, fmtWeight, fmtNum, cap, uid, plural, fmtTimeSet, fmtKm, speedKmh } from '../utils.js';
import { repeatSession } from './newSession.js';

export const PR_LABEL = { weight: 'Charge max', '1rm': '1RM estimé', reps: 'Reps max', volume: 'Volume', duration: 'Durée', distance: 'Distance' };

/** Résumé d'un exercice dans la séance (sous le nom). */
function entryLine(e, type) {
  if (type === 'weight') return `${plural(e.sets.filter((x) => !x.warmup).length, 'série')} · ${fmtKg(entryVolume(e))}`;
  const d = entryDuration(e);
  const parts = [];
  if (d.duration) parts.push(fmtTimeSet(d.duration));
  if (d.distance) parts.push(fmtKm(d.distance));
  const v = speedKmh(d.distance, d.duration);
  if (v) parts.push(`${fmtNum(v, 1)} km/h`);
  return parts.join(' · ') || '—';
}

/** Valeur d'une série selon le type. */
function SetValue({ st, type }) {
  if (type === 'time') return html`<b>${fmtTimeSet(st.duration)}</b>`;
  if (type === 'cardio')
    return html`${st.duration ? html`<b>${fmtTimeSet(st.duration)}</b>` : ''}${st.duration && st.distance ? ' · ' : ''}${st.distance ? html`<b>${fmtKm(st.distance)}</b>` : ''}`;
  return html`${st.weight ? html`<b>${fmtWeight(st.weight)}</b> kg` : html`<b>PDC</b>`} × <b>${st.reps}</b>`;
}

export function SessionDetail({ id, done }) {
  const s = getSession(id);
  if (!s) {
    return html`<div class="page">
      <${TopBar} title="Séance" onBack=${() => back('/history')} />
      <div class="card empty-card"><span>Cette séance n'existe plus.</span></div>
    </div>`;
  }
  const prs = sessionPRs(s);
  const cardio = sessionCardio(s);
  const prCount = Object.keys(prs).length;
  const levels = toLevels(muscleSets([s]));
  const topMuscles = Object.entries(muscleSets([s]))
    .filter(([, v]) => v >= 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([m]) => MUSCLES[m].name);

  const menu = async () => {
    const r = await actionSheet({
      title: s.name,
      actions: [
        { label: 'Modifier la séance', icon: 'pencil', value: 'edit' },
        { label: 'Refaire cette séance', icon: 'repeat', value: 'repeat' },
        { label: 'Créer un programme à partir de la séance', icon: 'bookmark-plus', value: 'program' },
        { label: 'Supprimer la séance', icon: 'trash-2', value: 'delete', danger: true },
      ],
    });
    if (r === 'edit') nav('/session/' + s.id + '/edit');
    if (r === 'repeat') repeatSession(s);
    if (r === 'program') {
      const p = {
        id: uid(),
        name: s.name,
        exercises: s.exercises.map((e) => {
          const reps = e.sets.filter((x) => !x.warmup).map((x) => x.reps);
          const lo = Math.min(...reps),
            hi = Math.max(...reps);
          return { exerciseId: e.exerciseId, sets: e.sets.filter((x) => !x.warmup).length || e.sets.length, reps: reps.length ? (lo === hi ? String(lo) : `${lo}-${hi}`) : '' };
        }),
      };
      upsertProgram(p);
      toast('Programme créé');
      nav('/program/' + p.id);
    }
    if (r === 'delete') {
      const ok = await confirmDialog({ title: 'Supprimer cette séance ?', message: 'Cette action est définitive.', confirmLabel: 'Supprimer', danger: true });
      if (ok) {
        deleteSession(s.id);
        toast('Séance supprimée', { icon: 'trash-2' });
        back('/history');
      }
    }
  };

  return html`<div class="page detail">
    <${TopBar}
      title=${s.name}
      onBack=${() => back('/history')}
      right=${html`<button class="icon-btn" aria-label="Options" onClick=${menu}><${Icon} name="ellipsis" size=${22} /></button>`}
    />

    ${done &&
    html`<div class="card done-banner">
      <div class="done-emoji">🎉</div>
      <div>
        <b>Séance terminée, bravo !</b>
        <small>${prCount ? `${prCount} record${prCount > 1 ? 's' : ''} battu${prCount > 1 ? 's' : ''} 🏆` : 'Elle est enregistrée dans ton historique.'}</small>
      </div>
    </div>`}

    <div class="card detail-summary">
      <div class="detail-date">${cap(fmtLongDate(s.startedAt))}</div>
      <div class="muted small">${fmtTime(s.startedAt)} – ${fmtTime(s.endedAt || s.startedAt + (s.duration || 0) * 1000)}</div>
      ${sessionSetCount(s) > 0 || !(cardio.duration || cardio.distance)
        ? html`<div class="detail-stats">
            <div><b>${fmtDuration(s.duration)}</b><small>Durée</small></div>
            <div><b>${fmtKg(sessionVolume(s))}</b><small>Volume</small></div>
            <div><b>${sessionSetCount(s)}</b><small>Séries</small></div>
            <div><b>${fmtNum(sessionReps(s))}</b><small>Reps</small></div>
          </div>`
        : html`<div class="detail-stats">
            <div><b>${fmtDuration(s.duration)}</b><small>Durée</small></div>
            <div><b>${cardio.duration ? fmtTimeSet(cardio.duration) : '—'}</b><small>Cardio</small></div>
            <div><b>${cardio.distance ? fmtKm(cardio.distance) : '—'}</b><small>Distance</small></div>
            <div><b>${s.exercises.length}</b><small>Exercices</small></div>
          </div>`}
      ${sessionSetCount(s) > 0 && (cardio.duration > 0 || cardio.distance > 0) &&
      html`<div class="detail-cardio"><${Icon} name="activity" size=${16} /> Cardio : ${[cardio.duration ? fmtTimeSet(cardio.duration) : '', cardio.distance ? fmtKm(cardio.distance) : ''].filter(Boolean).join(' · ')}</div>`}
      <div class="muted small center">≈ ${fmtNum(sessionCalories(s))} kcal dépensées (estimation)</div>
    </div>

    ${topMuscles.length > 0 &&
    html`<div class="card muscles-card">
      <div class="muscles-card-text">
        <div class="label">Muscles travaillés</div>
        <div class="muscles-list">${topMuscles.join(' • ') || '—'}</div>
      </div>
      <${BodyPair} levels=${levels} height=${170} />
    </div>`}

    ${s.note && html`<div class="card note-card"><${Icon} name="notebook-pen" size=${16} /><p>${s.note}</p></div>`}

    <div class="section-title"><h2>Exercices</h2><span class="muted small">${s.exercises.length}</span></div>
    <div class="stack">
      ${s.exercises.map((e) => {
        const ex = getExercise(e.exerciseId);
        const type = ex.type || 'weight';
        const pr = prs[e.exerciseId];
        let n = 0;
        return html`<div class="card detail-ex">
          <button class="detail-ex-head" onClick=${() => nav('/exercise/' + e.exerciseId)}>
            <${MuscleThumb} muscle=${ex.muscle} secondary=${ex.secondary} size=${44} />
            <span>
              <b>${ex.name}</b>
              <small>${entryLine(e, type)}</small>
              ${pr && html`<span class="pr-badge">🏆 Record : ${pr.map((k) => PR_LABEL[k]).join(', ')}</span>`}
            </span>
            <${Icon} name="chevron-right" size=${18} class="muted" />
          </button>
          ${e.note && html`<div class="ex-note"><${Icon} name="notebook-pen" size=${14} /> ${e.note}</div>`}
          <div class="detail-sets">
            ${e.sets.map(
              (st) => html`<div class=${'detail-set' + (st.warmup ? ' warmup' : '')}>
                  <span class="detail-set-n">${st.warmup ? 'É' : ++n}</span>
                  <span class="detail-set-v"><${SetValue} st=${st} type=${type} /></span>
                </div>
                ${(st.drops || []).map(
                  (d) => html`<div class="detail-set drop">
                    <span class="detail-set-n"><${Icon} name="corner-down-right" size=${14} /></span>
                    <span class="detail-set-v">${d.weight ? html`<b>${fmtWeight(d.weight)}</b> kg` : html`<b>PDC</b>`} × <b>${d.reps}</b> <em>dégressif</em></span>
                  </div>`
                )}`
            )}
          </div>
        </div>`;
      })}
    </div>

    <div class="row-buttons">
      <button class="btn btn-dark" onClick=${() => repeatSession(s)}><${Icon} name="repeat" size=${17} /> Refaire</button>
      <button class="btn btn-dark" onClick=${() => nav('/session/' + s.id + '/edit')}><${Icon} name="pencil" size=${17} /> Modifier</button>
    </div>
  </div>`;
}
