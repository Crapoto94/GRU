# Aide JULTO — Gestion des Relations Usager

JULTO (« J'ai Un Lien pour Tout, Ouf ! ») est l'outil de gestion des relations usager des collectivités territoriales : référentiel usager, attestations d'accueil, certificats, demandes CNI / Passeport et courriers, générés à partir de templates Word.

---

## 1. Tableau de bord

Page d'accueil après connexion. Quatre rangées de tuiles, **cliquables** (elles ouvrent la liste concernée, déjà filtrée) :

- **Usagers** : usagers actifs, Ivry, hors Ivry, majeurs, mineurs (calculés d'après la date de naissance).
- **CNI / Passeport** : total, En cours, Ajourné, Arrivé, Archivé — un clic ouvre la liste CNI / Passeport filtrée sur ce statut.
- **Attestations d'accueil** : total, En cours, Ajourné, Arrivé, Archivé — un clic ouvre la liste des attestations filtrée.
- **Délais moyens d'arrivée** des pièces CNI / Passeport (demande → arrivée) sur les 7 et les 30 derniers jours.

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
- Colonnes : nom, prénom, date de naissance, lieu de naissance, téléphone, adresse, **CNI/Pass**, **Attestations**, **Certificats**, actions.
- Deux champs de recherche : la **date de naissance** (saisir `25121986` suffit, les « / » se mettent tout seuls) et le **nom / prénom / email / téléphone**. La « Recherche avancée » (nom, prénom, téléphone, adresse, code postal, ville) reste disponible.
- **Ligne dépliable** : un clic sur une ligne affiche toutes les démarches de l'usager (CNI / Passeport, attestations, certificats), de la plus récente à la plus ancienne ; une ligne CNI ouvre le dossier.
- **Pastilles** : CNI/Pass (rouge) ouvre le détail des demandes de l'usager (type, statut, dates) ; Attestations (bleu) et Certificats (violet) ouvrent la liste des documents correspondants avec téléchargement.
- **Détection de doublons** à la création ou modification (nom + date de naissance, ou téléphone).
- Une icône logement (dans les actions) ouvre la fiche logement ; l'icône crayon ouvre la fiche usager.
- Accès aux usagers **archivés** via la case « Archives ».

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

## 4. Attestations d'accueil

Menu **Attestations d'accueil**. Il n'y a qu'un seul modèle : le formulaire le retrouve tout seul (aucun menu déroulant).

### 4.1 Consulter
Tableau des attestations : **agent, CERFA, hébergeant, date de naissance, hébergé, période de validité, statut, « depuis », date de demande, contact, actions**. Recherche par nom, n° CERFA ou n° de demande ; les attestations archivées sont masquées par défaut (filtre « Statuts actifs / Tous »).

Statuts, modifiables directement dans la liste (aucun sous-statut) :
- **En cours**, **Arrivé**, **Récupéré**, **Archivé** ;
- **Ajourné** : une petite fenêtre demande le **document manquant**, affiché sous le statut.

La colonne **Depuis** compte les jours passés dans le statut courant. Pour une attestation **Arrivée**, le nombre de jours passe en **rouge** quand la période de validité est dépassée : elle peut alors être archivée.

Actions : télécharger le document, **modifier** (crayon), **archiver**, supprimer (administrateurs).

### 4.2 Créer une attestation
Bouton **Nouvelle attestation** : un formulaire unique, sans création d'usager séparée.
1. **Demandeur** : état civil (civilité, nom, prénom, nom d'usage, mention nom d'usage, naissance, nationalité, pièce CNI / Passeport / Titre de séjour et numéro) et contact. En tapant le nom, le prénom ou la date de naissance, l'outil **compte les usagers qui correspondent** et propose d'en choisir un ; le champ « Rechercher un usager » permet aussi de retrouver une fiche. Une fois la fiche liée, toute modification (téléphone, adresse…) **met à jour la fiche usager** à l'enregistrement. Sans choix, une fiche est créée.
2. **2ᵉ / 3ᵉ usager** si le modèle le prévoit (hébergé, témoin…), même fonctionnement.
3. **Demande** : date de la demande, n° CERFA, début et fin de validité.
4. **Logement** (sous le demandeur) : statut d'occupation, adresse (préremplie), complément, code postal, ville, bâtiment / escalier, surface, nombre de pièces, état sanitaire, occupants habituels (âge et lien de parenté), occupants permanents et temporaires. Si le modèle couvre les deux logements, un choix principal / secondaire apparaît.
5. **Variables supplémentaires** du modèle, le cas échéant.
6. **Générer** : le document Word est produit et téléchargé.

### 4.3 Modifier une attestation
Le **crayon** de la liste rouvre la même interface, préremplie. « Enregistrer et régénérer » met à jour les fiches et le logement, génère la nouvelle attestation et **remplace l'ancienne**.

### 4.4 Supprimer une attestation
Réservé aux **administrateurs**.

---

## 4 bis. Certificats

Menu **Certificats** (certificat de vie, de domicile, de changement définitif de résidence, de concubinage, de vie commune…). Un **certificat est remis immédiatement : il n'a donc pas de statut**.

- Tableau : agent, usagers (pour concubinage et vie commune, les **noms et dates de naissance des 2 usagers l'un sous l'autre**), motif, date de demande, contact, actions (télécharger, modifier, archiver).
- Deux champs de recherche : date de naissance (sans taper les « / ») et nom / prénom.
- **Nouveau certificat** : même formulaire que l'attestation d'accueil, avec le **choix du motif** (= le modèle). Le crayon permet de modifier un certificat.
- L'ancienne « attestation de concubinage » devient « **certificat de concubinage** » (modèles et titres déjà générés renommés).

---

## 5. CNI / Passeport

Menu **CNI / Passeport**. Accessible à tous les utilisateurs connectés.

### 5.1 Principe
Un **dossier** regroupe les pièces (CNI et/ou Passeport) demandées pour un bénéficiaire. Chaque pièce a un **motif**, un statut et une **frise chronologique**. Le retrait et les notifications concernent le **tuteur** (si tutelle), sinon le **parent 1**, sinon le bénéficiaire.

Statuts d'une pièce (couleurs de pastille) :

| Statut | Signification |
|---|---|
| **En cours** (gris) | demande déposée, en cours d'instruction |
| **Ajourné** (orange) | dossier suspendu : un document ou une précision est à fournir |
| **Arrivé** (vert) | pièce disponible en mairie ; en **rouge** après 60 jours (à relancer) |
| **Récupéré** (bleu) | pièce remise |
| **Archivé** (gris) | dossier clos : rejeté ou refusé par la préfecture, pièce renvoyée |
| **Erreur pièce** (violet) | erreur sur la pièce reçue (avec commentaire) |

### 5.2 La liste
Une **ligne par pièce** : agent, usager, date de naissance, pièce (CNI / PASS), motif, statut, **depuis**, date de demande, contact, actions (œil : voir le dossier, crayon : modifier le dossier, archiver).

- Recherche par **date de naissance** (sans les « / ») et par **nom, prénom ou téléphone** ; filtres « Toutes les pièces » et « Tous les statuts » ; case « Afficher les dossiers archivés » (les dossiers récupérés ou archivés sont masqués par défaut).
- Le **statut se change directement dans la liste**, sans ouvrir le dossier (pour Ajourné et Erreur pièce, la fiche du dossier s'ouvre pour préciser le motif).
- **Depuis** : en cours = jours depuis la demande (les périodes d'ajournement s'additionnent) ; ajourné / arrivé / récupéré = jours depuis l'entrée dans le statut. **Rouge à partir de 60 jours** pour arrivé et ajourné, pour repérer les relances.
- Les **mineurs** ont leur nom en violet ; l'icône **empreinte** signale les mineurs de **12 ans et plus**, dont la présence est requise au retrait.

### 5.3 Créer ou modifier un dossier
Bouton **« Nouveau dossier »** (crayon de la liste pour modifier : même interface, préremplie). Aucune pièce n'est cochée par défaut.
1. **Bénéficiaire** : case **Tutelle** (cumulable avec majeur ou mineur). **Majeur ou mineur se déduit de la date de naissance.**
2. **Motif** par pièce : 1ère demande, Renouvellement, Identité numérique, Perte, Vol, Détérioration, Changement d'état civil, Erreur imputable à l'administration, Pages visa passeport complètes.
3. **État civil** complet (nom d'usage, mention nom d'usage, taille, couleur des yeux), contact, adresse. En tapant nom / prénom / date, l'outil **compte et propose les usagers correspondants** ; une fiche liée est **mise à jour** à l'enregistrement. **Aucun usager ne se crée à part.**
4. **Mineur** : sections **Parent 1** et **Parent 2** (facultatif), adresse de la famille (case pour une **2ᵉ adresse** si les parents habitent séparément). Le nom des parents apparaît automatiquement pour le retrait.
5. **Tutelle** : section **Tuteur**, dont le nom apparaît pour le retrait.

### 5.4 Suivre un dossier
Depuis la fiche du dossier :
- **« Changer d'état »** : menu par groupes (En cours : dossier déposé / actualisé ; Ajourné : photo, signature, justificatif de domicile, déclaration de vol, jugement, justificatif d'identité ; Arrivé : retour en mairie, relance téléphonique ; Récupéré : par le demandeur, parent 1, parent 2, tuteur, mandataire ; Archivé : rejet / refus préfecture, pièce renvoyée ; Erreur pièce). Pour **Ajourné** et **Erreur pièce**, une **case commentaire** précise la nature (ex. photo de plus de 6 mois) ; elle s'affiche dans le dossier et la frise.
- **Frise chronologique** de chaque pièce.
- **Courrier** : l'icône enveloppe génère le courrier Word correspondant au statut (ajournement, relance si arrivé, archivage) ; il est tracé dans le suivi.
- Pièce **Arrivée** : boutons **Envoyer SMS / Email** au destinataire (jamais automatique) et **Historique** des notifications.
- **Suivi du dossier** : commentaires libres et entrées automatiques.
- Retrait d'une pièce, suppression du dossier.

### 5.5 Paramétrer les modèles de messages
`Paramétrage > Messages` (**administrateurs**) : modèles SMS / email de notification, variables (`{{prenom}}`, `{{nom}}`, `{{civilite}}`, `{{type_piece}}`, `{{type_piece_label}}`, `{{destinataire_prenom}}`, `{{destinataire_nom}}`), aperçu, réinitialisation.

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

### 6.9 Étapes des dossiers CNI
`Paramétrage > Étapes dossiers CNI`

Gère les choix du menu **« Changer d'état »** de la fiche dossier, groupés par statut : libellé, **Commentaire** (affiche une case de précision), **Personne** (parent 1, parent 2 ou tuteur : le choix n'est proposé que si le dossier comporte cette personne, dont le nom s'ajoute au libellé), **Actif**, ordre (flèches), ajout et retrait. Cliquer sur **Enregistrer** pour appliquer. Les frises déjà enregistrées ne changent pas.

### 6.10 Gabarits de courriers
`Paramétrage > Gabarits`

Trois gabarits Word (courrier d'ajournement, de relance, d'archivage) : **télécharger** le gabarit en vigueur, le modifier dans Word, le **remplacer** par la version modifiée (vérifiée avant acceptation), ou **rétablir** le gabarit par défaut. La page liste les variables disponibles, à écrire entre doubles accolades (`{{nom_complet}}`, `{{motif}}`, `{{commentaire}}`, `{{destinataire_adresse}}`…).

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