// Composants partagés entre écrans.
import { html } from '../lib.js';
import { Icon, nav } from '../ui.js';
import { Body, cropFor } from '../body.js';
import { MUSCLES, getExercise } from '../exercises.js';
import { muscleSets, toLevels, sessionVolume, sessionSetCount, sessionCardio } from '../stats.js';
import { fmtRelDay, fmtDuration, fmtVolumeShort, fmtTime, fmtKm } from '../utils.js';

/** Vignette de séance : silhouette (face ou dos selon le muscle dominant). */
export function SessionThumb({ session, size = 58 }) {
  const counts = muscleSets([session]);
  const levels = toLevels(counts);
  let top = null,
    best = 0;
  for (const [m, v] of Object.entries(counts))
    if (v > best) {
      best = v;
      top = m;
    }
  if (!top) {
    return html`<div class="thumb thumb-icon session-thumb" style=${`width:${size}px;height:${size}px`}>
      <${Icon} name="activity" size=${Math.round(size * 0.5)} stroke=${1.8} />
    </div>`;
  }
  const side = MUSCLES[top].side;
  return html`<div class="thumb session-thumb" style=${`width:${size}px;height:${size}px`}>
    <${Body} side=${side} levels=${levels} gap="var(--thumb-bg)" crop=${cropFor(top)} />
  </div>`;
}

export function SessionCard({ session, showDate = true, onClick }) {
  return html`<button class="card session-card" onClick=${onClick || (() => nav('/session/' + session.id))}>
    <${SessionThumb} session=${session} />
    <span class="session-card-text">
      <span class="session-card-title">${session.name}</span>
      <small>
        ${showDate ? fmtRelDay(session.startedAt) : fmtTime(session.startedAt)} · ${fmtDuration(session.duration)}
      </small>
      <small class="dim">${sessionSummaryLine(session)}</small>
    </span>
    <${Icon} name="chevron-right" size=${20} class="muted" />
  </button>`;
}

/** « 5 exercices · 17 séries · 6,2 t · 20 min cardio » */
export function sessionSummaryLine(session) {
  const n = session.exercises.length;
  const sets = sessionSetCount(session);
  const parts = [`${n} exercice${n > 1 ? 's' : ''}`];
  if (sets) parts.push(`${sets} série${sets > 1 ? 's' : ''}`, fmtVolumeShort(sessionVolume(session)));
  const c = sessionCardio(session);
  if (c.duration || c.distance) parts.push(`${c.duration ? fmtDuration(c.duration) : fmtKm(c.distance)} cardio`);
  return parts.join(' · ');
}

export function StatTile({ icon, value, label, children, onClick }) {
  const Tag = onClick ? 'button' : 'div';
  return html`<${Tag} class="card stat-tile" onClick=${onClick}>
    ${icon && html`<${Icon} name=${icon} size=${20} />`}
    <div class="stat-value">${value}</div>
    <div class="stat-label">${label}</div>
    ${children}
  <//>`;
}

export function SectionTitle({ title, right, onClick }) {
  return html`<div class="section-title">
    <h2>${title}</h2>
    ${right && (onClick ? html`<button class="text-btn small" onClick=${onClick}>${right}</button>` : html`<span class="muted small">${right}</span>`)}
  </div>`;
}

export function exName(id) {
  return getExercise(id).name;
}
