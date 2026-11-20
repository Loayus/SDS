// Historique : calendrier mensuel + liste des séances.
import { html, useState, useRef } from '../lib.js';
import { getData } from '../store.js';
import { Icon, nav } from '../ui.js';
import { SessionCard } from './common.js';
import { summarize, weekStreak } from '../stats.js';
import { startOfMonth, addMonths, dayKey, MONTHS, cap, fmtDuration, fmtVolumeShort, fmtLongDate } from '../utils.js';

// conservé entre les navigations (retour depuis un détail)
const memo = { month: startOfMonth(Date.now()), day: null };

export function History() {
  const [month, setMonthState] = useState(memo.month);
  const [day, setDayState] = useState(memo.day);
  const touch = useRef(null);

  const setMonth = (m) => {
    memo.month = m;
    memo.day = null;
    setMonthState(m);
    setDayState(null);
  };
  const setDay = (d) => {
    memo.day = d;
    setDayState(d);
  };

  const sessions = getData().sessions;
  const d = new Date(month);
  const y = d.getFullYear(),
    mo = d.getMonth();
  const monthEnd = addMonths(month, 1);
  const inMonth = sessions.filter((s) => s.startedAt >= month && s.startedAt < monthEnd).sort((a, b) => b.startedAt - a.startedAt);
  const byDay = {};
  for (const s of inMonth) (byDay[dayKey(s.startedAt)] ||= []).push(s);
  const sum = summarize(inMonth);
  const todayKey = dayKey(Date.now());
  const streak = weekStreak();

  // grille : semaines du lundi au dimanche
  const firstDow = (new Date(y, mo, 1).getDay() + 6) % 7;
  const nbDays = new Date(y, mo + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let i = 1; i <= nbDays; i++) cells.push(i);
  while (cells.length % 7) cells.push(null);

  const list = day ? byDay[day] || [] : inMonth;
  const isCurrentMonth = month === startOfMonth(Date.now());

  const onTouchStart = (e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY });
  const onTouchEnd = (e) => {
    if (!touch.current) return;
    const dx = e.changedTouches[0].clientX - touch.current.x;
    const dy = e.changedTouches[0].clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) setMonth(addMonths(month, dx < 0 ? 1 : -1));
  };

  return html`<div class="page history">
    <header class="page-head">
      <h1>Historique</h1>
      <button class="icon-btn filled" aria-label="Ajouter une séance passée" onClick=${() => nav('/add-session')}>
        <${Icon} name="plus" size=${22} />
      </button>
    </header>

    <div class="card calendar" onTouchStart=${onTouchStart} onTouchEnd=${onTouchEnd}>
      <div class="cal-head">
        <button class="icon-btn" aria-label="Mois précédent" onClick=${() => setMonth(addMonths(month, -1))}><${Icon} name="chevron-left" size=${22} /></button>
        <button class="cal-title" onClick=${() => setMonth(startOfMonth(Date.now()))}>${cap(MONTHS[mo])} ${y}</button>
        <button class="icon-btn" aria-label="Mois suivant" onClick=${() => setMonth(addMonths(month, 1))}><${Icon} name="chevron-right" size=${22} /></button>
      </div>
      <div class="cal-grid cal-dow">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((x) => html`<span>${x}</span>`)}</div>
      <div class="cal-grid">
        ${cells.map((n, i) => {
          if (!n) return html`<span key=${'e' + i}></span>`;
          const k = `${y}-${String(mo + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
          const has = byDay[k];
          const cls = ['cal-day', has ? 'has' : '', k === todayKey ? 'today' : '', k === day ? 'sel' : ''].join(' ');
          return html`<button
            key=${k}
            class=${cls}
            aria-label=${`${n} ${MONTHS[mo]}${has ? `, ${has.length} séance${has.length > 1 ? 's' : ''}` : ''}`}
            onClick=${() => setDay(day === k ? null : k)}
          >
            <span>${n}</span>
            ${has && has.length > 1 && html`<i>${has.length}</i>`}
          </button>`;
        })}
      </div>
      <div class="cal-foot">
        <div><b>${sum.count}</b><small>séance${sum.count > 1 ? 's' : ''}</small></div>
        <div><b>${fmtDuration(sum.duration)}</b><small>au total</small></div>
        <div><b>${fmtVolumeShort(sum.volume)}</b><small>soulevés</small></div>
      </div>
    </div>

    ${isCurrentMonth && streak > 0 && html`<div class="streak muted small">🔥 ${streak} semaine${streak > 1 ? 's' : ''} d'affilée avec au moins une séance</div>`}

    <div class="section-title">
      <h2>${day ? cap(fmtLongDate(new Date(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10), 12).getTime())) : `Séances de ${MONTHS[mo]}`}</h2>
      ${day && html`<button class="text-btn small" onClick=${() => setDay(null)}>Tout le mois</button>`}
    </div>
    <div class="stack">
      ${list.map((s) => html`<${SessionCard} key=${s.id} session=${s} showDate=${!day} />`)}
      ${!list.length &&
      html`<div class="card empty-card">
        <${Icon} name="calendar" size=${22} />
        <span>${day ? 'Pas de séance ce jour-là.' : 'Aucune séance ce mois-ci.'}</span>
        ${day && html`<button class="text-btn small" onClick=${() => nav('/add-session?date=' + day)}>Ajouter</button>`}
      </div>`}
    </div>
  </div>`;
}
