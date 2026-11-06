import { useState, useEffect } from "react";
import { X, Home, Save, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { usagersApi } from "../services/api";
import LogementFields from "./LogementFields";
import { formatNom, formatPrenom } from "../utils/format";
import type { Usager, Logement, TypeLogement } from "../types";

interface Props {
  usager: Usager;
  onClose: () => void;
  onSaved: () => void;
}

type FormState = Partial<Logement>;

const TYPES_LOGEMENT: { value: TypeLogement; label: string }[] = [
  { value: "principal", label: "Logement principal" },
  { value: "secondaire", label: "Logement secondaire" },
];

export default function LogementModal({ usager, onClose, onSaved }: Props) {
  const [activeType, setActiveType] = useState<TypeLogement>("principal");
  const [form, setForm] = useState<FormState>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existed, setExisted] = useState(false);
  const [pendingOccupantsText, setPendingOccupantsText] = useState<string | null>(null);

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

  const patch = (p: Partial<Logement>) => setForm((prev) => ({ ...prev, ...p }));

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
              <LogementFields form={form} onChange={patch} occupantsSeed={pendingOccupantsText} />
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
