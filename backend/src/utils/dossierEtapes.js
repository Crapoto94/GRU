// Catalogue des etapes possibles pour le suivi d'une piece CNI/Passeport.
// Deduit des 19 combinaisons CODE_ETAT_AVANC|SOUS_CODE_ETAT_AVANC|CODE_ETAT
// presentes sur les 405 137 lignes de l'historique legacy ALTO (ETAPES.xls) :
// voir importLegacyEtapes.js pour l'analyse. Reutilise ici comme catalogue
// de choix pour le changement d'etat manuel dans l'appli, afin que chaque
// changement alimente la frise chronologique (dossier_piece_etapes) au lieu
// du simple commentaire de suivi (dossier_suivi).
const ETAPE_LABELS = {
  "DEPO|NULL|COMP": { libelle: "Dossier déposé", statut: "demande" },
  "DEPO|NULL|INCP": { libelle: "Dossier déposé, incomplet", statut: "ajourne" },
  "DEPO|CIPA|COMP": { libelle: "Dossier déposé (CNI + Passeport)", statut: "demande" },
  "TRAN|PREF|COMP": { libelle: "Transmis en préfecture", statut: "demande" },
  "TRAN|PREF|NCFM": { libelle: "Transmis en préfecture, non conforme", statut: "ajourne" },
  "ACTU|AJRN|COMP": { libelle: "Dossier actualisé, ajourné", statut: "ajourne" },
  "ACTU|AJRN|INCP": { libelle: "Actualisation, ajourné, incomplet", statut: "ajourne" },
  "ACTU|INCP|COMP": { libelle: "Dossier actualisé, incomplet", statut: "ajourne" },
  "ACTU|COMP|INCP": { libelle: "Actualisation, dossier incomplet", statut: "ajourne" },
  "ACTU|NCFM|NCFM": { libelle: "Actualisation, non conforme", statut: "ajourne" },
  "RENV|NULL|RENV": { libelle: "Dossier renvoyé", statut: "ajourne" },
  "RTOU|AJRN|AJRN": { libelle: "Retour, dossier ajourné", statut: "ajourne" },
  "RTOU|PRET|PRET": { libelle: "Retour en mairie, prêt", statut: "arrive" },
  "RTOU|REFU|REFU": { libelle: "Archivé", statut: "refuse" },
  "ERRP|NULL|NULL": { libelle: "Erreur pièce", statut: "erreur_piece" },
  "RELN|TELE|PRET": { libelle: "Relance téléphonique (dossier prêt)", statut: "arrive" },
  "RELN|TELE|RTIR": { libelle: "Relance téléphonique, retiré", statut: "recupere" },
  "RTIR|DEMA|RTIR": { libelle: "Retiré par le demandeur", statut: "recupere" },
  "RTIR|MAND|RTIR": { libelle: "Retiré par un mandataire", statut: "recupere" },
  "RTIR|AUTR|RTIR": { libelle: "Retiré (autre)", statut: "recupere" },
};

// Menu de changement d'etat de la fiche dossier : valeurs initiales de la table
// dossier_etapes_menu (parametrable dans Parametrage > Etapes des dossiers CNI).
// Les codes historiques ci-dessus restent valides pour la frise des dossiers importes.
// "commentaire" : l'agent peut preciser la nature (retour d'ajournement, erreur de piece) ;
// "si_tuteur" : choix propose seulement quand le destinataire du dossier n'est pas le beneficiaire.
const MENU_SEED = [
  { code: "DEPO|NULL|COMP", statut: "demande", libelle: "Dossier déposé" },
  { code: "ACTU|ENCO|COMP", statut: "demande", libelle: "Dossier actualisé, ajournement" },
  { code: "AJRN|PHOT", statut: "ajourne", libelle: "Photo", commentaire: true },
  { code: "AJRN|SIGN", statut: "ajourne", libelle: "Signature", commentaire: true },
  { code: "AJRN|JDOM", statut: "ajourne", libelle: "Justificatif de domicile", commentaire: true },
  { code: "AJRN|DVOL", statut: "ajourne", libelle: "Déclaration de vol", commentaire: true },
  { code: "AJRN|JUGE", statut: "ajourne", libelle: "Jugement", commentaire: true },
  { code: "AJRN|JIDE", statut: "ajourne", libelle: "Justificatif d'identité", commentaire: true },
  { code: "RTOU|PRET|PRET", statut: "arrive", libelle: "Retour en mairie, prêt" },
  { code: "RELN|TELE|PRET", statut: "arrive", libelle: "Relance téléphonique (dossier prêt)" },
  { code: "RTIR|DEMA|RTIR", statut: "recupere", libelle: "Par le demandeur" },
  { code: "RTIR|PAR1|RTIR", statut: "recupere", libelle: "Par le parent 1", personne: "parent1" },
  { code: "RTIR|PAR2|RTIR", statut: "recupere", libelle: "Par le parent 2", personne: "parent2" },
  { code: "RTIR|TUTE|RTIR", statut: "recupere", libelle: "Par le tuteur", personne: "tuteur" },
  { code: "RTIR|MAND|RTIR", statut: "recupere", libelle: "Par un mandataire" },
  { code: "ARCH|PREF|REJE", statut: "refuse", libelle: "Dossier rejeté par la préfecture" },
  { code: "ARCH|PREF|REFU", statut: "refuse", libelle: "Demande refusée par la préfecture" },
  { code: "ARCH|RENV", statut: "refuse", libelle: "Pièce renvoyée" },
  { code: "ERRP|NULL|NULL", statut: "erreur_piece", libelle: "Erreur pièce", commentaire: true },
];

// Prefixe du libelle inscrit dans la frise, pour qu'il reste parlant hors du menu.
const FRISE_PREFIX = { ajourne: "Ajourné : ", recupere: "Récupéré : " };

module.exports = { ETAPE_LABELS, MENU_SEED, FRISE_PREFIX };
