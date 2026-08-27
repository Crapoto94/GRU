const logementRepository = require("./logements.repository");
const usagerRepository = require("../usagers/usagers.repository");
const { logAcces } = require("../../utils/logger");

const STATUTS_OCCUPATION = ["proprietaire", "locataire", "autre"];

const logementService = {
  async getByUsagerId(usagerId) {
    const usager = await usagerRepository.findById(usagerId);
    if (!usager) throw Object.assign(new Error("Usager non trouve"), { status: 404 });
    const logement = await logementRepository.findByUsagerId(usagerId);
    return logement || null;
  },

  async save(usagerId, data, user, ip) {
    const usager = await usagerRepository.findById(usagerId);
    if (!usager) throw Object.assign(new Error("Usager non trouve"), { status: 404 });

    if (data.statut_occupation && !STATUTS_OCCUPATION.includes(data.statut_occupation)) {
      throw Object.assign(new Error("statut_occupation invalide"), { status: 400 });
    }

    const logement = await logementRepository.upsert(usagerId, data);
    await logAcces(user, "SAVE_LOGEMENT", "logements", logement.id, { usager_id: usagerId }, ip);
    return logement;
  },

  async remove(usagerId, user, ip) {
    const usager = await usagerRepository.findById(usagerId);
    if (!usager) throw Object.assign(new Error("Usager non trouve"), { status: 404 });
    await logementRepository.remove(usagerId);
    await logAcces(user, "DELETE_LOGEMENT", "logements", usagerId, {}, ip);
  },
};

module.exports = logementService;
