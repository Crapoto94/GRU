const { db, SCHEMA_NAME } = require("../../config/pg_db");

const TABLE_TEMPLATES = `"${SCHEMA_NAME}".templates`;
const TABLE_ATTESTATIONS = `"${SCHEMA_NAME}".attestations`;

const attestationRepository = {
  async findAllTemplates({ actif = true, limit = 50, offset = 0 } = {}) {
    let query = `SELECT * FROM ${TABLE_TEMPLATES} WHERE actif = $1`;
    const params = [actif];
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    const rows = await db.all(query, params);
    const countResult = await db.get(`SELECT COUNT(*) as total FROM ${TABLE_TEMPLATES} WHERE actif = $1`, [actif]);
    return { rows, total: parseInt(countResult.total, 10) };
  },

  async findTemplateById(id) {
    return db.get(`SELECT * FROM ${TABLE_TEMPLATES} WHERE id = $1`, [id]);
  },

  async createTemplate(data) {
    const result = await db.run(
      `INSERT INTO ${TABLE_TEMPLATES} (nom, description, fichier_original, variables)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.nom, data.description || null, data.fichier_original, JSON.stringify(data.variables || [])]
    );
    return result.rows ? result.rows[0] : result;
  },

  async updateTemplate(id, data) {
    const fields = [];
    const params = [];
    let idx = 1;
    for (const key of ["nom", "description", "fichier_original", "variables", "actif"]) {
      if (data[key] !== undefined) {
        fields.push(`"${key}" = $${idx}`);
        params.push(key === "variables" ? JSON.stringify(data[key]) : data[key]);
        idx++;
      }
    }
    fields.push(`"updated_at" = NOW()`);
    params.push(id);
    return db.run(`UPDATE ${TABLE_TEMPLATES} SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`, params);
  },

  async removeTemplate(id) {
    return db.run(`DELETE FROM ${TABLE_TEMPLATES} WHERE id = $1`, [id]);
  },

  async findAll({ statut, usager_id, limit = 50, offset = 0 } = {}) {
    let query = `SELECT a.*, u.nom as usager_nom, u.prenom as usager_prenom, t.nom as template_nom
      FROM ${TABLE_ATTESTATIONS} a
      LEFT JOIN "${SCHEMA_NAME}".usagers u ON a.usager_id = u.id
      LEFT JOIN ${TABLE_TEMPLATES} t ON a.template_id = t.id
      WHERE 1=1`;
    const params = [];
    if (statut) {
      params.push(statut);
      query += ` AND a.statut = $${params.length}`;
    }
    if (usager_id) {
      params.push(usager_id);
      query += ` AND a.usager_id = $${params.length}`;
    }
    query += ` ORDER BY a.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    const rows = await db.all(query, params);
    const countResult = await db.get(
      `SELECT COUNT(*) as total FROM ${TABLE_ATTESTATIONS} WHERE 1=1` +
        (statut ? ` AND statut = '${statut}'` : "") +
        (usager_id ? ` AND usager_id = '${usager_id}'` : "")
    );
    return { rows, total: parseInt(countResult.total, 10) };
  },

  async findAttestationById(id) {
    return db.get(
      `SELECT a.*, u.nom as usager_nom, u.prenom as usager_prenom, t.nom as template_nom
       FROM ${TABLE_ATTESTATIONS} a
       LEFT JOIN "${SCHEMA_NAME}".usagers u ON a.usager_id = u.id
       LEFT JOIN ${TABLE_TEMPLATES} t ON a.template_id = t.id
       WHERE a.id = $1`,
      [id]
    );
  },

  async create(data) {
    const result = await db.run(
      `INSERT INTO ${TABLE_ATTESTATIONS} (usager_id, template_id, titre, contenu_genere, fichier_pdf, statut, date_generation, genere_par)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        data.usager_id, data.template_id, data.titre,
        JSON.stringify(data.contenu_genere || {}),
        data.fichier_pdf || null, data.statut || "brouillon",
        data.date_generation || null, data.genere_par || null,
      ]
    );
    return result.rows ? result.rows[0] : result;
  },

  async update(id, data) {
    const fields = [];
    const params = [];
    let idx = 1;
    for (const key of ["titre", "contenu_genere", "fichier_pdf", "statut", "date_generation", "genere_par"]) {
      if (data[key] !== undefined) {
        fields.push(`"${key}" = $${idx}`);
        params.push(key === "contenu_genere" ? JSON.stringify(data[key]) : data[key]);
        idx++;
      }
    }
    fields.push(`"updated_at" = NOW()`);
    params.push(id);
    return db.run(`UPDATE ${TABLE_ATTESTATIONS} SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`, params);
  },

  async remove(id) {
    return db.run(`DELETE FROM ${TABLE_ATTESTATIONS} WHERE id = $1`, [id]);
  },
};

module.exports = attestationRepository;
