const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });

const SCHEMA_NAME = process.env.SCHEMA_NAME || "gru";

async function migrate() {
  const pool = new Pool({
    host: process.env.POSTGRES_HOST || "localhost",
    port: parseInt(process.env.POSTGRES_PORT, 10) || 5432,
    database: process.env.POSTGRES_DB || "ivry_admin",
    user: process.env.POSTGRES_USER || "app_gru",
    password: process.env.POSTGRES_PASSWORD || "",
  });

  const migrationsDir = path.resolve(__dirname, "../../migrations");
  if (!fs.existsSync(migrationsDir)) {
    console.log("No migrations directory found. Skipping.");
    await pool.end();
    return;
  }

  await pool.query(`CREATE SCHEMA IF NOT EXISTS "${SCHEMA_NAME}"`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "${SCHEMA_NAME}".migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const applied = await pool.query(`SELECT name FROM "${SCHEMA_NAME}".migrations ORDER BY id`);
  const appliedNames = new Set(applied.rows.map((r) => r.name));

  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    if (appliedNames.has(file)) {
      console.log(`Already applied: ${file}`);
      continue;
    }
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`SET search_path TO "${SCHEMA_NAME}"`);
      await client.query(sql);
      await client.query(`INSERT INTO "${SCHEMA_NAME}".migrations (name) VALUES ($1)`, [file]);
      await client.query("COMMIT");
      console.log(`Applied: ${file}`);
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`Failed: ${file}`, err.message);
      throw err;
    } finally {
      client.release();
    }
  }

  await pool.end();
  console.log("Migrations complete.");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
