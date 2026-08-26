const express = require("express");
const router = express.Router();

/**
 * @openapi
 * /api/v1/health:
 *   get:
 *     tags: [Health]
 *     summary: Verifier l'etat du serveur
 *     responses:
 *       200:
 *         description: Serveur operationnel
 */
router.get("/", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

module.exports = router;
