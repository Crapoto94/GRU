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
  "RTOU|REFU|REFU": { libelle: "Refusé", statut: "refuse" },
  "RELN|TELE|PRET": { libelle: "Relance téléphonique (dossier prêt)", statut: "arrive" },
  "RELN|TELE|RTIR": { libelle: "Relance téléphonique, retiré", statut: "recupere" },
  "RTIR|DEMA|RTIR": { libelle: "Retiré par le demandeur", statut: "recupere" },
  "RTIR|MAND|RTIR": { libelle: "Retiré par un mandataire", statut: "recupere" },
  "RTIR|AUTR|RTIR": { libelle: "Retiré (autre)", statut: "recupere" },
};

const ETAPE_LIST = Object.entries(ETAPE_LABELS).map(([code, v]) => ({ code, libelle: v.libelle, statut: v.statut }));

module.exports = { ETAPE_LABELS, ETAPE_LIST };
