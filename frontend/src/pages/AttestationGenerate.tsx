import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, FileText, Search } from "lucide-react";
import toast from "react-hot-toast";
import { formatNom, formatPrenom } from "../utils/format";
import { attestationsApi, usagersApi, listesApi } from "../services/api";
import UsagerFields, { InputField } from "../components/UsagerFields";
import LogementFields from "../components/LogementFields";
import { MatchBanner, useUsagerMatches } from "../components/UsagerMatching";
import { EMPTY_USAGER, toInputDate } from "../utils/usagerForm";
import type { Usager, Template, ListeReference, Logement, TypeLogement } from "../types";

interface Personne {
  form: Partial<Usager>;
  usagerId: string | null;
}

const emptyPersonne = (): Personne => ({ form: { ...EMPTY_USAGER }, usagerId: null });

const downloadDocx = (id: string) =>
  attestationsApi.download(id).then((dl) => {
    const blob = new Blob([dl.data], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  });

function UsagerSearchBox({ onChoose }: { onChoose: (u: Usager) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Usager[]>([]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      usagersApi.list({ search: q.trim(), limit: 8 }).then((res) => setResults(res.data.rows)).catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  return (
    <div className="relative w-72">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Rechercher un usager..."
        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
      />
      {results.length > 0 && (
        <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
          {results.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => { onChoose(u); setQ(""); setResults([]); }}
              className="w-full text-left px-3 py-2 hover:bg-ville-light text-sm border-b border-gray-50 last:border-0"
            >
              {formatPrenom(u.prenom)} {formatNom(u.nom)}
              <span className="text-gray-400 ml-2">{new Date(u.date_naissance).toLocaleDateString("fr-FR")}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PersonneSection({
  titre,
  personne,
  onChange,
}: {
  titre: string;
  personne: Personne;
  onChange: (p: Personne) => void;
}) {
  const { matches, total } = useUsagerMatches(personne.form, personne.usagerId !== null);
  const choose = (u: Usager) => onChange({ usagerId: u.id, form: { ...u, date_naissance: toInputDate(u.date_naissance) } });

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <h2 className="text-lg font-bold text-gray-600 uppercase">{titre}</h2>
        <UsagerSearchBox onChoose={choose} />
      </div>
      <MatchBanner
        linked={personne.usagerId !== null}
        matches={matches}
        total={total}
        onChoose={choose}
        onUnlink={() => onChange(emptyPersonne())}
      />
      <UsagerFields
        variant="attestation"
        form={personne.form}
        onChange={(patch) => onChange({ ...personne, form: { ...personne.form, ...patch } })}
      />
    </section>
  );
}

const CERTIFICAT_RE = /certificat|concubinage/i;

// Certificats : tous les modeles de certificat. Attestation d'accueil : le modele "accueil"
// (a defaut, tout modele qui n'est pas un certificat).
function pickCandidates(templates: Template[], certificat: boolean): Template[] {
  if (certificat) return templates.filter((t) => CERTIFICAT_RE.test(t.nom));
  const accueil = templates.filter((t) => /accueil/i.test(t.nom) && !CERTIFICAT_RE.test(t.nom));
  return accueil.length > 0 ? accueil : templates.filter((t) => !CERTIFICAT_RE.test(t.nom));
}

export default function AttestationGenerate({ kind = "accueil" }: { kind?: "accueil" | "certificat" }) {
  const navigate = useNavigate();
  const isCertificat = kind === "certificat";
  const basePath = isCertificat ? "/certificats" : "/attestations";
  const { id: editId } = useParams();
  const isEdit = Boolean(editId);
  const [searchParams] = useSearchParams();
  const preselectedUsager = searchParams.get("usager") || "";

  const [templates, setTemplates] = useState<Template[]>([]);
  const [listes, setListes] = useState<ListeReference[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [personnes, setPersonnes] = useState<Personne[]>([emptyPersonne(), emptyPersonne(), emptyPersonne()]);
  const [customData, setCustomData] = useState<Record<string, string>>({});
  const [logementConcerne, setLogementConcerne] = useState<TypeLogement>("principal");
  const [logementForm, setLogementForm] = useState<Partial<Logement>>({});
  const [occupantsSeed, setOccupantsSeed] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [noCerfa, setNoCerfa] = useState("");
  const [dateDemande, setDateDemande] = useState(new Date().toISOString().slice(0, 10));
  const [debutValidite, setDebutValidite] = useState("");
  const [finValidite, setFinValidite] = useState("");
  const [loadingEdit, setLoadingEdit] = useState(isEdit);

  // Un seul modele d'attestation d'accueil : le formulaire le retrouve par son nom
  // (les modeles de certificat de concubinage sont ecartes) et ne propose un choix
  // que si plusieurs candidats subsistent.
  const candidates = pickCandidates(templates, isCertificat);
  const activeTemplate = templates.find((t) => t.id === selectedTemplate);
  const nbUsagers = activeTemplate?.nb_usagers || 1;
  const labels = activeTemplate?.usager_labels || {};
  const logementAmbigu = !!activeTemplate?.usage_logement_principal && !!activeTemplate?.usage_logement_secondaire;
  const usesLogement = !!activeTemplate && (activeTemplate.usage_logement_principal || activeTemplate.usage_logement_secondaire);
  const typeLogement: TypeLogement = logementAmbigu
    ? logementConcerne
    : activeTemplate?.usage_logement_secondaire && !activeTemplate.usage_logement_principal
    ? "secondaire"
    : "principal";
  const demandeur = personnes[0];

  useEffect(() => {
    attestationsApi.listTemplates().then((res) => {
      setTemplates(res.data.rows);
      const cands = pickCandidates(res.data.rows, isCertificat);
      // Attestation d'accueil : un seul modele, jamais de choix. Certificat : choix du motif.
      if (!isEdit && cands.length > 0 && (!isCertificat || cands.length === 1)) setSelectedTemplate(cands[0].id);
    });
    listesApi.list().then((res) => setListes(res.data)).catch(() => {});
  }, [isEdit, isCertificat]);

  const setPersonne = (i: number, p: Personne) => setPersonnes((prev) => prev.map((x, idx) => (idx === i ? p : x)));

  const loadUsagerAsPersonne = async (usagerId: string): Promise<Personne> => {
    const res = await usagersApi.getById(usagerId);
    return { usagerId, form: { ...res.data, date_naissance: toInputDate(res.data.date_naissance) } };
  };

  // Preselection d'un usager (depuis la liste des usagers)
  useEffect(() => {
    if (isEdit || !preselectedUsager) return;
    loadUsagerAsPersonne(preselectedUsager).then((p) => setPersonne(0, p)).catch(() => {});
  }, [isEdit, preselectedUsager]);

  // Mode modification : recharge l'attestation, ses usagers et le logement
  useEffect(() => {
    if (!editId) return;
    (async () => {
      try {
        const att = (await attestationsApi.getById(editId)).data;
        setSelectedTemplate(att.template_id);
        setNoCerfa(att.no_cerfa || "");
        if (att.date_demande) setDateDemande(toInputDate(att.date_demande));
        setDebutValidite(att.date_debut_validite ? toInputDate(att.date_debut_validite) : "");
        setFinValidite(att.date_fin_validite ? toInputDate(att.date_fin_validite) : "");
        const ids = [att.usager_id, att.usager2_id, att.usager3_id];
        const loaded = await Promise.all(ids.map((uid) => (uid ? loadUsagerAsPersonne(uid) : Promise.resolve(emptyPersonne()))));
        setPersonnes(loaded);
        const custom: Record<string, string> = {};
        Object.entries(att.contenu_genere || {}).forEach(([k, v]) => {
          if (/^variable\d+$/.test(k)) custom[k] = v;
        });
        setCustomData(custom);
      } catch {
        toast.error("Erreur lors du chargement");
        navigate(basePath);
      } finally {
        setLoadingEdit(false);
      }
    })();
  }, [editId]);

  // Variables supplementaires : initialisees a la selection du template (sauf en modification, deja chargees)
  useEffect(() => {
    if (!activeTemplate) return;
    setCustomData((prev) => {
      const next: Record<string, string> = {};
      (activeTemplate.variables || []).forEach((_v, i) => {
        const key = `variable${i + 1}`;
        next[key] = prev[key] || "";
      });
      return next;
    });
  }, [activeTemplate]);

  // Logement du demandeur : charge a la liaison ; sinon pre-rempli avec l'adresse de l'usager
  const demandeurId = demandeur.usagerId;
  const demandeurAdresse = demandeur.form;
  useEffect(() => {
    if (!usesLogement) return;
    if (!demandeurId) {
      setLogementForm({});
      setOccupantsSeed(null);
      return;
    }
    usagersApi.getLogement(demandeurId, typeLogement).then((res) => {
      if (res.data) {
        setLogementForm(res.data);
        setOccupantsSeed(res.data.occupants_habituels_details ?? null);
      } else {
        setLogementForm({
          adresse: demandeurAdresse.Adresse || "",
          complement_adresse: demandeurAdresse.complement_adresse || "",
          code_postal: demandeurAdresse.code_postal || "",
          ville: demandeurAdresse.ville || "",
          pays: demandeurAdresse.pays || "France",
        });
        setOccupantsSeed(null);
      }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demandeurId, typeLogement, usesLogement]);

  const getLabel = (key: string) => labels[key] || `Usager ${key}`;

  const resolveUsager = async (p: Personne, logementAdresse?: Partial<Logement>): Promise<string> => {
    if (p.usagerId) {
      await usagersApi.update(p.usagerId, p.form);
      return p.usagerId;
    }
    const payload: Partial<Usager> = { ...p.form };
    if (!payload.Adresse && logementAdresse?.adresse) {
      payload.Adresse = logementAdresse.adresse;
      payload.complement_adresse = payload.complement_adresse || logementAdresse.complement_adresse || "";
      payload.code_postal = payload.code_postal || logementAdresse.code_postal || "";
      payload.ville = payload.ville || logementAdresse.ville || "";
    }
    return (await usagersApi.create(payload)).data.id;
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) {
      toast.error(isCertificat ? "Choisissez le motif du certificat" : "Aucun modele d'attestation d'accueil configure");
      return;
    }
    const concernes = personnes.slice(0, nbUsagers);
    for (const [i, p] of concernes.entries()) {
      if (!p.form.nom || !p.form.prenom || !p.form.date_naissance) {
        toast.error(`${getLabel(String(i + 1))} : nom, prenom et date de naissance sont requis`);
        return;
      }
    }
    setGenerating(true);
    try {
      const ids: string[] = [];
      for (const [i, p] of concernes.entries()) {
        ids.push(await resolveUsager(p, i === 0 && usesLogement ? logementForm : undefined));
      }
      if (usesLogement && Object.keys(logementForm).length > 0) {
        await usagersApi.saveLogement(ids[0], typeLogement, logementForm);
      }
      const res = await attestationsApi.generate({
        usager_id: ids[0],
        usager2_id: nbUsagers >= 2 ? ids[1] : undefined,
        usager3_id: nbUsagers >= 3 ? ids[2] : undefined,
        template_id: selectedTemplate,
        custom_data: Object.keys(customData).length > 0 ? customData : undefined,
        logement_concerne: logementAmbigu ? logementConcerne : undefined,
        replace_id: editId,
        no_cerfa: isCertificat ? undefined : noCerfa || undefined,
        date_demande: dateDemande || undefined,
        date_debut_validite: isCertificat ? undefined : debutValidite || undefined,
        date_fin_validite: isCertificat ? undefined : finValidite || undefined,
      });
      toast.success(isEdit ? "Document modifie !" : "Document genere !");
      navigate(basePath);
      if (res.data.fichier_pdf) downloadDocx(res.data.id);
    } catch (err: unknown) {
      let msg = "Erreur lors de la generation";
      if (err && typeof err === "object" && "response" in err) {
        const axErr = err as { response?: { data?: { error?: string } } };
        msg = axErr.response?.data?.error || msg;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  if (loadingEdit) {
    return <p className="text-center text-gray-500 py-12">Chargement...</p>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(basePath)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-ville-dark">
          {isCertificat
            ? isEdit ? "Modifier le certificat" : "Nouveau certificat"
            : isEdit ? "Modifier l'attestation d'accueil" : "Nouvelle attestation d'accueil"}
        </h1>
      </div>

      <form onSubmit={handleGenerate} className="bg-white rounded-xl shadow-sm p-6 space-y-8">
        {isCertificat && !isEdit && (
        <section className="max-w-md">
          <label className="block text-sm font-medium text-gray-700 mb-1">Motif du certificat</label>
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">-- Choisir un motif --</option>
            {candidates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nom}{t.nb_usagers > 1 ? ` (${t.nb_usagers} usagers)` : ""}
              </option>
            ))}
          </select>
        </section>
        )}

        {!selectedTemplate && candidates.length === 0 && (
          <p className="text-sm text-red-600">Aucun modele n'est configure pour ce type de document (Parametrage &gt; Templates attestations).</p>
        )}

        {selectedTemplate && (
          <div className="space-y-10">
            <div className="space-y-10">
              <PersonneSection
                titre={nbUsagers > 1 ? getLabel("1") : "Demandeur"}
                personne={personnes[0]}
                onChange={(p) => setPersonne(0, p)}
              />
              {nbUsagers >= 2 && (
                <PersonneSection titre={getLabel("2")} personne={personnes[1]} onChange={(p) => setPersonne(1, p)} />
              )}
              {nbUsagers >= 3 && (
                <PersonneSection titre={getLabel("3")} personne={personnes[2]} onChange={(p) => setPersonne(2, p)} />
              )}
            </div>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-ville-primary">Demande</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <InputField label="Date de la demande" value={dateDemande} onChange={setDateDemande} type="date" />
                {!isCertificat && (
                  <>
                    <InputField label="N° CERFA" value={noCerfa} onChange={setNoCerfa} />
                    <span />
                    <InputField label="Debut de validite" value={debutValidite} onChange={setDebutValidite} type="date" />
                    <InputField label="Fin de validite" value={finValidite} onChange={setFinValidite} type="date" />
                  </>
                )}
              </div>
            </section>

            {usesLogement && (
              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-ville-primary">Logement</h2>
                {logementAmbigu && (
                  <div className="flex gap-4">
                    {(["principal", "secondaire"] as TypeLogement[]).map((t) => (
                      <label key={t} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" name="logement_concerne" checked={logementConcerne === t} onChange={() => setLogementConcerne(t)} />
                        {t === "principal" ? "Logement principal" : "Logement secondaire"}
                      </label>
                    ))}
                  </div>
                )}
                <LogementFields
                  form={logementForm}
                  onChange={(patch) => setLogementForm((prev) => ({ ...prev, ...patch }))}
                  occupantsSeed={occupantsSeed}
                />
              </section>
            )}
          </div>
        )}

        {selectedTemplate && activeTemplate?.variables && activeTemplate.variables.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-ville-primary mb-4">Variables supplementaires</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeTemplate.variables.map((varDef, i) => {
                const key = `variable${i + 1}`;
                const listeOptions = varDef.listeCle
                  ? listes.find((l) => l.cle === varDef.listeCle)?.valeurs.map((v) => v.label) || []
                  : [];
                const options = listeOptions.length > 0 ? listeOptions : varDef.allowedValues || [];
                return (
                  <div key={key} className="p-3 border rounded bg-gray-50">
                    <label className="block text-sm font-medium text-gray-700 mb-2">{varDef.description || key}</label>
                    {options.length > 0 ? (
                      <select
                        value={customData[key] || ""}
                        onChange={(e) => setCustomData((prev) => ({ ...prev, [key]: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="">Sélectionner</option>
                        {options.map((val) => <option key={val} value={val}>{val}</option>)}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={customData[key] || ""}
                        onChange={(e) => setCustomData((prev) => ({ ...prev, [key]: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder={varDef.description || `Valeur de ${key}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate(basePath)}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition text-sm"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={generating || !selectedTemplate}
            className="flex items-center gap-2 bg-ville-primary text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm"
          >
            <FileText size={16} />
            {generating ? "Generation en cours..." : isEdit ? "Enregistrer et regenerer" : "Generer l'attestation"}
          </button>
        </div>
      </form>
    </div>
  );
}
