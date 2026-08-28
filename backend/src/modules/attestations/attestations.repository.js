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
      `INSERT INTO ${TABLE_TEMPLATES} (nom, description, fichier_original, variables, nb_usagers, usager_labels, usage_logement_principal, usage_logement_secondaire)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        data.nom, data.description || null, data.fichier_original, JSON.stringify(data.variables || []), data.nb_usagers || 1,
        data.usager_labels ? JSON.stringify(data.usager_labels) : null,
        !!data.usage_logement_principal, !!data.usage_logement_secondaire,
      ]
    );
    return result.rows ? result.rows[0] : result;
  },

  async updateTemplate(id, data) {
    const fields = [];
    const params = [];
    let idx = 1;
    for (const key of ["nom", "description", "fichier_original", "variables", "actif", "nb_usagers", "usager_labels", "usage_logement_principal", "usage_logement_secondaire"]) {
      if (data[key] !== undefined) {
        fields.push(`"${key}" = $${idx}`);
        params.push((key === "variables" || key === "usager_labels") ? JSON.stringify(data[key]) : data[key]);
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

  async findAll({ statut, usager_id, search, limit = 50, offset = 0 } = {}) {
    const FROM = `
      FROM ${TABLE_ATTESTATIONS} a
      LEFT JOIN "${SCHEMA_NAME}".usagers u ON a.usager_id = u.id
      LEFT JOIN "${SCHEMA_NAME}".usagers u2 ON a.usager2_id = u2.id
      LEFT JOIN "${SCHEMA_NAME}".usagers u3 ON a.usager3_id = u3.id
      LEFT JOIN ${TABLE_TEMPLATES} t ON a.template_id = t.id`;
    const searchClause = (p) => `(
      coalesce(u.nom,'') ILIKE $${p} OR coalesce(u.prenom,'') ILIKE $${p}
      OR coalesce(u.telephone,'') ILIKE $${p} OR coalesce(u.mobile,'') ILIKE $${p} OR coalesce(u.email,'') ILIKE $${p}
      OR coalesce(u2.nom,'') ILIKE $${p} OR coalesce(u2.prenom,'') ILIKE $${p}
      OR coalesce(u3.nom,'') ILIKE $${p} OR coalesce(u3.prenom,'') ILIKE $${p}
      OR coalesce(a.titre,'') ILIKE $${p}
    )`;
    const whereParts = ["1=1", "a.statut <> 'import_alto'"];
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      whereParts.push(searchClause(params.length));
    }
    if (statut) {
      params.push(statut);
      whereParts.push(`a.statut = $${params.length}`);
    }
    if (usager_id) {
      params.push(usager_id);
      whereParts.push(`(a.usager_id = $${params.length} OR a.usager2_id = $${params.length} OR a.usager3_id = $${params.length})`);
    }
    const where = `WHERE ${whereParts.join(" AND ")}`;
    const rows = await db.all(
      `SELECT a.*, u.nom as usager_nom, u.prenom as usager_prenom, u2.nom as usager2_nom, u2.prenom as usager2_prenom, u3.nom as usager3_nom, u3.prenom as usager3_prenom, t.nom as template_nom
      ${FROM}
      ${where}
      ORDER BY COALESCE(a.date_generation, a.created_at) DESC NULLS LAST, a.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    const countResult = await db.get(
      `SELECT COUNT(*) as total ${FROM} ${where}`,
      params
    );
    return { rows, total: parseInt(countResult.total, 10) };
  },

  async findAttestationById(id) {
    return db.get(
      `SELECT a.*, u.nom as usager_nom, u.prenom as usager_prenom, u2.nom as usager2_nom, u2.prenom as usager2_prenom, u3.nom as usager3_nom, u3.prenom as usager3_prenom, t.nom as template_nom
       FROM ${TABLE_ATTESTATIONS} a
       LEFT JOIN "${SCHEMA_NAME}".usagers u ON a.usager_id = u.id
       LEFT JOIN "${SCHEMA_NAME}".usagers u2 ON a.usager2_id = u2.id
       LEFT JOIN "${SCHEMA_NAME}".usagers u3 ON a.usager3_id = u3.id
       LEFT JOIN ${TABLE_TEMPLATES} t ON a.template_id = t.id
       WHERE a.id = $1`,
      [id]
    );
  },

  async create(data) {
    const result = await db.run(
      `INSERT INTO ${TABLE_ATTESTATIONS} (usager_id, usager2_id, usager3_id, template_id, titre, contenu_genere, fichier_pdf, statut, date_generation, genere_par)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        data.usager_id, data.usager2_id || null, data.usager3_id || null, data.template_id, data.titre,
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

  async findDatesByUsagerAndTemplate(usagerId, templateId) {
    return db.all(
      `SELECT date_generation FROM ${TABLE_ATTESTATIONS}
       WHERE template_id = $1 AND usager_id = $2
       ORDER BY date_generation ASC`,
      [templateId, usagerId]
    );
  },

  async findDatesByUsagerPairAndTemplate(usagerId, usager2Id, templateId) {
    return db.all(
      `SELECT date_generation FROM ${TABLE_ATTESTATIONS}
       WHERE template_id = $1
         AND ((usager_id = $2 AND usager2_id = $3) OR (usager_id = $3 AND usager2_id = $2))
       ORDER BY date_generation ASC`,
      [templateId, usagerId, usager2Id]
    );
  },

  async findAllAda({ search, limite = 100, offset = 0 } = {}) {
    const TABLE_ADA = `"${SCHEMA_NAME}".attestations_ada`;
    const whereParts = [];
    const params = [];
    const searchClause = (p) => `(
      legacy_id_demande::text ILIKE $${p}
      OR coalesce(hg.nom,'') ILIKE $${p}
      OR coalesce(hg.prenom,'') ILIKE $${p}
      OR coalesce(hb.nom,'') ILIKE $${p}
      OR coalesce(hb.prenom,'') ILIKE $${p}
      OR coalesce(a.no_cerfa,'') ILIKE $${p}
      OR coalesce(a.no_piece,'') ILIKE $${p}
    )`;
    if (search) {
      params.push(`%${search}%`);
      whereParts.push(searchClause(params.length));
    }
    const where = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";
    const query = `SELECT a.legacy_id_demande, a.no_cerfa, a.no_piece, a.date_deb_valid, a.date_fin_valid,
        a.hebergeant_legacy_id, a.heberge_legacy_id, a.hebergeant_usager_id, a.heberge_usager_id,
        a.hebergeant_assure, a.lien_parente_code, lrv.label AS lien_parente_label, a.ressource_montant, a.created_at,
        hg.nom AS hebergeant_nom, hg.prenom AS hebergeant_prenom,
        hb.nom AS heberge_nom, hb.prenom AS heberge_prenom,
        att.id AS attestation_id, att.titre AS attestation_titre
      FROM ${TABLE_ADA} a
      LEFT JOIN "${SCHEMA_NAME}".usagers hg ON a.hebergeant_usager_id = hg.id
      LEFT JOIN "${SCHEMA_NAME}".usagers hb ON a.heberge_usager_id = hb.id
      LEFT JOIN "${SCHEMA_NAME}".listes_reference lr ON lr.cle = 'lien_parente'
      LEFT JOIN "${SCHEMA_NAME}".listes_reference_valeurs lrv ON lrv.liste_id = lr.id AND lrv.code = a.lien_parente_code::text
      LEFT JOIN ${TABLE_ATTESTATIONS} att
        ON att.statut = 'import_alto'
       AND att.contenu_genere->>'Numéro demande legacy' = a.legacy_id_demande::text
      ${where}
      ORDER BY a.date_deb_valid DESC NULLS LAST, a.legacy_id_demande DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limite, offset);
    const rows = await db.all(query, params);
    const countParams = [];
    if (search) countParams.push(`%${search}%`);
    const countQuery = `SELECT COUNT(*) AS total FROM ${TABLE_ADA} a
      LEFT JOIN "${SCHEMA_NAME}".usagers hg ON a.hebergeant_usager_id = hg.id
      LEFT JOIN "${SCHEMA_NAME}".usagers hb ON a.heberge_usager_id = hb.id
      ${search ? `WHERE ${searchClause(1)}` : ""}`;
    const countResult = await db.get(countQuery, search ? [...countParams] : []);
    return { rows, total: parseInt(countResult.total, 10) };
  },

  async findAdaByLegacyId(legacyId) {
    return db.get(
      `SELECT a.*,
        lr2.label AS lien_parente_label,
        hg.nom AS hebergeant_nom, hg.prenom AS hebergeant_prenom, hg.civilite AS hebergeant_civilite,
        hb.nom AS heberge_nom, hb.prenom AS heberge_prenom, hb.civilite AS heberge_civilite,
        att.id AS attestation_id, att.titre AS attestation_titre
       FROM "${SCHEMA_NAME}".attestations_ada a
       LEFT JOIN "${SCHEMA_NAME}".listes_reference lr2 ON lr2.cle = 'lien_parente'
       LEFT JOIN "${SCHEMA_NAME}".listes_reference_valeurs lrv2 ON lrv2.liste_id = lr2.id AND lrv2.code = a.lien_parente_code::text
       LEFT JOIN "${SCHEMA_NAME}".usagers hg ON a.hebergeant_usager_id = hg.id
       LEFT JOIN "${SCHEMA_NAME}".usagers hb ON a.heberge_usager_id = hb.id
       LEFT JOIN ${TABLE_ATTESTATIONS} att
         ON att.statut = 'import_alto'
        AND att.contenu_genere->>'Numéro demande legacy' = a.legacy_id_demande::text
       WHERE a.legacy_id_demande = $1`,
      [legacyId]
    );
  },
};

module.exports = attestationRepository;
