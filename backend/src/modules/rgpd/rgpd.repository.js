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

  async findUsagersToArchive() {
    // Get the conservation rule for usager data (infos_usager)
    const rule = await db.get(
      `SELECT conservation_mois FROM ${TABLE} WHERE cle = 'infos_usager' AND actif`
    );
    const retentionMonths = rule?.conservation_mois ?? 60;

    // Find usagers whose latest event across all tables is older than retention period
    // and who are not already archived
    return db.all(
      `WITH latest_events AS (
        SELECT u.id, u.nom, u.prenom, u.email, u.telephone, u.mobile, u.ville,
               GREATEST(
                 COALESCE((
                   SELECT MAX(a.date_generation)
                   FROM "${SCHEMA_NAME}".attestations a
                   WHERE a.usager_id = u.id
                      OR a.usager2_id = u.id
                      OR a.usager3_id = u.id
                 ), '1970-01-01'::timestamptz),
                 COALESCE((
                   SELECT MAX(dp.date_demande)::timestamptz
                   FROM "${SCHEMA_NAME}".dossier_pieces dp
                   WHERE dp.usager_id = u.id
                 ), '1970-01-01'::timestamptz),
                 COALESCE((
                   SELECT MAX(uh.date_enreg)::timestamptz
                   FROM "${SCHEMA_NAME}".usagers_historique uh
                   WHERE uh.usager_id = u.id
                 ), '1970-01-01'::timestamptz),
                 COALESCE(u.updated_at, '1970-01-01'::timestamptz)
               ) AS dernier_evenement
        FROM "${SCHEMA_NAME}".usagers u
        WHERE u.archived = FALSE
      )
      SELECT id, nom, prenom, email, telephone, mobile, ville,
             dernier_evenement,
             EXTRACT(EPOCH FROM (NOW() - dernier_evenement)) / 86400 AS jours_ecoules,
             ${retentionMonths} AS duree_conservation_mois
      FROM latest_events
      WHERE dernier_evenement < NOW() - INTERVAL '${retentionMonths} months'
      ORDER BY dernier_evenement ASC`
    );
  },

  async archiveUsagers(usagerIds, user, motif) {
    if (!usagerIds.length) return { count: 0 };
    const placeholders = usagerIds.map((_, i) => `$${i + 1}`).join(",");
    const params = [...usagerIds, user, motif, new Date().toISOString()];
    const result = await db.run(
      `UPDATE "${SCHEMA_NAME}".usagers
       SET archived = TRUE,
           date_archivage = $${params.length},
           motif_archivage = $${params.length - 1},
           updated_at = NOW()
       WHERE id IN (${placeholders})
         AND archived = FALSE`,
      params
    );
    return { count: result.changes };
  },
};

module.exports = rgpdRepository;