// Progression par exercice, détail d'un exercice, records.
import { html, useState } from '../lib.js';
import { Icon, nav, back, TopBar, Segmented, Empty, Delta } from '../ui.js';
import { LineChart, Sparkline } from '../charts.js';
import { MuscleThumb, BodyPair } from '../body.js';
import { getExercise, MUSCLES, EQUIPMENT } from '../exercises.js';
import { practicedExercises, exerciseHistory, recordsFrom } from '../stats.js';
import { fmtWeight, fmtKg, fmtNum, fmtShortDate, fmtAgo, fmtRelDay, norm, pctChange, DAY } from '../utils.js';

const metricOf = (m, metric) => (metric === '1rm' ? m.best1rm : metric === 'volume' ? m.volume : metric === 'reps' ? m.maxReps : m.maxWeight);

/** Métrique la plus pertinente : charge si l'exercice est chargé, sinon répétitions. */
function defaultMetric(history) {
  return history.some((h) => h.m.maxWeight > 0) ? 'weight' : 'reps';
}

let listQuery = '';
let listSort = 'recent';

export function ProgressList() {
  const [q, setQState] = useState(listQuery);
  const [sort, setSortState] = useState(listSort);
  const setQ = (v) => ((listQuery = v), setQState(v));
  const setSort = (v) => ((listSort = v), setSortState(v));

  let items = practicedExercises();
  const nq = norm(q.trim());
  if (nq) items = items.filter((x) => norm(x.ex.name).includes(nq) || norm(MUSCLES[x.ex.muscle]?.name).includes(nq));
  if (sort === 'recent') items.sort((a, b) => b.last.session.startedAt - a.last.session.startedAt);
  if (sort === 'count') items.sort((a, b) => b.count - a.count);
  if (sort === 'name') items.sort((a, b) => a.ex.name.localeCompare(b.ex.name, 'fr'));

  return html`<div class="page progress-list">
    <${TopBar} title="Progression" onBack=${() => back('/profile')} />
    ${!practicedExercises().length
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
              const metric = defaultMetric(x.history);
              const values = x.history.map((h) => metricOf(h.m, metric));
              const first = values[0],
                lastV = values[values.length - 1];
              const best = metric === 'weight' ? x.records.maxWeight : x.records.maxReps;
              return html`<button key=${x.exerciseId} class="card progress-row" onClick=${() => nav('/exercise/' + x.exerciseId)}>
                <${MuscleThumb} muscle=${x.ex.muscle} secondary=${x.ex.secondary} size=${48} />
                <span class="progress-row-text">
                  <span>${x.ex.name}</span>
                  <small>${x.count} séance${x.count > 1 ? 's' : ''} · ${fmtAgo(x.last.session.startedAt)}</small>
                  <small class="dim">
                    Record : ${best ? (metric === 'weight' ? `${fmtWeight(best.value)} kg` : `${best.value} reps`) : '—'}
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

export function ExerciseDetail({ id }) {
  const ex = getExercise(id);
  const history = exerciseHistory(id);
  const [metric, setMetricState] = useState(detailMetric[id] || defaultMetric(history));
  const [range, setRangeState] = useState(detailRange);
  const setMetric = (v) => ((detailMetric[id] = v), setMetricState(v));
  const setRange = (v) => ((detailRange = v), setRangeState(v));

  const rec = recordsFrom(history);
  const cutoff = Date.now() - RANGES[range] * DAY;
  const pts = history.filter((h) => h.session.startedAt >= cutoff).map((h) => ({ x: h.session.startedAt, y: metricOf(h.m, metric) }));
  const fmtY = (v) => (metric === 'reps' ? `${fmtNum(v)} reps` : metric === 'volume' ? fmtKg(v) : `${fmtWeight(Math.round(v * 10) / 10)} kg`);
  const levels = { [ex.muscle]: 1 };
  for (const m of ex.secondary || []) levels[m] = 0.35;

  const firstV = pts.length ? pts[0].y : 0;
  const lastV = pts.length ? pts[pts.length - 1].y : 0;

  return html`<div class="page exercise-detail">
    <${TopBar} title=${ex.name} onBack=${() => back('/progress')} />

    <div class="card ex-hero">
      <div class="ex-hero-text">
        <div class="label">${MUSCLES[ex.muscle]?.name}</div>
        <div class="muted small">${[...(ex.secondary || []).map((m) => MUSCLES[m]?.name)].join(', ') || 'Isolation'}</div>
        <div class="muted small">${EQUIPMENT[ex.equipment] || ''}${ex.custom ? ' · Perso' : ''}</div>
        <div class="ex-hero-count"><b>${history.length}</b> séance${history.length > 1 ? 's' : ''}</div>
      </div>
      <${BodyPair} levels=${levels} height=${130} />
    </div>

    ${!history.length
      ? html`<${Empty} icon="chart-line" title="Pas encore réalisé" text="Ajoute cet exercice à une séance pour suivre ta progression." />`
      : html`
          <div class="tiles-2">
            <div class="card record-tile">
              <small>Charge max</small>
              <b>${rec.maxWeight ? `${fmtWeight(rec.maxWeight.value)} kg` : '—'}</b>
              <em>${rec.maxWeight ? `× ${rec.maxWeight.reps} · ${fmtShortDate(rec.maxWeight.session.startedAt)}` : 'Poids du corps'}</em>
            </div>
            <div class="card record-tile">
              <small>1RM estimé</small>
              <b>${rec.best1rm ? `${fmtWeight(Math.round(rec.best1rm.value * 10) / 10)} kg` : '—'}</b>
              <em>${rec.best1rm ? fmtShortDate(rec.best1rm.session.startedAt) : ''}</em>
            </div>
            <div class="card record-tile">
              <small>Volume max (séance)</small>
              <b>${rec.maxVolume ? fmtKg(rec.maxVolume.value) : '—'}</b>
              <em>${rec.maxVolume ? fmtShortDate(rec.maxVolume.session.startedAt) : ''}</em>
            </div>
            <div class="card record-tile">
              <small>Reps max (série)</small>
              <b>${rec.maxReps ? rec.maxReps.value : '—'}</b>
              <em>${rec.maxReps ? fmtShortDate(rec.maxReps.session.startedAt) : ''}</em>
            </div>
          </div>

          <div class="card chart-card">
            <${Segmented}
              small
              value=${metric}
              onChange=${setMetric}
              options=${[
                { value: 'weight', label: 'Charge' },
                { value: '1rm', label: '1RM' },
                { value: 'volume', label: 'Volume' },
                { value: 'reps', label: 'Reps' },
              ]}
            />
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
                  ${h.entry.sets.map(
                    (s) => html`<span class=${'hist-set' + (s.warmup ? ' warmup' : '')}>
                      ${s.weight ? fmtWeight(s.weight) : 'PDC'}×${s.reps}${(s.drops || []).map((d) => html`<em> ↘ ${d.weight ? fmtWeight(d.weight) : 'PDC'}×${d.reps}</em>`)}
                    </span>`
                  )}
                </div>
                <div class="muted small">
                  ${h.m.maxWeight ? `Max ${fmtWeight(h.m.maxWeight)} kg · ` : ''}1RM ${fmtWeight(Math.round(h.m.best1rm * 10) / 10)} kg · ${fmtKg(h.m.volume)}
                </div>
              </button>`
            )}
          </div>
        `}
  </div>`;
}

export function Records() {
  const items = practicedExercises()
    .filter((x) => x.records.maxWeight || x.records.maxReps)
    .sort((a, b) => {
      const ta = Math.max(a.records.maxWeight?.session.startedAt || 0, a.records.best1rm?.session.startedAt || 0);
      const tb = Math.max(b.records.maxWeight?.session.startedAt || 0, b.records.best1rm?.session.startedAt || 0);
      return tb - ta;
    });
  const recentCut = Date.now() - 30 * DAY;
  return html`<div class="page records">
    <${TopBar} title="Mes records" onBack=${() => back('/profile')} />
    ${!items.length
      ? html`<${Empty} icon="trophy" title="Aucun record pour l'instant" text="Tes meilleures performances apparaîtront ici." />`
      : html`<div class="stack">
          ${items.map((x) => {
            const r = x.records;
            const main = r.maxWeight || r.maxReps;
            const isNew = main && main.session.startedAt >= recentCut && x.count > 1;
            return html`<button class="card record-row" onClick=${() => nav('/exercise/' + x.exerciseId)}>
              <${MuscleThumb} muscle=${x.ex.muscle} secondary=${x.ex.secondary} size=${46} />
              <span class="record-row-text">
                <span>${x.ex.name} ${isNew && html`<span class="pr-badge">Récent</span>`}</span>
                <small>${fmtShortDate(main.session.startedAt)}${r.best1rm && r.maxWeight ? ` · 1RM est. ${fmtWeight(Math.round(r.best1rm.value))} kg` : ''}</small>
              </span>
              <span class="record-value">
                ${r.maxWeight ? html`<b>${fmtWeight(r.maxWeight.value)}</b><small>kg × ${r.maxWeight.reps}</small>` : html`<b>${r.maxReps.value}</b><small>reps</small>`}
              </span>
            </button>`;
          })}
        </div>`}
  </div>`;
}

