import { useState, useEffect } from "react";
import { ShieldCheck, Save, Hourglass, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { rgpdApi } from "../services/api";
import type { ConservationRegle, ConservationCategorie } from "../types";

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

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
        >
          <RefreshCw size={16} />
          Actualiser
        </button>
      </div>

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