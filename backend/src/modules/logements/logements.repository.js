const { db, SCHEMA_NAME } = require("../../config/pg_db");

const TABLE = `"${SCHEMA_NAME}".logements`;

const logementRepository = {
  async findByUsagerId(usagerId, typeLogement = "principal") {
    return db.get(`SELECT * FROM ${TABLE} WHERE usager_id = $1 AND type_logement = $2`, [usagerId, typeLogement]);
  },

  async findAllByUsagerId(usagerId) {
    return db.all(`SELECT * FROM ${TABLE} WHERE usager_id = $1`, [usagerId]);
  },

  async upsert(usagerId, typeLogement, data) {
    const result = await db.run(
      `INSERT INTO ${TABLE} (
        usager_id, type_logement, adresse, complement_adresse, code_postal, ville, pays,
        numero_batiment_escalier, surface_logement, nombre_pieces,
        etat_sanitaire, occupants_habituels_details, occupants_permanents,
        occupants_temporaires, statut_occupation, statut_occupation_precision
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      ON CONFLICT (usager_id, type_logement) DO UPDATE SET
        adresse = EXCLUDED.adresse,
        complement_adresse = EXCLUDED.complement_adresse,
        code_postal = EXCLUDED.code_postal,
        ville = EXCLUDED.ville,
        pays = EXCLUDED.pays,
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
        typeLogement,
        data.adresse || null,
        data.complement_adresse || null,
        data.code_postal || null,
        data.ville || null,
        data.pays || null,
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

  async remove(usagerId, typeLogement) {
    return db.run(`DELETE FROM ${TABLE} WHERE usager_id = $1 AND type_logement = $2`, [usagerId, typeLogement]);
  },
};

module.exports = logementRepository;
