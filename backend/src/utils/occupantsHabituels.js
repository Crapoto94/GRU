// Decodeur du champ legacy ALTO OCCUP_HABITUELS (logements.occupants_habituels_details).
//
// Format brut observe (verifie sur 20 000 echantillons, 0 anomalie) :
//   "<NN><sep><entree1>;<entree2>;...;<entreeNN>"
// - NN = nombre d'occupants (sur 2 chiffres), doit correspondre au nombre
//   d'entrees separees par ";".
// - <sep> = "::" (entree a 2 champs) ou "**" (entree a 3 champs).
// - Entree a 2 champs ("::")  : AGE|CODE_LIEN_PARENTE
// - Entree a 3 champs ("**")  : AGE_ANNEES|MOIS_SUPPLEMENTAIRES|CODE_LIEN_PARENTE
//   Le 2e champ n'est non-nul (01-11) que pour les tout jeunes enfants
//   (age proche de 0), il precise alors l'age en mois plutot qu'en annees
//   pleines seulement — dans les autres cas il vaut toujours "00".
// - CODE_LIEN_PARENTE renvoie a la liste de reference "lien_parente"
//   (listes_reference / listes_reference_valeurs), deja utilisee pour les
//   attestations d'accueil.
//
// NB : ce n'est PAS "|00|" qui separe les individus (chaque individu est
// deja delimite par ";", et NN donne le compte exact) — "00" est juste la
// valeur la plus frequente du champ "mois supplementaires" (~96% des cas).

const RAW_PATTERN = /^(\d+)(::|\*\*)(.*)$/;

function parseOccupantsHabituels(raw) {
  if (!raw) return null;
  const m = String(raw).match(RAW_PATTERN);
  if (!m) return null; // deja en texte libre (saisie manuelle) ou format inconnu
  const count = parseInt(m[1], 10);
  const entries = m[3].split(";").filter(Boolean);
  const occupants = entries.map((entry) => {
    const parts = entry.split("|");
    if (parts.length === 2) {
      return { age_ans: parseInt(parts[0], 10), age_mois_supp: 0, code_lien: parts[1] };
    }
    if (parts.length === 3) {
      return { age_ans: parseInt(parts[0], 10), age_mois_supp: parseInt(parts[1], 10) || 0, code_lien: parts[2] };
    }
    return null;
  }).filter(Boolean);
  return { count, occupants };
}

function formatAge(age_ans, age_mois_supp) {
  if (age_ans === 0 && age_mois_supp > 0) {
    return `${age_mois_supp} mois`;
  }
  if (age_mois_supp > 0) {
    return `${age_ans} an${age_ans > 1 ? "s" : ""} ${age_mois_supp} mois`;
  }
  return `${age_ans} an${age_ans > 1 ? "s" : ""}`;
}

// La table de correspondance stocke les codes sans zero non significatif
// ("3" = Mere), alors que le champ brut les encode sur 2 chiffres ("03") :
// il faut normaliser avant la recherche.
function normalizeCode(code) {
  const n = parseInt(code, 10);
  return Number.isNaN(n) ? code : String(n);
}

// lienLabels : Map<string code, string label> (table de correspondance lien_parente)
function decodeOccupantsHabituels(raw, lienLabels) {
  const parsed = parseOccupantsHabituels(raw);
  if (!parsed) return raw; // laisse tel quel si ce n'est pas le format brut legacy
  if (!parsed.occupants.length) return null;
  return parsed.occupants
    .map((o) => {
      const label = lienLabels.get(normalizeCode(o.code_lien)) || `lien non répertorié : ${o.code_lien}`;
      return `${formatAge(o.age_ans, o.age_mois_supp)} (${label})`;
    })
    .join(", ");
}

async function loadLienParenteLabels(client, SCHEMA_NAME) {
  const labels = new Map();
  const hdr = await client.query(
    `SELECT id FROM "${SCHEMA_NAME}".listes_reference WHERE cle = 'lien_parente' LIMIT 1`
  );
  if (!hdr.rows[0]) return labels;
  const vals = await client.query(
    `SELECT code, label FROM "${SCHEMA_NAME}".listes_reference_valeurs WHERE liste_id = $1`,
    [hdr.rows[0].id]
  );
  for (const r of vals.rows) labels.set(r.code, r.label);
  return labels;
}

module.exports = { parseOccupantsHabituels, decodeOccupantsHabituels, formatAge, loadLienParenteLabels, RAW_PATTERN };
