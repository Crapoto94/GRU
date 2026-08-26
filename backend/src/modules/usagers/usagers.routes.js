const express = require("express");
const router = express.Router();
const usagerService = require("./usagers.service");
const { validateAdresse } = require("../../utils/validators");
const { requireRole } = require("../../middleware/auth");

/**
 * @openapi
 * /api/v1/usagers:
 *   get:
 *     tags: [Usagers]
 *     summary: Lister les usagers
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: archived
 *         schema:
 *           type: boolean
 *           default: false
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Liste des usagers
 */
router.get("/", async (req, res, next) => {
  try {
    const { search, archived, limit, offset } = req.query;
    const result = await usagerService.list({
      search,
      archived: archived === "true",
      limit: parseInt(limit, 10) || 50,
      offset: parseInt(offset, 10) || 0,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/check-doublon", async (req, res, next) => {
  try {
    const { nom, date_naissance, telephone, exclude_id } = req.query;
    const results = await usagerService.checkDoublons({ nom, date_naissance, telephone, exclude_id });
    res.json(results);
  } catch (err) {
    next(err);
  }
});

router.get("/validate/adresse", async (req, res, next) => {
  try {
    const result = await validateAdresse(req.query.q);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/usagers/import-synbird:
 *   get:
 *     tags: [Usagers]
 *     summary: Rechercher un contact Synbird par telephone ou email pour pre-remplir une fiche usager
 *     parameters:
 *       - in: query
 *         name: contact
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Usager existant, ou donnees Synbird trouvees/non trouvees
 */
router.get("/import-synbird", async (req, res, next) => {
  try {
    const result = await usagerService.importFromSynbird(req.query.contact);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/usagers/{id}:
 *   get:
 *     tags: [Usagers]
 *     summary: Obtenir un usager par ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Usager
 *       404:
 *         description: Non trouve
 */
router.get("/:id", async (req, res, next) => {
  try {
    const usager = await usagerService.getById(req.params.id);
    res.json(usager);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/usagers:
 *   post:
 *     tags: [Usagers]
 *     summary: Creer un usager
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nom, prenom, date_naissance]
 *             properties:
 *               civilite:
 *                 type: string
 *               nom:
 *                 type: string
 *               prenom:
 *                 type: string
 *               date_naissance:
 *                 type: string
 *                 format: date
 *               email:
 *                 type: string
 *               telephone:
 *                 type: string
 *               mobile:
 *                 type: string
 *               Adresse:
 *                 type: string
 *               code_postal:
 *                 type: string
 *               ville:
 *                 type: string
 *               consentement_rgpd:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Usager cree
 *       400:
 *         description: Donnees invalides
 */
router.post("/", async (req, res, next) => {
  try {
    const usager = await usagerService.create(
      req.body,
      req.user?.login || "system",
      req.ip
    );
    res.status(201).json(usager);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/usagers/{id}:
 *   put:
 *     tags: [Usagers]
 *     summary: Modifier un usager
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Usager modifie
 */
router.put("/:id", async (req, res, next) => {
  try {
    const usager = await usagerService.update(
      req.params.id,
      req.body,
      req.user?.login || "system",
      req.ip
    );
    res.json(usager);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/usagers/{id}/archive:
 *   post:
 *     tags: [Usagers]
 *     summary: Archiver un usager
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               motif:
 *                 type: string
 *     responses:
 *       200:
 *         description: Usager archive
 */
router.post("/:id/archive", async (req, res, next) => {
  try {
    const usager = await usagerService.archive(
      req.params.id,
      req.body.motif,
      req.user?.login || "system",
      req.ip
    );
    res.json(usager);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/usagers/{id}/restore:
 *   post:
 *     tags: [Usagers]
 *     summary: Restaurer un usager archive
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Usager restaure
 */
router.post("/:id/restore", async (req, res, next) => {
  try {
    const usager = await usagerService.restore(
      req.params.id,
      req.user?.login || "system",
      req.ip
    );
    res.json(usager);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/usagers/{id}:
 *   delete:
 *     tags: [Usagers]
 *     summary: Supprimer definitivement un usager (RGPD)
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
router.delete("/:id", requireRole("administrateur"), async (req, res, next) => {
  try {
    await usagerService.remove(req.params.id, req.user?.login || "system", req.ip);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/usagers/validate/adresse:
 *   get:
 *     tags: [Usagers]
 *     summary: Valider une adresse via l'API Adresse
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Suggestions d'adresses
 */
module.exports = router;
