# SDS — carnet de musculation (PWA)

Application web installable sur iPhone pour noter ses séances de musculation. Elle fonctionne hors ligne et les données restent sur le téléphone.

## Fonctionnalités

- **Séance en direct** : le chrono démarre avec la séance (pause/reprise). Il continue même si l'app est fermée, parce qu'il est calculé à partir de l'heure de début.
- **Exercices et séries** : environ 90 exercices en français, avec recherche, filtres par muscle et exercices personnalisés. Pour chaque série on saisit les kg et les répétitions.
- **Dégressifs** : une série peut contenir plusieurs paliers, par exemple `4 × 100 kg ↘ 3 × 80 kg ↘ 2 × 60 kg`.
- **Échauffements** : une série marquée comme échauffement n'est comptée ni dans le volume ni dans les records.
- **Valeurs précédentes** : les charges et répétitions de la dernière séance sont proposées. Une touche sur ✓ les valide telles quelles.
- **Minuteur de repos** : il démarre à chaque série validée, se règle par ±15 s et émet un son et une vibration à la fin.
- **Programmes** : Push, Pull, Legs et Full body sont fournis et modifiables, et on peut créer les siens. On peut aussi refaire une séance passée.
- **Historique** : un calendrier mensuel montre les jours d'entraînement, et chaque séance a un détail que l'on peut modifier ou supprimer. On peut ajouter une séance après coup.
- **Statistiques** : volume, nombre de séances, temps, séries et calories estimées sur 7 jours, 30 jours ou 12 mois, avec une carte des groupes musculaires.
- **Profil** : progression par exercice (charge max, 1RM estimé, volume, répétitions), records, objectif et niveau.
- **Sauvegarde** : export et import d'un fichier JSON (via Fichiers / iCloud), et données de démonstration pour essayer l'app.

## Installer sur iPhone

1. Ouvrir l'URL GitHub Pages dans **Safari** : `https://loayus.github.io/SDS/`
2. Toucher **Partager** (sur iOS 26, il se trouve dans le menu **•••**), puis **« Sur l'écran d'accueil »**.
3. Laisser **« Ouvrir en tant qu'app web »** activé, puis toucher **Ajouter**.

L'app s'ouvre alors en plein écran depuis son icône et fonctionne sans réseau.

> Les données sont stockées localement dans l'app installée. Si l'icône est supprimée, les données le sont aussi : pensez à exporter une sauvegarde de temps en temps (Profil → Paramètres → Exporter).

## Mise en ligne (GitHub Pages)

Le site est statique et ne demande aucune compilation. Il suffit d'activer Pages une fois :
**Settings → Pages → Build and deployment → Source : « Deploy from a branch »**, choisir la branche qui contient ces fichiers, dossier `/ (root)`, puis **Save**.

Pour publier une nouvelle version, incrémenter `VERSION` dans `sw.js`. L'app installée affichera alors « Nouvelle version disponible ».

## Développement

```bash
python3 -m http.server 8000   # puis ouvrir http://localhost:8000/
node tests/e2e.cjs            # tests de bout en bout (nécessite le paquet « playwright »)
```

Structure :

| Dossier / fichier | Rôle |
| --- | --- |
| `index.html`, `manifest.webmanifest`, `sw.js` | coquille PWA, manifeste, cache hors ligne |
| `js/main.js` | routage, barre d'onglets, service worker |
| `js/store.js` | données (localStorage), séances, programmes, sauvegarde |
| `js/stats.js` | volumes, records, progression, répartition musculaire |
| `js/views/*` | écrans (accueil, séance, historique, stats, profil…) |
| `js/body.js`, `js/charts.js` | silhouette musculaire SVG et graphiques |
| `vendor/` | Preact + htm embarqués (voir `vendor/LICENSES.md`) |
