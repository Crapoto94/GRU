import { useState, useEffect } from "react";
import { X, Home, Save, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { usagersApi } from "../services/api";
import { formatNom, formatPrenom } from "../utils/format";
import type { Usager, Logement, StatutOccupation } from "../types";

interface Props {
  usager: Usager;
  onClose: () => void;
  onSaved: () => void;
}

type FormState = Partial<Logement>;

const ETATS_SANITAIRES = ["Normal", "Bon", "Vetuste", "Insalubre"];

export default function LogementModal({ usager, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormState>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existed, setExisted] = useState(false);

  useEffect(() => {
    usagersApi.getLogement(usager.id)
      .then((res) => {
        if (res.data) {
          setForm(res.data);
          setExisted(true);
        }
      })
      .catch(() => toast.error("Erreur chargement logement"))
      .finally(() => setLoading(false));
  }, [usager.id]);

  const set = (key: keyof FormState) => (value: string | number) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await usagersApi.saveLogement(usager.id, form);
      toast.success("Logement enregistre");
      onSaved();
      onClose();
    } catch (err: unknown) {
      let msg = "Erreur lors de l'enregistrement";
      if (err && typeof err === "object" && "response" in err) {
        const axErr = err as { response?: { data?: { error?: string } } };
        msg = axErr.response?.data?.error || msg;
      }
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Supprimer les informations de logement de cet usager ?")) return;
    try {
      await usagersApi.removeLogement(usager.id);
      toast.success("Informations de logement supprimees");
      onSaved();
      onClose();
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Home size={18} className="text-ville-primary" />
            <h2 className="text-lg font-bold text-ville-dark">
              Logement de {formatPrenom(usager.prenom)} {formatNom(usager.nom)}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {loading ? (
            <p className="text-center text-gray-500 py-8">Chargement...</p>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse complete</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                  {usager.Adresse || "-"}
                  {usager.code_postal && usager.ville && `, ${usager.code_postal} ${usager.ville}`}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Domicile principal de l'hebergeant — modifiable depuis la fiche usager
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">N° batiment / escalier</label>
                <input
                  type="text"
                  value={form.numero_batiment_escalier || ""}
                  onChange={(e) => set("numero_batiment_escalier")(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Surface du logement (m²)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.surface_logement ?? ""}
                    onChange={(e) => set("surface_logement")(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de pieces</label>
                  <input
                    type="number"
                    min={0}
                    value={form.nombre_pieces ?? ""}
                    onChange={(e) => set("nombre_pieces")(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Etat sanitaire</label>
                <input
                  type="text"
                  list="etats-sanitaires"
                  value={form.etat_sanitaire || ""}
                  onChange={(e) => set("etat_sanitaire")(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <datalist id="etats-sanitaires">
                  {ETATS_SANITAIRES.map((e) => <option key={e} value={e} />)}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Occupants habituels (age et lien de parente)
                </label>
                <textarea
                  value={form.occupants_habituels_details || ""}
                  onChange={(e) => set("occupants_habituels_details")(e.target.value)}
                  rows={2}
                  placeholder="Ex : 1 (39 ans, Concubin(e))"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Occupants permanents</label>
                  <input
                    type="number"
                    min={0}
                    value={form.occupants_permanents ?? ""}
                    onChange={(e) => set("occupants_permanents")(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Occupants temporaires</label>
                  <input
                    type="number"
                    min={0}
                    value={form.occupants_temporaires ?? ""}
                    onChange={(e) => set("occupants_temporaires")(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Statut d'occupation</label>
                <div className="flex gap-4 mb-2">
                  {(["proprietaire", "locataire", "autre"] as StatutOccupation[]).map((s) => (
                    <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="statut_occupation"
                        checked={form.statut_occupation === s}
                        onChange={() => set("statut_occupation")(s)}
                      />
                      {s === "proprietaire" ? "Proprietaire" : s === "locataire" ? "Locataire" : "Autre"}
                    </label>
                  ))}
                </div>
                {form.statut_occupation === "autre" && (
                  <input
                    type="text"
                    value={form.statut_occupation_precision || ""}
                    onChange={(e) => set("statut_occupation_precision")(e.target.value)}
                    placeholder="Preciser..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
          {existed ? (
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg text-sm"
            >
              <Trash2 size={14} />
              Supprimer
            </button>
          ) : <span />}
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="flex items-center gap-2 bg-ville-primary text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              <Save size={14} />
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
