// Statistiques : volume, séances, temps, répartition musculaire.
import { html, useState } from '../lib.js';
import { getData } from '../store.js';
import { Icon, nav, Segmented, Delta, Empty } from '../ui.js';
import { LineChart, ProgressBar } from '../charts.js';
import { BodyPair, MuscleThumb } from '../body.js';
import { MUSCLES, getExercise } from '../exercises.js';
import { summarize, sessionsBetween, volumeSeries, periodBounds, muscleSets, toLevels, workSets, isStrength } from '../stats.js';
import { fmtKg, fmtDuration, fmtNum, fmtShortDate, MONTHS_SHORT, pctChange, fmtTimeSet, fmtKm } from '../utils.js';

let lastRange = '7d';

export function Stats() {
  const [range, setRangeState] = useState(lastRange);
  const setRange = (r) => {
    lastRange = r;
    setRangeState(r);
  };
  const hasAny = getData().sessions.length > 0;

  const b = periodBounds(range);
  const cur = sessionsBetween(b.start, b.end);
  const prev = sessionsBetween(b.prevStart, b.prevEnd);
  const sc = summarize(cur),
    sp = summarize(prev);
  const series = volumeSeries(range);
  const counts = muscleSets(cur);
  const levels = toLevels(counts);
  const muscles = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  const maxM = muscles.length ? muscles[0][1] : 1;

  // exercices les plus travaillés sur la période
  const exCount = {};
  for (const s of cur) for (const e of s.exercises) if (isStrength(e)) exCount[e.exerciseId] = (exCount[e.exerciseId] || 0) + workSets(e).length;
  const topEx = Object.entries(exCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const delta = (c, p) => (c || p ? pctChange(c, p) : undefined);
  const prevLabel = range === '7d' ? 'vs 7 jours précédents' : range === '30d' ? 'vs 30 jours précédents' : 'vs 12 mois précédents';

  return html`<div class="page stats">
    <header class="page-head center"><h1>Statistiques</h1></header>
    <${Segmented}
      value=${range}
      onChange=${setRange}
      options=${[
        { value: '7d', label: '7j' },
        { value: '30d', label: '30j' },
        { value: '12m', label: '12 mois' },
      ]}
    />

    ${!hasAny
      ? html`<${Empty} icon="chart-no-axes-column" title="Pas encore de statistiques" text="Termine ta première séance pour voir tes progrès ici.">
          <button class="btn btn-dark" onClick=${() => nav('/new')}>Commencer une séance</button>
        <//>`
      : html`
          <div class="card volume-card">
            <div class="volume-card-head">
              <div>
                <div class="label">Volume total</div>
                <div class="big-value">${fmtKg(sc.volume)}</div>
                <${Delta} value=${delta(sc.volume, sp.volume)} />
              </div>
              <small class="muted">${prevLabel}</small>
            </div>
            <${LineChart}
              points=${series}
              height=${130}
              yLabels=${false}
              minZero
              formatY=${(v) => fmtKg(v)}
              formatX=${(x, i, tip) => {
                const d = new Date(x);
                return range === '12m' ? `${MONTHS_SHORT[d.getMonth()]}${tip ? ' ' + d.getFullYear() : ''}` : fmtShortDate(x, false);
              }}
            />
          </div>

          <div class="tiles-2">
            <div class="card stat-card">
              <div class="label">Séances</div>
              <div class="big-value">${sc.count}</div>
              <${Delta} value=${delta(sc.count, sp.count)} />
            </div>
            <div class="card stat-card">
              <div class="label">Temps total</div>
              <div class="big-value">${fmtDuration(sc.duration)}</div>
              <${Delta} value=${delta(sc.duration, sp.duration)} />
            </div>
            <div class="card stat-card">
              <div class="label">Séries</div>
              <div class="big-value">${fmtNum(sc.sets)}</div>
              <${Delta} value=${delta(sc.sets, sp.sets)} />
            </div>
            <div class="card stat-card">
              <div class="label">Calories est.</div>
              <div class="big-value">${fmtNum(sc.calories)}<small> kcal</small></div>
              <${Delta} value=${delta(sc.calories, sp.calories)} />
            </div>
          </div>

          ${(sc.cardioDuration > 0 || sc.cardioDistance > 0 || sp.cardioDuration > 0) &&
          html`<div class="card cardio-card">
            <span class="cardio-card-icon"><${Icon} name="activity" size=${24} /></span>
            <div class="cardio-card-text">
              <div class="label">Cardio</div>
              <div class="cardio-card-values">
                <b>${fmtTimeSet(sc.cardioDuration)}</b>
                ${sc.cardioDistance > 0 && html`<span>·</span><b>${fmtKm(sc.cardioDistance)}</b>`}
              </div>
            </div>
            <${Delta} value=${delta(sc.cardioDuration, sp.cardioDuration)} />
          </div>`}

          <div class="section-title"><h2>Groupes musculaires</h2><span class="muted small">séries</span></div>
          <div class="card muscles-stats">
            <${BodyPair} levels=${levels} height=${250} />
            ${muscles.length
              ? html`<div class="muscle-bars">
                  ${muscles.map(
                    ([m, v]) => html`<div class="muscle-bar">
                      <span>${MUSCLES[m].name}</span>
                      <${ProgressBar} value=${v / maxM} height=${6} />
                      <b>${fmtNum(v, 1)}</b>
                    </div>`
                  )}
                </div>`
              : html`<div class="muted small center">Aucune séance sur cette période.</div>`}
          </div>

          ${topEx.length > 0 &&
          html`<div class="section-title"><h2>Exercices les plus travaillés</h2></div>
            <div class="card list-card">
              ${topEx.map(([id, n]) => {
                const ex = getExercise(id);
                return html`<button class="list-row" onClick=${() => nav('/exercise/' + id)}>
                  <${MuscleThumb} muscle=${ex.muscle} secondary=${ex.secondary} size=${38} />
                  <span class="list-row-label"><span>${ex.name}</span><small>${n} série${n > 1 ? 's' : ''}</small></span>
                  <${Icon} name="chevron-right" size=${18} class="muted" />
                </button>`;
              })}
            </div>`}
        `}
  </div>`;
}

