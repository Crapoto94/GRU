// Pays et nationalites en francais, charges une fois depuis des API publiques puis gardes en cache
// (memoire + localStorage) :
// - pays et nationalites : Wikidata (noms et gentiles francais des Etats souverains actuels)
// Si une API est indisponible, la liste est vide et la saisie libre reste possible.

type Suggestion = { label: string; value: string };

const CACHE_DAYS = 30;

const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function readCache(key: string): string[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { at, values } = JSON.parse(raw) as { at: number; values: string[] };
    if (Date.now() - at > CACHE_DAYS * 86400000) return null;
    return values;
  } catch {
    return null;
  }
}

function writeCache(key: string, values: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), values }));
  } catch {
    // stockage indisponible : on garde seulement le cache memoire
  }
}

const memory: Record<string, Promise<string[]>> = {};

function loadList(key: string, fetcher: () => Promise<string[]>): Promise<string[]> {
  if (!memory[key]) {
    memory[key] = (async () => {
      const cached = readCache(key);
      if (cached) return cached;
      try {
        const values = await fetcher();
        if (values.length > 0) writeCache(key, values);
        return values;
      } catch {
        delete memory[key];
        return [];
      }
    })();
  }
  return memory[key];
}

async function sparql(query: string): Promise<string[]> {
  const res = await fetch(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`, {
    headers: { Accept: "application/sparql-results+json" },
  });
  if (!res.ok) return [];
  const data: { results?: { bindings?: Array<{ v?: { value?: string } }> } } = await res.json();
  return (data.results?.bindings || []).map((b) => (b.v?.value || "").trim()).filter(Boolean);
}

const capitaliser = (s: string) => s.charAt(0).toLocaleUpperCase("fr") + s.slice(1);

async function fetchPays(): Promise<string[]> {
  const noms = await sparql(`SELECT DISTINCT ?v WHERE {
    ?pays wdt:P31 wd:Q3624078 .
    FILTER NOT EXISTS { ?pays wdt:P576 [] }
    ?pays rdfs:label ?v .
    FILTER(LANG(?v) = "fr")
  }`);
  return Array.from(new Set(noms.map(capitaliser))).sort((a, b) => a.localeCompare(b, "fr"));
}

async function fetchNationalites(): Promise<string[]> {
  const brutes = await sparql(`SELECT DISTINCT ?v WHERE {
    ?pays wdt:P31 wd:Q3624078 .
    FILTER NOT EXISTS { ?pays wdt:P576 [] }
    ?pays wdt:P1549 ?v .
    FILTER(LANG(?v) = "fr")
  }`);
  // Wikidata melange casse, singulier / pluriel et masculin / feminin : on ne garde que le singulier
  // feminin (formes sans equivalent feminin dans la liste, ex. Belge ou Suisse, conservees).
  const uniques = Array.from(new Set(brutes.map((v) => capitaliser(v.normalize("NFC")))));
  const set = new Set(uniques.map((v) => v.toLowerCase()));
  const ligne = (v: string) => v.toLowerCase();
  const feminins = (v: string) => {
    const l = ligne(v);
    const c = [`${l}e`, `${l}ne`, `${l}le`, `${l}te`];
    if (l.endsWith("x") || l.endsWith("r")) c.push(`${l.slice(0, -1)}se`);
    if (l.endsWith("f")) c.push(`${l.slice(0, -1)}ve`);
    if (l.endsWith("c")) c.push(`${l.slice(0, -1)}que`);
    return c;
  };
  // Masculins sans feminin dans Wikidata.
  const IRREGULIERS: Record<string, string> = {
    "néerlandais": "Néerlandaise",
    "ouzbek": "Ouzbèke",
    "trinibagonien": "Trinibagonienne",
    "états-unien": "États-Unienne",
  };
  return uniques
    .filter((v) => !(ligne(v).endsWith("s") && set.has(ligne(v).slice(0, -1))))
    .filter((v) => !feminins(v).some((f) => set.has(f)))
    .map((v) => IRREGULIERS[ligne(v)] || v)
    .filter((v, i, tout) => tout.findIndex((x) => ligne(x) === ligne(v)) === i)
    .sort((a, b) => a.localeCompare(b, "fr"));
}

function filtrer(liste: string[], q: string): Suggestion[] {
  const n = normalize(q);
  const debut = liste.filter((v) => normalize(v).startsWith(n));
  const contient = liste.filter((v) => !normalize(v).startsWith(n) && normalize(v).includes(n));
  return [...debut, ...contient].slice(0, 10).map((v) => ({ label: v, value: v }));
}

export async function fetchPaysSuggestions(q: string): Promise<Suggestion[]> {
  return filtrer(await loadList("ref_pays_fr", fetchPays), q);
}

export async function fetchNationaliteSuggestions(q: string): Promise<Suggestion[]> {
  return filtrer(await loadList("ref_nationalites_fr_v2", fetchNationalites), q);
}
