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

  async findAll({
    archived = false, search = "", date_naissance, nom, prenom, telephone, adresse, code_postal, ville,
    limit = 50, offset = 0,
  } = {}) {
    const ATTESTATIONS = `"${SCHEMA_NAME}".attestations`;
    const TEMPLATES = `"${SCHEMA_NAME}".templates`;
    const PIECES = `"${SCHEMA_NAME}".dossier_pieces`;
    const LOGEMENTS = `"${SCHEMA_NAME}".logements`;

    const params = [archived];
    let where = `u.archived = $1`;
    if (search) {
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
      where += ` AND (u.nom ILIKE $${params.length - 4} OR u.prenom ILIKE $${params.length - 3} OR u.email ILIKE $${params.length - 2} OR u.telephone ILIKE $${params.length - 1} OR u.mobile ILIKE $${params.length})`;
    }
    if (date_naissance) {
      params.push(`%${date_naissance}%`);
      where += ` AND to_char(u.date_naissance, 'DD/MM/YYYY') LIKE $${params.length}`;
    }
    if (nom) {
      params.push(`%${nom}%`);
      where += ` AND u.nom ILIKE $${params.length}`;
    }
    if (prenom) {
      params.push(`%${prenom}%`);
      where += ` AND u.prenom ILIKE $${params.length}`;
    }
    if (telephone) {
      params.push(`%${telephone}%`);
      where += ` AND (u.telephone ILIKE $${params.length} OR u.mobile ILIKE $${params.length})`;
    }
    if (adresse) {
      params.push(`%${adresse}%`);
      where += ` AND (u.adresse ILIKE $${params.length} OR u.complement_adresse ILIKE $${params.length})`;
    }
    if (code_postal) {
      params.push(`${code_postal}%`);
      where += ` AND u.code_postal ILIKE $${params.length}`;
    }
    if (ville) {
      params.push(`%${ville}%`);
      where += ` AND u.ville ILIKE $${params.length}`;
    }

    const rowsQuery = `SELECT u.*, u.adresse as "Adresse",
      (SELECT COUNT(*)::int FROM ${ATTESTATIONS} a JOIN ${TEMPLATES} t ON t.id = a.template_id
       WHERE (a.usager_id = u.id OR a.usager2_id = u.id OR a.usager3_id = u.id)
         AND NOT (t.nom ILIKE '%certificat%' OR t.nom ILIKE '%concubinage%')
      ) as attestation_count,
      (SELECT COUNT(*)::int FROM ${ATTESTATIONS} a JOIN ${TEMPLATES} t ON t.id = a.template_id
       WHERE (a.usager_id = u.id OR a.usager2_id = u.id OR a.usager3_id = u.id)
         AND (t.nom ILIKE '%certificat%' OR t.nom ILIKE '%concubinage%')
      ) as certificat_count,
      (SELECT COUNT(*)::int FROM ${PIECES} p WHERE p.usager_id = u.id) as cni_count,
      EXISTS(SELECT 1 FROM ${LOGEMENTS} l WHERE l.usager_id = u.id AND l.type_logement = 'principal') as has_logement_principal,
      EXISTS(SELECT 1 FROM ${LOGEMENTS} l WHERE l.usager_id = u.id AND l.type_logement = 'secondaire') as has_logement_secondaire
      FROM ${TABLE} u WHERE ${where}
      ORDER BY lower(u.nom) ASC, lower(u.prenom) ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const rows = await db.all(rowsQuery, [...params, limit, offset]);

    const countResult = await db.get(`SELECT COUNT(*) as total FROM ${TABLE} u WHERE ${where}`, params);
    return { rows, total: parseInt(countResult.total, 10) };
  },

  async findPieces(id) {
    return db.all(
      `SELECT p.id, p.dossier_id, p.type_piece, p.statut, p.date_demande, p.date_arrivee,
              p.date_recuperation, d.nom AS destinataire_nom, d.prenom AS destinataire_prenom
       FROM "${SCHEMA_NAME}".dossier_pieces p
       LEFT JOIN ${TABLE} d ON p.destinataire_usager_id = d.id
       WHERE p.usager_id = $1
       ORDER BY p.date_demande DESC, p.created_at DESC`,
      [id]
    );
  },

  async findDemarches(id) {
    const PIECES = `"${SCHEMA_NAME}".dossier_pieces`;
    const ATTESTATIONS = `"${SCHEMA_NAME}".attestations`;
    return db.all(
      `SELECT * FROM (
         SELECT 'cni' AS type, p.id::text AS id, p.type_piece AS libelle, p.statut AS statut,
                p.date_demande::timestamptz AS date_demarche, p.dossier_id::text AS ref
         FROM ${PIECES} p WHERE p.usager_id = $1
         UNION ALL
         SELECT CASE WHEN t.nom ILIKE '%certificat%' OR t.nom ILIKE '%concubinage%' THEN 'certificat' ELSE 'attestation' END,
                a.id::text, a.titre, a.statut,
                COALESCE(a.date_generation, a.created_at), a.id::text
         FROM ${ATTESTATIONS} a
         LEFT JOIN "${SCHEMA_NAME}".templates t ON t.id = a.template_id
         WHERE a.usager_id = $1 OR a.usager2_id = $1 OR a.usager3_id = $1
       ) d ORDER BY date_demarche DESC NULLS LAST`,
      [id]
    );
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
        mail_actif, consentement_rgpd, date_consentement, created_by,
        mention_nom_usage, taille, couleur_yeux, piece_identite_type, piece_identite_numero)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)
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
        data.mention_nom_usage || null, data.taille ? Number(data.taille) : null, data.couleur_yeux || null,
        data.piece_identite_type || null, data.piece_identite_numero || null,
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
      "mail_actif", "consentement_rgpd", "mention_nom_usage", "taille", "couleur_yeux", "piece_identite_type", "piece_identite_numero",
    ];
    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`"${key}" = $${idx}`);
        if (key === "nom" || key === "prenom" || key === "nom_usage") {
        params.push(formatName(data[key]));
      } else {
        params.push(key === "taille" ? (data[key] ? Number(data[key]) : null) : data[key]);
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
