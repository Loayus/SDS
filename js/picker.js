// Sélecteur d'exercices plein écran (recherche, filtres, création d'exercice perso).
import { html, useState, useMemo, useRef, useEffect } from './lib.js';
import { Icon, openOverlay, toast } from './ui.js';
import { allExercises, CATEGORIES, EQUIPMENT, MUSCLES, getExercise } from './exercises.js';
import { MuscleThumb } from './body.js';
import { addCustomExercise, sessionsDesc } from './store.js';
import { norm } from './utils.js';

/** Ouvre le sélecteur. Résout un tableau d'identifiants (ou null si annulé). */
export function pickExercises({ multi = true, title } = {}) {
  return openOverlay(Picker, { multi, title: title || (multi ? 'Ajouter des exercices' : 'Choisir un exercice') }, { kind: 'screen' });
}

function recentIds(limit = 15) {
  const seen = new Set();
  const out = [];
  for (const s of sessionsDesc()) {
    for (const e of s.exercises) {
      if (!seen.has(e.exerciseId)) {
        seen.add(e.exerciseId);
        out.push(e.exerciseId);
      }
    }
    if (out.length >= limit) break;
  }
  return out;
}

function Picker({ multi, title, close }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [sel, setSel] = useState([]);
  const [tick, setTick] = useState(0);
  const recents = useMemo(() => recentIds(), []);

  const chips = [
    { id: 'all', name: 'Tous' },
    ...(recents.length ? [{ id: 'recent', name: 'Récents' }] : []),
    ...CATEGORIES,
    { id: 'custom', name: 'Perso' },
  ];

  const list = useMemo(() => {
    const nq = norm(q.trim());
    let items = allExercises();
    if (cat === 'recent') items = recents.map(getExercise);
    else if (cat === 'custom') items = items.filter((e) => e.custom);
    else if (cat !== 'all') {
      const c = CATEGORIES.find((x) => x.id === cat);
      items = items.filter((e) => c.muscles.includes(e.muscle));
    }
    if (nq) {
      const words = nq.split(/\s+/);
      items = items.filter((e) => {
        const hay = norm(`${e.name} ${MUSCLES[e.muscle]?.name} ${EQUIPMENT[e.equipment] || ''}`);
        return words.every((w) => hay.includes(w));
      });
    }
    if (cat !== 'recent') items = [...items].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    return items;
  }, [q, cat, recents, tick]);

  const toggle = (id) => {
    if (!multi) return close([id]);
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const create = async () => {
    const ex = await openOverlay(CreateExerciseSheet, { initialName: q.trim() });
    if (ex) {
      setTick((t) => t + 1);
      setQ('');
      setCat('all');
      if (multi) setSel((s) => [...s, ex.id]);
      else close([ex.id]);
      toast('Exercice créé');
    }
  };

  return html`<div class="screen picker" role="dialog" aria-label=${title}>
    <header class="picker-head">
      <button class="text-btn" onClick=${() => close(null)}>Annuler</button>
      <div class="picker-title">${title}</div>
      ${multi
        ? html`<button class="text-btn strong" disabled=${!sel.length} onClick=${() => close(sel)}>
            Ajouter${sel.length ? ` (${sel.length})` : ''}
          </button>`
        : html`<span style="width:64px"></span>`}
    </header>
    <div class="search">
      <${Icon} name="search" size=${18} />
      <input
        type="search"
        placeholder="Rechercher un exercice"
        value=${q}
        onInput=${(e) => setQ(e.target.value)}
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
        enterkeyhint="search"
      />
      ${q && html`<button class="search-clear" aria-label="Effacer" onClick=${() => setQ('')}><${Icon} name="x" size=${16} /></button>`}
    </div>
    <div class="chips">
      ${chips.map(
        (c) => html`<button class=${'chip' + (cat === c.id ? ' active' : '')} onClick=${() => setCat(c.id)}>${c.name}</button>`
      )}
    </div>
    <div class="picker-list">
      <button class="picker-create" onClick=${create}>
        <span class="picker-create-icon"><${Icon} name="plus" size=${20} /></span>
        <span>Créer un exercice${q.trim() ? html` « <b>${q.trim()}</b> »` : ''}</span>
      </button>
      ${list.map((ex) => {
        const on = sel.includes(ex.id);
        return html`<button key=${ex.id} class=${'picker-row' + (on ? ' on' : '')} onClick=${() => toggle(ex.id)}>
          <${MuscleThumb} muscle=${ex.muscle} secondary=${ex.secondary} size=${44} />
          <span class="picker-row-text">
            <span>${ex.name}</span>
            <small>${MUSCLES[ex.muscle]?.name} · ${EQUIPMENT[ex.equipment] || 'Autre'}${ex.custom ? ' · Perso' : ''}</small>
          </span>
          ${multi
            ? html`<span class=${'check-circle' + (on ? ' on' : '')}>${on && html`<${Icon} name="check" size=${16} stroke=${3} />`}</span>`
            : html`<${Icon} name="chevron-right" size=${18} class="muted" />`}
        </button>`;
      })}
      ${!list.length && html`<div class="picker-empty">Aucun exercice trouvé.<br />Crée-le avec le bouton ci-dessus.</div>`}
    </div>
  </div>`;
}

function CreateExerciseSheet({ initialName = '', close }) {
  const [name, setName] = useState(initialName);
  const [muscle, setMuscle] = useState('chest');
  const [equipment, setEquipment] = useState('halteres');
  const ref = useRef();
  useEffect(() => {
    const t = setTimeout(() => ref.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);
  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast("Donne un nom à l'exercice", { icon: 'info' });
      return;
    }
    close(addCustomExercise({ name, muscle, equipment }));
  };
  return html`<form class="sheet tall" onSubmit=${submit} role="dialog" aria-label="Nouvel exercice">
    <div class="sheet-grabber"></div>
    <div class="sheet-head"><div class="sheet-title">Nouvel exercice</div></div>
    <label class="form-label">Nom</label>
    <input ref=${ref} class="field" type="text" placeholder="Ex. : Développé couché unilatéral" value=${name} onInput=${(e) => setName(e.target.value)} />
    <label class="form-label">Muscle principal</label>
    <div class="chips wrap">
      ${Object.entries(MUSCLES).map(
        ([id, m]) => html`<button type="button" class=${'chip' + (muscle === id ? ' active' : '')} onClick=${() => setMuscle(id)}>${m.name}</button>`
      )}
    </div>
    <label class="form-label">Matériel</label>
    <div class="chips wrap">
      ${Object.entries(EQUIPMENT).map(
        ([id, n]) => html`<button type="button" class=${'chip' + (equipment === id ? ' active' : '')} onClick=${() => setEquipment(id)}>${n}</button>`
      )}
    </div>
    <div class="sheet-buttons">
      <button type="submit" class="btn btn-light">Créer l'exercice</button>
      <button type="button" class="btn btn-ghost" onClick=${() => close(null)}>Annuler</button>
    </div>
  </form>`;
}
