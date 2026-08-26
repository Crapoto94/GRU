import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Download, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { formatNom, formatPrenom } from "../utils/format";
import { attestationsApi } from "../services/api";
import type { Attestation } from "../types";

export default function AttestationsList() {
  const navigate = useNavigate();
  const [attestations, setAttestations] = useState<Attestation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadAttestations = async () => {
    setLoading(true);
    try {
      const res = await attestationsApi.list();
      setAttestations(res.data.rows);
      setTotal(res.data.total);
    } catch {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttestations();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer cette attestation ?")) return;
    try {
      await attestationsApi.remove(id);
      toast.success("Attestation supprimee");
      loadAttestations();
    } catch {
      toast.error("Erreur lors de la suppression");
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ville-dark">Attestations</h1>
        <button
          onClick={() => navigate("/attestations/nouvelle")}
          className="flex items-center gap-2 bg-ville-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={16} />
          Nouvelle attestation
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-ville-primary">Attestations generees ({total})</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Titre</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Usager</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Template</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Statut</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">Chargement...</td></tr>
            ) : attestations.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  Aucune attestation generee.
                  <button
                    onClick={() => navigate("/attestations/nouvelle")}
                    className="ml-2 text-ville-primary hover:underline"
                  >
                    Generer une attestation
                  </button>
                </td>
              </tr>
            ) : (
              attestations.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium">{a.titre}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatPrenom(a.usager_prenom)} {formatNom(a.usager_nom)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{a.template_nom}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      a.statut === "genere" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                    }`}>{a.statut}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {a.date_generation ? new Date(a.date_generation).toLocaleDateString("fr-FR") : "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-right">
                    <div className="flex items-center justify-end gap-2">
                      {a.fichier_pdf && (
                        <button
                          onClick={() => handleDownload(a.id)}
                          className="p-1 text-ville-primary hover:bg-blue-50 rounded"
                          title="Telecharger"
                        >
                          <Download size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
