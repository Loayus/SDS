// Accueil : résumé de la semaine, dernière séance, démarrage rapide.
import { html, useState } from '../lib.js';
import { getData, getActive, sessionsDesc, elapsedSec } from '../store.js';
import { Icon, nav, Delta, useNow } from '../ui.js';
import { MiniBars, ProgressBar } from '../charts.js';
import { SessionCard, StatTile, SectionTitle } from './common.js';
import { summarize, sessionsBetween, weeklyCounts, weekStreak } from '../stats.js';
import { startOfWeek, addDays, fmtDuration, fmtVolumeShort, fmtNum, fmtClock, isIOS, isStandalone, pctChange } from '../utils.js';
import { LogoMark } from '../logo.js';

function greeting() {
  const h = new Date().getHours();
  if (h < 5 || h >= 18) return 'Bonsoir,';
  return 'Bonjour,';
}

export function ActiveBanner() {
  const a = getActive();
  const now = useNow(1000, !!a);
  if (!a) return null;
  return html`<button class="card active-banner" onClick=${() => nav('/live')}>
    <span class="pulse-dot ${a.pausedAt ? 'paused' : ''}"></span>
    <span class="active-banner-text">
      <small>${a.pausedAt ? 'Séance en pause' : 'Séance en cours'}</small>
      <b>${a.name}</b>
    </span>
    <span class="active-banner-time">${fmtClock(elapsedSec(a, now))}</span>
    <${Icon} name="chevron-right" size=${20} />
  </button>`;
}

let installDismissed = false;
try {
  installDismissed = localStorage.getItem('sds:install-dismissed') === '1';
} catch {}

export function Home() {
  const data = getData();
  const [hideInstall, setHideInstall] = useState(installDismissed);
  const now = Date.now();
  const wk = startOfWeek(now);
  const week = summarize(sessionsBetween(wk, addDays(wk, 7)));
  const prevWeek = summarize(sessionsBetween(addDays(wk, -7), wk));
  const bars = weeklyCounts(8, now).map((w) => w.count);
  const last = sessionsDesc()[0];
  const goal = data.profile.goal?.weekly || 3;
  const streak = weekStreak(now);
  const active = getActive();

  const showInstall = isIOS() && !isStandalone() && !hideInstall;

  return html`<div class="page home">
    <header class="home-head">
      <div>
        <div class="home-hello">${greeting()}</div>
        <h1 class="home-name">${data.profile.name || 'Athlète'} <span class="wave">💪</span></h1>
      </div>
      <button class="avatar-btn" aria-label="Profil" onClick=${() => nav('/profile')}>
        <${LogoMark} size=${30} />
      </button>
    </header>

    ${showInstall &&
    html`<div class="card install-tip">
      <${Icon} name="smartphone" size=${22} />
      <div>
        <b>Installe SDS sur ton iPhone</b>
        <small>Partager → « Sur l'écran d'accueil » pour l'utiliser comme une vraie app.</small>
      </div>
      <button class="text-btn small" onClick=${() => nav('/help')}>Voir</button>
      <button
        class="icon-btn small"
        aria-label="Masquer"
        onClick=${() => {
          try {
            localStorage.setItem('sds:install-dismissed', '1');
          } catch {}
          setHideInstall(true);
        }}
      >
        <${Icon} name="x" size=${16} />
      </button>
    </div>`}

    <${ActiveBanner} />

    <button class="card week-card" onClick=${() => nav('/history')}>
      <div class="week-card-text">
        <div class="label">Cette semaine</div>
        <div class="week-count">${week.count} séance${week.count > 1 ? 's' : ''}</div>
        <${Delta} value=${prevWeek.count || week.count ? pctChange(week.count, prevWeek.count) : undefined} />
        <div class="week-goal">
          <${ProgressBar} value=${week.count / goal} height=${5} />
          <small>Objectif ${Math.min(week.count, goal)}/${goal}${streak > 1 ? ` · 🔥 ${streak} semaines d'affilée` : ''}</small>
        </div>
      </div>
      <${MiniBars} values=${bars} height=${70} />
    </button>

    <div class="tiles-3">
      <${StatTile} icon="timer" value=${fmtDuration(week.duration)} label="Temps total" />
      <${StatTile} icon="weight" value=${fmtVolumeShort(week.volume)} label="Volume total" />
      <${StatTile} icon="flame" value=${fmtNum(week.calories) + ' kcal'} label="Calories est." />
    </div>

    <${SectionTitle} title="Dernière séance" right=${last ? 'Tout voir' : null} onClick=${() => nav('/history')} />
    ${last
      ? html`<${SessionCard} session=${last} />`
      : html`<div class="card empty-card">
          <${Icon} name="dumbbell" size=${22} />
          <span>Aucune séance pour l'instant. Lance ta première !</span>
        </div>`}

    <button class="btn btn-dark btn-block start-btn" onClick=${() => nav(active ? '/live' : '/new')}>
      <${Icon} name="play" size=${18} fill="currentColor" />
      ${active ? 'Reprendre la séance' : 'Commencer une séance'}
    </button>
  </div>`;
}
