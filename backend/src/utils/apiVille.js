const https = require("https");
const axios = require("axios");
const { pool, SCHEMA_NAME } = require("../config/pg_db");

async function getApiVilleConfig() {
  const res = await pool.query(
    `SELECT cle, valeur FROM "${SCHEMA_NAME}".config_params WHERE cle IN ('api_ville_url', 'api_ville_port', 'api_ville_token')`
  );
  const config = {};
  for (const r of res.rows) config[r.cle] = r.valeur;
  const url = (config.api_ville_url || "").trim().replace(/\/+$/, "");
  const port = (config.api_ville_port || "").trim();
  return { baseUrl: port ? `${url}:${port}` : url, token: (config.api_ville_token || "").trim() };
}

async function postApiVille(path, body) {
  const { baseUrl, token } = await getApiVilleConfig();
  if (!baseUrl || !token) {
    throw Object.assign(new Error("API Ville non configuree (voir Parametrage)"), { status: 400 });
  }
  try {
    const response = await axios.post(`${baseUrl}${path}`, body, {
      headers: { "X-API-KEY": token, "Content-Type": "application/json" },
      timeout: 10000,
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    });
    return response.data;
  } catch (err) {
    const status = err.response?.status;
    const body2 = typeof err.response?.data === "string" ? err.response.data : JSON.stringify(err.response?.data || "");
    const detail = status ? `API Ville a repondu ${status}${body2 ? ` : ${body2}` : ""}` : err.message;
    throw Object.assign(new Error(`Erreur lors de l'envoi (${detail})`), { status: 502 });
  }
}

async function sendSms(mobile, message) {
  return postApiVille("/api/v1/sms/send", { mobile, message });
}

async function sendMail({ to, subject, content, from_name, from_email }) {
  return postApiVille("/api/v1/mail/send", { to, subject, content, from_name, from_email });
}

module.exports = { getApiVilleConfig, sendSms, sendMail };
