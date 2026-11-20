// Composants partagés entre écrans.
import { html } from '../lib.js';
import { Icon, nav } from '../ui.js';
import { Body, cropFor } from '../body.js';
import { MUSCLES, getExercise } from '../exercises.js';
import { muscleSets, toLevels, sessionVolume, sessionSetCount } from '../stats.js';
import { fmtRelDay, fmtDuration, fmtVolumeShort, fmtTime } from '../utils.js';

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
  const side = top ? MUSCLES[top].side : 'front';
  return html`<div class="thumb session-thumb" style=${`width:${size}px;height:${size}px`}>
    <${Body} side=${side} levels=${levels} gap="var(--thumb-bg)" crop=${cropFor(top)} />
  </div>`;
}

export function SessionCard({ session, showDate = true, onClick }) {
  const ex = session.exercises.length;
  return html`<button class="card session-card" onClick=${onClick || (() => nav('/session/' + session.id))}>
    <${SessionThumb} session=${session} />
    <span class="session-card-text">
      <span class="session-card-title">${session.name}</span>
      <small>
        ${showDate ? fmtRelDay(session.startedAt) : fmtTime(session.startedAt)} · ${fmtDuration(session.duration)}
      </small>
      <small class="dim">${ex} exercice${ex > 1 ? 's' : ''} · ${sessionSetCount(session)} séries · ${fmtVolumeShort(sessionVolume(session))}</small>
    </span>
    <${Icon} name="chevron-right" size=${20} class="muted" />
  </button>`;
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
