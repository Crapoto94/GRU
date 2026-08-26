const express = require("express");
const router = express.Router();
const { db, SCHEMA_NAME } = require("../../config/pg_db");

const TABLE = `"${SCHEMA_NAME}".logs_acces`;

router.get("/", async (req, res, next) => {
  try {
    const { limit = 100, offset = 0, action, utilisateur } = req.query;
    let query = `SELECT id, utilisateur, action, table_concernee, record_id, details, ip_address, created_at FROM ${TABLE} WHERE 1=1`;
    const params = [];
    if (action) {
      params.push(`%${action}%`);
      query += ` AND action ILIKE $${params.length}`;
    }
    if (utilisateur) {
      params.push(`%${utilisateur}%`);
      query += ` AND utilisateur ILIKE $${params.length}`;
    }
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    const rows = await db.all(query, params);
    const countResult = await db.get(`SELECT COUNT(*) as total FROM ${TABLE}`);
    res.json({ rows, total: parseInt(countResult.total, 10) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
