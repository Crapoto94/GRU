const express = require("express");
const axios = require("axios");
const { pool } = require("../../config/pg_db");
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

/**
 * @openapi
 * /api/v1/health/status:
 *   get:
 *     tags: [Health]
 *     summary: Etat detaille de tous les services
 *     responses:
 *       200:
 *         description: Statut de chaque service
 */
router.get("/status", async (_req, res) => {
  const result = { backend: "ok", database: "error", api_ville: "unknown" };

  try {
    const start = Date.now();
    await pool.query("SELECT 1");
    result.database = "ok";
    result.database_latency = Date.now() - start;
  } catch {
    result.database = "error";
  }

  try {
    const configRes = await pool.query(
      `SELECT cle, valeur FROM "gru".config_params WHERE cle IN ('api_ville_url', 'api_ville_port', 'api_ville_token')`
    );
    const config = {};
    for (const r of configRes.rows) config[r.cle] = r.valeur;

    if (config.api_ville_url) {
      const baseUrl = config.api_ville_port
        ? `${config.api_ville_url}:${config.api_ville_port}`
        : config.api_ville_url;
      const start = Date.now();
      try {
        await axios.get(baseUrl, {
          headers: config.api_ville_token ? { "X-API-KEY": config.api_ville_token } : {},
          timeout: 5000,
          httpsAgent: new (require("https").Agent)({ rejectUnauthorized: false }),
          validateStatus: () => true,
        });
        result.api_ville = "ok";
        result.api_ville_latency = Date.now() - start;
      } catch {
        result.api_ville = "error";
        result.api_ville_latency = Date.now() - start;
      }
    } else {
      result.api_ville = "not_configured";
    }
  } catch {
    result.api_ville = "error";
  }

  res.json(result);
});

module.exports = router;
