import { useState, useEffect } from "react";
import { MessageSquare, RefreshCw, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api";

interface MessagesConfig {
  sms_template: string;
  email_subject_template: string;
  email_content_template: string;
  defaults?: {
    sms_template: string;
    email_subject_template: string;
    email_content_template: string;
  };
}

const PLACEHOLDERS = [
  { key: "{{prenom}}", desc: "Prenom de l'usager concerne par la piece" },
  { key: "{{nom}}", desc: "Nom de l'usager concerne par la piece" },
  { key: "{{civilite}}", desc: "Civilite de l'usager (M., Mme, Mx)" },
  { key: "{{type_piece}}", desc: "CNI ou Passeport" },
  { key: "{{type_piece_label}}", desc: "Libelle complet (\"la carte nationale d'identite\" / \"le passeport\")" },
  { key: "{{destinataire_prenom}}", desc: "Prenom de la personne notifiee" },
  { key: "{{destinataire_nom}}", desc: "Nom de la personne notifiee" },
];

function render(template: string) {
  return template
    .replace(/{{\s*prenom\s*}}/g, "Jean")
    .replace(/{{\s*nom\s*}}/g, "DUPONT")
    .replace(/{{\s*civilite\s*}}/g, "M.")
    .replace(/{{\s*type_piece_label\s*}}/g, "la carte nationale d'identite")
    .replace(/{{\s*type_piece\s*}}/g, "CNI")
    .replace(/{{\s*destinataire_prenom\s*}}/g, "Jean")
    .replace(/{{\s*destinataire_nom\s*}}/g, "DUPONT");
}

export default function ParametrageMessagesDossiers() {
  const [config, setConfig] = useState<MessagesConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<MessagesConfig>("/api/v1/parametrage/dossiers-messages");
      setConfig(res.data);
    } catch {
      toast.error("Erreur chargement configuration");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await api.put("/api/v1/parametrage/dossiers-messages", {
        sms_template: config.sms_template,
        email_subject_template: config.email_subject_template,
        email_content_template: config.email_content_template,
      });
      setConfig((prev) => (prev ? { ...prev, ...res.data } : prev));
      toast.success("Modeles sauvegardes");
    } catch {
      toast.error("Erreur sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = () => {
    if (!config?.defaults) return;
    setConfig({ ...config, ...config.defaults });
  };

  if (loading || !config) return <div className="text-center py-12 text-gray-500">Chargement...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-ville-dark">Parametrage - Messages CNI / Passeport</h1>
      <p className="text-sm text-gray-500">
        Ces modeles sont utilises pour notifier les usagers lorsqu'une CNI ou un passeport est disponible en mairie.
      </p>

      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-semibold text-ville-primary">Variables disponibles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {PLACEHOLDERS.map((p) => (
            <div key={p.key} className="text-xs text-gray-500">
              <code className="bg-gray-100 text-ville-primary px-1.5 py-0.5 rounded">{p.key}</code>
              {" "}{p.desc}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-ville-primary flex items-center gap-2">
            <MessageSquare size={20} />
            Modele du SMS
          </h2>
        </div>
        <textarea
          value={config.sms_template}
          onChange={(e) => setConfig({ ...config, sms_template: e.target.value })}
          rows={3}
          maxLength={480}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
        />
        <p className="text-xs text-gray-400 mt-1">{config.sms_template.length} caracteres</p>
        <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
          <p className="text-xs text-gray-400 mb-1">Apercu (exemple : Jean DUPONT)</p>
          {render(config.sms_template)}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-ville-primary flex items-center gap-2">
          <MessageSquare size={20} />
          Modele de l'email
        </h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sujet</label>
          <input
            type="text"
            value={config.email_subject_template}
            onChange={(e) => setConfig({ ...config, email_subject_template: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contenu (HTML supporte)</label>
          <textarea
            value={config.email_content_template}
            onChange={(e) => setConfig({ ...config, email_content_template: e.target.value })}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
          />
        </div>
        <div className="p-3 bg-gray-50 rounded-lg text-sm space-y-1">
          <p className="text-xs text-gray-400">Apercu (exemple : Jean DUPONT)</p>
          <p className="font-medium">{render(config.email_subject_template)}</p>
          <div dangerouslySetInnerHTML={{ __html: render(config.email_content_template) }} />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={resetDefaults}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <RotateCcw size={14} />
          Reinitialiser aux valeurs par defaut
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-ville-primary text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw size={14} className={saving ? "animate-spin" : ""} />
          {saving ? "Sauvegarde..." : "Sauvegarder"}
        </button>
      </div>
    </div>
  );
}
