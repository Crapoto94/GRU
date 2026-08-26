const path = require("path");
const fs = require("fs");
const Docxtemplater = require("docxtemplater");
const PizZip = require("pizzip");
const { v4: uuidv4 } = require("uuid");
const attestationRepository = require("./attestations.repository");
const usagerRepository = require("../usagers/usagers.repository");
const { logAcces } = require("../../utils/logger");

const TEMPLATES_DIR = path.resolve(__dirname, "../../../templates");
const UPLOADS_DIR = path.resolve(__dirname, "../../../uploads/documents");

function prepareUsagerData(usager) {
  return {
    civilite: usager.civilite || "",
    nom: usager.nom || "",
    prenom: usager.prenom || "",
    nom_complet: `${usager.civilite || ""} ${usager.prenom || ""} ${usager.nom || ""}`.trim(),
    nom_usage: usager.nom_usage || "",
    date_naissance: usager.date_naissance
      ? new Date(usager.date_naissance).toLocaleDateString("fr-FR")
      : "",
    lieu_naissance: usager.lieu_naissance || "",
    pays_naissance: usager.pays_naissance || "",
    nationalite: usager.nationalite || "",
    situation_familiale: usager.situation_familiale || "",
    email: usager.email || "",
    telephone: usager.telephone || "",
    mobile: usager.mobile || "",
    adresse_complete: usager.Adresse || "",
    complement_adresse: usager.complement_adresse || "",
    code_postal: usager.code_postal || "",
    ville: usager.ville || "",
    pays: usager.pays || "France",
    date_du_jour: new Date().toLocaleDateString("fr-FR"),
    date_du_jour_long: new Date().toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  };
}

const attestationService = {
  async listTemplates(params) {
    return attestationRepository.findAllTemplates(params);
  },

  async getTemplateById(id) {
    const template = await attestationRepository.findTemplateById(id);
    if (!template) throw Object.assign(new Error("Template non trouve"), { status: 404 });
    return template;
  },

  async createTemplate(data) {
    if (!data.nom) throw Object.assign(new Error("Le nom du template est requis"), { status: 400 });
    if (!data.fichier_original) throw Object.assign(new Error("Le fichier original est requis"), { status: 400 });
    return attestationRepository.createTemplate(data);
  },

  async listAttestations(params) {
    return attestationRepository.findAll(params);
  },

  async getAttestationById(id) {
    const attestation = await attestationRepository.findAttestationById(id);
    if (!attestation) throw Object.assign(new Error("Attestation non trouvee"), { status: 404 });
    return attestation;
  },

  async generate(usagerId, templateId, customData, user, ip) {
    const usager = await usagerRepository.findById(usagerId);
    if (!usager) throw Object.assign(new Error("Usager non trouve"), { status: 404 });

    const template = await attestationRepository.findTemplateById(templateId);
    if (!template) throw Object.assign(new Error("Template non trouve"), { status: 404 });

    const templatePath = path.join(TEMPLATES_DIR, template.fichier_original);
    if (!fs.existsSync(templatePath)) {
      throw Object.assign(new Error("Fichier template introuvable sur le serveur"), { status: 404 });
    }

    const content = fs.readFileSync(templatePath, "binary");
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: "{{", end: "}}" },
    });

    const mergeData = { ...prepareUsagerData(usager), ...(customData || {}) };
    doc.render(mergeData);

    const outputDocx = doc.getZip().generate({ type: "nodebuffer" });
    const attestationId = uuidv4();
    const filename = `attestation_${attestationId}.docx`;
    const filePath = path.join(UPLOADS_DIR, filename);

    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    fs.writeFileSync(filePath, outputDocx);

    const attestation = await attestationRepository.create({
      id: attestationId,
      usager_id: usagerId,
      template_id: templateId,
      titre: `${template.nom} - ${usager.prenom} ${usager.nom}`,
      contenu_genere: mergeData,
      fichier_pdf: filename,
      statut: "genere",
      date_generation: new Date().toISOString(),
      genere_par: user,
    });

    await logAcces(user, "GENERATE_ATTESTATION", "attestations", attestation.id, {
      template: template.nom,
      usager: `${usager.prenom} ${usager.nom}`,
    }, ip);

    return attestation;
  },

  async remove(id, user, ip) {
    const attestation = await this.getAttestationById(id);
    if (attestation.fichier_pdf) {
      const filePath = path.join(UPLOADS_DIR, attestation.fichier_pdf);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await attestationRepository.remove(id);
    await logAcces(user, "DELETE_ATTESTATION", "attestations", id, {}, ip);
  },
};

module.exports = attestationService;
