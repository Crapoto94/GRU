const { db, SCHEMA_NAME } = require("../../config/pg_db");
const bcrypt = require("bcryptjs");

const TABLE = `"${SCHEMA_NAME}".users`;
const SELECT_FIELDS = `id, login, nom, prenom, email, role, fonction, service, direction, source, actif, created_at, updated_at`;

const usersRepository = {
  async findAll({ search = "", limit = 50, offset = 0 } = {}) {
    let query = `SELECT ${SELECT_FIELDS} FROM ${TABLE} WHERE 1=1`;
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      params.push(`%${search}%`);
      params.push(`%${search}%`);
      query += ` AND (login ILIKE $${params.length - 2} OR nom ILIKE $${params.length - 1} OR prenom ILIKE $${params.length})`;
    }
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    const rows = await db.all(query, params);
    const countResult = await db.get(`SELECT COUNT(*) as total FROM ${TABLE}`);
    return { rows, total: parseInt(countResult.total, 10) };
  },

  async findById(id) {
    return db.get(`SELECT ${SELECT_FIELDS} FROM ${TABLE} WHERE id = $1`, [id]);
  },

  async findByLogin(login) {
    return db.get(`SELECT ${SELECT_FIELDS} FROM ${TABLE} WHERE LOWER(login) = LOWER($1)`, [login]);
  },

  async create(data) {
    const passwordHash = data.password ? await bcrypt.hash(data.password, 12) : "";
    const result = await db.run(
      `INSERT INTO ${TABLE} (login, nom, prenom, email, password_hash, role, fonction, service, direction, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING ${SELECT_FIELDS}`,
      [
        data.login, data.nom, data.prenom, data.email, passwordHash,
        data.role || "utilisateur", data.fonction || null, data.service || null,
        data.direction || null, data.source || "local",
      ]
    );
    return result.rows ? result.rows[0] : result;
  },

  async update(id, data) {
    const fields = [];
    const params = [];
    let idx = 1;
    for (const key of ["login", "nom", "prenom", "email", "role", "fonction", "service", "direction", "actif"]) {
      if (data[key] !== undefined) {
        fields.push(`"${key}" = $${idx}`);
        params.push(data[key]);
        idx++;
      }
    }
    if (data.password) {
      const hash = await bcrypt.hash(data.password, 12);
      fields.push(`"password_hash" = $${idx}`);
      params.push(hash);
      idx++;
    }
    fields.push(`"updated_at" = NOW()`);
    params.push(id);
    return db.run(
      `UPDATE ${TABLE} SET ${fields.join(", ")} WHERE id = $${idx}
       RETURNING ${SELECT_FIELDS}`,
      params
    );
  },

  async remove(id) {
    return db.run(`DELETE FROM ${TABLE} WHERE id = $1`, [id]);
  },
};

module.exports = usersRepository;
