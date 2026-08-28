require("dotenv").config({ path: require("path").resolve(__dirname, "../../../.env") });
const path = require("path");
const XLSX = require("xlsx");
const { extractRowsByColumn } = require("./xlsxStreamReader");
const { pool, SCHEMA_NAME, setupDb } = require("../config/pg_db");

const HIST_FILE = process.env.IMPORT_HIST_FILE || path.resolve(__dirname, "../../../xls/historique individus2.xlsx");
const ADA_FILE = process.env.IMPORT_ADA_FILE || path.resolve(__dirname, "../../../xls/ada2.xlsx");

const CREATED_BY = "IMPORT_LEGACY";

// Insere par lots (VALUES multiples) plutot que ligne par ligne : sur une base
// partagee avec d'autres applications, ~430 000 requetes individuelles dans
// une seule transaction gardent la table verrouillee en exclusif pendant tres
// longtemps (bloque toute l'appli, voire la base). Par lots, la meme quantite
// de donnees passe en quelques centaines de requetes.
async function batchInsert(client, table, columns, rows, { chunkSize = 500, returning = null, onConflict = "" } = {}) {
  const ids = [];
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const valuesSql = [];
    const params = [];
    for (const row of chunk) {
      const base = params.length;
      valuesSql.push(`(${columns.map((_, idx) => `$${base + idx + 1}`).join(",")})`);
      for (const c of columns) params.push(row[c]);
    }
    const sql = `INSERT INTO ${table} (${columns.join(",")}) VALUES ${valuesSql.join(",")} ${onConflict} ${
      returning ? `RETURNING ${returning}` : ""
    }`;
    const res = await client.query(sql, params);
    if (returning) for (const r of res.rows) ids.push(r[returning]);
  }
  return ids;
}

function cleanText(v) {
  if (v === null || v === undefined) return null;
  let s = String(v);
  s = s.replace(/\u00A0/g, " ");
  s = s.trim();
  if (s === "") return null;
  return s;
}

function fixMojibake(v) {
  const s = cleanText(v);
  if (!s) return s;
  if (!/[\u0080-\u024F]/.test(s)) return s;
  try {
    const dec = Buffer.from(s, "latin1").toString("utf8");
    if (!dec.includes("\uFFFD") && dec !== s) return dec;
  } catch {}
  return s;
}

function toInt(v) {
  const s = cleanText(v);
  if (!s) return null;
  const m = s.match(/^(-?\d+)$/);
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

function toBool(v) {
  const s = cleanText(v);
  if (!s) return null;
  const u = s.toUpperCase();
  if (u === "O" || u === "OUI" || u === "TRUE" || u === "true" || u === "1") return true;
  if (u === "N" || u === "NON" || u === "FALSE" || u === "false" || u === "0") return false;
  return null;
}

function frDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function cleanPhone(v) {
  const s = cleanText(v);
  if (!s) return null;
  let d = s.replace(/[^\d+]/g, "");
  if (d.startsWith("0033")) d = "0" + d.slice(4);
  else if (d.startsWith("+33")) d = "0" + d.slice(3);
  if (d.length < 6 || d.length > 15) return null;
  return d;
}

const CIVILITE_MAP = { "1": "M.", "2": "Mme", "3": "Mme" };
const BTQ_MAP = { "1": "bis", "2": "ter" };
const STATUT_MAP = { L: "locataire", P: "proprietaire" };

function findSheet(wb, keyCol) {
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws || !ws["!ref"]) continue;
    const range = XLSX.utils.decode_range(ws["!ref"]);
    if (range.s.r !== 0) continue;
    const first = XLSX.utils.sheet_to_json(ws, { header: 1, range: 0, defval: "" })[0] || [];
    if (first.includes(keyCol)) return name;
  }
  return null;
}

async function readHistoricRows() {
  try {
    const wb = XLSX.readFile(HIST_FILE);
    const name = findSheet(wb, "ID_ENREG");
    if (name) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: "" });
      const cols = Object.keys(rows[0] || {});
      return { rows, cols, sheet: name };
    }
  } catch (err) {
    console.log("[IMPORT] SheetJS logout sur le fichier historique:", err.message);
  }
  console.log("[IMPORT] historic: bascule sur le lecteur streaming (fallback)");
  const ext = await extractRowsByColumn(HIST_FILE, "ID_ENREG");
  if (!ext.rows.length) throw new Error("historic file: no sheet with ID_ENREG column (streaming)");
  return { rows: ext.rows, cols: ext.cols, sheet: ext.sheetFile };
}

function buildSnapshot(row, columns) {
  const out = {};
  for (const c of columns) {
    const v = fixMojibake(row[c] == null ? null : row[c]);
    out[c] = v === null || v === "" ? null : v;
  }
  return out;
}

function buildAdresse(r) {
  const num = cleanText(r.NUM_RUE_DOM);
  const btq = cleanText(r.LIB_BTQ_RUE_DOM) || BTQ_MAP[cleanText(r.NUM_BTQ_RUE_DOM)] || "";
  const rue = cleanText(r.LIB_RUE_DOM);
  const parts = [];
  if (num) parts.push(num);
  if (btq) parts.push(btq);
  if (rue) parts.push(rue);
  const adr = parts.join(" ").trim();
  return adr || null;
}

function buildComplement(r) {
  const bat = cleanText(r.NUM_BAT_DOM);
  const appt = cleanText(r.NUM_APPT_DOM);
  const compl = cleanText(r.COMPL_RUE_DOM);
  const parts = [];
  if (bat) parts.push(`Bat ${bat}`);
  if (appt) parts.push(`Apt ${appt}`);
  if (compl) parts.push(compl);
  const res = parts.join(", ").trim();
  return res || null;
}

function hasLogementInfo(r) {
  return ["SURFACE", "PIECES", "ETAT_SANITAIRE", "OCCUP_HABITUELS", "OCCUP_PERMANENTS", "OCCUP_TEMPORAIRES", "SITUATION", "ID_CATEGORIE_LOGEMENT"].some(
    (c) => cleanText(r[c]) != null
  );
}

function statutOccupation(r) {
  const sit = cleanText(r.SITUATION);
  let statut = null;
  let precision = null;
  if (sit) {
    statut = STATUT_MAP[sit] || "autre";
    if (statut === "autre") precision = cleanText(r.SITUATION_AUTRE);
  }
  return [statut, precision];
}

function usagerRow(r, columns) {
  return {
    civilite: CIVILITE_MAP[cleanText(r.CODE_CIVILITE)] || "M.",
    nom: fixMojibake(r.NOM) || "",
    prenom: fixMojibake(r.PRENOM) || "",
    nom_usage: fixMojibake(r.NOM_USAGE),
    date_naissance: parseDate(r.DATE_NAIS),
    lieu_naissance: fixMojibake(r.LIB_VILLE_NAIS),
    pays_naissance: fixMojibake(r.LIB_PAYS_NAIS) || "France",
    nationalite: fixMojibake(r.NATIONALITE),
    situation_familiale: cleanText(r.CODE_SIT_MATRI),
    email: cleanText(r.E_MAIL),
    telephone: cleanPhone(r.NO_TEL),
    mobile: cleanPhone(r.NO_MOBILE),
    adresse: buildAdresse(r),
    complement_adresse: buildComplement(r),
    code_postal: cleanText(r.CP_DOM),
    ville: fixMojibake(r.LIB_VILLE_DOM),
    pays: fixMojibake(r.LIB_PAYS_DOM) || "France",
    mail_actif: toBool(r.PREVENIR_EMAIL) ?? true,
    consentement_rgpd: false,
    created_by: CREATED_BY,
  };
}

const USAGER_COLS = [
  "civilite", "nom", "prenom", "nom_usage", "date_naissance", "lieu_naissance", "pays_naissance", "nationalite",
  "situation_familiale", "email", "telephone", "mobile", "adresse", "complement_adresse", "code_postal", "ville",
  "pays", "mail_actif", "consentement_rgpd", "created_by", "created_at",
];

async function importWorkbooks() {
  await setupDb();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `TRUNCATE TABLE "${SCHEMA_NAME}".usagers, "${SCHEMA_NAME}".logements,
       "${SCHEMA_NAME}".usagers_historique, "${SCHEMA_NAME}".usagers_liens_familiaux,
       "${SCHEMA_NAME}".attestations_ada CASCADE`
    );
    await client.query(`ALTER TABLE "${SCHEMA_NAME}".usagers ALTER COLUMN date_naissance DROP NOT NULL`);

    console.log("[IMPORT] Reading workbook:", HIST_FILE);
    const { rows: histRows, cols: histCols, sheet: histSheetName } = await readHistoricRows();
    console.log(`[IMPORT] historic: ${histRows.length} rows x ${histCols.length} cols (sheet "${histSheetName}")`);

    const wbAda = XLSX.readFile(ADA_FILE);
    const adaSheet = findSheet(wbAda, "ID_DEMANDE");
    if (!adaSheet) throw new Error("ada file: no sheet with ID_DEMANDE column");
    const adaRows = XLSX.utils.sheet_to_json(wbAda.Sheets[adaSheet], { defval: "" });
    const adaCols = Object.keys(adaRows[0] || {});
    console.log(`[IMPORT] ada: ${adaRows.length} rows x ${adaCols.length} cols (sheet "${adaSheet}")`);

    const byOrigine = new Map();
    for (const r of histRows) {
      const o = toInt(r.ID_ENREG_ORIGINE);
      if (!o) continue;
      if (!byOrigine.has(o)) byOrigine.set(o, []);
      byOrigine.get(o).push(r);
    }
    console.log(`[IMPORT] historic: ${byOrigine.size} unique individus (origines)`);

    for (const rows of byOrigine.values()) {
      rows.sort((a, b) => toInt(a.ID_ENREG) - toInt(b.ID_ENREG));
    }

    // --- Phase 1 : un usager par origine, insere par lots ---
    const origineList = [];
    const usagerInsertRows = [];
    for (const [origine, rows] of byOrigine) {
      const current = rows.filter((r) => cleanText(r.DERNIER_ETAT) === "O");
      const canon = current.length ? current[current.length - 1] : rows[rows.length - 1];
      const row = usagerRow(canon, histCols);
      const creationDates = rows
        .map((r) => parseDate(r.DATE_ENREG))
        .filter(Boolean)
        .map((d) => new Date(`${d}T00:00:00Z`).getTime());
      const created_at = creationDates.length ? new Date(Math.min(...creationDates)).toISOString() : new Date().toISOString();
      origineList.push({ origine, rows, canon });
      usagerInsertRows.push({ ...row, created_at });
    }

    console.log(`[IMPORT] insertion usagers (${usagerInsertRows.length}) par lots...`);
    const usagerIds = await batchInsert(client, `"${SCHEMA_NAME}".usagers`, USAGER_COLS, usagerInsertRows, {
      chunkSize: 500,
      returning: "id",
    });
    if (usagerIds.length !== origineList.length) {
      throw new Error(`insertion usagers : ${usagerIds.length} id(s) recus pour ${origineList.length} lignes`);
    }

    // On resout desormais TOUS les ID_ENREG (y compris references en avant,
    // ce que le traitement ligne-a-ligne d'origine ne pouvait pas faire).
    const enregToUsager = new Map();
    origineList.forEach(({ rows }, idx) => {
      const uId = usagerIds[idx];
      for (const rr of rows) enregToUsager.set(toInt(rr.ID_ENREG), uId);
    });
    const canonicalCount = origineList.length;
    console.log(`[IMPORT] usagers inseres: ${canonicalCount}`);

    // --- Phase 2 : liens familiaux + logements, par lots ---
    const lienRows = [];
    const logementRows = [];
    origineList.forEach(({ canon }, idx) => {
      const uId = usagerIds[idx];
      const links = [
        ["conjoint", canon.ID_DERNIER_ETAT_CONJ],
        ["pere", canon.ID_DERNIER_ETAT_PERE],
        ["mere", canon.ID_DERNIER_ETAT_MERE],
      ];
      for (const [type_lien, refRaw] of links) {
        const ref = toInt(refRaw);
        if (!ref) continue;
        lienRows.push({
          usager_id: uId,
          type_lien,
          lien_legacy_id_enreg: ref,
          lien_usager_id: enregToUsager.get(ref) || null,
        });
      }
      if (hasLogementInfo(canon)) {
        const [statut, precision] = statutOccupation(canon);
        const numeroBat = cleanText(canon.NUM_BAT_DOM);
        logementRows.push({
          usager_id: uId,
          adresse: buildAdresse(canon),
          complement_adresse: buildComplement(canon),
          code_postal: cleanText(canon.CP_DOM),
          ville: fixMojibake(canon.LIB_VILLE_DOM),
          pays: fixMojibake(canon.LIB_PAYS_DOM) || "France",
          numero_batiment_escalier: numeroBat ? `Bat ${numeroBat}` : null,
          surface_logement: parseFloat(cleanText(canon.SURFACE)) || null,
          nombre_pieces: toInt(canon.PIECES),
          etat_sanitaire: cleanText(canon.ETAT_SANITAIRE),
          occupants_habituels_details: cleanText(canon.OCCUP_HABITUELS),
          occupants_permanents: toInt(canon.OCCUP_PERMANENTS),
          occupants_temporaires: toInt(canon.OCCUP_TEMPORAIRES),
          statut_occupation: statut,
          statut_occupation_precision: precision,
        });
      }
    });

    console.log(`[IMPORT] insertion liens familiaux (${lienRows.length}) par lots...`);
    await batchInsert(
      client,
      `"${SCHEMA_NAME}".usagers_liens_familiaux`,
      ["usager_id", "type_lien", "lien_legacy_id_enreg", "lien_usager_id"],
      lienRows,
      { chunkSize: 1000 }
    );

    console.log(`[IMPORT] insertion logements (${logementRows.length}) par lots...`);
    await batchInsert(
      client,
      `"${SCHEMA_NAME}".logements`,
      [
        "usager_id", "adresse", "complement_adresse", "code_postal", "ville", "pays", "numero_batiment_escalier",
        "surface_logement", "nombre_pieces", "etat_sanitaire", "occupants_habituels_details", "occupants_permanents",
        "occupants_temporaires", "statut_occupation", "statut_occupation_precision",
      ],
      logementRows.map((l) => ({ ...l, type_logement: "principal" })),
      { chunkSize: 500, onConflict: "ON CONFLICT (usager_id, type_logement) DO NOTHING" }
    );
    // type_logement a une valeur par defaut en base ('principal') mais n'etait
    // pas dans la liste de colonnes ci-dessus ; on l'ajoute explicitement pour
    // que la clause ON CONFLICT (usager_id, type_logement) porte sur une valeur connue.

    // --- Phase 3 : historique, par lots ---
    const histInsertRows = [];
    for (const r of histRows) {
      const enreg = toInt(r.ID_ENREG);
      const uId = enregToUsager.get(enreg);
      if (!uId) continue;
      histInsertRows.push({
        usager_id: uId,
        legacy_id_enreg: enreg,
        legacy_id_precedent: toInt(r.ID_ENREG_PRECEDENT),
        legacy_id_origine: toInt(r.ID_ENREG_ORIGINE),
        date_enreg: parseDate(r.DATE_ENREG),
        derni_etat: cleanText(r.DERNIER_ETAT) === "O",
        desc_modif: cleanText(r.DESC_MODIF),
        data: JSON.stringify(buildSnapshot(r, histCols)),
      });
    }
    console.log(`[IMPORT] insertion usagers_historique (${histInsertRows.length}) par lots...`);
    await batchInsert(
      client,
      `"${SCHEMA_NAME}".usagers_historique`,
      ["usager_id", "legacy_id_enreg", "legacy_id_precedent", "legacy_id_origine", "date_enreg", "derni_etat", "desc_modif", "data"],
      histInsertRows,
      { chunkSize: 800 }
    );

    // --- Phase 4 : ADA (attestations_ada + attestations), par lots ---
    let adaLinked = 0;
    const templateRes = await client.query(
      `SELECT id FROM "${SCHEMA_NAME}".templates
       WHERE nom = 'Attestation d''accueil' AND usager_labels->>'2' = 'Bénéficiaire'
       LIMIT 1`
    );
    const adaTemplateId = (templateRes.rows[0] && templateRes.rows[0].id) || null;
    if (!adaTemplateId) {
      console.log("[IMPORT] ATTENTION: aucun template \"Attestation d'accueil\" trouve — les ADA restent dans attestations_ada");
    }

    const namesRes = await client.query(`SELECT id, civilite, nom, prenom FROM "${SCHEMA_NAME}".usagers`);
    const usagerNames = new Map(namesRes.rows.map((u) => [u.id, u]));
    const lienParenteLabels = new Map();
    const lpHdr = await client.query(`SELECT id FROM "${SCHEMA_NAME}".listes_reference WHERE cle = 'lien_parente' LIMIT 1`);
    if (lpHdr.rows[0]) {
      const lv = await client.query(
        `SELECT code, label FROM "${SCHEMA_NAME}".listes_reference_valeurs WHERE liste_id = $1`,
        [lpHdr.rows[0].id]
      );
      for (const r of lv.rows) lienParenteLabels.set(r.code, r.label);
    }

    const adaInsertRows = [];
    const attestationInsertRows = [];
    for (const r of adaRows) {
      const hebergeantEnreg = toInt(r.ID_HEBERGEANT);
      const hebergeEnreg = toInt(r.ID_HEBERGE);
      const hebergeantU = enregToUsager.get(hebergeantEnreg) || null;
      const hebergeU = enregToUsager.get(hebergeEnreg) || null;
      if (hebergeantU || hebergeU) adaLinked++;

      const rmRaw = cleanText(r.RESS_MONTANTX100);
      const rmDigits = rmRaw ? rmRaw.replace(/[^\d]/g, "") : null;
      const ressourceMontant = rmDigits && /^\d+$/.test(rmDigits) ? (parseFloat(rmDigits) / 100).toFixed(2) : null;

      adaInsertRows.push({
        legacy_id_demande: toInt(r.ID_DEMANDE),
        no_cerfa: cleanText(r.NO_CERFA),
        no_piece: cleanText(r.NO_PIECE),
        date_deb_valid: parseDate(r.DATE_DEB_VALID),
        date_fin_valid: parseDate(r.DATE_FIN_VALID),
        date_deliv_piece: parseDate(r.DATE_DELIV_PIECE),
        lieu_deliv_piece: cleanText(r.LIEU_DELIV_PIECE),
        date_fin_validite_piece: parseDate(r.DATE_FIN_VALIDITE_PIECE),
        hebergeant_legacy_id: hebergeantEnreg,
        heberge_legacy_id: hebergeEnreg,
        hebergeant_usager_id: hebergeantU,
        heberge_usager_id: hebergeU,
        hebergeant_assure: toBool(r.HEBERGEANT_ASSURE),
        lien_parente_code: toInt(r.ID_LIEN_PARENTE),
        ressource_montant: ressourceMontant,
        ressource_observations: cleanText(r.RESS_OBSERVATIONS),
        ressource_charge: toBool(r.RESS_CHARGE),
        verification_logement: toBool(r.VERIFICATION_LOGEMENT),
        verification_date: parseDate(r.VERIFICATION_DATE),
        verification_agent: cleanText(r.VERIFICATION_AGENT),
        conform_logement: toBool(r.CONFORM_LOGEMENT),
        conform_logement_obs: cleanText(r.CONFORM_LOGEMENT_OBS),
        on_heberge_venu: toBool(r.ON_HEBERGE_VENU),
        date_avispref: parseDate(r.DATE_AVISPREF),
        type_avispref: cleanText(r.TYPE_AVISPREF),
        lib_avispref: cleanText(r.LIB_AVISPREF),
        data: JSON.stringify(buildSnapshot(r, adaCols)),
      });

      if (adaTemplateId && (hebergeantU || hebergeU)) {
        const sujetId = hebergeantU || hebergeU;
        const benefId = hebergeU && hebergeU !== sujetId ? hebergeU : null;
        const sujet = usagerNames.get(sujetId) || {};
        const titre = `Attestation d'accueil — ${sujet.civilite || ""} ${sujet.prenom || ""} ${sujet.nom || ""}`
          .replace(/\s+/g, " ")
          .trim();
        const contenu = {
          Du: frDate(parseDate(r.DATE_DEB_VALID)) || "",
          Au: frDate(parseDate(r.DATE_FIN_VALID)) || "",
          "Lien de parenté": lienParenteLabels.get(cleanText(r.ID_LIEN_PARENTE)) || cleanText(r.ID_LIEN_PARENTE) || "",
          "N° de pièce demandeur": cleanText(r.NO_PIECE) || "",
          "Numéro CERFA": cleanText(r.NO_CERFA) || "",
          "Ressources (€/mois)": ressourceMontant || "",
          "Numéro demande legacy": String(toInt(r.ID_DEMANDE) || ""),
          "Hébergeant (legacy)": hebergeantEnreg ? `#${hebergeantEnreg}` : "",
          "Hébergé (legacy)": hebergeEnreg ? `#${hebergeEnreg}` : "",
        };
        attestationInsertRows.push({
          usager_id: sujetId,
          usager2_id: benefId,
          template_id: adaTemplateId,
          titre,
          contenu_genere: JSON.stringify(contenu),
          statut: "import_alto",
          date_generation: parseDate(r.DATE_DEB_VALID),
          genere_par: CREATED_BY,
        });
      }
    }

    console.log(`[IMPORT] insertion attestations_ada (${adaInsertRows.length}) par lots...`);
    await batchInsert(
      client,
      `"${SCHEMA_NAME}".attestations_ada`,
      [
        "legacy_id_demande", "no_cerfa", "no_piece", "date_deb_valid", "date_fin_valid", "date_deliv_piece",
        "lieu_deliv_piece", "date_fin_validite_piece", "hebergeant_legacy_id", "heberge_legacy_id",
        "hebergeant_usager_id", "heberge_usager_id", "hebergeant_assure", "lien_parente_code", "ressource_montant",
        "ressource_observations", "ressource_charge", "verification_logement", "verification_date", "verification_agent",
        "conform_logement", "conform_logement_obs", "on_heberge_venu", "date_avispref", "type_avispref", "lib_avispref", "data",
      ],
      adaInsertRows,
      { chunkSize: 500, onConflict: "ON CONFLICT (legacy_id_demande) DO NOTHING" }
    );

    console.log(`[IMPORT] insertion attestations (${attestationInsertRows.length}) par lots...`);
    await batchInsert(
      client,
      `"${SCHEMA_NAME}".attestations`,
      ["usager_id", "usager2_id", "template_id", "titre", "contenu_genere", "statut", "date_generation", "genere_par"],
      attestationInsertRows,
      { chunkSize: 500 }
    );
    const attestationsImported = attestationInsertRows.length;

    await client.query("COMMIT");

    const counts = await client.query(`
      SELECT
        (SELECT count(*) FROM "${SCHEMA_NAME}".usagers) usagers,
        (SELECT count(*) FROM "${SCHEMA_NAME}".usagers_historique) usagers_historique,
        (SELECT count(*) FROM "${SCHEMA_NAME}".usagers_liens_familiaux) liens,
        (SELECT count(*) FROM "${SCHEMA_NAME}".logements) logements,
        (SELECT count(*) FROM "${SCHEMA_NAME}".attestations_ada) ada,
        (SELECT count(*) FROM "${SCHEMA_NAME}".attestations) attestations
    `);
    console.log("[IMPORT] OK");
    console.log(`[IMPORT] usagers (canonical): ${canonicalCount}`);
    console.log(`[IMPORT] ada rows with a known usager: ${adaLinked}`);
    console.log(`[IMPORT] attestations creees depuis les ADA: ${attestationsImported}`);
    console.log("[IMPORT] tallies in DB:", counts.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  importWorkbooks()
    .then(() => pool.end())
    .catch((err) => {
      console.error("[IMPORT] FAILED:", err.message);
      process.exitCode = 1;
    });
}

module.exports = { importWorkbooks };
