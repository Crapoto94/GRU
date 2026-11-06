const fs = require("fs");
const path = require("path");
const { ageEn } = require("./age");

// Gabarits Word des courriers (dossiers CNI/Passeport). Un gabarit par defaut est livre
// avec l'application ; une version deposee dans Parametrage > Gabarits le remplace.
const DEFAULTS_DIR = path.resolve(__dirname, "../../templates/gabarits/defaults");
const CUSTOM_DIR = path.resolve(__dirname, "../../uploads/gabarits");

const GABARITS = {
  courrier_ajourne: {
    label: "Courrier d'ajournement",
    description: "Envoyé quand une pièce est ajournée : précise le document manquant.",
    statut: "ajourne",
  },
  courrier_relance: {
    label: "Courrier de relance",
    description: "Envoyé quand la pièce est arrivée mais n'a pas été retirée.",
    statut: "arrive",
  },
  courrier_archive: {
    label: "Courrier d'archivage",
    description: "Envoyé à la clôture d'un dossier archivé (rejet, refus, pièce renvoyée).",
    statut: "refuse",
  },
};

const VARIABLES = [
  ["date_du_jour", "Date du jour (JJ/MM/AAAA)"],
  ["date_du_jour_long", "Date du jour en toutes lettres"],
  ["civilite", "Civilité du bénéficiaire"],
  ["nom", "Nom du bénéficiaire"],
  ["prenom", "Prénom du bénéficiaire"],
  ["nom_complet", "Civilité, prénom et nom du bénéficiaire"],
  ["date_naissance", "Date de naissance du bénéficiaire"],
  ["type_piece", "CNI ou Passeport"],
  ["type_piece_label", "« la carte nationale d'identité » ou « le passeport »"],
  ["date_demande", "Date de la demande"],
  ["date_statut", "Date d'entrée dans le statut courant (ex : date d'arrivée de la pièce)"],
  ["motif", "Choix retenu dans le menu d'état (ex : Photo, Dossier rejeté par la préfecture)"],
  ["commentaire", "Commentaire saisi lors du changement d'état"],
  ["presence_mineur", "Phrase sur la présence obligatoire d'un mineur de 12 ans ou plus (vide sinon)"],
  ["destinataire_civilite", "Civilité du destinataire du courrier"],
  ["destinataire_nom", "Nom du destinataire"],
  ["destinataire_prenom", "Prénom du destinataire"],
  ["destinataire_nom_complet", "Civilité, prénom et nom du destinataire"],
  ["destinataire_adresse", "Adresse du destinataire"],
  ["destinataire_complement_adresse", "Complément d'adresse du destinataire"],
  ["destinataire_code_postal", "Code postal du destinataire"],
  ["destinataire_ville", "Ville du destinataire"],
  ["agent_nom_complet", "Prénom et nom de l'agent connecté"],
].map(([cle, description]) => ({ cle, description }));

function customPath(key) {
  return path.join(CUSTOM_DIR, `${key}.docx`);
}

function defaultPath(key) {
  return path.join(DEFAULTS_DIR, `${key}.docx`);
}

function resolveGabaritPath(key) {
  return fs.existsSync(customPath(key)) ? customPath(key) : defaultPath(key);
}

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("fr-FR") : "");
const nomComplet = (u) => (u ? `${u.civilite || ""} ${u.prenom || ""} ${(u.nom || "").toUpperCase()}`.trim() : "");

function buildCourrierData({ piece, usager, destinataire, etape, agent, depuisDate }) {
  const dest = destinataire || usager;
  const mineur12 = usager.date_naissance && ageEn(usager.date_naissance) >= 12 && ageEn(usager.date_naissance) < 18;
  const now = new Date();
  return {
    date_du_jour: now.toLocaleDateString("fr-FR"),
    date_du_jour_long: now.toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" }),
    civilite: usager.civilite || "",
    nom: (usager.nom || "").toUpperCase(),
    prenom: usager.prenom || "",
    nom_complet: nomComplet(usager),
    date_naissance: fmtDate(usager.date_naissance),
    type_piece: piece.type_piece,
    type_piece_label: piece.type_piece === "Passeport" ? "le passeport" : "la carte nationale d'identité",
    date_demande: fmtDate(piece.date_demande),
    date_statut: fmtDate(depuisDate),
    motif: etape?.libelle || "",
    commentaire: etape?.commentaire || "",
    presence_mineur: mineur12 ? "Le mineur de 12 ans ou plus doit être présent lors du retrait (relevé d'empreintes)." : "",
    destinataire_civilite: dest.civilite || "",
    destinataire_nom: (dest.nom || "").toUpperCase(),
    destinataire_prenom: dest.prenom || "",
    destinataire_nom_complet: nomComplet(dest),
    destinataire_adresse: dest.Adresse || dest.adresse || "",
    destinataire_complement_adresse: dest.complement_adresse || "",
    destinataire_code_postal: dest.code_postal || "",
    destinataire_ville: dest.ville || "",
    agent_nom_complet: agent || "",
  };
}

module.exports = {
  GABARITS,
  VARIABLES,
  CUSTOM_DIR,
  customPath,
  defaultPath,
  resolveGabaritPath,
  buildCourrierData,
};
