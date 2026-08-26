import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Save, ArrowLeft, Search, AlertTriangle, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { formatNom, formatPrenom } from "../utils/format";
import { usagersApi } from "../services/api";
import type { Usager } from "../types";

const SITUATIONS = ["Celibataire", "Marie(e)", "Divorce(e)", "Veuf(ve)", "Pacs(e)", "Concubin(e)"];
const CIVILITES = ["M.", "Mme", "Mlle"];
const PAYS = [
  "France","Allemagne","Algerie","Belgique","Bresil","Burkina Faso","Cameroun",
  "Canada","Chine","Cote d'Ivoire","Espagne","Etats-Unis","Gabon","Grece",
  "Haiti","Hongrie","Inde","Irak","Irlande","Italie","Japon","Kenya",
  "Liban","Madagascar","Maroc","Maurice","Mali","Mexique","Niger",
  "Nigeria","Pays-Bas","Perou","Pologne","Portugal","Royaume-Uni",
  "Roumanie","Russie","Senegal","Suisse","Tunisie","Turquie","Ukraine",
].sort();

interface AdresseSuggestion {
  label: string;
  score: number;
  city?: string;
  postcode?: string;
  street?: string;
  numero?: string;
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
  disabled = false,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ville-primary focus:border-transparent text-sm disabled:bg-gray-50"
      />
    </div>
  );
}

export default function UsagerForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [saving, setSaving] = useState(false);
  const [adresseSuggestions, setAdresseSuggestions] = useState<AdresseSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [adresseFromAPI, setAdresseFromAPI] = useState(false);
  const [showDoublonModal, setShowDoublonModal] = useState(false);
  const [doublonsNom, setDoublonsNom] = useState<Usager[]>([]);
  const [doublonsTel, setDoublonsTel] = useState<Usager[]>([]);
  const [selectedDoublon, setSelectedDoublon] = useState<Usager | null>(null);
  const [form, setForm] = useState<Partial<Usager>>({
    civilite: "M.",
    nom: "",
    prenom: "",
    date_naissance: "",
    lieu_naissance: "",
    pays_naissance: "France",
    nationalite: "Francaise",
    situation_familiale: "",
    email: "",
    telephone: "",
    mobile: "",
    Adresse: "",
    complement_adresse: "",
    code_postal: "",
    ville: "",
    pays: "France",
    consentement_rgpd: false,
    mail_actif: true,
  });

  useEffect(() => {
    if (isEdit && id) {
      usagersApi.getById(id).then((res) => {
        const u = res.data;
        setForm({
          ...u,
          date_naissance: u.date_naissance ? u.date_naissance.split("T")[0] : "",
        });
      });
    }
  }, [id, isEdit]);

  const searchAdresse = useCallback(async (q: string) => {
    if (q.length < 3) { setAdresseSuggestions([]); return; }
    try {
      const res = await usagersApi.validateAdresse(q);
      setAdresseSuggestions(res.data.suggestions || []);
      setShowSuggestions(true);
      setAdresseFromAPI(false);
    } catch {
      setAdresseSuggestions([]);
    }
  }, []);

  const selectAdresse = (s: AdresseSuggestion) => {
    setForm((prev) => ({
      ...prev,
      Adresse: s.label || "",
      code_postal: s.postcode || "",
      ville: s.city || "",
    }));
    setAdresseFromAPI(true);
    setShowSuggestions(false);
    setAdresseSuggestions([]);
  };

  const set = (field: string) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "Adresse") {
      searchAdresse(value);
      setAdresseFromAPI(false);
    }
  };

  const checkDoublons = async () => {
    const params: Record<string, string> = {};
    if (form.nom) params.nom = form.nom;
    if (form.date_naissance) params.date_naissance = form.date_naissance;
    if (form.telephone) params.telephone = form.telephone;
    if (isEdit && id) params.exclude_id = id;
    if (!params.nom && !params.telephone) return { nom_date: [], telephone: [] };
    try {
      const res = await usagersApi.checkDoublon(params);
      return res.data;
    } catch {
      return { nom_date: [], telephone: [] };
    }
  };

  const doSave = async () => {
    setSaving(true);
    try {
      if (isEdit && id) {
        await usagersApi.update(id, form);
        toast.success("Usager mis a jour");
      } else {
        await usagersApi.create(form);
        toast.success("Usager cree");
      }
      navigate("/usagers");
    } catch (err: unknown) {
      let msg = "Erreur lors de la sauvegarde";
      if (err && typeof err === "object" && "response" in err) {
        const axErr = err as { response?: { data?: { error?: string } } };
        msg = axErr.response?.data?.error || msg;
      }
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom || !form.prenom || !form.date_naissance) {
      toast.error("Nom, prenom et date de naissance sont requis");
      return;
    }
    if (!adresseFromAPI && form.Adresse && form.Adresse.length > 5) {
      const ok = window.confirm("L'adresse saisie n'est pas normalisee. Voulez-vous quand meme continuer ?");
      if (!ok) return;
    }
    const doublons = await checkDoublons();
    const hasDoublons = (doublons.nom_date.length > 0) || (doublons.telephone.length > 0);
    if (hasDoublons) {
      setDoublonsNom(doublons.nom_date);
      setDoublonsTel(doublons.telephone);
      setShowDoublonModal(true);
      return;
    }
    await doSave();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/usagers")} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-ville-dark">
          {isEdit ? "Modifier l'usager" : "Nouvel usager"}
        </h1>
      </div>

      {showDoublonModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 space-y-4">
            {selectedDoublon ? (
              <>
                <h2 className="text-lg font-bold text-ville-dark">Fiche usager</h2>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-500">Civilite :</span> {selectedDoublon.civilite}</div>
                  <div><span className="text-gray-500">Nom :</span> {selectedDoublon.nom}</div>
                  <div><span className="text-gray-500">Prenom :</span> {selectedDoublon.prenom}</div>
                  <div><span className="text-gray-500">N(e) le :</span> {new Date(selectedDoublon.date_naissance).toLocaleDateString("fr-FR")}</div>
                  <div><span className="text-gray-500">Email :</span> {selectedDoublon.email || "-"}</div>
                  <div><span className="text-gray-500">Telephone :</span> {selectedDoublon.telephone || "-"}</div>
                  <div><span className="text-gray-500">Mobile :</span> {selectedDoublon.mobile || "-"}</div>
                  <div><span className="text-gray-500">Ville :</span> {selectedDoublon.ville || "-"}</div>
                  {selectedDoublon.Adresse && <div className="col-span-2"><span className="text-gray-500">Adresse :</span> {selectedDoublon.Adresse}</div>}
                  {selectedDoublon.complement_adresse && <div className="col-span-2"><span className="text-gray-500">Complement :</span> {selectedDoublon.complement_adresse}</div>}
                </div>
                <div className="flex gap-2 justify-end pt-2 border-t">
                  <button onClick={() => setShowDoublonModal(false)} className="px-4 py-2 border rounded-lg text-sm">
                    Annuler
                  </button>
                  <button onClick={() => { setSelectedDoublon(null); }} className="px-4 py-2 border rounded-lg text-sm">
                    Retour a la liste
                  </button>
                  <button onClick={() => { setShowDoublonModal(false); doSave(); }} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                    Creer nouvel usager
                  </button>
                  <button onClick={() => { setShowDoublonModal(false); navigate(`/usagers/${selectedDoublon.id}`); }} className="px-4 py-2 bg-ville-primary text-white rounded-lg text-sm hover:bg-blue-700">
                    Mettre a jour la fiche
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-ville-dark flex items-center gap-2">
                  <AlertTriangle className="text-orange-500" size={22} />
                  Doublons detectes
                </h2>
                {doublonsNom.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Usager(s) avec le meme nom et date de naissance ({doublonsNom.length}) :
                    </p>
                    <div className="border rounded-lg divide-y">
                      {doublonsNom.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => setSelectedDoublon(d)}
                          className="w-full text-left px-4 py-3 text-sm flex items-center justify-between hover:bg-blue-50 transition"
                        >
                          <div>
                            <span className="font-medium">{formatPrenom(d.prenom)} {formatNom(d.nom)}</span>
                            <span className="text-gray-500 ml-2">ne le {new Date(d.date_naissance).toLocaleDateString("fr-FR")}</span>
                            {d.ville && <span className="text-gray-400 ml-2">({d.ville})</span>}
                          </div>
                          <span className="text-xs text-ville-primary">Voir &rarr;</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {doublonsTel.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Usager(s) avec le meme numero de telephone ({doublonsTel.length}) :
                    </p>
                    <div className="border rounded-lg divide-y">
                      {doublonsTel.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => setSelectedDoublon(d)}
                          className="w-full text-left px-4 py-3 text-sm flex items-center justify-between hover:bg-blue-50 transition"
                        >
                          <div>
                            <span className="font-medium">{formatPrenom(d.prenom)} {formatNom(d.nom)}</span>
                            <span className="text-gray-500 ml-2">{d.telephone || d.mobile}</span>
                          </div>
                          <span className="text-xs text-ville-primary">Voir &rarr;</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2 justify-end pt-2 border-t">
                  <button onClick={() => setShowDoublonModal(false)} className="px-4 py-2 border rounded-lg text-sm">
                    Annuler
                  </button>
                  <button onClick={() => { setShowDoublonModal(false); doSave(); }} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                    Creer nouvel usager
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-8">
        <section>
          <h2 className="text-lg font-semibold text-ville-primary mb-4">Etat civil</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Civilite</label>
              <select
                value={form.civilite || "M."}
                onChange={(e) => set("civilite")(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {CIVILITES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <InputField label="Nom" value={form.nom || ""} onChange={set("nom")} required />
            <InputField label="Prenom" value={form.prenom || ""} onChange={set("prenom")} required />
            <InputField label="Nom d'usage" value={form.nom_usage || ""} onChange={set("nom_usage")} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <InputField label="Date de naissance" value={form.date_naissance || ""} onChange={set("date_naissance")} type="date" required />
            <InputField label="Lieu de naissance" value={form.lieu_naissance || ""} onChange={set("lieu_naissance")} />
            <InputField label="Nationalite" value={form.nationalite || ""} onChange={set("nationalite")} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pays de naissance</label>
              <select
                value={form.pays_naissance || "France"}
                onChange={(e) => set("pays_naissance")(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {PAYS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Situation familiale</label>
              <select
                value={form.situation_familiale || ""}
                onChange={(e) => set("situation_familiale")(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">-- Choisir --</option>
                {SITUATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ville-primary mb-4">Contact</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField label="Email" value={form.email || ""} onChange={set("email")} type="email" />
            <InputField label="Telephone fixe" value={form.telephone || ""} onChange={set("telephone")} placeholder="01 23 45 67 89" />
            <InputField label="Mobile" value={form.mobile || ""} onChange={set("mobile")} placeholder="06 12 34 56 78" />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ville-primary mb-4">Adresse</h2>
          <div className="relative">
            <div className="flex items-center gap-2">
              <Search size={16} className="text-gray-400 absolute left-3" />
              <input
                type="text"
                value={form.Adresse || ""}
                onChange={(e) => set("Adresse")(e.target.value)}
                placeholder="Saisissez votre adresse pour beneficier de l'autocompletion..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            {showSuggestions && adresseSuggestions.length > 0 && (
              <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
                {adresseSuggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectAdresse(s)}
                    className="w-full text-left px-4 py-2 hover:bg-ville-light text-sm border-b border-gray-50 last:border-0"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {adresseFromAPI && (
            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
              <CheckCircle size={12} /> Adresse normalisee
            </p>
          )}
          <InputField
            label="Complement"
            value={form.complement_adresse || ""}
            onChange={set("complement_adresse")}
            placeholder="Btiment, etage, digicode..."
            className="mt-4"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <InputField label="Code postal" value={form.code_postal || ""} onChange={set("code_postal")} />
            <InputField label="Ville" value={form.ville || ""} onChange={set("ville")} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pays</label>
              <select
                value={form.pays || "France"}
                onChange={(e) => set("pays")(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {PAYS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ville-primary mb-4">RGPD</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.consentement_rgpd || false}
                onChange={(e) => setForm((prev) => ({ ...prev, consentement_rgpd: e.target.checked }))}
                className="rounded w-4 h-4"
              />
              <span className="text-sm">
                L'usager a consenti au traitement de ses donnees personnelles (RGPD)
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.mail_actif || false}
                onChange={(e) => setForm((prev) => ({ ...prev, mail_actif: e.target.checked }))}
                className="rounded w-4 h-4"
              />
              <span className="text-sm">Recevoir les communications par email</span>
            </label>
          </div>
        </section>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate("/usagers")}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-ville-primary text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}
