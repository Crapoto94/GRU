const { db, pool, SCHEMA_NAME } = require("../../config/pg_db");

const DOSSIERS = `"${SCHEMA_NAME}".dossiers_pieces_identite`;
const PIECES = `"${SCHEMA_NAME}".dossier_pieces`;
const SUIVI = `"${SCHEMA_NAME}".dossier_suivi`;
const NOTIFS = `"${SCHEMA_NAME}".dossier_notifications`;
const USAGERS = `"${SCHEMA_NAME}".usagers`;
const ETAPES = `"${SCHEMA_NAME}".dossier_piece_etapes`;

const PIECE_SELECT = `
  SELECT p.*, u.nom as usager_nom, u.prenom as usager_prenom, u.civilite as usager_civilite,
    d.nom as destinataire_nom, d.prenom as destinataire_prenom,
    d.email as destinataire_email, d.mobile as destinataire_mobile, d.telephone as destinataire_telephone
  FROM ${PIECES} p
  JOIN ${USAGERS} u ON p.usager_id = u.id
  LEFT JOIN ${USAGERS} d ON p.destinataire_usager_id = d.id
`;

const dossierRepository = {
  async createDossier(createdBy) {
    const result = await db.run(
      `INSERT INTO ${DOSSIERS} (created_by) VALUES ($1) RETURNING *`,
      [createdBy]
    );
    return result.rows[0];
  },

  async createDossierWithPieces(createdBy, pieces, suiviTexte) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const dossierResult = await client.query(
        `INSERT INTO ${DOSSIERS} (created_by) VALUES ($1) RETURNING *`,
        [createdBy]
      );
      const dossier = dossierResult.rows[0];
      for (const p of pieces) {
        await client.query(
          `INSERT INTO ${PIECES} (dossier_id, usager_id, type_piece, date_demande, destinataire_usager_id, canal_notification)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            dossier.id,
            p.usager_id,
            p.type_piece,
            p.date_demande,
            p.destinataire_usager_id || p.usager_id,
            p.canal_notification || "email",
          ]
        );
      }
      await client.query(
        `INSERT INTO ${SUIVI} (dossier_id, agent, commentaire, automatique) VALUES ($1,$2,$3,TRUE)`,
        [dossier.id, createdBy, suiviTexte]
      );
      await client.query("COMMIT");
      return dossier.id;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },

  async findDossierById(id) {
    return db.get(`SELECT * FROM ${DOSSIERS} WHERE id = $1`, [id]);
  },

  async removeDossier(id) {
    return db.run(`DELETE FROM ${DOSSIERS} WHERE id = $1`, [id]);
  },

  async addPiece(dossierId, { usager_id, type_piece, date_demande, destinataire_usager_id, canal_notification }) {
    const result = await db.run(
      `INSERT INTO ${PIECES} (dossier_id, usager_id, type_piece, date_demande, destinataire_usager_id, canal_notification)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [dossierId, usager_id, type_piece, date_demande, destinataire_usager_id || usager_id, canal_notification || "email"]
    );
    return result.rows[0];
  },

  async findPiecesByDossier(dossierId) {
    return db.all(`${PIECE_SELECT} WHERE p.dossier_id = $1 ORDER BY p.created_at`, [dossierId]);
  },

  async findEtapesByDossier(dossierId) {
    return db.all(
      `SELECT e.* FROM ${ETAPES} e
       JOIN ${PIECES} p ON p.id = e.dossier_piece_id
       WHERE p.dossier_id = $1
       ORDER BY e.dossier_piece_id, e.ordre`,
      [dossierId]
    );
  },

  async findPieceById(id) {
    return db.get(`${PIECE_SELECT} WHERE p.id = $1`, [id]);
  },

  async updatePieceStatut(id, statut) {
    const extra =
      statut === "arrive" ? `, date_arrivee = NOW()` : statut === "recupere" ? `, date_recuperation = NOW()` : "";
    await db.run(`UPDATE ${PIECES} SET statut = $1, updated_at = NOW() ${extra} WHERE id = $2`, [statut, id]);
    return this.findPieceById(id);
  },

  async updatePiece(id, data) {
    const allowed = ["date_demande", "destinataire_usager_id", "canal_notification"];
    const fields = [];
    const params = [];
    let idx = 1;
    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`"${key}" = $${idx}`);
        params.push(data[key]);
        idx++;
      }
    }
    if (fields.length === 0) return this.findPieceById(id);
    fields.push(`"updated_at" = NOW()`);
    params.push(id);
    await db.run(`UPDATE ${PIECES} SET ${fields.join(", ")} WHERE id = $${idx}`, params);
    return this.findPieceById(id);
  },

  async markPieceNotified(id) {
    await db.run(`UPDATE ${PIECES} SET notifie = TRUE, date_notification = NOW() WHERE id = $1`, [id]);
    return this.findPieceById(id);
  },

  async removePiece(id) {
    return db.run(`DELETE FROM ${PIECES} WHERE id = $1`, [id]);
  },

  async countPiecesByDossier(dossierId) {
    return db.get(`SELECT COUNT(*) as total FROM ${PIECES} WHERE dossier_id = $1`, [dossierId]);
  },

  async addSuivi(dossierId, agent, commentaire, automatique = false) {
    const result = await db.run(
      `INSERT INTO ${SUIVI} (dossier_id, agent, commentaire, automatique) VALUES ($1,$2,$3,$4) RETURNING *`,
      [dossierId, agent, commentaire, automatique]
    );
    return result.rows[0];
  },

  async findSuiviByDossier(dossierId) {
    return db.all(`SELECT * FROM ${SUIVI} WHERE dossier_id = $1 ORDER BY created_at DESC`, [dossierId]);
  },

  async addNotification(dossierPieceId, { canal, destinataire, statut, erreur, envoye_par }) {
    const result = await db.run(
      `INSERT INTO ${NOTIFS} (dossier_piece_id, canal, destinataire, statut, erreur, envoye_par)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [dossierPieceId, canal, destinataire, statut, erreur || null, envoye_par]
    );
    return result.rows[0];
  },

  async findNotificationsByPiece(pieceId) {
    return db.all(`SELECT * FROM ${NOTIFS} WHERE dossier_piece_id = $1 ORDER BY created_at DESC`, [pieceId]);
  },

  async findDossiersList({
    statut, type_piece, search, nom, prenom, telephone, adresse, code_postal, ville,
    only_pending, sort, order, limit = 50, offset = 0,
  } = {}) {
    const params = [];
    let matchWhere = "WHERE 1=1";
    if (statut) {
      params.push(statut);
      matchWhere += ` AND p.statut = $${params.length}`;
    } else if (only_pending) {
      matchWhere += ` AND p.statut NOT IN ('recupere','refuse')`;
    }
    if (type_piece) {
      params.push(type_piece);
      matchWhere += ` AND p.type_piece = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`, `%${search}%`);
      matchWhere += ` AND (u.nom ILIKE $${params.length - 1} OR u.prenom ILIKE $${params.length})`;
    }
    if (nom) {
      params.push(`%${nom}%`);
      matchWhere += ` AND u.nom ILIKE $${params.length}`;
    }
    if (prenom) {
      params.push(`%${prenom}%`);
      matchWhere += ` AND u.prenom ILIKE $${params.length}`;
    }
    if (telephone) {
      params.push(`%${telephone}%`);
      matchWhere += ` AND (u.telephone ILIKE $${params.length} OR u.mobile ILIKE $${params.length})`;
    }
    if (adresse) {
      params.push(`%${adresse}%`);
      matchWhere += ` AND (u.adresse ILIKE $${params.length} OR u.complement_adresse ILIKE $${params.length})`;
    }
    if (code_postal) {
      params.push(`${code_postal}%`);
      matchWhere += ` AND u.code_postal ILIKE $${params.length}`;
    }
    if (ville) {
      params.push(`%${ville}%`);
      matchWhere += ` AND u.ville ILIKE $${params.length}`;
    }

    // Une demande met en jeu jusqu'a 2 personnes par piece : le beneficiaire
    // (p.usager_id, a qui la piece est destinee) et le destinataire
    // (p.destinataire_usager_id, qui depose/recupere si different). La
    // recherche et la liste des "usagers" du dossier doivent couvrir les deux
    // roles, pas seulement le beneficiaire.
    const matchingCte = `
      matching_dossiers AS (
        SELECT p.dossier_id
        FROM ${PIECES} p
        JOIN ${USAGERS} u ON u.id = p.usager_id
        ${matchWhere}
        UNION
        SELECT p.dossier_id
        FROM ${PIECES} p
        JOIN ${USAGERS} u ON u.id = p.destinataire_usager_id
        ${matchWhere}
      )
    `;

    const SORT_COLUMNS = {
      usagers: "MIN(u.nom)",
      personnes: "nb_usagers",
      pieces: "nb_pieces",
      statuts: "nb_arrive",
      date_demande: "date_demande",
      attente: "date_demande_attente",
    };
    const sortColumn = SORT_COLUMNS[sort] || SORT_COLUMNS.date_demande;
    const sortDir = order === "asc" ? "ASC" : "DESC";
    const nullsClause = sort === "attente" ? "NULLS LAST" : "";

    const query = `
      WITH ${matchingCte}
      SELECT d.id as dossier_id, d.created_at, d.updated_at, d.created_by,
        (
          SELECT COUNT(DISTINCT x) FROM (
            SELECT p2.usager_id x FROM ${PIECES} p2 WHERE p2.dossier_id = d.id
            UNION
            SELECT p2.destinataire_usager_id x FROM ${PIECES} p2 WHERE p2.dossier_id = d.id AND p2.destinataire_usager_id IS NOT NULL
          ) t
        )::int as nb_usagers,
        COUNT(p.id)::int as nb_pieces,
        (
          SELECT jsonb_agg(DISTINCT jsonb_build_object('id', uu.id, 'nom', uu.nom, 'prenom', uu.prenom))
          FROM ${USAGERS} uu
          WHERE uu.id IN (
            SELECT p2.usager_id FROM ${PIECES} p2 WHERE p2.dossier_id = d.id
            UNION
            SELECT p2.destinataire_usager_id FROM ${PIECES} p2 WHERE p2.dossier_id = d.id AND p2.destinataire_usager_id IS NOT NULL
          )
        ) as usagers,
        COUNT(*) FILTER (WHERE p.statut = 'demande')::int as nb_demande,
        COUNT(*) FILTER (WHERE p.statut = 'ajourne')::int as nb_ajourne,
        COUNT(*) FILTER (WHERE p.statut = 'arrive')::int as nb_arrive,
        COUNT(*) FILTER (WHERE p.statut = 'recupere')::int as nb_recupere,
        COUNT(*) FILTER (WHERE p.statut = 'refuse')::int as nb_refuse,
        MIN(p.date_demande) as date_demande,
        MIN(p.date_demande) FILTER (WHERE p.statut IN ('demande','ajourne')) as date_demande_attente
      FROM matching_dossiers md
      JOIN ${DOSSIERS} d ON d.id = md.dossier_id
      JOIN ${PIECES} p ON p.dossier_id = d.id
      JOIN ${USAGERS} u ON p.usager_id = u.id
      GROUP BY d.id, d.created_at, d.updated_at, d.created_by
      ORDER BY ${sortColumn} ${sortDir} ${nullsClause}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const rows = await db.all(query, [...params, limit, offset]);

    const countQuery = `WITH ${matchingCte} SELECT COUNT(*) as total FROM matching_dossiers`;
    const countResult = await db.get(countQuery, params);

    return { rows, total: parseInt(countResult.total, 10) };
  },
};

module.exports = dossierRepository;
