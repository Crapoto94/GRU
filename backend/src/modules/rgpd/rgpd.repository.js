const { db, SCHEMA_NAME } = require("../../config/pg_db");

const TABLE = `"${SCHEMA_NAME}".rgpd_conservation`;

const rgpdRepository = {
  async findAll() {
    return db.all(
      `SELECT r.cle, r.libelle, r.categorie, r.conservation_mois, r.description, r.actif, r.updated_at
       FROM ${TABLE} r
       WHERE r.categorie <> 'attestations'
          OR EXISTS (
            SELECT 1 FROM "${SCHEMA_NAME}".templates t
            WHERE 'attestation_' || t.id = r.cle AND t.actif
          )
       ORDER BY r.categorie ASC, r.libelle ASC, r.actif DESC`
    );
  },

  async cleanupStaleAttestations() {
    await db.run(
      `DELETE FROM ${TABLE}
       WHERE categorie = 'attestations'
         AND NOT EXISTS (
           SELECT 1 FROM "${SCHEMA_NAME}".templates t
           WHERE 'attestation_' || t.id = cle AND t.actif
         )`
    );
  },

  async findByCle(cle) {
    return db.get(
      `SELECT cle, libelle, categorie, conservation_mois, description, actif, updated_at
       FROM ${TABLE}
       WHERE cle = $1`,
      [cle]
    );
  },

  async findTemplateConservationDefaults() {
    return db.all(
      `SELECT 'attestation_' || id AS cle, nom AS libelle, description
       FROM "${SCHEMA_NAME}".templates
       WHERE actif
       ORDER BY nom`
    );
  },

  async create({ cle, libelle, categorie, conservation_mois, description }) {
    const result = await db.run(
      `INSERT INTO ${TABLE} (cle, libelle, categorie, conservation_mois, description, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING cle, libelle, categorie, conservation_mois, description, actif, updated_at`,
      [cle, libelle, categorie, conservation_mois, description]
    );
    return result.rows[0] || null;
  },

  async update(cle, { libelle, categorie, conservation_mois, description, actif }) {
    const row = await db.run(
      `UPDATE ${TABLE}
       SET libelle = COALESCE($2, libelle),
           categorie = COALESCE($3, categorie),
           conservation_mois = COALESCE($4, conservation_mois),
           description = COALESCE($5, description),
           actif = COALESCE($6, actif),
           updated_at = NOW()
       WHERE cle = $1
       RETURNING cle, libelle, categorie, conservation_mois, description, actif, updated_at`,
      [cle, libelle, categorie, conservation_mois, description, actif]
    );
    return row.rows[0] || null;
  },

  async remove(cle) {
    await db.run(`DELETE FROM ${TABLE} WHERE cle = $1`, [cle]);
  },
};

module.exports = rgpdRepository;