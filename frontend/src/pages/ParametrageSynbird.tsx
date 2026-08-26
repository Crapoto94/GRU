import { useState, useEffect } from "react";
import { Calendar, RefreshCw, CheckCircle, AlertCircle, Wifi, Key } from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api";

interface SynbirdConfig {
  url: string;
  token: string;
  description: string;
}

export default function ParametrageSynbird() {
  const [config, setConfig] = useState<SynbirdConfig>({ url: "", token: "", description: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; statusCode?: number; latency?: number; message?: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/v1/parametrage/synbird");
      setConfig(res.data);
    } catch {
      toast.error("Erreur chargement configuration");
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/api/v1/parametrage/synbird", config);
      toast.success("Configuration Synbird sauvegardee");
    } catch {
      toast.error("Erreur sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.post("/api/v1/parametrage/synbird/test", config);
      setTestResult(res.data);
    } catch {
      setTestResult({ ok: false, message: "Erreur de requete" });
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">Chargement...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-ville-dark">Parametrage - API Synbird (RDV)</h1>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-ville-primary flex items-center gap-2">
            <Calendar size={20} />
            Configuration Synbird
          </h2>
          <div className="flex gap-2">
            <button
              onClick={testConnection}
              disabled={testing || !config.url || !config.token}
              className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Wifi size={14} />
              Verifier le jeton
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 px-3 py-1.5 bg-ville-primary text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw size={14} className={saving ? "animate-spin" : ""} />
              {saving ? "Sauvegarde..." : "Sauvegarder"}
            </button>
          </div>
        </div>

        {testResult && (
          <div className={`mb-6 p-4 rounded-lg text-sm flex items-start gap-3 ${testResult.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {testResult.ok ? <CheckCircle size={18} className="mt-0.5" /> : <AlertCircle size={18} className="mt-0.5" />}
            <div>
              {testResult.ok ? (
                <>
                  <p className="font-medium">Verification du jeton reussie</p>
                  <p className="text-xs mt-1">Status HTTP {testResult.statusCode} — Latence : {testResult.latency}ms</p>
                </>
              ) : (
                <>
                  <p className="font-medium">Echec de la verification</p>
                  {testResult.message && <p className="text-xs mt-1">{testResult.message}</p>}
                  {testResult.latency !== undefined && <p className="text-xs mt-0.5">Latence : {testResult.latency}ms</p>}
                </>
              )}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL de base Synbird</label>
            <input
              type="text"
              value={config.url}
              onChange={(e) => setConfig({ ...config, url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="https://api.synbird.com"
            />
            <p className="text-xs text-gray-400 mt-1">URL de l'API Synbird (ex: https://api.synbird.com)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Token d'authentification (Jeton API)</label>
            <div className="relative">
              <input
                type="password"
                value={config.token}
                onChange={(e) => setConfig({ ...config, token: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm pr-10"
                placeholder="Votre jeton API Synbird"
              />
              <button
                type="button"
                onClick={() => {
                  const input = document.querySelector('input[type="password"]') as HTMLInputElement;
                  if (input) input.type = input.type === "password" ? "text" : "password";
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <Key size={16} />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Jeton d'acces Synbird pour l'authentification</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={config.description}
              onChange={(e) => setConfig({ ...config, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="API Synbird - Gestion des RDV"
            />
            <p className="text-xs text-gray-400 mt-1">Description rapide de cette connexion</p>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-sm text-blue-800">
            <strong>Utilisation :</strong> Cette configuration permet a JULTO de communiquer avec Synbird pour la gestion des rendez-vous usagers
            (creation, modification, annulation, consultation des creneaux).
          </p>
        </div>
      </div>
    </div>
  );
}