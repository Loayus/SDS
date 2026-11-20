// Paramètres, sauvegarde des données, aide & installation.
import { html, useRef } from '../lib.js';
import { getData, commit, exportPayload, parseBackup, importBackup, resetAll, deleteCustomExercise, exerciseUsageCount, getSaveError } from '../store.js';
import { Icon, nav, back, navRoot, TopBar, ListRow, Toggle, Stepper, promptDialog, confirmDialog, toast } from '../ui.js';
import { addDemoData, removeDemoData, hasDemoData } from '../demo.js';
import { MUSCLES } from '../exercises.js';
import { fmtWeight, parseNum, numToInput, fmtMinSec, dayKey, isIOS, isStandalone } from '../utils.js';
import { LogoMark } from '../logo.js';

export const APP_VERSION = '1.0.0';

async function exportData() {
  const json = JSON.stringify(exportPayload(), null, 1);
  const name = `sds-sauvegarde-${dayKey(Date.now())}.json`;
  try {
    const file = new File([json], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Sauvegarde SDS' });
      return;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return;
  }
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast('Sauvegarde exportée');
}

export function Settings() {
  const data = getData();
  const p = data.profile;
  const fileRef = useRef();
  const set = (k, v) => {
    p[k] = v;
    commit();
  };

  const editName = async () => {
    const v = await promptDialog({ title: 'Ton prénom ou pseudo', value: p.name, placeholder: 'Athlète' });
    if (v != null && v.trim()) set('name', v.trim());
  };
  const editWeight = async () => {
    const v = await promptDialog({ title: 'Poids de corps', message: 'Utilisé pour estimer les calories dépensées.', value: numToInput(p.bodyWeight), inputMode: 'decimal', suffix: 'kg' });
    const n = parseNum(v);
    if (v != null) {
      if (n && n > 20 && n < 400) set('bodyWeight', n);
      else toast('Poids invalide', { icon: 'info' });
    }
  };

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const parsed = parseBackup(await f.text());
      const ok = await confirmDialog({
        title: 'Restaurer cette sauvegarde ?',
        message: `${parsed.data.sessions.length} séance(s) trouvée(s). Tes données actuelles seront remplacées.`,
        confirmLabel: 'Restaurer',
        danger: true,
      });
      if (!ok) return;
      importBackup(parsed);
      toast('Sauvegarde restaurée');
    } catch (err) {
      toast(err.message, { icon: 'info', duration: 3500 });
    }
  };

  const reset = async () => {
    const ok = await confirmDialog({
      title: 'Tout effacer ?',
      message: 'Séances, programmes, exercices perso et réglages seront supprimés de cet appareil. Pense à exporter une sauvegarde avant.',
      confirmLabel: 'Tout effacer',
      danger: true,
    });
    if (ok) {
      resetAll();
      navRoot('/');
    }
  };

  const demo = hasDemoData();
  const custom = data.customExercises;

  return html`<div class="page settings">
    <${TopBar} title="Paramètres" onBack=${() => back('/profile')} />

    ${getSaveError() && html`<div class="card warn-card"><${Icon} name="info" size=${18} /> Impossible d'enregistrer les données (stockage plein ?). Exporte une sauvegarde.</div>`}

    <div class="group-label">Profil</div>
    <div class="card list-card">
      <${ListRow} icon="user" label="Nom" right=${html`<span class="muted">${p.name || 'Athlète'}</span>`} onClick=${editName} />
      <${ListRow} icon="weight" label="Poids de corps" right=${html`<span class="muted">${fmtWeight(p.bodyWeight)} kg</span>`} onClick=${editWeight} />
    </div>

    <div class="group-label">Séance</div>
    <div class="card list-card">
      <div class="list-row static">
        <span class="list-row-icon"><${Icon} name="timer" size=${20} /></span>
        <span class="list-row-label"><span>Temps de repos</span><small>Lancé à chaque série validée</small></span>
        <${Stepper} value=${p.restDefault} step=${15} min=${15} max=${600} format=${fmtMinSec} onChange=${(v) => set('restDefault', v)} label="Temps de repos" />
      </div>
      <div class="list-row static">
        <span class="list-row-icon"><${Icon} name="volume-2" size=${20} /></span>
        <span class="list-row-label"><span>Son en fin de repos</span><small>Inaudible si l'iPhone est en silencieux</small></span>
        <${Toggle} checked=${!!p.sound} onChange=${(v) => set('sound', v)} label="Son en fin de repos" />
      </div>
      <div class="list-row static">
        <span class="list-row-icon"><${Icon} name="sun" size=${20} /></span>
        <span class="list-row-label"><span>Garder l'écran allumé</span><small>Pendant une séance en cours</small></span>
        <${Toggle} checked=${!!p.wakeLock} onChange=${(v) => set('wakeLock', v)} label="Garder l'écran allumé" />
      </div>
      <${ListRow} icon="layers" label="Mes programmes" onClick=${() => nav('/programs')} />
    </div>

    ${custom.length > 0 &&
    html`<div class="group-label">Exercices personnalisés</div>
      <div class="card list-card">
        ${custom.map(
          (ex) => html`<div class="list-row static" key=${ex.id}>
            <span class="list-row-label"><span>${ex.name}</span><small>${MUSCLES[ex.muscle]?.name}</small></span>
            <button
              class="icon-btn small danger"
              aria-label=${'Supprimer ' + ex.name}
              onClick=${async () => {
                const used = exerciseUsageCount(ex.id);
                const ok = await confirmDialog({
                  title: `Supprimer « ${ex.name} » ?`,
                  message: used ? `Il apparaît dans ${used} séance(s) : il y sera affiché comme « Exercice supprimé ».` : 'Il n’est utilisé dans aucune séance.',
                  confirmLabel: 'Supprimer',
                  danger: true,
                });
                if (ok) deleteCustomExercise(ex.id);
              }}
            >
              <${Icon} name="trash-2" size=${18} />
            </button>
          </div>`
        )}
      </div>`}

    <div class="group-label">Données</div>
    <div class="card list-card">
      <${ListRow} icon="download" label="Exporter une sauvegarde" sub="Fichier .json à garder dans Fichiers / iCloud" onClick=${exportData} />
      <${ListRow} icon="upload" label="Importer une sauvegarde" onClick=${() => fileRef.current.click()} />
      <${ListRow}
        icon="sparkles"
        label=${demo ? 'Retirer les données de démo' : 'Ajouter des données de démo'}
        sub=${demo ? 'Supprime uniquement les séances de démonstration' : 'Pour découvrir l’app avec 8 semaines d’exemple'}
        onClick=${() => {
          if (demo) {
            removeDemoData();
            toast('Données de démo retirées');
          } else {
            addDemoData();
            toast('Données de démo ajoutées');
          }
        }}
      />
      <${ListRow} icon="trash-2" label="Tout effacer" danger onClick=${reset} />
    </div>
    <input ref=${fileRef} type="file" accept="application/json,.json" hidden onChange=${onFile} />

    <div class="group-label">À propos</div>
    <div class="card list-card">
      <${ListRow} icon="circle-help" label="Aide & installation" onClick=${() => nav('/help')} />
      <div class="list-row static">
        <span class="list-row-icon"><${Icon} name="info" size=${20} /></span>
        <span class="list-row-label"><span>Version</span></span>
        <span class="muted">${APP_VERSION}</span>
      </div>
    </div>
    <p class="muted small center footnote">Tes données sont stockées uniquement sur cet appareil. Exporte une sauvegarde de temps en temps.</p>
  </div>`;
}

export function Help() {
  const installed = isStandalone();
  return html`<div class="page help">
    <${TopBar} title="Aide & installation" onBack=${() => back('/profile')} />

    <div class="help-hero">
      <${LogoMark} size=${64} glow />
      <div class="welcome-word small">S D S</div>
      ${installed ? html`<div class="pill ok"><${Icon} name="circle-check" size=${16} /> Installée sur l'écran d'accueil</div>` : null}
    </div>

    <div class="group-label">Installer sur iPhone</div>
    <div class="card help-steps">
      <ol>
        <li>Ouvre cette page dans <b>Safari</b>.</li>
        <li>Touche le bouton <b>Partager</b> <span class="kbd"><${Icon} name="share" size=${15} /></span> (sur iOS 26, il est dans le menu <b>•••</b> en bas à droite).</li>
        <li>Fais défiler et choisis <b>« Sur l'écran d'accueil »</b>.</li>
        <li>Vérifie que <b>« Ouvrir en tant qu'app web »</b> est activé, puis touche <b>Ajouter</b>.</li>
        <li>Lance <b>SDS</b> depuis son icône : l'app s'ouvre en plein écran et fonctionne même sans réseau.</li>
      </ol>
      ${!isIOS() && html`<p class="muted small">Sur Android / Chrome : menu ⋮ → « Installer l'application ».</p>`}
    </div>

    <div class="group-label">Pendant une séance</div>
    <div class="card help-tips">
      <p><b>Chrono</b> — il démarre avec la séance et continue même si tu quittes l'app. Le bouton pause l'arrête.</p>
      <p><b>Valeurs grisées</b> — ce sont tes charges/reps de la dernière fois. Touche ✓ pour les valider telles quelles, ou touche la colonne « Précédent » pour les recopier.</p>
      <p><b>Dégressif</b> — bouton « Dégressif » sous l'exercice (ajouté à la dernière série) ou touche le numéro d'une série → « Ajouter un dégressif ». Ex. : 4 × 100 kg ↘ 3 × 80 kg ↘ 2 × 60 kg.</p>
      <p><b>Échauffement</b> — touche le numéro d'une série → « Marquer comme échauffement » : elle n'est pas comptée dans le volume ni les records.</p>
      <p><b>Repos</b> — un minuteur démarre à chaque série validée (réglable dans les paramètres, ±15 s pendant le repos).</p>
      <p><b>Réduire</b> — la flèche en haut à gauche te ramène à l'accueil sans arrêter la séance.</p>
    </div>

    <div class="group-label">Tes données</div>
    <div class="card help-tips">
      <p>Tout est enregistré <b>localement sur ton iPhone</b>, sans compte ni serveur. Si tu supprimes l'app de l'écran d'accueil, les données sont effacées : exporte une sauvegarde régulièrement (Paramètres → Exporter).</p>
    </div>
  </div>`;
}
