// Point d'entrée : routage, barre d'onglets, service worker.
import { html, render, useState, useEffect, useLayoutEffect } from './lib.js';
import { getData, getActive, subscribe, requestPersistence, elapsedSec } from './store.js';
import { Icon, useRoute, navRoot, nav, OverlayHost, ToastHost, restoreScroll, useNow, closeAllOverlays } from './ui.js';
import { fmtClock } from './utils.js';
import { Welcome } from './views/welcome.js';
import { Home } from './views/home.js';
import { History } from './views/history.js';
import { Stats } from './views/statsView.js';
import { Profile } from './views/profile.js';
import { NewSession } from './views/newSession.js';
import { LiveSession, EditSession } from './views/editor.js';
import { SessionDetail } from './views/sessionDetail.js';
import { ProgressList, ExerciseDetail, Records } from './views/progress.js';
import { Programs, ProgramEditor } from './views/programs.js';
import { Settings, Help } from './views/settings.js';

const TABS = [
  { path: '/', icon: 'house', label: 'Accueil' },
  { path: '/history', icon: 'sliders-horizontal', label: 'Historique' },
  { path: 'plus' },
  { path: '/stats', icon: 'chart-no-axes-column', label: 'Statistiques' },
  { path: '/profile', icon: 'user', label: 'Profil' },
];

function TabBar({ path }) {
  const active = getActive();
  return html`<nav class="tabbar" aria-label="Navigation principale">
    ${TABS.map((t) =>
      t.path === 'plus'
        ? html`<button class="tab-plus" aria-label=${active ? 'Reprendre la séance' : 'Nouvelle séance'} onClick=${() => nav(active ? '/live' : '/new')}>
            <${Icon} name=${active ? 'play' : 'plus'} size=${24} stroke=${2.4} fill=${active ? 'currentColor' : 'none'} />
          </button>`
        : html`<button class=${'tab' + (path === t.path ? ' active' : '')} aria-current=${path === t.path ? 'page' : undefined} onClick=${() => navRoot(t.path)}>
            <${Icon} name=${t.icon} size=${23} stroke=${path === t.path ? 2.3 : 1.8} />
            <span>${t.label}</span>
          </button>`
    )}
  </nav>`;
}

/** Bandeau compact au-dessus des onglets quand une séance tourne. */
function MiniActive() {
  const a = getActive();
  const now = useNow(1000, !!a);
  if (!a) return null;
  return html`<button class="mini-active" onClick=${() => nav('/live')}>
    <span class=${'pulse-dot' + (a.pausedAt ? ' paused' : '')}></span>
    <span class="mini-active-name">${a.name}</span>
    <span class="mini-active-time">${fmtClock(elapsedSec(a, now))}</span>
    <${Icon} name="chevron-up" size=${18} />
  </button>`;
}

function resolve(route) {
  const [a, b, c] = route.parts;
  switch (a) {
    case undefined:
      return { view: html`<${Home} />`, tab: '/' };
    case 'history':
      return { view: html`<${History} />`, tab: '/history' };
    case 'stats':
      return { view: html`<${Stats} />`, tab: '/stats' };
    case 'profile':
      return { view: html`<${Profile} />`, tab: '/profile' };
    case 'new':
      return { view: html`<${NewSession} />` };
    case 'live':
      return { view: html`<${LiveSession} />`, live: true };
    case 'session':
      if (c === 'edit') return { view: html`<${EditSession} key=${'edit' + b} id=${b} />` };
      return { view: html`<${SessionDetail} key=${b} id=${b} done=${route.query.done === '1'} />` };
    case 'add-session':
      return { view: html`<${EditSession} key=${'add' + (route.query.date || '')} date=${route.query.date} />` };
    case 'progress':
      return { view: html`<${ProgressList} />` };
    case 'exercise':
      return { view: html`<${ExerciseDetail} key=${b} id=${decodeURIComponent(b || '')} />` };
    case 'records':
      return { view: html`<${Records} />` };
    case 'programs':
      return { view: html`<${Programs} />` };
    case 'program':
      return { view: html`<${ProgramEditor} key=${b} id=${b} />` };
    case 'settings':
      return { view: html`<${Settings} />` };
    case 'help':
      return { view: html`<${Help} />` };
    default:
      return { view: html`<${Home} />`, tab: '/' };
  }
}

function UpdateBanner() {
  const [waiting, setWaiting] = useState(null);
  useEffect(() => {
    const f = (e) => setWaiting(e.detail);
    window.addEventListener('sds:update', f);
    return () => window.removeEventListener('sds:update', f);
  }, []);
  if (!waiting) return null;
  return html`<div class="update-banner">
    <${Icon} name="sparkles" size=${18} />
    <span>Nouvelle version disponible</span>
    <button
      class="text-btn strong"
      onClick=${() => {
        waiting.postMessage({ type: 'SKIP_WAITING' });
        setWaiting(null);
      }}
    >
      Mettre à jour
    </button>
  </div>`;
}

function App() {
  const [, setTick] = useState(0);
  useEffect(() => subscribe(() => setTick((t) => t + 1)), []);
  const route = useRoute();

  useLayoutEffect(() => {
    closeAllOverlays();
    restoreScroll(route.raw);
  }, [route.raw]);

  if (!getData().profile.onboarded) {
    return html`<${Welcome} /><${OverlayHost} /><${ToastHost} />`;
  }

  const { view, tab, live } = resolve(route);
  const showTabs = !!tab;
  return html`
    <main class=${'app' + (showTabs ? ' with-tabs' : '') + (getActive() && showTabs ? ' with-mini' : '')} key=${route.path}>${view}</main>
    ${showTabs && !live && html`<${MiniActive} />`}
    ${showTabs && html`<${TabBar} path=${tab} />`}
    <${UpdateBanner} />
    <${OverlayHost} />
    <${ToastHost} />
  `;
}

// iOS relance l'app sur start_url : si une séance tourne, on y retourne directement.
if (getData().profile.onboarded && getActive() && (location.hash === '' || location.hash === '#/' || location.hash === '#')) {
  history.replaceState({ sdsIdx: 0 }, '', location.pathname + location.search + '#/live');
}

render(html`<${App} />`, document.getElementById('app'));
document.documentElement.classList.add('ready');
requestPersistence();

// Masque la barre d'onglets quand le clavier est ouvert (iOS).
document.addEventListener('focusin', (e) => {
  if (e.target.matches('input, textarea')) document.documentElement.classList.add('kb-open');
});
document.addEventListener('focusout', () => {
  setTimeout(() => {
    const el = document.activeElement;
    if (!el || !el.matches('input, textarea')) document.documentElement.classList.remove('kb-open');
  }, 50);
});

// Service worker (hors ligne + mises à jour)
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js', { scope: './' });
      const announce = (w) => w && navigator.serviceWorker.controller && window.dispatchEvent(new CustomEvent('sds:update', { detail: w }));
      if (reg.waiting) announce(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw?.addEventListener('statechange', () => {
          if (nw.state === 'installed') announce(nw);
        });
      });
      // vérifie les mises à jour au retour dans l'app
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
    } catch (e) {
      console.warn('SW non enregistré', e);
    }
  });
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading || !hadController) return;
    reloading = true;
    location.reload();
  });
}

// Hauteur du clavier virtuel (iOS ne redimensionne pas la page) : les feuilles restent visibles.
if (window.visualViewport) {
  const vv = window.visualViewport;
  const updKb = () => {
    const kb = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
    document.documentElement.style.setProperty('--kb', (kb > 80 ? kb : 0) + 'px');
  };
  vv.addEventListener('resize', updKb);
  vv.addEventListener('scroll', updKb);
}
