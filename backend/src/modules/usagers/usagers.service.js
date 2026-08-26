const usagerRepository = require("./usagers.repository");
const { validateUsager } = require("../../utils/validators");
const { logAcces } = require("../../utils/logger");

const usagerService = {
  async list(params) {
    return usagerRepository.findAll(params);
  },

  async getById(id) {
    const usager = await usagerRepository.findById(id);
    if (!usager) throw Object.assign(new Error("Usager non trouve"), { status: 404 });
    return usager;
  },

  async create(data, user, ip) {
    const validation = validateUsager(data);
    if (!validation.valid) {
      const err = Object.assign(new Error(validation.errors.join(", ")), { status: 400 });
      throw err;
    }
    const usager = await usagerRepository.create({ ...data, created_by: user });
    await logAcces(user, "CREATE", "usagers", usager.id, { nom: usager.nom, prenom: usager.prenom }, ip);
    return usager;
  },

  async update(id, data, user, ip) {
    await this.getById(id);
    const validation = validateUsager(data);
    if (!validation.valid) {
      const err = Object.assign(new Error(validation.errors.join(", ")), { status: 400 });
      throw err;
    }
    const updated = await usagerRepository.update(id, data);
    await logAcces(user, "UPDATE", "usagers", id, data, ip);
    return updated;
  },

  async archive(id, motif, user, ip) {
    const usager = await this.getById(id);
    if (usager.archived) throw Object.assign(new Error("Usager deja archive"), { status: 400 });
    const archived = await usagerRepository.archive(id, motif);
    await logAcces(user, "ARCHIVE", "usagers", id, { motif }, ip);
    return archived;
  },

  async restore(id, user, ip) {
    const usager = await this.getById(id);
    if (!usager.archived) throw Object.assign(new Error("Usager non archive"), { status: 400 });
    const restored = await usagerRepository.restore(id);
    await logAcces(user, "RESTORE", "usagers", id, {}, ip);
    return restored;
  },

  async remove(id, user, ip) {
    await this.getById(id);
    await usagerRepository.remove(id);
    await logAcces(user, "DELETE", "usagers", id, {}, ip);
  },

  async count() {
    return usagerRepository.count();
  },

  async checkDoublons(params) {
    return usagerRepository.checkDoublons(params);
  },
};

module.exports = usagerService;
