import { NavLink, useNavigate } from "react-router-dom";
import { Users, FileText, Layout, Settings, LogOut, Database, Shield, Globe, ScrollText, Info } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getVersion, formatVersion } from "../services/version";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
    isActive
      ? "bg-ville-primary text-white"
      : "text-gray-600 hover:bg-gray-100 hover:text-ville-dark"
  }`;

const subLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 pl-11 pr-4 py-2 rounded-lg text-sm transition-colors ${
    isActive
      ? "bg-blue-50 text-ville-primary font-medium"
      : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
  }`;

export default function Sidebar() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen p-4 flex flex-col">
      <div className="mb-8 flex flex-col items-center text-center">
        <img src="/julto.jpg" alt="JULTO" className="w-24 h-24 rounded-xl object-cover mb-2" />
        <p className="text-xs text-gray-500">J'ai Un Lien pour Tout, Ouf !</p>
      </div>
      <nav className="space-y-1 flex-1">
        <NavLink to="/" className={linkClass}>
          <Layout size={18} />
          Tableau de bord
        </NavLink>
        <NavLink to="/usagers" className={linkClass}>
          <Users size={18} />
          Usagers
        </NavLink>
        <NavLink to="/attestations" className={linkClass}>
          <FileText size={18} />
          Attestations
        </NavLink>

        <div className="pt-2 mt-2 border-t border-gray-100">
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              settingsOpen
                ? "bg-gray-100 text-ville-dark"
                : "text-gray-600 hover:bg-gray-100 hover:text-ville-dark"
            }`}
          >
            <Settings size={18} />
            Parametrage
            <svg
              className={`ml-auto h-4 w-4 transition-transform ${settingsOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {settingsOpen && isAdmin && (
            <div className="mt-1 space-y-1">
              <NavLink to="/parametrage/attestations" className={subLinkClass}>
                <FileText size={14} />
                Templates attestations
              </NavLink>
              <NavLink to="/parametrage/base-de-donnees" className={subLinkClass}>
                <Database size={14} />
                Base de donnees
              </NavLink>
              <NavLink to="/parametrage/api-ville" className={subLinkClass}>
                <Globe size={14} />
                API Ville
              </NavLink>
              <NavLink to="/parametrage/utilisateurs" className={subLinkClass}>
                <Shield size={14} />
                Comptes utilisateurs
              </NavLink>
              <NavLink to="/parametrage/logs" className={subLinkClass}>
                <ScrollText size={14} />
                Journal d'activite
              </NavLink>
            </div>
          )}
        </div>
      </nav>

      <div className="border-t border-gray-100 pt-3 mt-3">
        <div className="px-4 mb-2">
          <p className="text-sm font-medium text-gray-800">{user?.prenom} {user?.nom}</p>
          <p className="text-xs text-gray-500">{user?.role === "administrateur" ? "Administrateur" : "Utilisateur"}</p>
        </div>
        <div className="flex items-center justify-between px-4 mb-2 text-xs text-gray-400">
          <span>Version {formatVersion(getVersion())}</span>
          <button className="flex items-center gap-1 hover:text-ville-primary transition" onClick={() => window.dispatchEvent(new CustomEvent("open-whats-new"))}>
            <Info size={12} /> Nouveautes
          </button>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition"
        >
          <LogOut size={16} />
          Deconnexion
        </button>
      </div>
    </aside>
  );
}
