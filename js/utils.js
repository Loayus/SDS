// Fonctions utilitaires : formatage, dates, nombres.

export const DAY = 86400000;

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const nf0 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

/** Nombre au format français (espace fine comme séparateur de milliers). */
export function fmtNum(n, decimals = 0) {
  if (n == null || !isFinite(n)) return '–';
  return (decimals === 0 ? nf0 : decimals === 1 ? nf1 : nf2).format(n);
}

/** Poids : 22.5 → « 22,5 », 80 → « 80 ». */
export function fmtWeight(w) {
  if (w == null || w === '' || !isFinite(w)) return '–';
  return nf2.format(Math.round(w * 100) / 100);
}

/** Volume : 12480 → « 12 480 kg », 1 250 000 → « 1,25 t » si demandé. */
export function fmtKg(n) {
  return fmtNum(Math.round(n || 0)) + ' kg';
}

/** Volume compact pour petites tuiles : 48320 → « 48,3 t ». */
export function fmtVolumeShort(n) {
  n = n || 0;
  if (n >= 100000) return nf0.format(n / 1000) + ' t';
  if (n >= 10000) return nf1.format(n / 1000) + ' t';
  return nf0.format(Math.round(n)) + ' kg';
}

/** Durée en secondes → « 1h 48 » / « 48 min » / « 0 min ». */
export function fmtDuration(sec) {
  sec = Math.max(0, Math.round(sec || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}`;
  return `${m} min`;
}

/** Chronomètre : secondes → « 00:24:17 ». */
export function fmtClock(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

/** Compte à rebours court : 75 → « 01:15 ». */
export function fmtMinSec(sec) {
  sec = Math.max(0, Math.ceil(sec || 0));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
export const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

export const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export function startOfDay(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Début de semaine (lundi 00:00). */
export function startOfWeek(ts) {
  const d = new Date(startOfDay(ts));
  const day = (d.getDay() + 6) % 7; // lundi = 0
  d.setDate(d.getDate() - day);
  return d.getTime();
}

export function startOfMonth(ts) {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

export function addDays(ts, n) {
  const d = new Date(ts);
  d.setDate(d.getDate() + n);
  return d.getTime();
}

export function addMonths(ts, n) {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth() + n, 1).getTime();
}

export function dayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function sameDay(a, b) {
  return dayKey(a) === dayKey(b);
}

/** « Aujourd'hui », « Hier », sinon « Lundi 17 nov. ». */
export function fmtRelDay(ts, now = Date.now()) {
  const diff = Math.round((startOfDay(now) - startOfDay(ts)) / DAY);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return 'Hier';
  const d = new Date(ts);
  const y = d.getFullYear() !== new Date(now).getFullYear() ? ` ${d.getFullYear()}` : '';
  return `${cap(DAYS[d.getDay()])} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}${y}`;
}

/** « jeudi 20 novembre 2026 ». */
export function fmtLongDate(ts) {
  const d = new Date(ts);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** « 20 nov. 2026 ». */
export function fmtShortDate(ts, withYear = true) {
  const d = new Date(ts);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}${withYear ? ' ' + d.getFullYear() : ''}`;
}

export function fmtTime(ts) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** « il y a 3 j » */
export function fmtAgo(ts, now = Date.now()) {
  const days = Math.round((startOfDay(now) - startOfDay(ts)) / DAY);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return 'hier';
  if (days < 7) return `il y a ${days} j`;
  if (days < 30) return `il y a ${Math.round(days / 7)} sem.`;
  if (days < 365) return `il y a ${Math.round(days / 30)} mois`;
  return `il y a ${Math.round(days / 365)} an${days >= 730 ? 's' : ''}`;
}

/** Analyse un nombre saisi (accepte la virgule). Renvoie null si vide/invalide. */
export function parseNum(v) {
  if (v == null) return null;
  if (typeof v === 'number') return isFinite(v) ? v : null;
  const s = String(v).trim().replace(',', '.');
  if (s === '') return null;
  const n = parseFloat(s);
  return isFinite(n) ? n : null;
}

/** Nombre → chaîne de saisie (« 22,5 »). */
export function numToInput(n) {
  if (n == null || n === '') return '';
  return String(n).replace('.', ',');
}

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** Variation en % (null si pas de base de comparaison). */
export function pctChange(cur, prev) {
  if (!prev) return cur > 0 ? null : 0;
  return ((cur - prev) / prev) * 100;
}

/** 1RM estimé (formule d'Epley). */
export function e1rm(w, r) {
  if (!w || !r) return 0;
  if (r === 1) return w;
  return w * (1 + Math.min(r, 20) / 30);
}

export function plural(n, one, many) {
  return `${fmtNum(n)} ${n > 1 ? many || one + 's' : one}`;
}

export function slugify(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** Normalise pour la recherche (sans accents, minuscules). */
export function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isStandalone() {
  return window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
}
