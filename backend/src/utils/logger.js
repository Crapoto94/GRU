const { SCHEMA_NAME } = require("../config/pg_db");

async function logAcces(utilisateur, action, tableConcernee, recordId, details, ipAddress) {
  const { db } = require("../config/pg_db");
  await db.run(
    `INSERT INTO "${SCHEMA_NAME}".logs_acces (utilisateur, action, table_concernee, record_id, details, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [utilisateur, action, tableConcernee, recordId, details ? JSON.stringify(details) : null, ipAddress]
  );
}

module.exports = { logAcces };
