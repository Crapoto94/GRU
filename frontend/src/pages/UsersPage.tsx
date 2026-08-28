import { useState, useEffect, useCallback } from "react";
import { Plus, Edit, Trash2, Shield, UserCheck, Search, X, Loader2, KeyRound } from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api";

interface AppUser {
  id: string;
  login: string;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  fonction: string | null;
  service: string | null;
  direction: string | null;
  source: string;
  actif: boolean;
  created_at: string;
}

interface ADUser {
  sAMAccountName?: string;
  displayName?: string;
  sn?: string;
  givenName?: string;
  mail?: string;
  title?: string;
  department?: string;
  company?: string;
  dn?: string;
  [key: string]: unknown;
}

export default function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [form, setForm] = useState({ login: "", nom: "", prenom: "", email: "", password: "", role: "utilisateur", fonction: "", service: "", direction: "" });

  const [showAD, setShowAD] = useState(false);
  const [adQuery, setAdQuery] = useState("");
  const [adResults, setAdResults] = useState<ADUser[]>([]);
  const [adLoading, setAdLoading] = useState(false);
  const [adSelected, setAdSelected] = useState<ADUser | null>(null);

  const [resetUser, setResetUser] = useState<AppUser | null>(null);
  const [resetPassword, setResetPassword] = useState("");

  const load = async () => {
    try {
      const res = await api.get("/api/v1/users");
      setUsers(res.data.rows);
      setTotal(res.data.total);
    } catch {
      toast.error("Erreur chargement");
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setAdSelected(null);
    setForm({ login: "", nom: "", prenom: "", email: "", password: "", role: "utilisateur", fonction: "", service: "", direction: "" });
    setShowForm(true);
  };

  const openEdit = (u: AppUser) => {
    setEditing(u);
    setAdSelected(null);
    setForm({
      login: u.login, nom: u.nom, prenom: u.prenom, email: u.email, password: "",
      role: u.role, fonction: u.fonction || "", service: u.service || "", direction: u.direction || "",
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        const data: Record<string, string> = { ...form };
        if (!data.password) delete data.password;
        await api.put(`/api/v1/users/${editing.id}`, data);
        toast.success("Utilisateur modifie");
      } else if (adSelected) {
        await api.post("/api/v1/users/create-from-ad", form);
        toast.success("Compte cree depuis l'AD");
      } else {
        await api.post("/api/v1/users", form);
        toast.success("Utilisateur cree");
      }
      setShowForm(false);
      setAdSelected(null);
      load();
    } catch (err: unknown) {
      let msg = "Erreur inconnue";
      if (err && typeof err === "object" && "response" in err) {
        const axErr = err as { response?: { data?: { error?: string }; status?: number } };
        msg = axErr.response?.data?.error || `Erreur HTTP ${axErr.response?.status}`;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      toast.error(msg);
    }
  };

  const handleDelete = async (id: string, login: string) => {
    if (!window.confirm(`Supprimer l'utilisateur "${login}" ?`)) return;
    try {
      await api.delete(`/api/v1/users/${id}`);
      toast.success("Supprime");
      load();
    } catch {
      toast.error("Erreur suppression");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser) return;
    try {
      await api.post(`/api/v1/users/${resetUser.id}/reset-password`, { password: resetPassword });
      toast.success(`Mot de passe reinitialise pour ${resetUser.login}`);
      setResetUser(null);
      setResetPassword("");
    } catch (err: unknown) {
      let msg = "Erreur inconnue";
      if (err && typeof err === "object" && "response" in err) {
        const axErr = err as { response?: { data?: { error?: string } } };
        msg = axErr.response?.data?.error || msg;
      }
      toast.error(msg);
    }
  };

  const searchAD = useCallback(async (query: string) => {
    if (query.length < 2) { setAdResults([]); return; }
    setAdLoading(true);
    try {
      const res = await api.get("/api/v1/ad/search", { params: { q: query } });
      setAdResults(Array.isArray(res.data) ? res.data : res.data.users || []);
    } catch {
      toast.error("Erreur recherche AD");
      setAdResults([]);
    } finally {
      setAdLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { if (showAD) searchAD(adQuery); }, 300);
    return () => clearTimeout(timer);
  }, [adQuery, showAD, searchAD]);

  const selectADUser = async (ad: ADUser) => {
    setAdSelected(ad);
    const identifier = ad.sAMAccountName || "";
    let fullDetails: ADUser = { ...ad };
    try {
      const res = await api.get("/api/v1/ad/user", { params: { identifier } });
      const u = res.data.user || res.data;
      if (u) {
        fullDetails = {
          ...fullDetails,
          sAMAccountName: u.sAMAccountName || u.samaccountname || fullDetails.sAMAccountName,
          sn: u.sn || u.surname || u.lastName || fullDetails.sn,
          givenName: u.givenName || u.givenname || u.firstName || fullDetails.givenName,
          mail: u.mail || u.email || fullDetails.mail,
          title: u.title || u.jobTitle || fullDetails.title,
          department: u.department || fullDetails.department,
          company: u.company || fullDetails.company,
          dn: u.dn || fullDetails.dn,
        };
      }
    } catch {
      // on garde les donnees de la recherche
    }
    setForm({
      login: fullDetails.sAMAccountName || identifier,
      nom: fullDetails.sn || "",
      prenom: fullDetails.givenName || "",
      email: fullDetails.mail || "",
      password: "",
      role: "utilisateur",
      fonction: fullDetails.title || "",
      service: fullDetails.department || "",
      direction: fullDetails.company || "",
    });
    setShowAD(false);
    setShowForm(true);
    setAdQuery("");
    setAdResults([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ville-dark">Comptes utilisateurs</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowAD(true)} className="flex items-center gap-2 bg-ville-secondary text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition text-sm">
            <Search size={16} /> Ajouter depuis l'AD
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 bg-ville-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm">
            <Plus size={16} /> Nouveau compte
          </button>
        </div>
      </div>

      {showAD && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-ville-primary flex items-center gap-2">
              <Search size={20} />
              Rechercher dans l'Active Directory
            </h2>
            <button onClick={() => { setShowAD(false); setAdQuery(""); setAdResults([]); }} className="p-1 hover:bg-gray-100 rounded">
              <X size={18} />
            </button>
          </div>
          <input
            type="text"
            value={adQuery}
            onChange={(e) => setAdQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm mb-4"
            placeholder="Tapez au moins 2 lettres (nom, prenom, login)..."
            autoFocus
          />
          {adLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
              <Loader2 size={16} className="animate-spin" />
              Recherche en cours...
            </div>
          )}
          {!adLoading && adResults.length > 0 && (
            <div className="border border-gray-200 rounded-lg divide-y max-h-64 overflow-y-auto">
              {adResults.map((ad, i) => (
                <button
                  key={i}
                  onClick={() => selectADUser(ad)}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 transition text-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{ad.givenName} {ad.sn}</span>
                      <span className="text-gray-500 ml-2">({ad.sAMAccountName})</span>
                    </div>
                    <span className="text-gray-400 text-xs">{ad.mail}</span>
                  </div>
                  {(ad.title || ad.department) && (
                    <div className="text-xs text-gray-400 mt-1">
                      {ad.title && <span>{ad.title}</span>}
                      {ad.title && ad.department && <span> - </span>}
                      {ad.department && <span>{ad.department}</span>}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
          {!adLoading && adQuery.length >= 2 && adResults.length === 0 && (
            <p className="text-sm text-gray-500 py-4">Aucun resultat</p>
          )}
        </div>
      )}

      {resetUser && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-amber-600 flex items-center gap-2">
              <KeyRound size={20} />
              Reinitialiser le mot de passe de {resetUser.login}
            </h2>
            <button onClick={() => { setResetUser(null); setResetPassword(""); }} className="p-1 hover:bg-gray-100 rounded">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleResetPassword} className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
              <input type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required autoFocus minLength={4} />
            </div>
            <button type="submit" className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 text-sm whitespace-nowrap">Reinitialiser</button>
            <button type="button" onClick={() => { setResetUser(null); setResetPassword(""); }} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Annuler</button>
          </form>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-ville-primary mb-4">
            {editing ? "Modifier" : adSelected ? "Creer depuis l'AD" : "Creer"} un compte
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Login *</label>
                <input type="text" value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required disabled={!!editing || !!adSelected} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="utilisateur">Utilisateur</option>
                  <option value="administrateur">Administrateur</option>
                  <option value="dpd">DPD (Delegue Protection des Donnees)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                <input type="text" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prenom *</label>
                <input type="text" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fonction</label>
                <input type="text" value={form.fonction} onChange={(e) => setForm({ ...form, fonction: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Ex: Chef de service" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
                <input type="text" value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Ex: Etat civil" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
                <input type="text" value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Ex: Direction generale" />
              </div>
              {!editing && !adSelected && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe *</label>
                  <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
                </div>
              )}
            </div>
            {adSelected && (
              <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                Compte importe depuis l'AD. L'utilisateur pourra se connecter avec ses identifiants Windows.
              </p>
            )}
            <div className="flex gap-2">
              <button type="submit" className="bg-ville-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
                {editing ? "Modifier" : "Creer"}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setAdSelected(null); }} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Annuler</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Login</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Nom / Prenom</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Fonction</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Service</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Direction</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Source</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium">{u.login}</td>
                <td className="px-4 py-3 text-sm">{u.prenom} {u.nom}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{u.fonction || "-"}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{u.service || "-"}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{u.direction || "-"}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    u.role === "administrateur" ? "bg-purple-100 text-purple-700" : u.role === "dpd" ? "bg-teal-100 text-teal-700" : "bg-gray-100 text-gray-600"
                  }`}>
                    {u.role === "administrateur" ? <Shield size={12} /> : <UserCheck size={12} />}
                    {u.role === "administrateur" ? "administrateur" : u.role === "dpd" ? "DPD" : u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    u.source === "ad" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                  }`}>
                    {u.source === "ad" ? "AD" : "Local"}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-right">
                  <div className="flex items-center justify-end gap-2">
                    {u.source !== "ad" && <button onClick={() => { setResetUser(u); setResetPassword(""); }} className="p-1 text-amber-600 hover:bg-amber-50 rounded" title="Reinitialiser le mot de passe"><KeyRound size={16} /></button>}
                    <button onClick={() => openEdit(u)} className="p-1 text-gray-500 hover:bg-gray-100 rounded" title="Modifier"><Edit size={16} /></button>
                    <button onClick={() => handleDelete(u.id, u.login)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Supprimer"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-6 py-3 border-t border-gray-200 text-sm text-gray-500">{total} utilisateur(s)</div>
      </div>
    </div>
  );
}
