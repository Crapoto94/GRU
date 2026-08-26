import { useState, useEffect } from "react";
import { Database, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api";

interface DbInfo {
  connexion: {
    host: string;
    port: number;
    database: string;
    user: string;
    schema: string;
    version: string;
  };
  tables: string[];
  compteurs: {
    usagers: number;
    templates: number;
    attestations: number;
    users: number;
  };
}

export default function ParametrageDatabase() {
  const [dbInfo, setDbInfo] = useState<DbInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [testResult, setTestResult] = useState<{ ok: boolean; latency?: number } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/v1/parametrage/database");
      setDbInfo(res.data);
    } catch {
      toast.error("Erreur chargement infos BDD");
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setTestResult(null);
    try {
      const res = await api.post("/api/v1/parametrage/database/test");
      setTestResult({ ok: true, latency: res.data.latency });
    } catch {
      setTestResult({ ok: false });
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">Chargement...</div>;
  if (!dbInfo) return <div className="text-center py-12 text-gray-500">Erreur de chargement</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-ville-dark">Parametrage - Base de donnees</h1>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-ville-primary flex items-center gap-2">
            <Database size={20} />
            Connexion
          </h2>
          <div className="flex gap-2">
            <button onClick={testConnection} className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
              <CheckCircle size={14} />
              Tester
            </button>
            <button onClick={load} className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
              <RefreshCw size={14} />
              Actualiser
            </button>
          </div>
        </div>

        {testResult && (
          <div className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${testResult.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {testResult.ok ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {testResult.ok
              ? `Connexion OK - Latence : ${testResult.latency}ms`
              : "Echec de la connexion"
            }
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <InfoField label="Hote" value={dbInfo.connexion.host} />
          <InfoField label="Port" value={String(dbInfo.connexion.port)} />
          <InfoField label="Base de donnees" value={dbInfo.connexion.database} />
          <InfoField label="Utilisateur" value={dbInfo.connexion.user} />
          <InfoField label="Schema" value={dbInfo.connexion.schema} />
          <InfoField label="Version" value={dbInfo.connexion.version} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-ville-primary mb-4">Tables ({dbInfo.tables.length})</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {dbInfo.tables.map((t) => (
            <div key={t} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-sm">
              <Database size={14} className="text-gray-400" />
              {t}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-ville-primary mb-4">Compteurs</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <CounterCard label="Usagers" value={dbInfo.compteurs.usagers} />
          <CounterCard label="Templates" value={dbInfo.compteurs.templates} />
          <CounterCard label="Attestations" value={dbInfo.compteurs.attestations} />
          <CounterCard label="Utilisateurs" value={dbInfo.compteurs.users} />
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value || "-"}</p>
    </div>
  );
}

function CounterCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 text-center">
      <p className="text-2xl font-bold text-ville-dark">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}
