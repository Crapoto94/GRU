const express = require("express");
const router = express.Router();
const { requireRole } = require("../../middleware/auth");
const listesService = require("./listes.service");

const admin = requireRole("administrateur");

/**
 * @openapi
 * /api/v1/listes-correspondance:
 *   get:
 *     tags: [Listes de correspondance]
 *     summary: Lister les listes de reference et leurs valeurs
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Listes de reference avec leurs valeurs
 */
router.get("/", async (_req, res, next) => {
  try {
    res.json(await listesService.list());
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/listes-correspondance/{cle}:
 *   get:
 *     tags: [Listes de correspondance]
 *     summary: Detail d'une liste par sa cle
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cle
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Liste avec valeurs
 */
router.get("/:cle", async (req, res, next) => {
  try {
    res.json(await listesService.getByCle(req.params.cle));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/listes-correspondance:
 *   post:
 *     tags: [Listes de correspondance]
 *     summary: Creer une liste de reference
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cle, nom]
 *             properties:
 *               cle: { type: string }
 *               nom: { type: string }
 *     responses:
 *       201:
 *         description: Liste creee
 */
router.post("/", admin, async (req, res, next) => {
  try {
    const list = await listesService.create(req.body, req.user.login || req.user.sub, req.ip);
    res.status(201).json(list);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/listes-correspondance/{id}:
 *   put:
 *     tags: [Listes de correspondance]
 *     summary: Renommer une liste
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nom]
 *             properties:
 *               nom: { type: string }
 *     responses:
 *       200:
 *         description: Liste mise a jour
 */
router.put("/:id", admin, async (req, res, next) => {
  try {
    res.json(await listesService.update(req.params.id, req.body, req.user.login || req.user.sub, req.ip));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/listes-correspondance/{id}:
 *   delete:
 *     tags: [Listes de correspondance]
 *     summary: Supprimer une liste (et ses valeurs)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Liste supprimee
 */
router.delete("/:id", admin, async (req, res, next) => {
  try {
    await listesService.remove(req.params.id, req.user.login || req.user.sub, req.ip);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/listes-correspondance/{id}/valeurs:
 *   post:
 *     tags: [Listes de correspondance]
 *     summary: Ajouter/upsert une valeur a une liste
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, label]
 *             properties:
 *               code: { type: string, description: "Code de correspondance (ex: code ALTO)" }
 *               label: { type: string }
 *     responses:
 *       201:
 *         description: Valeur ajoutee
 */
router.post("/:id/valeurs", admin, async (req, res, next) => {
  try {
    const value = await listesService.addValue(req.params.id, req.body, req.user.login || req.user.sub, req.ip);
    res.status(201).json(value);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/listes-correspondance/{id}/valeurs/{valueId}:
 *   put:
 *     tags: [Listes de correspondance]
 *     summary: Modifier une valeur
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: valueId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, label]
 *             properties:
 *               code: { type: string }
 *               label: { type: string }
 *               ordre: { type: integer }
 *     responses:
 *       200:
 *         description: Valeur mise a jour
 */
router.put("/:id/valeurs/:valueId", admin, async (req, res, next) => {
  try {
    res.json(await listesService.updateValue(req.params.valueId, req.body, req.user.login || req.user.sub, req.ip));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/listes-correspondance/{id}/valeurs/{valueId}:
 *   delete:
 *     tags: [Listes de correspondance]
 *     summary: Supprimer une valeur
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: valueId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Valeur supprimee
 */
router.delete("/:id/valeurs/:valueId", admin, async (req, res, next) => {
  try {
    await listesService.removeValue(req.params.valueId, req.user.login || req.user.sub, req.ip);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;