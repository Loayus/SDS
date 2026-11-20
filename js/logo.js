// Logo SDS : monogramme « S » géométrique incliné, dégradé lavande → violet.
import { html } from './lib.js';

export const LOGO_PATH = 'M80,22 H38 Q29,22 29,31 V41 Q29,50 38,50 H62 Q71,50 71,59 V69 Q71,78 62,78 H20';

export function LogoMark({ size = 64, glow = false }) {
  return html`<svg class=${'logo-mark' + (glow ? ' glow' : '')} width=${size} height=${size} viewBox="0 0 100 100" aria-label="SDS">
    <defs>
      <linearGradient id="logoGrad" x1="0.1" y1="0" x2="0.9" y2="1">
        <stop offset="0" stop-color="#ece8ff" />
        <stop offset="0.45" stop-color="#b9adff" />
        <stop offset="1" stop-color="#6a55f0" />
      </linearGradient>
    </defs>
    <g transform="skewX(-14) translate(12 0)">
      <path d=${LOGO_PATH} fill="none" stroke="url(#logoGrad)" stroke-width="14" stroke-linejoin="round" />
    </g>
  </svg>`;
}

export function Wordmark() {
  return html`<div class="wordmark">S<span>D</span>S</div>`;
}
