import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Save, ArrowLeft, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { formatNom, formatPrenom } from "../utils/format";
import { usagersApi } from "../services/api";
import UsagerFields from "../components/UsagerFields";
import type { Usager } from "../types";

export default function UsagerForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const prefill = (location.state as { prefill?: Partial<Usager> } | null)?.prefill;
  const isEdit = Boolean(id);
  const [saving, setSaving] = useState(false);
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
    ...(prefill || {}),
  });

  useEffect(() => {
    if (isEdit && id) {
      usagersApi.getById(id).then((res) => {
        const u = res.data;
        const parseLocalDate = (iso: string) => {
          if (!iso) return "";
          const d = new Date(iso);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          return `${year}-${month}-${day}`;
        };
        setForm({
          ...u,
          date_naissance: parseLocalDate(u.date_naissance),
        });
      });
    }
  }, [id, isEdit]);

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
        {isEdit && form.created_at && (
          <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            Cree le {new Date(form.created_at).toLocaleDateString("fr-FR")}
            {form.created_by === "IMPORT_LEGACY" ? " · Import ALTO" : ""}
          </span>
        )}
      </div>

      {!isEdit && prefill && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
          Fiche pre-remplie a partir des donnees Synbird. Verifiez les informations avant enregistrement.
        </div>
      )}

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
        <UsagerFields
          form={form}
          onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
          onAdresseNormalisee={setAdresseFromAPI}
        />

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
