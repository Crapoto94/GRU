import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Plus, Archive, RotateCcw, Trash2, ChevronLeft, ChevronRight, FileText, X, Download, UserSearch, Home } from "lucide-react";
import toast from "react-hot-toast";
import { formatNom, formatPrenom } from "../utils/format";
import { usagersApi, attestationsApi } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import LogementModal from "../components/LogementModal";
import type { Usager, Attestation } from "../types";

export default function UsagersList() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [usagers, setUsagers] = useState<Usager[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const limit = 20;

  const [attestationsModal, setAttestationsModal] = useState<{ usager: Usager; attestations: Attestation[] } | null>(null);
  const [loadingAttestations, setLoadingAttestations] = useState(false);
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
      const res = await usagersApi.list({ search, archived: showArchived, limit, offset: page * limit });
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
  }, [search, showArchived, page]);

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

  const openAttestations = async (u: Usager) => {
    setLoadingAttestations(true);
    try {
      const res = await attestationsApi.list({ usager_id: u.id });
      setAttestationsModal({ usager: u, attestations: res.data.rows });
    } catch {
      toast.error("Erreur chargement attestations");
    } finally {
      setLoadingAttestations(false);
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

  const totalPages = Math.ceil(total / limit);

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

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Rechercher un usager..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ville-primary focus:border-transparent"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => { setShowArchived(e.target.checked); setPage(0); }}
            className="rounded"
          />
          Archives
        </label>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Nom</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Prenom</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Telephone</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ville</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Attestations</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Logement</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Statut RGPD</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={9} className="px-6 py-12 text-center text-gray-500">Chargement...</td></tr>
            ) : usagers.length === 0 ? (
              <tr><td colSpan={9} className="px-6 py-12 text-center text-gray-500">Aucun usager trouve</td></tr>
            ) : (
              usagers.map((u) => (
                <motion.tr
                  key={u.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/usagers/${u.id}`)}
                >
                  <td className="px-6 py-4 text-sm font-medium">{formatNom(u.nom)}</td>
                  <td className="px-6 py-4 text-sm">{formatPrenom(u.prenom)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{u.email || "-"}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{u.mobile || u.telephone || "-"}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{u.ville || "-"}</td>
                  <td className="px-6 py-4 text-sm text-center" onClick={(e) => e.stopPropagation()}>
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
                  <td className="px-6 py-4 text-sm text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setLogementModalUsager(u)}
                      title={u.has_logement ? "Logement renseigne" : "Renseigner le logement"}
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-full transition ${
                        u.has_logement ? "bg-ville-primary/10 text-ville-primary hover:bg-ville-primary/20" : "text-gray-300 hover:bg-gray-100 hover:text-gray-400"
                      }`}
                    >
                      <Home size={14} />
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      u.consentement_rgpd ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                      {u.consentement_rgpd ? "Consenti" : "Non consenti"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-right">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
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
              ))
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50">
            <span className="text-sm text-gray-600">{total} resultats</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="p-1 rounded hover:bg-gray-200 disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-gray-600">{page + 1} / {totalPages}</span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="p-1 rounded hover:bg-gray-200 disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL ATTESTATIONS */}
      {attestationsModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-bold text-ville-dark">
                  Attestations de {attestationsModal.usager.prenom} {attestationsModal.usager.nom}
                </h2>
                <p className="text-sm text-gray-500">{attestationsModal.attestations.length} attestation(s)</p>
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
