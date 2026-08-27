export const VERSION = "0.3.1";

export interface ChangelogEntry {
  version: string;
  date: string;
  features: string[];
}

export const CHANGELOG = [
  {
    version: "0.3.1",
    date: "2026-08-27",
    features: [
      "Fiche logement par usager : surface, pieces, etat sanitaire, occupants, statut d'occupation (proprietaire/locataire/autre) — reprend tous les champs du formulaire d'attestation d'accueil",
      "Icone logement dans la liste des usagers, coloree quand renseignee",
      "Toutes les informations de logement disponibles comme variables de fusion dans les attestations (logement_surface, logement_case_proprietaire...), y compris en multi-usagers",
      "Documentation des variables de logement ajoutee dans l'aide de creation de template",
      "Demandes CNI / Passeport : la liste regroupe desormais les pieces par dossier (nombre de personnes, nombre de pieces, repartition des statuts)",
      "Demandes CNI / Passeport : colonnes triables (usagers, personnes, pieces, statuts, anciennete, date de creation)",
      "Demandes CNI / Passeport : affichage du nombre de jours d'attente depuis la demande la plus ancienne non encore arrivee",
    ],
  },
  {
    version: "0.3.0",
    date: "2026-08-27",
    features: [
      "Nouveau module « Demandes CNI / Passeport » (menu dedie, independant des attestations)",
      "Dossier multi-usagers et multi-pieces : statut independant par piece (demande/ajourne/arrive/recupere)",
      "Destinataire de notification choisissable parmi tous les usagers du dossier (ex: parent notifie pour un enfant)",
      "Suivi horodate par dossier : commentaires manuels + entrees automatiques a chaque changement de statut",
      "Notification SMS/email a l'arrivee d'une piece via l'API Ville, toujours envoyee manuellement (jamais automatique)",
      "Historique des notifications envoyees (succes/echec) consultable par piece",
      "Import Synbird : detection des accompagnants mentionnes dans un RDV et proposition de creer leur fiche",
      "Import Synbird : limite d'affichage a 5 resultats, au-dela un message invite a affiner la recherche",
      "Paramétrage - Messages : modeles de SMS/email personnalisables par contexte, avec variables et apercu (renomme depuis « Messages CNI/Passeport », prevu pour accueillir d'autres types de messages)",
    ],
  },
  {
    version: "0.2.2",
    date: "2026-08-26",
    features: [
      "Paramétrage de l'API Synbird (RDV) : URL, token et test de connexion",
      "Correction de la casse des noms de fusion : NOM en majuscules, Prénom en casse titre, dans le titre des attestations et toutes les variables (y compris multi-usagers)",
      "Correction de la variable `ne` : affichait « ne »/« nee » au lieu de « né »/« née »",
      "Correction de l'affichage des attestations d'un usager en 2ᵉ ou 3ᵉ demandeur (co-titulaire) dans la modale de détail",
      "Correction de la non-persistance des consentements RGPD : chaque changement de consentement est désormais enregistré dans l'historique",
      "Correction d'une erreur de démarrage du serveur backend (fonction mal déclarée)"
    ]
  },
  {
    version: "0.2.1",
    date: "2026-08-26",
    features: [
      "Suppression usagers/attestations/templates réservée aux administrateurs (middleware requireRole)",
      "Civilité neutre « Mx » ajoutée (sexe = non-binaire, ne = vide)",
      "Correction fuseau horaire date_naissance (affichage jour exact sans décalage UTC)",
      "Recherche usagers étendue au téléphone fixe et mobile",
      "Pastille nombre d'attestations par usager avec modal de détail et téléchargement",
      "Téléchargement du fichier .docx original d'un template depuis le paramétrage",
      "Correction adresse : évite le double numéro si l'API le renvoie déjà dans le nom de rue",
      "Variables custom dynamiques : ajout N variables avec description (variable1, variable2...)",
      "Multi-usagers 1 à 3 avec labels personnalisés (affichage UI uniquement, préfixes fixes usager1/2/3_)",
      "Variable `sexe` (masculin/féminin/non-binaire) selon civilité",
      "Variable `nom_usage` entre parenthèses si renseigné",
      "Variable `ne` / `née` / vide selon civilité",
      "Suppression template : soft delete (actif=false) + nettoyage fichier physique",
      "Édition template : modification nom, description, variables, nb_usagers, labels, fichier",
      "Autocomplétion adresse (api-adresse.data.gouv.fr) + pays (restcountries.com)",
      "Variable `date_naissance_long` (ex: 15 mars 1985)",
      "Génération attestation : template d'abord, puis sélection usager(s)"
    ]
  },
  {
    version: "0.2.0",
    date: "2026-08-25",
    features: [
      "Multi-usagers : templates 1 ou 2 usagers avec préfixes usager1_/usager2_",
      "Variables système date_du_jour / date_du_jour_long toujours disponibles",
      "Correction variable `adresse_complete` (rue seule, sans CP/ville/complément)",
      "Correction variable `adresse_complete` pour PostgreSQL (colonne Adresse → adresse)"
    ]
  },
  {
    version: "0.1.0",
    date: "2026-08-20",
    features: [
      "Gestion usagers : création, édition, archivage, restauration, suppression",
      "Recherche usagers par nom, prénom, email",
      "Vérification doublons (nom+date_naissance, téléphone)",
      "Autocomplétion lieu de naissance et pays de naissance",
      "Templates d'attestations : upload .docx, variables, génération PDF",
      "Variables usager : civilité, nom, prénom, date_naissance, adresse, etc.",
      "Liste attestations avec filtres, téléchargement, suppression",
      "Authentification JWT + Active Directory",
      "Gestion utilisateurs et rôles (utilisateur/administrateur)",
      "Interface responsive avec Tailwind CSS"
    ]
  }
];

export const getVersion = () => VERSION;
export const getChangelog = () => CHANGELOG;
export const getCurrentVersion = () => CHANGELOG[0];
export const formatVersion = (v: string) => `v${v}`;