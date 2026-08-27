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
- Une icône logement indique si un logement est renseigné : maison si un seul (principal ou secondaire), bâtiment si les deux le sont.
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
- **Renseigner le logement** (icône maison/bâtiment dans la liste) : deux onglets **Logement principal** et **Logement secondaire**, chacun avec sa propre adresse (pré-remplie par défaut avec l'adresse de l'usager, modifiable indépendamment), surface, pièces, état sanitaire, occupants, statut d'occupation.

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
3. **Préciser le logement concerné** si le template le demande (logement principal et secondaire tous deux activés sur le template) : un choix « Logement principal » / « Logement secondaire » apparaît et est obligatoire avant de générer.
4. **Renseigner les variables personnalisées** définies sur le template :
   - Si le template définit des **valeurs autorisées** pour une variable → liste déroulante, vide par défaut (aucune présélection).
   - Sinon → champ texte libre.
5. **Générer** → le document Word est produit automatiquement à partir des informations de l'usager et téléchargé.

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

## 5. Demandes CNI / Passeport

Menu **Demandes CNI / Passeport**. Accessible à tous les utilisateurs connectés (pas réservé aux administrateurs).

### 5.1 Principe
Un **dossier** regroupe une ou plusieurs **pièces d'identité** (CNI et/ou Passeport) demandées, pouvant concerner **plusieurs usagers en une seule fois** (ex. dossier familial). Chaque pièce suit son propre statut, avec un **destinataire de notification** propre (utile pour notifier un parent plutôt que l'enfant concerné) et un canal de notification (email, SMS, ou les deux).

Statuts d'une pièce :

| Statut | Signification |
|---|---|
| **Demandé** | pièce commandée, en attente |
| **Ajourné** | traitement suspendu/reporté |
| **Arrivé** | pièce disponible en mairie, prête à être retirée |
| **Récupéré** | pièce remise à l'usager |

### 5.2 Consulter la liste des dossiers
`Demandes CNI / Passeport`

- Tableau regroupé **par dossier** (pas par pièce individuelle), avec recherche par usager et filtres par statut et par type de pièce (CNI / Passeport).
- Colonnes triables : usagers, nombre de personnes, nombre de pièces, statuts (badges récapitulatifs), **temps d'attente** (nombre de jours depuis la plus ancienne pièce encore en statut Demandé/Ajourné), date de création.
- Clic sur une ligne → ouvre le détail du dossier.

### 5.3 Créer un dossier
Bouton **« Nouveau dossier »** :
1. Rechercher et ajouter un ou plusieurs usagers au dossier.
2. Pour chaque usager : cocher la ou les pièces demandées (CNI et/ou Passeport), la date de la demande, le destinataire à notifier dès disponibilité (n'importe quel usager du dossier) et le canal de notification (email / SMS / les deux).
3. **Créer le dossier**.

### 5.4 Suivre un dossier
Depuis le détail d'un dossier :
- **Changer le statut** de chaque pièce directement (menu déroulant sur le badge de statut).
- **Retirer une pièce** du dossier (impossible si c'est la dernière pièce — il faut alors supprimer le dossier entier).
- Quand une pièce passe au statut **Arrivé**, la ligne est mise en surbrillance et deux boutons apparaissent : **« Envoyer SMS »** et **« Envoyer Email »** vers le destinataire choisi (désactivés si le destinataire n'a pas de téléphone/email renseigné). **L'envoi n'est jamais automatique**, toujours déclenché manuellement par l'agent.
- Un bouton **« Historique »** affiche les notifications déjà envoyées pour cette pièce (canal, destinataire, date, succès/échec).
- Section **« Suivi du dossier »** : ajout de commentaires libres horodatés, en plus des entrées automatiques générées par le système (changement de statut, retrait de pièce, envoi/échec de notification, création du dossier) — repérables à la mention « - automatique ».
- **Suppression du dossier** entier (avec confirmation), disponible pour tous les utilisateurs.

### 5.5 Paramétrer les modèles de messages
`Paramétrage > Messages` (réservé aux **administrateurs**)

Modèles des messages SMS/email envoyés lors de la notification d'une pièce disponible, avec variables (`{{prenom}}`, `{{nom}}`, `{{civilite}}`, `{{type_piece}}`, `{{type_piece_label}}`, `{{destinataire_prenom}}`, `{{destinataire_nom}}`) et aperçu en direct. Bouton pour réinitialiser aux valeurs par défaut.

---

## 6. Rubrique Administrateur

Les fonctionnalités suivantes ne sont visibles et accessibles qu'aux comptes ayant le rôle **administrateur**. Elles apparaissent dans le menu **Paramétrage**, non affiché pour un utilisateur standard.

### 6.1 Suppressions définitives
- Suppression définitive d'une fiche usager (conformité RGPD).
- Suppression d'une attestation.
- Suppression d'un template (désactivation puis suppression physique du fichier .docx).

> Les utilisateurs standards peuvent créer, modifier, archiver et restaurer des usagers, et générer/télécharger des attestations, mais ne peuvent rien supprimer définitivement (à l'exception des dossiers CNI/Passeport, ouverte à tous — voir section 5).

### 6.2 Gestion des templates d'attestations
`Paramétrage > Attestations`

- **Upload** d'un fichier `.docx` contenant des balises de type `{{variable}}`.
- **Définition** : nom, description, nombre d'usagers concernés (1 à 3, avec libellés personnalisables comme « Demandeur »/« Bénéficiaire »/« Témoin »), variables personnalisées additionnelles (description + valeurs autorisées optionnelles séparées par des virgules).
- **Modification** d'un template existant (nom, description, variables, remplacement du fichier).
- **Logement concerné** : cases à cocher « Logement principal » / « Logement secondaire » — si les deux sont cochées, le logement concerné (principal ou secondaire) est demandé à la génération, et seules les variables de ce logement sont renseignées.
- **Téléchargement** du fichier .docx original.
- **Suppression** (désactivation puis suppression physique du fichier).
- Une **aide intégrée** rappelle la syntaxe des balises et la liste des variables usager/logement/système disponibles.

### 6.3 Paramétrage des modèles de messages
`Paramétrage > Messages`

Voir section 5.5. Conçu pour accueillir d'autres contextes de messages à l'avenir (actuellement : disponibilité d'une pièce d'identité).

### 6.4 Gestion des comptes utilisateurs
`Paramétrage > Utilisateurs`

- Création manuelle d'un compte local, ou import/recherche d'un compte depuis l'Active Directory (par nom, prénom ou identifiant).
- Champs : fonction, service, direction, rôle (utilisateur ou administrateur).
- Réinitialisation du mot de passe (comptes locaux uniquement).
- Modification ou suppression d'un compte.

### 6.5 Journal d'activité (logs)
`Paramétrage > Logs`

- Historique de toutes les actions effectuées dans l'application : création, modification, suppression, archivage, restauration, génération d'attestation, gestion des dossiers CNI/Passeport, connexion, etc.
- Chaque entrée précise l'utilisateur, la table concernée, le détail de l'action, l'adresse IP et la date.
- Filtrable par type d'action et par utilisateur.

### 6.6 Paramétrage base de données
`Paramétrage > Base de données`

- Informations de connexion PostgreSQL, liste des tables, compteurs (usagers, templates, attestations, comptes utilisateurs).
- Test de connexion.

### 6.7 Paramétrage API Ville
`Paramétrage > API Ville`

- Configuration de la connexion à une API externe de la collectivité (URL, port, jeton).
- Test de connexion (autocomplétion adresses, lieux de naissance, envoi SMS/email).

### 6.8 Nouveautés / changelog
Un bouton **Nouveautés** dans le menu latéral ouvre l'historique des versions de l'application (accordéon par version, dernière version mise en avant). Le numéro de version en cours est affiché en bas du menu. Accessible à tous les utilisateurs.

---

## 7. Résumé des permissions

| Action                                      | Utilisateur | Administrateur |
|---------------------------------------------|:-----------:|:--------------:|
| Consulter usagers / attestations            | ✅          | ✅             |
| Créer / modifier un usager                  | ✅          | ✅             |
| Archiver / restaurer un usager              | ✅          | ✅             |
| Générer / télécharger une attestation       | ✅          | ✅             |
| Créer / consulter / suivre / supprimer un dossier CNI / Passeport | ✅ | ✅ |
| Envoyer une notification SMS/email (pièce disponible) | ✅ | ✅        |
| Supprimer un usager, une attestation, un template        | ❌    | ✅             |
| Gérer les templates d'attestations          | ❌          | ✅             |
| Paramétrer les modèles de messages (SMS/email) | ❌       | ✅             |
| Gérer les comptes utilisateurs              | ❌          | ✅             |
| Consulter le journal d'activité             | ❌          | ✅             |
| Paramétrage base de données / API Ville     | ❌          | ✅             |

---

## 8. Variables disponibles dans les templates

### 8.1 Variables usager (préfixées par `usager1_`, `usager2_`, `usager3_` selon le nombre d'usagers du template)

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

### 8.2 Variables de logement (toujours celles de l'usager 1, jamais préfixées par usager2_/usager3_)

Un usager peut avoir un logement principal et/ou un logement secondaire, gérés via deux onglets sur la fiche logement de l'usager. `logement1_` = logement principal, `logement2_` = logement secondaire.

**Configuration sur le template** : dans le paramétrage d'un gabarit d'attestation, deux cases à cocher « Logement principal » / « Logement secondaire » déterminent quelles variables sont utilisées :
- Une seule case cochée → les variables du logement correspondant (`logement1_` ou `logement2_`) sont renseignées automatiquement à la génération.
- Les deux cases cochées → à la génération de l'attestation, il est demandé quel logement est concerné (principal ou secondaire) ; seules les variables du logement choisi sont renseignées, l'autre groupe reste vide.
- Aucune case cochée → aucune variable de logement n'est renseignée pour ce template.

Toutes les variables `logement1_*` et `logement2_*` existent toujours dans le document, même si le groupe correspondant n'est pas utilisé par le template ou pas rempli pour l'usager — elles sont alors simplement vides (jamais « undefined »).

| Variable                                   | Description                                              | Exemple          |
|---------------------------------------------|-----------------------------------------------------------|------------------|
| `logement1_adresse_complete`                 | Adresse du logement principal (modifiable, pré-remplie avec l'adresse de l'usager par défaut) | 12 rue de la Paix |
| `logement1_complement_adresse`               | Complément d'adresse du logement principal                  | Bâtiment B, 3e étage |
| `logement1_code_postal`                      | Code postal du logement principal                           | 94200            |
| `logement1_ville`                            | Ville du logement principal                                 | Ivry-sur-Seine   |
| `logement1_pays`                             | Pays du logement principal                                  | France           |
| `logement1_numero_batiment_escalier`         | N° de bâtiment / escalier (logement principal)             | Bât. B, Esc. 2   |
| `logement1_surface`                          | Surface en m² (logement principal)                         | 67               |
| `logement1_nombre_pieces`                    | Nombre de pièces (logement principal)                      | 3                |
| `logement1_etat_sanitaire`                   | État sanitaire (logement principal)                        | Normal           |
| `logement1_occupants_habituels`              | Occupants habituels, âge et lien de parenté (principal)     | 1 (39 ans, Concubin(e)) |
| `logement1_occupants_permanents`             | Nombre d'occupants permanents (logement principal)          | 2                |
| `logement1_occupants_temporaires`            | Nombre d'occupants temporaires (logement principal)         | 0                |
| `logement1_statut_occupation`                | Statut d'occupation, avec précision si « Autre » (principal)| Propriétaire     |
| `logement1_statut_occupation_precision`      | Précision si statut = Autre, vide sinon (principal)          |                  |
| `logement1_case_proprietaire`                | « X » si propriétaire, vide sinon (principal)                | X                |
| `logement1_case_locataire`                   | « X » si locataire, vide sinon (principal)                   |                  |
| `logement1_case_autre`                       | « X » si autre statut, vide sinon (principal)                |                  |
| `logement2_*`                                | Mêmes variables que ci-dessus, pour le logement secondaire  |                  |

Si le logement principal ou secondaire n'est pas renseigné pour l'usager 1, les variables correspondantes sont vides.

### 8.3 Variables système

| Variable            | Description                          | Exemple          |
|---------------------|--------------------------------------|------------------|
| `date_du_jour`      | Date du jour (format court)          | 25/08/2026       |
| `date_du_jour_long` | Date du jour en toutes lettres       | 25 août 2026     |
| `usager1_historique_dates_meme_type` | Dates (séparées par une virgule) des attestations du même type déjà délivrées à l'usager 1 | 12/01/2025, 03/06/2025 |
| `historique_dates_usager1_usager2` | Dates (séparées par une virgule) des attestations du même type déjà délivrées au même couple usager 1 / usager 2 | 12/01/2025, 03/06/2025 |

### 8.4 Variables personnalisées
Définies lors de la création du template. Accès direct via `{{variable1}}`, `{{variable2}}`, etc.
Si des valeurs autorisées sont définies → liste déroulante à la génération.

---

## 9. Syntaxe des balises dans le template Word

- Balises simples : `{{variable}}` — remplacées par la valeur correspondante.
- Balises conditionnelles (optionnel) : `{{#variable}}texte{{/variable}}` — affiche « texte » seulement si la variable a une valeur.
- Les balises sont insensibles à la casse et aux espaces : `{{  NOM  }}` = `{{nom}}`.
- Pour les templates multi-usagers : préfixer par `usager1_`, `usager2_`, `usager3_` (ex: `{{usager1_nom}}`, `{{usager2_nom}}`).

---

## 10. Raccourcis et astuces

- **Recherche usager** : tapez directement dans le champ de recherche (nom, prénom, email, téléphone).
- **Génération rapide** : depuis la fiche usager, bouton « Générer attestation » → pré-remplit l'usager.
- **Duplicatas** : le système détecte automatiquement les doublons potentiels (nom + date naissance ou téléphone).
- **Archivage** : préférez archiver plutôt que supprimer (traçabilité RGPD).
- **Templates** : testez votre template avec un usager fictif avant de le mettre en production.