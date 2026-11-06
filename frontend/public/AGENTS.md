# AGENTS — Instructions pour les assistants IA

Ce fichier décrit les règles à respecter lorsqu'un agent (IA) travaille sur le dépôt
**JULTO / GRU**. Il complète `manifest.md`, qui est la référence technique de
l'application.

## 1. Lire avant d'agir
- **Toujours** consulter `manifest.md` en début de tâche : architecture, modules,
  endpoints, modèle de données, variables de fusion, rôles.
- Pour toute question fonctionnelle utilisateur, se référer à `julto-aide.md`.
- Pour les conventions d'écosystème DSI, se référer à `GUIDE_NOUVELLE_APP_VILLE.md`.

## 2. Maintenir `manifest.md` automatiquement
- `manifest.md` doit rester **synchronisé avec le code**, sans qu'on ait à le demander.
- Après toute modification, vérifier les déclencheurs listés au §16 du manifest
  (routes, pages, schéma DB, variables de template, intégrations, rôles, version,
  imports legacy, ports/env) et mettre à jour les sections concernées **dans le même
  changement**.
- Mettre à jour la ligne « Dernière revue du manifest » (date du jour).
- Tenir à jour la copie servie par le frontend : `frontend/public/manifest.md`
  (et `frontend/public/AGENTS.md`) doit refléter la version racine.

## 3. Conventions de code
- Backend : `modules/<feature>/{*.routes,*.service,*.repository}.js`
  (routes = HTTP, service = métier, repository = SQL).
- Frontend : TypeScript + Tailwind ; les appels API sont centralisés dans
  `frontend/src/services/api.ts`, les types dans `frontend/src/types/index.ts`.
- SQL toujours paramétré (`$1, $2…`) ; jamais de secret ni d'URL en dur (`.env` /
  `config_params`).
- Fonctions courtes, `async/await`, erreurs portant un `status` HTTP.
- Ne pas ajouter de commentaires superflus : commenter l'intention métier, pas la
  mécanique évidente.

## 4. Vérifications avant de terminer
- Lancer le lint : `npm run lint` (dans `backend/` et `frontend/`).
- Vérifier le build frontend si des fichiers TS/TSX changent : `npm run build`.
- Ne jamais committer `.env`, `node_modules/`, `xls/`, `ps/` (voir `.gitignore`).
- Ne committer que sur demande explicite de l'utilisateur.

## 5. Sources de vérité
| Sujet | Fichier |
|-------|---------|
| Architecture / API / DB / variables | `manifest.md` |
| Documentation utilisateur | `julto-aide.md` |
| Changelog applicatif | `frontend/src/services/version.ts` |
| Conventions DSI Ville | `GUIDE_NOUVELLE_APP_VILLE.md` |
| Instructions agents | `AGENTS.md` (ce fichier) |
