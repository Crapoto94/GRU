require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { pool, SCHEMA_NAME, setupDb } = require("./src/config/pg_db");
(async () => {
  await setupDb();
  const updated = await pool.query(
    `UPDATE "${SCHEMA_NAME}".attestations a
     SET contenu_genere = jsonb_set(a.contenu_genere, '{Lien de parenté}', to_jsonb(COALESCE(lrv.label, '')), true),
         updated_at = NOW()
     FROM "${SCHEMA_NAME}".attestations_ada ada
     LEFT JOIN "${SCHEMA_NAME}".listes_reference lr ON lr.cle = 'lien_parente'
     LEFT JOIN "${SCHEMA_NAME}".listes_reference_valeurs lrv ON lrv.liste_id = lr.id AND lrv.code = ada.lien_parente_code::text
     WHERE (a.contenu_genere->>'Numéro demande legacy')::bigint = ada.legacy_id_demande
       AND a.statut = 'import_alto'
       AND a.contenu_genere->>'Lien de parenté' IS NOT NULL
       AND a.contenu_genere->>'Lien de parenté' <> COALESCE(lrv.label, '')`
  );
  const lists = await pool.query(
    `SELECT l.cle, l.nom, l.id, count(v.id) nb FROM "${SCHEMA_NAME}".listes_reference l
     LEFT JOIN "${SCHEMA_NAME}".listes_reference_valeurs v ON v.liste_id = l.id
     GROUP BY l.id ORDER BY l.nom`
  );
  const dist = await pool.query(
    `SELECT lrv.code, lrv.label, count(*) nb FROM "${SCHEMA_NAME}".attestations_ada ada
     LEFT JOIN "${SCHEMA_NAME}".listes_reference lr ON lr.cle='lien_parente'
     LEFT JOIN "${SCHEMA_NAME}".listes_reference_valeurs lrv ON lrv.liste_id=lr.id AND lrv.code=ada.lien_parente_code::text
     GROUP BY lrv.code, lrv.label ORDER BY lrv.code::int`
  );
  console.log(JSON.stringify({ attestationsMaj: updated.rowCount, listes: lists.rows, distribution: dist.rows }, null, 2));
  await pool.end();
})().catch((e) => { console.error(e); process.exit(1); });