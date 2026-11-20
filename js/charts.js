// Graphiques SVG légers (courbe lissée, histogramme, sparkline).
import { html, useRef, useState } from './lib.js';
import { useWidth } from './ui.js';

let gradSeq = 0;

/** Tracé cubique monotone (Fritsch–Carlson) : courbe douce sans dépassement. */
export function monotonePath(pts) {
  const n = pts.length;
  if (!n) return '';
  if (n === 1) return `M${pts[0][0]},${pts[0][1]}`;
  if (n === 2) return `M${pts[0][0]},${pts[0][1]}L${pts[1][0]},${pts[1][1]}`;
  const dx = [],
    m = [],
    t = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1][0] - pts[i][0];
    const dy = pts[i + 1][1] - pts[i][1];
    m[i] = dx[i] ? dy / dx[i] : 0;
  }
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i] / m[i],
      b = t[i + 1] / m[i],
      s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      t[i] = k * a * m[i];
      t[i + 1] = k * b * m[i];
    }
  }
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${(pts[i][0] + h).toFixed(1)},${(pts[i][1] + t[i] * h).toFixed(1)} ${(pts[i + 1][0] - h).toFixed(1)},${(pts[i + 1][1] - t[i + 1] * h).toFixed(1)} ${pts[i + 1][0].toFixed(1)},${pts[i + 1][1].toFixed(1)}`;
  }
  return d;
}

/**
 * Courbe avec aire dégradée.
 * points: [{ x, y }] (x numérique, croissant)
 */
export function LineChart({
  points,
  height = 160,
  formatY = (v) => v,
  formatX = () => '',
  xLabels = true,
  yLabels = true,
  interactive = true,
  minZero = false,
  emptyText = 'Pas encore de données',
}) {
  const ref = useRef();
  const width = useWidth(ref);
  const [sel, setSel] = useState(null);
  const [gid] = useState(() => 'g' + ++gradSeq);

  if (!points || !points.length) {
    return html`<div ref=${ref} class="chart chart-empty" style=${`height:${height}px`}>${emptyText}</div>`;
  }

  const padT = 26,
    padB = xLabels ? 24 : 6,
    padL = 6,
    padR = yLabels ? 60 : 6;
  const W = width,
    H = height;
  const xs = points.map((p) => p.x),
    ys = points.map((p) => p.y);
  let x0 = Math.min(...xs),
    x1 = Math.max(...xs);
  let y0 = minZero ? 0 : Math.min(...ys),
    y1 = Math.max(...ys);
  if (x0 === x1) {
    x0 -= 1;
    x1 += 1;
  }
  if (y0 === y1) {
    y0 = y0 - (Math.abs(y0) * 0.1 || 1);
    y1 = y1 + (Math.abs(y1) * 0.1 || 1);
  } else if (!minZero) {
    const pad = (y1 - y0) * 0.12;
    y0 -= pad;
    y1 += pad;
    if (Math.min(...ys) >= 0 && y0 < 0) y0 = 0;
  }
  const sx = (x) => padL + ((x - x0) / (x1 - x0)) * (W - padL - padR);
  const sy = (y) => padT + (1 - (y - y0) / (y1 - y0)) * (H - padT - padB);
  const pts = points.map((p) => [sx(p.x), sy(p.y)]);
  const line = monotonePath(pts);
  const area = `${line}L${pts[pts.length - 1][0].toFixed(1)},${H - padB}L${pts[0][0].toFixed(1)},${H - padB}Z`;
  const last = pts[pts.length - 1];
  const active = sel != null ? sel : null;

  const onPointer = (e) => {
    if (!interactive) return;
    const r = ref.current.getBoundingClientRect();
    const x = e.clientX - r.left;
    let best = 0,
      bd = Infinity;
    pts.forEach((p, i) => {
      const d = Math.abs(p[0] - x);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    setSel(best);
  };

  const yMaxLabel = Math.max(...ys);
  const yMinLabel = Math.min(...ys);

  return html`<div
    ref=${ref}
    class="chart"
    style=${`height:${height}px`}
    onPointerDown=${onPointer}
    onPointerMove=${(e) => e.buttons || e.pointerType === 'touch' ? onPointer(e) : null}
    onPointerLeave=${() => setSel(null)}
  >
    <svg width=${W} height=${H} viewBox=${`0 0 ${W} ${H}`}>
      <defs>
        <linearGradient id=${gid + 'a'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#7d6bff" stop-opacity="0.38" />
          <stop offset="1" stop-color="#7d6bff" stop-opacity="0" />
        </linearGradient>
        <linearGradient id=${gid + 'l'} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#5b49e8" />
          <stop offset="1" stop-color="#b3a6ff" />
        </linearGradient>
      </defs>
      ${yLabels &&
      html`<g class="chart-grid">
        <line x1=${padL} x2=${W - padR + 8} y1=${sy(yMaxLabel)} y2=${sy(yMaxLabel)} />
        <line x1=${padL} x2=${W - padR + 8} y1=${sy(yMinLabel)} y2=${sy(yMinLabel)} />
        <text x=${W - 2} y=${sy(yMaxLabel) + 4} text-anchor="end">${formatY(yMaxLabel)}</text>
        ${yMaxLabel !== yMinLabel && html`<text x=${W - 2} y=${sy(yMinLabel) + 4} text-anchor="end">${formatY(yMinLabel)}</text>`}
      </g>`}
      <path d=${area} fill=${`url(#${gid}a)`} />
      <path d=${line} fill="none" stroke=${`url(#${gid}l)`} stroke-width="2.5" stroke-linecap="round" />
      ${points.length <= 40 &&
      pts.map((p, i) => html`<circle cx=${p[0]} cy=${p[1]} r=${i === pts.length - 1 ? 0 : 2.2} fill="#9d8fff" opacity="0.7" />`)}
      <circle cx=${last[0]} cy=${last[1]} r="4.5" fill="#c4baff" class="chart-last" />
      ${xLabels &&
      html`<g class="chart-x">
        <text x=${pts[0][0]} y=${H - 6} text-anchor="start">${formatX(points[0].x, 0)}</text>
        ${points.length > 1 && html`<text x=${last[0]} y=${H - 6} text-anchor="end">${formatX(points[points.length - 1].x, points.length - 1)}</text>`}
      </g>`}
      ${active != null &&
      html`<g class="chart-sel">
        <line x1=${pts[active][0]} x2=${pts[active][0]} y1=${padT - 6} y2=${H - padB} />
        <circle cx=${pts[active][0]} cy=${pts[active][1]} r="5" />
      </g>`}
    </svg>
    ${active != null &&
    html`<div
      class="chart-tip"
      style=${`left:${Math.min(Math.max(pts[active][0], 60), W - 60)}px`}
    >
      <b>${formatY(points[active].y)}</b>
      <span>${formatX(points[active].x, active, true)}</span>
    </div>`}
  </div>`;
}

/** Petit histogramme vertical (tendance hebdomadaire). */
export function MiniBars({ values, height = 64, barWidth = 7, gap = 6 }) {
  const max = Math.max(1, ...values);
  const W = values.length * (barWidth + gap) - gap;
  return html`<svg class="mini-bars" width=${W} height=${height} viewBox=${`0 0 ${W} ${height}`} aria-hidden="true">
    <defs>
      <linearGradient id="mbg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.95" />
        <stop offset="1" stop-color="#ffffff" stop-opacity="0.25" />
      </linearGradient>
    </defs>
    ${values.map((v, i) => {
      const h = Math.max(6, (v / max) * (height - 2));
      const lastOne = i === values.length - 1;
      return html`<rect
        x=${i * (barWidth + gap)}
        y=${height - h}
        width=${barWidth}
        height=${h}
        rx=${barWidth / 2}
        fill=${lastOne ? 'url(#mbg)' : 'rgba(255,255,255,' + (0.12 + (0.25 * i) / values.length) + ')'}
      />`;
    })}
  </svg>`;
}

/** Sparkline compacte. */
export function Sparkline({ values, width = 72, height = 28 }) {
  if (!values || values.length < 2) return html`<svg width=${width} height=${height}></svg>`;
  const min = Math.min(...values),
    max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [2 + (i / (values.length - 1)) * (width - 4), 3 + (1 - (v - min) / span) * (height - 6)]);
  const up = values[values.length - 1] >= values[0];
  return html`<svg class="sparkline" width=${width} height=${height} viewBox=${`0 0 ${width} ${height}`} aria-hidden="true">
    <path d=${monotonePath(pts)} fill="none" stroke=${up ? '#a99bff' : '#71717a'} stroke-width="2" stroke-linecap="round" />
    <circle cx=${pts[pts.length - 1][0]} cy=${pts[pts.length - 1][1]} r="2.6" fill=${up ? '#c4baff' : '#a1a1aa'} />
  </svg>`;
}

/** Barre de progression horizontale. */
export function ProgressBar({ value, height = 6 }) {
  const v = Math.max(0, Math.min(1, value || 0));
  return html`<div class="progress" style=${`height:${height}px`}>
    <div style=${`width:${(v * 100).toFixed(1)}%`}></div>
  </div>`;
}
