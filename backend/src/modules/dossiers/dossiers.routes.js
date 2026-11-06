const express = require("express");
const router = express.Router();
const dossierService = require("./dossiers.service");

/**
 * @openapi
 * /api/v1/dossiers:
 *   get:
 *     tags: [Dossiers]
 *     summary: Lister les demandes de pieces (CNI/Passeport), une ligne par usager+piece
 *     parameters:
 *       - in: query
 *         name: statut
 *         schema:
 *           type: string
 *           enum: [demande, ajourne, arrive, recupere, refuse]
 *       - in: query
 *         name: type_piece
 *         schema:
 *           type: string
 *           enum: [CNI, Passeport]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: nom
 *         schema:
 *           type: string
 *       - in: query
 *         name: prenom
 *         schema:
 *           type: string
 *       - in: query
 *         name: telephone
 *         schema:
 *           type: string
 *       - in: query
 *         name: adresse
 *         schema:
 *           type: string
 *       - in: query
 *         name: code_postal
 *         schema:
 *           type: string
 *       - in: query
 *         name: ville
 *         schema:
 *           type: string
 *       - in: query
 *         name: only_pending
 *         description: Si vrai (defaut cote client), n'affiche que les dossiers ayant au moins une piece non cloturee (ni recupere, ni refuse)
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Liste des pieces
 */
router.get("/", async (req, res, next) => {
  try {
    const { statut, type_piece, search, nom, prenom, telephone, adresse, code_postal, ville, only_pending, sort, order, limit, offset } = req.query;
    const result = await dossierService.list({
      statut,
      type_piece,
      search,
      nom,
      prenom,
      telephone,
      adresse,
      code_postal,
      ville,
      only_pending: only_pending === "true" || only_pending === "1",
      sort,
      order,
      limit: parseInt(limit, 10) || 50,
      offset: parseInt(offset, 10) || 0,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/dossiers/etapes-catalogue:
 *   get:
 *     tags: [Dossiers]
 *     summary: Catalogue des etapes possibles pour le changement d'etat (alimente la frise, pas le suivi)
 *     responses:
 *       200:
 *         description: Liste des etapes (code, libelle, statut)
 */
/**
 * @openapi
 * /api/v1/dossiers/pieces:
 *   get:
 *     tags: [Dossiers]
 *     summary: Liste des pieces CNI/Passeport (une ligne par piece) avec statut courant et anciennete
 *     parameters:
 *       - in: query
 *         name: statut
 *         schema:
 *           type: string
 *         description: Un ou plusieurs statuts separes par des virgules
 *       - in: query
 *         name: type_piece
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Nom, prenom ou telephone (beneficiaire ou destinataire)
 *       - in: query
 *         name: date_naissance
 *         schema:
 *           type: string
 *         description: JJ/MM/AAAA (partiel accepte)
 *       - in: query
 *         name: only_pending
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Pieces
 */
router.get("/pieces", async (req, res, next) => {
  try {
    const { statut, type_piece, search, date_naissance, only_pending, sort, order, limit, offset } = req.query;
    const result = await dossierService.listPieces({
      statut,
      type_piece,
      search,
      date_naissance,
      only_pending: only_pending === "true",
      sort,
      order,
      limit: parseInt(limit, 10) || 50,
      offset: parseInt(offset, 10) || 0,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/etapes-catalogue", async (_req, res, next) => {
  try {
    res.json(await dossierService.getEtapeCatalog());
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/dossiers/{id}:
 *   get:
 *     tags: [Dossiers]
 *     summary: Obtenir un dossier avec ses pieces et son suivi
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Dossier
 *       404:
 *         description: Non trouve
 */
router.get("/:id", async (req, res, next) => {
  try {
    const dossier = await dossierService.getById(req.params.id);
    res.json(dossier);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/dossiers:
 *   post:
 *     tags: [Dossiers]
 *     summary: Creer un dossier de demande de pieces (un ou plusieurs usagers, CNI et/ou Passeport)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [lignes]
 *             properties:
 *               lignes:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [usager_id, types, date_demande]
 *                   properties:
 *                     usager_id:
 *                       type: string
 *                     types:
 *                       type: array
 *                       items:
 *                         type: string
 *                         enum: [CNI, Passeport]
 *                     date_demande:
 *                       type: string
 *                       format: date
 *                     destinataire_usager_id:
 *                       type: string
 *                     canal_notification:
 *                       type: string
 *                       enum: [sms, email, both]
 *     responses:
 *       201:
 *         description: Dossier cree
 */
router.post("/", async (req, res, next) => {
  try {
    const dossier = await dossierService.create(req.body, req.user?.login || "system", req.ip);
    res.status(201).json(dossier);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/dossiers/{id}:
 *   delete:
 *     tags: [Dossiers]
 *     summary: Supprimer un dossier entier (toutes ses pieces et son suivi)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Supprime
 */
/**
 * @openapi
 * /api/v1/dossiers/{id}:
 *   put:
 *     tags: [Dossiers]
 *     summary: Modifier un dossier (memes champs que la creation : usagers, parents, tuteur, pieces)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dossier mis a jour
 */
router.put("/:id", async (req, res, next) => {
  try {
    const dossier = await dossierService.update(req.params.id, req.body, req.user?.login || "system", req.ip);
    res.json(dossier);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await dossierService.remove(req.params.id, req.user?.login || "system", req.ip);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/dossiers/{id}/suivi:
 *   post:
 *     tags: [Dossiers]
 *     summary: Ajouter un commentaire de suivi au dossier
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [commentaire]
 *             properties:
 *               commentaire:
 *                 type: string
 *     responses:
 *       201:
 *         description: Entree de suivi ajoutee
 */
router.post("/:id/suivi", async (req, res, next) => {
  try {
    const entry = await dossierService.addSuivi(req.params.id, req.body.commentaire, req.user?.login || "system", req.ip);
    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/dossiers/pieces/{pieceId}/statut:
 *   patch:
 *     tags: [Dossiers]
 *     summary: Ajouter une etape a la frise d'une piece (met aussi a jour son statut sommaire)
 *     parameters:
 *       - in: path
 *         name: pieceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code:
 *                 type: string
 *                 description: Code de l'etape (voir /etapes-catalogue)
 *     responses:
 *       200:
 *         description: Piece mise a jour + etape ajoutee a la frise, avec suggestion de notification si passage a "arrive"
 */
/**
 * @openapi
 * /api/v1/dossiers/pieces/{pieceId}/courrier:
 *   post:
 *     tags: [Dossiers]
 *     summary: Generer le courrier (ajournement, relance ou archivage selon le statut) au format .docx
 *     parameters:
 *       - in: path
 *         name: pieceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Fichier .docx
 */
router.post("/pieces/:pieceId/courrier", async (req, res, next) => {
  try {
    const { buffer, filename } = await dossierService.generateCourrier(req.params.pieceId, req.user?.login || "system", req.ip);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

router.patch("/pieces/:pieceId/statut", async (req, res, next) => {
  try {
    const result = await dossierService.updateStatut(
      req.params.pieceId,
      req.body.code,
      req.user?.login || "system",
      req.ip,
      req.body.commentaire
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/dossiers/pieces/{pieceId}:
 *   put:
 *     tags: [Dossiers]
 *     summary: Modifier une piece (date de demande, destinataire, canal de notification)
 *     parameters:
 *       - in: path
 *         name: pieceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Piece mise a jour
 */
router.put("/pieces/:pieceId", async (req, res, next) => {
  try {
    const updated = await dossierService.updatePiece(req.params.pieceId, req.body, req.user?.login || "system", req.ip);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/dossiers/pieces/{pieceId}:
 *   delete:
 *     tags: [Dossiers]
 *     summary: Retirer une piece d'un dossier (le dossier doit conserver au moins une piece)
 *     parameters:
 *       - in: path
 *         name: pieceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Piece retiree
 */
router.delete("/pieces/:pieceId", async (req, res, next) => {
  try {
    await dossierService.removePiece(req.params.pieceId, req.user?.login || "system", req.ip);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/dossiers/pieces/{pieceId}/notify:
 *   post:
 *     tags: [Dossiers]
 *     summary: Envoyer la notification (SMS ou email) au destinataire d'une piece
 *     parameters:
 *       - in: path
 *         name: pieceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [canal]
 *             properties:
 *               canal:
 *                 type: string
 *                 enum: [sms, email]
 *     responses:
 *       200:
 *         description: Notification envoyee
 */
router.post("/pieces/:pieceId/notify", async (req, res, next) => {
  try {
    const updated = await dossierService.notify(req.params.pieceId, req.body.canal, req.user?.login || "system", req.ip);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/dossiers/pieces/{pieceId}/notifications:
 *   get:
 *     tags: [Dossiers]
 *     summary: Historique des notifications envoyees pour une piece
 *     parameters:
 *       - in: path
 *         name: pieceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Liste des notifications
 */
router.get("/pieces/:pieceId/notifications", async (req, res, next) => {
  try {
    const notifications = await dossierService.getNotifications(req.params.pieceId);
    res.json(notifications);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
