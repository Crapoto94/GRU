import { useState, useEffect, useCallback } from "react";
import { Search, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api";

interface LogEntry {
  id: string;
  utilisateur: string;
  action: string;
  table_concernee: string;
  record_id: string;
  details: Record<string, unknown> | null;
  ip_address: string;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  LOGIN: "bg-green-100 text-green-700",
  LOGIN_AD: "bg-green-100 text-green-700",
  REGISTER: "bg-blue-100 text-blue-700",
  CREATE_USER: "bg-blue-100 text-blue-700",
  CREATE_USER_AD: "bg-blue-100 text-blue-700",
  UPDATE_USER: "bg-yellow-100 text-yellow-700",
  UPDATE_USER_AD: "bg-yellow-100 text-yellow-700",
  DELETE_USER: "bg-red-100 text-red-700",
  CHANGE_PASSWORD: "bg-orange-100 text-orange-700",
  RESET_PASSWORD: "bg-orange-100 text-orange-700",
};

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState("");
  const [filterUser, setFilterUser] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterAction) params.action = filterAction;
      if (filterUser) params.utilisateur = filterUser;
      const res = await api.get("/api/v1/logs", { params });
      setLogs(res.data.rows);
      setTotal(res.data.total);
    } catch {
      toast.error("Erreur chargement des logs");
    } finally {
      setLoading(false);
    }
  }, [filterAction, filterUser]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ville-dark">Journal d'activite</h1>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            placeholder="Filtrer par action..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            placeholder="Filtrer par utilisateur..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Utilisateur</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Action</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Table</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Details</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {new Date(l.created_at).toLocaleString("fr-FR")}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">{l.utilisateur || "-"}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${ACTION_COLORS[l.action] || "bg-gray-100 text-gray-600"}`}>
                      {l.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{l.table_concernee || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                    {l.details ? JSON.stringify(l.details) : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{l.ip_address || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="px-6 py-3 border-t border-gray-200 text-sm text-gray-500">{total} entree(s)</div>
      </div>
    </div>
  );
}
