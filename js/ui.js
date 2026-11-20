// Composants d'interface partagés, navigation, feuilles modales, toasts.
import { html, useState, useEffect, useRef } from './lib.js';
import { ICONS } from './icons.js';
import { fmtNum } from './utils.js';

// ---------------------------------------------------------------------------
// Icônes

export function Icon({ name, size = 22, stroke = 2, class: cls = '', fill = 'none' }) {
  return html`<svg
    class=${'icon ' + cls}
    width=${size}
    height=${size}
    viewBox="0 0 24 24"
    fill=${fill}
    stroke="currentColor"
    stroke-width=${stroke}
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    dangerouslySetInnerHTML=${{ __html: ICONS[name] || '' }}
  ></svg>`;
}

// ---------------------------------------------------------------------------
// Navigation (routes en #/chemin)
// La profondeur de navigation interne est stockée dans history.state :
// « retour » ne revient en arrière que dans les pages ouvertes par l'app.

let goingBack = false;
const scrollMem = {};
const ROUTE_EVENT = 'sds:route';

export function currentPath() {
  const h = location.hash.replace(/^#/, '');
  return h || '/';
}

export function parseRoute(hash = location.hash) {
  const raw = hash.replace(/^#/, '') || '/';
  const [path, qs] = raw.split('?');
  const parts = path.split('/').filter(Boolean);
  const query = Object.fromEntries(new URLSearchParams(qs || ''));
  return { raw, path, parts, query };
}

const idx = () => (history.state && history.state.sdsIdx) || 0;

function go(path, state, replace) {
  scrollMem[currentPath()] = window.scrollY;
  goingBack = false;
  const url = location.pathname + location.search + '#' + path;
  if (replace) history.replaceState(state, '', url);
  else history.pushState(state, '', url);
  window.dispatchEvent(new Event(ROUTE_EVENT));
}

export function nav(path, { replace = false } = {}) {
  go(path, { sdsIdx: replace ? idx() : idx() + 1 }, replace);
}

/** Navigation « racine » (onglets) : remplace l'entrée courante. */
export function navRoot(path) {
  go(path, { sdsIdx: 0 }, true);
}

export function back(fallback = '/') {
  scrollMem[currentPath()] = window.scrollY;
  goingBack = true;
  if (idx() > 0) history.back();
  else {
    history.replaceState({ sdsIdx: 0 }, '', location.pathname + location.search + '#' + fallback);
    window.dispatchEvent(new Event(ROUTE_EVENT));
  }
}

/** Restaure le défilement après un retour, sinon remonte en haut. */
export function restoreScroll(path) {
  const y = goingBack ? scrollMem[path] || 0 : 0;
  goingBack = false;
  window.scrollTo(0, y);
  // second passage : le contenu peut s'allonger après le premier rendu
  if (y) requestAnimationFrame(() => window.scrollTo(0, y));
}

export function useRoute() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const f = () => setHash(location.hash);
    const pop = () => {
      goingBack = true;
      f();
    };
    window.addEventListener('hashchange', f);
    window.addEventListener('popstate', pop);
    window.addEventListener(ROUTE_EVENT, f);
    return () => {
      window.removeEventListener('hashchange', f);
      window.removeEventListener('popstate', pop);
      window.removeEventListener(ROUTE_EVENT, f);
    };
  }, []);
  return parseRoute(hash);
}

// ---------------------------------------------------------------------------
// Petits hooks

/** Re-rendu périodique (chronomètres). */
export function useNow(interval = 1000, enabled = true) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setNow(Date.now()), interval);
    const vis = () => setNow(Date.now());
    document.addEventListener('visibilitychange', vis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', vis);
    };
  }, [interval, enabled]);
  return now;
}

/** Largeur d'un élément (graphiques responsives). */
export function useWidth(ref, initial = 320) {
  const [w, setW] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setW(Math.max(100, Math.round(el.getBoundingClientRect().width)));
    update();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(update);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return w;
}

// ---------------------------------------------------------------------------
// Retours sensoriels (haptique iOS 18+, son, écran allumé)

let hapticEl = null;
export function haptic() {
  try {
    if (navigator.vibrate) {
      navigator.vibrate(12);
      return;
    }
    if (!hapticEl) {
      hapticEl = document.createElement('label');
      hapticEl.setAttribute('aria-hidden', 'true');
      hapticEl.style.display = 'none';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('switch', '');
      hapticEl.appendChild(input);
      document.body.appendChild(hapticEl);
    }
    hapticEl.click();
  } catch {}
}

let audioCtx = null;
export function unlockAudio() {
  try {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  } catch {}
}

export function beep() {
  try {
    if (!audioCtx) return;
    const t = audioCtx.currentTime + 0.02;
    [0, 0.2, 0.4].forEach((d, i) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.value = i === 2 ? 1320 : 880;
      g.gain.setValueAtTime(0.0001, t + d);
      g.gain.exponentialRampToValueAtTime(0.35, t + d + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.16);
      o.connect(g).connect(audioCtx.destination);
      o.start(t + d);
      o.stop(t + d + 0.18);
    });
  } catch {}
}

let wakeLock = null;
let wantAwake = false;
export async function keepAwake(on) {
  wantAwake = on;
  try {
    if (on && 'wakeLock' in navigator && !wakeLock && document.visibilityState === 'visible') {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => (wakeLock = null));
    } else if (!on && wakeLock) {
      const l = wakeLock;
      wakeLock = null;
      await l.release();
    }
  } catch {
    wakeLock = null;
  }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && wantAwake) keepAwake(true);
});

// ---------------------------------------------------------------------------
// Couches modales (feuilles d'actions, confirmations, saisies, écrans plein)

let overlays = [];
const overlaySubs = new Set();
let overlaySeq = 0;

function setOverlays(next) {
  overlays = next;
  overlaySubs.forEach((f) => f());
  document.documentElement.classList.toggle('has-overlay', overlays.some((o) => !o.closing));
}

/** Ouvre un composant en surcouche. Renvoie une promesse résolue à la fermeture. */
export function openOverlay(Comp, props = {}, { kind = 'sheet' } = {}) {
  return new Promise((resolve) => {
    const id = ++overlaySeq;
    setOverlays([...overlays, { id, Comp, props, kind, resolve, closing: false }]);
  });
}

function closeOverlay(id, value) {
  const o = overlays.find((x) => x.id === id);
  if (!o || o.closing) return;
  o.resolve(value);
  setOverlays(overlays.map((x) => (x.id === id ? { ...x, closing: true } : x)));
  setTimeout(() => setOverlays(overlays.filter((x) => x.id !== id)), 240);
}

export function closeAllOverlays() {
  for (const o of overlays) closeOverlay(o.id, undefined);
}

export function OverlayHost() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const f = () => setTick((t) => t + 1);
    overlaySubs.add(f);
    return () => overlaySubs.delete(f);
  }, []);
  return html`${overlays.map(
    (o) => html`<div key=${o.id} class=${'overlay overlay-' + o.kind + (o.closing ? ' closing' : '')}>
      ${o.kind !== 'screen' && html`<div class="overlay-backdrop" onClick=${() => closeOverlay(o.id, undefined)}></div>`}
      <${o.Comp} ...${o.props} close=${(v) => closeOverlay(o.id, v)} />
    </div>`
  )}`;
}

/** Feuille d'actions iOS. actions: [{ label, icon, danger, value }] */
export function actionSheet({ title, message, actions }) {
  return openOverlay(ActionSheet, { title, message, actions });
}

function ActionSheet({ title, message, actions, close }) {
  return html`<div class="sheet" role="dialog" aria-label=${title || 'Actions'}>
    <div class="sheet-grabber"></div>
    ${(title || message) &&
    html`<div class="sheet-head">
      ${title && html`<div class="sheet-title">${title}</div>`}
      ${message && html`<div class="sheet-msg">${message}</div>`}
    </div>`}
    <div class="sheet-actions">
      ${actions.map(
        (a) => html`<button
          class=${'sheet-action' + (a.danger ? ' danger' : '') + (a.disabled ? ' disabled' : '')}
          disabled=${a.disabled}
          onClick=${() => close(a.value !== undefined ? a.value : a.label)}
        >
          ${a.icon && html`<${Icon} name=${a.icon} size=${20} />`}
          <span>${a.label}</span>
        </button>`
      )}
    </div>
    <button class="sheet-cancel" onClick=${() => close(undefined)}>Annuler</button>
  </div>`;
}

/** Confirmation. Résout true/false. */
export async function confirmDialog({ title, message, confirmLabel = 'Confirmer', danger = false }) {
  const v = await openOverlay(ConfirmSheet, { title, message, confirmLabel, danger });
  return v === true;
}

function ConfirmSheet({ title, message, confirmLabel, danger, close }) {
  return html`<div class="sheet" role="alertdialog" aria-label=${title}>
    <div class="sheet-grabber"></div>
    <div class="sheet-head">
      <div class="sheet-title">${title}</div>
      ${message && html`<div class="sheet-msg">${message}</div>`}
    </div>
    <div class="sheet-buttons">
      <button class=${'btn ' + (danger ? 'btn-danger' : 'btn-light')} onClick=${() => close(true)}>${confirmLabel}</button>
      <button class="btn btn-ghost" onClick=${() => close(false)}>Annuler</button>
    </div>
  </div>`;
}

/** Saisie de texte ou de nombre. Résout la chaîne saisie ou null. */
export async function promptDialog({ title, message, value = '', placeholder = '', inputMode = 'text', confirmLabel = 'Valider', multiline = false, suffix = '' }) {
  const v = await openOverlay(PromptSheet, { title, message, value, placeholder, inputMode, confirmLabel, multiline, suffix });
  return v == null ? null : v;
}

function PromptSheet({ title, message, value, placeholder, inputMode, confirmLabel, multiline, suffix, close }) {
  const [v, setV] = useState(value);
  const ref = useRef();
  useEffect(() => {
    const t = setTimeout(() => {
      ref.current?.focus();
      try {
        ref.current?.select();
      } catch {}
    }, 60);
    return () => clearTimeout(t);
  }, []);
  const submit = (e) => {
    e.preventDefault();
    close(v);
  };
  return html`<form class="sheet" onSubmit=${submit} role="dialog" aria-label=${title}>
    <div class="sheet-grabber"></div>
    <div class="sheet-head">
      <div class="sheet-title">${title}</div>
      ${message && html`<div class="sheet-msg">${message}</div>`}
    </div>
    <div class="field-wrap">
      ${multiline
        ? html`<textarea ref=${ref} class="field" rows="4" placeholder=${placeholder} value=${v} onInput=${(e) => setV(e.target.value)}></textarea>`
        : html`<input
            ref=${ref}
            class="field"
            type="text"
            inputmode=${inputMode}
            enterkeyhint="done"
            placeholder=${placeholder}
            value=${v}
            onInput=${(e) => setV(e.target.value)}
          />`}
      ${suffix && html`<span class="field-suffix">${suffix}</span>`}
    </div>
    <div class="sheet-buttons">
      <button type="submit" class="btn btn-light">${confirmLabel}</button>
      <button type="button" class="btn btn-ghost" onClick=${() => close(null)}>Annuler</button>
    </div>
  </form>`;
}

// ---------------------------------------------------------------------------
// Toasts

let toasts = [];
const toastSubs = new Set();
export function toast(text, { icon = 'check', duration = 2400 } = {}) {
  const id = ++overlaySeq;
  toasts = [...toasts, { id, text, icon }];
  toastSubs.forEach((f) => f());
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    toastSubs.forEach((f) => f());
  }, duration);
}

export function ToastHost() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const f = () => setTick((t) => t + 1);
    toastSubs.add(f);
    return () => toastSubs.delete(f);
  }, []);
  return html`<div class="toasts" aria-live="polite">
    ${toasts.map(
      (t) => html`<div key=${t.id} class="toast">
        <${Icon} name=${t.icon} size=${18} />
        <span>${t.text}</span>
      </div>`
    )}
  </div>`;
}

// ---------------------------------------------------------------------------
// Composants de mise en page

export function TopBar({ title, onBack, backIcon = 'arrow-left', right, sub }) {
  return html`<header class="topbar">
    <div class="topbar-side">
      ${onBack &&
      html`<button class="icon-btn" aria-label="Retour" onClick=${onBack}>
        <${Icon} name=${backIcon} size=${24} />
      </button>`}
    </div>
    <div class="topbar-title">
      <div>${title}</div>
      ${sub && html`<div class="topbar-sub">${sub}</div>`}
    </div>
    <div class="topbar-side right">${right}</div>
  </header>`;
}

export function Segmented({ options, value, onChange, small = false }) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  return html`<div class=${'segmented' + (small ? ' small' : '')} role="tablist" style=${`--n:${options.length};--i:${idx}`}>
    <div class="segmented-thumb"></div>
    ${options.map(
      (o) => html`<button
        type="button"
        role="tab"
        aria-selected=${o.value === value}
        class=${o.value === value ? 'active' : ''}
        onClick=${() => onChange(o.value)}
      >
        ${o.label}
      </button>`
    )}
  </div>`;
}

/** Variation : « ▲ +50 % » (vert) / « ▼ −12 % » (rouge). */
export function Delta({ value, suffix = '%' }) {
  if (value === null) return html`<span class="delta up">Nouveau</span>`;
  if (value === undefined || !isFinite(value)) return null;
  const r = Math.round(value);
  if (r === 0) return html`<span class="delta flat">= stable</span>`;
  const up = r > 0;
  return html`<span class=${'delta ' + (up ? 'up' : 'down')}>
    <${Icon} name=${up ? 'chevron-up' : 'chevron-down'} size=${14} stroke=${3} />
    ${up ? '+' : '−'}${fmtNum(Math.abs(r))}${suffix === '%' ? ' %' : suffix}
  </span>`;
}

export function Empty({ icon = 'dumbbell', title, text, children }) {
  return html`<div class="empty">
    <div class="empty-icon"><${Icon} name=${icon} size=${28} /></div>
    <div class="empty-title">${title}</div>
    ${text && html`<div class="empty-text">${text}</div>`}
    ${children}
  </div>`;
}

export function ListRow({ icon, label, sub, right, onClick, danger }) {
  return html`<button class=${'list-row' + (danger ? ' danger' : '')} onClick=${onClick}>
    ${icon && html`<span class="list-row-icon"><${Icon} name=${icon} size=${20} /></span>`}
    <span class="list-row-label">
      <span>${label}</span>
      ${sub && html`<small>${sub}</small>`}
    </span>
    ${right !== undefined ? right : html`<${Icon} name="chevron-right" size=${18} class="muted" />`}
  </button>`;
}

export function Toggle({ checked, onChange, label }) {
  return html`<button
    type="button"
    class=${'toggle' + (checked ? ' on' : '')}
    role="switch"
    aria-checked=${checked}
    aria-label=${label}
    onClick=${() => onChange(!checked)}
  >
    <span></span>
  </button>`;
}

/** Stepper − valeur + */
export function Stepper({ value, onChange, step = 1, min = 0, max = 9999, format = (v) => v, label }) {
  return html`<div class="stepper" aria-label=${label}>
    <button type="button" aria-label="Moins" onClick=${() => onChange(Math.max(min, value - step))}><${Icon} name="minus" size=${18} /></button>
    <span>${format(value)}</span>
    <button type="button" aria-label="Plus" onClick=${() => onChange(Math.min(max, value + step))}><${Icon} name="plus" size=${18} /></button>
  </div>`;
}
