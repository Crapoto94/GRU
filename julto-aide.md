# Aide JULTO — Gestion des Relations Usager

JULTO (« J'ai Un Lien pour Tout, Ouf ! ») est l'outil de gestion des relations usager des collectivités territoriales : référentiel usager et génération d'attestations à partir de templates Word.

---

## 1. Tableau de bord

Page d'accueil après connexion. Affiche les compteurs globaux (nombre d'usagers, nombre d'attestations) et les alertes éventuelles.

## 2. Connexion

Deux modes de connexion possibles :
- **Compte local** : identifiant / mot de passe créé dans JULTO.
- **Active Directory** : identifiants Windows du poste de travail (authentification SSO).

La page de connexion affiche l'état des services (API backend, base de données, API Ville).

---

## 3. Gestion des usagers

Menu **Usagers**.

### 3.1 Consulter / rechercher
- Liste de tous les usagers actifs (pagination).
- Recherche par nom, prénom, email, **téléphone fixe ou mobile**.
- Tri par colonnes (nom, date de création, nombre d'attestations).
- **Détection de doublons** à la création ou modification (basée sur nom + date de naissance, ou téléphone) : une fenêtre propose de consulter la fiche existante, de créer quand même une nouvelle fiche, ou de mettre à jour la fiche existante.
- Un badge sur chaque usager indique le nombre d'attestations générées pour lui ; un clic ouvre la liste (titre, template, statut, date) avec téléchargement direct.
- Accès aux usagers **archivés** via un onglet dédié.

### 3.2 Créer / modifier un usager
Champs disponibles :
- **État civil** : civilité (M. / Mme / **Mx** — civilité neutre), nom, prénom, nom d'usage, date de naissance (obligatoire), lieu de naissance (autocomplétion), pays de naissance (autocomplétion), nationalité, situation familiale (célibataire, marié(e), divorcé(e), veuf(ve), pacsé(e), concubin(e)).
- **Contact** : email, téléphone fixe, mobile.
- **Adresse** : adresse (autocomplétion via API Ville), complément d'adresse, code postal, ville, pays.
- **RGPD** : consentement RGPD, autorisation de communication par email.
- **Métadonnées** : créateur, date de création, date de mise à jour.

### 3.3 Autres actions
- **Archiver** un usager (avec motif obligatoire) — le masque de la liste active sans le supprimer.
- **Restaurer** un usager archivé.
- **Supprimer définitivement** un usager → réservé aux **administrateurs** (voir section Admin).
- **Générer une attestation** directement depuis la fiche usager (pré-remplit l'usager dans le formulaire de génération).

---

## 4. Génération d'attestations

Menu **Attestations**.

### 4.1 Consulter
- Liste de toutes les attestations générées, avec filtres par statut (en attente, générée, erreur) et par usager.
- Téléchargement du document généré (.docx) à tout moment.
- Affichage du template utilisé, de l'usager concerné, de la date et de l'auteur.

### 4.2 Générer une nouvelle attestation
Processus pas à pas :
1. **Choisir le template** (modèle de document) à utiliser dans la liste déroulante.
2. **Sélectionner l'usager concerné** via le moteur de recherche (ou 2 à 3 usagers si le template le prévoit, ex. « Demandeur » / « Bénéficiaire » / « Témoin »).
3. **Renseigner les variables personnalisées** définies sur le template :
   - Si le template définit des **valeurs autorisées** pour une variable → liste déroulante.
   - Sinon → champ texte libre.
4. **Générer** → le document Word est produit automatiquement à partir des informations de l'usager et téléchargé.

Les informations usager insérées automatiquement dans le document incluent :
- Civilité, nom, prénom, nom complet, nom d'usage
- Formulation « né »/« née » selon la civilité
- Date de naissance (formats courts et longs)
- Lieu et pays de naissance, nationalité
- Situation familiale
- Email, téléphone fixe, mobile
- Adresse complète, code postal, ville, pays
- Date du jour (formats court et long)

### 4.3 Supprimer une attestation
Réservé aux **administrateurs**.

---

## 5. Rubrique Administrateur

Les fonctionnalités suivantes ne sont visibles et accessibles qu'aux comptes ayant le rôle **administrateur**. Elles apparaissent dans le menu **Paramétrage**, non affiché pour un utilisateur standard.

### 5.1 Suppressions définitives
- Suppression définitive d'une fiche usager (conformité RGPD).
- Suppression d'une attestation.
- Suppression d'un template (désactivation puis suppression physique du fichier .docx).

> Les utilisateurs standards peuvent créer, modifier, archiver et restaurer des usagers, et générer/télécharger des attestations, mais ne peuvent rien supprimer définitivement.

### 5.2 Gestion des templates d'attestations
`Paramétrage > Attestations`

- **Upload** d'un fichier `.docx` contenant des balises de type `{{variable}}`.
- **Définition** : nom, description, nombre d'usagers concernés (1 à 3, avec libellés personnalisables comme « Demandeur »/« Bénéficiaire »/« Témoin »), variables personnalisées additionnelles (description + valeurs autorisées optionnelles séparées par des virgules).
- **Modification** d'un template existant (nom, description, variables, remplacement du fichier).
- **Téléchargement** du fichier .docx original.
- **Suppression** (désactivation puis suppression physique du fichier).
- Une **aide intégrée** rappelle la syntaxe des balises et la liste des variables usager/système disponibles.

### 5.3 Gestion des comptes utilisateurs
`Paramétrage > Utilisateurs`

- Création manuelle d'un compte local, ou import/recherche d'un compte depuis l'Active Directory (par nom, prénom ou identifiant).
- Champs : fonction, service, direction, rôle (utilisateur ou administrateur).
- Réinitialisation du mot de passe (comptes locaux uniquement).
- Modification ou suppression d'un compte.

### 5.4 Journal d'activité (logs)
`Paramétrage > Logs`

- Historique de toutes les actions effectuées dans l'application : création, modification, suppression, archivage, restauration, génération d'attestation, connexion, etc.
- Chaque entrée précise l'utilisateur, la table concernée, le détail de l'action, l'adresse IP et la date.
- Filtrable par type d'action et par utilisateur.

### 5.5 Paramétrage base de données
`Paramétrage > Base de données`

- Informations de connexion PostgreSQL, liste des tables, compteurs (usagers, templates, attestations, comptes utilisateurs).
- Test de connexion.

### 5.6 Paramétrage API Ville
`Paramétrage > API Ville`

- Configuration de la connexion à une API externe de la collectivité (URL, port, jeton).
- Test de connexion (autocomplétion adresses, lieux de naissance).

### 5.7 Nouveautés / changelog
Un bouton **Nouveautés** dans le menu latéral ouvre l'historique des versions de l'application (accordéon par version, dernière version mise en avant). Le numéro de version en cours est affiché en bas du menu. Accessible à tous les utilisateurs.

---

## 6. Résumé des permissions

| Action                                      | Utilisateur | Administrateur |
|---------------------------------------------|:-----------:|:--------------:|
| Consulter usagers / attestations            | ✅          | ✅             |
| Créer / modifier un usager                  | ✅          | ✅             |
| Archiver / restaurer un usager              | ✅          | ✅             |
| Générer / télécharger une attestation       | ✅          | ✅             |
| Supprimer un usager, une attestation, un template | ❌    | ✅             |
| Gérer les templates d'attestations          | ❌          | ✅             |
| Gérer les comptes utilisateurs              | ❌          | ✅             |
| Consulter le journal d'activité             | ❌          | ✅             |
| Paramétrage base de données / API Ville     | ❌          | ✅             |

---

## 7. Variables disponibles dans les templates

### 7.1 Variables usager (préfixées par `usager1_`, `usager2_`, `usager3_` selon le nombre d'usagers du template)

| Variable             | Description                          | Exemple          |
|----------------------|--------------------------------------|------------------|
| `civilite`           | Civilité (M., Mme, Mx)               | Mme              |
| `ne`                 | « né » ou « née » selon civilité     | née              |
| `sexe`               | masculin / féminin                   | féminin          |
| `nom`                | Nom de famille                       | DUPONT           |
| `prenom`             | Prénom                               | Marie            |
| `nom_complet`        | Civilité + Prénom + Nom              | Mme Marie DUPONT |
| `nom_usage`          | Nom d'usage entre parenthèses        | (MARTIN)         |
| `date_naissance`     | Date de naissance (jj/mm/aaaa)       | 15/03/1985       |
| `date_naissance_long`| Date de naissance en toutes lettres  | 15 mars 1985     |
| `lieu_naissance`     | Lieu de naissance                    | Paris            |
| `pays_naissance`     | Pays de naissance                    | France           |
| `nationalite`        | Nationalité                          | Française        |
| `situation_familiale`| Situation familiale                  | Mariée           |
| `email`              | Email                                | marie@email.fr   |
| `telephone`          | Téléphone fixe                       | 01 23 45 67 89   |
| `mobile`             | Mobile                               | 06 12 34 56 78   |
| `adresse`            | Adresse complète                     | 12 rue de la Paix|
| `code_postal`        | Code postal                          | 75001            |
| `ville`              | Ville                                | Paris            |
| `pays`               | Pays                                 | France           |

### 7.2 Variables système

| Variable            | Description                          | Exemple          |
|---------------------|--------------------------------------|------------------|
| `date_du_jour`      | Date du jour (format court)          | 25/08/2026       |
| `date_du_jour_long` | Date du jour en toutes lettres       | 25 août 2026     |
| `usager1_historique_dates_meme_type` | Dates (séparées par une virgule) des attestations du même type déjà délivrées à l'usager 1 | 12/01/2025, 03/06/2025 |
| `historique_dates_usager1_usager2` | Dates (séparées par une virgule) des attestations du même type déjà délivrées au même couple usager 1 / usager 2 | 12/01/2025, 03/06/2025 |

### 7.3 Variables personnalisées
Définies lors de la création du template. Accès direct via `{{variable1}}`, `{{variable2}}`, etc.
Si des valeurs autorisées sont définies → liste déroulante à la génération.

---

## 8. Syntaxe des balises dans le template Word

- Balises simples : `{{variable}}` — remplacées par la valeur correspondante.
- Balises conditionnelles (optionnel) : `{{#variable}}texte{{/variable}}` — affiche « texte » seulement si la variable a une valeur.
- Les balises sont insensibles à la casse et aux espaces : `{{  NOM  }}` = `{{nom}}`.
- Pour les templates multi-usagers : préfixer par `usager1_`, `usager2_`, `usager3_` (ex: `{{usager1_nom}}`, `{{usager2_nom}}`).

---

## 9. Raccourcis et astuces

- **Recherche usager** : tapez directement dans le champ de recherche (nom, prénom, email, téléphone).
- **Génération rapide** : depuis la fiche usager, bouton « Générer attestation » → pré-remplit l'usager.
- **Duplicatas** : le système détecte automatiquement les doublons potentiels (nom + date naissance ou téléphone).
- **Archivage** : préférez archiver plutôt que supprimer (traçabilité RGPD).
- **Templates** : testez votre template avec un usager fictif avant de le mettre en production.