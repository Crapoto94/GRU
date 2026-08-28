require("dotenv").config({ path: require("path").resolve(__dirname, "../../../.env") });
const path = require("path");
const XLSX = require("xlsx");
const { pool, SCHEMA_NAME, setupDb } = require("../config/pg_db");

// Import des demandes de CNI/Passeport depuis l'export ALTO.
//
// IMPORTANT : le lien vers l'usager ne se fait PAS via l'ID_DEMANDE des
// fichiers CNI.xls/PAS.xls (celui-ci n'est qu'un identifiant de ligne,
// tire de la meme sequence Oracle globale que les ID_ENREG des individus :
// le faire correspondre directement donnait ~68% de "matchs" totalement
// fortuits, sur des personnes sans rapport). Le vrai lien est dans
// DEMANDES.xls (table ALTO.DEMANDE), qui donne pour chaque ID_DEMANDE :
//   - ID_DEMANDEUR / ID_BENEFICIAIRE / ID_DESTINATAIRE (= legacy_id_enreg)
//   - DATE_DEPOT / DATE_RETOUR / DATE_RETRAIT
//   - CODE_ETAT_AVANC / SOUS_CODE_ETAT_AVANC / CODE_ETAT (statut)
//   - OBSERV_INT (commentaire agent)
// Verifie sur les 100 945 demandes CNI/PAS/CNIPAS : 100% de resolution
// usager via ID_DEMANDEUR/ID_BENEFICIAIRE/ID_DESTINATAIRE.
//
// CNIPAS.xls reste necessaire pour savoir quelles lignes ---CNI et ---PAS
// (filles) sont regroupees sous une meme demande CNIPAS (mere) : le
// beneficiaire est identique sur les 3 lignes (verifie sur 2000 echantillons)
// mais chaque piece avance a son propre rythme (statut independant).

const DEMANDES_FILE = process.env.IMPORT_DEMANDES_FILE || path.resolve(__dirname, "../../../xls/DEMANDES.xls");
const CNIPAS_FILE = process.env.IMPORT_CNIPAS_FILE || path.resolve(__dirname, "../../../xls/CNIPAS.xls");

const CREATED_BY = "IMPORT_LEGACY";
const BATCH_SIZE = 300;

// Colonnes de la 2e feuille (Sheet1) de DEMANDES.xls : export sans ligne
// d'entete, mais dans le meme ordre que la feuille ALTO.DEMANDE (moins les
// colonnes HEURE_* toujours vides, non exportees).
const DEMANDE_COLS = [
  "ID_DEMANDE", "ID_SITE_DEPOT", "ID_SITE_RETRAIT", "ID_SITE_PRESENCE", "ID_DEMANDEUR", "ID_ORIG_DEMANDEUR",
  "ID_BENEFICIAIRE", "ID_ORIG_BENEFICIAIRE", "ID_CONJOINT_BENEFICIAIRE", "ID_PERE_BENEFICIAIRE", "ID_MERE_BENEFICIAIRE",
  "ID_DESTINATAIRE", "ID_BORDEREAU", "ANNEE_BORDEREAU", "NUM_BORDEREAU", "RANG_BORDEREAU", "CODE_TYPE_DEMANDE",
  "ID_TIMBRE", "ANNEE", "NUM", "URGENT", "REMETTRE_ANC_PIECE", "PRES_OBLI", "DATE_DEPOT", "DATE_TRANSMISSION",
  "DATE_RETOUR", "DELAI_RETOUR", "DATE_RETRAIT", "DELAI_RETRAIT", "DATE_RENVOI", "DATE_ETAPE", "CODE_ETAT_AVANC",
  "SOUS_CODE_ETAT_AVANC", "NO_BORDEREAU_RETOUR", "ETAT_CPT", "OBSERV_INT", "CODE_ETAT", "CODE_USER", "AU_TITRE_DE",
  "ANNEE_RETOUR", "NUM_RETOUR", "ID_LIAISON", "HIDDEN",
];

// Table de correspondance CODE_ETAT_AVANC|SOUS_CODE_ETAT_AVANC|CODE_ETAT -> statut GRU.
// Deduite des dates renseignees (DATE_RETOUR/DATE_RETRAIT) et des commentaires
// OBSERV_INT (ex: "rejet le 16/8/2021 / dossier est rejete par la pref").
// Couvre les 15 combinaisons presentes sur les 100 945 demandes CNI/PAS/CNIPAS ;
// tout code non reconnu tombe sur 'demande' par defaut avec un avertissement.
const STATUT_MAP = {
  "RTIR|DEMA|RTIR": "recupere",
  "RTIR|MAND|RTIR": "recupere",
  "RTIR|AUTR|RTIR": "recupere",
  "RELN|TELE|RTIR": "recupere",
  "TRAN|PREF|HIDE": "demande",
  "TRAN|PREF|COMP": "demande",
  "DEPO|NULL|COMP": "demande",
  "RTOU|PRET|PRET": "arrive",
  "RELN|TELE|PRET": "arrive",
  "RENV|NULL|RENV": "ajourne",
  "RTOU|AJRN|AJRN": "ajourne",
  "ACTU|AJRN|INCP": "ajourne",
  "ACTU|AJRN|COMP": "ajourne",
  "TRAN|PREF|NCFM": "ajourne",
  "RTOU|REFU|REFU": "refuse",
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

function parseDate(v) {
  const s = cleanText(v);
  if (!s || s === "0") return null;
  if (/^\d{8}$/.test(s)) {
    const y = parseInt(s.slice(0, 4), 10);
    const m = parseInt(s.slice(4, 6), 10);
    const d = parseInt(s.slice(6, 8), 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
    }
  }
  return null;
}

function statutOf(row) {
  const key = [cleanText(row.CODE_ETAT_AVANC), cleanText(row.SOUS_CODE_ETAT_AVANC), cleanText(row.CODE_ETAT)].join("|");
  const s = STATUT_MAP[key];
  if (!s) {
    console.log(`[IMPORT CNI/PAS] code statut inconnu "${key}" (ID_DEMANDE=${row.ID_DEMANDE}) -> demande par defaut`);
    return "demande";
  }
  return s;
}

// Le classeur ALTO depasse la limite de 65 536 lignes/feuille du format .xls :
// l'export se scinde en une feuille "primaire" nommee dynamiquement (avec
// entete, ex: ALTO.DEMANDE ou ALTOIVR.DEMANDE selon l'export) suivie d'autant
// de feuilles "SheetN" sans entete que necessaire, dans le meme ordre de
// colonnes. On ne doit donc jamais figer le nom de la feuille primaire.
function findHeaderSheet(wb, keyCol) {
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws || !ws["!ref"]) continue;
    const first = XLSX.utils.sheet_to_json(ws, { header: 1, range: 0, defval: "" })[0] || [];
    if (first.includes(keyCol)) return name;
  }
  return null;
}

function readDemandesFile(file) {
  const wb = XLSX.readFile(file);
  const primaryName = findHeaderSheet(wb, "ID_DEMANDEUR");
  if (!primaryName) throw new Error(`${file}: aucune feuille avec la colonne ID_DEMANDEUR`);
  const rowsA = XLSX.utils.sheet_to_json(wb.Sheets[primaryName], { defval: "" });

  let rowsB = [];
  for (const name of wb.SheetNames) {
    if (name === primaryName || name === "SQL") continue;
    // Chaque feuille complementaire commence par une ligne vide (artefact de
    // l'export), les donnees demarrent en ligne 2.
    const raw = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: "", range: 1 });
    const mapped = raw
      .filter((r) => r.length > 1)
      .map((r) => {
        const o = {};
        DEMANDE_COLS.forEach((c, i) => (o[c] = r[i] === undefined ? "" : r[i]));
        return o;
      });
    rowsB = rowsB.concat(mapped);
  }
  console.log(`[IMPORT CNI/PAS] DEMANDES: feuille primaire "${primaryName}" (${rowsA.length} lignes) + ${wb.SheetNames.length - 2} feuille(s) complementaire(s) (${rowsB.length} lignes)`);
  return rowsA.concat(rowsB);
}

function readCniPasGroups(file) {
  const wb = XLSX.readFile(file);
  const name = wb.SheetNames.find((n) => /DEMANDE_CNIPAS/i.test(n)) || wb.SheetNames[0];
  return XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: "" });
}

async function importCniPas() {
  await setupDb();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const del = await client.query(
      `DELETE FROM "${SCHEMA_NAME}".dossiers_pieces_identite WHERE created_by = $1`,
      [CREATED_BY]
    );
    console.log(`[IMPORT CNI/PAS] anciens dossiers IMPORT_LEGACY supprimes: ${del.rowCount}`);

    const histRes = await client.query(
      `SELECT usager_id, legacy_id_enreg FROM "${SCHEMA_NAME}".usagers_historique`
    );
    const byEnreg = new Map();
    for (const r of histRes.rows) byEnreg.set(String(r.legacy_id_enreg), r.usager_id);
    console.log(`[IMPORT CNI/PAS] usagers_historique: ${byEnreg.size} entrees`);

    console.log("[IMPORT CNI/PAS] lecture:", DEMANDES_FILE);
    const demandes = readDemandesFile(DEMANDES_FILE);
    console.log(`[IMPORT CNI/PAS] DEMANDES: ${demandes.length} lignes (tous types)`);

    console.log("[IMPORT CNI/PAS] lecture:", CNIPAS_FILE);
    const cpRows = readCniPasGroups(CNIPAS_FILE);
    console.log(`[IMPORT CNI/PAS] CNIPAS: ${cpRows.length} groupes`);

    const demandeById = new Map();
    for (const r of demandes) {
      const id = toInt(r.ID_DEMANDE);
      if (id) demandeById.set(id, r);
    }

    function resolveUsager(id) {
      if (!id) return null;
      return byEnreg.get(String(id)) || null;
    }

    function buildPiece(type_piece, row) {
      const date_arrivee = parseDate(row.DATE_RETOUR);
      const date_recuperation = parseDate(row.DATE_RETRAIT);
      return {
        type_piece,
        statut: statutOf(row),
        date_arrivee: date_arrivee ? `${date_arrivee}T00:00:00Z` : null,
        date_recuperation: date_recuperation ? `${date_recuperation}T00:00:00Z` : null,
        observation: cleanText(row.OBSERV_INT),
        observation_date: parseDate(row.DATE_ETAPE) || parseDate(row.DATE_DEPOT),
        legacy_id_demande: toInt(row.ID_DEMANDE),
      };
    }

    const dossiersToInsert = [];
    let skippedNoUsager = 0;
    let skippedNoDate = 0;
    const usedCni = new Set();
    const usedPas = new Set();

    for (const cp of cpRows) {
      const idBase = toInt(cp.ID_DEMANDE);
      const idCni = toInt(cp.ID_DEMANDE_CNI);
      const idPas = toInt(cp.ID_DEMANDE_PAS);
      if (idCni) usedCni.add(idCni);
      if (idPas) usedPas.add(idPas);

      const base = demandeById.get(idBase);
      const cniRow = idCni ? demandeById.get(idCni) : null;
      const pasRow = idPas ? demandeById.get(idPas) : null;
      if (!base || (!cniRow && !pasRow)) {
        skippedNoUsager++;
        continue;
      }
      const usager_id = resolveUsager(base.ID_BENEFICIAIRE);
      if (!usager_id) {
        skippedNoUsager++;
        continue;
      }
      const destinataire_usager_id = resolveUsager(base.ID_DESTINATAIRE) || usager_id;
      const date_demande = parseDate(base.DATE_DEPOT);
      if (!date_demande) {
        skippedNoDate++;
        continue;
      }
      const pieces = [];
      const observations = [];
      if (cniRow) {
        const p = buildPiece("CNI", cniRow);
        pieces.push(p);
        if (p.observation) observations.push({ date: p.observation_date, texte: `[CNI] ${p.observation}` });
      }
      if (pasRow) {
        const p = buildPiece("Passeport", pasRow);
        pieces.push(p);
        if (p.observation) observations.push({ date: p.observation_date, texte: `[Passeport] ${p.observation}` });
      }
      const baseObs = cleanText(base.OBSERV_INT);
      if (baseObs) observations.push({ date: parseDate(base.DATE_ETAPE) || date_demande, texte: baseObs });
      if (!pieces.length) {
        skippedNoUsager++;
        continue;
      }
      dossiersToInsert.push({ usager_id, destinataire_usager_id, date_demande, pieces, observations });
    }

    for (const [type_piece, codeType] of [["CNI", "---CNI"], ["Passeport", "---PAS"]]) {
      const usedSet = type_piece === "CNI" ? usedCni : usedPas;
      for (const [id, row] of demandeById) {
        if (row.CODE_TYPE_DEMANDE !== codeType) continue;
        if (usedSet.has(id)) continue;
        const usager_id = resolveUsager(row.ID_BENEFICIAIRE);
        if (!usager_id) {
          skippedNoUsager++;
          continue;
        }
        const destinataire_usager_id = resolveUsager(row.ID_DESTINATAIRE) || usager_id;
        const date_demande = parseDate(row.DATE_DEPOT);
        if (!date_demande) {
          skippedNoDate++;
          continue;
        }
        const p = buildPiece(type_piece, row);
        const observations = [];
        if (p.observation) observations.push({ date: p.observation_date, texte: p.observation });
        dossiersToInsert.push({ usager_id, destinataire_usager_id, date_demande, pieces: [p], observations });
      }
    }

    console.log(`[IMPORT CNI/PAS] dossiers a creer: ${dossiersToInsert.length}`);
    console.log(`[IMPORT CNI/PAS] ignores (usager introuvable): ${skippedNoUsager}`);
    console.log(`[IMPORT CNI/PAS] ignores (date de depot manquante): ${skippedNoDate}`);

    let dossierCount = 0;
    let pieceCount = 0;
    let suiviCount = 0;

    for (let i = 0; i < dossiersToInsert.length; i += BATCH_SIZE) {
      const batch = dossiersToInsert.slice(i, i + BATCH_SIZE);

      const dValuesSql = batch.map((_, idx) => `($${idx + 1})`).join(",");
      const dParams = batch.map(() => CREATED_BY);
      const dRes = await client.query(
        `INSERT INTO "${SCHEMA_NAME}".dossiers_pieces_identite (created_by) VALUES ${dValuesSql} RETURNING id`,
        dParams
      );
      batch.forEach((d, idx) => {
        d.dossier_id = dRes.rows[idx].id;
      });

      const pValuesSql = [];
      const pParams = [];
      for (const d of batch) {
        for (const p of d.pieces) {
          const base = pParams.length;
          pValuesSql.push(
            `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9})`
          );
          pParams.push(
            d.dossier_id,
            d.usager_id,
            p.type_piece,
            d.date_demande,
            p.statut,
            d.destinataire_usager_id,
            p.date_arrivee,
            p.date_recuperation,
            p.legacy_id_demande
          );
        }
      }
      if (pValuesSql.length) {
        await client.query(
          `INSERT INTO "${SCHEMA_NAME}".dossier_pieces
             (dossier_id, usager_id, type_piece, date_demande, statut, destinataire_usager_id, date_arrivee, date_recuperation, legacy_id_demande)
           VALUES ${pValuesSql.join(",")}`,
          pParams
        );
      }

      const sValuesSql = [];
      const sParams = [];
      for (const d of batch) {
        const base = sParams.length;
        sValuesSql.push(`($${base + 1},$${base + 2},$${base + 3},TRUE,$${base + 4})`);
        sParams.push(
          d.dossier_id,
          CREATED_BY,
          `Dossier importe depuis ALTO (legacy) avec ${d.pieces.length} piece(s).`,
          `${d.date_demande}T00:00:00Z`
        );
        for (const obs of d.observations) {
          const b2 = sParams.length;
          sValuesSql.push(`($${b2 + 1},$${b2 + 2},$${b2 + 3},TRUE,$${b2 + 4})`);
          sParams.push(d.dossier_id, CREATED_BY, obs.texte, obs.date ? `${obs.date}T00:00:00Z` : `${d.date_demande}T00:00:00Z`);
          suiviCount++;
        }
      }
      if (sValuesSql.length) {
        await client.query(
          `INSERT INTO "${SCHEMA_NAME}".dossier_suivi (dossier_id, agent, commentaire, automatique, created_at)
           VALUES ${sValuesSql.join(",")}`,
          sParams
        );
      }

      dossierCount += batch.length;
      pieceCount += pParams.length / 9;
      suiviCount += batch.length;
      console.log(`[IMPORT CNI/PAS] ... ${dossierCount}/${dossiersToInsert.length} dossiers (${pieceCount} pieces)`);
    }

    await client.query("COMMIT");
    console.log("[IMPORT CNI/PAS] OK");
    console.log(`[IMPORT CNI/PAS] dossiers crees: ${dossierCount}, pieces creees: ${pieceCount}, entrees de suivi: ${suiviCount}`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  importCniPas()
    .then(() => pool.end())
    .catch((err) => {
      console.error("[IMPORT CNI/PAS] FAILED:", err);
      process.exitCode = 1;
    });
}

module.exports = { importCniPas };
