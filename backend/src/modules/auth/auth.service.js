const authRepository = require("./auth.repository");
const { pool, SCHEMA_NAME } = require("../../config/pg_db");
const { logAcces } = require("../../utils/logger");
const adService = require("../ad/ad.service");

const authService = {
  async login(login, password, ip) {
    const user = await authRepository.findByLogin(login);
    if (!user) throw Object.assign(new Error("Identifiants invalides"), { status: 401 });
    if (!user.actif) throw Object.assign(new Error("Compte desactive"), { status: 403 });
    const valid = await authRepository.comparePassword(password, user.password_hash);
    if (!valid) throw Object.assign(new Error("Identifiants invalides"), { status: 401 });
    const token = authRepository.generateToken(user);
    await logAcces(user.login, "LOGIN", "users", user.id, { login: user.login }, ip);
    return {
      token,
      user: { id: user.id, login: user.login, nom: user.nom, prenom: user.prenom, email: user.email, role: user.role },
    };
  },

  async loginAD(login, password, ip) {
    const normalizedLogin = login.toLowerCase();
    const adResult = await adService.authenticate(login, password);
    const adUser = adResult.user || adResult;
    let user = await authRepository.findByLogin(normalizedLogin);
    if (!user) {
      const result = await pool.query(
        `INSERT INTO "${SCHEMA_NAME}".users (login, nom, prenom, email, password_hash, role, fonction, service, direction, source)
         VALUES ($1, $2, $3, $4, '', 'utilisateur', $5, $6, $7, 'ad')
         ON CONFLICT (login) DO UPDATE SET
           fonction = COALESCE(EXCLUDED.fonction, "${SCHEMA_NAME}".users.fonction),
           service = COALESCE(EXCLUDED.service, "${SCHEMA_NAME}".users.service),
           direction = COALESCE(EXCLUDED.direction, "${SCHEMA_NAME}".users.direction),
           updated_at = NOW()
         RETURNING id, login, nom, prenom, email, role, fonction, service, direction, source, actif`,
        [
          normalizedLogin,
          adUser.sn || "",
          adUser.givenName || normalizedLogin,
          adUser.mail || `${normalizedLogin}@ivry.local`,
          adUser.title || null,
          adUser.department || null,
          adUser.company || null,
        ]
      );
      user = result.rows[0];
    }
    const token = authRepository.generateToken(user);
    await logAcces(user.login, "LOGIN_AD", "users", user.id, { login: user.login }, ip);
    return {
      token,
      user: { id: user.id, login: user.login, nom: user.nom, prenom: user.prenom, email: user.email, role: user.role },
    };
  },

  async register(data, ip) {
    const existing = await authRepository.findByLogin(data.login);
    if (existing) throw Object.assign(new Error("Ce login est deja utilise"), { status: 409 });
    const user = await authRepository.create(data);
    await logAcces(data.login, "REGISTER", "users", user.id, { login: user.login }, ip);
    return user;
  },

  async getProfile(userId) {
    const user = await authRepository.findById(userId);
    if (!user) throw Object.assign(new Error("Utilisateur non trouve"), { status: 404 });
    return user;
  },

  async changePassword(userId, currentPassword, newPassword) {
    const user = await authRepository.findById(userId);
    if (!user) throw Object.assign(new Error("Utilisateur non trouve"), { status: 404 });
    const fullUser = await authRepository.findByLogin(user.login);
    if (!fullUser || !fullUser.password_hash) {
      throw Object.assign(new Error("Compte AD - modification du mot de passe impossible ici"), { status: 400 });
    }
    const valid = await authRepository.comparePassword(currentPassword, fullUser.password_hash);
    if (!valid) throw Object.assign(new Error("Mot de passe actuel incorrect"), { status: 401 });
    await authRepository.updatePassword(userId, newPassword);
    await logAcces(user.login, "CHANGE_PASSWORD", "users", userId, {}, null);
  },
};

module.exports = authService;
