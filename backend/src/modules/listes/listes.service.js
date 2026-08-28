const listesRepository = require("./listes.repository");
const { logAcces } = require("../../utils/logger");

const listesService = {
  async list() {
    return listesRepository.findAll();
  },

  async getByCle(cle) {
    const list = await listesRepository.findByCle(cle);
    if (!list) throw Object.assign(new Error("Liste introuvable"), { status: 404 });
    return list;
  },

  async create(data, user, ip) {
    if (!data.cle || !data.nom) throw Object.assign(new Error("cle et nom sont requis"), { status: 400 });
    const cle = data.cle.trim().toLowerCase().replace(/\s+/g, "_");
    if (!/^[a-z0-9_]+$/.test(cle)) throw Object.assign(new Error("clé invalide (a-z, 0-9, _)"), { status: 400 });
    const existing = await listesRepository.findByCle(cle, { withValues: false });
    if (existing) throw Object.assign(new Error("Une liste avec cette clé existe déjà"), { status: 409 });
    const list = await listesRepository.createList({ cle, nom: data.nom });
    await logAcces(user, "CREATE_LISTE", "listes_reference", list.id, { cle, nom: list.nom }, ip);
    return list;
  },

  async update(id, data, user, ip) {
    if (!data.nom || !String(data.nom).trim()) throw Object.assign(new Error("Le nom est requis"), { status: 400 });
    const list = await listesRepository.updateList(id, { nom: data.nom });
    if (!list.rows?.length) throw Object.assign(new Error("Liste introuvable"), { status: 404 });
    await logAcces(user, "UPDATE_LISTE", "listes_reference", id, { nom: data.nom }, ip);
    return list.rows[0];
  },

  async remove(id, user, ip) {
    await listesRepository.removeList(id);
    await logAcces(user, "DELETE_LISTE", "listes_reference", id, {}, ip);
  },

  async addValue(id, data, user, ip) {
    if (!data.code || !data.label) throw Object.assign(new Error("code et label sont requis"), { status: 400 });
    const list = await listesRepository.findById(id);
    if (!list) throw Object.assign(new Error("Liste introuvable"), { status: 404 });
    const value = await listesRepository.addValue(id, { code: data.code, label: data.label });
    await logAcces(user, "CREATE_LISTE_VALEUR", "listes_reference_valeurs", value.id, { code: value.code, label: value.label }, ip);
    return value;
  },

  async updateValue(valueId, data, user, ip) {
    if (!data.code || !data.label) throw Object.assign(new Error("code et label sont requis"), { status: 400 });
    const value = await listesRepository.updateValue(valueId, { code: data.code, label: data.label, ordre: data.ordre });
    if (!value.rows?.length) throw Object.assign(new Error("Valeur introuvable"), { status: 404 });
    await logAcces(user, "UPDATE_LISTE_VALEUR", "listes_reference_valeurs", valueId, { code: value.code, label: value.label }, ip);
    return value.rows[0];
  },

  async removeValue(valueId, user, ip) {
    await listesRepository.removeValue(valueId);
    await logAcces(user, "DELETE_LISTE_VALEUR", "listes_reference_valeurs", valueId, {}, ip);
  },
};

module.exports = listesService;