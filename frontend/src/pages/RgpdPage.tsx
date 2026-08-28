import { useState } from "react";
import { ShieldCheck, Save, Hourglass, RefreshCw, AlertTriangle, Archive } from "lucide-react";
import toast from "react-hot-toast";
import { rgpdApi } from "../services/api";
import type { ConservationRegle, ConservationCategorie, RgpdAlerteUsager } from "../types";

const CATEGORIES: Array<{ key: ConservationCategorie; label: string; description: string }> = [
  {
    key: "attestations",
    label: "Attestations",
    description: "Duree de conservation des attestations generees (definie pour chaque type de template).",
  },
  {
    key: "dossiers",
    label: "Suivi des demandes CNI / Passeport",
    description: "Duree de conservation des donnees de suivi des demandes de pieces d'identite.",
  },
  {
    key: "usagers",
    label: "Informations usager",
    description: "Duree de conservation des donnees personnelles des usagers.",
  },
];

function formatDuree(mois: number) {
  if (mois % 12 === 0) {
    const an = mois / 12;
    return `${an} an${an > 1 ? "s" : ""}`;
  }
  if (mois > 12) {
    const an = Math.floor(mois / 12);
    const reste = mois % 12;
    return `${an} an${an > 1 ? "s" : ""} ${reste} mois`;
  }
  return `${mois} mois`;
}

export default function RgpdPage() {
  const [regles, setRegles] = useState<ConservationRegle[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const [alertes, setAlertes] = useState<RgpdAlerteUsager[]>([]);
  const [alertesLoading, setAlertesLoading] = useState(false);
  const [selectedAlertes, setSelectedAlertes] = useState<Set<string>>(new Set());
  const [archiving, setArchiving] = useState(false);
  const [showAlertes, setShowAlertes] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await rgpdApi.listConservation();
      setRegles(res.data);
    } catch {
      toast.error("Erreur chargement des regles de conservation");
    } finally {
      setLoading(false);
    }
  };

  const loadAlertes = async () => {
    setAlertesLoading(true);
    try {
      const res = await rgpdApi.listAlertes();
      setAlertes(res.data);
      setSelectedAlertes(new Set());
      setShowAlertes(true);
      toast.success(`${res.data.length} usager(s) a archiver`);
    } catch {
      toast.error("Erreur chargement des alertes RGPD");
    } finally {
      setAlertesLoading(false);
    }
  };

  const handleSave = async (regle: ConservationRegle) => {
    const raw = edits[regle.cle] ?? String(regle.conservation_mois);
    const mois = parseInt(raw, 10);
    if (!Number.isInteger(mois) || mois <= 0) {
      toast.error("Veuillez saisir un nombre de mois strictement positif");
      return;
    }
    setSaving((prev) => ({ ...prev, [regle.cle]: true }));
    try {
      const res = await rgpdApi.updateConservation(regle.cle, { conservation_mois: mois });
      setRegles((prev) => prev.map((r) => (r.cle === regle.cle ? res.data : r)));
      setEdits((prev) => {
        const next = { ...prev };
        delete next[regle.cle];
        return next;
      });
      toast.success("Duree de conservation mise a jour");
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving((prev) => ({ ...prev, [regle.cle]: false }));
    }
  };

  const toggleAlerte = (id: string) => {
    setSelectedAlertes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllAlertes = () => {
    if (selectedAlertes.size === alertes.length) {
      setSelectedAlertes(new Set());
    } else {
      setSelectedAlertes(new Set(alertes.map((a) => a.id)));
    }
  };

  const handleArchiver = async () => {
    if (selectedAlertes.size === 0) {
      toast.error("Selectionnez au moins un usager");
      return;
    }
    const motif = prompt("Motif de l'archivage (optionnel) :");
    if (motif === null) return;
    setArchiving(true);
    try {
      const res = await rgpdApi.archiver(Array.from(selectedAlertes), motif || "Archivage RGPD - delai de conservation expire");
      toast.success(`${res.data.count} usager(s) archive(s)`);
      setSelectedAlertes(new Set());
      loadAlertes();
      load(); // refresh counts
    } catch {
      toast.error("Erreur lors de l'archivage");
    } finally {
      setArchiving(false);
    }
  };

  function formatDate(v: string | null): string {
    return v ? new Date(v).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "-";
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Chargement...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck size={28} className="text-ville-primary" />
          <div>
            <h1 className="text-2xl font-bold text-ville-dark">RGPD - Durees de conservation</h1>
            <p className="text-sm text-gray-500">
              Determinez pour chaque demarche la duree de conservation des donnees, en mois.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
          >
            <RefreshCw size={16} />
            Actualiser
          </button>
          <button
            onClick={loadAlertes}
            disabled={alertesLoading}
            className="flex items-center gap-2 px-3 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 transition disabled:opacity-50"
          >
            <AlertTriangle size={16} />
            {alertesLoading ? "Verification..." : "Verifier les alertes"}
          </button>
        </div>
      </div>

      {showAlertes && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-amber-200">
          <div className="px-6 py-4 border-b border-amber-200 bg-amber-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={20} className="text-amber-600" />
                <h2 className="font-semibold text-amber-800">Alertes RGPD - Usagers a archiver</h2>
              </div>
              <button
                onClick={() => setShowAlertes(false)}
                className="p-1 text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-amber-600 mt-1">
              Ces usagers n'ont eu aucun evenement (attestation, demande CNI, historique, modification) depuis plus de la duree de conservation parametree (infos_usager).
              Cochez ceux a archiver (ils ne seront plus visibles dans les listes, mais conserves pour les stats).
            </p>
          </div>

          {alertes.length === 0 ? (
            <div className="px-6 py-12 text-center text-amber-600">
              <AlertTriangle size={32} className="mx-auto mb-2 opacity-50" />
              <p>Aucun usager a archiver pour le moment.</p>
            </div>
          ) : (
            <>
              <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedAlertes.size === alertes.length && alertes.length > 0}
                    onChange={toggleAllAlertes}
                    className="w-4 h-4 text-ville-primary border-gray-300 rounded focus:ring-ville-primary"
                  />
                  <span className="text-sm font-medium">Tout selectionner</span>
                </label>
                {selectedAlertes.size > 0 && (
                  <button
                    onClick={handleArchiver}
                    disabled={archiving}
                    className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition disabled:opacity-50"
                  >
                    <Archive size={14} />
                    {archiving ? "Archivage..." : `Archiver la selection (${selectedAlertes.size})`}
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left w-10"></th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Usager</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Dernier evenement</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Jours ecoules</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Conservation</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Contact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {alertes.map((alerte) => (
                      <tr key={alerte.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedAlertes.has(alerte.id)}
                            onChange={() => toggleAlerte(alerte.id)}
                            className="w-4 h-4 text-ville-primary border-gray-300 rounded focus:ring-ville-primary"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{alerte.prenom} {alerte.nom.toUpperCase()}</div>
                          <div className="text-xs text-gray-500">#{alerte.id.slice(0, 8)}</div>
                        </td>
                        <td className="px-4 py-3 text-sm">{formatDate(alerte.dernier_evenement)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-red-600">{Math.floor(alerte.jours_ecoules)} jours</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{alerte.duree_conservation_mois} mois</td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {alerte.email && <div>{alerte.email}</div>}
                          {alerte.mobile && <div>{alerte.mobile}</div>}
                          {alerte.telephone && <div>{alerte.telephone}</div>}
                          {alerte.ville && <div>{alerte.ville}</div>}
                          {!alerte.email && !alerte.mobile && !alerte.telephone && !alerte.ville && <span className="text-gray-300">-</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {CATEGORIES.map((cat) => {
        const items = regles
          .filter((r) => r.categorie === cat.key && r.actif)
          .sort((a, b) => a.libelle.localeCompare(b.libelle));
        if (items.length === 0) return null;
        return (
          <div key={cat.key} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-ville-dark flex items-center gap-2">
                <Hourglass size={18} className="text-ville-primary" />
                {cat.label}
              </h2>
              <p className="text-xs text-gray-500 mt-1">{cat.description}</p>
            </div>
            <div className="divide-y divide-gray-100">
              {items.map((regle) => {
                const value = edits[regle.cle] ?? String(regle.conservation_mois);
                const modifie = edits[regle.cle] !== undefined;
                return (
                  <div key={regle.cle} className="px-6 py-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ville-dark">{regle.libelle}</p>
                      {regle.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{regle.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Actuellement : {formatDuree(regle.conservation_mois)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="number"
                        min={1}
                        value={value}
                        onChange={(e) => setEdits((prev) => ({ ...prev, [regle.cle]: e.target.value }))}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ville-primary focus:border-transparent"
                        title="Duree de conservation en mois"
                      />
                      <span className="text-xs text-gray-500">mois</span>
                      <button
                        onClick={() => handleSave(regle)}
                        disabled={saving[regle.cle] || !modifie}
                        className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition ${
                          saving[regle.cle]
                            ? "bg-gray-100 text-gray-400"
                            : modifie
                            ? "bg-ville-primary text-white hover:bg-blue-700"
                            : "bg-gray-100 text-gray-400 cursor-not-allowed"
                        }`}
                      >
                        <Save size={14} />
                        {saving[regle.cle] ? "..." : "Enregistrer"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {regles.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
          Aucune regle de conservation enregistree.
        </div>
      )}
    </div>
  );
}