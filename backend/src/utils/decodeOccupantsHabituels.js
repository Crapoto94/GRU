require("dotenv").config({ path: require("path").resolve(__dirname, "../../../.env") });
const { pool, SCHEMA_NAME } = require("../config/pg_db");
const { decodeOccupantsHabituels, RAW_PATTERN, loadLienParenteLabels } = require("./occupantsHabituels");

// Correctif ponctuel : les logements deja importes stockent OCCUP_HABITUELS
// tel quel (format brut legacy, ex: "03**033|00|24;001|00|12;009|00|11"),
// illisible pour un agent. Ce script decode et remplace le texte en place,
// UNIQUEMENT sur la table logements (pas de TRUNCATE, pas de cascade sur
// usagers/dossier_pieces). importLegacy.js decode desormais directement a
// l'import, ce script ne sert que pour les logements deja en base.
//
// Source de verite : usagers_historique.data->>'OCCUP_HABITUELS' (snapshot
// brut jamais modifie), pas logements.occupants_habituels_details — au cas
// ou ce dernier a deja ete (mal) decode par une execution precedente de ce
// script, on ne pourrait plus repartir du texte brut depuis cette colonne.
// On reprend la meme selection "canonique" que importLegacy.js (derniere
// version DERNIER_ETAT='O', sinon derniere version tout court).

async function run() {
  const client = await pool.connect();
  try {
    const lienLabels = await loadLienParenteLabels(client, SCHEMA_NAME);
    console.log(`[DECODE] table de correspondance lien_parente : ${lienLabels.size} codes`);

    const res = await client.query(
      `SELECT l.id, l.usager_id,
         (SELECT data->>'OCCUP_HABITUELS' FROM "${SCHEMA_NAME}".usagers_historique h
          WHERE h.usager_id = l.usager_id
          ORDER BY (h.derni_etat)::int DESC, h.legacy_id_enreg DESC
          LIMIT 1) as raw_occup
       FROM "${SCHEMA_NAME}".logements l`
    );
    console.log(`[DECODE] logements: ${res.rows.length}`);

    const toUpdate = [];
    let noRaw = 0;
    const unknownCodes = new Set();
    for (const row of res.rows) {
      if (!row.raw_occup || !RAW_PATTERN.test(row.raw_occup)) {
        noRaw++;
        continue;
      }
      const decoded = decodeOccupantsHabituels(row.raw_occup, lienLabels);
      const m = row.raw_occup.match(/\|(\d+)(?=;|$)/g) || [];
      for (const mm of m) {
        const code = String(parseInt(mm.slice(1), 10));
        if (!lienLabels.has(code)) unknownCodes.add(code);
      }
      toUpdate.push({ id: row.id, decoded });
    }
    console.log(`[DECODE] sans OCCUP_HABITUELS brut exploitable (ignores) : ${noRaw}`);
    console.log(`[DECODE] a decoder : ${toUpdate.length}`);
    if (unknownCodes.size) {
      console.log(`[DECODE] codes lien_parente absents de la table de correspondance : ${[...unknownCodes].sort().join(", ")}`);
    }

    await client.query("BEGIN");
    for (const { id, decoded } of toUpdate) {
      await client.query(
        `UPDATE "${SCHEMA_NAME}".logements SET occupants_habituels_details = $1 WHERE id = $2`,
        [decoded, id]
      );
    }
    await client.query("COMMIT");
    console.log(`[DECODE] OK - ${toUpdate.length} logements mis a jour`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  run()
    .then(() => pool.end())
    .catch((err) => {
      console.error("[DECODE] FAILED:", err);
      process.exitCode = 1;
    });
}

module.exports = { run };
