import { useState, useEffect } from "react";
import { Eye, Search, ArrowLeft, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import { attestationsApi } from "../services/api";
import AdaLegacyPreviewModal from "../components/AdaLegacyPreviewModal";
import type { AdaLegacy } from "../types";

const PAGE_SIZE = 50;

function formatDate(v: string | null | undefined): string {
  return v ? new Date(v).toLocaleDateString("fr-FR") : "-";
}

function formatCiviliteNomPrenom(ada: AdaLegacy, prefix: "hebergeant" | "heberge"): string {
  const nom = ada[`${prefix}_nom`];
  const prenom = ada[`${prefix}_prenom`];
  if (!nom && !prenom) return "Non relie";
  return `${ada[`${prefix}_civilite`] ?? ""} ${prenom ?? ""} ${nom ?? ""}`.replace(/\s+/g, " ").trim();
}

export default function AdasList() {
  const [adas, setAdas] = useState<AdaLegacy[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [previewAda, setPreviewAda] = useState<AdaLegacy | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setOffset(0);
  }, [debouncedSearch]);

  const loadAdas = async () => {
    setLoading(true);
    try {
      const res = await attestationsApi.listAda({
        search: debouncedSearch || undefined,
        limite: PAGE_SIZE,
        offset,
      });
      setAdas(res.data.rows);
      setTotal(res.data.total);
    } catch {
      toast.error("Erreur lors du chargement des attestations ALTO");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdas();
  }, [debouncedSearch, offset]);

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const pageMax = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasNext = offset + PAGE_SIZE < total;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ville-dark">Attestations d'accueil (ALTO)</h1>
          <p className="text-sm text-gray-500 mt-1">
            Demandes legacy importees ({total}). Les lignes relient un ADA a un attestation generee quand l'usager a pu etre identifie.
          </p>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (nom, CERFA, n° demande)..."
            className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm w-80 focus:ring-2 focus:ring-ville-primary focus:border-transparent"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ville-primary">Demandes importees ({total})</h2>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Page {page} / {pageMax}</span>
            <button
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              disabled={offset === 0}
              className="p-1 border rounded hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Page precedente"
            >
              <ArrowLeft size={16} />
            </button>
            <button
              onClick={() => setOffset(offset + PAGE_SIZE)}
              disabled={!hasNext}
              className="p-1 border rounded hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Page suivante"
            >
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">N° demande</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Hébergeant</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Hébergé</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Période</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">CERFA</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Attestation</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">Chargement...</td></tr>
            ) : adas.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  Aucun ADA ne correspond a la recherche.
                </td>
              </tr>
            ) : (
              adas.map((a) => {
                const adaLegacyId = a.legacy_id_demande;
                return (
                  <tr key={adaLegacyId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium">#{adaLegacyId}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div>{formatCiviliteNomPrenom(a, "hebergeant")}</div>
                      <div className="text-xs text-gray-400">Legacy #{a.hebergeant_legacy_id ?? "-"}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div>{formatCiviliteNomPrenom(a, "heberge")}</div>
                      <div className="text-xs text-gray-400">Legacy #{a.heberge_legacy_id ?? "-"}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(a.date_deb_valid)} → {formatDate(a.date_fin_valid)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{a.no_cerfa || "-"}</td>
                    <td className="px-6 py-4 text-sm">
                      {a.attestation_id ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Generee
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                          Non liee
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <button
                        onClick={() => setPreviewAda(a)}
                        className="p-1 text-ville-primary hover:bg-blue-50 rounded"
                        title="Previsualiser"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <AdaLegacyPreviewModal ada={previewAda} onClose={() => setPreviewAda(null)} />
    </div>
  );
}