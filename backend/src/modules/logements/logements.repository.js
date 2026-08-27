const { db, SCHEMA_NAME } = require("../../config/pg_db");

const TABLE = `"${SCHEMA_NAME}".logements`;

const logementRepository = {
  async findByUsagerId(usagerId) {
    return db.get(`SELECT * FROM ${TABLE} WHERE usager_id = $1`, [usagerId]);
  },

  async upsert(usagerId, data) {
    const result = await db.run(
      `INSERT INTO ${TABLE} (
        usager_id, numero_batiment_escalier, surface_logement, nombre_pieces,
        etat_sanitaire, occupants_habituels_details, occupants_permanents,
        occupants_temporaires, statut_occupation, statut_occupation_precision
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (usager_id) DO UPDATE SET
        numero_batiment_escalier = EXCLUDED.numero_batiment_escalier,
        surface_logement = EXCLUDED.surface_logement,
        nombre_pieces = EXCLUDED.nombre_pieces,
        etat_sanitaire = EXCLUDED.etat_sanitaire,
        occupants_habituels_details = EXCLUDED.occupants_habituels_details,
        occupants_permanents = EXCLUDED.occupants_permanents,
        occupants_temporaires = EXCLUDED.occupants_temporaires,
        statut_occupation = EXCLUDED.statut_occupation,
        statut_occupation_precision = EXCLUDED.statut_occupation_precision,
        updated_at = NOW()
      RETURNING *`,
      [
        usagerId,
        data.numero_batiment_escalier || null,
        data.surface_logement || null,
        data.nombre_pieces || null,
        data.etat_sanitaire || null,
        data.occupants_habituels_details || null,
        data.occupants_permanents !== undefined && data.occupants_permanents !== "" ? data.occupants_permanents : null,
        data.occupants_temporaires !== undefined && data.occupants_temporaires !== "" ? data.occupants_temporaires : null,
        data.statut_occupation || null,
        data.statut_occupation_precision || null,
      ]
    );
    return result.rows[0];
  },

  async remove(usagerId) {
    return db.run(`DELETE FROM ${TABLE} WHERE usager_id = $1`, [usagerId]);
  },
};

module.exports = logementRepository;
