import { useState, useEffect } from "react";
import { Globe, RefreshCw, CheckCircle, AlertCircle, Wifi } from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api";

interface ApiVilleConfig {
  url: string;
  port: string;
  token: string;
  description: string;
}

export default function ParametrageApiVille() {
  const [config, setConfig] = useState<ApiVilleConfig>({ url: "", port: "", token: "", description: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; statusCode?: number; latency?: number; message?: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/v1/parametrage/api-ville");
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
      await api.put("/api/v1/parametrage/api-ville", config);
      toast.success("Configuration sauvegardee");
    } catch {
      toast.error("Erreur sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTestResult(null);
    try {
      const res = await api.post("/api/v1/parametrage/api-ville/test");
      setTestResult(res.data);
    } catch {
      setTestResult({ ok: false, message: "Erreur de requete" });
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">Chargement...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-ville-dark">Parametrage - API Ville</h1>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-ville-primary flex items-center gap-2">
            <Globe size={20} />
            Configuration de la connexion
          </h2>
          <div className="flex gap-2">
            <button onClick={testConnection} className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
              <Wifi size={14} />
              Tester
            </button>
            <button onClick={save} disabled={saving} className="flex items-center gap-2 px-3 py-1.5 bg-ville-primary text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
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
                  <p className="font-medium">Connexion reussie</p>
                  <p className="text-xs mt-1">Status HTTP {testResult.statusCode} — Latence : {testResult.latency}ms</p>
                </>
              ) : (
                <>
                  <p className="font-medium">Echec de la connexion</p>
                  {testResult.message && <p className="text-xs mt-1">{testResult.message}</p>}
                  {testResult.latency !== undefined && <p className="text-xs mt-0.5">Latence : {testResult.latency}ms</p>}
                </>
              )}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL de base</label>
            <input
              type="text"
              value={config.url}
              onChange={(e) => setConfig({ ...config, url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="https://api.ivry.local"
            />
            <p className="text-xs text-gray-400 mt-1">URL du serveur de l'API Ville (sans le port)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
            <input
              type="text"
              value={config.port}
              onChange={(e) => setConfig({ ...config, port: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="443"
            />
            <p className="text-xs text-gray-400 mt-1">Port de connexion (laisser vide pour le port par defaut)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Token d'authentification</label>
            <input
              type="password"
              value={config.token}
              onChange={(e) => setConfig({ ...config, token: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Cle API..."
            />
            <p className="text-xs text-gray-400 mt-1">Token ou cle API pour l'authentification</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={config.description}
              onChange={(e) => setConfig({ ...config, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="API de la Ville"
            />
            <p className="text-xs text-gray-400 mt-1">Description rapide de cette API</p>
          </div>
        </div>
      </div>
    </div>
  );
}
