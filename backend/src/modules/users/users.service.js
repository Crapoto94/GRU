const usersRepository = require("./users.repository");
const { logAcces } = require("../../utils/logger");

const usersService = {
  async list(params) {
    return usersRepository.findAll(params);
  },

  async getById(id) {
    const user = await usersRepository.findById(id);
    if (!user) throw Object.assign(new Error("Utilisateur non trouve"), { status: 404 });
    return user;
  },

  async create(data, adminUser, ip) {
    if (!data.login || !data.nom || !data.prenom || !data.email || !data.password) {
      throw Object.assign(new Error("Login, nom, prenom, email et mot de passe sont requis"), { status: 400 });
    }
    if (!["utilisateur", "administrateur"].includes(data.role)) {
      throw Object.assign(new Error("Role invalide"), { status: 400 });
    }
    const user = await usersRepository.create(data);
    await logAcces(adminUser, "CREATE_USER", "users", user.id, { login: user.login }, ip);
    return user;
  },

  async createFromAD(data, adminUser, ip) {
    if (!data.login || !data.nom || !data.prenom || !data.email) {
      throw Object.assign(new Error("Login, nom, prenom et email sont requis"), { status: 400 });
    }
    const role = data.role || "utilisateur";
    if (!["utilisateur", "administrateur"].includes(role)) {
      throw Object.assign(new Error("Role invalide"), { status: 400 });
    }
    const existing = await usersRepository.findByLogin(data.login);
    if (existing) {
      const updated = await usersRepository.update(existing.id, {
        nom: data.nom,
        prenom: data.prenom,
        email: data.email,
        role,
        fonction: data.fonction || null,
        service: data.service || null,
        direction: data.direction || null,
        source: "ad",
      });
      await logAcces(adminUser, "UPDATE_USER_AD", "users", existing.id, { login: existing.login }, ip);
      return updated;
    }
    const user = await usersRepository.create({
      login: data.login,
      nom: data.nom,
      prenom: data.prenom,
      email: data.email,
      password: null,
      role,
      fonction: data.fonction || null,
      service: data.service || null,
      direction: data.direction || null,
      source: "ad",
    });
    await logAcces(adminUser, "CREATE_USER_AD", "users", user.id, { login: user.login }, ip);
    return user;
  },

  async update(id, data, adminUser, ip) {
    await this.getById(id);
    if (data.role && !["utilisateur", "administrateur"].includes(data.role)) {
      throw Object.assign(new Error("Role invalide"), { status: 400 });
    }
    const updated = await usersRepository.update(id, data);
    await logAcces(adminUser, "UPDATE_USER", "users", id, data, ip);
    return updated;
  },

  async remove(id, adminUser, ip) {
    await this.getById(id);
    await usersRepository.remove(id);
    await logAcces(adminUser, "DELETE_USER", "users", id, {}, ip);
  },
};

module.exports = usersService;
