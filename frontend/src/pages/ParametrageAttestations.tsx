import { useState, useEffect } from "react";
import { Upload, FileText, Trash2, ChevronDown, ChevronRight, Info, Pencil } from "lucide-react";
import toast from "react-hot-toast";
import { attestationsApi } from "../services/api";
import type { Template } from "../types";

const VARIABLES_USAGER = [
  { nom: "civilite", description: "Civilite de l'usager (M., Mme)", exemple: "M." },
  { nom: "ne", description: "\"ne\" si masculin, \"nee\" si feminin", exemple: "nee" },
  { nom: "nom", description: "Nom de famille de l'usager", exemple: "DUPONT" },
  { nom: "prenom", description: "Prenom de l'usager", exemple: "Jean" },
  { nom: "nom_complet", description: "Civilite + Prenom + Nom (genere automatiquement)", exemple: "M. Jean DUPONT" },
  { nom: "nom_usage", description: "Nom d'usage (le cas echeant)", exemple: "Martin" },
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

export default function ParametrageAttestations() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [uploadNom, setUploadNom] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadVars, setUploadVars] = useState("");
  const [uploadNbUsagers, setUploadNbUsagers] = useState(1);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [aideOuverte, setAideOuverte] = useState(false);
  const [varsOuvert, setVarsOuvert] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [editNom, setEditNom] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editVars, setEditVars] = useState("");
  const [editNbUsagers, setEditNbUsagers] = useState(1);
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
    if (!uploadFile || !uploadNom) {
      toast.error("Nom et fichier requis");
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("nom", uploadNom);
    formData.append("description", uploadDesc);
    formData.append("nb_usagers", String(uploadNbUsagers));
    if (uploadVars.trim()) {
      formData.append(
        "variables",
        JSON.stringify(
          uploadVars.split(",").map((v) => v.trim()).filter(Boolean)
        )
      );
    }
    try {
      await attestationsApi.uploadTemplate(formData);
      toast.success("Template enregistre avec succes");
      setUploadNom("");
      setUploadDesc("");
      setUploadVars("");
      setUploadNbUsagers(1);
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
    setEditVars(t.variables?.join(", ") || "");
    setEditNbUsagers(t.nb_usagers || 1);
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
    if (editVars.trim()) {
      formData.append("variables", JSON.stringify(editVars.split(",").map((v) => v.trim()).filter(Boolean)));
    }
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
              <h3 className="font-semibold text-ville-dark mb-2">1. Creer le document Word</h3>
              <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600">
                <li>Ouvrez <strong>Microsoft Word</strong> (ou LibreOffice Writer)</li>
                <li>Redigez votre attestation comme d'habitude (en-tete, corps de texte, signature...)</li>
                <li>A l'endroit souhaite, inserez les variables grace a la syntaxe <code className="bg-gray-100 px-1 rounded">{"{{nom_de_la_variable}}"}</code></li>
                <li>Sauvegardez le fichier au format <strong>.docx</strong></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-ville-dark mb-2">2. Exemple de document</h3>
              <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs leading-relaxed text-gray-600">
                <p>Ville d'Ivry-sur-Seine</p>
                <p className="mt-2">Direction des Services Publics</p>
                <p className="mt-4">Objet : Attestation de domicile</p>
                <p className="mt-4">
                  Je soussigne(e), <span className="bg-ville-primary/10 px-1 rounded text-ville-primary">{"{{nom_complet}}"}</span>,
                </p>
                <p className="mt-1">
                  ne(e) le <span className="bg-ville-primary/10 px-1 rounded text-ville-primary">{"{{date_naissance_long}}"}</span>
                  {" "}a <span className="bg-ville-primary/10 px-1 rounded text-ville-primary">{"{{lieu_naissance}}"}</span>,
                </p>
                <p className="mt-1">
                  demeurant au <span className="bg-ville-primary/10 px-1 rounded text-ville-primary">{"{{adresse_complete}}"}</span>,
                </p>
                <p className="mt-1">
                  {" "}<span className="bg-ville-primary/10 px-1 rounded text-ville-primary">{"{{code_postal}}"}</span>
                  {" "}<span className="bg-ville-primary/10 px-1 rounded text-ville-primary">{"{{ville}}"}</span>,
                </p>
                <p className="mt-4">
                  atteste sur l'honneur etre domicilie(e) a l'adresse indiquee ci-dessus.
                </p>
                <p className="mt-4">
                  Fait a Ivry-sur-Seine, le <span className="bg-ville-primary/10 px-1 rounded text-ville-primary">{"{{date_du_jour}}"}</span>
                </p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-ville-dark mb-2">3. Uploader le template</h3>
              <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600">
                <li>Cliquez sur "Nouveau template" ci-dessous</li>
                <li>Donnez un nom explicite (ex: "Attestation de domicile")</li>
                <li>Selectionnez votre fichier .docx</li>
                <li>Optionnellement, declarez les variables custom supplementaires (separees par une virgule)</li>
                <li>Validez. Le template sera disponible lors de la generation d'attestations</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-ville-dark mb-2">4. Utiliser le template</h3>
              <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600">
                <li>Allez dans <strong>Attestations &gt; Nouvelle attestation</strong></li>
                <li>Selectionnez l'usager et le template souhaite</li>
                <li>Si vous avez declare des variables custom, renseignez leurs valeurs</li>
                <li>Cliquez sur "Generer" - le document sera fusionne et converti en PDF automatiquement</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* === LISTE DES VARIABLES === */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <button
          onClick={() => setVarsOuvert(!varsOuvert)}
          className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-gray-50 transition"
        >
          <FileText size={20} className="text-ville-primary shrink-0" />
          <span className="font-semibold text-ville-dark">
            Variables disponibles ({VARIABLES_USAGER.length + VARIABLES_SYSTEME.length})
          </span>
          <span className="ml-auto text-gray-400">
            {varsOuvert ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </span>
        </button>
        {varsOuvert && (
          <div className="px-6 pb-6 border-t border-gray-100 pt-4 space-y-6">
            <div>
              <h3 className="font-semibold text-sm text-ville-dark mb-3">Variables liees a l'usager (fusion automatique)</h3>
              <p className="text-xs text-gray-500 mb-3">
                <strong>Template 1 usager :</strong> utilisez {"{{nom}}"}, {"{{prenom}}"}, etc. directement.<br />
                <strong>Template 2 usagers :</strong> prefixez par usager1_ ou usager2_ (ex: {"{{usager1_nom}}"}, {"{{usager2_prenom}}"}).
              </p>
              <div className="bg-gray-50 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-left px-4 py-2 font-semibold text-gray-600">Variable</th>
                      <th className="text-left px-4 py-2 font-semibold text-gray-600">Description</th>
                      <th className="text-left px-4 py-2 font-semibold text-gray-600">Exemple</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {VARIABLES_USAGER.map((v) => (
                      <tr key={v.nom} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <code className="bg-blue-50 text-ville-primary px-1.5 py-0.5 rounded text-xs font-mono">
                            {"{{" + v.nom + "}}"}
                          </code>
                        </td>
                        <td className="px-4 py-2 text-gray-600">{v.description}</td>
                        <td className="px-4 py-2 text-gray-400 italic">{v.exemple}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-ville-dark mb-3">Variables systeme</h3>
              <div className="bg-gray-50 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-left px-4 py-2 font-semibold text-gray-600">Variable</th>
                      <th className="text-left px-4 py-2 font-semibold text-gray-600">Description</th>
                      <th className="text-left px-4 py-2 font-semibold text-gray-600">Exemple</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {VARIABLES_SYSTEME.map((v) => (
                      <tr key={v.nom} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <code className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded text-xs font-mono">
                            {"{{" + v.nom + "}}"}
                          </code>
                        </td>
                        <td className="px-4 py-2 text-gray-600">{v.description}</td>
                        <td className="px-4 py-2 text-gray-400 italic">{v.exemple}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
              <option value={1}>1 usager (ex: Attestation de domicile)</option>
              <option value={2}>2 usagers (ex: Attestation de concubinage)</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">
              {uploadNbUsagers === 2
                ? "Les variables seront prefixees par usager1_ et usager2_ (ex: {{usager1_nom}}, {{usager2_nom}})."
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
            <input
              type="text"
              value={uploadVars}
              onChange={(e) => setUploadVars(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ville-primary focus:border-transparent"
              placeholder="Ex: motif, reference_dossier, nom_responsable"
            />
            <p className="text-xs text-gray-400 mt-1">
              Separez par des virgules. Ces variables seront disponibles pour les valeurs custom lors de la generation.
              Les variables de l'usager ({`{{nom}}`}, {`{{prenom}}`}, etc.) sont fusionnees automatiquement sans declaration.
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
                    {t.variables && t.variables.length > 0 && (
                      <> | Variables custom : {t.variables.join(", ")}</>
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
                  <option value={1}>1 usager</option>
                  <option value={2}>2 usagers</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Variables supplementaires</label>
                <input
                  type="text"
                  value={editVars}
                  onChange={(e) => setEditVars(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ville-primary focus:border-transparent"
                  placeholder="Ex: motif, reference_dossier"
                />
                <p className="text-xs text-gray-400 mt-1">Separez par des virgules.</p>
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
