const { Pool } = require("pg");

const SCHEMA_NAME = process.env.SCHEMA_NAME || "gru";

const pool = new Pool({
  host: process.env.POSTGRES_HOST || "localhost",
  port: parseInt(process.env.POSTGRES_PORT, 10) || 5432,
  database: process.env.POSTGRES_DB || "ivry_admin",
  user: process.env.POSTGRES_USER || "app_gru",
  password: process.env.POSTGRES_PASSWORD || "",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

const db = {
  async all(text, params) {
    const result = await pool.query(text, params);
    return result.rows;
  },
  async get(text, params) {
    const result = await pool.query(text, params);
    return result.rows[0] || null;
  },
  async run(text, params) {
    const result = await pool.query(text, params);
    return { changes: result.rowCount, lastID: result.rows[0]?.id || null, rows: result.rows };
  },
};

async function setupDb() {
  const client = await pool.connect();
  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${SCHEMA_NAME}"`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS "${SCHEMA_NAME}".usagers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        civilite VARCHAR(10) NOT NULL DEFAULT 'M.',
        nom VARCHAR(150) NOT NULL,
        prenom VARCHAR(150) NOT NULL,
        nom_usage VARCHAR(150),
        date_naissance DATE NOT NULL,
        lieu_naissance VARCHAR(255),
        pays_naissance VARCHAR(100) DEFAULT 'France',
        nationalite VARCHAR(100) DEFAULT 'Francaise',
        situation_familiale VARCHAR(50),
        email VARCHAR(255),
        telephone VARCHAR(20),
        mobile VARCHAR(20),
        Adresse VARCHAR(500),
        complement_adresse VARCHAR(255),
        code_postal VARCHAR(5),
        ville VARCHAR(255),
        pays VARCHAR(100) DEFAULT 'France',
        mail_actif BOOLEAN DEFAULT TRUE,
        consentement_rgpd BOOLEAN NOT NULL DEFAULT FALSE,
        date_consentement TIMESTAMPTZ,
        motif_archivage TEXT,
        archived BOOLEAN DEFAULT FALSE,
        date_archivage TIMESTAMPTZ,
        created_by VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS "${SCHEMA_NAME}".templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nom VARCHAR(255) NOT NULL,
        description TEXT,
        fichier_original VARCHAR(500) NOT NULL,
        variables JSONB NOT NULL DEFAULT '[]',
        actif BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS "${SCHEMA_NAME}".attestations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        usager_id UUID NOT NULL REFERENCES "${SCHEMA_NAME}".usagers(id) ON DELETE CASCADE,
        template_id UUID NOT NULL REFERENCES "${SCHEMA_NAME}".templates(id) ON DELETE RESTRICT,
        titre VARCHAR(255) NOT NULL,
        contenu_genere JSONB NOT NULL DEFAULT '{}',
        fichier_pdf VARCHAR(500),
        statut VARCHAR(50) DEFAULT 'brouillon',
        date_generation TIMESTAMPTZ,
        genere_par VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS "${SCHEMA_NAME}".consentements_rgpd (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        usager_id UUID NOT NULL REFERENCES "${SCHEMA_NAME}".usagers(id) ON DELETE CASCADE,
        type_consentement VARCHAR(100) NOT NULL,
        consentement BOOLEAN NOT NULL,
        date_consentement TIMESTAMPTZ DEFAULT NOW(),
        ip_address VARCHAR(45),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS "${SCHEMA_NAME}".logs_acces (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        utilisateur VARCHAR(100),
        action VARCHAR(100) NOT NULL,
        table_concernee VARCHAR(100),
        record_id UUID,
        details JSONB,
        ip_address VARCHAR(45),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "${SCHEMA_NAME}".users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        login VARCHAR(100) NOT NULL UNIQUE,
        nom VARCHAR(150) NOT NULL,
        prenom VARCHAR(150) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) DEFAULT '',
        role VARCHAR(50) NOT NULL DEFAULT 'utilisateur',
        fonction VARCHAR(200),
        service VARCHAR(200),
        direction VARCHAR(200),
        source VARCHAR(50) DEFAULT 'local',
        actif BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "${SCHEMA_NAME}".config_params (
        cle VARCHAR(100) PRIMARY KEY,
        valeur TEXT,
        description VARCHAR(255),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const alterCols = [
      `ALTER TABLE "${SCHEMA_NAME}".users ADD COLUMN IF NOT EXISTS fonction VARCHAR(200)`,
      `ALTER TABLE "${SCHEMA_NAME}".users ADD COLUMN IF NOT EXISTS service VARCHAR(200)`,
      `ALTER TABLE "${SCHEMA_NAME}".users ADD COLUMN IF NOT EXISTS direction VARCHAR(200)`,
      `ALTER TABLE "${SCHEMA_NAME}".users ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'local'`,
    ];
    for (const sql of alterCols) await client.query(sql);

    const dropCols = [
      `ALTER TABLE "${SCHEMA_NAME}".usagers DROP COLUMN IF EXISTS numero_voie`,
      `ALTER TABLE "${SCHEMA_NAME}".usagers DROP COLUMN IF EXISTS type_voie`,
      `ALTER TABLE "${SCHEMA_NAME}".usagers DROP COLUMN IF EXISTS nom_voie`,
    ];
    for (const sql of dropCols) await client.query(sql);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_usagers_nom ON "${SCHEMA_NAME}".usagers(nom);
      CREATE INDEX IF NOT EXISTS idx_usagers_prenom ON "${SCHEMA_NAME}".usagers(prenom);
      CREATE INDEX IF NOT EXISTS idx_usagers_archived ON "${SCHEMA_NAME}".usagers(archived);
      CREATE INDEX IF NOT EXISTS idx_usagers_email ON "${SCHEMA_NAME}".usagers(email);
      CREATE INDEX IF NOT EXISTS idx_attestations_usager ON "${SCHEMA_NAME}".attestations(usager_id);
      CREATE INDEX IF NOT EXISTS idx_attestations_statut ON "${SCHEMA_NAME}".attestations(statut);
      CREATE INDEX IF NOT EXISTS idx_logs_acces_action ON "${SCHEMA_NAME}".logs_acces(action);
    `);

    console.log(`[DB] Schema "${SCHEMA_NAME}" initialized`);
  } finally {
    client.release();
  }
}

module.exports = { pool, db, setupDb, SCHEMA_NAME };
