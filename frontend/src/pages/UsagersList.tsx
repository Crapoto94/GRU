import { Fragment, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Plus, Archive, RotateCcw, Trash2, FileText, X, Download, UserSearch, Home, Building2, SlidersHorizontal, ChevronDown, ChevronUp, ChevronRight, IdCard, Pencil, Award } from "lucide-react";
import toast from "react-hot-toast";
import { formatNom, formatPrenom } from "../utils/format";
import { usagersApi, attestationsApi } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import LogementModal from "../components/LogementModal";
import { maskDate } from "../utils/dateMask";
import PaginationBar, { effectiveLimit } from "../components/PaginationBar";
import type { Usager, Attestation, Demarche, UsagerPiece } from "../types";

type AdvancedSearch = {
  nom: string;
  prenom: string;
  telephone: string;
  adresse: string;
  code_postal: string;
  ville: string;
};

const EMPTY_ADVANCED: AdvancedSearch = { nom: "", prenom: "", telephone: "", adresse: "", code_postal: "", ville: "" };

const ADVANCED_FIELDS: Array<{ key: keyof AdvancedSearch; label: string; placeholder: string }> = [
  { key: "nom", label: "Nom", placeholder: "Nom" },
  { key: "prenom", label: "Prenom", placeholder: "Prenom" },
  { key: "telephone", label: "Numero de telephone", placeholder: "06..." },
  { key: "adresse", label: "Adresse", placeholder: "Rue, numero..." },
  { key: "code_postal", label: "Code postal", placeholder: "94200" },
  { key: "ville", label: "Ville", placeholder: "Ville" },
];

const PIECE_STATUT_LABELS: Record<UsagerPiece["statut"], string> = {
  demande: "En cours",
  ajourne: "Ajourné",
  arrive: "Arrivé",
  recupere: "Récupéré",
  refuse: "Archivé",
  erreur_piece: "Erreur pièce",
};

const formatDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "-");

export default function UsagersList() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [usagers, setUsagers] = useState<Usager[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [dateNaissance, setDateNaissance] = useState("");
  const [expanded, setExpanded] = useState<Record<string, Demarche[] | "loading">>({});
  const [showArchived, setShowArchived] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchParams] = useSearchParams();
  const [advanced, setAdvanced] = useState<AdvancedSearch>({ ...EMPTY_ADVANCED, ville: searchParams.get("ville") || "" });
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(false);

  const advancedActive = Object.values(advanced).some((v) => v.trim() !== "");

  const [attestationsModal, setAttestationsModal] = useState<{ usager: Usager; attestations: Attestation[]; certificat: boolean } | null>(null);
  const [loadingAttestations, setLoadingAttestations] = useState(false);
  const [cniModal, setCniModal] = useState<{ usager: Usager; pieces: UsagerPiece[] } | null>(null);
  const [logementModalUsager, setLogementModalUsager] = useState<Usager | null>(null);

  const [showSynbirdModal, setShowSynbirdModal] = useState(false);
  const [synbirdContact, setSynbirdContact] = useState("");
  const [synbirdLoading, setSynbirdLoading] = useState(false);
  const [synbirdExisting, setSynbirdExisting] = useState<{ id: string; nom: string; prenom: string; archived: boolean } | null>(null);
  const [synbirdCandidates, setSynbirdCandidates] = useState<Array<Partial<Usager> & { accompagnant?: boolean }> | null>(null);
  const [synbirdNotFound, setSynbirdNotFound] = useState(false);
  const [synbirdTooMany, setSynbirdTooMany] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const lim = effectiveLimit(limit);
      const res = await usagersApi.list({
        search,
        date_naissance: dateNaissance || undefined,
        nom: advanced.nom || undefined,
        prenom: advanced.prenom || undefined,
        telephone: advanced.telephone || undefined,
        adresse: advanced.adresse || undefined,
        code_postal: advanced.code_postal || undefined,
        ville: advanced.ville || undefined,
        archived: showArchived,
        limit: lim,
        offset: page * lim,
      });
      setUsagers(res.data.rows);
      setTotal(res.data.total);
    } catch {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, dateNaissance, advanced, showArchived, page, limit]);

  const setAdvancedField = (key: keyof AdvancedSearch, value: string) => {
    setAdvanced((prev) => ({ ...prev, [key]: value }));
    setPage(0);
  };

  const resetAdvanced = () => {
    setAdvanced(EMPTY_ADVANCED);
    setPage(0);
  };

  const collapse = (id: string) =>
    setExpanded((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

  const toggleExpand = async (id: string) => {
    if (expanded[id]) {
      collapse(id);
      return;
    }
    setExpanded((prev) => ({ ...prev, [id]: "loading" }));
    try {
      const res = await usagersApi.demarches(id);
      setExpanded((prev) => ({ ...prev, [id]: res.data }));
    } catch {
      toast.error("Erreur chargement des demarches");
      collapse(id);
    }
  };

  const handleArchive = async (id: string) => {
    if (!window.confirm("Archiver cet usager ?")) return;
    try {
      await usagersApi.archive(id, "Archive depuis l'interface");
      toast.success("Usager archive");
      load();
    } catch {
      toast.error("Erreur lors de l'archivage");
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await usagersApi.restore(id);
      toast.success("Usager restaure");
      load();
    } catch {
      toast.error("Erreur lors de la restauration");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer definitivement cet usager ? Cette action est irreversible.")) return;
    try {
      await usagersApi.remove(id);
      toast.success("Usager supprime");
      load();
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const openAttestations = async (u: Usager, certificat = false) => {
    setLoadingAttestations(true);
    try {
      const res = await attestationsApi.list({ usager_id: u.id, template_type: certificat ? "certificat" : "accueil" });
      setAttestationsModal({ usager: u, attestations: res.data.rows, certificat });
    } catch {
      toast.error("Erreur chargement attestations");
    } finally {
      setLoadingAttestations(false);
    }
  };

  const openCni = async (u: Usager) => {
    try {
      const res = await usagersApi.pieces(u.id);
      setCniModal({ usager: u, pieces: res.data });
    } catch {
      toast.error("Erreur chargement des demandes CNI/Passeport");
    }
  };

  const handleDownload = async (id: string) => {
    try {
      const res = await attestationsApi.download(id);
      const blob = new Blob([res.data], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Erreur lors du telechargement");
    }
  };

  const handleSynbirdSearch = async () => {
    const contact = synbirdContact.trim();
    if (!contact) {
      toast.error("Saisissez un numero de telephone ou un email");
      return;
    }
    setSynbirdLoading(true);
    setSynbirdExisting(null);
    setSynbirdCandidates(null);
    setSynbirdNotFound(false);
    setSynbirdTooMany(null);
    try {
      const res = await usagersApi.importSynbird(contact);
      if (res.data.exists && res.data.usager) {
        setSynbirdExisting(res.data.usager);
      } else if (res.data.tooMany) {
        setSynbirdTooMany(res.data.count || 0);
      } else if (res.data.found && res.data.candidates?.length) {
        setSynbirdCandidates(res.data.candidates);
      } else {
        setSynbirdNotFound(true);
      }
    } catch (err: unknown) {
      let msg = "Erreur lors de la recherche Synbird";
      if (err && typeof err === "object" && "response" in err) {
        const response = (err as { response?: { data?: { error?: string } } }).response;
        if (response?.data?.error) msg = response.data.error;
      }
      toast.error(msg);
    } finally {
      setSynbirdLoading(false);
    }
  };

  const confirmSynbirdCandidate = (candidate: Partial<Usager> & { accompagnant?: boolean }) => {
    const { accompagnant: _accompagnant, ...prefill } = candidate;
    closeSynbirdModal();
    navigate("/usagers/nouveau", { state: { prefill } });
  };

  const closeSynbirdModal = () => {
    setShowSynbirdModal(false);
    setSynbirdContact("");
    setSynbirdExisting(null);
    setSynbirdCandidates(null);
    setSynbirdNotFound(false);
    setSynbirdTooMany(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ville-dark">Usagers</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSynbirdModal(true)}
            className="flex items-center gap-2 bg-white border border-ville-primary text-ville-primary px-4 py-2 rounded-lg hover:bg-blue-50 transition"
          >
            <UserSearch size={16} />
            Importer Synbird
          </button>
          <button
            onClick={() => navigate("/usagers/nouveau")}
            className="flex items-center gap-2 bg-ville-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={16} />
            Nouvel usager
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="JJMMAAAA (date de naissance)" inputMode="numeric"
              value={dateNaissance}
              onChange={(e) => { setDateNaissance(maskDate(e.target.value)); setPage(0); }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ville-primary focus:border-transparent"
            />
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Rechercher (NOM)"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ville-primary focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className={`relative flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition ${
              showAdvanced || advancedActive
                ? "border-ville-primary text-ville-primary bg-blue-50"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
            title="Recherche avancee"
          >
            <SlidersHorizontal size={16} />
            Recherche avancee
            {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {advancedActive && !showAdvanced && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-ville-primary" />
            )}
          </button>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => { setShowArchived(e.target.checked); setPage(0); }}
              className="rounded"
            />
            Archives
          </label>
        </div>

        {showAdvanced && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {ADVANCED_FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{f.label}</label>
                  <input
                    type="text"
                    value={advanced[f.key]}
                    placeholder={f.placeholder}
                    onChange={(e) => setAdvancedField(f.key, e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ville-primary focus:border-transparent"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400">Les champs renseignes se cumulent.</p>
            {advancedActive && (
              <button
                onClick={resetAdvanced}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-ville-primary"
              >
                <X size={12} />
                Reinitialiser la recherche avancee
              </button>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-scroll">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="w-8 px-2 py-3"></th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Nom</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Prenom</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date de naissance</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Lieu de naissance</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Telephone</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Adresse</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">CNI/Pass</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Attestations</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Certificats</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={11} className="px-6 py-12 text-center text-gray-500">Chargement...</td></tr>
            ) : usagers.length === 0 ? (
              <tr><td colSpan={11} className="px-6 py-12 text-center text-gray-500">Aucun usager trouve</td></tr>
            ) : (
              usagers.map((u) => {
                const dem = expanded[u.id];
                return (
                  <Fragment key={u.id}>
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleExpand(u.id)}
                    >
                      <td className="px-2 py-4 text-gray-400">
                        <ChevronRight size={16} className={`transition-transform ${dem ? "rotate-90" : ""}`} />
                      </td>
                      <td className="px-4 py-4 text-sm font-bold">{formatNom(u.nom)}</td>
                      <td className="px-4 py-4 text-sm">{formatPrenom(u.prenom)}</td>
                      <td className="px-4 py-4 text-sm font-medium">{formatDate(u.date_naissance)}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{u.lieu_naissance || "-"}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{u.mobile || u.telephone || "-"}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {u.Adresse || u.code_postal || u.ville ? (
                          <>
                            {u.Adresse && <div>{u.Adresse}</div>}
                            <div>{[u.code_postal, u.ville].filter(Boolean).join(" ")}</div>
                          </>
                        ) : "-"}
                      </td>
                      <td className="px-4 py-4 text-sm text-center" onClick={(e) => e.stopPropagation()}>
                        {u.cni_count > 0 ? (
                          <button
                            onClick={() => openCni(u)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 transition cursor-pointer"
                          >
                            <IdCard size={12} />
                            {u.cni_count}
                          </button>
                        ) : <span className="text-gray-300 text-xs">-</span>}
                      </td>
                      <td className="px-4 py-4 text-sm text-center" onClick={(e) => e.stopPropagation()}>
                        {u.attestation_count > 0 ? (
                          <button
                            onClick={() => openAttestations(u)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-ville-primary/10 text-ville-primary hover:bg-ville-primary/20 transition cursor-pointer"
                          >
                            <FileText size={12} />
                            {u.attestation_count}
                          </button>
                        ) : (
                          <span className="text-gray-300 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-center" onClick={(e) => e.stopPropagation()}>
                        {u.certificat_count > 0 ? (
                          <button
                            onClick={() => openAttestations(u, true)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-700 hover:bg-violet-200 transition cursor-pointer"
                          >
                            <Award size={12} />
                            {u.certificat_count}
                          </button>
                        ) : (
                          <span className="text-gray-300 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => navigate(`/usagers/${u.id}`)} className="p-1 text-gray-500 hover:bg-gray-100 rounded" title="Modifier">
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => setLogementModalUsager(u)}
                            title="Logement"
                            className={`p-1 rounded ${
                              u.has_logement_principal || u.has_logement_secondaire
                                ? "text-ville-primary hover:bg-blue-50"
                                : "text-gray-300 hover:bg-gray-100"
                            }`}
                          >
                            {u.has_logement_principal && u.has_logement_secondaire ? <Building2 size={16} /> : <Home size={16} />}
                          </button>
                          {u.archived ? (
                            <button onClick={() => handleRestore(u.id)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Restaurer">
                              <RotateCcw size={16} />
                            </button>
                          ) : (
                            <button onClick={() => handleArchive(u.id)} className="p-1 text-orange-600 hover:bg-orange-50 rounded" title="Archiver">
                              <Archive size={16} />
                            </button>
                          )}
                          {isAdmin && (
                            <button onClick={() => handleDelete(u.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Supprimer">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                    {dem && (
                      <tr className="bg-gray-50/70">
                        <td></td>
                        <td colSpan={10} className="px-4 py-3">
                          {dem === "loading" ? (
                            <p className="text-sm text-gray-500">Chargement...</p>
                          ) : dem.length === 0 ? (
                            <p className="text-sm text-gray-500">Aucune demarche pour cet usager.</p>
                          ) : (
                            <ul className="divide-y divide-gray-200">
                              {dem.map((d) => (
                                <li
                                  key={`${d.type}-${d.id}`}
                                  className={`flex items-center gap-4 py-2 text-sm ${d.type === "cni" ? "cursor-pointer hover:bg-white" : ""}`}
                                  onClick={d.type === "cni" ? () => navigate(`/dossiers/${d.ref}`) : undefined}
                                >
                                  <span className="w-24 text-gray-500">{d.date_demarche ? new Date(d.date_demarche).toLocaleDateString("fr-FR") : "-"}</span>
                                  <span className="flex items-center gap-2 w-52 text-gray-700">
                                    {d.type === "cni" ? <IdCard size={14} className="text-red-600" /> : d.type === "certificat" ? <Award size={14} className="text-violet-600" /> : <FileText size={14} className="text-green-600" />}
                                    {d.type === "cni" ? "CNI / Passeport" : d.type === "certificat" ? "Certificat" : "Attestation d'accueil"}
                                  </span>
                                  <span className="flex-1 truncate text-ville-dark">{d.libelle}</span>
                                  <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">{d.statut}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
        </div>

        <PaginationBar total={total} limit={limit} onLimitChange={setLimit} page={page} onPageChange={setPage} label="usager(s)" />
      </div>

      {/* MODAL ATTESTATIONS */}
      {attestationsModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-bold text-ville-dark">
                  {attestationsModal.certificat ? "Certificats" : "Attestations"} de {attestationsModal.usager.prenom} {attestationsModal.usager.nom}
                </h2>
                <p className="text-sm text-gray-500">{attestationsModal.attestations.length} {attestationsModal.certificat ? "certificat(s)" : "attestation(s)"}</p>
              </div>
              <button onClick={() => setAttestationsModal(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {loadingAttestations ? (
                <p className="text-center text-gray-500 py-8">Chargement...</p>
              ) : attestationsModal.attestations.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Aucune attestation</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {attestationsModal.attestations.map((a) => (
                    <div key={a.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                      <FileText className="text-ville-primary shrink-0" size={18} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ville-dark truncate">{a.titre}</p>
                        <p className="text-xs text-gray-500">
                          {a.template_nom}
                          {a.date_generation && <> - {new Date(a.date_generation).toLocaleDateString("fr-FR")}</>}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium shrink-0 ${
                        a.statut === "genere" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                      }`}>{a.statut}</span>
                      {a.fichier_pdf && (
                        <button
                          onClick={() => handleDownload(a.id)}
                          className="p-1 text-ville-primary hover:bg-blue-50 rounded shrink-0"
                          title="Telecharger"
                        >
                          <Download size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CNI / PASSEPORT */}
      {cniModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-bold text-ville-dark">
                  CNI / Passeport de {formatPrenom(cniModal.usager.prenom)} {formatNom(cniModal.usager.nom)}
                </h2>
                <p className="text-sm text-gray-500">{cniModal.pieces.length} demande(s)</p>
              </div>
              <button onClick={() => setCniModal(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {cniModal.pieces.map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/dossiers/${p.dossier_id}`)}
                  className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-ville-primary transition"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2 text-sm font-semibold text-ville-dark">
                      <IdCard size={16} className="text-red-600" />
                      {p.type_piece}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {PIECE_STATUT_LABELS[p.statut]}
                    </span>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <dt className="text-gray-500">Date de la demande</dt>
                    <dd>{formatDate(p.date_demande)}</dd>
                    <dt className="text-gray-500">Date d'arrivee</dt>
                    <dd>{formatDate(p.date_arrivee)}</dd>
                    <dt className="text-gray-500">Date de recuperation</dt>
                    <dd>{formatDate(p.date_recuperation)}</dd>
                    {p.destinataire_nom && (
                      <>
                        <dt className="text-gray-500">Destinataire</dt>
                        <dd>{formatPrenom(p.destinataire_prenom || "")} {formatNom(p.destinataire_nom)}</dd>
                      </>
                    )}
                  </dl>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL IMPORT SYNBIRD */}
      {showSynbirdModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-ville-dark">Importer depuis Synbird</h2>
              <button onClick={closeSynbirdModal} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500">
                Saisissez le numero de telephone ou l'email de l'usager pour rechercher ses coordonnees dans Synbird.
              </p>
              <input
                type="text"
                autoFocus
                value={synbirdContact}
                onChange={(e) => {
                  setSynbirdContact(e.target.value);
                  setSynbirdExisting(null);
                  setSynbirdCandidates(null);
                  setSynbirdNotFound(false);
                  setSynbirdTooMany(null);
                }}
                onKeyDown={(e) => { if (e.key === "Enter") handleSynbirdSearch(); }}
                placeholder="0601020304 ou nom@exemple.fr"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ville-primary focus:border-transparent"
              />

              {synbirdExisting && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  Un usager existe deja avec ce contact :{" "}
                  <span className="font-semibold">{formatPrenom(synbirdExisting.prenom)} {formatNom(synbirdExisting.nom)}</span>
                  {synbirdExisting.archived && " (archive)"}
                  <button
                    onClick={() => { closeSynbirdModal(); navigate(`/usagers/${synbirdExisting.id}`); }}
                    className="block mt-2 text-ville-primary font-medium hover:underline"
                  >
                    Voir la fiche usager
                  </button>
                </div>
              )}

              {synbirdNotFound && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-600">
                  Aucun contact Synbird trouve pour cette recherche.
                </div>
              )}

              {synbirdTooMany !== null && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-600">
                  {synbirdTooMany} contacts trouves dans Synbird, c'est trop pour les afficher. Affinez votre recherche (email complet, numero exact...).
                </div>
              )}

              {synbirdCandidates && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    {synbirdCandidates.length > 1
                      ? `${synbirdCandidates.length} contacts trouves dans Synbird. Choisissez celui a importer :`
                      : "Contact trouve dans Synbird. Confirmez la creation de la fiche :"}
                  </p>
                  {synbirdCandidates.map((c, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 border border-gray-200 rounded-lg p-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ville-dark truncate flex items-center gap-2">
                          {formatPrenom(c.prenom || "")} {formatNom(c.nom || "")}
                          {c.accompagnant && (
                            <span className="shrink-0 bg-blue-100 text-blue-700 text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                              Accompagnant RDV
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {c.email || c.mobile || (c.accompagnant ? "Aucune coordonnee (mentionne dans un RDV)" : "")}
                        </p>
                      </div>
                      <button
                        onClick={() => confirmSynbirdCandidate(c)}
                        className="shrink-0 bg-ville-primary text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 transition"
                      >
                        Creer la fiche
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={closeSynbirdModal}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSynbirdSearch}
                  disabled={synbirdLoading}
                  className="flex items-center gap-2 bg-ville-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  <Search size={16} />
                  {synbirdLoading ? "Recherche..." : "Rechercher"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {logementModalUsager && (
        <LogementModal
          usager={logementModalUsager}
          onClose={() => setLogementModalUsager(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
