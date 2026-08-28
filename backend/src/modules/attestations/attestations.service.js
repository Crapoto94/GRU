const path = require("path");
const fs = require("fs");
const Docxtemplater = require("docxtemplater");
const PizZip = require("pizzip");
const { v4: uuidv4 } = require("uuid");
const attestationRepository = require("./attestations.repository");
const usagerRepository = require("../usagers/usagers.repository");
const logementRepository = require("../logements/logements.repository");
const { logAcces } = require("../../utils/logger");

const TEMPLATES_DIR = path.resolve(__dirname, "../../../templates");
const UPLOADS_DIR = path.resolve(__dirname, "../../../uploads/documents");

function formatPrenom(name) {
  if (!name) return "";
  return name
    .split(/\s+/)
    .map((part) =>
      part
        .split("-")
        .map((sub) => sub.charAt(0).toUpperCase() + sub.slice(1).toLowerCase())
        .join("-")
    )
    .join(" ");
}

function formatNom(name) {
  return (name || "").toUpperCase();
}

const STATUT_OCCUPATION_LABELS = {
  proprietaire: "Propriétaire",
  locataire: "Locataire",
  autre: "Autre",
};

function prepareLogementData(logement, prefix) {
  const statut = logement?.statut_occupation || "";
  const label = statut
    ? STATUT_OCCUPATION_LABELS[statut] + (statut === "autre" && logement.statut_occupation_precision ? ` : ${logement.statut_occupation_precision}` : "")
    : "";
  return {
    [`${prefix}_adresse_complete`]: logement?.adresse || "",
    [`${prefix}_complement_adresse`]: logement?.complement_adresse || "",
    [`${prefix}_code_postal`]: logement?.code_postal || "",
    [`${prefix}_ville`]: logement?.ville || "",
    [`${prefix}_pays`]: logement?.pays || "",
    [`${prefix}_numero_batiment_escalier`]: logement?.numero_batiment_escalier || "",
    [`${prefix}_surface`]: logement?.surface_logement != null ? String(logement.surface_logement) : "",
    [`${prefix}_nombre_pieces`]: logement?.nombre_pieces != null ? String(logement.nombre_pieces) : "",
    [`${prefix}_etat_sanitaire`]: logement?.etat_sanitaire || "",
    [`${prefix}_occupants_habituels`]: logement?.occupants_habituels_details || "",
    [`${prefix}_occupants_permanents`]: logement?.occupants_permanents != null ? String(logement.occupants_permanents) : "",
    [`${prefix}_occupants_temporaires`]: logement?.occupants_temporaires != null ? String(logement.occupants_temporaires) : "",
    [`${prefix}_statut_occupation`]: label,
    [`${prefix}_statut_occupation_precision`]: logement?.statut_occupation_precision || "",
    [`${prefix}_case_proprietaire`]: statut === "proprietaire" ? "X" : "",
    [`${prefix}_case_locataire`]: statut === "locataire" ? "X" : "",
    [`${prefix}_case_autre`]: statut === "autre" ? "X" : "",
  };
}

async function prepareUsagerData(usager) {
  const isMale = usager.civilite === "M.";
  const isNeutral = usager.civilite === "Mx";
  return {
    civilite: usager.civilite || "",
    nom: formatNom(usager.nom) || "",
    prenom: formatPrenom(usager.prenom) || "",
    nom_complet: `${usager.civilite || ""} ${formatPrenom(usager.prenom)} ${formatNom(usager.nom)}`.trim(),
    nom_usage: usager.nom_usage ? `(${formatNom(usager.nom_usage)})` : "",
    ne: isMale ? "né" : isNeutral ? "" : "née",
    sexe: isMale ? "masculin" : isNeutral ? "non-binaire" : "féminin",
    date_naissance: usager.date_naissance
      ? new Date(usager.date_naissance).toLocaleDateString("fr-FR")
      : "",
    date_naissance_long: usager.date_naissance
      ? new Date(usager.date_naissance).toLocaleDateString("fr-FR", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "",
    lieu_naissance: usager.lieu_naissance || "",
    pays_naissance: usager.pays_naissance || "",
    nationalite: usager.nationalite || "",
    situation_familiale: usager.situation_familiale || "",
    email: usager.email || "",
    telephone: usager.telephone || "",
    mobile: usager.mobile || "",
    adresse_complete: usager.Adresse || usager.adresse || "",
    complement_adresse: usager.complement_adresse || "",
    code_postal: usager.code_postal || "",
    ville: usager.ville || "",
    pays: usager.pays || "France",
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

  async listAda(params) {
    return attestationRepository.findAllAda({
      search: params.search,
      limite: Math.min(parseInt(params.limite, 10) || 100, 500),
      offset: parseInt(params.offset, 10) || 0,
    });
  },

  async getAdaByLegacyId(legacyId) {
    const ada = await attestationRepository.findAdaByLegacyId(legacyId);
    if (!ada) throw Object.assign(new Error("Demande d'attestation d'accueil non trouvee"), { status: 404 });
    return ada;
  },

  async getAttestationById(id) {
    const attestation = await attestationRepository.findAttestationById(id);
    if (!attestation) throw Object.assign(new Error("Attestation non trouvee"), { status: 404 });
    return attestation;
  },

  async generate(usagerId, templateId, customData, user, ip, usager2Id, usager3Id, logementConcerne) {
    const usager = await usagerRepository.findById(usagerId);
    if (!usager) throw Object.assign(new Error("Usager non trouve"), { status: 404 });

    const template = await attestationRepository.findTemplateById(templateId);
    if (!template) throw Object.assign(new Error("Template non trouve"), { status: 404 });

    const nbUsagers = template.nb_usagers || 1;

    let logementChoisi = null;
    if (template.usage_logement_principal && template.usage_logement_secondaire) {
      if (logementConcerne !== "principal" && logementConcerne !== "secondaire") {
        throw Object.assign(new Error("logement_concerne (principal ou secondaire) est requis pour ce template"), { status: 400 });
      }
      logementChoisi = logementConcerne;
    } else if (template.usage_logement_principal) {
      logementChoisi = "principal";
    } else if (template.usage_logement_secondaire) {
      logementChoisi = "secondaire";
    }

    let usager2 = null;
    if (nbUsagers >= 2 && usager2Id) {
      usager2 = await usagerRepository.findById(usager2Id);
      if (!usager2) throw Object.assign(new Error("Second usager non trouve"), { status: 404 });
    }
    let usager3 = null;
    if (nbUsagers >= 3 && usager3Id) {
      usager3 = await usagerRepository.findById(usager3Id);
      if (!usager3) throw Object.assign(new Error("Troisieme usager non trouve"), { status: 404 });
    }

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

    let mergeData;

    if (nbUsagers === 1) {
      mergeData = await prepareUsagerData(usager);
    } else {
      mergeData = {};
      const usagers = [
        { data: usager, key: "usager1" },
        ...(usager2 ? [{ data: usager2, key: "usager2" }] : []),
        ...(usager3 ? [{ data: usager3, key: "usager3" }] : []),
      ];
      for (const { data, key } of usagers) {
        for (const [field, val] of Object.entries(await prepareUsagerData(data))) {
          mergeData[`${key}_${field}`] = val;
        }
      }
    }

    Object.assign(mergeData, prepareLogementData(null, "logement1"));
    Object.assign(mergeData, prepareLogementData(null, "logement2"));
    if (logementChoisi) {
      const logement = await logementRepository.findByUsagerId(usagerId, logementChoisi);
      const prefix = logementChoisi === "principal" ? "logement1" : "logement2";
      Object.assign(mergeData, prepareLogementData(logement, prefix));
    }

    const datesMemeType = await attestationRepository.findDatesByUsagerAndTemplate(usagerId, templateId);
    mergeData.usager1_historique_dates_meme_type = datesMemeType
      .map((row) => new Date(row.date_generation).toLocaleDateString("fr-FR"))
      .join(", ");

    if (usager2Id) {
      const datesCouple = await attestationRepository.findDatesByUsagerPairAndTemplate(usagerId, usager2Id, templateId);
      mergeData.historique_dates_usager1_usager2 = datesCouple
        .map((row) => new Date(row.date_generation).toLocaleDateString("fr-FR"))
        .join(", ");
    } else {
      mergeData.historique_dates_usager1_usager2 = "";
    }

    mergeData.date_du_jour = new Date().toLocaleDateString("fr-FR");
    mergeData.date_du_jour_long = new Date().toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    Object.assign(mergeData, customData || {});
    doc.render(mergeData);

    const outputDocx = doc.getZip().generate({ type: "nodebuffer" });
    const attestationId = uuidv4();
    const filename = `attestation_${attestationId}.docx`;
    const filePath = path.join(UPLOADS_DIR, filename);

    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    fs.writeFileSync(filePath, outputDocx);

    const nameParts = [`${formatPrenom(usager.prenom)} ${formatNom(usager.nom)}`];
    if (usager2) nameParts.push(`${formatPrenom(usager2.prenom)} ${formatNom(usager2.nom)}`);
    if (usager3) nameParts.push(`${formatPrenom(usager3.prenom)} ${formatNom(usager3.nom)}`);
    const titreSuffixe = nameParts.join(" & ");

    const attestation = await attestationRepository.create({
      id: attestationId,
      usager_id: usagerId,
      usager2_id: nbUsagers >= 2 ? usager2Id : null,
      usager3_id: nbUsagers >= 3 ? usager3Id : null,
      template_id: templateId,
      titre: `${template.nom} - ${titreSuffixe}`,
      contenu_genere: mergeData,
      fichier_pdf: filename,
      statut: "genere",
      date_generation: new Date().toISOString(),
      genere_par: user,
    });

    await logAcces(user, "GENERATE_ATTESTATION", "attestations", attestation.id, {
      template: template.nom,
      usager: titreSuffixe,
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
