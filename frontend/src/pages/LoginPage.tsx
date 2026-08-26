import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, User, Monitor, Database } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loginVal, setLoginVal] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"local" | "ad">("local");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = mode === "ad" ? "/api/v1/auth/login-ad" : "/api/v1/auth/login";
      const res = await api.post(endpoint, { login: loginVal, password });
      login(res.data.token, res.data.user);
      toast.success(`Bienvenue ${res.data.user.prenom} !`);
      navigate("/");
    } catch {
      toast.error(mode === "ad" ? "Identifiants AD invalides" : "Identifiants invalides");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ville-light flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/julto.jpg" alt="JULTO" className="w-32 h-32 rounded-xl object-cover mx-auto mb-3" />
          <p className="text-sm text-gray-500 mt-1">J'ai Un Lien pour Tout, Ouf !</p>
        </div>

        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setMode("local")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition ${
              mode === "local" ? "bg-white text-ville-primary shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Database size={16} />
            Base de donnees
          </button>
          <button
            type="button"
            onClick={() => setMode("ad")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition ${
              mode === "ad" ? "bg-white text-ville-primary shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Monitor size={16} />
            Active Directory
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {mode === "ad" ? "Identifiant Windows" : "Login"}
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={loginVal}
                onChange={(e) => setLoginVal(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ville-primary focus:border-transparent"
                placeholder={mode === "ad" ? "EX: NOM.Prenom" : "Votre login"}
                required
                autoFocus
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {mode === "ad" ? "Mot de passe Windows" : "Mot de passe"}
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ville-primary focus:border-transparent"
                placeholder={mode === "ad" ? "Mot de passe Windows" : "Votre mot de passe"}
                required
              />
            </div>
          </div>
          {mode === "ad" && (
            <p className="text-xs text-gray-400">Authentification via le controleur de domaine Active Directory</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ville-primary text-white py-2 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}
