const express = require("express");
const router = express.Router();
const { requireRole } = require("../../middleware/auth");
const rgpdService = require("./rgpd.service");

/**
 * @openapi
 * /api/v1/rgpd/conservation:
 *   get:
 *     tags: [RGPD]
 *     summary: Liste des durees de conservation RGPD par demarche
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des regles de conservation
 */
router.get(
  "/conservation",
  requireRole("administrateur", "dpd"),
  async (_req, res, next) => {
    try {
      const rows = await rgpdService.list();
      res.json(rows);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @openapi
 * /api/v1/rgpd/conservation/{cle}:
 *   get:
 *     tags: [RGPD]
 *     summary: Detail d'une regle de conservation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cle
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Regle de conservation
 */
router.get(
  "/conservation/:cle",
  requireRole("administrateur", "dpd"),
  async (req, res, next) => {
    try {
      const row = await rgpdService.getById(req.params.cle);
      res.json(row);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @openapi
 * /api/v1/rgpd/conservation/{cle}:
 *   put:
 *     tags: [RGPD]
 *     summary: Mettre a jour la duree de conservation d'une demarche
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cle
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [conservation_mois]
 *             properties:
 *               conservation_mois:
 *                 type: integer
 *                 description: Duree de conservation en mois
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Regle mise a jour
 */
router.put(
  "/conservation/:cle",
  requireRole("administrateur", "dpd"),
  async (req, res, next) => {
    try {
      const row = await rgpdService.upsert(req.params.cle, req.body, req.user.login || req.user.sub, req.ip);
      res.json(row);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;