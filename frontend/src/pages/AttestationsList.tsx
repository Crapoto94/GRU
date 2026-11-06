import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Download, Trash2, Eye, Search, Pencil, Archive } from "lucide-react";
import toast from "react-hot-toast";
import { formatNom, formatPrenom } from "../utils/format";
import { attestationsApi } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import type { Attestation, StatutSuivi } from "../types";

// Statuts de suivi d'une attestation d'accueil : aucun sous-statut, seul "ajourne"
// porte un commentaire (le document manquant).
const STATUTS: Array<{ value: StatutSuivi; label: string; pill: string; days: string }> = [
  { value: "en_cours", label: "En cours", pill: "bg-gray-100 text-gray-800", days: "text-gray-900" },
  { value: "ajourne", label: "Ajourné", pill: "bg-amber-100 text-amber-700", days: "text-amber-600" },
  { value: "arrive", label: "Arrivé", pill: "bg-green-100 text-green-700", days: "text-green-600" },
  { value: "recupere", label: "Récupéré", pill: "bg-blue-100 text-blue-700", days: "text-blue-600" },
  { value: "archive", label: "Archivé", pill: "bg-gray-200 text-gray-600", days: "text-gray-500" },
];

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "-");

const joursDepuis = (d: string | null) => (d ? Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86400000)) : null);

const periodeDepassee = (a: Attestation) => !!a.date_fin_validite && new Date(a.date_fin_validite).getTime() < new Date().setHours(0, 0, 0, 0);

export default function AttestationsList() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const [attestations, setAttestations] = useState<Attestation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statutFiltre, setStatutFiltre] = useState(searchParams.get("statut") || "");
  const [ajournement, setAjournement] = useState<{ attestation: Attestation; commentaire: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await attestationsApi.list({
        search: search || undefined,
        statut_suivi: statutFiltre || undefined,
        template_type: "accueil",
        limit: 200,
      });
      setAttestations(res.data.rows);
      setTotal(res.data.total);
    } catch {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statutFiltre]);

  const changeStatut = async (a: Attestation, statut: StatutSuivi, commentaire?: string) => {
    try {
      await attestationsApi.updateSuivi(a.id, statut, commentaire);
      load();
    } catch (err: unknown) {
      let msg = "Erreur lors du changement de statut";
      if (err && typeof err === "object" && "response" in err) {
        msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error || msg;
      }
      toast.error(msg);
    }
  };

  const onStatutSelect = (a: Attestation, statut: StatutSuivi) => {
    if (statut === a.statut_suivi) return;
    if (statut === "ajourne") {
      setAjournement({ attestation: a, commentaire: a.commentaire_suivi || "" });
      return;
    }
    changeStatut(a, statut);
  };

  const handleArchive = (a: Attestation) => {
    if (!window.confirm("Archiver cette attestation ?")) return;
    changeStatut(a, "archive");
  };

  const handleDownload = async (id: string) => {
    try {
      const res = await attestationsApi.download(id);
      const blob = new Blob([res.data], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Erreur lors du telechargement");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer definitivement cette attestation ?")) return;
    try {
      await attestationsApi.remove(id);
      toast.success("Attestation supprimee");
      load();
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-2xl font-bold text-ville-dark">Attestations</h1>
          <div className="relative w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher (nom, CERFA, n° demande...)"
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ville-primary"
            />
          </div>
          <select
            value={statutFiltre}
            onChange={(e) => setStatutFiltre(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Statuts actifs</option>
            {STATUTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            <option value="recupere,archive">Archivé (récupéré + archivé)</option>
            <option value="en_cours,ajourne,arrive,recupere,archive">Tous</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/attestations/ada")}
            className="flex items-center gap-2 border border-ville-primary text-ville-primary px-4 py-2 rounded-lg hover:bg-blue-50 transition"
          >
            <Eye size={16} />
            Attestations ALTO
          </button>
          <button
            onClick={() => navigate("/attestations/nouvelle")}
            className="flex items-center gap-2 bg-ville-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={16} />
            Nouvelle attestation
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-xs font-semibold text-gray-500 uppercase">
              {["Agent", "CERFA", "Hébergeant", "Date de naissance", "Hébergé", "Période", "Statut", "Depuis", "Date de demande", "Contact", "Action"].map((h) => (
                <th key={h} className="px-3 py-3 text-left whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={11} className="px-6 py-12 text-center text-gray-500">Chargement...</td></tr>
            ) : attestations.length === 0 ? (
              <tr><td colSpan={11} className="px-6 py-12 text-center text-gray-500">Aucune attestation.</td></tr>
            ) : (
              attestations.map((a) => {
                const statut = STATUTS.find((s) => s.value === a.statut_suivi) || STATUTS[0];
                const jours = joursDepuis(a.date_statut);
                const joursRouge = a.statut_suivi === "arrive" && periodeDepassee(a);
                return (
                  <tr key={a.id} className="hover:bg-gray-50 text-sm">
                    <td className="px-3 py-3 text-gray-600">
                      {a.agent_nom ? `${formatPrenom(a.agent_prenom || "")} ${formatNom(a.agent_nom)}` : "-"}
                    </td>
                    <td className="px-3 py-3 font-medium">{a.no_cerfa || "-"}</td>
                    <td className="px-3 py-3">{formatPrenom(a.usager_prenom)} {formatNom(a.usager_nom)}</td>
                    <td className="px-3 py-3 font-semibold">{fmt(a.usager_date_naissance)}</td>
                    <td className="px-3 py-3">
                      {a.usager2_nom ? `${formatPrenom(a.usager2_prenom || "")} ${formatNom(a.usager2_nom)}` : "-"}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-gray-700">
                      {a.date_debut_validite || a.date_fin_validite ? `${fmt(a.date_debut_validite)} → ${fmt(a.date_fin_validite)}` : "-"}
                    </td>
                    <td className="px-3 py-3">
                      <select
                        value={a.statut_suivi}
                        onChange={(e) => onStatutSelect(a, e.target.value as StatutSuivi)}
                        className={`px-2 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${statut.pill}`}
                      >
                        {STATUTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                      {a.statut_suivi === "ajourne" && a.commentaire_suivi && (
                        <p className="text-xs text-amber-700 mt-1 max-w-[12rem]">{a.commentaire_suivi}</p>
                      )}
                    </td>
                    <td className={`px-3 py-3 font-bold whitespace-nowrap ${joursRouge ? "text-red-600" : statut.days}`}
                      title={joursRouge ? "Dates de l'attestation depassees : a archiver" : undefined}>
                      {jours === null ? "-" : `${jours} j`}
                    </td>
                    <td className="px-3 py-3 text-gray-600">{fmt(a.date_demande)}</td>
                    <td className="px-3 py-3 font-medium">{a.usager_contact || "-"}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        {a.fichier_pdf && (
                          <button onClick={() => handleDownload(a.id)} className="p-1 text-ville-primary hover:bg-blue-50 rounded" title="Telecharger">
                            <Download size={16} />
                          </button>
                        )}
                        <button onClick={() => navigate(`/attestations/${a.id}/modifier`)} className="p-1 text-gray-500 hover:bg-gray-100 rounded" title="Modifier">
                          <Pencil size={16} />
                        </button>
                        {a.statut_suivi !== "archive" && (
                          <button onClick={() => handleArchive(a)} className="p-1 text-orange-600 hover:bg-orange-50 rounded" title="Archiver">
                            <Archive size={16} />
                          </button>
                        )}
                        {isAdmin && (
                          <button onClick={() => handleDelete(a.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Supprimer">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <p className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100">{total} attestation(s)</p>
      </div>

      {ajournement && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-ville-dark">Ajourner l'attestation</h2>
            <label className="block text-sm font-medium text-gray-700">Document manquant</label>
            <textarea
              autoFocus
              value={ajournement.commentaire}
              onChange={(e) => setAjournement({ ...ajournement, commentaire: e.target.value })}
              rows={3}
              placeholder="Ex : justificatif de domicile de l'hébergeant"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setAjournement(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                Annuler
              </button>
              <button
                onClick={() => {
                  if (!ajournement.commentaire.trim()) {
                    toast.error("Precisez le document manquant");
                    return;
                  }
                  changeStatut(ajournement.attestation, "ajourne", ajournement.commentaire);
                  setAjournement(null);
                }}
                className="bg-ville-primary text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
