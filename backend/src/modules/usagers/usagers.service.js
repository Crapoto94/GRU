const usagerRepository = require("./usagers.repository");
const { validateUsager } = require("../../utils/validators");
const { logAcces } = require("../../utils/logger");
const { searchSynbirdContact, getAdditionalInformationLabels } = require("../../utils/synbird");

const REGEX_PRENOM_ACCOMPAGNANT = /^Pr[ée]nom #(\d+)$/i;
const REGEX_NOM_ACCOMPAGNANT = /^Nom.*#(\d+)$/i;

function extractAccompagnants(appointments, labels, nomPrincipal) {
  const byIndex = {};
  for (const a of appointments || []) {
    for (const info of a.additional_informations || []) {
      const label = labels[info.id_appointment_additional_information];
      if (!label) continue;
      const value = (info.value?.value || "").trim();
      if (!value) continue;
      const matchPrenom = label.match(REGEX_PRENOM_ACCOMPAGNANT);
      const matchNom = label.match(REGEX_NOM_ACCOMPAGNANT);
      if (matchPrenom) {
        const idx = matchPrenom[1];
        byIndex[idx] = { ...byIndex[idx], prenom: value };
      } else if (matchNom) {
        const idx = matchNom[1];
        byIndex[idx] = { ...byIndex[idx], nom: value };
      }
    }
  }
  return Object.values(byIndex)
    .filter((p) => p.prenom)
    .map((p) => ({
      nom: formatNom(p.nom || nomPrincipal),
      prenom: formatPrenom(p.prenom),
      email: "",
      mobile: "",
      accompagnant: true,
    }));
}

function formatPrenom(name) {
  if (!name) return "";
  return name
    .split(/\s+/)
    .map((part) =>
      part
        .split("-")
        .map((sub) => sub.charAt(0).toUpperCase() + sub.slice(1).toLowerCase())
        .join("-")
    )
    .join(" ");
}

function formatNom(name) {
  return (name || "").toUpperCase();
}

const usagerService = {
  async list(params) {
    return usagerRepository.findAll(params);
  },

  async getById(id) {
    const usager = await usagerRepository.findById(id);
    if (!usager) throw Object.assign(new Error("Usager non trouve"), { status: 404 });
    return usager;
  },

  async create(data, user, ip) {
    const validation = validateUsager(data);
    if (!validation.valid) {
      const err = Object.assign(new Error(validation.errors.join(", ")), { status: 400 });
      throw err;
    }
    const usager = await usagerRepository.create({ ...data, created_by: user });
    if (data.consentement_rgpd !== undefined) {
      await usagerRepository.logConsentement(usager.id, data.consentement_rgpd, ip);
    }
    await logAcces(user, "CREATE", "usagers", usager.id, { nom: usager.nom, prenom: usager.prenom }, ip);
    return usager;
  },

  async update(id, data, user, ip) {
    const existing = await this.getById(id);
    const validation = validateUsager(data);
    if (!validation.valid) {
      const err = Object.assign(new Error(validation.errors.join(", ")), { status: 400 });
      throw err;
    }
    const updated = await usagerRepository.update(id, data);
    if (data.consentement_rgpd !== undefined && data.consentement_rgpd !== existing.consentement_rgpd) {
      await usagerRepository.logConsentement(id, data.consentement_rgpd, ip);
    }
    await logAcces(user, "UPDATE", "usagers", id, data, ip);
    return updated;
  },

  async archive(id, motif, user, ip) {
    const usager = await this.getById(id);
    if (usager.archived) throw Object.assign(new Error("Usager deja archive"), { status: 400 });
    const archived = await usagerRepository.archive(id, motif);
    await logAcces(user, "ARCHIVE", "usagers", id, { motif }, ip);
    return archived;
  },

  async restore(id, user, ip) {
    const usager = await this.getById(id);
    if (!usager.archived) throw Object.assign(new Error("Usager non archive"), { status: 400 });
    const restored = await usagerRepository.restore(id);
    await logAcces(user, "RESTORE", "usagers", id, {}, ip);
    return restored;
  },

  async remove(id, user, ip) {
    await this.getById(id);
    await usagerRepository.remove(id);
    await logAcces(user, "DELETE", "usagers", id, {}, ip);
  },

  async count() {
    return usagerRepository.count();
  },

  async checkDoublons(params) {
    return usagerRepository.checkDoublons(params);
  },

  async importFromSynbird(contact) {
    let value = (contact || "").trim();
    if (!value) throw Object.assign(new Error("Le numero de telephone ou l'email est requis"), { status: 400 });
    if (!value.includes("@")) value = value.replace(/[\s.\-]/g, "");

    const existing = await usagerRepository.findByContact(value);
    if (existing) {
      return {
        exists: true,
        usager: { id: existing.id, nom: existing.nom, prenom: existing.prenom, archived: existing.archived },
      };
    }

    const results = await searchSynbirdContact(value);
    const isEmail = value.includes("@");
    const labels = await getAdditionalInformationLabels();
    const seen = new Set();
    const candidates = [];
    for (const r of results) {
      const c = r?.contact;
      if (!c) continue;
      const nom = formatNom(c.last_name);
      const prenom = formatPrenom(c.first_name);
      // Synbird masque email/cellphone_number dans /searcher (ex: "ma***@fb***.fr").
      // Seule la coordonnee utilisee pour la recherche est fiable a 100% : on la reutilise
      // telle quelle, et on laisse l'autre coordonnee vide plutot que d'afficher une valeur masquee.
      const key = `${nom}|${prenom}`;
      if (!seen.has(key)) {
        seen.add(key);
        candidates.push({
          nom,
          prenom,
          email: isEmail ? value : "",
          mobile: !isEmail ? value : "",
        });
      }

      // Un RDV peut concerner plusieurs personnes (ex: "Prenom #2" / "Nom #2" dans les
      // informations complementaires) : on propose aussi de creer leur fiche.
      for (const accompagnant of extractAccompagnants(r.appointments, labels, c.last_name)) {
        const accKey = `${accompagnant.nom}|${accompagnant.prenom}`;
        if (seen.has(accKey)) continue;
        seen.add(accKey);
        candidates.push(accompagnant);
      }
    }

    if (candidates.length === 0) {
      return { exists: false, found: false };
    }

    const MAX_CANDIDATES = 5;
    if (candidates.length > MAX_CANDIDATES) {
      return { exists: false, found: true, tooMany: true, count: candidates.length };
    }

    return { exists: false, found: true, candidates };
  },
};

module.exports = usagerService;
