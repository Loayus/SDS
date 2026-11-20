/*
 * Tests de bout en bout de SDS (Playwright + Chromium, viewport iPhone 17).
 * Lancer : node tests/e2e.cjs     (nécessite le paquet « playwright »)
 * Un petit serveur statique sert l'app sous /SDS/ comme sur GitHub Pages.
 */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const PORT = 8790 + Math.floor(Math.random() * 100);
const BASE = `http://localhost:${PORT}/SDS/`;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };

const server = http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  if (!url.startsWith('/SDS/')) {
    res.writeHead(404);
    return res.end();
  }
  let file = path.join(ROOT, url.slice('/SDS/'.length));
  if (file.endsWith(path.sep) || url === '/SDS/') file = path.join(file, 'index.html');
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    return res.end('not found');
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  fs.createReadStream(file).pipe(res);
});

let passed = 0;
const failures = [];
async function step(name, fn) {
  try {
    await fn();
    passed++;
    console.log('  ✓ ' + name);
  } catch (e) {
    failures.push(name);
    console.log('  ✗ ' + name + '\n      ' + String(e.message || e).split('\n').slice(0, 4).join('\n      '));
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion échouée');
}
async function eventually(fn, msg, timeout = 4000) {
  const t0 = Date.now();
  let last;
  while (Date.now() - t0 < timeout) {
    try {
      const r = await fn();
      if (r) return r;
    } catch (e) {
      last = e;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(msg + (last ? ' — ' + last.message : ''));
}
const nbsp = (s) => (s || '').replace(/[\u00a0\u202f]/g, ' ');

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 402, height: 874 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    acceptDownloads: true,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()));

  const text = async (sel) => nbsp(await page.locator(sel).first().innerText());
  const go = async (hash) => {
    await page.evaluate((h) => (location.hash = h), hash);
    await page.waitForTimeout(250);
  };
  const btn = (name, exact = true) => page.getByRole('button', { name, exact });
  const sheetAction = (label) => page.locator('.sheet .sheet-action', { hasText: label }).first();
  const data = () => page.evaluate(() => JSON.parse(localStorage.getItem('sds:data')));
  const active = () => page.evaluate(() => JSON.parse(localStorage.getItem('sds:active')));

  console.log('SDS — tests E2E');

  await step('premier lancement : écran de bienvenue', async () => {
    await page.goto(BASE);
    await page.getByText('Enregistrez. Progressez. Dépassez-vous.').waitFor();
    assert(await page.getByText('S D S').isVisible(), 'logo SDS visible');
  });

  await step('création du profil', async () => {
    await btn('Créer mon profil').click();
    await page.fill('#ob-name', 'Antoine');
    await page.fill('#ob-bw', '80');
    await page.locator('.stepper button[aria-label="Plus"]').click();
    await btn("C'est parti").click();
    await page.locator('.home-name').waitFor();
    assert((await text('.home-name')).includes('Antoine'), 'prénom affiché');
    const d = await data();
    assert(d.profile.bodyWeight === 80 && d.profile.goal.weekly === 4 && d.profile.onboarded, 'profil enregistré');
  });

  await step('accueil vide : 0 séance, bouton « Commencer une séance »', async () => {
    assert((await text('.week-count')).startsWith('0 séance'), 'compteur à 0');
    assert(await btn('Commencer une séance').isVisible());
  });

  await step('démarrer une séance libre → chrono lancé', async () => {
    await btn('Commencer une séance').click();
    await page.locator('.chip', { hasText: 'Séance libre' }).click();
    await btn('Démarrer la séance').click();
    await page.locator('.live-time').waitFor();
    const t1 = await text('.live-time');
    await page.waitForTimeout(2100);
    const t2 = await text('.live-time');
    assert(/^\d\d:\d\d:\d\d$/.test(t1) && t2 > t1, `chrono qui avance (${t1} → ${t2})`);
    assert(await active(), 'séance active persistée');
  });

  await step('ajouter un exercice via la recherche', async () => {
    await btn('Ajouter un exercice').click();
    await page.fill('.picker input[type=search]', 'developpe couche');
    await page.locator('.picker-row').filter({ has: page.locator('.picker-row-text > span', { hasText: /^Développé couché$/ }) }).click();
    await btn('Ajouter (1)').click();
    await page.locator('.ex-block').first().waitFor();
    assert((await text('.ex-block-title b')) === 'Développé couché', 'exercice ajouté');
    assert((await page.locator('.ex-block .set-row:not(.drop-row)').count()) === 3, '3 séries par défaut');
  });

  await step('série 1 : 100 kg × 4 puis dégressif 80 × 3 et 60 × 2', async () => {
    const blk = page.locator('.ex-block').first();
    await blk.locator('[aria-label="Charge série 1"]').fill('100');
    await blk.locator('[aria-label="Répétitions série 1"]').fill('4');
    await blk.locator('.set-num').first().click();
    await sheetAction('Ajouter un dégressif').click();
    await blk.locator('[aria-label="Charge dégressif 1"]').waitFor();
    await blk.locator('[aria-label="Charge dégressif 1"]').fill('80');
    await blk.locator('[aria-label="Répétitions dégressif 1"]').fill('3');
    await blk.locator('.set-num').first().click();
    await sheetAction('Ajouter un dégressif').click();
    await blk.locator('[aria-label="Charge dégressif 2"]').fill('60');
    await blk.locator('[aria-label="Répétitions dégressif 2"]').fill('2');
    await blk.getByRole('button', { name: 'Valider la série' }).first().click();
    await eventually(async () => (await active()).exercises[0].sets[0].done, 'série validée');
    const s = (await active()).exercises[0].sets[0];
    assert(s.weight === '100' && s.reps === '4', 'valeurs principales');
    assert(s.drops.length === 2 && s.drops[0].weight === '80' && s.drops[1].reps === '2', 'dégressifs enregistrés');
  });

  await step('minuteur de repos visible après validation', async () => {
    const bar = page.locator('.rest-bar');
    await bar.waitFor();
    const box = await bar.boundingBox();
    assert(box && box.y > 700 && box.y < 874, 'barre de repos en bas de l’écran (y=' + (box && box.y) + ')');
    const t = await text('.rest-center b');
    assert(/^0[01]:\d\d$/.test(t), 'compte à rebours ' + t);
    await btn('Ajouter 15 secondes').click();
    const d = await active();
    assert(d.rest && d.rest.total === 105, '+15 s appliqué (total=' + (d.rest && d.rest.total) + ')');
    await btn('Passer').click();
    await eventually(async () => !(await page.locator('.rest-bar').count()), 'repos passé');
  });

  await step('série 2 : 90 × 6 ; série 3 laissée vide', async () => {
    const blk = page.locator('.ex-block').first();
    assert((await blk.locator('[aria-label="Charge série 2"]').getAttribute('placeholder')) === '100', 'suggestion = série précédente');
    await blk.locator('[aria-label="Charge série 2"]').fill('90');
    await blk.locator('[aria-label="Répétitions série 2"]').fill('6');
    await blk.getByRole('button', { name: 'Valider la série' }).first().click();
    await eventually(async () => (await active()).exercises[0].sets[1].done, 'série 2 validée');
  });

  await step('rechargement en pleine séance : tout est conservé', async () => {
    const before = await text('.live-time');
    await page.reload();
    await page.locator('.live-time').waitFor();
    const blk = page.locator('.ex-block').first();
    assert((await blk.locator('[aria-label="Charge série 1"]').inputValue()) === '100', 'charge conservée');
    assert((await blk.locator('[aria-label="Répétitions dégressif 2"]').inputValue()) === '2', 'dégressif conservé');
    assert((await blk.locator('.set-check.on').count()) === 2, 'validations conservées');
    assert((await text('.live-time')) >= before, 'chrono continue');
  });

  await step('pause / reprise du chrono', async () => {
    await btn('Mettre en pause').click();
    await page.waitForTimeout(300);
    const t1 = await text('.live-time');
    await page.waitForTimeout(1600);
    assert((await text('.live-time')) === t1, 'chrono figé en pause');
    assert((await text('.live-clock small')) === 'En pause');
    await btn('Reprendre le chrono').click();
    await page.waitForTimeout(1600);
    assert((await text('.live-time')) > t1, 'chrono reparti');
  });

  await step('relance de l’app (start_url) avec une séance en cours → retour direct à la séance', async () => {
    await page.goto(BASE);
    await page.locator('.live-time').waitFor();
    assert(page.url().endsWith('#/live'), page.url());
  });

  await step('réduire la séance : bandeau sur l’accueil puis retour', async () => {
    await btn('Réduire la séance').click();
    await page.locator('.home-name').waitFor();
    assert(await page.locator('.mini-active').isVisible(), 'mini-bandeau visible');
    assert(await page.locator('.active-banner').isVisible(), 'bannière séance en cours');
    await page.locator('.mini-active').click();
    await page.locator('.live-time').waitFor();
  });

  await step('renommer la séance', async () => {
    await page.locator('.session-name').click();
    await page.locator('.sheet input.field').fill('Pecs lourds');
    await btn('Valider').click();
    await eventually(async () => (await text('.session-name span')) === 'Pecs lourds', 'nom modifié');
  });

  let sessionId;
  await step('terminer : récapitulatif (2 séries, 1 300 kg) puis enregistrement', async () => {
    await btn('Terminer la séance').click();
    await page.locator('.finish-grid').waitFor();
    const recap = await text('.finish-grid');
    assert(recap.includes('1 300 kg'), 'volume 100×4 + 80×3 + 60×2 + 90×6 = 1 300 kg — obtenu : ' + recap.replace(/\n/g, ' '));
    assert(/\b2\s*Séries/.test(recap), '2 séries');
    assert((await text('.sheet-note')).includes('1 série sans répétitions sera ignorée'), 'série vide signalée');
    await btn('Enregistrer la séance').click();
    await page.locator('.done-banner').waitFor();
    sessionId = page.url().match(/session\/([^?]+)/)[1];
    const d = await data();
    assert(d.sessions.length === 1 && !(await active()), 'séance dans l’historique, plus de séance active');
    const ex = d.sessions[0].exercises[0];
    assert(ex.sets.length === 2 && ex.sets[0].drops.length === 2 && ex.sets[0].drops[1].weight === 60, 'séries nettoyées');
  });

  await step('détail : séries et dégressifs affichés', async () => {
    const sets = await page.locator('.detail-set').allInnerTexts();
    const flat = sets.map(nbsp).join(' | ');
    assert(flat.includes('100 kg × 4') && flat.includes('80 kg × 3 dégressif') && flat.includes('60 kg × 2 dégressif') && flat.includes('90 kg × 6'), flat);
    assert((await text('.detail-stats')).includes('1 300 kg'));
  });

  await step('historique : jour coché dans le calendrier, détail accessible', async () => {
    await page.goto(BASE + '#/history');
    const today = await page.locator('.cal-day.today');
    assert((await today.getAttribute('class')).includes('has'), 'aujourd’hui marqué');
    await today.click();
    await page.locator('.session-card', { hasText: 'Pecs lourds' }).click();
    await page.locator('.detail-summary').waitFor();
    assert(page.url().includes(sessionId));
    await page.locator('.topbar .icon-btn[aria-label="Retour"]').click();
    await page.locator('.calendar').waitFor();
  });

  await step('navigation de mois dans le calendrier', async () => {
    const t = await text('.cal-title');
    await btn('Mois précédent').click();
    assert((await text('.cal-title')) !== t, 'mois changé');
    assert((await page.locator('.cal-day.has').count()) === 0, 'pas de séance le mois précédent');
    await btn('Mois suivant').click();
    assert((await text('.cal-title')) === t);
  });

  await step('modifier une séance passée (90 × 6 → 90 × 8)', async () => {
    await go('#/session/' + sessionId + '/edit');
    await page.locator('#ed-name').waitFor();
    await page.locator('[aria-label="Répétitions série 2"]').fill('8');
    await page.locator('#ed-dur').fill('75');
    await page.locator('.topbar').getByRole('button', { name: 'Enregistrer' }).click();
    await page.locator('.detail-summary').waitFor({ timeout: 5000 });
    const s = (await data()).sessions[0];
    assert(s.exercises[0].sets[1].reps === 8 && s.duration === 4500, 'modifications enregistrées');
    assert((await text('.detail-stats')).includes('1 480 kg'), 'volume recalculé');
  });

  await step('progression par exercice et 1RM estimé', async () => {
    await page.goto(BASE + '#/profile');
    await page.getByText('Progression par exercice').click();
    await page.locator('.progress-row', { hasText: 'Développé couché' }).click();
    await page.locator('.record-tile').first().waitFor();
    const tiles = (await page.locator('.record-tile').allInnerTexts()).map(nbsp).join(' | ');
    assert(tiles.includes('100 kg') && tiles.includes('× 4'), 'charge max ' + tiles);
    assert(tiles.includes('114 kg'), '1RM Epley max(100×(1+4/30)=113,3 ; 90×(1+8/30)=114) — ' + tiles);
  });

  await step('refaire la séance : valeurs précédentes proposées puis validées d’un geste', async () => {
    await go('#/session/' + sessionId);
    await btn('Refaire').click();
    await page.locator('.live-time').waitFor();
    const blk = page.locator('.ex-block').first();
    assert((await blk.locator('.set-row:not(.drop-row)').count()) === 2, '2 séries reprises');
    assert((await blk.locator('[aria-label="Charge série 1"]').getAttribute('placeholder')) === '100', 'suggestion 100');
    assert(nbsp(await blk.locator('.set-prev').first().innerText()).startsWith('100 × 4'), 'colonne précédent');
    await blk.getByRole('button', { name: 'Valider la série' }).first().click();
    await eventually(async () => (await blk.locator('[aria-label="Charge série 1"]').inputValue()) === '100', 'valeurs recopiées');
    assert((await blk.locator('[aria-label="Répétitions série 1"]').inputValue()) === '4');
    // série 2 avec une charge plus lourde → record
    await blk.locator('[aria-label="Charge série 2"]').fill('102,5');
    await blk.locator('[aria-label="Répétitions série 2"]').fill('3');
    await blk.getByRole('button', { name: 'Valider la série' }).first().click();
  });

  await step('échauffement exclu du volume', async () => {
    const blk = page.locator('.ex-block').first();
    await blk.getByRole('button', { name: 'Série', exact: true }).click();
    await blk.locator('[aria-label="Charge série 3"]').fill('40');
    await blk.locator('[aria-label="Répétitions série 3"]').fill('10');
    await blk.locator('.set-num').nth(2).click();
    await sheetAction('Marquer comme échauffement').click();
    await eventually(async () => (await blk.locator('.set-num').nth(2).innerText()) === 'É', 'série marquée É');
    await btn('Terminer la séance').click();
    await page.locator('.finish-grid').waitFor();
    const recap = nbsp(await text('.finish-grid'));
    // 100×4 + 80×3 + 60×2 (dégressifs non saisis → pas repris car vides ? non : repris depuis la séance précédente)
    assert(recap.includes('2 Séries') || /\b2\s*Séries/.test(recap), 'échauffement non compté : ' + recap);
    await btn('Enregistrer la séance').click();
    await page.locator('.done-banner').waitFor();
    assert((await text('.done-banner')).includes('record'), 'record détecté');
    const s = (await data()).sessions.find((x) => x.id !== sessionId);
    assert(s.exercises[0].sets.some((x) => x.warmup), 'échauffement enregistré');
    assert(s.exercises[0].sets[0].drops && s.exercises[0].sets[0].drops.length === 2, 'dégressifs repris depuis la séance précédente lors de la validation');
  });

  await step('mes records', async () => {
    await page.goto(BASE + '#/records');
    const row = nbsp(await page.locator('.record-row').first().innerText());
    assert(row.includes('Développé couché') && row.includes('102,5'), row);
  });

  await step('statistiques 7 jours', async () => {
    await page.goto(BASE + '#/stats');
    await page.locator('.stat-card').first().waitFor();
    assert((await text('.stat-card .big-value')) === '2', '2 séances');
    assert(await page.locator('.muscle-bar', { hasText: 'Pectoraux' }).isVisible(), 'pectoraux listés');
    await page.getByRole('tab', { name: '12 mois' }).click();
    assert((await text('.stat-card .big-value')) === '2');
  });

  await step('programme : création puis démarrage', async () => {
    await page.goto(BASE + '#/programs');
    await btn('Nouveau programme').first().click();
    await page.fill('#pg-name', 'Bras');
    await btn('Ajouter des exercices').click();
    await page.fill('.picker input[type=search]', 'curl marteau');
    await page.locator('.picker-row').first().click();
    await page.fill('.picker input[type=search]', 'barre au front');
    await page.locator('.picker-row').first().click();
    await btn('Ajouter (2)').click();
    await page.locator('.pg-ex').nth(1).waitFor();
    await page.locator('.pg-ex').first().getByRole('button', { name: 'Plus de séries' }).click();
    await page.locator('.pg-ex').first().locator('input').fill('10-12');
    await page.locator('#pg-name').click();
    await page.locator('.topbar').getByRole('button', { name: 'Enregistrer' }).click();
    await page.waitForTimeout(300);
    const pg = (await data()).programs.find((p) => p.name === 'Bras');
    assert(pg && pg.exercises.length === 2 && pg.exercises[0].sets === 4 && pg.exercises[0].reps === '10-12', 'programme enregistré ' + JSON.stringify(pg));
    await page.goto(BASE + '#/new');
    await page.locator('.chip', { hasText: 'Bras' }).click();
    await page.locator('.ex-row').nth(1).click(); // décocher le 2e exercice
    await btn('Démarrer la séance').click();
    await page.locator('.ex-block').first().waitFor();
    assert((await page.locator('.ex-block').count()) === 1, 'exercice décoché exclu');
    assert((await text('.ex-block-title small')).includes('Objectif 4 × 10-12'), 'objectif affiché');
  });

  await step('exercice personnalisé', async () => {
    await btn('Ajouter un exercice').click();
    await page.fill('.picker input[type=search]', 'Tirage menton élastique');
    await page.locator('.picker-create').click();
    await page.locator('.sheet .chip', { hasText: 'Épaules' }).click();
    await btn("Créer l'exercice").click();
    await btn('Ajouter (1)').click();
    await eventually(async () => (await page.locator('.ex-block').count()) === 2, 'exercice perso ajouté');
    assert((await data()).customExercises[0].name === 'Tirage menton élastique');
  });

  await step('supprimer un exercice puis abandonner la séance', async () => {
    await page.locator('.ex-block').nth(1).locator('.ex-block-head .icon-btn').click();
    await sheetAction("Supprimer l'exercice").click();
    await eventually(async () => (await page.locator('.ex-block').count()) === 1, 'exercice supprimé');
    await page.locator('.link-btn', { hasText: 'Abandonner la séance' }).click();
    await page.locator('.sheet .btn-danger').click();
    await page.locator('.home-name').waitFor();
    assert(!(await active()) && (await data()).sessions.length === 2, 'séance abandonnée, historique intact');
  });

  await step('ajout manuel d’une séance passée', async () => {
    await page.goto(BASE + '#/history');
    await btn('Ajouter une séance passée').click();
    await page.fill('#ed-name', 'Jambes');
    await page.fill('#ed-date', '2026-10-05');
    await btn('Ajouter un exercice').click();
    await page.fill('.picker input[type=search]', 'squat');
    await page.locator('.picker-row').filter({ has: page.locator('.picker-row-text > span', { hasText: /^Squat$/ }) }).click();
    await btn('Ajouter (1)').click();
    await page.locator('[aria-label="Charge série 1"]').fill('120');
    await page.locator('[aria-label="Répétitions série 1"]').fill('5');
    await page.locator('.topbar').getByRole('button', { name: 'Enregistrer' }).click();
    await page.locator('.detail-summary').waitFor();
    const s = (await data()).sessions.find((x) => x.name === 'Jambes');
    const d = new Date(s.startedAt);
    assert(s && d.getMonth() === 9 && d.getDate() === 5, 'date du 5 octobre');
    assert(s.exercises[0].sets.length === 1, 'séries vides ignorées');
  });

  let backupPath;
  await step('export de la sauvegarde', async () => {
    await page.goto(BASE + '#/settings');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByText('Exporter une sauvegarde').click()]);
    backupPath = path.join(os.tmpdir(), 'sds-backup-test.json');
    await dl.saveAs(backupPath);
    const j = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    assert(j.app === 'SDS' && j.data.sessions.length === 3, 'fichier valide');
  });

  await step('tout effacer puis restaurer la sauvegarde', async () => {
    await page.getByText('Tout effacer').click();
    await page.locator('.sheet .btn-danger').click();
    await page.getByText('Restaurer une sauvegarde').waitFor();
    await page.locator('input[type=file]').setInputFiles(backupPath);
    await page.locator('.home-name').waitFor();
    assert((await data()).sessions.length === 3, '3 séances restaurées');
    assert((await text('.home-name')).includes('Antoine'));
  });

  await step('import d’un fichier invalide refusé', async () => {
    await page.goto(BASE + '#/settings');
    const bad = path.join(os.tmpdir(), 'sds-bad.json');
    fs.writeFileSync(bad, '{"foo": 1}');
    await page.locator('input[type=file]').setInputFiles(bad);
    await page.locator('.toast', { hasText: "n'est pas une sauvegarde SDS" }).waitFor();
    assert((await data()).sessions.length === 3, 'données intactes');
  });

  await step('supprimer une séance', async () => {
    await go('#/session/' + sessionId);
    await page.locator('.topbar').getByRole('button', { name: 'Options' }).click();
    await sheetAction('Supprimer la séance').click();
    await page.locator('.sheet .btn-danger').click();
    await page.locator('.calendar').waitFor();
    assert((await data()).sessions.length === 2, 'séance supprimée');
  });

  await step('données de démo : ajout et retrait', async () => {
    await page.goto(BASE + '#/settings');
    await page.getByText('Ajouter des données de démo').click();
    await eventually(async () => (await data()).sessions.length > 10, 'démo ajoutée');
    await page.getByText('Retirer les données de démo').click();
    await eventually(async () => (await data()).sessions.length === 2, 'démo retirée, vraies séances gardées');
  });

  await step('mode hors ligne (service worker)', async () => {
    await page.goto(BASE);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await eventually(() => page.evaluate(() => !!navigator.serviceWorker.controller), 'SW actif');
    await ctx.setOffline(true);
    await page.reload();
    await page.locator('.home-name').waitFor({ timeout: 5000 });
    await page.goto(BASE + '#/stats');
    await page.locator('.stat-card').first().waitFor();
    await ctx.setOffline(false);
  });

  await step('manifeste et icônes', async () => {
    const m = await (await page.request.get(BASE + 'manifest.webmanifest')).json();
    assert(m.display === 'standalone' && m.short_name === 'SDS' && m.start_url === './', 'manifeste');
    for (const i of m.icons) assert((await page.request.get(BASE + i.src)).ok(), 'icône ' + i.src);
    assert((await page.request.get(BASE + 'icons/apple-touch-icon.png')).ok());
  });

  await step('navigation retour : profil → progression → exercice → retour × 2', async () => {
    await page.goto(BASE + '#/profile');
    await page.getByText('Progression par exercice').click();
    await page.locator('.progress-row').first().click();
    await page.locator('.record-tile').first().waitFor();
    await page.locator('.topbar').getByRole('button', { name: 'Retour' }).click();
    await page.locator('.progress-row').first().waitFor();
    await page.locator('.topbar').getByRole('button', { name: 'Retour' }).click();
    await page.locator('.profile-name').waitFor();
  });

  await step('objectif « charge cible » sur un exercice', async () => {
    await page.locator('.goal-card').click();
    await page.getByRole('tab', { name: 'Charge cible' }).click();
    await page.locator('.sheet .field-btn').click();
    await page.fill('.picker input[type=search]', 'developpe couche');
    await page.locator('.picker-row').filter({ has: page.locator('.picker-row-text > span', { hasText: /^Développé couché$/ }) }).click();
    await page.fill('#goal-target', '120');
    await page.locator('.sheet').getByRole('button', { name: 'Enregistrer' }).click();
    await page.waitForTimeout(300);
    const g = nbsp(await text('.goal-card'));
    assert(g.includes('Développé couché : 120 kg') && g.includes('85 %'), 'objectif 102,5/120 = 85 % — ' + g);
  });

  await step('réglage du temps de repos (−15 s)', async () => {
    await page.goto(BASE + '#/settings');
    await page.locator('.stepper[aria-label="Temps de repos"] button[aria-label="Moins"]').click();
    assert((await data()).profile.restDefault === 75, 'repos 75 s');
    assert((await text('.stepper[aria-label="Temps de repos"] span')) === '01:15');
  });

  await step('minuteurs avec horloge simulée (repos terminé, chrono 1 h)', async () => {
    const p2 = await ctx.newPage();
    await p2.clock.install();
    await p2.goto(BASE + '#/new');
    await p2.locator('.chip', { hasText: 'Push' }).click();
    await p2.getByRole('button', { name: 'Démarrer la séance', exact: true }).click();
    await p2.locator('.ex-block').first().waitFor();
    const blk = p2.locator('.ex-block').first();
    await blk.locator('[aria-label="Charge série 1"]').fill('60');
    await blk.locator('[aria-label="Répétitions série 1"]').fill('10');
    await blk.getByRole('button', { name: 'Valider la série' }).first().click();
    await p2.locator('.rest-bar').waitFor();
    await p2.clock.runFor(76000);
    await p2.locator('.rest-bar.done').waitFor();
    assert((await p2.locator('.rest-center').innerText()).includes('Repos terminé'));
    await p2.clock.runFor(8000);
    await eventually(async () => !(await p2.locator('.rest-bar').count()), 'barre masquée après la fin');
    await p2.clock.runFor(3600000);
    const t = await p2.locator('.live-time').innerText();
    assert(t.startsWith('01:01'), 'chrono ≈ 1 h ' + t);
    await p2.locator('.link-btn', { hasText: 'Abandonner la séance' }).click();
    await p2.locator('.sheet .btn-danger').click();
    await p2.close();
  });

  await step('aucun débordement horizontal (tous les écrans, avec démo)', async () => {
    await page.goto(BASE + '#/settings');
    await page.getByText('Ajouter des données de démo').click();
    const d = await data();
    const routes = ['#/', '#/history', '#/stats', '#/profile', '#/new', '#/progress', '#/records', '#/programs', '#/program/push', '#/settings', '#/help', '#/add-session', '#/exercise/squat', '#/session/' + d.sessions[d.sessions.length - 1].id, '#/session/' + d.sessions[0].id + '/edit'];
    const bad = [];
    for (const r of routes) {
      await go(r);
      await page.waitForTimeout(150);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (over > 0) bad.push(r + ' (+' + over + 'px)');
    }
    await go('#/new');
    await page.getByRole('tab', { name: 'Refaire une séance' }).click();
    if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) bad.push('#/new (refaire)');
    assert(!bad.length, 'débordements : ' + bad.join(', '));
  });

  await step('autres tailles d’iPhone (375 px et 440 px) sans débordement', async () => {
    const bad = [];
    for (const w of [375, 440]) {
      await page.setViewportSize({ width: w, height: 860 });
      for (const r of ['#/', '#/history', '#/stats', '#/profile', '#/new', '#/progress', '#/exercise/developpe-couche']) {
        await go(r);
        await page.waitForTimeout(150);
        if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) bad.push(w + ' ' + r);
      }
    }
    await page.setViewportSize({ width: 402, height: 874 });
    assert(!bad.length, bad.join(', '));
  });

  await step('aucune erreur JavaScript', async () => {
    assert(!errors.length, errors.join('\n'));
  });

  await browser.close();
  server.close();
  console.log(`\n${passed} réussi(s), ${failures.length} échec(s)`);
  process.exit(failures.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
