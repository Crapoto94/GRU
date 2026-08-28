const rgpdRepository = require("./rgpd.repository");
const { logAcces } = require("../../utils/logger");

const VALID_CATEGORIES = ["attestations", "dossiers", "usagers"];

const rgpdService = {
  async list() {
    await rgpdRepository.cleanupStaleAttestations();
    const rows = await rgpdRepository.findAll();
    const existingKeys = new Set(rows.map((r) => r.cle));
    const templates = await rgpdRepository.findTemplateConservationDefaults();
    const missing = templates
      .filter((t) => !existingKeys.has(t.cle))
      .map((t) => ({
        cle: t.cle,
        libelle: `${t.libelle} (template attestation)`,
        categorie: "attestations",
        conservation_mois: 36,
        description: t.description,
        actif: true,
        updated_at: null,
      }));
    return [...missing, ...rows].sort((a, b) => a.categorie.localeCompare(b.categorie) || a.libelle.localeCompare(b.libelle));
  },

  async getById(cle) {
    const row = await rgpdRepository.findByCle(cle);
    if (!row) throw Object.assign(new Error("Element de conservation non trouve"), { status: 404 });
    return row;
  },

  async upsert(cle, data, user, ip) {
    if (!cle) throw Object.assign(new Error("La cle est requise"), { status: 400 });
    const conservationMois = parseInt(data.conservation_mois, 10);
    if (!Number.isInteger(conservationMois) || conservationMois <= 0) {
      throw Object.assign(new Error("La duree de conservation doit etre un nombre de mois positif"), { status: 400 });
    }
    const existing = await rgpdRepository.findByCle(cle);
    let row;
    if (existing) {
      row = await rgpdRepository.update(cle, { conservation_mois: conservationMois, description: data.description });
    } else {
      let categorie;
      if (cle.startsWith("attestation_")) {
        categorie = "attestations";
      } else if (cle === "demandes_cni") {
        categorie = "dossiers";
      } else if (cle === "infos_usager") {
        categorie = "usagers";
      } else {
        categorie = data.categorie && VALID_CATEGORIES.includes(data.categorie) ? data.categorie : "usagers";
      }
      row = await rgpdRepository.create({
        cle,
        libelle: data.libelle || cle,
        categorie,
        conservation_mois: conservationMois,
        description: data.description,
      });
    }
    await logAcces(user, "UPDATE_RGPD_CONSERVATION", "rgpd_conservation", null, { cle, conservation_mois: conservationMois }, ip);
    return row;
  },

  async getUsagersToArchive() {
    return rgpdRepository.findUsagersToArchive();
  },

  async archiveUsagers(usagerIds, user, ip, motif = "Archivage RGPD - delai de conservation expire") {
    if (!Array.isArray(usagerIds) || !usagerIds.length) {
      throw Object.assign(new Error("Liste d'usagers requise"), { status: 400 });
    }
    const result = await rgpdRepository.archiveUsagers(usagerIds, user, motif);
    await logAcces(user, "ARCHIVE_USAGERS_RGPD", "usagers", null, { count: result.count, usagerIds }, ip);
    return result;
  },
};

module.exports = rgpdService;