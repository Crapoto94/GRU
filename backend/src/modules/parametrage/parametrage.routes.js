const express = require("express");
const router = express.Router();
const { pool, SCHEMA_NAME } = require("../../config/pg_db");
const axios = require("axios");

const PARAMS_TABLE = `"${SCHEMA_NAME}".config_params`;

async function getConfig(key) {
  const res = await pool.query(`SELECT valeur FROM ${PARAMS_TABLE} WHERE cle = $1`, [key]);
  return res.rows[0]?.valeur || null;
}

async function setConfig(key, valeur, description) {
  await pool.query(
    `INSERT INTO ${PARAMS_TABLE} (cle, valeur, description, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (cle) DO UPDATE SET valeur = EXCLUDED.valeur, updated_at = NOW()`,
    [key, valeur, description]
  );
}

async function getAllConfig() {
  const res = await pool.query(`SELECT cle, valeur, description, updated_at FROM ${PARAMS_TABLE} ORDER BY cle`);
  return res.rows;
}

/**
 * @openapi
 * /api/v1/parametrage/database:
 *   get:
 *     tags: [Parametrage]
 *     summary: Infos de connexion a la base de donnees
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Informations de connexion
 */
router.get("/database", async (_req, res, next) => {
  try {
    const client = await pool.connect();
    try {
      const dbResult = await client.query("SELECT current_database() as db, current_user as user_name, version() as version");
      const schemaResult = await client.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name`,
        [SCHEMA_NAME]
      );
      const countResult = await client.query(
        `SELECT
          (SELECT COUNT(*) FROM "${SCHEMA_NAME}".usagers) as usagers,
          (SELECT COUNT(*) FROM "${SCHEMA_NAME}".templates) as templates,
          (SELECT COUNT(*) FROM "${SCHEMA_NAME}".attestations) as attestations,
          (SELECT COUNT(*) FROM "${SCHEMA_NAME}".users) as users`
      );
      res.json({
        connexion: {
          host: process.env.POSTGRES_HOST,
          port: parseInt(process.env.POSTGRES_PORT, 10),
          database: dbResult.rows[0].db,
          user: dbResult.rows[0].user_name,
          schema: SCHEMA_NAME,
          version: dbResult.rows[0].version,
        },
        tables: schemaResult.rows.map((r) => r.table_name),
        compteurs: countResult.rows[0],
      });
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/parametrage/database/test:
 *   post:
 *     tags: [Parametrage]
 *     summary: Tester la connexion a la base
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Connexion OK
 */
router.post("/database/test", async (_req, res, next) => {
  try {
    const start = Date.now();
    await pool.query("SELECT 1");
    const ms = Date.now() - start;
    res.json({ status: "ok", latency: ms });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/parametrage/api-ville:
 *   get:
 *     tags: [Parametrage]
 *     summary: Recuperer la configuration de l'API Ville
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuration API Ville
 */
router.get("/api-ville", async (_req, res, next) => {
  try {
    const rows = await getAllConfig();
    const config = {};
    for (const r of rows) config[r.cle] = r.valeur;
    res.json({
      url: config.api_ville_url || "",
      port: config.api_ville_port || "",
      token: config.api_ville_token || "",
      description: config.api_ville_description || "API de la Ville",
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/parametrage/api-ville:
 *   put:
 *     tags: [Parametrage]
 *     summary: Modifier la configuration de l'API Ville
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *               port:
 *                 type: string
 *               token:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Configuration mise a jour
 */
router.put("/api-ville", async (req, res, next) => {
  try {
    const { url, port, token, description } = req.body;
    await setConfig("api_ville_url", url || "", "URL de base de l'API Ville");
    await setConfig("api_ville_port", port || "", "Port de l'API Ville");
    await setConfig("api_ville_token", token || "", "Token d'authentification API Ville");
    await setConfig("api_ville_description", description || "", "Description de l'API Ville");
    res.json({ url, port, token, description });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/parametrage/api-ville/test:
 *   post:
 *     tags: [Parametrage]
 *     summary: Tester la connexion a l'API Ville
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Test de connexion
 */
router.post("/api-ville/test", async (_req, res, next) => {
  try {
    const url = await getConfig("api_ville_url");
    const port = await getConfig("api_ville_port");
    const token = await getConfig("api_ville_token");
    if (!url) {
      throw Object.assign(new Error("URL de l'API Ville non configuree"), { status: 400 });
    }
    const baseUrl = port ? `${url}:${port}` : url;
    const start = Date.now();
    try {
      const response = await axios.get(baseUrl, {
        headers: token ? { "X-API-KEY": token } : {},
        timeout: 5000,
        httpsAgent: new (require("https").Agent)({ rejectUnauthorized: false }),
        validateStatus: () => true,
      });
      const ms = Date.now() - start;
      res.status(200).json({
        ok: true,
        statusCode: response.status,
        latency: ms,
        baseUrl,
        message: `Serveur repondu en ${response.status}`,
      });
    } catch (apiErr) {
      const ms = Date.now() - start;
      res.status(200).json({
        ok: false,
        statusCode: apiErr.response?.status || 0,
        message: apiErr.message,
        latency: ms,
        baseUrl,
      });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
