const axios = require("axios");
const { pool, SCHEMA_NAME } = require("../../config/pg_db");

const PARAMS_TABLE = `"${SCHEMA_NAME}".config_params`;

async function getApiVilleConfig() {
  const res = await pool.query(`SELECT cle, valeur FROM ${PARAMS_TABLE} WHERE cle IN ('api_ville_url', 'api_ville_port', 'api_ville_token')`);
  const config = {};
  for (const r of res.rows) config[r.cle] = r.valeur;
  if (!config.api_ville_url) throw Object.assign(new Error("API Ville non configuree"), { status: 500 });
  const base = config.api_ville_port
    ? `${config.api_ville_url}:${config.api_ville_port}`
    : config.api_ville_url;
  return { base, token: config.api_ville_token || "" };
}

async function getAxiosConfig() {
  const { base, token } = await getApiVilleConfig();
  return {
    baseURL: base,
    headers: token ? { "X-API-KEY": token } : {},
    timeout: 10000,
    httpsAgent: new (require("https").Agent)({ rejectUnauthorized: false }),
  };
}

module.exports = { getApiVilleConfig, getAxiosConfig };
