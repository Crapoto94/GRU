const { db, pool, SCHEMA_NAME } = require("../../config/pg_db");

const DOSSIERS = `"${SCHEMA_NAME}".dossiers_pieces_identite`;
const PIECES = `"${SCHEMA_NAME}".dossier_pieces`;
const SUIVI = `"${SCHEMA_NAME}".dossier_suivi`;
const NOTIFS = `"${SCHEMA_NAME}".dossier_notifications`;
const USAGERS = `"${SCHEMA_NAME}".usagers`;

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

  async findPiecesList({ statut, type_piece, search, limit = 50, offset = 0 } = {}) {
    let query = `${PIECE_SELECT} WHERE 1=1`;
    const params = [];
    if (statut) {
      params.push(statut);
      query += ` AND p.statut = $${params.length}`;
    }
    if (type_piece) {
      params.push(type_piece);
      query += ` AND p.type_piece = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`, `%${search}%`);
      query += ` AND (u.nom ILIKE $${params.length - 1} OR u.prenom ILIKE $${params.length})`;
    }
    query += ` ORDER BY p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    const rows = await db.all(query, params);

    let countQuery = `SELECT COUNT(*) as total FROM ${PIECES} p JOIN ${USAGERS} u ON p.usager_id = u.id WHERE 1=1`;
    const countParams = [];
    if (statut) {
      countParams.push(statut);
      countQuery += ` AND p.statut = $${countParams.length}`;
    }
    if (type_piece) {
      countParams.push(type_piece);
      countQuery += ` AND p.type_piece = $${countParams.length}`;
    }
    if (search) {
      countParams.push(`%${search}%`, `%${search}%`);
      countQuery += ` AND (u.nom ILIKE $${countParams.length - 1} OR u.prenom ILIKE $${countParams.length})`;
    }
    const countResult = await db.get(countQuery, countParams);

    return { rows, total: parseInt(countResult.total, 10) };
  },
};

module.exports = dossierRepository;
