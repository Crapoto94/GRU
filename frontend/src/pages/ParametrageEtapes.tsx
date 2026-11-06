import { useState, useEffect } from "react";
import { ListTree, Plus, Trash2, ArrowUp, ArrowDown, Save } from "lucide-react";
import toast from "react-hot-toast";
import { parametrageApi } from "../services/api";
import type { EtapeMenu, StatutPiece } from "../types";

const GROUPES: Array<{ statut: StatutPiece; label: string; pill: string }> = [
  { statut: "demande", label: "En cours", pill: "bg-gray-100 text-gray-800" },
  { statut: "ajourne", label: "Ajourné", pill: "bg-amber-100 text-amber-700" },
  { statut: "arrive", label: "Arrivé", pill: "bg-green-100 text-green-700" },
  { statut: "recupere", label: "Récupéré", pill: "bg-blue-100 text-blue-700" },
  { statut: "refuse", label: "Archivé", pill: "bg-gray-200 text-gray-600" },
  { statut: "erreur_piece", label: "Erreur pièce", pill: "bg-purple-100 text-purple-700" },
];

let seq = 0;
const newCode = () => `CUSTOM|${Date.now().toString(36)}${(seq += 1)}`;

export default function ParametrageEtapes() {
  const [etapes, setEtapes] = useState<EtapeMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    parametrageApi.getDossierEtapes()
      .then((res) => setEtapes(res.data))
      .catch(() => toast.error("Erreur de chargement"))
      .finally(() => setLoading(false));
  }, []);

  const update = (code: string, patch: Partial<EtapeMenu>) => {
    setEtapes((prev) => prev.map((e) => (e.code === code ? { ...e, ...patch } : e)));
    setDirty(true);
  };

  const add = (statut: StatutPiece) => {
    setEtapes((prev) => [...prev, { code: newCode(), statut, libelle: "", commentaire: false, personne: null, actif: true, ordre: prev.length + 1 }]);
    setDirty(true);
  };

  const remove = (code: string) => {
    if (!window.confirm("Retirer cette étape du menu ? Les frises déjà enregistrées ne sont pas modifiées.")) return;
    setEtapes((prev) => prev.filter((e) => e.code !== code));
    setDirty(true);
  };

  // Deplacement au sein du groupe : on echange avec la voisine de meme statut.
  const move = (code: string, dir: -1 | 1) => {
    setEtapes((prev) => {
      const i = prev.findIndex((e) => e.code === code);
      const statut = prev[i].statut;
      let j = i + dir;
      while (j >= 0 && j < prev.length && prev[j].statut !== statut) j += dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setDirty(true);
  };

  const save = async () => {
    if (etapes.some((e) => !e.libelle.trim())) {
      toast.error("Chaque étape doit avoir un libellé");
      return;
    }
    setSaving(true);
    try {
      const res = await parametrageApi.saveDossierEtapes(etapes);
      setEtapes(res.data);
      setDirty(false);
      toast.success("Étapes enregistrées");
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-center text-gray-500 py-12">Chargement...</p>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ListTree className="text-ville-primary" size={24} />
          <div>
            <h1 className="text-2xl font-bold text-ville-dark">Étapes des dossiers CNI / Passeport</h1>
            <p className="text-sm text-gray-500">Choix proposés dans « Changer d'état » de la fiche dossier, groupés par statut.</p>
          </div>
        </div>
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="flex items-center gap-2 bg-ville-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>

      {GROUPES.map((g) => {
        const items = etapes.filter((e) => e.statut === g.statut);
        return (
          <section key={g.statut} className="bg-white rounded-xl shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className={`text-sm font-semibold rounded-full px-3 py-1 ${g.pill}`}>{g.label}</span>
              <button onClick={() => add(g.statut)} className="flex items-center gap-1 text-xs font-medium text-ville-primary hover:bg-blue-50 px-2 py-1 rounded-lg">
                <Plus size={14} /> Ajouter un choix
              </button>
            </div>
            {items.length === 0 ? (
              <p className="text-xs text-gray-400">Aucun choix : ce statut ne sera pas proposé dans le menu.</p>
            ) : (
              <ul className="space-y-2">
                {items.map((e) => (
                  <li key={e.code} className={`flex flex-wrap items-center gap-2 ${e.actif ? "" : "opacity-50"}`}>
                    <input
                      type="text"
                      value={e.libelle}
                      onChange={(ev) => update(e.code, { libelle: ev.target.value })}
                      placeholder="Libellé du choix"
                      className="flex-1 min-w-[14rem] px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                    />
                    <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer" title="Affiche une case commentaire à la sélection">
                      <input type="checkbox" checked={e.commentaire} onChange={(ev) => update(e.code, { commentaire: ev.target.checked })} className="rounded" />
                      Commentaire
                    </label>
                    <select
                      value={e.personne || ""}
                      onChange={(ev) => update(e.code, { personne: (ev.target.value || null) as EtapeMenu["personne"] })}
                      className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 text-gray-600"
                      title="Choix proposé seulement si le dossier comporte cette personne (son nom est ajouté au libellé)"
                    >
                      <option value="">Personne : aucune</option>
                      <option value="parent1">Parent 1</option>
                      <option value="parent2">Parent 2</option>
                      <option value="tuteur">Tuteur</option>
                    </select>
                    <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                      <input type="checkbox" checked={e.actif} onChange={(ev) => update(e.code, { actif: ev.target.checked })} className="rounded" />
                      Actif
                    </label>
                    <button onClick={() => move(e.code, -1)} className="p-1 text-gray-400 hover:text-gray-700" title="Monter"><ArrowUp size={14} /></button>
                    <button onClick={() => move(e.code, 1)} className="p-1 text-gray-400 hover:text-gray-700" title="Descendre"><ArrowDown size={14} /></button>
                    <button onClick={() => remove(e.code)} className="p-1 text-gray-400 hover:text-red-600" title="Retirer"><Trash2 size={14} /></button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
