require("dotenv").config({ path: require("path").resolve(__dirname, "../../../.env") });
const path = require("path");
const XLSX = require("xlsx");
const { pool, SCHEMA_NAME, setupDb } = require("../config/pg_db");

// Frise chronologique des demandes CNI/Passeport, depuis ETAPES.xls (table
// ALTO.ETAPE_DEMANDE) : une ligne par changement d'etat, avec sa date reelle.
// Contrairement a OBSERV_INT (DEMANDES.xls, deja repris en suivi), le champ
// OBSERVATION de ce fichier est vide 99.97% du temps (106/405 137 lignes CNI/
// PAS/CNIPAS) : ce n'est pas un journal de commentaires mais un pur historique
// d'etats horodates. On le stocke donc en frise structuree (dossier_piece_etapes)
// plutot qu'en commentaires de suivi, pour eviter de noyer les vrais
// commentaires sous ~4 lignes quasi-vides par dossier.
//
// Le lien avec nos dossier_pieces se fait via legacy_id_demande (l'ID_DEMANDE
// ---CNI ou ---PAS d'origine, stocke lors de l'import principal), pas via
// l'ID_DEMANDE des lignes de type CNIPAS (qui ne sont qu'un regroupement).

const ETAPES_FILE = process.env.IMPORT_ETAPES_FILE || path.resolve(__dirname, "../../../xls/ETAPES.xls");
const CREATED_BY = "IMPORT_LEGACY";
const BATCH_SIZE = 500;

// Table de correspondance CODE_ETAT_AVANC|SOUS_CODE_ETAT_AVANC|CODE_ETAT_DEMANDE
// -> libelle FR + statut GRU equivalent (pour la couleur du point sur la frise).
// Couvre les 19 combinaisons presentes sur les 405 137 etapes CNI/PAS/CNIPAS ;
// tout code non reconnu est affiche tel quel (libelle = code brut) avec un avertissement.
const STEP_LABELS = {
  "TRAN|PREF|COMP": { libelle: "Transmis en préfecture", statut: "demande" },
  "RTOU|PRET|PRET": { libelle: "Retour en mairie, prêt", statut: "arrive" },
  "DEPO|NULL|COMP": { libelle: "Dossier déposé", statut: "demande" },
  "RTIR|DEMA|RTIR": { libelle: "Retiré par le demandeur", statut: "recupere" },
  "DEPO|CIPA|COMP": { libelle: "Dossier déposé (CNI + Passeport)", statut: "demande" },
  "RTIR|MAND|RTIR": { libelle: "Retiré par un mandataire", statut: "recupere" },
  "RTOU|AJRN|AJRN": { libelle: "Retour, dossier ajourné", statut: "ajourne" },
  "ACTU|AJRN|COMP": { libelle: "Dossier actualisé, ajourné", statut: "ajourne" },
  "RELN|TELE|PRET": { libelle: "Relance téléphonique (dossier prêt)", statut: "arrive" },
  "ACTU|INCP|COMP": { libelle: "Dossier actualisé, incomplet", statut: "ajourne" },
  "ACTU|AJRN|INCP": { libelle: "Actualisation, ajourné, incomplet", statut: "ajourne" },
  "ACTU|NCFM|NCFM": { libelle: "Actualisation, non conforme", statut: "ajourne" },
  "TRAN|PREF|NCFM": { libelle: "Transmis en préfecture, non conforme", statut: "ajourne" },
  "ACTU|COMP|INCP": { libelle: "Actualisation, dossier incomplet", statut: "ajourne" },
  "RENV|NULL|RENV": { libelle: "Dossier renvoyé", statut: "ajourne" },
  "RTIR|AUTR|RTIR": { libelle: "Retiré (autre)", statut: "recupere" },
  "DEPO|NULL|INCP": { libelle: "Dossier déposé, incomplet", statut: "ajourne" },
  "RTOU|REFU|REFU": { libelle: "Refusé", statut: "refuse" },
  "RELN|TELE|RTIR": { libelle: "Relance téléphonique, retiré", statut: "recupere" },
};

function cleanText(v) {
  if (v === null || v === undefined) return null;
  let s = String(v).replace(/ /g, " ").trim();
  return s === "" ? null : s;
}

function toInt(v) {
  const s = cleanText(v);
  if (!s) return null;
  const m = s.match(/^(-?\d+)(?:\.0+)?$/);
  return m ? parseInt(m[1], 10) : null;
}

function parseDateTime(dateV, heureV) {
  const d = cleanText(dateV);
  if (!d || d === "0" || !/^\d{8}$/.test(d)) return null;
  const y = d.slice(0, 4), mo = d.slice(4, 6), da = d.slice(6, 8);
  let h = "00", mi = "00", s = "00";
  const hv = cleanText(heureV);
  if (hv && /^\d{1,6}$/.test(hv)) {
    const padded = hv.padStart(6, "0");
    h = padded.slice(0, 2);
    mi = padded.slice(2, 4);
    s = padded.slice(4, 6);
  }
  return `${y}-${mo}-${da}T${h}:${mi}:${s}Z`;
}

function labelOf(row) {
  const key = [cleanText(row.CODE_ETAT_AVANC), cleanText(row.SOUS_CODE_ETAT_AVANC), cleanText(row.CODE_ETAT_DEMANDE)].join("|");
  const found = STEP_LABELS[key];
  if (!found) {
    console.log(`[IMPORT ETAPES] code inconnu "${key}" (ID_DEMANDE=${row.ID_DEMANDE}) -> libelle brut`);
    return { libelle: key, statut: null, code: key };
  }
  return { libelle: found.libelle, statut: found.statut, code: key };
}

async function importEtapes() {
  await setupDb();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const del = await client.query(`
      DELETE FROM "${SCHEMA_NAME}".dossier_piece_etapes
      WHERE dossier_piece_id IN (
        SELECT p.id FROM "${SCHEMA_NAME}".dossier_pieces p
        JOIN "${SCHEMA_NAME}".dossiers_pieces_identite d ON d.id = p.dossier_id
        WHERE d.created_by = $1
      )
    `, [CREATED_BY]);
    console.log(`[IMPORT ETAPES] anciennes etapes IMPORT_LEGACY supprimees: ${del.rowCount}`);

    const piecesRes = await client.query(`
      SELECT p.id, p.legacy_id_demande FROM "${SCHEMA_NAME}".dossier_pieces p
      JOIN "${SCHEMA_NAME}".dossiers_pieces_identite d ON d.id = p.dossier_id
      WHERE d.created_by = $1 AND p.legacy_id_demande IS NOT NULL
    `, [CREATED_BY]);
    const pieceByLegacyId = new Map();
    for (const r of piecesRes.rows) pieceByLegacyId.set(r.legacy_id_demande, r.id);
    console.log(`[IMPORT ETAPES] pieces avec legacy_id_demande: ${pieceByLegacyId.size}`);

    console.log("[IMPORT ETAPES] lecture:", ETAPES_FILE);
    const wb = XLSX.readFile(ETAPES_FILE);
    const rows = XLSX.utils.sheet_to_json(wb.Sheets["ALTO.ETAPE_DEMANDE"], { defval: "" });
    console.log(`[IMPORT ETAPES] ETAPES: ${rows.length} lignes (tous types)`);

    const byDemande = new Map();
    for (const r of rows) {
      const id = toInt(r.ID_DEMANDE);
      if (!id || !pieceByLegacyId.has(id)) continue;
      if (!byDemande.has(id)) byDemande.set(id, []);
      byDemande.get(id).push(r);
    }
    console.log(`[IMPORT ETAPES] demandes avec au moins une etape rattachee a une piece: ${byDemande.size}`);

    const etapesToInsert = [];
    let skippedNoDate = 0;
    for (const [legacyId, stepRows] of byDemande) {
      const pieceId = pieceByLegacyId.get(legacyId);
      stepRows.sort((a, b) => (toInt(a.COMPTEUR) || 0) - (toInt(b.COMPTEUR) || 0));
      let ordre = 0;
      for (const r of stepRows) {
        const date_etape = parseDateTime(r.DATE_ETAT, r.HEURE_ETAT);
        if (!date_etape) {
          skippedNoDate++;
          continue;
        }
        ordre++;
        const { libelle, statut, code } = labelOf(r);
        etapesToInsert.push({
          dossier_piece_id: pieceId,
          ordre: toInt(r.COMPTEUR) || ordre,
          date_etape,
          libelle,
          statut_equivalent: statut,
          code_legacy: code,
        });
      }
    }
    console.log(`[IMPORT ETAPES] etapes a inserer: ${etapesToInsert.length}`);
    console.log(`[IMPORT ETAPES] ignorees (date invalide): ${skippedNoDate}`);

    let inserted = 0;
    for (let i = 0; i < etapesToInsert.length; i += BATCH_SIZE) {
      const batch = etapesToInsert.slice(i, i + BATCH_SIZE);
      const valuesSql = [];
      const params = [];
      for (const e of batch) {
        const base = params.length;
        valuesSql.push(`($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6})`);
        params.push(e.dossier_piece_id, e.ordre, e.date_etape, e.libelle, e.statut_equivalent, e.code_legacy);
      }
      await client.query(
        `INSERT INTO "${SCHEMA_NAME}".dossier_piece_etapes
           (dossier_piece_id, ordre, date_etape, libelle, statut_equivalent, code_legacy)
         VALUES ${valuesSql.join(",")}`,
        params
      );
      inserted += batch.length;
      console.log(`[IMPORT ETAPES] ... ${inserted}/${etapesToInsert.length} etapes`);
    }

    await client.query("COMMIT");
    console.log("[IMPORT ETAPES] OK");
    console.log(`[IMPORT ETAPES] etapes creees: ${inserted}`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  importEtapes()
    .then(() => pool.end())
    .catch((err) => {
      console.error("[IMPORT ETAPES] FAILED:", err);
      process.exitCode = 1;
    });
}

module.exports = { importEtapes };
