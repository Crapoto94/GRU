import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, ChevronUp, ChevronDown, ChevronsUpDown, Users, IdCard, Clock, SlidersHorizontal, X } from "lucide-react";
import toast from "react-hot-toast";
import { formatNom, formatPrenom } from "../utils/format";
import { dossiersApi } from "../services/api";
import PaginationBar, { effectiveLimit } from "../components/PaginationBar";
import type { DossierListItem, StatutPiece } from "../types";

const STATUT_LABELS: Record<StatutPiece, string> = {
  demande: "Demandé",
  ajourne: "Ajourné",
  arrive: "Arrivé",
  recupere: "Récupéré",
  refuse: "Refusé",
};

const STATUT_COLORS: Record<StatutPiece, string> = {
  demande: "bg-gray-100 text-gray-700",
  ajourne: "bg-amber-100 text-amber-700",
  arrive: "bg-green-100 text-green-700",
  recupere: "bg-blue-100 text-blue-700",
  refuse: "bg-rose-100 text-rose-700",
};

const COLUMNS: Array<{ key: string; label: string; align?: "center" | "right" }> = [
  { key: "usagers", label: "Usagers" },
  { key: "personnes", label: "Personnes", align: "center" },
  { key: "pieces", label: "Pieces", align: "center" },
  { key: "statuts", label: "Statuts" },
  { key: "attente", label: "En attente depuis", align: "center" },
  { key: "date_demande", label: "Date de demande" },
];

const ADVANCED_FIELDS: Array<{ key: keyof AdvancedSearch; label: string; placeholder: string }> = [
  { key: "nom", label: "Nom", placeholder: "Nom" },
  { key: "prenom", label: "Prenom", placeholder: "Prenom" },
  { key: "telephone", label: "Numero de telephone", placeholder: "06..." },
  { key: "adresse", label: "Adresse", placeholder: "Rue, numero..." },
  { key: "code_postal", label: "Code postal", placeholder: "94200" },
  { key: "ville", label: "Ville", placeholder: "Ville" },
];

type AdvancedSearch = {
  nom: string;
  prenom: string;
  telephone: string;
  adresse: string;
  code_postal: string;
  ville: string;
};

const EMPTY_ADVANCED: AdvancedSearch = { nom: "", prenom: "", telephone: "", adresse: "", code_postal: "", ville: "" };

function joursDepuis(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export default function DossiersList() {
  const navigate = useNavigate();
  const [dossiers, setDossiers] = useState<DossierListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statut, setStatut] = useState("");
  const [typePiece, setTypePiece] = useState("");
  const [showClosed, setShowClosed] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advanced, setAdvanced] = useState<AdvancedSearch>(EMPTY_ADVANCED);
  const [sort, setSort] = useState("date_demande");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(false);

  const advancedActive = Object.values(advanced).some((v) => v.trim() !== "");

  const load = async () => {
    setLoading(true);
    try {
      const lim = effectiveLimit(limit);
      const res = await dossiersApi.list({
        search,
        statut: statut || undefined,
        type_piece: typePiece || undefined,
        nom: advanced.nom || undefined,
        prenom: advanced.prenom || undefined,
        telephone: advanced.telephone || undefined,
        adresse: advanced.adresse || undefined,
        code_postal: advanced.code_postal || undefined,
        ville: advanced.ville || undefined,
        only_pending: !showClosed,
        sort,
        order,
        limit: lim,
        offset: page * lim,
      });
      setDossiers(res.data.rows);
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
  }, [search, statut, typePiece, showClosed, advanced, sort, order, page, limit]);

  const toggleSort = (key: string) => {
    if (sort === key) {
      setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSort(key);
      setOrder("desc");
    }
    setPage(0);
  };

  const sortIcon = (key: string) => {
    if (sort !== key) return <ChevronsUpDown size={12} className="text-gray-300" />;
    return order === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  const setAdvancedField = (key: keyof AdvancedSearch, value: string) => {
    setAdvanced((prev) => ({ ...prev, [key]: value }));
    setPage(0);
  };

  const resetAdvanced = () => {
    setAdvanced(EMPTY_ADVANCED);
    setPage(0);
  };

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

      <div className="space-y-3">
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
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={showClosed}
              onChange={(e) => { setShowClosed(e.target.checked); setPage(0); }}
              className="rounded"
            />
            Afficher les dossiers cloturés (récupérés / refusés)
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
            <p className="text-xs text-gray-400">
              Les champs renseignes se cumulent (recherche parmi tous les usagers du dossier, beneficiaires et destinataires).
            </p>
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
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className={`px-6 py-3 text-xs font-semibold text-gray-500 uppercase cursor-pointer select-none hover:text-ville-primary transition ${
                    col.align === "center" ? "text-center" : "text-left"
                  }`}
                >
                  <span className={`inline-flex items-center gap-1 ${col.align === "center" ? "justify-center" : ""}`}>
                    {col.label}
                    {sortIcon(col.key)}
                  </span>
                </th>
              ))}
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={COLUMNS.length + 1} className="px-6 py-8 text-center text-gray-500">Chargement...</td></tr>
            ) : dossiers.length === 0 ? (
              <tr><td colSpan={COLUMNS.length + 1} className="px-6 py-8 text-center text-gray-500">Aucun dossier trouve</td></tr>
            ) : (
              dossiers.map((d) => (
                <tr
                  key={d.dossier_id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/dossiers/${d.dossier_id}`)}
                >
                  <td className="px-6 py-4 text-sm font-medium">
                    {d.usagers.map((u) => `${formatPrenom(u.prenom)} ${formatNom(u.nom)}`).join(", ")}
                  </td>
                  <td className="px-6 py-4 text-sm text-center">
                    <span className="inline-flex items-center gap-1 text-gray-600">
                      <Users size={14} className="text-gray-400" />
                      {d.nb_usagers}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-center">
                    <span className="inline-flex items-center gap-1 text-gray-600">
                      <IdCard size={14} className="text-gray-400" />
                      {d.nb_pieces}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex flex-wrap gap-1">
                      {d.nb_demande > 0 && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUT_COLORS.demande}`}>
                          {d.nb_demande} {STATUT_LABELS.demande}
                        </span>
                      )}
                      {d.nb_ajourne > 0 && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUT_COLORS.ajourne}`}>
                          {d.nb_ajourne} {STATUT_LABELS.ajourne}
                        </span>
                      )}
                      {d.nb_arrive > 0 && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUT_COLORS.arrive}`}>
                          {d.nb_arrive} {STATUT_LABELS.arrive}
                        </span>
                      )}
                      {d.nb_recupere > 0 && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUT_COLORS.recupere}`}>
                          {d.nb_recupere} {STATUT_LABELS.recupere}
                        </span>
                      )}
                      {d.nb_refuse > 0 && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUT_COLORS.refuse}`}>
                          {d.nb_refuse} {STATUT_LABELS.refuse}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-center">
                    {d.date_demande_attente ? (
                      <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                        <Clock size={14} />
                        {joursDepuis(d.date_demande_attente)} j
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {d.date_demande ? new Date(d.date_demande).toLocaleDateString("fr-FR") : "-"}
                  </td>
                  <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => navigate(`/dossiers/${d.dossier_id}`)}
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
        </div>

        <PaginationBar total={total} limit={limit} onLimitChange={setLimit} page={page} onPageChange={setPage} label="dossier(s)" />
      </div>
    </div>
  );
}
