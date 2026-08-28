import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import toast from "react-hot-toast";
import { formatNom, formatPrenom } from "../utils/format";
import { attestationsApi, usagersApi, listesApi } from "../services/api";
import type { Usager, Template, ListeReference } from "../types";

export default function AttestationGenerate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedUsager = searchParams.get("usager") || "";

  const [usagers1, setUsagers1] = useState<Usager[]>([]);
  const [usagers2, setUsagers2] = useState<Usager[]>([]);
  const [usagers3, setUsagers3] = useState<Usager[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [listes, setListes] = useState<ListeReference[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [selectedUsager, setSelectedUsager] = useState(preselectedUsager);
  const [selectedUsager2, setSelectedUsager2] = useState("");
  const [selectedUsager3, setSelectedUsager3] = useState("");
  const [customData, setCustomData] = useState<Record<string, string>>({});
  const [logementConcerne, setLogementConcerne] = useState<"" | "principal" | "secondaire">("");
  const [generating, setGenerating] = useState(false);
  const [searchUsager, setSearchUsager] = useState("");
  const [searchUsager2, setSearchUsager2] = useState("");
  const [searchUsager3, setSearchUsager3] = useState("");

  const activeTemplate = templates.find((t) => t.id === selectedTemplate);
  const nbUsagers = activeTemplate?.nb_usagers || 1;
  const labels = activeTemplate?.usager_labels || {};
  const logementAmbigu = !!activeTemplate?.usage_logement_principal && !!activeTemplate?.usage_logement_secondaire;

  useEffect(() => {
    attestationsApi.listTemplates().then((res) => setTemplates(res.data.rows));
    listesApi.list().then((res) => setListes(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      usagersApi.list({ search: searchUsager, limit: 20 }).then((res) => {
        setUsagers1(res.data.rows);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchUsager]);

  useEffect(() => {
    const timer = setTimeout(() => {
      usagersApi.list({ search: searchUsager2, limit: 20 }).then((res) => {
        setUsagers2(res.data.rows);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchUsager2]);

  useEffect(() => {
    const timer = setTimeout(() => {
      usagersApi.list({ search: searchUsager3, limit: 20 }).then((res) => {
        setUsagers3(res.data.rows);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchUsager3]);

  useEffect(() => {
    if (selectedTemplate) {
      const tpl = templates.find((t) => t.id === selectedTemplate);
      if (tpl && tpl.variables) {
        const initial: Record<string, string> = {};
        tpl.variables.forEach((_varDef, i) => {
          const key = `variable${i + 1}`;
          initial[key] = "";
        });
        setCustomData(initial);
      } else {
        setCustomData({});
      }
    }
  }, [selectedTemplate, templates]);

  const getLabel = (key: string) => labels[key] || `Usager ${key}`;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUsager || !selectedTemplate) {
      toast.error("Selectionnez un usager et un template");
      return;
    }
    if (nbUsagers >= 2 && !selectedUsager2) {
      toast.error("Selectionnez le second usager pour ce template");
      return;
    }
    if (nbUsagers >= 3 && !selectedUsager3) {
      toast.error("Selectionnez le troisieme usager pour ce template");
      return;
    }
    if (logementAmbigu && !logementConcerne) {
      toast.error("Indiquez quel logement (principal ou secondaire) est concerne");
      return;
    }
    setGenerating(true);
    try {
      const res = await attestationsApi.generate({
        usager_id: selectedUsager,
        usager2_id: nbUsagers >= 2 ? selectedUsager2 : undefined,
        usager3_id: nbUsagers >= 3 ? selectedUsager3 : undefined,
        template_id: selectedTemplate,
        custom_data: Object.keys(customData).length > 0 ? customData : undefined,
        logement_concerne: logementConcerne || undefined,
      });
      toast.success("Attestation generee !");
      navigate("/attestations");
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

  const renderUsagerSelector = (
    label: string,
    selectedId: string,
    onSelect: (id: string) => void,
    search: string,
    onSearchChange: (v: string) => void,
    usagersList: Usager[]
  ) => {
    const selected = usagersList.find((u) => u.id === selectedId);
    return (
      <section>
        <h2 className="text-lg font-semibold text-ville-primary mb-4">{label}</h2>
        <input
          type="text"
          placeholder="Rechercher un usager..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-3"
        />
        <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
          {usagersList.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-500">Aucun usager trouve</p>
          ) : (
            usagersList.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => onSelect(u.id)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 text-sm flex items-center justify-between ${
                  selectedId === u.id ? "bg-ville-light border-l-4 border-l-ville-primary" : ""
                }`}
              >
                <div>
                  <span className="font-medium">{formatPrenom(u.prenom)} {formatNom(u.nom)}</span>
                  {u.ville && <span className="text-gray-500 ml-2">- {u.ville}</span>}
                </div>
                {selectedId === u.id && <FileText size={16} className="text-ville-primary" />}
              </button>
            ))
          )}
        </div>
        {selected && (
          <div className="mt-3 p-3 bg-ville-light rounded-lg text-sm">
            <p className="font-medium">{selected.civilite} {formatPrenom(selected.prenom)} {formatNom(selected.nom)}</p>
            <p className="text-gray-600">
              {selected.Adresse || ""}
              {selected.code_postal && selected.ville && `, ${selected.code_postal} ${selected.ville}`}
            </p>
          </div>
        )}
      </section>
    );
  };

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
          <h2 className="text-lg font-semibold text-ville-primary mb-4">Selection du template</h2>
          <select
            value={selectedTemplate}
            onChange={(e) => {
              setSelectedTemplate(e.target.value);
              setSelectedUsager(preselectedUsager);
              setSelectedUsager2("");
              setSelectedUsager3("");
              setLogementConcerne("");
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">-- Choisir un template --</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nom}{t.nb_usagers > 1 ? ` (${t.nb_usagers} usagers)` : ""}
              </option>
            ))}
          </select>
          {activeTemplate && (
            <p className="text-xs text-gray-400 mt-1">
              {nbUsagers > 1
                ? `Ce template concerne ${nbUsagers} usagers. Les variables sont prefixees par usager1_, usager2_, usager3_.`
                : "Variables de l'usager accessibles directement ({{nom}}, {{prenom}}...)."}
            </p>
          )}
        </section>

        {selectedTemplate && (
          <>
            {renderUsagerSelector(
              `Selection de l'usager : ${getLabel("1")}`,
              selectedUsager,
              setSelectedUsager,
              searchUsager,
              setSearchUsager,
              usagers1
            )}
            {nbUsagers >= 2 && renderUsagerSelector(
              `Selection de l'usager : ${getLabel("2")}`,
              selectedUsager2,
              setSelectedUsager2,
              searchUsager2,
              setSearchUsager2,
              usagers2
            )}
            {nbUsagers >= 3 && renderUsagerSelector(
              `Selection de l'usager : ${getLabel("3")}`,
              selectedUsager3,
              setSelectedUsager3,
              searchUsager3,
              setSearchUsager3,
              usagers3
            )}
          </>
        )}

        {selectedTemplate && logementAmbigu && (
          <section>
            <h2 className="text-lg font-semibold text-ville-primary mb-4">Logement concerne</h2>
            <p className="text-sm text-gray-500 mb-3">
              Ce template peut concerner le logement principal ou le logement secondaire de {getLabel("1")}. Precisez lequel.
            </p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="logement_concerne"
                  checked={logementConcerne === "principal"}
                  onChange={() => setLogementConcerne("principal")}
                />
                Logement principal
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="logement_concerne"
                  checked={logementConcerne === "secondaire"}
                  onChange={() => setLogementConcerne("secondaire")}
                />
                Logement secondaire
              </label>
            </div>
          </section>
        )}

        {selectedTemplate && activeTemplate?.variables && activeTemplate.variables.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-ville-primary mb-4">Variables supplementaires</h2>
            <p className="text-sm text-gray-500 mb-4">
              Pour chaque variable definie dans le template, saisissez une valeur.
              Si des valeurs autorisees sont defines, une liste deroulante apparait.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeTemplate.variables.map((varDef, i) => {
                const key = `variable${i + 1}`;
                const listeOptions =
                  varDef.listeCle
                    ? listes.find((l) => l.cle === varDef.listeCle)?.valeurs.map((v) => v.label) || []
                    : [];
                const hasOptions = (varDef.allowedValues && varDef.allowedValues.length > 0) || listeOptions.length > 0;
                const options = listeOptions.length > 0 ? listeOptions : varDef.allowedValues || [];
                
                let inputElement;
                if (hasOptions) {
                  inputElement = (
                    <select
                      value={customData[key] || ""}
                      onChange={(e) =>
                        setCustomData((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">Sélectionner</option>
                      {options.map((val) => (
                        <option key={val} value={val}>{val}</option>
                      ))}
                    </select>
                  );
                } else {
                  inputElement = (
                    <input
                      type="text"
                      value={customData[key] || ""}
                      onChange={(e) =>
                        setCustomData((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder={varDef.description || `Valeur de ${key}`}
                    />
                  );
                }
                
                return (
                  <div key={key} className="p-3 border rounded bg-gray-50 group">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {varDef.description || key}
                    </label>
                    {inputElement}
                    <p className="text-xs text-gray-400 mt-1 font-mono">
                      {`{{${key}}}`}
                    </p>
                  </div>
                );
              })}
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
            disabled={generating || !selectedUsager || !selectedTemplate || (nbUsagers >= 2 && !selectedUsager2) || (nbUsagers >= 3 && !selectedUsager3) || (logementAmbigu && !logementConcerne)}
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