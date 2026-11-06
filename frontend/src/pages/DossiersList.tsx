import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Search, ChevronUp, ChevronDown, ChevronsUpDown, Eye, Pencil, Archive, Fingerprint } from "lucide-react";
import toast from "react-hot-toast";
import { formatNom, formatPrenom } from "../utils/format";
import { maskDate } from "../utils/dateMask";
import { motifLabel } from "../utils/dossierMotifs";
import { dossiersApi } from "../services/api";
import PaginationBar, { effectiveLimit } from "../components/PaginationBar";
import type { EtapeCatalogueItem, PieceListItem, StatutPiece } from "../types";

// Libelles affiches : "en cours" (= demande) et "archive" (= refuse). Chaque statut correspond a
// l'etape du catalogue utilisee pour alimenter la frise quand on le change depuis la liste.
const STATUTS: Array<{ value: StatutPiece; label: string; pill: string; days: string }> = [
  { value: "demande", label: "En cours", pill: "bg-gray-100 text-gray-800", days: "text-gray-900" },
  { value: "ajourne", label: "Ajourné", pill: "bg-amber-100 text-amber-700", days: "text-amber-600" },
  { value: "arrive", label: "Arrivé", pill: "bg-green-100 text-green-700", days: "text-green-600" },
  { value: "recupere", label: "Récupéré", pill: "bg-blue-100 text-blue-700", days: "text-blue-600" },
  { value: "refuse", label: "Archivé", pill: "bg-gray-200 text-gray-600", days: "text-gray-500" },
  { value: "erreur_piece", label: "Erreur pièce", pill: "bg-purple-100 text-purple-700", days: "text-purple-700" },
];

// A partir de ce nombre de jours, un dossier arrive/ajourne passe en rouge (relances).
const SEUIL_RELANCE_JOURS = 60;
// Age a partir duquel la presence du mineur est requise au retrait (empreintes).
const AGE_PRESENCE_MINEUR = 12;

const COLUMNS: Array<{ key: string; label: string }> = [
  { key: "agent", label: "Agent" },
  { key: "usagers", label: "Usager" },
  { key: "date_naissance", label: "Date de naissance" },
  { key: "pieces", label: "Pièce" },
  { key: "motif", label: "Motif" },
  { key: "statuts", label: "Statut" },
  { key: "depuis", label: "Depuis" },
  { key: "date_demande", label: "Date de demande" },
  { key: "contact", label: "Contact" },
];
const SORTABLE = ["agent", "usagers", "pieces", "statuts", "depuis", "date_demande"];

const age = (dateNaissance: string) => {
  const n = new Date(dateNaissance);
  const now = new Date();
  let a = now.getFullYear() - n.getFullYear();
  if (now.getMonth() < n.getMonth() || (now.getMonth() === n.getMonth() && now.getDate() < n.getDate())) a -= 1;
  return a;
};

const joursDepuis = (d: string | null) => (d ? Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86400000)) : null);

export default function DossiersList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [pieces, setPieces] = useState<PieceListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [dateNaissance, setDateNaissance] = useState("");
  const [typePiece, setTypePiece] = useState(searchParams.get("type_piece") || "");
  const [statut, setStatut] = useState(searchParams.get("statut") || "");
  const [showArchived, setShowArchived] = useState(false);
  const [sort, setSort] = useState("date_demande");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(false);
  const [etapes, setEtapes] = useState<EtapeCatalogueItem[]>([]);

  useEffect(() => {
    dossiersApi.etapesCatalogue().then((res) => setEtapes(res.data)).catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const lim = effectiveLimit(limit);
      const res = await dossiersApi.listPieces({
        search: search.trim() || undefined,
        date_naissance: dateNaissance || undefined,
        type_piece: typePiece || undefined,
        statut: statut || undefined,
        only_pending: !showArchived,
        sort,
        order,
        limit: lim,
        offset: page * lim,
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
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, dateNaissance, typePiece, statut, showArchived, sort, order, page, limit]);

  const toggleSort = (key: string) => {
    if (!SORTABLE.includes(key)) return;
    if (sort === key) {
      setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSort(key);
      setOrder("desc");
    }
    setPage(0);
  };

  const sortIcon = (key: string) => {
    if (!SORTABLE.includes(key)) return null;
    if (sort !== key) return <ChevronsUpDown size={12} className="text-gray-300" />;
    return order === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  const changeStatut = async (p: PieceListItem, value: StatutPiece) => {
    if (value === p.statut) return;
    // Premier choix du statut dans le menu parametre ; sinon (ajourne, erreur piece : commentaire
    // a preciser) on ouvre la fiche du dossier.
    const choix = etapes.find((e) => e.statut === value && !e.commentaire && !e.personne);
    if (!choix) {
      toast("Précisez le motif dans la fiche du dossier");
      navigate(`/dossiers/${p.dossier_id}`);
      return;
    }
    try {
      const res = await dossiersApi.updateStatut(p.piece_id, choix.code);
      if (res.data.suggestNotification) toast("Pièce arrivée : pensez à prévenir le destinataire (fiche du dossier)");
      load();
    } catch {
      toast.error("Erreur lors du changement de statut");
    }
  };

  const archiver = (p: PieceListItem) => {
    if (!window.confirm("Archiver cette pièce ?")) return;
    changeStatut(p, "refuse");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-ville-dark">CNI / Passeport</h1>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              inputMode="numeric"
              placeholder="JJMMAAAA (date de naissance)"
              value={dateNaissance}
              onChange={(e) => { setDateNaissance(maskDate(e.target.value)); setPage(0); }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ville-primary focus:border-transparent"
            />
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Rechercher (NOM, prénom, téléphone)"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ville-primary focus:border-transparent"
            />
          </div>
          <select
            value={typePiece}
            onChange={(e) => { setTypePiece(e.target.value); setPage(0); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Toutes les pièces</option>
            <option value="CNI">CNI</option>
            <option value="Passeport">Passeport</option>
          </select>
          <select
            value={statut}
            onChange={(e) => { setStatut(e.target.value); setPage(0); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Tous les statuts</option>
            {STATUTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            <option value="recupere,refuse">Récupéré + archivé</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => { setShowArchived(e.target.checked); setPage(0); }}
              className="rounded"
            />
            Afficher les dossiers archivés
          </label>
        </div>
        <button
          onClick={() => navigate("/dossiers/nouveau")}
          className="flex items-center gap-2 bg-ville-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={16} />
          Nouveau dossier
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col.key)}
                    className={`px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase select-none whitespace-nowrap ${
                      SORTABLE.includes(col.key) ? "cursor-pointer hover:text-ville-primary" : ""
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">{col.label}{sortIcon(col.key)}</span>
                  </th>
                ))}
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={COLUMNS.length + 1} className="px-6 py-8 text-center text-gray-500">Chargement...</td></tr>
              ) : pieces.length === 0 ? (
                <tr><td colSpan={COLUMNS.length + 1} className="px-6 py-8 text-center text-gray-500">Aucun dossier trouve</td></tr>
              ) : (
                pieces.map((p) => {
                  const st = STATUTS.find((s) => s.value === p.statut) || STATUTS[0];
                  const jours = joursDepuis(p.depuis_date);
                  const rouge = (p.statut === "arrive" || p.statut === "ajourne") && jours !== null && jours >= SEUIL_RELANCE_JOURS;
                  const ageUsager = age(p.date_naissance);
                  const mineur = ageUsager < 18;
                  return (
                    <tr key={p.piece_id} className="hover:bg-gray-50 text-sm">
                      <td className="px-3 py-3 text-gray-600">
                        {p.agent_nom ? `${formatPrenom(p.agent_prenom || "")} ${formatNom(p.agent_nom)}` : "-"}
                      </td>
                      <td className={`px-3 py-3 font-medium ${mineur ? "text-violet-700" : ""}`}>
                        <span className="inline-flex items-center gap-1.5">
                          {formatPrenom(p.usager_prenom)} {formatNom(p.usager_nom)}
                          {mineur && ageUsager >= AGE_PRESENCE_MINEUR && (
                            <span title="Mineur de 12 ans ou plus : sa présence est requise pour le retrait (empreintes)">
                              <Fingerprint size={16} className="text-violet-600" />
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-semibold">{new Date(p.date_naissance).toLocaleDateString("fr-FR")}</td>
                      <td className="px-3 py-3 font-medium text-gray-700">{p.type_piece === "Passeport" ? "PASS" : "CNI"}</td>
                      <td className="px-3 py-3 text-gray-700">{motifLabel(p.motif)}</td>
                      <td className="px-3 py-3">
                        <select
                          value={p.statut}
                          onChange={(e) => changeStatut(p, e.target.value as StatutPiece)}
                          className={`px-2 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${st.pill}`}
                        >
                          {STATUTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </td>
                      <td
                        className={`px-3 py-3 font-bold whitespace-nowrap ${rouge ? "text-red-600" : st.days}`}
                        title={rouge ? `Plus de ${SEUIL_RELANCE_JOURS} jours : à relancer` : undefined}
                      >
                        {jours === null ? "-" : `${jours} j`}
                      </td>
                      <td className="px-3 py-3 text-gray-600">{new Date(p.date_demande).toLocaleDateString("fr-FR")}</td>
                      <td className="px-3 py-3 font-medium">{p.contact || "-"}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => navigate(`/dossiers/${p.dossier_id}`)} className="p-1 text-ville-primary hover:bg-blue-50 rounded" title="Voir le dossier">
                            <Eye size={16} />
                          </button>
                          <button onClick={() => navigate(`/dossiers/${p.dossier_id}/modifier`)} className="p-1 text-gray-500 hover:bg-gray-100 rounded" title="Modifier le dossier">
                            <Pencil size={16} />
                          </button>
                          {p.statut !== "refuse" && (
                            <button onClick={() => archiver(p)} className="p-1 text-orange-600 hover:bg-orange-50 rounded" title="Archiver">
                              <Archive size={16} />
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
        </div>

        <PaginationBar total={total} limit={limit} onLimitChange={setLimit} page={page} onPageChange={setPage} label="piece(s)" />
      </div>
    </div>
  );
}
