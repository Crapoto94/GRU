import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Trash2, Save } from "lucide-react";
import toast from "react-hot-toast";
import { formatNom, formatPrenom } from "../utils/format";
import { usagersApi, dossiersApi } from "../services/api";
import type { Usager, TypePiece, CanalNotification } from "../types";

interface Ligne {
  usager: Usager;
  types: TypePiece[];
  date_demande: string;
  destinataire_usager_id: string;
  canal_notification: CanalNotification;
}

const today = () => new Date().toISOString().slice(0, 10);

export default function DossierForm() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<Usager[]>([]);
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.trim()) {
        usagersApi.list({ search, limit: 10 }).then((res) => setSuggestions(res.data.rows));
      } else {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const addUsager = (usager: Usager) => {
    if (lignes.some((l) => l.usager.id === usager.id)) {
      toast.error("Cet usager est deja dans le dossier");
      return;
    }
    setLignes((prev) => [
      ...prev,
      {
        usager,
        types: ["CNI"],
        date_demande: today(),
        destinataire_usager_id: usager.id,
        canal_notification: "email",
      },
    ]);
    setSearch("");
    setSuggestions([]);
  };

  const removeLigne = (usagerId: string) => {
    setLignes((prev) => {
      const next = prev.filter((l) => l.usager.id !== usagerId);
      // Si le destinataire supprime etait choisi ailleurs, on retombe sur l'usager de la ligne
      return next.map((l) =>
        l.destinataire_usager_id === usagerId ? { ...l, destinataire_usager_id: l.usager.id } : l
      );
    });
  };

  const toggleType = (usagerId: string, type: TypePiece) => {
    setLignes((prev) =>
      prev.map((l) => {
        if (l.usager.id !== usagerId) return l;
        const has = l.types.includes(type);
        return { ...l, types: has ? l.types.filter((t) => t !== type) : [...l.types, type] };
      })
    );
  };

  const updateLigne = (usagerId: string, patch: Partial<Ligne>) => {
    setLignes((prev) => prev.map((l) => (l.usager.id === usagerId ? { ...l, ...patch } : l)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lignes.length === 0) {
      toast.error("Ajoutez au moins un usager");
      return;
    }
    if (lignes.some((l) => l.types.length === 0)) {
      toast.error("Chaque usager doit avoir au moins une piece (CNI ou Passeport)");
      return;
    }
    if (lignes.some((l) => !l.date_demande)) {
      toast.error("La date de demande est requise pour chaque usager");
      return;
    }
    setSaving(true);
    try {
      const res = await dossiersApi.create({
        lignes: lignes.map((l) => ({
          usager_id: l.usager.id,
          types: l.types,
          date_demande: l.date_demande,
          destinataire_usager_id: l.destinataire_usager_id,
          canal_notification: l.canal_notification,
        })),
      });
      toast.success("Dossier cree");
      navigate(`/dossiers/${res.data.id}`);
    } catch (err: unknown) {
      let msg = "Erreur lors de la creation du dossier";
      if (err && typeof err === "object" && "response" in err) {
        const axErr = err as { response?: { data?: { error?: string } } };
        msg = axErr.response?.data?.error || msg;
      }
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/dossiers")} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-ville-dark">Nouveau dossier CNI / Passeport</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-ville-primary mb-4">Ajouter un usager</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un usager par nom, prenom..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          {suggestions.length > 0 && (
            <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
              {suggestions.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => addUsager(u)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0"
                >
                  {formatPrenom(u.prenom)} {formatNom(u.nom)}
                  {u.ville && <span className="text-gray-500 ml-2">- {u.ville}</span>}
                </button>
              ))}
            </div>
          )}
        </section>

        {lignes.map((ligne) => (
          <section key={ligne.usager.id} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-ville-dark">
                {formatPrenom(ligne.usager.prenom)} {formatNom(ligne.usager.nom)}
              </h3>
              <button
                type="button"
                onClick={() => removeLigne(ligne.usager.id)}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Piece(s) demandee(s)</label>
              <div className="flex gap-4">
                {(["CNI", "Passeport"] as TypePiece[]).map((type) => (
                  <label key={type} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ligne.types.includes(type)}
                      onChange={() => toggleType(ligne.usager.id, type)}
                      className="rounded"
                    />
                    {type}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date de la demande</label>
                <input
                  type="date"
                  value={ligne.date_demande}
                  onChange={(e) => updateLigne(ligne.usager.id, { date_demande: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">A notifier des dispo</label>
                <select
                  value={ligne.destinataire_usager_id}
                  onChange={(e) => updateLigne(ligne.usager.id, { destinataire_usager_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  {lignes.map((l2) => (
                    <option key={l2.usager.id} value={l2.usager.id}>
                      {formatPrenom(l2.usager.prenom)} {formatNom(l2.usager.nom)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Canal de notification</label>
                <select
                  value={ligne.canal_notification}
                  onChange={(e) => updateLigne(ligne.usager.id, { canal_notification: e.target.value as CanalNotification })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="both">Email + SMS</option>
                </select>
              </div>
            </div>
          </section>
        ))}

        {lignes.length > 0 && (
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate("/dossiers")}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-ville-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? "Creation..." : "Creer le dossier"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
