import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Download, Search, Pencil, Archive } from "lucide-react";
import toast from "react-hot-toast";
import { formatNom, formatPrenom } from "../utils/format";
import { maskDate } from "../utils/dateMask";
import { attestationsApi } from "../services/api";
import type { Attestation } from "../types";

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "-");

// Pas de statut : un certificat est remis immediatement. Les notes eventuelles vont au suivi de dossier.
export default function CertificatsList() {
  const navigate = useNavigate();
  const [certificats, setCertificats] = useState<Attestation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [nom, setNom] = useState("");
  const [dateNaissance, setDateNaissance] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await attestationsApi.list({
        template_type: "certificat",
        nom: nom.trim() || undefined,
        date_naissance: dateNaissance || undefined,
        limit: 200,
      });
      setCertificats(res.data.rows);
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
  }, [nom, dateNaissance]);

  const handleArchive = async (c: Attestation) => {
    if (!window.confirm("Archiver ce certificat ?")) return;
    try {
      await attestationsApi.updateSuivi(c.id, "archive");
      load();
    } catch {
      toast.error("Erreur lors de l'archivage");
    }
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-2xl font-bold text-ville-dark">Certificats</h1>
          <div className="relative w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={dateNaissance}
              onChange={(e) => setDateNaissance(maskDate(e.target.value))}
              inputMode="numeric"
              placeholder="JJMMAAAA (date de naissance)"
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ville-primary"
            />
          </div>
          <div className="relative w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Rechercher (NOM Prénom)"
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ville-primary"
            />
          </div>
        </div>
        <button
          onClick={() => navigate("/certificats/nouveau")}
          className="flex items-center gap-2 bg-ville-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={16} />
          Nouveau certificat
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-xs font-semibold text-gray-500 uppercase">
              {["Agent", "Usagers", "Date de naissance", "Motif", "Date de demande", "Contact", "Action"].map((h) => (
                <th key={h} className="px-3 py-3 text-left whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">Chargement...</td></tr>
            ) : certificats.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">Aucun certificat.</td></tr>
            ) : (
              certificats.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 text-sm">
                  <td className="px-3 py-3 text-gray-600">
                    {c.agent_nom ? `${formatPrenom(c.agent_prenom || "")} ${formatNom(c.agent_nom)}` : "-"}
                  </td>
                  <td className="px-3 py-3">
                    <div>{formatPrenom(c.usager_prenom)} {formatNom(c.usager_nom)}</div>
                    {c.usager2_nom && <div>{formatPrenom(c.usager2_prenom || "")} {formatNom(c.usager2_nom)}</div>}
                  </td>
                  <td className="px-3 py-3 font-semibold">
                    <div>{fmt(c.usager_date_naissance)}</div>
                    {c.usager2_nom && <div>{fmt(c.usager2_date_naissance)}</div>}
                  </td>
                  <td className="px-3 py-3 font-medium text-gray-700">{c.template_nom}</td>
                  <td className="px-3 py-3 text-gray-600">{fmt(c.date_demande || c.date_generation)}</td>
                  <td className="px-3 py-3 font-medium">{c.usager_contact || "-"}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      {c.fichier_pdf && (
                        <button onClick={() => handleDownload(c.id)} className="p-1 text-ville-primary hover:bg-blue-50 rounded" title="Telecharger">
                          <Download size={16} />
                        </button>
                      )}
                      <button onClick={() => navigate(`/certificats/${c.id}/modifier`)} className="p-1 text-gray-500 hover:bg-gray-100 rounded" title="Modifier">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => handleArchive(c)} className="p-1 text-orange-600 hover:bg-orange-50 rounded" title="Archiver">
                        <Archive size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <p className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100">{total} certificat(s)</p>
      </div>
    </div>
  );
}
