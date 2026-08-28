const { db, SCHEMA_NAME } = require("../../config/pg_db");

const TABLE = `"${SCHEMA_NAME}".listes_reference`;
const TABLE_VALEURS = `"${SCHEMA_NAME}".listes_reference_valeurs`;

async function groupValues(rows) {
  const lists = new Map();
  for (const r of rows) {
    let l = lists.get(r.id);
    if (!l) {
      l = {
        id: r.id,
        cle: r.cle,
        nom: r.nom,
        created_at: r.created_at,
        updated_at: r.updated_at,
        valeurs: [],
      };
      lists.set(r.id, l);
    }
    if (r.v_id) {
      l.valeurs.push({ id: r.v_id, code: r.code, label: r.label, ordre: r.ordre });
    }
  }
  return [...lists.values()];
}

const listesRepository = {
  async findAll() {
    const rows = await db.all(
      `SELECT l.id, l.cle, l.nom, l.created_at, l.updated_at,
              v.id AS v_id, v.code, v.label, v.ordre
       FROM ${TABLE} l
       LEFT JOIN ${TABLE_VALEURS} v ON v.liste_id = l.id
       ORDER BY l.nom ASC, v.ordre ASC, v.code ASC`
    );
    const lists = await groupValues(rows);
    for (const l of lists) l.valeurs = l.valeurs.sort((a, b) => a.ordre - b.ordre || a.code.localeCompare(b.code));
    return lists;
  },

  async findByCle(cle, { withValues = true } = {}) {
    const list = await db.get(`SELECT * FROM ${TABLE} WHERE cle = $1`, [cle]);
    if (!list) return null;
    if (!withValues) return list;
    list.valeurs = await db.all(
      `SELECT id, code, label, ordre FROM ${TABLE_VALEURS} WHERE liste_id = $1
       ORDER BY ordre ASC, code ASC`,
      [list.id]
    );
    return list;
  },

  async findById(id) {
    return db.get(`SELECT * FROM ${TABLE} WHERE id = $1`, [id]);
  },

  async createList({ cle, nom }) {
    const result = await db.run(
      `INSERT INTO ${TABLE} (cle, nom) VALUES ($1, $2) RETURNING *`,
      [cle.trim(), nom.trim()]
    );
    return result.rows[0];
  },

  async updateList(id, { nom }) {
    return db.run(
      `UPDATE ${TABLE} SET nom = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [nom.trim(), id]
    );
  },

  async removeList(id) {
    return db.run(`DELETE FROM ${TABLE} WHERE id = $1`, [id]);
  },

  async addValue(listeId, { code, label }) {
    const last = await db.get(
      `SELECT COALESCE(MAX(ordre), 0) + 1 AS next FROM ${TABLE_VALEURS} WHERE liste_id = $1`,
      [listeId]
    );
    const result = await db.run(
      `INSERT INTO ${TABLE_VALEURS} (liste_id, code, label, ordre) VALUES ($1, $2, $3, $4)
       ON CONFLICT (liste_id, code) DO UPDATE SET label = EXCLUDED.label, ordre = EXCLUDED.ordre, updated_at = NOW()
       RETURNING *`,
      [listeId, code.trim(), label.trim(), last.next]
    );
    return result.rows[0];
  },

  async updateValue(id, { code, label, ordre }) {
    return db.run(
      `UPDATE ${TABLE_VALEURS} SET code = $1, label = $2, ordre = $3, updated_at = NOW() WHERE id = $4 RETURNING *`,
      [code.trim(), label.trim(), ordre == null ? 0 : parseInt(ordre, 10), id]
    );
  },

  async removeValue(id) {
    return db.run(`DELETE FROM ${TABLE_VALEURS} WHERE id = $1`, [id]);
  },
};

module.exports = listesRepository;