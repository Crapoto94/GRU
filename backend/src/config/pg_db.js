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
        usage_logement_principal BOOLEAN NOT NULL DEFAULT FALSE,
        usage_logement_secondaire BOOLEAN NOT NULL DEFAULT FALSE,
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
      CREATE TABLE IF NOT EXISTS "${SCHEMA_NAME}".logements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        usager_id UUID NOT NULL REFERENCES "${SCHEMA_NAME}".usagers(id) ON DELETE CASCADE,
        type_logement VARCHAR(20) NOT NULL DEFAULT 'principal' CHECK (type_logement IN ('principal','secondaire')),
        adresse VARCHAR(500),
        complement_adresse VARCHAR(255),
        code_postal VARCHAR(5),
        ville VARCHAR(255),
        pays VARCHAR(100) DEFAULT 'France',
        numero_batiment_escalier VARCHAR(255),
        surface_logement NUMERIC(6,2),
        nombre_pieces INTEGER,
        etat_sanitaire VARCHAR(100),
        occupants_habituels_details TEXT,
        occupants_permanents INTEGER,
        occupants_temporaires INTEGER,
        statut_occupation VARCHAR(20) CHECK (statut_occupation IN ('proprietaire','locataire','autre')),
        statut_occupation_precision VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(usager_id, type_logement)
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS "${SCHEMA_NAME}".dossiers_pieces_identite (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_by VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS "${SCHEMA_NAME}".dossier_pieces (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        dossier_id UUID NOT NULL REFERENCES "${SCHEMA_NAME}".dossiers_pieces_identite(id) ON DELETE CASCADE,
        usager_id UUID NOT NULL REFERENCES "${SCHEMA_NAME}".usagers(id) ON DELETE RESTRICT,
        type_piece VARCHAR(20) NOT NULL CHECK (type_piece IN ('CNI','Passeport')),
        date_demande DATE NOT NULL,
        statut VARCHAR(20) NOT NULL DEFAULT 'demande' CHECK (statut IN ('demande','ajourne','arrive','recupere')),
        destinataire_usager_id UUID REFERENCES "${SCHEMA_NAME}".usagers(id) ON DELETE SET NULL,
        canal_notification VARCHAR(10) NOT NULL DEFAULT 'email' CHECK (canal_notification IN ('sms','email','both')),
        date_arrivee TIMESTAMPTZ,
        date_recuperation TIMESTAMPTZ,
        notifie BOOLEAN NOT NULL DEFAULT FALSE,
        date_notification TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(dossier_id, usager_id, type_piece)
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS "${SCHEMA_NAME}".dossier_suivi (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        dossier_id UUID NOT NULL REFERENCES "${SCHEMA_NAME}".dossiers_pieces_identite(id) ON DELETE CASCADE,
        agent VARCHAR(100) NOT NULL,
        commentaire TEXT NOT NULL,
        automatique BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS "${SCHEMA_NAME}".dossier_notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        dossier_piece_id UUID NOT NULL REFERENCES "${SCHEMA_NAME}".dossier_pieces(id) ON DELETE CASCADE,
        canal VARCHAR(10) NOT NULL CHECK (canal IN ('sms','email')),
        destinataire VARCHAR(255) NOT NULL,
        statut VARCHAR(20) NOT NULL CHECK (statut IN ('envoye','echec')),
        erreur TEXT,
        envoye_par VARCHAR(100) NOT NULL,
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
      `ALTER TABLE "${SCHEMA_NAME}".templates ADD COLUMN IF NOT EXISTS nb_usagers INTEGER DEFAULT 1`,
      `ALTER TABLE "${SCHEMA_NAME}".templates ADD COLUMN IF NOT EXISTS usager_labels JSONB DEFAULT NULL`,
      `ALTER TABLE "${SCHEMA_NAME}".attestations ADD COLUMN IF NOT EXISTS usager2_id UUID REFERENCES "${SCHEMA_NAME}".usagers(id) ON DELETE SET NULL`,
      `ALTER TABLE "${SCHEMA_NAME}".attestations ADD COLUMN IF NOT EXISTS usager3_id UUID REFERENCES "${SCHEMA_NAME}".usagers(id) ON DELETE SET NULL`,
      `ALTER TABLE "${SCHEMA_NAME}".dossier_suivi ADD COLUMN IF NOT EXISTS automatique BOOLEAN NOT NULL DEFAULT FALSE`,
      `ALTER TABLE "${SCHEMA_NAME}".logements ADD COLUMN IF NOT EXISTS type_logement VARCHAR(20) NOT NULL DEFAULT 'principal'`,
      `ALTER TABLE "${SCHEMA_NAME}".logements ADD COLUMN IF NOT EXISTS adresse VARCHAR(500)`,
      `ALTER TABLE "${SCHEMA_NAME}".logements ADD COLUMN IF NOT EXISTS complement_adresse VARCHAR(255)`,
      `ALTER TABLE "${SCHEMA_NAME}".logements ADD COLUMN IF NOT EXISTS code_postal VARCHAR(5)`,
      `ALTER TABLE "${SCHEMA_NAME}".logements ADD COLUMN IF NOT EXISTS ville VARCHAR(255)`,
      `ALTER TABLE "${SCHEMA_NAME}".logements ADD COLUMN IF NOT EXISTS pays VARCHAR(100) DEFAULT 'France'`,
      `ALTER TABLE "${SCHEMA_NAME}".templates ADD COLUMN IF NOT EXISTS usage_logement_principal BOOLEAN NOT NULL DEFAULT FALSE`,
      `ALTER TABLE "${SCHEMA_NAME}".templates ADD COLUMN IF NOT EXISTS usage_logement_secondaire BOOLEAN NOT NULL DEFAULT FALSE`,
    ];
    for (const sql of alterCols) await client.query(sql);

    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'logements_usager_id_key') THEN
          ALTER TABLE "${SCHEMA_NAME}".logements DROP CONSTRAINT logements_usager_id_key;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'logements_usager_id_type_logement_key') THEN
          ALTER TABLE "${SCHEMA_NAME}".logements ADD CONSTRAINT logements_usager_id_type_logement_key UNIQUE (usager_id, type_logement);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'logements_type_logement_check') THEN
          ALTER TABLE "${SCHEMA_NAME}".logements ADD CONSTRAINT logements_type_logement_check CHECK (type_logement IN ('principal','secondaire'));
        END IF;
      END $$;
    `);

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
      CREATE INDEX IF NOT EXISTS idx_dossier_pieces_dossier ON "${SCHEMA_NAME}".dossier_pieces(dossier_id);
      CREATE INDEX IF NOT EXISTS idx_dossier_pieces_usager ON "${SCHEMA_NAME}".dossier_pieces(usager_id);
      CREATE INDEX IF NOT EXISTS idx_dossier_pieces_statut ON "${SCHEMA_NAME}".dossier_pieces(statut);
      CREATE INDEX IF NOT EXISTS idx_dossier_suivi_dossier ON "${SCHEMA_NAME}".dossier_suivi(dossier_id);
    `);

    console.log(`[DB] Schema "${SCHEMA_NAME}" initialized`);
  } finally {
    client.release();
  }
}

module.exports = { pool, db, setupDb, SCHEMA_NAME };
