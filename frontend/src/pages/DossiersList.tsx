import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, ChevronLeft, ChevronRight, IdCard } from "lucide-react";
import toast from "react-hot-toast";
import { formatNom, formatPrenom } from "../utils/format";
import { dossiersApi } from "../services/api";
import type { DossierPiece, StatutPiece } from "../types";

const STATUT_LABELS: Record<StatutPiece, string> = {
  demande: "Demandé",
  ajourne: "Ajourné",
  arrive: "Arrivé",
  recupere: "Récupéré",
};

const STATUT_COLORS: Record<StatutPiece, string> = {
  demande: "bg-gray-100 text-gray-700",
  ajourne: "bg-amber-100 text-amber-700",
  arrive: "bg-green-100 text-green-700",
  recupere: "bg-blue-100 text-blue-700",
};

export default function DossiersList() {
  const navigate = useNavigate();
  const [pieces, setPieces] = useState<DossierPiece[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statut, setStatut] = useState("");
  const [typePiece, setTypePiece] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const limit = 20;

  const load = async () => {
    setLoading(true);
    try {
      const res = await dossiersApi.list({
        search,
        statut: statut || undefined,
        type_piece: typePiece || undefined,
        limit,
        offset: page * limit,
      });
      setPieces(res.data.rows);
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
  }, [search, statut, typePiece, page]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ville-dark">Demandes CNI / Passeport</h1>
        <button
          onClick={() => navigate("/dossiers/nouveau")}
          className="flex items-center gap-2 bg-ville-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={16} />
          Nouveau dossier
        </button>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Rechercher un usager..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ville-primary focus:border-transparent"
          />
        </div>
        <select
          value={statut}
          onChange={(e) => { setStatut(e.target.value); setPage(0); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">Tous les statuts</option>
          {(Object.keys(STATUT_LABELS) as StatutPiece[]).map((s) => (
            <option key={s} value={s}>{STATUT_LABELS[s]}</option>
          ))}
        </select>
        <select
          value={typePiece}
          onChange={(e) => { setTypePiece(e.target.value); setPage(0); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">Toutes les pieces</option>
          <option value="CNI">CNI</option>
          <option value="Passeport">Passeport</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Usager</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Piece</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date demande</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Statut</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Destinataire</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Notification</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">Chargement...</td></tr>
            ) : pieces.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">Aucune demande trouvee</td></tr>
            ) : (
              pieces.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium">{formatPrenom(p.usager_prenom)} {formatNom(p.usager_nom)}</td>
                  <td className="px-6 py-4 text-sm flex items-center gap-2">
                    <IdCard size={14} className="text-ville-primary shrink-0" />
                    {p.type_piece}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{new Date(p.date_demande).toLocaleDateString("fr-FR")}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUT_COLORS[p.statut]}`}>
                      {STATUT_LABELS[p.statut]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatPrenom(p.destinataire_prenom || "")} {formatNom(p.destinataire_nom || "")}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">
                    {p.notifie ? "Envoyee" : p.statut === "arrive" ? "A envoyer" : "-"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => navigate(`/dossiers/${p.dossier_id}`)}
                      className="text-ville-primary text-sm font-medium hover:underline"
                    >
                      Voir le dossier
                    </button>
                  </td>
                </tr>
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
    </div>
  );
}
