import { useState, useEffect } from "react";
import { Plus, Save, Trash2, Pencil, X, ListChecks } from "lucide-react";
import toast from "react-hot-toast";
import { listesApi } from "../services/api";
import type { ListeReference } from "../types";

interface EditValue {
  listeId: string;
  valueId: string;
  code: string;
  label: string;
  ordre: string;
}

export default function ListesCorrespondance() {
  const [listes, setListes] = useState<ListeReference[]>([]);
  const [newCle, setNewCle] = useState("");
  const [newNom, setNewNom] = useState("");
  const [renaming, setRenaming] = useState<{ id: string; nom: string } | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [newCode, setNewCode] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [editing, setEditing] = useState<EditValue | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const res = await listesApi.list();
      setListes(res.data);
    } catch {
      toast.error("Erreur chargement des listes");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCle.trim() || !newNom.trim()) {
      toast.error("Cle et nom requis");
      return;
    }
    setBusy(true);
    try {
      await listesApi.create({ cle: newCle, nom: newNom });
      toast.success("Liste creee");
      setNewCle("");
      setNewNom("");
      load();
    } catch {
      toast.error("Erreur lors de la creation");
    } finally {
      setBusy(false);
    }
  };

  const handleRename = async (liste: ListeReference) => {
    if (!renaming || !renaming.nom.trim()) return;
    setBusy(true);
    try {
      await listesApi.update(liste.id, { nom: renaming.nom });
      toast.success("Liste renommee");
      setRenaming(null);
      load();
    } catch {
      toast.error("Erreur lors du renommage");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (liste: ListeReference) => {
    if (!window.confirm(`Supprimer la liste "${liste.nom}" ainsi que ses ${liste.valeurs.length} valeurs ?`)) return;
    setBusy(true);
    try {
      await listesApi.remove(liste.id);
      toast.success("Liste supprimee");
      load();
    } catch {
      toast.error("Erreur lors de la suppression");
    } finally {
      setBusy(false);
    }
  };

  const handleAddValue = async (listeId: string) => {
    if (!newCode.trim() || !newLabel.trim()) {
      toast.error("Code et label requis");
      return;
    }
    setBusy(true);
    try {
      await listesApi.addValue(listeId, { code: newCode, label: newLabel });
      toast.success("Valeur ajoutee");
      setAdding(null);
      setNewCode("");
      setNewLabel("");
      load();
    } catch {
      toast.error("Erreur lors de l'ajout");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveEdit = async (edit: EditValue) => {
    if (!edit.code.trim() || !edit.label.trim()) {
      toast.error("Code et label requis");
      return;
    }
    setBusy(true);
    try {
      await listesApi.updateValue(edit.listeId, edit.valueId, {
        code: edit.code,
        label: edit.label,
        ordre: parseInt(edit.ordre, 10) || 0,
      });
      toast.success("Valeur mise a jour");
      setEditing(null);
      load();
    } catch {
      toast.error("Erreur lors de la mise a jour");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteValue = async (listeId: string, valueId: string) => {
    if (!window.confirm("Supprimer cette valeur ?")) return;
    setBusy(true);
    try {
      await listesApi.removeValue(listeId, valueId);
      toast.success("Valeur supprimee");
      load();
    } catch {
      toast.error("Erreur lors de la suppression");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ville-dark">Listes de correspondance</h1>
        <p className="text-sm text-gray-500 mt-1">
          Tables de reference utilisees pour les liens de parente (import ALTO) et les listes proposees dans les variables des templates d'attestation.
        </p>
      </div>

      <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-ville-primary mb-4">Creer une nouvelle liste</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            value={newCle}
            onChange={(e) => setNewCle(e.target.value)}
            placeholder="Cle machine (ex: motif_demande)"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ville-primary focus:border-transparent"
          />
          <input
            type="text"
            value={newNom}
            onChange={(e) => setNewNom(e.target.value)}
            placeholder="Nom affiche (ex: Motif de la demande)"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ville-primary focus:border-transparent"
          />
          <button
            type="submit"
            disabled={busy}
            className="flex items-center gap-2 bg-ville-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm justify-center"
          >
            <Plus size={16} /> Creer la liste
          </button>
        </div>
      </form>

      {listes.length === 0 ? (
        <p className="text-sm text-gray-500 py-4">Aucune liste de correspondance enregistree.</p>
      ) : (
        listes.map((liste) => (
          <div key={liste.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3 flex-wrap">
              <ListChecks className="text-ville-primary shrink-0" size={20} />
              {renaming?.id === liste.id ? (
                <>
                  <input
                    type="text"
                    value={renaming.nom}
                    onChange={(e) => setRenaming({ id: liste.id, nom: e.target.value })}
                    className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <button onClick={() => handleRename(liste)} className="p-2 text-green-600 hover:bg-green-50 rounded" title="Enregistrer">
                    <Save size={16} />
                  </button>
                  <button onClick={() => setRenaming(null)} className="p-2 text-gray-500 hover:bg-gray-100 rounded">
                    <X size={16} />
                  </button>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold text-ville-primary">{liste.nom}</h2>
                  <span className="text-xs text-gray-400 font-mono">cle: {liste.cle}</span>
                  <span className="text-xs text-gray-400">{liste.valeurs.length} valeur{liste.valeurs.length > 1 ? "s" : ""}</span>
                  <button onClick={() => setRenaming({ id: liste.id, nom: liste.nom })} className="ml-auto p-2 text-ville-primary hover:bg-blue-50 rounded" title="Renommer">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => handleDelete(liste)} className="p-2 text-red-500 hover:bg-red-50 rounded" title="Supprimer la liste">
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
            <div className="px-6 py-4">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="px-2 py-2 text-xs font-semibold text-gray-500 uppercase w-16">Code</th>
                    <th className="px-2 py-2 text-xs font-semibold text-gray-500 uppercase">Label</th>
                    <th className="px-2 py-2 text-xs font-semibold text-gray-500 uppercase w-20">Ordre</th>
                    <th className="px-2 py-2 text-right text-xs font-semibold text-gray-500 uppercase w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {liste.valeurs.sort((a, b) => a.ordre - b.ordre || a.code.localeCompare(b.code, undefined, { numeric: true })).map((v) => (
                    <tr key={v.id}>
                      {editing?.valueId === v.id ? (
                        <>
                          <td className="px-2 py-2">
                            <input
                              value={editing.code}
                              onChange={(e) => setEditing({ ...editing, code: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              value={editing.label}
                              onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              value={editing.ordre}
                              onChange={(e) => setEditing({ ...editing, ordre: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </td>
                          <td className="px-2 py-2 text-right">
                            <button onClick={() => handleSaveEdit(editing)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Enregistrer">
                              <Save size={16} />
                            </button>
                            <button onClick={() => setEditing(null)} className="p-1 text-gray-500 hover:bg-gray-100 rounded">
                              <X size={16} />
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-2 py-2 text-sm font-mono text-gray-600">{v.code}</td>
                          <td className="px-2 py-2 text-sm">{v.label}</td>
                          <td className="px-2 py-2 text-sm text-gray-500">{v.ordre}</td>
                          <td className="px-2 py-2 text-right">
                            <button
                              onClick={() => setEditing({ listeId: liste.id, valueId: v.id, code: v.code, label: v.label, ordre: String(v.ordre) })}
                              className="p-1 text-ville-primary hover:bg-blue-50 rounded"
                              title="Modifier"
                            >
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => handleDeleteValue(liste.id, v.id)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Supprimer">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {adding === liste.id ? (
                <div className="flex items-center gap-2 mt-3">
                  <input
                    type="text"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="Code (ex: 26)"
                    className="w-28 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Label (ex: Parrain / Marraine)"
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <button onClick={() => handleAddValue(liste.id)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Enregistrer">
                    <Save size={16} />
                  </button>
                  <button onClick={() => { setAdding(null); setNewCode(""); setNewLabel(""); }} className="p-1 text-gray-500 hover:bg-gray-100 rounded">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setAdding(liste.id); setNewCode(""); setNewLabel(""); }}
                  className="flex items-center gap-1 text-sm text-ville-primary hover:text-blue-700 mt-3"
                >
                  <Plus size={14} /> Ajouter une valeur
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}