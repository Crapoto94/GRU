import { useState, useEffect, useRef } from "react";
import { FileText, Download, Upload, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import { gabaritsApi, type Gabarit } from "../services/api";

const saveBlob = (data: BlobPart, name: string) => {
  const url = window.URL.createObjectURL(new Blob([data], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

export default function ParametrageGabarits() {
  const [gabarits, setGabarits] = useState<Gabarit[]>([]);
  const [variables, setVariables] = useState<Array<{ cle: string; description: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const targetRef = useRef<string>("");

  const load = () =>
    gabaritsApi.list()
      .then((res) => {
        setGabarits(res.data.gabarits);
        setVariables(res.data.variables);
      })
      .catch(() => toast.error("Erreur de chargement"))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const download = async (g: Gabarit) => {
    try {
      const res = await gabaritsApi.download(g.cle);
      saveBlob(res.data, `${g.cle}.docx`);
    } catch {
      toast.error("Erreur lors du téléchargement");
    }
  };

  const pickFile = (cle: string) => {
    targetRef.current = cle;
    fileRef.current?.click();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const cle = targetRef.current;
    setUploading(cle);
    try {
      await gabaritsApi.upload(cle, file);
      toast.success("Gabarit remplacé");
      await load();
    } catch (err: unknown) {
      let msg = "Erreur lors de l'envoi du gabarit";
      if (err && typeof err === "object" && "response" in err) {
        msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error || msg;
      }
      toast.error(msg);
    } finally {
      setUploading(null);
    }
  };

  const reset = async (g: Gabarit) => {
    if (!window.confirm("Revenir au gabarit par défaut ? Votre version sera perdue.")) return;
    try {
      await gabaritsApi.reset(g.cle);
      toast.success("Gabarit par défaut rétabli");
      load();
    } catch {
      toast.error("Erreur lors de la réinitialisation");
    }
  };

  if (loading) return <p className="text-center text-gray-500 py-12">Chargement...</p>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="text-ville-primary" size={24} />
        <div>
          <h1 className="text-2xl font-bold text-ville-dark">Gabarits de courriers</h1>
          <p className="text-sm text-gray-500">
            Téléchargez un gabarit Word, modifiez-le (mise en page, textes) puis renvoyez-le. Les variables s'écrivent entre doubles accolades, par exemple {"{{nom_complet}}"}.
          </p>
        </div>
      </div>

      <input ref={fileRef} type="file" accept=".docx" className="hidden" onChange={onFile} />

      <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
        {gabarits.map((g) => (
          <div key={g.cle} className="p-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-ville-dark">{g.label}</p>
              <p className="text-sm text-gray-500">{g.description}</p>
              <p className="text-xs mt-1 text-gray-400">
                {g.personnalise
                  ? `Version personnalisée${g.modifie_le ? ` du ${new Date(g.modifie_le).toLocaleDateString("fr-FR")}` : ""}`
                  : "Gabarit par défaut"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => download(g)} className="flex items-center gap-1.5 border border-ville-primary text-ville-primary px-3 py-1.5 rounded-lg text-sm hover:bg-blue-50">
                <Download size={14} /> Télécharger
              </button>
              <button
                onClick={() => pickFile(g.cle)}
                disabled={uploading === g.cle}
                className="flex items-center gap-1.5 bg-ville-primary text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                <Upload size={14} /> {uploading === g.cle ? "Envoi..." : "Remplacer"}
              </button>
              {g.personnalise && (
                <button onClick={() => reset(g)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg" title="Revenir au gabarit par défaut">
                  <RotateCcw size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <section className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="text-lg font-semibold text-ville-primary mb-3">Variables disponibles</h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {variables.map((v) => (
            <div key={v.cle} className="flex gap-2">
              <dt className="font-mono text-xs text-ville-primary shrink-0">{`{{${v.cle}}}`}</dt>
              <dd className="text-gray-600">{v.description}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
