const { pool, SCHEMA_NAME } = require("../config/pg_db");

const DEFAULT_TEMPLATES = {
  dossier_sms_template:
    "Bonjour, {{type_piece_label}} de {{prenom}} {{nom}} est arrive(e) en mairie. Merci de venir le/la retirer.",
  dossier_email_subject_template: "Votre {{type_piece_label}} est disponible",
  dossier_email_content_template:
    "Bonjour,<br><br>{{type_piece_label}} de {{prenom}} {{nom}} est arrive(e) en mairie.<br>Merci de venir le/la retirer aux horaires d'ouverture habituels.<br><br>Cordialement.",
};

function typePieceLabel(type) {
  return type === "CNI" ? "la carte nationale d'identite" : "le passeport";
}

function renderTemplate(template, vars) {
  return template.replace(/{{\s*(\w+)\s*}}/g, (_, key) => (vars[key] !== undefined ? String(vars[key]) : ""));
}

async function getDossierMessageTemplates() {
  const keys = Object.keys(DEFAULT_TEMPLATES);
  const res = await pool.query(
    `SELECT cle, valeur FROM "${SCHEMA_NAME}".config_params WHERE cle = ANY($1)`,
    [keys]
  );
  const stored = {};
  for (const r of res.rows) stored[r.cle] = r.valeur;
  const result = {};
  for (const key of keys) {
    result[key] = stored[key] || DEFAULT_TEMPLATES[key];
  }
  return result;
}

async function setDossierMessageTemplates({ sms_template, email_subject_template, email_content_template }) {
  const entries = [
    ["dossier_sms_template", sms_template, "Modele du SMS envoye lors de la disponibilite d'une piece"],
    ["dossier_email_subject_template", email_subject_template, "Modele du sujet de l'email envoye lors de la disponibilite d'une piece"],
    ["dossier_email_content_template", email_content_template, "Modele du contenu de l'email envoye lors de la disponibilite d'une piece"],
  ];
  for (const [cle, valeur, description] of entries) {
    if (valeur === undefined) continue;
    await pool.query(
      `INSERT INTO "${SCHEMA_NAME}".config_params (cle, valeur, description, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (cle) DO UPDATE SET valeur = EXCLUDED.valeur, updated_at = NOW()`,
      [cle, valeur, description]
    );
  }
}

module.exports = { DEFAULT_TEMPLATES, typePieceLabel, renderTemplate, getDossierMessageTemplates, setDossierMessageTemplates };
