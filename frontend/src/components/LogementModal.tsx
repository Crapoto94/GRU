import { useState, useEffect } from "react";
import { X, Home, Save, Trash2, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { usagersApi, listesApi } from "../services/api";
import { formatNom, formatPrenom } from "../utils/format";
import type { Usager, Logement, StatutOccupation, TypeLogement, ListeValeur } from "../types";

interface Props {
  usager: Usager;
  onClose: () => void;
  onSaved: () => void;
}

type FormState = Partial<Logement>;

const ETATS_SANITAIRES = ["Normal", "Bon", "Vetuste", "Insalubre"];
const TYPES_LOGEMENT: { value: TypeLogement; label: string }[] = [
  { value: "principal", label: "Logement principal" },
  { value: "secondaire", label: "Logement secondaire" },
];

// Occupants habituels : stockes en texte libre ("31 ans (Epouse), 4 ans (Fils)")
// mais edites via une liste structuree (age + lien de parente, table de
// correspondance lien_parente). parseOccupants/serializeOccupants font
// l'aller-retour texte <-> lignes editables.
interface OccupantRow {
  key: string;
  age: string;
  unite: "ans" | "mois";
  lienCode: string;
  lienRawLabel?: string; // conserve le libelle d'origine si le code n'est pas dans la table (ex: code 26 absent)
}

let occupantKeySeq = 0;
function newOccupantRow(partial: Partial<OccupantRow> = {}): OccupantRow {
  occupantKeySeq += 1;
  return { key: `occ_${occupantKeySeq}`, age: "", unite: "ans", lienCode: "", ...partial };
}

function parseOccupants(text: string | null | undefined, options: ListeValeur[]): OccupantRow[] {
  if (!text || !text.trim()) return [];
  return text.split(",").map((s) => s.trim()).filter(Boolean).map((part) => {
    const mMois = part.match(/^(\d+)\s+mois\s+\(([^)]*)\)$/);
    const mAns = part.match(/^(\d+)\s+ans?(?:\s+\d+\s+mois)?\s+\(([^)]*)\)$/);
    const m = mMois || mAns;
    if (!m) return newOccupantRow();
    const label = m[2];
    const found = options.find((o) => o.label === label);
    return newOccupantRow({
      age: m[1],
      unite: mMois ? "mois" : "ans",
      lienCode: found ? found.code : "",
      lienRawLabel: found ? undefined : label,
    });
  });
}

function serializeOccupants(rows: OccupantRow[], options: ListeValeur[]): string | null {
  const parts = rows
    .filter((r) => r.age && (r.lienCode || r.lienRawLabel))
    .map((r) => {
      const n = parseInt(r.age, 10);
      const ageText = r.unite === "mois" ? `${n} mois` : `${n} an${n > 1 ? "s" : ""}`;
      const label = r.lienCode ? options.find((o) => o.code === r.lienCode)?.label || r.lienCode : r.lienRawLabel || "";
      return `${ageText} (${label})`;
    });
  return parts.length ? parts.join(", ") : null;
}

export default function LogementModal({ usager, onClose, onSaved }: Props) {
  const [activeType, setActiveType] = useState<TypeLogement>("principal");
  const [form, setForm] = useState<FormState>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existed, setExisted] = useState(false);
  const [lienOptions, setLienOptions] = useState<ListeValeur[]>([]);
  const [pendingOccupantsText, setPendingOccupantsText] = useState<string | null>(null);
  const [occupants, setOccupants] = useState<OccupantRow[]>([]);

  useEffect(() => {
    listesApi.getByCle("lien_parente")
      .then((res) => setLienOptions(res.data.valeurs))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setForm({});
    setExisted(false);
    usagersApi.getLogement(usager.id, activeType)
      .then((res) => {
        if (res.data) {
          setForm(res.data);
          setExisted(true);
          setPendingOccupantsText(res.data.occupants_habituels_details ?? null);
        } else {
          setForm({
            adresse: usager.Adresse || "",
            complement_adresse: usager.complement_adresse || "",
            code_postal: usager.code_postal || "",
            ville: usager.ville || "",
            pays: usager.pays || "France",
          });
          setPendingOccupantsText(null);
        }
      })
      .catch(() => toast.error("Erreur chargement logement"))
      .finally(() => setLoading(false));
  }, [usager.id, activeType]);

  // Reparse les occupants en lignes editables des que le texte charge et/ou
  // la table de correspondance lien_parente sont disponibles.
  useEffect(() => {
    setOccupants(parseOccupants(pendingOccupantsText, lienOptions));
  }, [pendingOccupantsText, lienOptions]);

  const set = (key: keyof FormState) => (value: string | number) => setForm((prev) => ({ ...prev, [key]: value }));

  const updateOccupants = (next: OccupantRow[]) => {
    setOccupants(next);
    setForm((prev) => ({ ...prev, occupants_habituels_details: serializeOccupants(next, lienOptions) ?? undefined }));
  };

  const addOccupant = () => updateOccupants([...occupants, newOccupantRow()]);
  const removeOccupant = (key: string) => updateOccupants(occupants.filter((o) => o.key !== key));
  const updateOccupant = (key: string, patch: Partial<OccupantRow>) =>
    updateOccupants(occupants.map((o) => (o.key === key ? { ...o, ...patch, lienRawLabel: patch.lienCode !== undefined ? undefined : o.lienRawLabel } : o)));

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await usagersApi.saveLogement(usager.id, activeType, form);
      setForm(saved.data);
      setExisted(true);
      toast.success("Logement enregistre");
      onSaved();
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
    if (!window.confirm("Supprimer les informations de ce logement ?")) return;
    try {
      await usagersApi.removeLogement(usager.id, activeType);
      setForm({});
      setExisted(false);
      toast.success("Informations de logement supprimees");
      onSaved();
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

        <div className="flex gap-1 px-6 pt-3 border-b border-gray-200">
          {TYPES_LOGEMENT.map((t) => (
            <button
              key={t.value}
              onClick={() => setActiveType(t.value)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px ${
                activeType === t.value
                  ? "border-ville-primary text-ville-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {loading ? (
            <p className="text-center text-gray-500 py-8">Chargement...</p>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                <input
                  type="text"
                  value={form.adresse || ""}
                  onChange={(e) => set("adresse")(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Pre-remplie avec l'adresse de l'usager par defaut, modifiable pour ce logement.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Complement d'adresse</label>
                <input
                  type="text"
                  value={form.complement_adresse || ""}
                  onChange={(e) => set("complement_adresse")(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code postal</label>
                  <input
                    type="text"
                    value={form.code_postal || ""}
                    onChange={(e) => set("code_postal")(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                  <input
                    type="text"
                    value={form.ville || ""}
                    onChange={(e) => set("ville")(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Occupants habituels (age et lien de parente)
                  </label>
                  <button
                    type="button"
                    onClick={addOccupant}
                    className="flex items-center gap-1 text-xs font-medium text-ville-primary hover:bg-blue-50 px-2 py-1 rounded-lg"
                  >
                    <Plus size={14} />
                    Ajouter un occupant
                  </button>
                </div>
                {occupants.length === 0 ? (
                  <p className="text-xs text-gray-400">Aucun occupant renseigne.</p>
                ) : (
                  <div className="space-y-2">
                    {occupants.map((o) => (
                      <div key={o.key} className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          value={o.age}
                          onChange={(e) => updateOccupant(o.key, { age: e.target.value })}
                          placeholder="Age"
                          className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                        />
                        <select
                          value={o.unite}
                          onChange={(e) => updateOccupant(o.key, { unite: e.target.value as "ans" | "mois" })}
                          className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="ans">an(s)</option>
                          <option value="mois">mois</option>
                        </select>
                        <select
                          value={o.lienCode || (o.lienRawLabel ? "__raw__" : "")}
                          onChange={(e) => updateOccupant(o.key, { lienCode: e.target.value })}
                          className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="">-- Lien de parente --</option>
                          {o.lienRawLabel && (
                            <option value="__raw__" disabled>{o.lienRawLabel} (non repertorie)</option>
                          )}
                          {lienOptions.map((l) => (
                            <option key={l.id} value={l.code}>{l.label}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => removeOccupant(o.key)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0"
                          title="Retirer cet occupant"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
