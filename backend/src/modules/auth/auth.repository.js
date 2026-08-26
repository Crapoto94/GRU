const { db, SCHEMA_NAME } = require("../../config/pg_db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { logAcces } = require("../../utils/logger");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const TABLE = `"${SCHEMA_NAME}".users`;

const authRepository = {
  async findByLogin(login) {
    return db.get(`SELECT * FROM ${TABLE} WHERE LOWER(login) = LOWER($1)`, [login]);
  },

  async findById(id) {
    return db.get(`SELECT id, login, nom, prenom, email, role, actif, created_at, updated_at FROM ${TABLE} WHERE id = $1`, [id]);
  },

  async create(data) {
    const passwordHash = await bcrypt.hash(data.password, 12);
    const result = await db.run(
      `INSERT INTO ${TABLE} (login, nom, prenom, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, login, nom, prenom, email, role, actif, created_at`,
      [data.login, data.nom, data.prenom, data.email, passwordHash, data.role || "utilisateur"]
    );
    return result.rows ? result.rows[0] : result;
  },

  async updatePassword(id, newPassword) {
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.run(`UPDATE ${TABLE} SET password_hash = $1, updated_at = NOW() WHERE id = $2`, [passwordHash, id]);
  },

  async comparePassword(plain, hash) {
    return bcrypt.compare(plain, hash);
  },

  generateToken(user) {
    return jwt.sign(
      { sub: user.id, login: user.login, role: user.role },
      JWT_SECRET,
      { expiresIn: "8h" }
    );
  },

  verifyToken(token) {
    return jwt.verify(token, JWT_SECRET);
  },
};

module.exports = authRepository;
