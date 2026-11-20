// Silhouette musculaire (face / dos) en SVG, colorée selon l'intensité de travail.
import { html } from './lib.js';

// Demi-silhouette gauche : [muscle | null, tracé]. La moitié droite est obtenue par symétrie.
const FRONT = [
  ['traps', 'M90,58 C84,62 77,64 70,66 C78,67 86,68 94,70 L94,61 Z'],
  ['shoulders', 'M69,66 C59,66 51,72 48,82 C46,90 47,98 49,104 C52,98 56,93 60,90 C63,82 67,75 74,69 Z'],
  ['chest', 'M98.6,72 L98.6,104 C90,109 79,108 71,103 C66,99 63,95 62,91 C65,82 69,75 75,70 C83,68 91,69 98.6,72 Z'],
  ['biceps', 'M48,108 C46,118 46,129 48,138 C52,141 57,140 59,136 C62,126 62,112 61,94 C56,96 51,101 48,108 Z'],
  ['forearms', 'M47,143 C42,154 38,168 37,186 C39,190 43,191 46,189 C51,176 56,160 58,141 C54,144 50,145 47,143 Z'],
  [null, 'M37,193 C34,200 34,209 37,216 C40,220 44,219 45,214 C46,206 46,199 46,193 Z'],
  ['abs', 'M89,108 h9.6 v16 h-9.6 Z'],
  ['abs', 'M89,126.5 h9.6 v16 h-9.6 Z'],
  ['abs', 'M89,145 h9.6 v16 h-9.6 Z'],
  ['abs', 'M89,163.5 L98.6,163.5 L98.6,191 C94,189 91,183 89,175 Z'],
  ['obliques', 'M72,106 C78,110 83,111 86.5,111 L86.5,170 C82,174 77,178 72,180 C69,162 69,132 72,106 Z'],
  [null, 'M72,183 C78,181 84,177 87.5,174 C90,182 94,189 98.6,194 L98.6,201 C88,200 78,196 70,191 Z'],
  ['quads', 'M70,194 C64,212 63,240 68,263 C71,270 75,272 79,270 C82,250 86,226 90,205 C83,203 76,199 70,194 Z'],
  ['quads', 'M91,206 C87,227 83,250 81,271 C86,278 92,277 94.5,269 C96.5,252 96.5,232 95,214 C94,211 92.5,208 91,206 Z'],
  ['adductors', 'M95.5,204 C97,206 98.6,208 98.6,210 L98.6,246 C97.8,238 97,226 96.2,215 Z'],
  [null, 'M78,274 C76,280 77,286 80,290 C84,292 88,291 90,287 C92,282 92,277 91,273 C87,277 82,277 78,274 Z'],
  ['calves', 'M75,292 C70,310 71,332 75,354 C78,360 82,360 84,355 C86,334 89,313 88.5,294 C84,297 79,297 75,292 Z'],
  [null, 'M76,361 C75,370 74,378 72,386 C71,392 74,395 80,395 L89,395 C91,390 90,382 88,374 C87,368 86,362 85,359 Z'],
];

const BACK = [
  ['traps', 'M98.6,47 L93,48 C89,56 80,61 69,65 C79,70 88,80 93,96 L98.6,115 Z'],
  ['shoulders', 'M68,66 C58,66 50,72 47,82 C45,90 46,98 48,104 C52,98 56,92 60,88 C64,80 67,74 71,69 Z'],
  ['back', 'M72,70 C80,75 86,83 90.5,95 C84,98 76,98 68,95 C64,88 64,80 66.5,74 Z'],
  ['back', 'M66,99 C74,101 84,101 92,99 L94.5,120 L92,150 C88,158 83,164 77,168 C73,148 68,124 66,99 Z'],
  ['lowerback', 'M95.5,121 L98.6,121 L98.6,186 L88,186 C88,174 90,161 92.8,151 Z'],
  ['triceps', 'M47,107 C45,118 46,130 48,140 C52,142 56,141 58,137 C61,125 61,111 60,93 C55,96 50,101 47,107 Z'],
  ['forearms', 'M47,144 C42,155 38,168 37,186 C39,190 43,191 46,189 C51,176 56,160 58,142 C54,145 50,146 47,144 Z'],
  [null, 'M37,193 C34,200 34,209 37,216 C40,220 44,219 45,214 C46,206 46,199 46,193 Z'],
  [null, 'M72,171 C74,176 76,180 77,183 L87,185 C87,176 88.5,166 90.5,157 C87,162 82,166 77,169 Z'],
  ['glutes', 'M72,186 C67,197 67,212 72,223 C80,230 91,230 98.6,225 L98.6,189 C90,188 81,187 72,186 Z'],
  ['hamstrings', 'M70,227 C66,245 67,263 71,277 C75,282 79,280 81,274 L84.5,233 C79,233 74,231 70,227 Z'],
  ['hamstrings', 'M86,233 L82.5,274 C86,281 92,279 95,272 C98,258 98,242 97,229 C93,232 89.5,233.5 86,233 Z'],
  [null, 'M73,281 C76,287 80,290 84,290 C88,290 92,287 94,282 C88,279.5 79,279.5 73,281 Z'],
  ['calves', 'M74,292 C68,306 68,323 73,339 C77,345 81,344 84,338 L85.5,298 C82,300 78,298 74,292 Z'],
  ['calves', 'M87,298 L85.5,338 C87,346 92,344 93.5,336 C96,319 95,303 91,293 C89.5,296 88.5,297.5 87,298 Z'],
  [null, 'M76.5,343 C76.5,353 78,363 80,370 L88,370 C88,361 89,351 91,340 C88,346 82,347.5 76.5,343 Z'],
  [null, 'M79,372 C77,380 76,388 78,394 L90,394 C91,388 90,380 89,372 Z'],
];

const HEAD = 'M100,10.5 C109,10.5 115.5,18 115.5,29 C115.5,40 108.5,49 100,49 C91.5,49 84.5,40 84.5,29 C84.5,18 91,10.5 100,10.5 Z';
const NECK = 'M93,45 C93,51 92,55 90,59.5 L110,59.5 C108,55 107,51 107,45 Z';

const BASE = [42, 42, 51];
const NONMUSCLE = '#1e1e25';
const HI_LOW = [92, 76, 230];
const HI_HIGH = [178, 164, 255];

function mix(a, b, t) {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t));
}

function colorFor(level) {
  if (!level || level <= 0) return `rgb(${BASE.join(',')})`;
  const l = Math.min(1, level);
  // de violet profond à lavande lumineux
  const c = l < 0.5 ? mix(BASE, HI_LOW, 0.55 + l) : mix(HI_LOW, HI_HIGH, (l - 0.5) * 2);
  return `rgb(${c.join(',')})`;
}

function Half({ parts, levels, mirror }) {
  return html`<g transform=${mirror ? 'translate(200 0) scale(-1 1)' : undefined}>
    ${parts.map(([m, d]) => {
      const lvl = m ? levels[m] || 0 : 0;
      return html`<path d=${d} fill=${m ? colorFor(lvl) : NONMUSCLE} class=${lvl > 0 ? 'hot' : ''} />`;
    })}
  </g>`;
}

/**
 * Silhouette.
 * @param side 'front' | 'back'
 * @param levels { muscleId: 0..1 }
 * @param gap couleur des séparations (celle du fond)
 */
// Cadrages pour les vignettes (zoom sur la zone travaillée)
const CROPS = {
  full: '28 6 144 394',
  upper: '34 34 132 132',
  core: '52 84 96 96',
  hips: '44 150 112 112',
  lower: '44 168 112 112',
  calves: '50 258 100 100',
  arm: '32 50 136 136',
  forearm: '28 84 144 144',
};
const CROP_OF = {
  chest: 'upper', shoulders: 'upper', biceps: 'arm', triceps: 'arm', forearms: 'forearm', back: 'upper', traps: 'upper',
  abs: 'core', obliques: 'core', lowerback: 'core',
  glutes: 'hips', hamstrings: 'lower', quads: 'lower', adductors: 'lower',
  calves: 'calves',
};
export const cropFor = (muscle) => CROP_OF[muscle] || 'full';

export function Body({ side = 'front', levels = {}, gap = 'var(--surface)', class: cls = '', style, crop = 'full' }) {
  const parts = side === 'back' ? BACK : FRONT;
  return html`<svg class=${'body-svg ' + cls + (crop !== 'full' ? ' cropped' : '')} viewBox=${CROPS[crop] || CROPS.full} style=${style} role="img" aria-label=${side === 'back' ? 'Silhouette de dos' : 'Silhouette de face'}>
    <g stroke=${gap} stroke-width="1.6" stroke-linejoin="round">
      <path d=${HEAD} fill=${NONMUSCLE} />
      <path d=${NECK} fill=${side === 'back' ? colorFor(levels.traps ? levels.traps * 0.6 : 0) : NONMUSCLE} />
      <${Half} parts=${parts} levels=${levels} />
      <${Half} parts=${parts} levels=${levels} mirror />
    </g>
  </svg>`;
}

/** Face + dos côte à côte. */
export function BodyPair({ levels = {}, gap, height = 220 }) {
  return html`<div class="body-pair" style=${`height:${height}px`}>
    <${Body} side="front" levels=${levels} gap=${gap} />
    <${Body} side="back" levels=${levels} gap=${gap} />
  </div>`;
}

/** Vignette d'exercice : silhouette du côté du muscle principal. */
export function MuscleThumb({ muscle, secondary = [], side, size = 46 }) {
  const levels = { [muscle]: 1 };
  for (const m of secondary) levels[m] = Math.max(levels[m] || 0, 0.3);
  const s = side || (['triceps', 'back', 'traps', 'lowerback', 'hamstrings', 'glutes', 'calves'].includes(muscle) ? 'back' : 'front');
  return html`<div class="thumb" style=${`width:${size}px;height:${size}px`}>
    <${Body} side=${s} levels=${levels} gap="var(--thumb-bg)" crop=${cropFor(muscle)} />
  </div>`;
}
