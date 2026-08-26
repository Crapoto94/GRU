import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Plus, Archive, RotateCcw, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import { formatNom, formatPrenom } from "../utils/format";
import { usagersApi } from "../services/api";
import type { Usager } from "../types";

export default function UsagersList() {
  const navigate = useNavigate();
  const [usagers, setUsagers] = useState<Usager[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const limit = 20;

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

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ville-dark">Usagers</h1>
        <button
          onClick={() => navigate("/usagers/nouveau")}
          className="flex items-center gap-2 bg-ville-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={16} />
          Nouvel usager
        </button>
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
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Statut RGPD</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">Chargement...</td></tr>
            ) : usagers.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">Aucun usager trouve</td></tr>
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
                      <button onClick={() => handleDelete(u.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Supprimer">
                        <Trash2 size={16} />
                      </button>
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
    </div>
  );
}
