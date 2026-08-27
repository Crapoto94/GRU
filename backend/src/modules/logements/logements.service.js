const logementRepository = require("./logements.repository");
const usagerRepository = require("../usagers/usagers.repository");
const { logAcces } = require("../../utils/logger");

const STATUTS_OCCUPATION = ["proprietaire", "locataire", "autre"];
const TYPES_LOGEMENT = ["principal", "secondaire"];

function checkType(typeLogement) {
  if (!TYPES_LOGEMENT.includes(typeLogement)) {
    throw Object.assign(new Error("type_logement invalide"), { status: 400 });
  }
}

const logementService = {
  async getByUsagerId(usagerId, typeLogement = "principal") {
    checkType(typeLogement);
    const usager = await usagerRepository.findById(usagerId);
    if (!usager) throw Object.assign(new Error("Usager non trouve"), { status: 404 });
    const logement = await logementRepository.findByUsagerId(usagerId, typeLogement);
    return logement || null;
  },

  async save(usagerId, typeLogement, data, user, ip) {
    checkType(typeLogement);
    const usager = await usagerRepository.findById(usagerId);
    if (!usager) throw Object.assign(new Error("Usager non trouve"), { status: 404 });

    if (data.statut_occupation && !STATUTS_OCCUPATION.includes(data.statut_occupation)) {
      throw Object.assign(new Error("statut_occupation invalide"), { status: 400 });
    }

    const logement = await logementRepository.upsert(usagerId, typeLogement, data);
    await logAcces(user, "SAVE_LOGEMENT", "logements", logement.id, { usager_id: usagerId, type_logement: typeLogement }, ip);
    return logement;
  },

  async remove(usagerId, typeLogement, user, ip) {
    checkType(typeLogement);
    const usager = await usagerRepository.findById(usagerId);
    if (!usager) throw Object.assign(new Error("Usager non trouve"), { status: 404 });
    await logementRepository.remove(usagerId, typeLogement);
    await logAcces(user, "DELETE_LOGEMENT", "logements", usagerId, { type_logement: typeLogement }, ip);
  },
};

module.exports = logementService;
