// Progression par exercice, détail d'un exercice, records.
import { html, useState } from '../lib.js';
import { Icon, nav, back, TopBar, Segmented, Empty, Delta } from '../ui.js';
import { LineChart, Sparkline } from '../charts.js';
import { MuscleThumb, BodyPair } from '../body.js';
import { getExercise, MUSCLES, exSubtitle } from '../exercises.js';
import { practicedExercises, exerciseHistory, recordsFrom } from '../stats.js';
import { fmtWeight, fmtKg, fmtNum, fmtShortDate, fmtAgo, fmtRelDay, norm, pctChange, DAY, fmtTimeSet, fmtKm, speedKmh } from '../utils.js';

const metricOf = (m, metric) =>
  ({ '1rm': m.best1rm, volume: m.volume, reps: m.maxReps, weight: m.maxWeight, duration: m.duration, distance: m.distance })[metric] || 0;

/** Métriques disponibles selon le type d'exercice. */
function metricsFor(type) {
  if (type === 'cardio')
    return [
      { value: 'duration', label: 'Durée' },
      { value: 'distance', label: 'Distance' },
    ];
  if (type === 'time') return [{ value: 'duration', label: 'Durée' }];
  return [
    { value: 'weight', label: 'Charge' },
    { value: '1rm', label: '1RM' },
    { value: 'volume', label: 'Volume' },
    { value: 'reps', label: 'Reps' },
  ];
}

/** Métrique la plus pertinente pour un exercice. */
function defaultMetric(history, type) {
  if (type === 'cardio') return history.some((h) => h.m.distance > 0) ? 'distance' : 'duration';
  if (type === 'time') return 'duration';
  return history.some((h) => h.m.maxWeight > 0) ? 'weight' : 'reps';
}

/** Mise en forme d'une valeur de métrique. */
function fmtMetric(v, metric) {
  if (metric === 'reps') return `${fmtNum(v)} reps`;
  if (metric === 'volume') return fmtKg(v);
  if (metric === 'duration') return fmtTimeSet(v);
  if (metric === 'distance') return fmtKm(v);
  return `${fmtWeight(Math.round(v * 10) / 10)} kg`;
}

/** Record principal d'un exercice (pour les listes). */
function mainRecord(records, type, history) {
  if (type === 'cardio') return records.maxDistance ? ['distance', records.maxDistance] : ['duration', records.maxDuration];
  if (type === 'time') return ['duration', records.maxDuration];
  return history.some((h) => h.m.maxWeight > 0) ? ['weight', records.maxWeight] : ['reps', records.maxReps];
}

let listQuery = '';
let listSort = 'recent';

export function ProgressList() {
  const [q, setQState] = useState(listQuery);
  const [sort, setSortState] = useState(listSort);
  const setQ = (v) => ((listQuery = v), setQState(v));
  const setSort = (v) => ((listSort = v), setSortState(v));

  const all = practicedExercises();
  let items = all;
  const nq = norm(q.trim());
  if (nq) items = items.filter((x) => norm(x.ex.name).includes(nq) || norm(MUSCLES[x.ex.muscle]?.name).includes(nq));
  if (sort === 'recent') items.sort((a, b) => b.last.session.startedAt - a.last.session.startedAt);
  if (sort === 'count') items.sort((a, b) => b.count - a.count);
  if (sort === 'name') items.sort((a, b) => a.ex.name.localeCompare(b.ex.name, 'fr'));

  return html`<div class="page progress-list">
    <${TopBar} title="Progression" onBack=${() => back('/profile')} />
    ${!all.length
      ? html`<${Empty} icon="trending-up" title="Aucun exercice suivi" text="Chaque exercice réalisé au moins une fois apparaîtra ici avec ta progression." />`
      : html`
          <div class="search">
            <${Icon} name="search" size=${18} />
            <input type="search" placeholder="Rechercher" value=${q} onInput=${(e) => setQ(e.target.value)} autocomplete="off" />
          </div>
          <${Segmented}
            small
            value=${sort}
            onChange=${setSort}
            options=${[
              { value: 'recent', label: 'Récents' },
              { value: 'count', label: 'Fréquents' },
              { value: 'name', label: 'A → Z' },
            ]}
          />
          <div class="stack">
            ${items.map((x) => {
              const type = x.ex.type || 'weight';
              const metric = defaultMetric(x.history, type);
              const values = x.history.map((h) => metricOf(h.m, metric));
              const first = values[0],
                lastV = values[values.length - 1];
              const [recMetric, best] = mainRecord(x.records, type, x.history);
              return html`<button key=${x.exerciseId} class="card progress-row" onClick=${() => nav('/exercise/' + x.exerciseId)}>
                <${MuscleThumb} muscle=${x.ex.muscle} secondary=${x.ex.secondary} size=${48} />
                <span class="progress-row-text">
                  <span>${x.ex.name}</span>
                  <small>${x.count} séance${x.count > 1 ? 's' : ''} · ${fmtAgo(x.last.session.startedAt)}</small>
                  <small class="dim">
                    Record : ${best ? fmtMetric(best.value, recMetric) : '—'}
                    ${x.count > 1 && first ? html` · <${Delta} value=${pctChange(lastV, first)} />` : ''}
                  </small>
                </span>
                <${Sparkline} values=${values.slice(-12)} />
              </button>`;
            })}
            ${!items.length && html`<div class="card empty-card"><span>Aucun résultat.</span></div>`}
          </div>
        `}
  </div>`;
}

const RANGES = { '3m': 91, '6m': 182, '1y': 365, all: Infinity };
let detailMetric = {};
let detailRange = 'all';

function RecordTile({ label, value, sub }) {
  return html`<div class="card record-tile">
    <small>${label}</small>
    <b>${value}</b>
    <em>${sub || ''}</em>
  </div>`;
}

/** Tuiles de records selon le type d'exercice. */
function RecordTiles({ rec, type, count }) {
  const date = (r) => (r ? fmtShortDate(r.session.startedAt) : '');
  if (type === 'cardio') {
    const avg = speedKmh(rec.totalDistance, rec.totalDuration);
    return html`<div class="tiles-2">
      <${RecordTile} label="Durée max (séance)" value=${rec.maxDuration ? fmtTimeSet(rec.maxDuration.value) : '—'} sub=${date(rec.maxDuration)} />
      <${RecordTile} label="Distance max (séance)" value=${rec.maxDistance ? fmtKm(rec.maxDistance.value) : '—'} sub=${date(rec.maxDistance)} />
      <${RecordTile} label="Durée totale" value=${fmtTimeSet(rec.totalDuration)} sub=${`${count} séance${count > 1 ? 's' : ''}`} />
      <${RecordTile} label="Distance totale" value=${rec.totalDistance ? fmtKm(rec.totalDistance) : '—'} sub=${avg ? `moy. ${fmtNum(avg, 1)} km/h` : ''} />
    </div>`;
  }
  if (type === 'time') {
    return html`<div class="tiles-2">
      <${RecordTile} label="Durée max (séance)" value=${rec.maxDuration ? fmtTimeSet(rec.maxDuration.value) : '—'} sub=${date(rec.maxDuration)} />
      <${RecordTile} label="Durée totale" value=${fmtTimeSet(rec.totalDuration)} sub=${`${count} séance${count > 1 ? 's' : ''}`} />
    </div>`;
  }
  return html`<div class="tiles-2">
    <${RecordTile}
      label="Charge max"
      value=${rec.maxWeight ? `${fmtWeight(rec.maxWeight.value)} kg` : '—'}
      sub=${rec.maxWeight ? `× ${rec.maxWeight.reps} · ${date(rec.maxWeight)}` : 'Poids du corps'}
    />
    <${RecordTile} label="1RM estimé" value=${rec.best1rm ? `${fmtWeight(Math.round(rec.best1rm.value * 10) / 10)} kg` : '—'} sub=${date(rec.best1rm)} />
    <${RecordTile} label="Volume max (séance)" value=${rec.maxVolume ? fmtKg(rec.maxVolume.value) : '—'} sub=${date(rec.maxVolume)} />
    <${RecordTile} label="Reps max (série)" value=${rec.maxReps ? rec.maxReps.value : '—'} sub=${date(rec.maxReps)} />
  </div>`;
}

/** Contenu d'une série dans l'historique d'un exercice. */
function histSet(s, type) {
  if (type === 'time') return fmtTimeSet(s.duration);
  if (type === 'cardio') return [s.duration ? fmtTimeSet(s.duration) : '', s.distance ? fmtKm(s.distance) : ''].filter(Boolean).join(' · ');
  return html`${s.weight ? fmtWeight(s.weight) : 'PDC'}×${s.reps}${(s.drops || []).map((d) => html`<em> ↘ ${d.weight ? fmtWeight(d.weight) : 'PDC'}×${d.reps}</em>`)}`;
}

function histSummary(m, type) {
  if (type === 'time') return `Total ${fmtTimeSet(m.duration)}`;
  if (type === 'cardio') {
    const v = speedKmh(m.distance, m.duration);
    return [m.duration ? fmtTimeSet(m.duration) : '', m.distance ? fmtKm(m.distance) : '', v ? `${fmtNum(v, 1)} km/h` : ''].filter(Boolean).join(' · ');
  }
  return `${m.maxWeight ? `Max ${fmtWeight(m.maxWeight)} kg · ` : ''}1RM ${fmtWeight(Math.round(m.best1rm * 10) / 10)} kg · ${fmtKg(m.volume)}`;
}

export function ExerciseDetail({ id }) {
  const ex = getExercise(id);
  const type = ex.type || 'weight';
  const history = exerciseHistory(id);
  const metrics = metricsFor(type);
  const stored = detailMetric[id];
  const [metric, setMetricState] = useState(stored && metrics.some((m) => m.value === stored) ? stored : defaultMetric(history, type));
  const [range, setRangeState] = useState(detailRange);
  const setMetric = (v) => ((detailMetric[id] = v), setMetricState(v));
  const setRange = (v) => ((detailRange = v), setRangeState(v));

  const rec = recordsFrom(history);
  const cutoff = Date.now() - RANGES[range] * DAY;
  const pts = history.filter((h) => h.session.startedAt >= cutoff).map((h) => ({ x: h.session.startedAt, y: metricOf(h.m, metric) }));
  const fmtY = (v) => fmtMetric(v, metric);
  const levels = { [ex.muscle]: 1 };
  for (const m of ex.secondary || []) levels[m] = 0.35;

  const firstV = pts.length ? pts[0].y : 0;
  const lastV = pts.length ? pts[pts.length - 1].y : 0;
  const secondary = (ex.secondary || []).map((m) => MUSCLES[m]?.name).join(', ');

  return html`<div class="page exercise-detail">
    <${TopBar} title=${ex.name} onBack=${() => back('/progress')} />

    <div class="card ex-hero">
      <div class="ex-hero-text">
        <div class="label">${MUSCLES[ex.muscle]?.name}</div>
        ${type === 'weight' && html`<div class="muted small">${secondary || 'Isolation'}</div>`}
        <div class="muted small">${exSubtitle(ex).split(' · ').slice(1).join(' · ')}</div>
        <div class="ex-hero-count"><b>${history.length}</b> séance${history.length > 1 ? 's' : ''}</div>
      </div>
      ${MUSCLES[ex.muscle]?.noBody
        ? html`<div class="ex-hero-icon"><${Icon} name="activity" size=${64} stroke=${1.4} /></div>`
        : html`<${BodyPair} levels=${levels} height=${130} />`}
    </div>

    ${!history.length
      ? html`<${Empty} icon="chart-line" title="Pas encore réalisé" text="Ajoute cet exercice à une séance pour suivre ta progression." />`
      : html`
          <${RecordTiles} rec=${rec} type=${type} count=${history.length} />

          <div class="card chart-card">
            ${metrics.length > 1 && html`<${Segmented} small value=${metric} onChange=${setMetric} options=${metrics} />`}
            <div class="chart-card-head">
              <div class="big-value">${pts.length ? fmtY(lastV) : '—'}</div>
              ${pts.length > 1 && html`<${Delta} value=${pctChange(lastV, firstV)} />`}
            </div>
            <${LineChart} points=${pts} height=${180} formatY=${fmtY} formatX=${(x) => fmtShortDate(x, false)} emptyText="Aucune donnée sur cette période" />
            <div class="range-row">
              ${Object.keys(RANGES).map(
                (r) => html`<button class=${'chip small' + (range === r ? ' active' : '')} onClick=${() => setRange(r)}>
                  ${r === 'all' ? 'Tout' : r === '1y' ? '1 an' : r.replace('m', ' mois')}
                </button>`
              )}
            </div>
          </div>

          <div class="section-title"><h2>Historique</h2><span class="muted small">${history.length}</span></div>
          <div class="stack">
            ${[...history].reverse().map(
              (h) => html`<button class="card hist-row" onClick=${() => nav('/session/' + h.session.id)}>
                <div class="hist-row-head">
                  <b>${fmtRelDay(h.session.startedAt)}</b>
                  <span class="muted small">${h.session.name}</span>
                </div>
                <div class="hist-sets">
                  ${h.entry.sets.map((s) => html`<span class=${'hist-set' + (s.warmup ? ' warmup' : '')}>${histSet(s, type)}</span>`)}
                </div>
                <div class="muted small">${histSummary(h.m, type)}</div>
              </button>`
            )}
          </div>
        `}
  </div>`;
}

export function Records() {
  const items = practicedExercises()
    .map((x) => {
      const type = x.ex.type || 'weight';
      const [metric, rec] = mainRecord(x.records, type, x.history);
      return { ...x, type, metric, rec };
    })
    .filter((x) => x.rec)
    .sort((a, b) => b.rec.session.startedAt - a.rec.session.startedAt);
  const recentCut = Date.now() - 30 * DAY;
  return html`<div class="page records">
    <${TopBar} title="Mes records" onBack=${() => back('/profile')} />
    ${!items.length
      ? html`<${Empty} icon="trophy" title="Aucun record pour l'instant" text="Tes meilleures performances apparaîtront ici." />`
      : html`<div class="stack">
          ${items.map((x) => {
            const r = x.records;
            const isNew = x.rec.session.startedAt >= recentCut && x.count > 1;
            let value;
            if (x.metric === 'weight') value = html`<b>${fmtWeight(r.maxWeight.value)}</b><small>kg × ${r.maxWeight.reps}</small>`;
            else if (x.metric === 'reps') value = html`<b>${r.maxReps.value}</b><small>reps</small>`;
            else if (x.metric === 'distance') value = html`<b>${fmtNum(x.rec.value, 2)}</b><small>km</small>`;
            else value = html`<b>${fmtTimeSet(x.rec.value)}</b><small>durée</small>`;
            return html`<button class="card record-row" onClick=${() => nav('/exercise/' + x.exerciseId)}>
              <${MuscleThumb} muscle=${x.ex.muscle} secondary=${x.ex.secondary} size=${46} />
              <span class="record-row-text">
                <span>${x.ex.name} ${isNew && html`<span class="pr-badge">Récent</span>`}</span>
                <small>${fmtShortDate(x.rec.session.startedAt)}${x.metric === 'weight' && r.best1rm ? ` · 1RM est. ${fmtWeight(Math.round(r.best1rm.value))} kg` : ''}</small>
              </span>
              <span class="record-value">${value}</span>
            </button>`;
          })}
        </div>`}
  </div>`;
}
