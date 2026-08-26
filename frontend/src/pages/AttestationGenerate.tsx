import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import toast from "react-hot-toast";
import { attestationsApi, usagersApi } from "../services/api";
import type { Usager, Template } from "../types";

export default function AttestationGenerate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedUsager = searchParams.get("usager") || "";

  const [usagers, setUsagers] = useState<Usager[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedUsager, setSelectedUsager] = useState(preselectedUsager);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [customData, setCustomData] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [searchUsager, setSearchUsager] = useState("");

  useEffect(() => {
    attestationsApi.listTemplates().then((res) => setTemplates(res.data.rows));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      usagersApi.list({ search: searchUsager, limit: 20 }).then((res) => {
        setUsagers(res.data.rows);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchUsager]);

  useEffect(() => {
    if (selectedTemplate) {
      const tpl = templates.find((t) => t.id === selectedTemplate);
      if (tpl && tpl.variables) {
        const initial: Record<string, string> = {};
        tpl.variables.forEach((v) => { initial[v] = ""; });
        setCustomData(initial);
      }
    }
  }, [selectedTemplate, templates]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUsager || !selectedTemplate) {
      toast.error("Selectionnez un usager et un template");
      return;
    }
    setGenerating(true);
    try {
      const res = await attestationsApi.generate({
        usager_id: selectedUsager,
        template_id: selectedTemplate,
        custom_data: Object.keys(customData).length > 0 ? customData : undefined,
      });
      toast.success("Attestation generee !");
      navigate(`/attestations`);
      if (res.data.fichier_pdf) {
        attestationsApi.download(res.data.id).then((dl) => {
          const blob = new Blob([dl.data], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "";
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de la generation";
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  const selectedUsagerData = usagers.find((u) => u.id === selectedUsager);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/attestations")} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-ville-dark">Nouvelle attestation</h1>
      </div>

      <form onSubmit={handleGenerate} className="bg-white rounded-xl shadow-sm p-6 space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-ville-primary mb-4">Selection de l'usager</h2>
          <input
            type="text"
            placeholder="Rechercher un usager..."
            value={searchUsager}
            onChange={(e) => setSearchUsager(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-3"
          />
          <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
            {usagers.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-500">Aucun usager trouve</p>
            ) : (
              usagers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setSelectedUsager(u.id)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 text-sm flex items-center justify-between ${
                    selectedUsager === u.id ? "bg-ville-light border-l-4 border-l-ville-primary" : ""
                  }`}
                >
                  <div>
                    <span className="font-medium">{u.prenom} {u.nom}</span>
                    {u.ville && <span className="text-gray-500 ml-2">- {u.ville}</span>}
                  </div>
                  {selectedUsager === u.id && <FileText size={16} className="text-ville-primary" />}
                </button>
              ))
            )}
          </div>
          {selectedUsagerData && (
            <div className="mt-3 p-3 bg-ville-light rounded-lg text-sm">
              <p className="font-medium">{selectedUsagerData.civilite} {selectedUsagerData.prenom} {selectedUsagerData.nom}</p>
              <p className="text-gray-600">
                {selectedUsagerData.Adresse || ""}
                {selectedUsagerData.code_postal && selectedUsagerData.ville && `, ${selectedUsagerData.code_postal} ${selectedUsagerData.ville}`}
              </p>
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ville-primary mb-4">Selection du template</h2>
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">-- Choisir un template --</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.nom}</option>
            ))}
          </select>
        </section>

        {selectedTemplate && Object.keys(customData).length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-ville-primary mb-4">Variables supplementaires</h2>
            <p className="text-sm text-gray-500 mb-4">
              Ces variables seront remplacees dans le template. Les champs de l'usager sont merges automatiquement.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.keys(customData).map((key) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{key}</label>
                  <input
                    type="text"
                    value={customData[key]}
                    onChange={(e) => setCustomData((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate("/attestations")}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition text-sm"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={generating || !selectedUsager || !selectedTemplate}
            className="flex items-center gap-2 bg-ville-primary text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm"
          >
            <FileText size={16} />
            {generating ? "Generation en cours..." : "Generer l'attestation"}
          </button>
        </div>
      </form>
    </div>
  );
}
