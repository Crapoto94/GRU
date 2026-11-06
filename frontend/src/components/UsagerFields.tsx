import { useState, useEffect, useCallback, useRef } from "react";
import { Search, CheckCircle } from "lucide-react";
import { usagersApi } from "../services/api";
import { fetchPaysSuggestions, fetchNationaliteSuggestions } from "../utils/referentielPays";
import type { Usager } from "../types";

const SITUATIONS = ["Celibataire", "Marie(e)", "Divorce(e)", "Veuf(ve)", "Pacs(e)", "Concubin(e)"];
export const CIVILITES = ["M.", "Mme", "Mx"];
const PIECES_IDENTITE = ["CNI", "Passeport", "Titre de sejour"];

interface AdresseSuggestion {
  label: string;
  score: number;
  city?: string;
  postcode?: string;
  street?: string;
  numero?: string;
}

interface CommuneSuggestion {
  nom: string;
  code: string;
  departement?: { nom: string; code: string };
}

export async function fetchCommuneSuggestions(q: string): Promise<{ label: string; value: string }[]> {
  const res = await fetch(`https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(q)}&fields=nom,code,departement&limit=8`);
  const data: CommuneSuggestion[] = await res.json();
  return data.map((c) => ({
    label: c.departement ? `${c.nom} (${c.departement.nom})` : c.nom,
    value: c.nom,
  }));
}

export function AutocompleteField({
  label,
  value,
  onChange,
  onSelect,
  fetchSuggestions,
  placeholder,
  required = false,
  disabled = false,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  onSelect: (val: string) => void;
  fetchSuggestions: (q: string) => Promise<{ label: string; value: string }[]>;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const [suggestions, setSuggestions] = useState<{ label: string; value: string }[]>([]);
  const [showDrop, setShowDrop] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDrop(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (val: string) => {
    onChange(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (val.length < 2) {
      setSuggestions([]);
      setShowDrop(false);
      return;
    }
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const results = await fetchSuggestions(val);
        setSuggestions(results);
        setShowDrop(results.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleSelect = (s: { label: string; value: string }) => {
    onSelect(s.value);
    setShowDrop(false);
    setSuggestions([]);
  };

  return (
    <div className={className} ref={wrapperRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => suggestions.length > 0 && setShowDrop(true)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ville-primary focus:border-transparent text-sm disabled:bg-gray-50"
        />
        {loading && <span className="absolute right-3 top-2.5 text-xs text-gray-400">...</span>}
        {showDrop && suggestions.length > 0 && (
          <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-56 overflow-y-auto">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelect(s)}
                className="w-full text-left px-4 py-2 hover:bg-ville-light text-sm border-b border-gray-50 last:border-0"
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function InputField({
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

export function AdresseSection({
  form,
  onChange,
  onNormalisee,
  titre = "Adresse",
}: {
  form: Partial<Usager>;
  onChange: (patch: Partial<Usager>) => void;
  onNormalisee?: (normalisee: boolean) => void;
  titre?: string;
}) {
  const [adresseSuggestions, setAdresseSuggestions] = useState<AdresseSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [adresseFromAPI, setAdresseFromAPI] = useState(false);

  const markNormalisee = (v: boolean) => {
    setAdresseFromAPI(v);
    onNormalisee?.(v);
  };

  const searchAdresse = useCallback(async (q: string) => {
    if (q.length < 3) { setAdresseSuggestions([]); return; }
    try {
      const res = await usagersApi.validateAdresse(q);
      setAdresseSuggestions(res.data.suggestions || []);
      setShowSuggestions(true);
    } catch {
      setAdresseSuggestions([]);
    }
  }, []);

  const selectAdresse = (s: AdresseSuggestion) => {
    const street = s.street || "";
    const num = s.numero || "";
    const rue = num && !street.startsWith(num) ? `${num} ${street}` : street || num;
    onChange({ Adresse: rue, code_postal: s.postcode || "", ville: s.city || "" });
    markNormalisee(true);
    setShowSuggestions(false);
    setAdresseSuggestions([]);
  };

  const set = (field: keyof Usager) => (value: string) => {
    onChange({ [field]: value } as Partial<Usager>);
    if (field === "Adresse") {
      searchAdresse(value);
      markNormalisee(false);
    }
  };

  return (
      <section>
        <h2 className="text-lg font-semibold text-ville-primary mb-4">{titre}</h2>
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
          <AutocompleteField
            label="Pays"
            value={form.pays || "France"}
            onChange={set("pays")}
            onSelect={set("pays")}
            fetchSuggestions={fetchPaysSuggestions}
            placeholder="Rechercher un pays..."
          />
        </div>
      </section>
  );
}

interface UsagerFieldsProps {
  form: Partial<Usager>;
  onChange: (patch: Partial<Usager>) => void;
  onAdresseNormalisee?: (normalisee: boolean) => void;
  /** "dossier" : etat civil de la demande CNI/Passeport (taille, couleur des yeux, mention nom d'usage). */
  variant?: "usager" | "dossier" | "attestation";
  /** Masque la section Adresse (le formulaire appelant l'affiche lui-meme). */
  hideAdresse?: boolean;
}

export default function UsagerFields({ form, onChange, onAdresseNormalisee, variant = "usager", hideAdresse = false }: UsagerFieldsProps) {
  const set = (field: keyof Usager) => (value: string) => {
    onChange({ [field]: value } as Partial<Usager>);
  };

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-ville-primary mb-4">Etat civil</h2>
        {variant === "attestation" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InputField label="Nom d'usage" value={form.nom_usage || ""} onChange={set("nom_usage")} />
              <InputField label="Mention nom d'usage" value={form.mention_nom_usage || ""} onChange={set("mention_nom_usage")} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InputField label="Date de naissance" value={form.date_naissance || ""} onChange={set("date_naissance")} type="date" required />
              <AutocompleteField
                label="Lieu de naissance"
                value={form.lieu_naissance || ""}
                onChange={set("lieu_naissance")}
                onSelect={set("lieu_naissance")}
                fetchSuggestions={fetchCommuneSuggestions}
                placeholder="Rechercher une commune..."
              />
              <AutocompleteField
                label="Pays de naissance"
                value={form.pays_naissance || "France"}
                onChange={set("pays_naissance")}
                onSelect={set("pays_naissance")}
                fetchSuggestions={fetchPaysSuggestions}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <AutocompleteField
                label="Nationalite"
                value={form.nationalite || ""}
                onChange={set("nationalite")}
                onSelect={set("nationalite")}
                fetchSuggestions={fetchNationaliteSuggestions}
                placeholder="Rechercher une nationalité..."
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Piece</label>
                <select
                  value={form.piece_identite_type || ""}
                  onChange={(e) => set("piece_identite_type")(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">-- Choisir --</option>
                  {PIECES_IDENTITE.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1">CNI, Passeport ou Titre de sejour</p>
              </div>
              <InputField label="Numero" value={form.piece_identite_numero || ""} onChange={set("piece_identite_numero")} />
            </div>
          </div>
        ) : variant === "dossier" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InputField label="Nom d'usage" value={form.nom_usage || ""} onChange={set("nom_usage")} />
              <InputField label="Mention nom d'usage" value={form.mention_nom_usage || ""} onChange={set("mention_nom_usage")} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InputField label="Date de naissance" value={form.date_naissance || ""} onChange={set("date_naissance")} type="date" required />
              <AutocompleteField
                label="Lieu de naissance"
                value={form.lieu_naissance || ""}
                onChange={set("lieu_naissance")}
                onSelect={set("lieu_naissance")}
                fetchSuggestions={fetchCommuneSuggestions}
                placeholder="Rechercher une commune..."
              />
              <AutocompleteField
                label="Pays de naissance"
                value={form.pays_naissance || "France"}
                onChange={set("pays_naissance")}
                onSelect={set("pays_naissance")}
                fetchSuggestions={fetchPaysSuggestions}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InputField label="Taille (cm)" value={form.taille == null ? "" : String(form.taille)} onChange={set("taille")} type="number" />
              <InputField label="Couleur des yeux" value={form.couleur_yeux || ""} onChange={set("couleur_yeux")} />
            </div>
          </div>
        ) : (
          <>
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
          <AutocompleteField
            label="Lieu de naissance"
            value={form.lieu_naissance || ""}
            onChange={set("lieu_naissance")}
            onSelect={set("lieu_naissance")}
            fetchSuggestions={fetchCommuneSuggestions}
            placeholder="Rechercher une commune..."
          />
          <AutocompleteField
                label="Nationalite"
                value={form.nationalite || ""}
                onChange={set("nationalite")}
                onSelect={set("nationalite")}
                fetchSuggestions={fetchNationaliteSuggestions}
                placeholder="Rechercher une nationalité..."
              />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <AutocompleteField
            label="Pays de naissance"
            value={form.pays_naissance || "France"}
            onChange={set("pays_naissance")}
            onSelect={set("pays_naissance")}
            fetchSuggestions={fetchPaysSuggestions}
            placeholder="Rechercher un pays..."
          />
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
          </>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ville-primary mb-4">Contact</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InputField label="Email" value={form.email || ""} onChange={set("email")} type="email" />
          <InputField label="Telephone fixe" value={form.telephone || ""} onChange={set("telephone")} placeholder="01 23 45 67 89" />
          <InputField label="Mobile" value={form.mobile || ""} onChange={set("mobile")} placeholder="06 12 34 56 78" />
        </div>
      </section>

      {variant !== "attestation" && !hideAdresse && <AdresseSection form={form} onChange={onChange} onNormalisee={onAdresseNormalisee} />}
    </div>
  );
}
