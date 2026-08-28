const dossierRepository = require("./dossiers.repository");
const usagerRepository = require("../usagers/usagers.repository");
const { sendSms, sendMail } = require("../../utils/apiVille");
const { logAcces } = require("../../utils/logger");
const { typePieceLabel, renderTemplate, getDossierMessageTemplates } = require("../../utils/messageTemplates");

const TYPES_PIECE = ["CNI", "Passeport"];
const STATUTS = ["demande", "ajourne", "arrive", "recupere", "refuse"];
const STATUT_LABELS = { demande: "Demandé", ajourne: "Ajourné", arrive: "Arrivé", recupere: "Récupéré", refuse: "Refusé" };
const CANAUX = ["sms", "email", "both"];

const dossierService = {
  async list(params) {
    return dossierRepository.findDossiersList(params);
  },

  async getById(id) {
    const dossier = await dossierRepository.findDossierById(id);
    if (!dossier) throw Object.assign(new Error("Dossier non trouve"), { status: 404 });
    const pieces = await dossierRepository.findPiecesByDossier(id);
    const suivi = await dossierRepository.findSuiviByDossier(id);
    return { ...dossier, pieces, suivi };
  },

  async create(data, user, ip) {
    const lignes = Array.isArray(data.lignes) ? data.lignes : [];
    if (lignes.length === 0) {
      throw Object.assign(new Error("Au moins un usager et une piece sont requis"), { status: 400 });
    }
    for (const ligne of lignes) {
      if (!ligne.usager_id) {
        throw Object.assign(new Error("usager_id est requis pour chaque ligne"), { status: 400 });
      }
      const types = Array.isArray(ligne.types) ? ligne.types : [];
      if (types.length === 0 || types.some((t) => !TYPES_PIECE.includes(t))) {
        throw Object.assign(new Error("types doit contenir CNI et/ou Passeport"), { status: 400 });
      }
      if (!ligne.date_demande) {
        throw Object.assign(new Error("date_demande est requise pour chaque ligne"), { status: 400 });
      }
      if (ligne.canal_notification && !CANAUX.includes(ligne.canal_notification)) {
        throw Object.assign(new Error("canal_notification invalide"), { status: 400 });
      }
      const usager = await usagerRepository.findById(ligne.usager_id);
      if (!usager) throw Object.assign(new Error("Usager non trouve"), { status: 404 });
    }

    const pieces = [];
    const usagerIds = new Set();
    for (const ligne of lignes) {
      usagerIds.add(ligne.usager_id);
      for (const type_piece of ligne.types) {
        pieces.push({
          usager_id: ligne.usager_id,
          type_piece,
          date_demande: ligne.date_demande,
          destinataire_usager_id: ligne.destinataire_usager_id || ligne.usager_id,
          canal_notification: ligne.canal_notification || "email",
        });
      }
    }
    const suiviTexte = `Dossier cree avec ${pieces.length} piece(s) pour ${usagerIds.size} usager(s).`;
    const dossierId = await dossierRepository.createDossierWithPieces(user, pieces, suiviTexte);
    await logAcces(user, "CREATE", "dossiers_pieces_identite", dossierId, { nbPieces: pieces.length }, ip);

    return this.getById(dossierId);
  },

  async remove(id, user, ip) {
    await this.getById(id);
    await dossierRepository.removeDossier(id);
    await logAcces(user, "DELETE", "dossiers_pieces_identite", id, {}, ip);
  },

  async updateStatut(pieceId, statut, commentaire, user, ip) {
    if (!STATUTS.includes(statut)) {
      throw Object.assign(new Error("Statut invalide"), { status: 400 });
    }
    const piece = await dossierRepository.findPieceById(pieceId);
    if (!piece) throw Object.assign(new Error("Piece non trouvee"), { status: 404 });

    const ancien = piece.statut;
    const updated = await dossierRepository.updatePieceStatut(pieceId, statut);

    let texte = `${piece.type_piece} de ${piece.usager_prenom} ${piece.usager_nom} : ${STATUT_LABELS[ancien]} -> ${STATUT_LABELS[statut]}`;
    if (commentaire) texte += ` — ${commentaire}`;
    await dossierRepository.addSuivi(piece.dossier_id, user, texte, true);
    await logAcces(user, "UPDATE_STATUT", "dossier_pieces", pieceId, { ancien, statut }, ip);

    return {
      piece: updated,
      suggestNotification: statut === "arrive" && !updated.notifie,
    };
  },

  async updatePiece(pieceId, data, user, ip) {
    const piece = await dossierRepository.findPieceById(pieceId);
    if (!piece) throw Object.assign(new Error("Piece non trouvee"), { status: 404 });
    if (data.canal_notification && !CANAUX.includes(data.canal_notification)) {
      throw Object.assign(new Error("canal_notification invalide"), { status: 400 });
    }
    const updated = await dossierRepository.updatePiece(pieceId, data);
    await logAcces(user, "UPDATE", "dossier_pieces", pieceId, data, ip);
    return updated;
  },

  async removePiece(pieceId, user, ip) {
    const piece = await dossierRepository.findPieceById(pieceId);
    if (!piece) throw Object.assign(new Error("Piece non trouvee"), { status: 404 });
    const restantes = await dossierRepository.countPiecesByDossier(piece.dossier_id);
    if (parseInt(restantes.total, 10) <= 1) {
      throw Object.assign(
        new Error("Impossible de supprimer la derniere piece d'un dossier, supprimez le dossier entier"),
        { status: 400 }
      );
    }
    await dossierRepository.removePiece(pieceId);
    await dossierRepository.addSuivi(
      piece.dossier_id,
      user,
      `${piece.type_piece} de ${piece.usager_prenom} ${piece.usager_nom} retire du dossier.`,
      true
    );
    await logAcces(user, "DELETE", "dossier_pieces", pieceId, {}, ip);
  },

  async addSuivi(dossierId, commentaire, user, ip) {
    if (!commentaire || !commentaire.trim()) {
      throw Object.assign(new Error("Le commentaire est requis"), { status: 400 });
    }
    await this.getById(dossierId);
    const entry = await dossierRepository.addSuivi(dossierId, user, commentaire.trim(), false);
    await logAcces(user, "SUIVI", "dossiers_pieces_identite", dossierId, {}, ip);
    return entry;
  },

  async notify(pieceId, canal, user, ip) {
    if (!["sms", "email"].includes(canal)) {
      throw Object.assign(new Error("Canal invalide (sms ou email)"), { status: 400 });
    }
    const piece = await dossierRepository.findPieceById(pieceId);
    if (!piece) throw Object.assign(new Error("Piece non trouvee"), { status: 404 });

    const templates = await getDossierMessageTemplates();
    const vars = {
      civilite: piece.usager_civilite || "",
      prenom: piece.usager_prenom,
      nom: piece.usager_nom,
      destinataire_prenom: piece.destinataire_prenom || piece.usager_prenom,
      destinataire_nom: piece.destinataire_nom || piece.usager_nom,
      type_piece: piece.type_piece,
      type_piece_label: typePieceLabel(piece.type_piece),
    };

    let destinataire;
    try {
      if (canal === "sms") {
        destinataire = piece.destinataire_mobile || piece.destinataire_telephone;
        if (!destinataire) {
          throw Object.assign(new Error("Aucun numero de telephone renseigne pour le destinataire"), { status: 400 });
        }
        await sendSms(destinataire, renderTemplate(templates.dossier_sms_template, vars));
      } else {
        destinataire = piece.destinataire_email;
        if (!destinataire) {
          throw Object.assign(new Error("Aucun email renseigne pour le destinataire"), { status: 400 });
        }
        await sendMail({
          to: destinataire,
          subject: renderTemplate(templates.dossier_email_subject_template, vars),
          content: renderTemplate(templates.dossier_email_content_template, vars),
        });
      }
    } catch (err) {
      await dossierRepository.addNotification(pieceId, {
        canal,
        destinataire: destinataire || "?",
        statut: "echec",
        erreur: err.message,
        envoye_par: user,
      });
      await dossierRepository.addSuivi(
        piece.dossier_id,
        user,
        `Echec envoi ${canal} pour ${piece.type_piece} de ${piece.usager_prenom} ${piece.usager_nom} : ${err.message}`,
        true
      );
      throw err;
    }

    await dossierRepository.addNotification(pieceId, {
      canal,
      destinataire,
      statut: "envoye",
      envoye_par: user,
    });
    const updated = await dossierRepository.markPieceNotified(pieceId);
    await dossierRepository.addSuivi(
      piece.dossier_id,
      user,
      `Notification ${canal} envoyee a ${destinataire} pour ${piece.type_piece} de ${piece.usager_prenom} ${piece.usager_nom}.`,
      true
    );
    await logAcces(user, "NOTIFY", "dossier_pieces", pieceId, { canal, destinataire }, ip);

    return updated;
  },

  async getNotifications(pieceId) {
    return dossierRepository.findNotificationsByPiece(pieceId);
  },
};

module.exports = dossierService;
