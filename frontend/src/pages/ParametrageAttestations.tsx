import { useState, useEffect } from "react";
import { Upload, FileText, Trash2, ChevronDown, ChevronRight, Info, Pencil, Plus, X } from "lucide-react";
import toast from "react-hot-toast";
import { attestationsApi } from "../services/api";
import type { Template } from "../types";

const VARIABLES_USAGER = [
  { nom: "civilite", description: "Civilite de l'usager (M., Mme)", exemple: "M." },
  { nom: "ne", description: "\"ne\" si masculin, \"nee\" si feminin", exemple: "nee" },
  { nom: "sexe", description: "\"Masculin\" ou \"Feminin\"", exemple: "Masculin" },
  { nom: "nom", description: "Nom de famille de l'usager", exemple: "DUPONT" },
  { nom: "prenom", description: "Prenom de l'usager", exemple: "Jean" },
  { nom: "nom_complet", description: "Civilite + Prenom + Nom (genere automatiquement)", exemple: "M. Jean DUPONT" },
  { nom: "nom_usage", description: "Nom d'usage entre parentheses (vide si absent)", exemple: "(MARTIN)" },
  { nom: "date_naissance", description: "Date de naissance au format francais court", exemple: "15/03/1985" },
  { nom: "date_naissance_long", description: "Date de naissance en toutes lettres", exemple: "15 mars 1985" },
  { nom: "lieu_naissance", description: "Lieu de naissance", exemple: "Paris" },
  { nom: "pays_naissance", description: "Pays de naissance", exemple: "France" },
  { nom: "nationalite", description: "Nationalite de l'usager", exemple: "Francaise" },
  { nom: "situation_familiale", description: "Situation familiale", exemple: "Marie(e)" },
  { nom: "email", description: "Adresse email de l'usager", exemple: "jean.dupont@email.fr" },
  { nom: "telephone", description: "Numero de telephone fixe", exemple: "01 45 67 89 01" },
  { nom: "mobile", description: "Numero de telephone mobile", exemple: "06 12 34 56 78" },
  { nom: "adresse_complete", description: "Champ adresse (sans complement, CP ni ville)", exemple: "10 Rue de Paris" },
  { nom: "complement_adresse", description: "Complement d'adresse (batterie, etage...)", exemple: "Batiment B, 3eme etage" },
  { nom: "code_postal", description: "Code postal", exemple: "94200" },
  { nom: "ville", description: "Ville", exemple: "Ivry-sur-Seine" },
  { nom: "pays", description: "Pays de l'adresse", exemple: "France" },
];

const VARIABLES_SYSTEME = [
  { nom: "date_du_jour", description: "Date du jour au format francais court", exemple: "25/08/2026" },
  { nom: "date_du_jour_long", description: "Date du jour en toutes lettres", exemple: "25 aout 2026" },
];

const NB_USAGERS_OPTIONS = [1, 2, 3];
const NB_USAGERS_LABELS: Record<number, string> = { 1: "1 usager (ex: Attestation de domicile)", 2: "2 usagers (ex: Attestation de concubinage)", 3: "3 usagers (ex: Attestation familiale)" };

function VariablesEditor({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const add = () => onChange([...value, ""]);
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const update = (i: number, v: string) => {
    const next = [...value];
    next[i] = v;
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {value.map((desc, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-400 w-20 shrink-0">variable{i + 1}</span>
          <input
            type="text"
            value={desc}
            onChange={(e) => update(i, e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ville-primary focus:border-transparent"
            placeholder="Description de la variable (ex: Motif de la demande)"
          />
          <button type="button" onClick={() => remove(i)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded shrink-0">
            <X size={16} />
          </button>
        </div>
      ))}
      <button type="button" onClick={add} className="flex items-center gap-1 text-sm text-ville-primary hover:text-blue-700 mt-1">
        <Plus size={14} /> Ajouter une variable
      </button>
    </div>
  );
}

function LabelsEditor({ nbUsagers, value, onChange }: { nbUsagers: number; value: Record<string, string>; onChange: (v: Record<string, string>) => void }) {
  const defaults: Record<number, string> = { 1: "Usager 1", 2: "Usager 2", 3: "Usager 3" };
  const keys = Array.from({ length: nbUsagers }, (_, i) => String(i + 1));
  if (nbUsagers <= 1) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
      {keys.map((k) => (
        <div key={k}>
          <label className="block text-xs text-gray-500 mb-1">Label usager {k}</label>
          <input
            type="text"
            value={value[k] || ""}
            onChange={(e) => onChange({ ...value, [k]: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ville-primary focus:border-transparent"
            placeholder={defaults[Number(k)]}
          />
        </div>
      ))}
    </div>
  );
}

export default function ParametrageAttestations() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [uploadNom, setUploadNom] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadVars, setUploadVars] = useState<string[]>([]);
  const [uploadNbUsagers, setUploadNbUsagers] = useState(1);
  const [uploadLabels, setUploadLabels] = useState<Record<string, string>>({});
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [aideOuverte, setAideOuverte] = useState(false);
  const [varsOuvert, setVarsOuvert] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [editNom, setEditNom] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editVars, setEditVars] = useState<string[]>([]);
  const [editNbUsagers, setEditNbUsagers] = useState(1);
  const [editLabels, setEditLabels] = useState<Record<string, string>>({});
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editing, setEditing] = useState(false);

  const loadTemplates = async () => {
    try {
      const res = await attestationsApi.listTemplates();
      setTemplates(res.data.rows);
    } catch {
      toast.error("Erreur chargement templates");
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadNom || !uploadFile) {
      toast.error("Nom et fichier requis");
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("nom", uploadNom);
    formData.append("description", uploadDesc);
    formData.append("nb_usagers", String(uploadNbUsagers));
    const descs = uploadVars.filter((v) => v.trim());
    if (descs.length > 0) {
      formData.append("variables", JSON.stringify(descs));
    }
    const labels = Object.fromEntries(Object.entries(uploadLabels).filter(([, v]) => v.trim()));
    if (Object.keys(labels).length > 0) {
      formData.append("usager_labels", JSON.stringify(labels));
    }
    try {
      await attestationsApi.uploadTemplate(formData);
      toast.success("Template enregistre avec succes");
      setUploadNom("");
      setUploadDesc("");
      setUploadVars([]);
      setUploadNbUsagers(1);
      setUploadLabels({});
      setUploadFile(null);
      loadTemplates();
    } catch {
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, nom: string) => {
    if (!window.confirm(`Supprimer le template "${nom}" ?`)) return;
    try {
      await attestationsApi.deleteTemplate(id);
      toast.success("Template supprime");
      loadTemplates();
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const openEdit = (t: Template) => {
    setEditingTemplate(t);
    setEditNom(t.nom);
    setEditDesc(t.description || "");
    setEditVars(t.variables || []);
    setEditNbUsagers(t.nb_usagers || 1);
    setEditLabels(t.usager_labels || {});
    setEditFile(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate || !editNom) {
      toast.error("Le nom est requis");
      return;
    }
    setEditing(true);
    const formData = new FormData();
    formData.append("nom", editNom);
    formData.append("description", editDesc);
    formData.append("nb_usagers", String(editNbUsagers));
    const descs = editVars.filter((v) => v.trim());
    formData.append("variables", JSON.stringify(descs));
    const labels = Object.fromEntries(Object.entries(editLabels).filter(([, v]) => v.trim()));
    formData.append("usager_labels", JSON.stringify(labels));
    if (editFile) {
      formData.append("file", editFile);
    }
    try {
      await attestationsApi.updateTemplate(editingTemplate.id, formData);
      toast.success("Template mis a jour");
      setEditingTemplate(null);
      loadTemplates();
    } catch {
      toast.error("Erreur lors de la mise a jour");
    } finally {
      setEditing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-ville-dark">Parametrage - Templates d'attestations</h1>

      {/* === SECTION AIDE === */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <button
          onClick={() => setAideOuverte(!aideOuverte)}
          className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-gray-50 transition"
        >
          <Info size={20} className="text-ville-primary shrink-0" />
          <span className="font-semibold text-ville-dark">Comment creer un template ?</span>
          <span className="ml-auto text-gray-400">
            {aideOuverte ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </span>
        </button>
        {aideOuverte && (
          <div className="px-6 pb-6 space-y-4 text-sm text-gray-700 border-t border-gray-100 pt-4">
            <div>
              <p className="font-medium text-ville-dark mb-1">1. Creer votre document Word</p>
              <p className="text-gray-600">
                Utilisez des balises entre doublees accolades pour les champs dynamiques.
                Exemple : {`{{nom}}`}, {`{{prenom}}`}, {`{{date_naissance}}`}.
              </p>
            </div>
            <div>
              <p className="font-medium text-ville-dark mb-1">2. Variables d'usager (fusionnees automatiquement)</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs mt-2">
                  <thead><tr className="border-b border-gray-200">
                    <th className="text-left py-1 pr-4">Variable</th>
                    <th className="text-left py-1 pr-4">Description</th>
                    <th className="text-left py-1">Exemple</th>
                  </tr></thead>
                  <tbody>
                    {VARIABLES_USAGER.map((v) => (
                      <tr key={v.nom} className="border-b border-gray-50">
                        <td className="py-1 pr-4 font-mono">{`{{${v.nom}}}`}</td>
                        <td className="py-1 pr-4">{v.description}</td>
                        <td className="py-1 text-gray-400">{v.exemple}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <p className="font-medium text-ville-dark mb-1">3. Variables systeme</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs mt-2">
                  <thead><tr className="border-b border-gray-200">
                    <th className="text-left py-1 pr-4">Variable</th>
                    <th className="text-left py-1 pr-4">Description</th>
                    <th className="text-left py-1">Exemple</th>
                  </tr></thead>
                  <tbody>
                    {VARIABLES_SYSTEME.map((v) => (
                      <tr key={v.nom} className="border-b border-gray-50">
                        <td className="py-1 pr-4 font-mono">{`{{${v.nom}}}`}</td>
                        <td className="py-1 pr-4">{v.description}</td>
                        <td className="py-1 text-gray-400">{v.exemple}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <p className="font-medium text-ville-dark mb-1">4. Variables custom (saisies a la generation)</p>
              <p className="text-gray-600 mb-2">
                Vous pouvez ajouter des variables specifiques au template. Chaque variable a une description qui sera demandee lors de la generation.
                Dans le document, utilisez {`{{variable1}}`}, {`{{variable2}}`}, etc.
              </p>
              <p className="text-gray-500 italic">
                Exemple : vous ajoutez une variable avec la description "Motif de la demande". Dans le docx, vous ecrivez {`{{variable1}}`}.
                Lors de la generation, un champ "Motif de la demande" sera affiche pour saisie libre.
              </p>
            </div>
            <div>
              <p className="font-medium text-ville-dark mb-1">5. Multi-usagers</p>
              <p className="text-gray-600 mb-1">
                Pour les templates concernant plusieurs usagers (concubinage, etc.), selectionnez 2 ou 3 usagers.
                Vous pouvez nommer chaque slot (ex: "Demandeur", "Beneficiaire") a des fins d'affichage uniquement.
              </p>
              <p className="text-gray-600 text-xs">
                Les variables sont toujours prefixees par usager1_, usager2_, usager3_ :
                {` {{usager1_nom}}`}, {` {{usager2_prenom}}`}, etc.
              </p>
            </div>
            <div>
              <button
                onClick={() => setVarsOuvert(!varsOuvert)}
                className="flex items-center gap-1 text-ville-primary hover:text-blue-700 font-medium"
              >
                {varsOuvert ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                Voir les variables disponibles
              </button>
              {varsOuvert && (
                <p className="text-xs text-gray-500 mt-1 ml-4">
                  Pour un template 2 usagers, les variables sont :
                  {` {{usager1_civilite}}`}, {` {{usager1_nom}}`}, {` {{usager2_civilite}}`}, {` {{usager2_nom}}`}, etc.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* === FORMULAIRE UPLOAD === */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-ville-primary mb-4">Nouveau template</h2>
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom du template *</label>
              <input
                type="text"
                value={uploadNom}
                onChange={(e) => setUploadNom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ville-primary focus:border-transparent"
                placeholder="Ex: Attestation de domicile"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={uploadDesc}
                onChange={(e) => setUploadDesc(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ville-primary focus:border-transparent"
                placeholder="Description courte du template"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre d'usagers concernes *</label>
            <select
              value={uploadNbUsagers}
              onChange={(e) => setUploadNbUsagers(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ville-primary focus:border-transparent"
            >
              {NB_USAGERS_OPTIONS.map((n) => (
                <option key={n} value={n}>{NB_USAGERS_LABELS[n]}</option>
              ))}
            </select>
            {uploadNbUsagers > 1 && (
              <LabelsEditor nbUsagers={uploadNbUsagers} value={uploadLabels} onChange={setUploadLabels} />
            )}
            <p className="text-xs text-gray-400 mt-1">
              {uploadNbUsagers > 1
                ? "Les variables seront prefixees par usager1_, usager2_, usager3_ (ex: {{usager1_nom}}, {{usager2_nom}})."
                : "Les variables de l'usager sont accessibles directement (ex: {{nom}}, {{prenom}})."}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fichier Word (.docx) *</label>
            <input
              type="file"
              accept=".docx"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-ville-primary file:text-white file:cursor-pointer"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Variables supplementaires (optionnel)
            </label>
            <VariablesEditor value={uploadVars} onChange={setUploadVars} />
            <p className="text-xs text-gray-400 mt-1">
              Decrivez chaque variable. Elle sera accessible dans le document sous la forme {`{{variable1}}`}, {`{{variable2}}`}, etc.
              A la generation, un champ de saisie sera affiche avec la description comme intitule.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={uploading || !uploadNom || !uploadFile}
              className="flex items-center gap-2 bg-ville-primary text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm"
            >
              <Upload size={16} />
              {uploading ? "Envoi en cours..." : "Enregistrer le template"}
            </button>
          </div>
        </form>
      </div>

      {/* === LISTE DES TEMPLATES EXISTANTS === */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-ville-primary mb-4">
          Templates enregistres ({templates.length})
        </h2>
        {templates.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">
            Aucun template enregistre. Uploadez un fichier .docx ci-dessus pour commencer.
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {templates.map((t) => (
              <div key={t.id} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                <FileText className="text-ville-primary mt-0.5 shrink-0" size={20} />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm text-ville-dark">{t.nom}</h3>
                  {t.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Fichier : {t.fichier_original}
                    {t.nb_usagers > 1 && <> | {t.nb_usagers} usagers</>}
                    {t.nb_usagers > 1 && t.usager_labels && Object.keys(t.usager_labels).length > 0 && (
                      <> ({Object.entries(t.usager_labels).sort().map(([, v], i) => `${i > 0 ? ", " : ""}${v}`).join("")})</>
                    )}
                    {t.variables && t.variables.length > 0 && (
                      <> | {t.variables.length} variable{t.variables.length > 1 ? "s" : ""} custom</>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Cree le {new Date(t.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <button
                  onClick={() => openEdit(t)}
                  className="p-1 text-ville-primary hover:bg-blue-50 rounded shrink-0"
                  title="Modifier"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => handleDelete(t.id, t.nom)}
                  className="p-1 text-red-500 hover:bg-red-50 rounded shrink-0"
                  title="Supprimer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* === MODAL EDITION TEMPLATE === */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-bold text-ville-dark mb-4">Modifier le template</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du template *</label>
                <input
                  type="text"
                  value={editNom}
                  onChange={(e) => setEditNom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ville-primary focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ville-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre d'usagers</label>
                <select
                  value={editNbUsagers}
                  onChange={(e) => setEditNbUsagers(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ville-primary focus:border-transparent"
                >
                  {NB_USAGERS_OPTIONS.map((n) => (
                    <option key={n} value={n}>{NB_USAGERS_LABELS[n]}</option>
                  ))}
                </select>
                {editNbUsagers > 1 && (
                  <LabelsEditor nbUsagers={editNbUsagers} value={editLabels} onChange={setEditLabels} />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Variables supplementaires</label>
                <VariablesEditor value={editVars} onChange={setEditVars} />
                <p className="text-xs text-gray-400 mt-1">
                  Chaque description correspond a {`{{variable1}}`}, {`{{variable2}}`}, etc. dans le document.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remplacer le fichier .docx (optionnel)</label>
                <input
                  type="file"
                  accept=".docx"
                  onChange={(e) => setEditFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-ville-primary file:text-white file:cursor-pointer"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Fichier actuel : {editingTemplate.fichier_original}
                </p>
              </div>
              <div className="flex gap-2 justify-end pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
                  className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={editing || !editNom}
                  className="flex items-center gap-2 bg-ville-primary text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm"
                >
                  {editing ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
