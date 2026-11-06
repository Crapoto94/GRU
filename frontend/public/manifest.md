# MANIFEST — JULTO / GRU

> **Document de référence (« bible ») de l'application.**
> Ce fichier est la source de vérité pour comprendre, maintenir et faire évoluer
> l'application. Il est mis à jour automatiquement à chaque modification de code ou
> de documentation (voir §16 — *Maintenance du manifest*).

| Champ | Valeur |
|-------|--------|
| Nom de l'application | **JULTO** — « J'ai Un Lien pour Tout, Ouf ! » |
| Nom technique | **GRU** — Gestion des Relations Usager |
| Version applicative courante | **0.4.0** (source : `frontend/src/services/version.ts`) |
| Dernière version `version.json` | 0.2.1 *(désynchronisée, cf. §14)* |
| Éditeur / contexte | Ville d'Ivry-sur-Seine — DSI |
| Type | Application web fullstack (frontend + backend séparés) |
| Dépôt | `C:\dev\GRU` |
| Dernière revue du manifest | 2026-11-06 |

---

## 1. Présentation & objectif

JULTO est une application métier destinée aux services de la Ville pour :

1. **Gérer le registre des usagers** (état civil, coordonnées, adresses, logements,
   consentements RGPD, archivage).
2. **Générer des attestations** au format Word à partir de modèles `.docx`
   (fusion de variables : usager, logement, système, personnalisées).
3. **Suivre les demandes de pièces d'identité** (CNI / Passeport) sous forme de
   dossiers multi-usagers et multi-pièces, avec frise chronologique, suivi,
   et notifications SMS/e-mail.
4. **Consulter l'archive ALTO** (ancien système) : attestations d'accueil (ADA),
   historique des usagers, liens familiaux, logements.
5. **Assurer la conformité RGPD** : durées de conservation paramétrables, alertes
   d'archivage, journal d'activité.

L'application s'intègre à l'écosystème de la Ville : base PostgreSQL partagée
(schéma dédié `gru`), API centrale APM (`api.ivry.local`) pour SMS / e-mail /
Active Directory, et API Synbird pour les rendez-vous.

---

## 2. Stack technique

### Backend
- **Node.js** (image `node:20-alpine`) + **Express 5**
- **PostgreSQL** via `pg` (pool + wrapper `db.all/get/run`)
- Auth : `jsonwebtoken` (JWT applicatif) + `bcryptjs` (mots de passe locaux)
- Fichiers : `multer` (upload `.docx`), `docxtemplater` + `pizzip` (fusion Word),
  `mammoth` (lecture Word), `libreoffice-convert` (conversion, dépendance système)
- Import tableurs : `xlsx` (SheetJS) + lecteur XLSX maison (`xlsxStreamReader.js`)
- API docs : `swagger-jsdoc` + `swagger-ui-express` (`/api-docs`)
- Sécurité : `helmet`, `cors`, `express-rate-limit` (200 req / 15 min)

### Frontend
- **React 18** + **TypeScript** (`tsc -b`)
- **Vite 6** (dev + build), proxy `/api` → `http://localhost:3221`
- **Tailwind CSS 3**, `react-router-dom` 7, `axios`
- `lucide-react` (icônes), `framer-motion` (animations), `react-hot-toast` (toasts)
- `react-markdown` + `remark-gfm` (aide intégrée), `date-fns`, `countries-list`

### Conteneurisation
- `docker-compose.yml` : service `backend` (port interne 3221) + service `frontend`
  (Nginx port 80 exposé sur 3220), volume nommé `uploads`.
- Nginx sert le SPA (fallback `index.html`) et reverse-proxy `/api/` vers `backend:3221`.

### Outils
- Lint : ESLint 9 (`npm run lint` côté backend et frontend), config *flat*
  `eslint.config.js` dans chaque projet.
- Migrations : `npm run migrate` (dossier `backend/migrations`, aujourd'hui absent —
  le schéma est créé par `setupDb()`, cf. §7).
- Seed : `npm run seed` (5 usagers de test).

---

## 3. Architecture générale

```
Navigateur
   │  React SPA (Vite, port 3220)
   ▼
Nginx / Vite proxy  ──/api/──►  Express API (port 3221)
                                    │
                    ┌───────────────┼────────────────────┐
                    ▼               ▼                    ▼
            PostgreSQL (schéma gru)  API Ville (APM)   API Synbird
                                     SMS / Mail / AD
```

- Le frontend ne connaît que l'URL de son backend (`VITE_API_URL`, injectée au build).
- Le backend centralise tous les secrets et appels externes.
- Toutes les routes applicatives sont préfixées `/api/v1/`.
- Toutes les tables sont préfixées par le schéma (`"gru".<table>`), jamais en dur :
  `SCHEMA_NAME` (env) est utilisé partout.

---

## 4. Arborescence du dépôt

```
C:\dev\GRU
├── backend/                     API Express
│   ├── src/
│   │   ├── server.js            point d'entrée, montage des routes, Swagger, seedAdmin
│   │   ├── config/pg_db.js      pool PG, SCHEMA_NAME, setupDb() (DDL + seeds + index)
│   │   ├── middleware/auth.js   authenticateToken, requireRole
│   │   ├── modules/             un dossier par domaine (routes/service/repository)
│   │   │   ├── ad/              Active Directory (proxy APM)
│   │   │   ├── attestations/    templates .docx + génération + archive ADA
│   │   │   ├── auth/            login local / AD, changement de mot de passe
│   │   │   ├── dossiers/        demandes CNI / Passeport
│   │   │   ├── health/          /health et /health/status
│   │   │   ├── listes/          listes de correspondance (référentiels)
│   │   │   ├── logements/       logement principal / secondaire
│   │   │   ├── logs/            journal d'activité
│   │   │   ├── parametrage/     config DB, API Ville, Synbird, messages
│   │   │   ├── rgpd/            conservation + alertes + archivage
│   │   │   ├── usagers/         registre usagers
│   │   │   └── users/           comptes applicatifs
│   │   └── utils/               logger, validators, apiVille, synbird,
│   │                            messageTemplates, dossierEtapes, occupantsHabituels,
│   │                            importLegacy*, migrate, seed, xlsxStreamReader
│   ├── templates/               fichiers .docx des templates (volume)
│   ├── uploads/documents/       attestations .docx générées (volume)
│   ├── Dockerfile               node:20-alpine + libreoffice + ghostscript
│   ├── eslint.config.js         config ESLint 9 (flat, Node/CommonJS)
│   └── package.json
├── frontend/                    SPA React + TypeScript
│   ├── src/
│   │   ├── App.tsx              routes + modales globales (Aide, Nouveautés)
│   │   ├── contexts/AuthContext.tsx
│   │   ├── components/          Sidebar, HelpModal, WhatsNewModal, LogementModal,
│   │   │                        PaginationBar, AdaLegacyPreviewModal
│   │   ├── pages/               20 pages (voir §10)
│   │   ├── services/api.ts      client axios + toutes les fonctions API
│   │   ├── services/version.ts  VERSION + CHANGELOG (source de vérité changelog)
│   │   ├── types/index.ts       types TypeScript du domaine
│   │   └── utils/format.ts      formatNom / formatPrenom
│   ├── public/julto-aide.md     aide utilisateur (chargée par HelpModal)
│   ├── public/manifest.md       copie servie du manifest (lien footer)
│   ├── public/AGENTS.md         copie servie des instructions agents (lien footer)
│   ├── nginx.conf               SPA + proxy /api
│   ├── Dockerfile               build Vite → nginx:alpine
│   ├── eslint.config.js         config ESLint 9 (flat, TS/React)
│   └── package.json
├── xls/                         exports ALTO sources des imports (non committé)
├── ps/Display-Help.ps1          affichage console de julto-aide.md
├── julto-aide.md                documentation utilisateur (copie dans public/)
├── GUIDE_NOUVELLE_APP_VILLE.md  conventions DSI Ville
├── AGENTS.md                    instructions pour les assistants IA (copie dans public/)
├── version.json                 changelog historique (0.1.0 → 0.2.1)
├── docker-compose.yml
├── lancer.bat                   install + lancement dev Windows (backend 3221, front 3220)
├── .env / .env.example          configuration (voir §6)
└── manifest.md                  CE FICHIER
```

---

## 5. Démarrage, build & déploiement

### Développement (Windows)
```powershell
.\lancer.bat            # npm install backend+frontend puis lance les deux en --watch
# Frontend : http://localhost:3220   Backend : http://localhost:3221
# Swagger  : http://localhost:3221/api-docs
```
Ou manuellement :
```powershell
# backend
cd backend; npm install; npm run dev      # node --watch src/server.js
# frontend
cd frontend; npm install; npm run dev     # vite (port 3220)
```

### Production (Docker)
```bash
docker-compose up -d --build
```
- Backend exposé sur `${PORT:-3221}` (port interne 3221).
- Frontend Nginx exposé sur `3220:80`, `VITE_API_URL` passé en argument de build.
- Volume `uploads` partagé pour `templates/` et `uploads/documents/`.

### Base de données
- Le schéma et les tables sont créés/mis à jour **automatiquement au démarrage**
  du serveur via `setupDb()` (`backend/src/config/pg_db.js`).
- `seedAdmin()` crée un compte `admin` / mot de passe `admin` (rôle
  `administrateur`) s'il n'existe pas.
- `npm run migrate` existe mais le dossier `backend/migrations` est absent :
  le script est aujourd'hui vestigial.

### Comptes par défaut
- `admin` / `admin` (administrateur, créé au premier démarrage).

---

## 6. Variables d'environnement

Source : `.env` (non committé) — modèle : `.env.example`. Chargé depuis la racine
par `server.js` (`dotenv`).

| Variable | Rôle | Défaut |
|----------|------|--------|
| `POSTGRES_HOST` | Hôte PostgreSQL | `localhost` |
| `POSTGRES_PORT` | Port PostgreSQL | `5432` |
| `POSTGRES_DB` | Base | `ivry_admin` |
| `POSTGRES_USER` | Utilisateur DB | `app_gru` |
| `POSTGRES_PASSWORD` | Mot de passe DB | *(vide)* |
| `SCHEMA_NAME` | Schéma dédié de l'app | `gru` |
| `PORT` | Port d'écoute backend | `3000` (compose : 3221) |
| `NODE_ENV` | Environnement | `development` |
| `JWT_SECRET` | Secret de signature JWT | `dev_secret` |
| `CORS_ORIGIN` | Origine CORS autorisée | `*` |
| `APM_API_URL` / `APM_API_KEY` | API centrale Ville | — |
| `HUBDSI_API_URL` / `HUBDSI_API_KEY` | API métier Hub DSI | — |
| `VITE_API_URL` | URL backend vue du front (build) | *(vide → même origine)* |

> **Règle DSI** : aucune URL, clé ou port en dur dans le code — tout passe par `.env`.
> `VITE_API_URL` n'est utilisée que côté frontend, au build.

### Configuration stockée en base (table `config_params`)
Modifiable via l'interface Paramétrage, sans redéploiement :
- `api_ville_url`, `api_ville_port`, `api_ville_token`, `api_ville_description`
- `synbird_url`, `synbird_token`, `synbird_description`
- `dossier_sms_template`, `dossier_email_subject_template`, `dossier_email_content_template`

---

## 7. Base de données — modèle de données

Schéma : `"gru"` (variable `SCHEMA_NAME`). Toutes les tables sont dans ce schéma.
DDL et migrations « en place » dans `setupDb()` (`ALTER TABLE ... IF NOT EXISTS`).

### Référentiel usagers
| Table | Rôle | Points clés |
|-------|------|-------------|
| `usagers` | Registre principal | `id UUID`, civilité, nom/prénom/nom_usage/`mention_nom_usage`, `taille` (cm), `couleur_yeux`, `piece_identite_type` (CNI/Passeport/Titre de séjour) + `piece_identite_numero`, date/lieu/pays de naissance, nationalité, situation familiale, contacts, `Adresse` (colonne legacy en majuscule), CP, ville, pays, `mail_actif`, `consentement_rgpd`, `date_consentement`, `archived` + `date_archivage` + `motif_archivage`, `created_by`, timestamps |
| `logements` | Logement d'un usager | `type_logement` ∈ {principal, secondaire}, adresse, surface, pièces, état sanitaire, occupants (détails/permanents/temporaires), `statut_occupation` ∈ {proprietaire, locataire, autre} + précision. **UNIQUE(usager_id, type_logement)** |
| `usagers_historique` | Historique des versions ALTO | `legacy_id_enreg`, `legacy_id_precedent`, `legacy_id_origine`, `derni_etat`, `data JSONB` |
| `usagers_liens_familiaux` | Liens familiaux ALTO | `type_lien` ∈ {conjoint, pere, mere}, `lien_legacy_id_enreg`, `lien_usager_id` |
| `consentements_rgpd` | Historique des consentements | `type_consentement`, `consentement`, `ip_address` |

### Attestations
| Table | Rôle | Points clés |
|-------|------|-------------|
| `templates` | Modèles Word | `fichier_original`, `variables JSONB`, `nb_usagers` (1-3), `usager_labels JSONB`, `usage_logement_principal/secondaire`, `actif` (soft delete) |
| `attestations` | Attestations générées | `usager_id`, `usager2_id`, `usager3_id`, `template_id`, `titre`, `contenu_genere JSONB`, `fichier_pdf` (nom du .docx généré), `statut` (`genere` / `import_alto` / `brouillon`), `date_generation`, `genere_par`, suivi : `no_cerfa`, `date_demande`, `date_debut_validite`/`date_fin_validite` (période), `statut_suivi` ∈ {en_cours, ajourne, arrive, recupere, archive} (les attestations antérieures à ce suivi sont passées en `archive`), `commentaire_suivi` (document manquant si ajourné), `date_statut`. **Certificats** = attestations dont le modèle contient « certificat » ou « concubinage » (pas de statut : seul l'archivage s'applique) |
| `attestations_ada` | Archive ALTO (attestations d'accueil) | `legacy_id_demande UNIQUE`, CERFA, pièces, dates validité, hébergeant/hébergé (legacy + usager), lien parenté, ressources, vérifications, `data JSONB` |

### Demandes CNI / Passeport
| Table | Rôle | Points clés |
|-------|------|-------------|
| `dossiers_pieces_identite` | Dossier (regroupe des pièces) | `created_by`, `categorie` ∈ {majeur, mineur} (déduit de la date de naissance du bénéficiaire), `tutelle` BOOLEAN, `parent1_usager_id`, `parent2_usager_id`, `tuteur_usager_id` |
| `dossier_etapes_menu` | Choix du menu « Changer d'état » (paramétrable) | `code` PK, `statut`, `libelle`, `commentaire` (affiche une case commentaire), `personne` ∈ {parent1, parent2, tuteur} (choix proposé seulement si le dossier comporte cette personne ; son nom est ajouté au libellé ; `si_tuteur` obsolète), `actif`, `ordre`. Initialisée une seule fois depuis `MENU_SEED` (`utils/dossierEtapes.js`) |
| `dossier_pieces` | Une pièce d'un dossier | `usager_id` (bénéficiaire), `type_piece` ∈ {CNI, Passeport}, `date_demande`, `statut` ∈ {demande (affiché « En cours »), ajourne, arrive, recupere, refuse (affiché « Archivé »), erreur_piece (« Erreur pièce »)}, `destinataire_usager_id`, `canal_notification` ∈ {sms, email, both}, dates arrivée/récupération, `notifie`, `legacy_id_demande`, `motif` (codes dans `utils/dossierMotifs.js` : premiere_demande, renouvellement, identite_numerique, perte, vol, deterioration, changement_etat_civil, erreur_administration, pages_visa_completes). **UNIQUE(dossier_id, usager_id, type_piece)** |
| `dossier_suivi` | Commentaires de suivi | `agent`, `commentaire`, `automatique` |
| `dossier_piece_etapes` | Frise chronologique d'une pièce | `ordre`, `date_etape`, `libelle`, `statut_equivalent`, `code_legacy` |
| `dossier_notifications` | Historique des envois | `canal` ∈ {sms, email}, `destinataire`, `statut` ∈ {envoye, echec}, `erreur`, `envoye_par` |

### Administration & transversal
| Table | Rôle | Points clés |
|-------|------|-------------|
| `users` | Comptes applicatifs | `login UNIQUE`, `email UNIQUE`, `password_hash`, `role` ∈ {utilisateur, administrateur, dpd}, fonction/service/direction, `source` ∈ {local, ad}, `actif` |
| `logs_acces` | Journal d'activité | `utilisateur`, `action`, `table_concernee`, `record_id`, `details JSONB`, `ip_address` |
| `config_params` | Configuration clé/valeur | `cle PK`, `valeur`, `description` |
| `rgpd_conservation` | Règles de conservation | `cle PK`, `libelle`, `categorie` ∈ {attestations, dossiers, usagers}, `conservation_mois`, `actif` |
| `listes_reference` | Listes de correspondance | `cle UNIQUE`, `nom` |
| `listes_reference_valeurs` | Valeurs d'une liste | `code`, `label`, `ordre`. **UNIQUE(liste_id, code)** |

Seeds automatiques dans `setupDb()` :
- Liste `lien_parente` (28 valeurs : Grand Mère, Père, Conjoint, etc.).
- Règles RGPD : une par template actif (`attestation_<id>`, 36 mois),
  `demandes_cni` (24 mois), `infos_usager` (60 mois).

Index notables : `usagers(nom, prenom, archived, email)`,
`attestations(usager_id, statut)`, `dossier_pieces(dossier_id, usager_id, statut, legacy_id_demande)`,
`usagers_historique(usager_id, legacy_id_enreg, legacy_id_origine)`, `listes_reference_valeurs(liste_id)`.

---

## 8. Authentification, rôles & sécurité

### Mécanismes
- **Login local** : `POST /api/v1/auth/login` → vérifie `password_hash` (bcrypt) →
  JWT signé avec `JWT_SECRET`.
- **Login Active Directory** : `POST /api/v1/auth/login-ad` → délègue à l'API Ville
  (`POST /api/v1/ad/authenticate`) → crée/maj le compte local (`source='ad'`,
  `password_hash=''`) → JWT applicatif.
- Le JWT est stocké côté navigateur (`localStorage` : `gru_token`, `gru_user`) et
  envoyé en `Authorization: Bearer <token>` (intercepteur axios).

### Middleware (`middleware/auth.js`)
- `authenticateToken` : vérifie le JWT → `req.user` (payload décodé).
- `requireRole(...roles)` : restreint par rôle (403 sinon).

### Rôles
| Rôle | Accès |
|------|-------|
| `utilisateur` | Usagers, attestations, dossiers. Pas de Paramétrage, pas de RGPD. |
| `administrateur` | Tout + Paramétrage + RGPD + suppressions définitives. |
| `dpd` | Accès RGPD uniquement (pas de Paramétrage). |

### Points de sécurité
- `helmet`, CORS (`CORS_ORIGIN`), rate-limit global.
- Suppression usagers / attestations / templates : réservée `administrateur`.
- RGPD (conservation, alertes, archivage) : `administrateur` ou `dpd`.
- Écriture listes de correspondance : `administrateur`.
- Uploads : seuls les `.docx`, taille max 10 Mo (`multer`).
- Requêtes SQL toujours paramétrées (`$1, $2…`).

---

## 9. API REST (backend)

Base : `/api/v1`. `🔒` = JWT requis. `👑` = administrateur. `🛡️` = administrateur ou dpd.
Documentation interactive : `GET /api-docs` (Swagger).

### Health (public)
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/health` | Statut simple (`{status:"ok"}`) |
| GET | `/health/status` | État détaillé backend / DB / API Ville |

### Auth
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/auth/login` | Connexion locale → JWT |
| POST | `/auth/login-ad` | Connexion Active Directory → JWT |
| GET 🔒 | `/auth/me` | Profil de l'utilisateur connecté |
| POST 🔒 | `/auth/change-password` | Changer son mot de passe (comptes locaux) |

### Usagers 🔒
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/usagers` | Liste paginée (search, date_naissance JJ/MM/AAAA, nom, prenom, telephone, adresse, code_postal, ville, archived, limit, offset). Renvoie aussi `cni_count` et `attestation_count` |
| GET | `/usagers/check-doublon` | Doublons nom+date_naissance et téléphone |
| GET | `/usagers/validate/adresse` | Autocomplétion adresse (api-adresse.data.gouv.fr) |
| GET | `/usagers/import-synbird` | Pré-remplissage depuis Synbird (téléphone/e-mail) |
| GET | `/usagers/:id/pieces` | Demandes CNI/Passeport de l'usager (statut, dates, destinataire) |
| GET | `/usagers/:id/demarches` | Démarches (CNI/Passeport + attestations) triées par date décroissante |
| GET | `/usagers/:id` | Détail |
| POST | `/usagers` | Créer |
| PUT | `/usagers/:id` | Modifier |
| POST | `/usagers/:id/archive` | Archiver (motif optionnel) |
| POST | `/usagers/:id/restore` | Restaurer |
| GET/PUT/DELETE | `/usagers/:id/logement?type=principal\|secondaire` | Logement |
| DELETE 👑 | `/usagers/:id` | Suppression définitive |

### Attestations 🔒
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/attestations/templates` | Lister les templates actifs |
| GET | `/attestations/templates/:id` | Détail template |
| POST | `/attestations/templates` | Créer (JSON) |
| POST | `/attestations/templates/upload` | Upload `.docx` + métadonnées (multipart) |
| PUT | `/attestations/templates/:id` | Modifier (multipart, fichier optionnel) |
| DELETE 👑 | `/attestations/templates/:id` | Soft delete (`actif=false`) + suppression fichier |
| GET | `/attestations/templates/:id/download` | Télécharger le `.docx` d'origine |
| GET | `/attestations` | Lister les attestations générées (hors `import_alto`). Filtres : `search` (nom, CERFA…), `nom`, `date_naissance` (JJ/MM/AAAA partiel), `template_type` (`accueil` / `certificat`), `statut_suivi` (liste séparée par virgules), `usager_id`. Les archivés sont masqués sauf filtre explicite |
| PATCH | `/attestations/:id/suivi` | Changer le statut de suivi (`statut`, `commentaire` obligatoire pour `ajourne`) ou archiver (`archive`) |
| GET | `/attestations/ada` | Archive ALTO (attestations d'accueil) |
| GET | `/attestations/ada/:legacyId` | Détail ADA |
| GET | `/attestations/:id` | Détail |
| POST | `/attestations/generate` | Générer (usager_id, usager2_id?, usager3_id?, template_id, custom_data?, logement_concerne?, `replace_id?` : attestation remplacée une fois la nouvelle générée, utilisé par la modification) |
| GET | `/attestations/:id/download` | Télécharger le document généré |
| DELETE 👑 | `/attestations/:id` | Supprimer (fichier inclus) |

### Demandes CNI / Passeport 🔒
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/stats/dashboard` | Compteurs du tableau de bord (usagers, pièces, attestations, délais moyens d'arrivée) |
| GET | `/gabarits` | Gabarits de courriers (ajournement, relance, archivage) + variables disponibles |
| GET/PUT/DELETE | `/gabarits/:cle` (`/download` pour GET) | Télécharger / remplacer (admin, .docx validé) / rétablir le gabarit par défaut. Défauts : `backend/templates/gabarits/defaults/` ; versions déposées : `backend/uploads/gabarits/` (hors git) |
| POST | `/dossiers/pieces/:pieceId/courrier` | Génère le courrier .docx selon le statut de la pièce (ajourné → ajournement, arrivé → relance, archivé → archivage) et le trace dans le suivi du dossier |
| GET/PUT | `/parametrage/dossier-etapes` | Lire / remplacer (admin) la liste des étapes du menu |
| GET | `/dossiers/pieces` | **Liste CNI/Passeport, une ligne par pièce** : agent, usager, naissance, pièce, motif, statut, `depuis_date` (en cours = depuis la demande ; ajourné / arrivé / récupéré = depuis l'entrée dans le statut), contact du destinataire. Filtres `statut` (liste), `type_piece`, `search` (nom/prénom/téléphone), `date_naissance`, `only_pending` |
| GET | `/dossiers` | Liste agrégée par dossier (filtres, tri, `only_pending`, `statut` multiple séparé par virgules) |
| GET | `/dossiers/etapes-catalogue` | Catalogue des étapes possibles |
| GET | `/dossiers/:id` | Détail (pièces + étapes + suivi) |
| PUT | `/dossiers/:id` | Modifier un dossier (mêmes champs que la création : fiches usagers, parents, tuteur, pièces ajoutées/retirées, motifs, date) |
| POST | `/dossiers` | Créer : `tutelle` (bool), `parent1` (requis si le bénéficiaire est mineur), `parent2?`, `tuteur?` (requis si tutelle) — objets usager ; la catégorie majeur/mineur est déduite de la date de naissance ; le retrait/la notification vont au tuteur, sinon au parent 1, `lignes[]` (`usager` = objet usager avec `id` si fiche existante — les champs saisis mettent la fiche à jour — sinon la fiche est créée ; `usager_id` accepté ; `types[]`, `motifs{CNI,Passeport}`, `date_demande`, `canal_notification`) |
| DELETE | `/dossiers/:id` | Supprimer le dossier |
| POST | `/dossiers/:id/suivi` | Ajouter un commentaire de suivi |
| PATCH | `/dossiers/pieces/:pieceId/statut` | Ajouter une étape (met à jour le statut) |
| PUT | `/dossiers/pieces/:pieceId` | Modifier la pièce |
| DELETE | `/dossiers/pieces/:pieceId` | Retirer une pièce (jamais la dernière) |
| POST | `/dossiers/pieces/:pieceId/notify` | Envoyer SMS ou e-mail au destinataire |
| GET | `/dossiers/pieces/:pieceId/notifications` | Historique des notifications |

### RGPD 🛡️
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/rgpd/conservation` | Liste des règles |
| GET | `/rgpd/conservation/:cle` | Détail d'une règle |
| PUT | `/rgpd/conservation/:cle` | Mettre à jour la durée |
| GET | `/rgpd/alertes` | Usagers à archiver (dernier événement > durée) |
| POST | `/rgpd/archiver` | Archiver une sélection |

### Listes de correspondance 🔒
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/listes-correspondance` | Lister listes + valeurs |
| GET | `/listes-correspondance/:cle` | Détail par clé |
| POST 👑 | `/listes-correspondance` | Créer une liste |
| PUT 👑 | `/listes-correspondance/:id` | Renommer |
| DELETE 👑 | `/listes-correspondance/:id` | Supprimer (cascade valeurs) |
| POST 👑 | `/listes-correspondance/:id/valeurs` | Ajouter/upsert une valeur |
| PUT 👑 | `/listes-correspondance/:id/valeurs/:valueId` | Modifier une valeur |
| DELETE 👑 | `/listes-correspondance/:id/valeurs/:valueId` | Supprimer une valeur |

### Utilisateurs 🔒
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/users` | Lister |
| GET | `/users/:id` | Détail |
| POST | `/users` | Créer (compte local) |
| POST | `/users/create-from-ad` | Créer depuis l'AD |
| PUT | `/users/:id` | Modifier |
| DELETE | `/users/:id` | Supprimer |
| POST | `/users/:id/reset-password` | Réinitialiser le mot de passe |

### Active Directory 🔒
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/ad/search?q=` | Rechercher un agent (min. 2 caractères) |
| GET | `/ad/user?identifier=` | Détails d'un agent |
| POST | `/ad/authenticate` | Authentifier un agent |

### Paramétrage 🔒
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/parametrage/database` | Infos connexion + tables + compteurs |
| POST | `/parametrage/database/test` | Tester la connexion (latence) |
| GET/PUT | `/parametrage/api-ville` | Config API Ville |
| POST | `/parametrage/api-ville/test` | Test API Ville |
| GET/PUT | `/parametrage/synbird` | Config API Synbird |
| POST | `/parametrage/synbird/test` | Test API Synbird |
| GET/PUT | `/parametrage/dossiers-messages` | Modèles SMS/e-mail |

### Logs 🔒
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/logs` | Journal d'activité (limit, offset, action, utilisateur) |

---

## 10. Frontend — routes & pages

Toutes les routes protégées sont sous `<ProtectedRoute>` (redirection `/login`).
`/rgpd` est en plus sous `<RgpdRoute>` (`canAccessRgpd`).

| Route | Page | Rôle |
|-------|------|------|
| `/login` | `LoginPage` | Connexion (base locale ou AD) + état des services (poll 15 s) |
| `/` | `Dashboard` | Tuiles cliquables : usagers (Ivry, majeurs/mineurs), CNI/Passeport par statut, attestations, délai moyen d'arrivée (7 j / 30 j) |
| `/usagers` | `UsagersList` | Liste (colonnes nom, prénom, naissance, adresse, CNI/Pass, attestations, certificats ; ligne dépliable = démarches par date décroissante), recherche date de naissance + nom, recherche simple/avancée, import Synbird, modales attestations & logement, archive/restauration/suppression |
| `/usagers/nouveau` | `UsagerForm` | Création (pré-remplissage Synbird possible) |
| `/usagers/:id` | `UsagerForm` | Édition + détection de doublons |
| `/attestations` | `AttestationsList` | Attestations d'accueil : agent, CERFA, hébergeant, hébergé, période, statut modifiable en ligne (en cours / ajourné avec document manquant / arrivé / récupéré / archivé), « depuis » en jours (rouge si arrivé et période dépassée), contact, actions ; `?statut=` |
| `/attestations/ada` | `AdasList` | Archive ALTO (attestations d'accueil) |
| `/attestations/nouvelle` | `AttestationGenerate` | Attestation d'accueil (modèle unique, sans menu déroulant) : demande (date, CERFA, période) + modèle → demandeur (état civil, pièce d'identité, contact ; liaison à un usager existant par recherche ou correspondance nom/prénom/date, mise à jour de la fiche à l'enregistrement) + logement côte à côte (+ 2e/3e usager selon le modèle) → variables |
| `/attestations/:id/modifier` | `AttestationGenerate` | Même interface préremplie ; enregistre usagers + logement puis régénère l'attestation (remplace l'ancienne) |
| `/dossiers` | `DossiersList` | CNI / Passeport, une ligne par pièce : recherche date de naissance + nom/téléphone, filtres pièce/statut, statut modifiable en ligne (libellés « en cours » = demande, « archivé » = refusé, nouveau statut « Erreur pièce » en violet ; chaque changement alimente la frise), « depuis » rouge à partir de 60 j (arrivé / ajourné), icône empreinte pour les mineurs de 12 ans et plus, nom des mineurs en violet |
| `/certificats` | `CertificatsList` | Certificats : agent, usagers (2 usagers l'un sous l'autre), naissance, motif (= modèle), date de demande, contact ; sans statut |
| `/certificats/nouveau`, `/certificats/:id/modifier` | `AttestationGenerate` (`kind="certificat"`) | Même formulaire que l'attestation d'accueil avec choix du motif (modèle) |
| `/dossiers/nouveau`, `/dossiers/:id/modifier` | `DossierForm` | Création / modification d'un dossier : tutelle (case), majeur/mineur déduit de la naissance, motifs par pièce, état civil complet ; mineur → Parent 1, Parent 2 et adresse (2e adresse si différentes) ; tutelle → Tuteur ; détection des usagers correspondants (nom, prénom, date) pour lier une fiche existante ; pas de création d'usager séparée |
| `/dossiers/:id` | `DossierDetail` | Frise, changement d'étape, notifications, suivi ; menu « Changer d'état » simplifié par groupes (en cours / ajourné : photo, signature, justificatif de domicile, déclaration de vol, jugement, justificatif d'identité / arrivé / récupéré : demandeur, tuteur, mandataire / archivé / erreur pièce) ; commentaire libre pour ajourné et erreur pièce, affiché dans le dossier et la frise (`dossier_piece_etapes.commentaire`) |
| `/rgpd` 🛡️ | `RgpdPage` | Durées de conservation + alertes d'archivage |
| `/parametrage/attestations` 👑 | `ParametrageAttestations` | Templates `.docx`, variables, nb usagers, logements |
| `/parametrage/listes-correspondance` 👑 | `ListesCorrespondance` | Référentiels (liens de parenté…) |
| `/parametrage/base-de-donnees` 👑 | `ParametrageDatabase` | Infos DB + test |
| `/parametrage/api-ville` 👑 | `ParametrageApiVille` | Config API Ville + test |
| `/parametrage/synbird` 👑 | `ParametrageSynbird` | Config API Synbird + test |
| `/parametrage/gabarits` 👑 | `ParametrageGabarits` | Télécharger / remplacer / réinitialiser les gabarits Word des courriers, liste des variables |
| `/parametrage/etapes-dossiers` 👑 | `ParametrageEtapes` | Gestion des choix du menu « Changer d'état » par statut (libellé, commentaire, si tuteur, actif, ordre) |
| `/parametrage/messages` 👑 | `ParametrageMessages` | Modèles SMS/e-mail + aperçu |
| `/parametrage/utilisateurs` 👑 | `UsersPage` | Comptes + import AD |
| `/parametrage/logs` 👑 | `LogsPage` | Journal d'activité |

Composants notables :
- `Sidebar` : navigation, ordre : Tableau de bord, Usagers, CNI / Passeport, Attestations d'accueil, Certificats, RGPD, Paramétrage ; visibilité conditionnelle (RGPD, Paramétrage), version, et
  **footer** avec les liens Aide, Nouveautés, **Manifest** (`open-manifest`) et
  **Agents** (`open-agents`).
- `HelpModal` : composant générique de rendu Markdown (props `source` + `title`).
  Utilisé pour l'aide (`/julto-aide.md`), le manifest (`/manifest.md`) et les
  instructions agents (`/AGENTS.md`), via les événements `window`
  `open-help`, `open-manifest`, `open-agents`.
- `WhatsNewModal` : changelog (source `services/version.ts`).
- `LogementModal` : onglets principal/secondaire, occupants habituels structurés.
- `PaginationBar` : tailles 25/50/100/200/500 + « Tout » (sentinelle -1 → 1 000 000).
- `AdaLegacyPreviewModal` : prévisualisation d'une ADA importée.

> **Code mort identifié** : `pages/UsagerDetail.tsx` n'est importé nulle part
> (la fiche usager est rendue par `UsagerForm`).

---

## 11. Variables de fusion des templates

Délimiteurs : `{{` … `}}` (Docxtemplater, `paragraphLoop` + `linebreaks`).

### 11.1 Variables usager
En **mono-usager** (`nb_usagers = 1`), les variables sont directes (`{{nom}}`).
En **multi-usagers** (`nb_usagers` 2 ou 3), elles sont préfixées
`usager1_`, `usager2_`, `usager3_` (ex. `{{usager2_prenom}}`).

| Variable | Contenu |
|----------|---------|
| `civilite` | `M.` / `Mme` / `Mx` |
| `nom` | Nom en MAJUSCULES |
| `prenom` | Prénom en casse Titre |
| `nom_complet` | civilité + prénom + nom |
| `nom_usage` | `(NOM D'USAGE)` si renseigné, sinon vide |
| `ne` | `né` (M.) / `née` (Mme) / vide (Mx) |
| `sexe` | `masculin` / `féminin` / `non-binaire` |
| `date_naissance` | JJ/MM/AAAA |
| `date_naissance_long` | ex. `15 mars 1985` |
| `lieu_naissance`, `pays_naissance`, `nationalite`, `situation_familiale` | texte |
| `mention_nom_usage`, `piece_identite_type`, `piece_identite_numero` | texte |
| `email`, `telephone`, `mobile` | texte |
| `adresse_complete` | adresse (rue seule) |
| `complement_adresse`, `code_postal`, `ville`, `pays` | texte |

### 11.2 Variables logement
Toujours présentes (vides si non renseignées). **Jamais préfixées par usager** :
- `logement1_*` = logement **principal** de l'usager 1
- `logement2_*` = logement **secondaire** de l'usager 1

Suffixes : `adresse_complete`, `complement_adresse`, `code_postal`, `ville`, `pays`,
`numero_batiment_escalier`, `surface`, `nombre_pieces`, `etat_sanitaire`,
`occupants_habituels`, `occupants_permanents`, `occupants_temporaires`,
`statut_occupation` (libellé), `statut_occupation_precision`,
`case_proprietaire`, `case_locataire`, `case_autre` (valent `X` ou vide).

Comportement : si un template coche **à la fois** principal et secondaire,
`logement_concerne` est exigé à la génération et le préfixe correspondant est rempli.

### 11.3 Variables système & historique
| Variable | Contenu |
|----------|---------|
| `date_du_jour` | Date du jour JJ/MM/AAAA |
| `date_du_jour_long` | Date du jour en clair |
| `usager1_historique_dates_meme_type` | Dates (FR) des attestations du même type déjà délivrées à l'usager 1 |
| `historique_dates_usager1_usager2` | Dates (FR) des attestations déjà délivrées au couple usager 1 / usager 2 |

### 11.4 Variables personnalisées
Déclarées dans le template (`variables` JSONB). Générées sous la forme
`variable1`, `variable2`… et transmises à la génération via `custom_data`.
Chaque variable peut être un texte libre, une liste de valeurs (`allowedValues`)
ou une liste de correspondance (`listeCle`).

---

## 12. Intégrations externes

| Service | Usage | Configuration | Endpoints appelés |
|---------|-------|---------------|-------------------|
| **API Ville / APM** | Envoi SMS, envoi e-mail, recherche/auth AD | `config_params` (`api_ville_*`) | `POST /api/v1/sms/send`, `POST /api/v1/mail/send`, `POST /api/v1/ad/authenticate`, `GET /api/v1/ad/search`, `GET /api/v1/ad/user` |
| **API Synbird** | Rendez-vous (import contact + accompagnants) | `config_params` (`synbird_*`) | `GET /searcher?scopes[]=appointments`, `GET /company/getStaticData` |
| **api-adresse.data.gouv.fr** | Autocomplétion adresse | aucune (public) | `GET /search/?q=` |
| **geo.api.gouv.fr** | Autocomplétion commune (lieu de naissance) | aucune (public) | `GET /communes?nom=` |
| **restcountries.com** | Autocomplétion pays | aucune (public) | `GET /all` / recherche |

Tous les appels externes côté backend ignorent la vérification TLS
(`httpsAgent { rejectUnauthorized: false }`) car les services Ville utilisent des
certificats internes.

---

## 13. Imports legacy ALTO

Scripts CLI manuels (jamais exposés en route HTTP, jamais au démarrage), tous
idempotents (transaction unique + suppression ciblée `created_by = 'IMPORT_LEGACY'`),
avec insertions par lots pour ne pas verrouiller la base partagée.

| Script | Source(s) | Cibles | Rôle |
|--------|-----------|--------|------|
| `importLegacy.js` | `xls/historique individus2.xlsx`, `xls/ada2.xlsx` | `usagers`, `usagers_historique`, `usagers_liens_familiaux`, `logements`, `attestations_ada`, `attestations` | Import principal : regroupe les versions par `ID_ENREG_ORIGINE`, crée les usagers canoniques, décode les logements et les ADA |
| `importLegacyCniPas.js` | `xls/DEMANDES.xls`, `xls/CNIPAS.xls` | `dossiers_pieces_identite`, `dossier_pieces`, `dossier_suivi` | Import des demandes CNI/Passeport (rattachement via `usagers_historique.legacy_id_enreg`) |
| `importLegacyEtapes.js` | `xls/ETAPES.xls` | `dossier_piece_etapes` | Frise chronologique des changements d'état (nécessite l'import CNI/PAS préalable) |
| `decodeOccupantsHabituels.js` | `usagers_historique.data->>'OCCUP_HABITUELS'` | `logements.occupants_habituels_details` | Correctif en place du décodage des occupants |

Ordre d'exécution : `importLegacy.js` → `importLegacyCniPas.js` → `importLegacyEtapes.js`
(→ `decodeOccupantsHabituels.js` si besoin).

Détails notables :
- Fichiers `xls/` et `ps/` **non committés** (`.gitignore`).
- `xlsxStreamReader.js` : lecteur XLSX maison utilisé en fallback pour le fichier
  historique de ~104 Mo (SheetJS échoue).
- `occupantsHabituels.js` : décode `OCCUP_HABITUELS` (format `<NN>::AGE|CODE` ou
  `<NN>**AGE|MOIS|CODE`) en texte lisible `"39 ans (Concubin(e)), 4 ans (Fils)"`.
- `dossierEtapes.js` : catalogue de 19 combinaisons d'états ALTO → libellés et
  statuts, réutilisé comme catalogue de changement d'état dans l'application.
- Statuts CNI/PAS : `demande`, `ajourne`, `arrive`, `recupere`, `refuse`.

---

## 14. Versioning & changelog

- **Source de vérité du changelog côté application** : `frontend/src/services/version.ts`
  (`VERSION` + `CHANGELOG`), affiché par `WhatsNewModal`.
- `version.json` (racine) contient un historique plus ancien (0.1.0 → 0.2.1) et est
  **désynchronisé** avec `version.ts` (0.4.0). À aligner lors d'une prochaine revue.
- Convention : à chaque livraison, incrémenter `VERSION` et ajouter une entrée en
  tête de `CHANGELOG` (version, date, features).

Historique résumé :
- **0.1.0** — socle : usagers, templates, attestations, auth JWT + AD, rôles.
- **0.2.x** — multi-usagers (1-3), civilité neutre, variables avancées, logements.
- **0.3.x** — module Demandes CNI/Passeport, frise chronologique, notifications
  SMS/e-mail, import legacy ALTO complet, alertes RGPD, pagination.

---

## 15. Conventions de code

Héritées du `GUIDE_NOUVELLE_APP_VILLE.md` (DSI) :
- Backend **modulaire** : `modules/<feature>/{*.routes,*.service,*.repository}.js`
  (routes = HTTP, service = métier, repository = SQL).
- Fonctions courtes, responsabilité unique ; au-delà de ~300 lignes, découper.
- `async/await` + gestion explicite des erreurs (`status` HTTP porté par l'erreur).
- SQL paramétré (`$1, $2…`), jamais de concaténation.
- Configuration exclusivement via `.env` / `config_params` ; aucun secret en dur.
- Endpoints documentés en Swagger (`@openapi`), préfixés `/api/v1/`.
- Pagination `?limit=&offset=` + `{ rows, total }`.
- Logs : `logAcces(utilisateur, action, table, recordId, details, ip)`.
- Frontend : TypeScript, Tailwind, `api.ts` centralise les appels, types dans
  `types/index.ts`, toasts `react-hot-toast`.
- Pas de commentaires superflus dans le code (le style actuel commente l'intention
  métier, pas la mécanique évidente).

---

## 16. Maintenance du manifest (documentation automatique)

**Règle** : ce `manifest.md` doit rester synchronisé avec le code. Il est mis à jour
**en même temps** que la documentation et toute évolution fonctionnelle, sans qu'on
ait à le demander.

Déclencheurs de mise à jour :
1. Ajout / modification / suppression d'une **route API** ou d'un **module backend**.
2. Ajout / modification d'une **page, route frontend ou composant structurant**.
3. Changement de **modèle de données** (table, colonne, contrainte, index, seed).
4. Ajout d'une **variable de fusion** de template ou changement de sa sémantique.
5. Nouvelle **intégration externe** ou modification de configuration.
6. Nouveau **rôle / règle d'accès** ou changement de sécurité.
7. Nouvelle **version** livrée (mettre à jour §1 et §14).
8. Ajout / modification d'un **script d'import legacy**.
9. Changement des **ports, variables d'environnement ou procédures de build/déploiement**.

Procédure :
- Après toute modification de code, vérifier ces déclencheurs et mettre à jour les
  sections concernées **dans le même changement**.
- Mettre à jour la ligne « Dernière revue du manifest » en tête de fichier (date du jour).
- Répercuter les copies servies par le frontend (liens du footer) :
  `frontend/public/manifest.md` et `frontend/public/AGENTS.md`.
- Ne pas dupliquer inutilement : ce manifest décrit l'architecture et les contrats ;
  la documentation utilisateur détaillée vit dans `julto-aide.md`.

---

## 17. Dettes techniques & points d'attention

- `version.json` (0.2.1) désynchronisé de `frontend/src/services/version.ts` (0.3.3).
- `backend/src/utils/migrate.js` et `npm run migrate` : dossier `migrations/` absent
  → script vestigial ; le DDL vit dans `setupDb()`.
- `pages/UsagerDetail.tsx` : code mort (non routé).
- `frontend/src/version.json` (fichier) vs `frontend/src/services/version.ts` : deux
  sources de version côté frontend.
- `Dashboard` : le compteur « Alertes RGPD » est codé en dur à 0.
- `ParametrageMessages` : aperçu e-mail injecté via `dangerouslySetInnerHTML`.
- `LogsPage` : pas de pagination dans l'interface (le backend la supporte).
- `ps/Display-Help.ps1` : logique de section défectueuse (affiche seulement le titre)
  et chemin codé en dur.
- Colonne `usagers.Adresse` en majuscule (legacy) exposée aussi en `adresse` par les
  repositories ; attention aux deux orthographes dans les requêtes/API.
