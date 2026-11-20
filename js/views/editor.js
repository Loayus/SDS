// Saisie d'une séance : séance en direct (chrono, repos) ou édition d'une séance passée.
import { html, useState, useEffect, useRef } from '../lib.js';
import {
  getData,
  getActive,
  commitActive,
  getSession,
  elapsedSec,
  togglePause,
  newEntryLike,
  newSet,
  newDrop,
  cleanEntries,
  toEditableEntries,
  finishActive,
  discardActive,
  upsertSession,
} from '../store.js';
import {
  Icon,
  nav,
  navRoot,
  back,
  useNow,
  actionSheet,
  confirmDialog,
  promptDialog,
  toast,
  haptic,
  unlockAudio,
  beep,
  keepAwake,
  openOverlay,
  TopBar,
} from '../ui.js';
import { pickExercises } from '../picker.js';
import { getExercise, MUSCLES, EQUIPMENT } from '../exercises.js';
import { MuscleThumb } from '../body.js';
import { lastEntry, setVolume } from '../stats.js';
import { fmtClock, fmtMinSec, fmtWeight, fmtTime, fmtKg, numToInput, parseNum, clamp, uid, fmtDuration } from '../utils.js';

const str = (v) => (v == null ? '' : String(v)).trim();

// ---------------------------------------------------------------------------
// Écran « séance en cours »

export function LiveSession() {
  const a = getActive();
  const profile = getData().profile;
  useEffect(() => {
    if (!a) return;
    keepAwake(!!profile.wakeLock);
    return () => keepAwake(false);
  }, [!!a, profile.wakeLock]);

  if (!a) {
    return html`<div class="page">
      <${TopBar} title="Séance" onBack=${() => navRoot('/')} />
      <div class="card empty-card">
        <${Icon} name="dumbbell" size=${22} />
        <span>Aucune séance en cours.</span>
        <button class="text-btn small" onClick=${() => nav('/new', { replace: true })}>Démarrer</button>
      </div>
    </div>`;
  }
  return html`<${SessionEditor} mode="live" doc=${a} touch=${commitActive} />`;
}

// ---------------------------------------------------------------------------
// Édition d'une séance passée / ajout manuel

function toLocalDateInput(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function makeDraft(session) {
  return {
    id: session.id,
    name: session.name,
    programId: session.programId || null,
    startedAt: session.startedAt,
    note: session.note || '',
    exercises: toEditableEntries(session.exercises),
    dateStr: toLocalDateInput(session.startedAt),
    timeStr: fmtTime(session.startedAt),
    durMin: String(Math.round((session.duration || 0) / 60)),
  };
}

export function EditSession({ id, date }) {
  const original = id ? getSession(id) : null;
  const [draft] = useState(() => {
    if (original) return makeDraft(original);
    let start = new Date();
    start.setMinutes(0, 0, 0);
    start.setHours(start.getHours() - 1);
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [y, m, d] = date.split('-').map(Number);
      start = new Date(y, m - 1, d, 18, 0, 0);
    }
    return makeDraft({ id: uid(), name: 'Séance', startedAt: start.getTime(), duration: 3600, exercises: [] });
  });
  const [, force] = useState(0);
  if (id && !original) {
    return html`<div class="page"><${TopBar} title="Séance introuvable" onBack=${() => back('/history')} /></div>`;
  }
  return html`<${SessionEditor} mode=${original ? 'edit' : 'new'} doc=${draft} touch=${() => force((x) => x + 1)} original=${original} />`;
}

// ---------------------------------------------------------------------------
// Éditeur commun

function SessionEditor({ mode, doc, touch, original }) {
  const live = mode === 'live';
  const beforeTs = live ? Infinity : doc.startedAt;
  const excludeId = live ? null : doc.id;

  const addExercises = async () => {
    const ids = await pickExercises({ multi: true });
    if (!ids || !ids.length) return;
    const firstNew = doc.exercises.length;
    for (const id of ids) {
      const prev = lastEntry(id, beforeTs, excludeId);
      doc.exercises.push(newEntryLike(id, prev?.entry));
    }
    touch();
    setTimeout(() => {
      const el = document.getElementById('ex-' + doc.exercises[firstNew]?.id);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  const rename = async () => {
    const v = await promptDialog({ title: 'Nom de la séance', value: doc.name, placeholder: 'Ex. : Push, Haut du corps…' });
    if (v != null && v.trim()) {
      doc.name = v.trim();
      touch();
    }
  };

  const editNote = async () => {
    const v = await promptDialog({ title: 'Note de séance', value: doc.note || '', placeholder: 'Sensations, énergie, douleurs…', multiline: true });
    if (v != null) {
      doc.note = v;
      touch();
    }
  };

  const sessionMenu = async () => {
    const r = await actionSheet({
      title: doc.name,
      actions: [
        { label: 'Renommer la séance', icon: 'pencil', value: 'rename' },
        { label: doc.note ? 'Modifier la note' : 'Ajouter une note', icon: 'notebook-pen', value: 'note' },
        { label: 'Abandonner la séance', icon: 'trash-2', value: 'discard', danger: true },
      ],
    });
    if (r === 'rename') rename();
    if (r === 'note') editNote();
    if (r === 'discard') discard();
  };

  const discard = async () => {
    const ok = await confirmDialog({
      title: 'Abandonner la séance ?',
      message: 'Les séries saisies ne seront pas enregistrées.',
      confirmLabel: 'Abandonner',
      danger: true,
    });
    if (ok) {
      discardActive();
      keepAwake(false);
      navRoot('/');
      toast('Séance abandonnée', { icon: 'trash-2' });
    }
  };

  const finish = async () => {
    const cleaned = cleanEntries(doc.exercises);
    if (!cleaned.length) {
      const r = await actionSheet({
        title: 'Aucune série renseignée',
        message: 'Saisis au moins une série (répétitions) pour enregistrer la séance.',
        actions: [{ label: 'Abandonner la séance', icon: 'trash-2', value: 'discard', danger: true }],
      });
      if (r === 'discard') {
        discardActive();
        keepAwake(false);
        navRoot('/');
      }
      return;
    }
    let empty = 0;
    for (const e of doc.exercises) for (const s of e.sets) if (!parseNum(s.reps)) empty++;
    const sets = cleaned.reduce((a, e) => a + e.sets.filter((s) => !s.warmup).length, 0);
    const volume = cleaned.reduce((a, e) => a + e.sets.filter((s) => !s.warmup).reduce((b, s) => b + setVolume(s), 0), 0);
    const ok = await openOverlay(FinishSheet, {
      duration: elapsedSec(doc),
      exercises: cleaned.length,
      sets,
      volume,
      empty,
    });
    if (!ok) return;
    const saved = finishActive();
    keepAwake(false);
    if (saved) nav('/session/' + saved.id + '?done=1', { replace: true });
  };

  const save = () => {
    const cleaned = cleanEntries(doc.exercises);
    if (!cleaned.length) {
      toast('Ajoute au moins une série avec des répétitions', { icon: 'info' });
      return;
    }
    const [y, mo, d] = (doc.dateStr || '').split('-').map(Number);
    const [hh, mm] = (doc.timeStr || '00:00').split(':').map(Number);
    if (!y || !mo || !d) {
      toast('Date invalide', { icon: 'info' });
      return;
    }
    const startedAt = new Date(y, mo - 1, d, hh || 0, mm || 0).getTime();
    const duration = Math.max(0, Math.round((parseNum(doc.durMin) || 0) * 60));
    const session = {
      ...(original || {}),
      id: doc.id,
      name: str(doc.name) || 'Séance',
      programId: doc.programId || null,
      startedAt,
      endedAt: startedAt + duration * 1000,
      duration,
      exercises: cleaned,
    };
    if (str(doc.note)) session.note = str(doc.note);
    else delete session.note;
    upsertSession(session);
    toast(original ? 'Séance modifiée' : 'Séance ajoutée');
    if (original) back('/session/' + session.id);
    else nav('/session/' + session.id, { replace: true });
  };

  return html`<div class=${'page editor' + (live ? ' live' : '')}>
    ${live
      ? html`<${LiveHeader} doc=${doc} touch=${touch} />`
      : html`<${TopBar}
          title=${mode === 'edit' ? 'Modifier la séance' : 'Ajouter une séance'}
          onBack=${() => back(original ? '/session/' + original.id : '/history')}
          backIcon="x"
          right=${html`<button class="text-btn strong" onClick=${save}>Enregistrer</button>`}
        />`}

    ${live
      ? html`<div class="session-name-row">
          <button class="session-name" onClick=${rename}>
            <span>${doc.name}</span>
            <${Icon} name="pencil" size=${15} class="muted" />
          </button>
          <button class="icon-btn" aria-label="Options de la séance" onClick=${sessionMenu}><${Icon} name="ellipsis" size=${22} /></button>
        </div>
        <div class="session-started muted small">Commencée à ${fmtTime(doc.startedAt)}${doc.note ? html` · <button class="link-btn inline" onClick=${editNote}>Note</button>` : ''}</div>`
      : html`<div class="card form-card">
          <label class="form-label" for="ed-name">Nom</label>
          <input id="ed-name" class="field" type="text" value=${doc.name} onInput=${(e) => (doc.name = e.target.value)} />
          <div class="form-grid">
            <div>
              <label class="form-label" for="ed-date">Date</label>
              <input id="ed-date" class="field" type="date" value=${doc.dateStr} onInput=${(e) => (doc.dateStr = e.target.value)} onChange=${(e) => ((doc.dateStr = e.target.value), touch())} />
            </div>
            <div>
              <label class="form-label" for="ed-time">Heure</label>
              <input id="ed-time" class="field" type="time" value=${doc.timeStr} onInput=${(e) => (doc.timeStr = e.target.value)} onChange=${(e) => ((doc.timeStr = e.target.value), touch())} />
            </div>
          </div>
          <label class="form-label" for="ed-dur">Durée</label>
          <div class="field-wrap">
            <input id="ed-dur" class="field" type="text" inputmode="numeric" value=${doc.durMin} onInput=${(e) => (doc.durMin = e.target.value)} />
            <span class="field-suffix">min</span>
          </div>
          <label class="form-label" for="ed-note">Note</label>
          <textarea id="ed-note" class="field" rows="2" placeholder="Facultatif" value=${doc.note} onInput=${(e) => (doc.note = e.target.value)}></textarea>
        </div>`}

    ${!doc.exercises.length &&
    html`<div class="card empty-card editor-empty">
      <${Icon} name="dumbbell" size=${26} />
      <span>Ajoute ton premier exercice pour commencer à noter tes séries.</span>
    </div>`}

    <div class="stack">
      ${doc.exercises.map(
        (entry, i) => html`<${ExerciseBlock}
          key=${entry.id}
          entry=${entry}
          index=${i}
          doc=${doc}
          touch=${touch}
          live=${live}
          beforeTs=${beforeTs}
          excludeId=${excludeId}
        />`
      )}
    </div>

    <button class="btn btn-dashed btn-block" onClick=${addExercises}>
      <${Icon} name="plus" size=${18} /> Ajouter un exercice
    </button>

    ${live &&
    html`<button class="btn btn-gradient btn-block finish-btn" onClick=${finish}>
        <${Icon} name="flag" size=${18} /> Terminer la séance
      </button>
      <button class="link-btn danger center" onClick=${discard}>Abandonner la séance</button>`}
    ${!live && html`<button class="btn btn-light btn-block finish-btn" onClick=${save}>Enregistrer</button>`}

    ${live && html`<${RestBar} doc=${doc} touch=${touch} />`}
  </div>`;
}

// ---------------------------------------------------------------------------
// En-tête chrono

function LiveHeader({ doc }) {
  const now = useNow(1000);
  const paused = !!doc.pausedAt;
  return html`<header class="live-head">
    <button class="icon-btn" aria-label="Réduire la séance" onClick=${() => navRoot('/')}>
      <${Icon} name="chevron-down" size=${26} />
    </button>
    <div class=${'live-clock' + (paused ? ' paused' : '')}>
      <div class="live-time">${fmtClock(elapsedSec(doc, now))}</div>
      <small>${paused ? 'En pause' : 'Temps écoulé'}</small>
    </div>
    <button class="round-btn" aria-label=${paused ? 'Reprendre le chrono' : 'Mettre en pause'} onClick=${togglePause}>
      <${Icon} name=${paused ? 'play' : 'pause'} size=${18} fill="currentColor" stroke=${1.5} />
    </button>
  </header>`;
}

// ---------------------------------------------------------------------------
// Bloc exercice + tableau des séries

function ExerciseBlock({ entry, index, doc, touch, live, beforeTs, excludeId }) {
  const ex = getExercise(entry.exerciseId);
  const prev = lastEntry(entry.exerciseId, beforeTs, excludeId);
  const prevSets = prev ? prev.entry.sets : [];
  const prevWork = prevSets.filter((s) => !s.warmup);
  const prevWarm = prevSets.filter((s) => s.warmup);

  // Valeurs suggérées (placeholder) : même série de la séance précédente, sinon série précédente.
  const ph = [];
  let wk = 0,
    wu = 0;
  entry.sets.forEach((s, i) => {
    const ps = s.warmup ? prevWarm[wu++] : prevWork[wk++];
    const before = i > 0 ? entry.sets[i - 1] : null;
    const bph = i > 0 ? ph[i - 1] : null;
    const w = ps ? numToInput(ps.weight) : before ? str(before.weight) || bph.w : '';
    const r = ps ? numToInput(ps.reps) : before ? str(before.reps) || bph.r : '';
    const drops = (ps?.drops || []).map((d) => ({ w: numToInput(d.weight), r: numToInput(d.reps) }));
    ph.push({ w, r, drops, prev: ps });
  });

  const doneCount = entry.sets.filter((s) => s.done).length;
  let workN = 0;

  const menu = async () => {
    const hasData = entry.sets.some((s) => str(s.reps) || str(s.weight));
    const r = await actionSheet({
      title: ex.name,
      message: `${MUSCLES[ex.muscle]?.name} · ${EQUIPMENT[ex.equipment] || ''}`,
      actions: [
        { label: 'Voir la progression', icon: 'chart-line', value: 'progress' },
        { label: entry.note ? 'Modifier la note' : 'Ajouter une note', icon: 'notebook-pen', value: 'note' },
        { label: "Remplacer l'exercice", icon: 'repeat', value: 'replace' },
        { label: 'Monter', icon: 'arrow-up', value: 'up', disabled: index === 0 },
        { label: 'Descendre', icon: 'arrow-down', value: 'down', disabled: index === doc.exercises.length - 1 },
        { label: "Supprimer l'exercice", icon: 'trash-2', value: 'delete', danger: true },
      ],
    });
    if (r === 'progress') nav('/exercise/' + entry.exerciseId);
    if (r === 'note') {
      const v = await promptDialog({ title: 'Note', value: entry.note || '', placeholder: 'Réglage machine, prise, sensations…', multiline: true });
      if (v != null) {
        entry.note = v;
        touch();
      }
    }
    if (r === 'replace') {
      const ids = await pickExercises({ multi: false, title: 'Remplacer par' });
      if (ids && ids[0]) {
        entry.exerciseId = ids[0];
        touch();
      }
    }
    if (r === 'up' || r === 'down') {
      const j = r === 'up' ? index - 1 : index + 1;
      const arr = doc.exercises;
      [arr[index], arr[j]] = [arr[j], arr[index]];
      touch();
    }
    if (r === 'delete') {
      if (hasData) {
        const ok = await confirmDialog({ title: `Supprimer « ${ex.name} » ?`, message: 'Les séries saisies pour cet exercice seront perdues.', confirmLabel: 'Supprimer', danger: true });
        if (!ok) return;
      }
      doc.exercises.splice(index, 1);
      touch();
    }
  };

  const addSet = () => {
    const last = entry.sets[entry.sets.length - 1];
    entry.sets.push(newSet({ warmup: false }));
    touch();
    setTimeout(() => {
      const s = entry.sets[entry.sets.length - 1];
      if (!last) document.getElementById('w-' + s.id)?.focus();
    }, 30);
  };

  const addDropTo = (set, i) => {
    set.drops.push(newDrop());
    set.done = false;
    touch();
    setTimeout(() => document.getElementById('w-' + set.drops[set.drops.length - 1].id)?.focus(), 40);
  };

  const addDropLast = () => {
    if (!entry.sets.length) entry.sets.push(newSet());
    const i = entry.sets.length - 1;
    addDropTo(entry.sets[i], i);
  };

  const setMenu = async (set, i, label) => {
    const r = await actionSheet({
      title: set.warmup ? 'Série d’échauffement' : `Série ${label}`,
      actions: [
        { label: 'Ajouter un dégressif', icon: 'corner-down-right', value: 'drop' },
        { label: set.warmup ? 'Compter comme série de travail' : 'Marquer comme échauffement', icon: 'flame', value: 'warmup' },
        { label: 'Dupliquer la série', icon: 'copy', value: 'dup' },
        { label: 'Supprimer la série', icon: 'trash-2', value: 'delete', danger: true },
      ],
    });
    if (r === 'drop') addDropTo(set, i);
    if (r === 'warmup') {
      set.warmup = !set.warmup;
      touch();
    }
    if (r === 'dup') {
      const copy = newSet({
        weight: str(set.weight) || ph[i].w,
        reps: str(set.reps) || ph[i].r,
        warmup: set.warmup,
        drops: set.drops.map((d) => newDrop({ weight: d.weight, reps: d.reps })),
      });
      entry.sets.splice(i + 1, 0, copy);
      touch();
    }
    if (r === 'delete') {
      entry.sets.splice(i, 1);
      touch();
    }
  };

  const toggleDone = (set, i) => {
    unlockAudio();
    if (set.done) {
      set.done = false;
      touch();
      return;
    }
    const p = ph[i];
    if (!str(set.reps) && p.r) {
      set.reps = p.r;
      if (!str(set.weight) && p.w) set.weight = p.w;
    } else if (str(set.reps) && !str(set.weight) && p.w) {
      set.weight = p.w;
    }
    if (!parseNum(set.reps)) {
      toast('Indique le nombre de répétitions', { icon: 'info' });
      document.getElementById('r-' + set.id)?.focus();
      return;
    }
    set.drops.forEach((d, j) => {
      const pd = p.drops[j];
      if (!str(d.reps) && pd) {
        d.reps = pd.r;
        if (!str(d.weight)) d.weight = pd.w;
      }
    });
    set.done = true;
    haptic();
    if (live) {
      const secs = getData().profile.restDefault || 90;
      doc.rest = { endsAt: Date.now() + secs * 1000, total: secs };
    }
    touch();
  };

  // Sauvegarde différée pendant la frappe (le champ garde sa valeur).
  const saveQuiet = () => {
    clearTimeout(saveQuiet.t);
    saveQuiet.t = setTimeout(() => touch(), 400);
  };

  const fieldProps = (obj, key, placeholder, kind, idPrefix) => ({
    id: idPrefix + obj.id,
    class: 'set-in',
    type: 'text',
    inputmode: kind === 'w' ? 'decimal' : 'numeric',
    enterkeyhint: 'next',
    autocomplete: 'off',
    placeholder: placeholder || (kind === 'w' ? 'kg' : 'reps'),
    value: obj[key],
    onInput: (e) => {
      obj[key] = e.target.value;
      if (!live) return;
      saveQuiet();
    },
    onBlur: () => touch(),
    onFocus: (e) => {
      const t = e.target;
      setTimeout(() => {
        try {
          t.setSelectionRange(0, t.value.length);
        } catch {}
      }, 0);
    },
  });

  return html`<section class="card ex-block" id=${'ex-' + entry.id}>
    <div class="ex-block-head">
      <button class="ex-block-title" onClick=${menu}>
        <${MuscleThumb} muscle=${ex.muscle} secondary=${ex.secondary} size=${44} />
        <span>
          <b>${ex.name}</b>
          <small>
            ${entry.target ? `Objectif ${entry.sets.length} × ${entry.target} · ` : ''}${doneCount}/${entry.sets.length} série${entry.sets.length > 1 ? 's' : ''}
          </small>
        </span>
      </button>
      <button class="icon-btn" aria-label=${'Options ' + ex.name} onClick=${menu}><${Icon} name="ellipsis" size=${22} /></button>
    </div>
    ${entry.note && html`<div class="ex-note"><${Icon} name="notebook-pen" size=${14} /> ${entry.note}</div>`}

    <div class=${'sets' + (live ? '' : ' no-check')}>
      <div class="sets-head">
        <span>Série</span><span>Précédent</span><span>kg</span><span>Reps</span>${live ? html`<span></span>` : html`<span></span>`}
      </div>
      ${entry.sets.map((set, i) => {
        const label = set.warmup ? 'É' : String(++workN);
        const p = ph[i];
        const prevTxt = p.prev ? `${fmtWeight(p.prev.weight)} × ${p.prev.reps}` : '—';
        return html`<div key=${set.id} class=${'set-group' + (set.done ? ' done' : '') + (set.warmup ? ' warmup' : '')}>
          <div class="set-row">
            <button class="set-num" aria-label=${'Options série ' + label} onClick=${() => setMenu(set, i, label)}>${label}</button>
            <button
              class="set-prev"
              onClick=${() => {
                if (!p.prev) return;
                set.weight = numToInput(p.prev.weight);
                set.reps = numToInput(p.prev.reps);
                touch();
              }}
            >
              ${prevTxt}${p.prev?.drops?.length ? html`<em> +${p.prev.drops.length}↘</em>` : ''}
            </button>
            <input ...${fieldProps(set, 'weight', p.w, 'w', 'w-')} aria-label=${'Charge série ' + label} />
            <input ...${fieldProps(set, 'reps', p.r, 'r', 'r-')} aria-label=${'Répétitions série ' + label} />
            ${live
              ? html`<button class=${'set-check' + (set.done ? ' on' : '')} aria-label=${set.done ? 'Annuler la validation' : 'Valider la série'} onClick=${() => toggleDone(set, i)}>
                  <${Icon} name="check" size=${18} stroke=${3} />
                </button>`
              : html`<button class="set-del" aria-label="Supprimer la série" onClick=${() => (entry.sets.splice(i, 1), touch())}>
                  <${Icon} name="x" size=${16} />
                </button>`}
          </div>
          ${set.drops.map((d, j) => {
            const pd = p.drops[j];
            return html`<div key=${d.id} class="set-row drop-row">
              <span class="drop-ico"><${Icon} name="corner-down-right" size=${16} /></span>
              <span class="drop-label">Dégressif ${set.drops.length > 1 ? j + 1 : ''}</span>
              <input ...${fieldProps(d, 'weight', pd?.w, 'w', 'w-')} aria-label=${'Charge dégressif ' + (j + 1)} />
              <input ...${fieldProps(d, 'reps', pd?.r, 'r', 'r-')} aria-label=${'Répétitions dégressif ' + (j + 1)} />
              <button class="set-del" aria-label="Supprimer le dégressif" onClick=${() => (set.drops.splice(j, 1), touch())}>
                <${Icon} name="x" size=${16} />
              </button>
            </div>`;
          })}
        </div>`;
      })}
    </div>
    <div class="ex-block-actions">
      <button class="btn btn-small" onClick=${addSet}><${Icon} name="plus" size=${16} /> Série</button>
      <button class="btn btn-small" onClick=${addDropLast}><${Icon} name="corner-down-right" size=${16} /> Dégressif</button>
    </div>
  </section>`;
}

// ---------------------------------------------------------------------------
// Minuteur de repos

function RestBar({ doc, touch }) {
  const rest = doc.rest;
  const now = useNow(250, !!rest);
  const fired = useRef(null);
  const left = rest ? (rest.endsAt - now) / 1000 : 0;

  useEffect(() => {
    if (!rest) return;
    if (left <= 0 && fired.current !== rest.endsAt) {
      fired.current = rest.endsAt;
      if (left > -3) {
        if (getData().profile.sound) beep();
        haptic();
      }
    }
    if (left < -6) {
      doc.rest = null;
      touch();
    }
  }, [now, rest && rest.endsAt]);

  if (!rest) return null;
  const done = left <= 0;
  const pct = clamp(1 - left / (rest.total || 1), 0, 1);
  const adjust = (s) => {
    rest.endsAt += s * 1000;
    rest.total = Math.max(5, rest.total + s);
    if (rest.endsAt <= Date.now()) doc.rest = null;
    touch();
  };
  return html`<div class=${'rest-bar' + (done ? ' done' : '')} role="timer" aria-live="off">
    <div class="rest-progress" style=${`transform:scaleX(${pct})`}></div>
    <button class="rest-adj" aria-label="Retirer 15 secondes" onClick=${() => adjust(-15)}>−15</button>
    <div class="rest-center">
      <small>${done ? 'Repos terminé' : 'Repos'}</small>
      <b>${done ? "C'est reparti !" : fmtMinSec(left)}</b>
    </div>
    <button class="rest-adj" aria-label="Ajouter 15 secondes" onClick=${() => adjust(15)}>+15</button>
    <button
      class="rest-skip"
      onClick=${() => {
        doc.rest = null;
        touch();
      }}
    >
      ${done ? 'OK' : 'Passer'}
    </button>
  </div>`;
}

// ---------------------------------------------------------------------------
// Récapitulatif avant enregistrement

function FinishSheet({ duration, exercises, sets, volume, empty, close }) {
  return html`<div class="sheet" role="dialog" aria-label="Terminer la séance">
    <div class="sheet-grabber"></div>
    <div class="sheet-head">
      <div class="sheet-title">Terminer la séance ?</div>
      <div class="sheet-msg">Elle sera enregistrée dans ton historique.</div>
    </div>
    <div class="finish-grid">
      <div><b>${fmtDuration(duration)}</b><small>Durée</small></div>
      <div><b>${exercises}</b><small>Exercice${exercises > 1 ? 's' : ''}</small></div>
      <div><b>${sets}</b><small>Séries</small></div>
      <div><b>${fmtKg(volume)}</b><small>Volume</small></div>
    </div>
    ${duration > 4 * 3600 &&
    html`<div class="sheet-note"><${Icon} name="clock" size=${16} /> Durée inhabituelle ? Tu pourras la corriger avec « Modifier ».</div>`}
    ${empty > 0 && html`<div class="sheet-note"><${Icon} name="info" size=${16} /> ${empty} série${empty > 1 ? 's' : ''} sans répétitions ${empty > 1 ? 'seront ignorées' : 'sera ignorée'}.</div>`}
    <div class="sheet-buttons">
      <button class="btn btn-light" onClick=${() => close(true)}>Enregistrer la séance</button>
      <button class="btn btn-ghost" onClick=${() => close(false)}>Continuer la séance</button>
    </div>
  </div>`;
}

