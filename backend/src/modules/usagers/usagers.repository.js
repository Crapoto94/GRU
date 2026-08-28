const { db, SCHEMA_NAME } = require("../../config/pg_db");

const TABLE = `"${SCHEMA_NAME}".usagers`;

function formatName(name) {
  if (!name) return "";
  // Preserve hyphens and spaces, capitalize each part
  return name
    .split(/\s+/)
    .map((part) =>
      part
        .split("-")
        .map((sub) => sub.charAt(0).toUpperCase() + sub.slice(1).toLowerCase())
        .join("-")
    )
    .join(" ");
}

const CONSENTEMENTS_RGPD = `"${SCHEMA_NAME}".consentements_rgpd`;

const usagerRepository = {
  async logConsentement(usagerId, consentement, ip) {
    return db.run(
      `INSERT INTO ${CONSENTEMENTS_RGPD} (usager_id, type_consentement, consentement, ip_address)
       VALUES ($1, $2, $3, $4)`,
      [usagerId, "traitement_donnees_personnelles", consentement === true, ip || null]
    );
  },

  async findAll({ archived = false, search = "", limit = 50, offset = 0 } = {}) {
    const ATTESTATIONS = `"${SCHEMA_NAME}".attestations`;
    const LOGEMENTS = `"${SCHEMA_NAME}".logements`;
    let query = `SELECT u.*, u.adresse as "Adresse",
      (SELECT COUNT(*)::int FROM ${ATTESTATIONS} a
       WHERE a.usager_id = u.id OR a.usager2_id = u.id OR a.usager3_id = u.id
      ) as attestation_count,
      EXISTS(SELECT 1 FROM ${LOGEMENTS} l WHERE l.usager_id = u.id AND l.type_logement = 'principal') as has_logement_principal,
      EXISTS(SELECT 1 FROM ${LOGEMENTS} l WHERE l.usager_id = u.id AND l.type_logement = 'secondaire') as has_logement_secondaire
      FROM ${TABLE} u WHERE u.archived = $1`;
    const params = [archived];
    if (search) {
      params.push(`%${search}%`);
      params.push(`%${search}%`);
      params.push(`%${search}%`);
      params.push(`%${search}%`);
      params.push(`%${search}%`);
      query += ` AND (u.nom ILIKE $${params.length - 4} OR u.prenom ILIKE $${params.length - 3} OR u.email ILIKE $${params.length - 2} OR u.telephone ILIKE $${params.length - 1} OR u.mobile ILIKE $${params.length})`;
    }
    query += ` ORDER BY lower(u.nom) ASC, lower(u.prenom) ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    const rows = await db.all(query, params);
    const countResult = await db.get(
      `SELECT COUNT(*) as total FROM ${TABLE} WHERE archived = $1`,
      [archived]
    );
    return { rows, total: parseInt(countResult.total, 10) };
  },

  async findById(id) {
    return db.get(`SELECT *, adresse as "Adresse" FROM ${TABLE} WHERE id = $1`, [id]);
  },

  async findByContact(contact) {
    return db.get(
      `SELECT id, nom, prenom, email, telephone, mobile, archived FROM ${TABLE}
       WHERE telephone = $1 OR mobile = $1 OR LOWER(email) = LOWER($1) LIMIT 1`,
      [contact]
    );
  },

  async create(data) {
    const result = await db.run(
      `INSERT INTO ${TABLE} (civilite, nom, prenom, nom_usage, date_naissance, lieu_naissance,
        pays_naissance, nationalite, situation_familiale, email, telephone, mobile,
        Adresse, complement_adresse, code_postal, ville, pays,
        mail_actif, consentement_rgpd, date_consentement, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
       RETURNING *`,
      [
        data.civilite || "M.", formatName(data.nom), formatName(data.prenom), data.nom_usage ? formatName(data.nom_usage) : null,
        data.date_naissance, data.lieu_naissance || null, data.pays_naissance || "France",
        data.nationalite || "Francaise", data.situation_familiale || null,
        data.email || null, data.telephone || null, data.mobile || null,
        data.Adresse || null, data.complement_adresse || null, data.code_postal || null,
        data.ville || null, data.pays || "France",
        data.mail_actif !== false, data.consentement_rgpd === true,
        data.consentement_rgpd ? new Date().toISOString() : null,
        data.created_by || null,
      ]
    );
    return result.rows ? result.rows[0] : result;
  },

  async update(id, data) {
    if (data.Adresse !== undefined && data.adresse === undefined) {
      data.adresse = data.Adresse;
    }
    const fields = [];
    const params = [];
    let idx = 1;
    const allowed = [
      "civilite", "nom", "prenom", "nom_usage", "date_naissance", "lieu_naissance",
      "pays_naissance", "nationalite", "situation_familiale", "email", "telephone", "mobile",
      "adresse", "complement_adresse", "code_postal", "ville", "pays",
      "mail_actif", "consentement_rgpd",
    ];
    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`"${key}" = $${idx}`);
        if (key === "nom" || key === "prenom" || key === "nom_usage") {
        params.push(formatName(data[key]));
      } else {
        params.push(data[key]);
      }
        idx++;
      }
    }
    if (data.consentement_rgpd === true) {
      fields.push(`"date_consentement" = NOW()`);
    }
    fields.push(`"updated_at" = NOW()`);
    params.push(id);
    const result = await db.run(
      `UPDATE ${TABLE} SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
      params
    );
    return result.rows ? result.rows[0] : result;
  },

  async archive(id, motif) {
    const result = await db.run(
      `UPDATE ${TABLE} SET archived = true, date_archivage = NOW(), motif_archivage = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [motif || null, id]
    );
    return result.rows ? result.rows[0] : result;
  },

  async restore(id) {
    const result = await db.run(
      `UPDATE ${TABLE} SET archived = false, date_archivage = NULL, motif_archivage = NULL, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [null, id]
    );
    return result.rows ? result.rows[0] : result;
  },

  async remove(id) {
    return db.run(`DELETE FROM ${TABLE} WHERE id = $1`, [id]);
  },

  async count() {
    const result = await db.get(`SELECT COUNT(*) as total FROM ${TABLE} WHERE archived = false`);
    return parseInt(result.total, 10);
  },

  async checkDoublons({ nom, date_naissance, telephone, exclude_id }) {
    const results = { nom_date: [], telephone: [] };
    if (nom && date_naissance) {
      let q = `SELECT id, civilite, nom, prenom, date_naissance, email, telephone, ville FROM ${TABLE} WHERE archived = false AND LOWER(nom) = LOWER($1) AND date_naissance = $2`;
      const params = [nom.trim(), date_naissance];
      if (exclude_id) { q += ` AND id != $${params.length + 1}`; params.push(exclude_id); }
      results.nom_date = await db.all(q, params);
    }
    if (telephone) {
      let q = `SELECT id, civilite, nom, prenom, date_naissance, email, telephone, ville FROM ${TABLE} WHERE archived = false AND (telephone = $1 OR mobile = $1)`;
      const params = [telephone.trim()];
      if (exclude_id) { q += ` AND id != $${params.length + 1}`; params.push(exclude_id); }
      results.telephone = await db.all(q, params);
    }
    return results;
  },
};

module.exports = usagerRepository;
