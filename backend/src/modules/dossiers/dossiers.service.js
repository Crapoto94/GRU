const dossierRepository = require("./dossiers.repository");
const usagerRepository = require("../usagers/usagers.repository");
const usagerService = require("../usagers/usagers.service");
const { sendSms, sendMail } = require("../../utils/apiVille");
const { logAcces } = require("../../utils/logger");
const { typePieceLabel, renderTemplate, getDossierMessageTemplates } = require("../../utils/messageTemplates");
const fs = require("fs");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const { db, SCHEMA_NAME } = require("../../config/pg_db");
const { GABARITS, resolveGabaritPath, buildCourrierData } = require("../../utils/gabarits");
const { MOTIFS } = require("../../utils/dossierMotifs");
const { ageEn } = require("../../utils/age");
const { ETAPE_LABELS, FRISE_PREFIX } = require("../../utils/dossierEtapes");

const TYPES_PIECE = ["CNI", "Passeport"];
const CANAUX = ["sms", "email", "both"];

const dossierService = {
  async listPieces(params) {
    return dossierRepository.findPiecesList(params);
  },

  async list(params) {
    return dossierRepository.findDossiersList(params);
  },

  async getById(id) {
    const dossier = await dossierRepository.findDossierById(id);
    if (!dossier) throw Object.assign(new Error("Dossier non trouve"), { status: 404 });
    const pieces = await dossierRepository.findPiecesByDossier(id);
    const suivi = await dossierRepository.findSuiviByDossier(id);
    const etapes = await dossierRepository.findEtapesByDossier(id);
    const etapesByPiece = new Map();
    for (const e of etapes) {
      if (!etapesByPiece.has(e.dossier_piece_id)) etapesByPiece.set(e.dossier_piece_id, []);
      etapesByPiece.get(e.dossier_piece_id).push(e);
    }
    const piecesWithEtapes = pieces.map((p) => ({ ...p, etapes: etapesByPiece.get(p.id) || [] }));
    const personne = async (uid) => {
      if (!uid) return null;
      const u = await usagerRepository.findById(uid);
      return u ? { id: u.id, civilite: u.civilite, nom: u.nom, prenom: u.prenom } : null;
    };
    return {
      ...dossier,
      parent1: await personne(dossier.parent1_usager_id),
      parent2: await personne(dossier.parent2_usager_id),
      tuteur: await personne(dossier.tuteur_usager_id),
      pieces: piecesWithEtapes,
      suivi,
    };
  },

  // Chaque ligne designe un usager existant (usager.id) ou en decrit un nouveau.
  // Les champs saisis dans le formulaire de dossier mettent a jour la fiche usager.
  async resolveUsager(ligne, user, ip) {
    const fiche = ligne.usager;
    if (!fiche) return ligne.usager_id;
    if (fiche.id) {
      await usagerService.update(fiche.id, fiche, user, ip);
      return fiche.id;
    }
    const created = await usagerService.create(fiche, user, ip);
    return created.id;
  },

  // Valide la saisie puis enregistre les usagers concernes (beneficiaire, parents, tuteur).
  // Majeur / mineur se deduit de la date de naissance du beneficiaire.
  async prepare(data, user, ip) {
    const lignes = Array.isArray(data.lignes) ? data.lignes : [];
    if (lignes.length === 0) {
      throw Object.assign(new Error("Au moins un usager et une piece sont requis"), { status: 400 });
    }
    for (const ligne of lignes) {
      if (!ligne.usager_id && !ligne.usager) {
        throw Object.assign(new Error("usager ou usager_id est requis pour chaque ligne"), { status: 400 });
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
      for (const motif of Object.values(ligne.motifs || {})) {
        if (motif && !MOTIFS[motif]) throw Object.assign(new Error("motif invalide"), { status: 400 });
      }
      const existingId = ligne.usager?.id || ligne.usager_id;
      if (existingId) {
        const usager = await usagerRepository.findById(existingId);
        if (!usager) throw Object.assign(new Error("Usager non trouve"), { status: 404 });
      }
    }

    const tutelle = data.tutelle === true;
    if (tutelle && !data.tuteur) {
      throw Object.assign(new Error("Le tuteur est requis pour une tutelle"), { status: 400 });
    }

    const usagerIdsParLigne = [];
    for (const ligne of lignes) {
      usagerIdsParLigne.push(await this.resolveUsager(ligne, user, ip));
    }
    const beneficiaire = await usagerRepository.findById(usagerIdsParLigne[0]);
    const categorie = ageEn(beneficiaire.date_naissance) < 18 ? "mineur" : "majeur";
    if (categorie === "mineur" && !data.parent1) {
      throw Object.assign(new Error("Le parent 1 est requis pour un mineur"), { status: 400 });
    }

    const parent1Id = categorie === "mineur" ? await this.resolveUsager({ usager: data.parent1 }, user, ip) : null;
    const parent2Id = categorie === "mineur" && data.parent2?.nom
      ? await this.resolveUsager({ usager: data.parent2 }, user, ip)
      : null;
    const tuteurId = tutelle ? await this.resolveUsager({ usager: data.tuteur }, user, ip) : null;
    // Qui retire / est notifie : le tuteur, sinon le parent 1, sinon le beneficiaire.
    const retraitId = tuteurId || parent1Id;

    const pieces = [];
    lignes.forEach((ligne, i) => {
      const usagerId = usagerIdsParLigne[i];
      const destinataireId = retraitId || (Number.isInteger(ligne.destinataire_index)
        ? usagerIdsParLigne[ligne.destinataire_index]
        : ligne.destinataire_usager_id);
      for (const type_piece of ligne.types) {
        pieces.push({
          usager_id: usagerId,
          type_piece,
          date_demande: ligne.date_demande,
          destinataire_usager_id: destinataireId || usagerId,
          canal_notification: ligne.canal_notification || "email",
          motif: ligne.motifs?.[type_piece] || null,
        });
      }
    });
    return {
      pieces,
      nbUsagers: new Set(usagerIdsParLigne).size,
      dossier: { categorie, tutelle, parent1_usager_id: parent1Id, parent2_usager_id: parent2Id, tuteur_usager_id: tuteurId },
    };
  },

  async create(data, user, ip) {
    const { pieces, nbUsagers, dossier } = await this.prepare(data, user, ip);
    const suiviTexte = `Dossier cree avec ${pieces.length} piece(s) pour ${nbUsagers} usager(s).`;
    const dossierId = await dossierRepository.createDossierWithPieces(user, pieces, suiviTexte, dossier);
    await logAcces(user, "CREATE", "dossiers_pieces_identite", dossierId, { nbPieces: pieces.length }, ip);
    return this.getById(dossierId);
  },

  // Modification du dossier depuis le meme formulaire : fiches usagers, parents / tuteur,
  // pieces (ajout, motif, date) ; une piece decochee est retiree sauf si c'est la derniere.
  async update(id, data, user, ip) {
    await this.getById(id);
    const { pieces, dossier } = await this.prepare(data, user, ip);
    await dossierRepository.updateDossierRow(id, dossier);

    const existantes = await dossierRepository.findPiecesByDossier(id);
    for (const p of pieces) {
      const deja = existantes.find((e) => e.usager_id === p.usager_id && e.type_piece === p.type_piece);
      if (deja) {
        await dossierRepository.updatePiece(deja.id, {
          date_demande: p.date_demande,
          destinataire_usager_id: p.destinataire_usager_id,
          canal_notification: p.canal_notification,
          motif: p.motif,
        });
      } else {
        await dossierRepository.addPiece(id, p);
      }
    }
    const gardees = new Set(pieces.map((p) => `${p.usager_id}|${p.type_piece}`));
    for (const e of existantes) {
      if (gardees.has(`${e.usager_id}|${e.type_piece}`)) continue;
      const restantes = await dossierRepository.countPiecesByDossier(id);
      if (parseInt(restantes.total, 10) > 1) await dossierRepository.removePiece(e.id);
    }
    await dossierRepository.addSuivi(id, user, "Dossier modifié", true);
    await logAcces(user, "UPDATE", "dossiers_pieces_identite", id, { nbPieces: pieces.length }, ip);
    return this.getById(id);
  },

  async remove(id, user, ip) {
    await this.getById(id);
    await dossierRepository.removeDossier(id);
    await logAcces(user, "DELETE", "dossiers_pieces_identite", id, {}, ip);
  },

  async getEtapeCatalog() {
    const rows = await dossierRepository.listEtapesMenu();
    return rows.map((r) => ({ ...r, menu: true }));
  },

  // Le changement d'etat depuis la fiche dossier alimente la frise
  // chronologique (dossier_piece_etapes), pas le suivi (dossier_suivi) :
  // le catalogue liste tous les cas reels observes dans l'historique ALTO
  // (voir utils/dossierEtapes.js), pas seulement les 4-5 statuts sommaires.
  async updateStatut(pieceId, code, user, ip, commentaire) {
    const row = await dossierRepository.findEtapeMenu(code);
    const entry = row
      ? { statut: row.statut, libelle: `${FRISE_PREFIX[row.statut] || ""}${row.libelle}` }
      : ETAPE_LABELS[code];
    if (!entry) {
      throw Object.assign(new Error("Etape invalide"), { status: 400 });
    }
    const piece = await dossierRepository.findPieceById(pieceId);
    if (!piece) throw Object.assign(new Error("Piece non trouvee"), { status: 404 });

    const updated = await dossierRepository.updatePieceStatut(pieceId, entry.statut);
    const etape = await dossierRepository.addEtape(pieceId, {
      libelle: entry.libelle,
      statut_equivalent: entry.statut,
      code_legacy: code,
      commentaire: (commentaire || "").trim() || null,
    });
    await logAcces(user, "UPDATE_ETAPE", "dossier_pieces", pieceId, { code, libelle: entry.libelle, commentaire }, ip);

    return {
      piece: updated,
      etape,
      suggestNotification: entry.statut === "arrive" && !updated.notifie,
    };
  },

  // Courrier (ajournement, relance, archivage) genere depuis le gabarit Word parametre ;
  // le choix du gabarit suit le statut courant de la piece.
  async generateCourrier(pieceId, user, ip) {
    const piece = await dossierRepository.findPieceById(pieceId);
    if (!piece) throw Object.assign(new Error("Piece non trouvee"), { status: 404 });
    const cle = Object.keys(GABARITS).find((k) => GABARITS[k].statut === piece.statut);
    if (!cle) {
      throw Object.assign(new Error("Aucun courrier pour ce statut (ajourne, arrive ou archive)"), { status: 400 });
    }
    const usager = await usagerRepository.findById(piece.usager_id);
    const destinataire = piece.destinataire_usager_id ? await usagerRepository.findById(piece.destinataire_usager_id) : null;
    const etapes = (await dossierRepository.findEtapesByDossier(piece.dossier_id)).filter((e) => e.dossier_piece_id === pieceId);
    const etape = [...etapes].reverse().find((e) => e.statut_equivalent === piece.statut) || null;
    const agentRow = await db.get(`SELECT prenom, nom FROM "${SCHEMA_NAME}".users WHERE login = $1`, [user]);
    const agent = agentRow ? `${agentRow.prenom} ${String(agentRow.nom).toUpperCase()}` : user;

    const doc = new Docxtemplater(new PizZip(fs.readFileSync(resolveGabaritPath(cle), "binary")), {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: "{{", end: "}}" },
      nullGetter: () => "",
    });
    doc.render(buildCourrierData({
      piece,
      usager,
      destinataire,
      etape,
      agent,
      depuisDate: etape?.date_etape || piece.date_arrivee || piece.date_demande,
    }));

    await dossierRepository.addSuivi(piece.dossier_id, user, `Courrier généré : ${GABARITS[cle].label} (${piece.type_piece})`, true);
    await logAcces(user, "COURRIER", "dossier_pieces", pieceId, { gabarit: cle }, ip);
    return {
      buffer: doc.getZip().generate({ type: "nodebuffer" }),
      filename: `${cle}_${String(usager.nom).replace(/[^a-zA-Z0-9]/g, "_")}.docx`,
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
