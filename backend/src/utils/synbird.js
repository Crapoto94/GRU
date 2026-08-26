const https = require("https");
const axios = require("axios");
const { pool, SCHEMA_NAME } = require("../config/pg_db");

async function getSynbirdConfig() {
  const res = await pool.query(
    `SELECT cle, valeur FROM "${SCHEMA_NAME}".config_params WHERE cle IN ('synbird_url', 'synbird_token')`
  );
  const config = {};
  for (const r of res.rows) config[r.cle] = r.valeur;
  return {
    url: (config.synbird_url || "").trim().replace(/\/+$/, ""),
    token: (config.synbird_token || "").trim(),
  };
}

async function searchSynbirdContact(contact) {
  const { url, token } = await getSynbirdConfig();
  if (!url || !token) {
    throw Object.assign(new Error("API Synbird non configuree (voir Parametrage)"), { status: 400 });
  }
  try {
    const response = await axios.get(`${url}/searcher`, {
      params: { scopes: ["appointments"], contact },
      headers: { token },
      timeout: 8000,
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    });
    return Array.isArray(response.data) ? response.data : [];
  } catch (err) {
    const status = err.response?.status;
    const body = typeof err.response?.data === "string" ? err.response.data : JSON.stringify(err.response?.data || "");
    const detail = status ? `Synbird a repondu ${status}${body ? ` : ${body}` : ""}` : err.message;
    throw Object.assign(new Error(`Erreur lors de la recherche Synbird (${detail})`), { status: 502 });
  }
}

async function getAdditionalInformationLabels() {
  const { url, token } = await getSynbirdConfig();
  if (!url || !token) return {};
  try {
    const response = await axios.get(`${url}/company/getStaticData`, {
      headers: { token },
      timeout: 8000,
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    });
    const labels = {};
    for (const item of response.data?.additional_informations || []) {
      labels[item.id] = item.name;
    }
    return labels;
  } catch {
    return {};
  }
}

module.exports = { getSynbirdConfig, searchSynbirdContact, getAdditionalInformationLabels };
