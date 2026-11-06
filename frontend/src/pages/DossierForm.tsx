import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Fingerprint } from "lucide-react";
import toast from "react-hot-toast";
import { formatNom, formatPrenom } from "../utils/format";
import { dossiersApi, usagersApi } from "../services/api";
import UsagerFields, { AdresseSection, InputField, AutocompleteField, CIVILITES, fetchCommuneSuggestions, fetchPaysSuggestions } from "../components/UsagerFields";
import { MatchBanner, useUsagerMatches } from "../components/UsagerMatching";
import { EMPTY_USAGER, toInputDate } from "../utils/usagerForm";
import { MOTIFS } from "../utils/dossierMotifs";
import type { Usager, TypePiece, CanalNotification } from "../types";

const today = () => new Date().toISOString().slice(0, 10);

type Adresse = Pick<Usager, "Adresse" | "complement_adresse" | "code_postal" | "ville" | "pays">;

const EMPTY_ADRESSE: Partial<Adresse> = { Adresse: "", complement_adresse: "", code_postal: "", ville: "", pays: "France" };

const adresseOf = (u: Partial<Usager>): Partial<Adresse> => ({
  Adresse: u.Adresse || "",
  complement_adresse: u.complement_adresse || "",
  code_postal: u.code_postal || "",
  ville: u.ville || "",
  pays: u.pays || "France",
});

const ageDe = (dateNaissance?: string) => {
  if (!dateNaissance) return null;
  const n = new Date(dateNaissance);
  if (Number.isNaN(n.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - n.getFullYear();
  if (now.getMonth() < n.getMonth() || (now.getMonth() === n.getMonth() && now.getDate() < n.getDate())) a -= 1;
  return a;
};

function Responsable({
  titre,
  value,
  linked,
  onChange,
  onChoose,
  onUnlink,
}: {
  titre: string;
  value: Partial<Usager>;
  linked: boolean;
  onChange: (patch: Partial<Usager>) => void;
  onChoose: (u: Usager) => void;
  onUnlink: () => void;
}) {
  const { matches, total } = useUsagerMatches(value, linked);
  return (
    <section className="space-y-4 border-t border-gray-100 pt-6">
      <h2 className="text-lg font-bold text-gray-600 uppercase">{titre}</h2>
      <MatchBanner linked={linked} matches={matches} total={total} onChoose={onChoose} onUnlink={onUnlink} />
      <h3 className="text-base font-semibold text-ville-primary">État civil</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Civilité</label>
          <select
            value={value.civilite || "M."}
            onChange={(e) => onChange({ civilite: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            {CIVILITES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <InputField label="Nom" value={value.nom || ""} onChange={(v) => onChange({ nom: v })} required />
        <InputField label="Prénom" value={value.prenom || ""} onChange={(v) => onChange({ prenom: v })} required />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InputField label="Nom d'usage" value={value.nom_usage || ""} onChange={(v) => onChange({ nom_usage: v })} />
        <InputField label="Mention nom d'usage" value={value.mention_nom_usage || ""} onChange={(v) => onChange({ mention_nom_usage: v })} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InputField label="Date de naissance" value={value.date_naissance || ""} onChange={(v) => onChange({ date_naissance: v })} type="date" required />
        <AutocompleteField
          label="Lieu de naissance"
          value={value.lieu_naissance || ""}
          onChange={(v) => onChange({ lieu_naissance: v })}
          onSelect={(v) => onChange({ lieu_naissance: v })}
          fetchSuggestions={fetchCommuneSuggestions}
          placeholder="Rechercher une commune..."
        />
        <AutocompleteField
          label="Pays de naissance"
          value={value.pays_naissance || "France"}
          onChange={(v) => onChange({ pays_naissance: v })}
          onSelect={(v) => onChange({ pays_naissance: v })}
          fetchSuggestions={fetchPaysSuggestions}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InputField label="Email (notification)" value={value.email || ""} onChange={(v) => onChange({ email: v })} type="email" />
        <InputField label="Mobile (notification)" value={value.mobile || ""} onChange={(v) => onChange({ mobile: v })} />
      </div>
    </section>
  );
}

export default function DossierForm() {
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const isEdit = Boolean(editId);
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(isEdit);

  const [tutelle, setTutelle] = useState(false);
  const [form, setForm] = useState<Partial<Usager>>({ ...EMPTY_USAGER });
  const [usagerId, setUsagerId] = useState<string | null>(null);
  const [parent1, setParent1] = useState<Partial<Usager>>({ ...EMPTY_USAGER });
  const [parent1Id, setParent1Id] = useState<string | null>(null);
  const [parent2, setParent2] = useState<Partial<Usager>>({ ...EMPTY_USAGER });
  const [parent2Id, setParent2Id] = useState<string | null>(null);
  const [adresse, setAdresse] = useState<Partial<Adresse>>({ ...EMPTY_ADRESSE });
  const [adresseDifferente, setAdresseDifferente] = useState(false);
  const [adresse2, setAdresse2] = useState<Partial<Adresse>>({ ...EMPTY_ADRESSE });
  const [tuteur, setTuteur] = useState<Partial<Usager>>({ ...EMPTY_USAGER });
  const [tuteurId, setTuteurId] = useState<string | null>(null);
  const [types, setTypes] = useState<Record<TypePiece, boolean>>({ CNI: false, Passeport: false });
  const [motifs, setMotifs] = useState<Record<TypePiece, string>>({ CNI: "premiere_demande", Passeport: "premiere_demande" });
  const [dateDemande, setDateDemande] = useState(today());
  const [canal, setCanal] = useState<CanalNotification>("email");

  const benef = useUsagerMatches(form, usagerId !== null);
  const age = ageDe(form.date_naissance);
  const mineur = age !== null && age < 18;
  const avecTuteur = tutelle;

  const asForm = (u: Usager): Partial<Usager> => ({ ...u, date_naissance: toInputDate(u.date_naissance) });

  // Modification : recharge le dossier, le beneficiaire, les parents et le tuteur.
  useEffect(() => {
    if (!editId) return;
    (async () => {
      try {
        const d = (await dossiersApi.getById(editId)).data;
        const first = d.pieces[0];
        const load = async (uid: string | null | undefined) => (uid ? asForm((await usagersApi.getById(uid)).data) : null);
        const b = await load(first.usager_id);
        if (b) {
          setForm(b);
          setUsagerId(first.usager_id);
        }
        const p1 = await load(d.parent1_usager_id);
        const p2 = await load(d.parent2_usager_id);
        const t = await load(d.tuteur_usager_id);
        if (p1) { setParent1(p1); setParent1Id(d.parent1_usager_id); setAdresse(adresseOf(p1)); }
        else if (b) setAdresse(adresseOf(b));
        if (p2) {
          setParent2(p2);
          setParent2Id(d.parent2_usager_id);
          const a2 = adresseOf(p2);
          setAdresse2(a2);
          setAdresseDifferente(!!p1 && JSON.stringify(a2) !== JSON.stringify(adresseOf(p1)));
        }
        if (t) { setTuteur(t); setTuteurId(d.tuteur_usager_id); }
        setTutelle(d.tutelle === true);
        setTypes({
          CNI: d.pieces.some((p) => p.type_piece === "CNI"),
          Passeport: d.pieces.some((p) => p.type_piece === "Passeport"),
        });
        setMotifs({
          CNI: d.pieces.find((p) => p.type_piece === "CNI")?.motif || "premiere_demande",
          Passeport: d.pieces.find((p) => p.type_piece === "Passeport")?.motif || "premiere_demande",
        });
        setDateDemande(toInputDate(first.date_demande));
        setCanal(first.canal_notification);
      } catch {
        toast.error("Dossier introuvable");
        navigate("/dossiers");
      } finally {
        setLoadingEdit(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  const choose = (u: Usager) => {
    setUsagerId(u.id);
    setForm(asForm(u));
  };

  const chooseParent1 = (u: Usager) => {
    setParent1Id(u.id);
    setParent1(asForm(u));
    if (!adresse.Adresse) setAdresse(adresseOf(u));
  };
  const chooseParent2 = (u: Usager) => {
    setParent2Id(u.id);
    setParent2(asForm(u));
  };
  const chooseTuteur = (u: Usager) => {
    setTuteurId(u.id);
    setTuteur(asForm(u));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selected = (Object.keys(types) as TypePiece[]).filter((t) => types[t]);
    if (!form.nom || !form.prenom || !form.date_naissance) {
      toast.error("Bénéficiaire : nom, prénom et date de naissance sont requis");
      return;
    }
    if (selected.length === 0) {
      toast.error("Choisissez au moins une pièce (CNI ou Passeport)");
      return;
    }
    if (!dateDemande) {
      toast.error("La date de demande est requise");
      return;
    }
    const manque = (p: Partial<Usager>) => !p.nom || !p.prenom || !p.date_naissance;
    if (mineur && manque(parent1)) {
      toast.error("Parent 1 : nom, prénom et date de naissance sont requis");
      return;
    }
    const aParent2 = mineur && !!parent2.nom;
    if (aParent2 && manque(parent2)) {
      toast.error("Parent 2 : nom, prénom et date de naissance sont requis");
      return;
    }
    if (avecTuteur && manque(tuteur)) {
      toast.error("Tuteur : nom, prénom et date de naissance sont requis");
      return;
    }

    // Mineur : l'adresse saisie est celle de la famille (enfant + parent 1) ; le parent 2 a la sienne si elle differe.
    const beneficiaire: Partial<Usager> = { ...form, ...(mineur ? adresse : {}), ...(usagerId ? { id: usagerId } : {}) };
    const payload = {
      tutelle,
      parent1: mineur ? { ...parent1, ...adresse, ...(parent1Id ? { id: parent1Id } : {}) } : undefined,
      parent2: aParent2 ? { ...parent2, ...(adresseDifferente ? adresse2 : adresse), ...(parent2Id ? { id: parent2Id } : {}) } : undefined,
      tuteur: avecTuteur ? { ...tuteur, ...(tuteurId ? { id: tuteurId } : {}) } : undefined,
      lignes: [
        {
          usager: beneficiaire,
          types: selected,
          motifs: Object.fromEntries(selected.map((t) => [t, motifs[t]])),
          date_demande: dateDemande,
          destinataire_index: 0,
          canal_notification: canal,
        },
      ],
    };
    setSaving(true);
    try {
      const res = editId ? await dossiersApi.update(editId, payload) : await dossiersApi.create(payload);
      toast.success(editId ? "Dossier modifié" : "Dossier créé");
      navigate(`/dossiers/${res.data.id}`);
    } catch (err: unknown) {
      let msg = "Erreur lors de l'enregistrement du dossier";
      if (err && typeof err === "object" && "response" in err) {
        const axErr = err as { response?: { data?: { error?: string } } };
        msg = axErr.response?.data?.error || msg;
      }
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loadingEdit) return <p className="text-center text-gray-500 py-12">Chargement...</p>;

  const retrait: string[] = [];
  if (tutelle && (tuteur.nom || tuteur.prenom)) retrait.push(`${formatPrenom(tuteur.prenom || "")} ${formatNom(tuteur.nom || "")} (tuteur)`);
  else if (mineur) {
    if (parent1.nom) retrait.push(`${formatPrenom(parent1.prenom || "")} ${formatNom(parent1.nom || "")}`);
    if (parent2.nom) retrait.push(`${formatPrenom(parent2.prenom || "")} ${formatNom(parent2.nom || "")}`);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(isEdit ? `/dossiers/${editId}` : "/dossiers")} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-ville-dark">
          {isEdit ? "Modifier le dossier CNI / Passeport" : "Nouveau dossier CNI / Passeport"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-8">
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-6">
            <h2 className="text-lg font-bold text-gray-600 uppercase">Bénéficiaire</h2>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-600 cursor-pointer">
              <input type="checkbox" checked={tutelle} onChange={(e) => setTutelle(e.target.checked)} className="rounded w-4 h-4" />
              TUTELLE
            </label>
            {age !== null && (
              <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${mineur ? "bg-violet-100 text-violet-700" : "bg-gray-100 text-gray-600"}`}>
                {mineur ? `Mineur (${age} ans)` : `Majeur (${age} ans)`}
              </span>
            )}
            {mineur && age !== null && age >= 12 && (
              <span className="flex items-center gap-1 text-xs text-violet-700" title="Sa présence est requise pour le retrait (empreintes)">
                <Fingerprint size={14} /> présence requise au retrait
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <h2 className="text-lg font-semibold text-ville-primary">Motif</h2>
            {(["CNI", "Passeport"] as TypePiece[]).map((t) => (
              <div key={t} className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm font-semibold uppercase text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={types[t]}
                    onChange={(e) => setTypes((prev) => ({ ...prev, [t]: e.target.checked }))}
                    className="rounded w-4 h-4"
                  />
                  {t}
                </label>
                <select
                  value={motifs[t]}
                  disabled={!types[t]}
                  onChange={(e) => setMotifs((prev) => ({ ...prev, [t]: e.target.value }))}
                  className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50 disabled:text-gray-400"
                >
                  {MOTIFS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField label="Date de la demande" value={dateDemande} onChange={setDateDemande} type="date" required />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Canal de notification</label>
              <select
                value={canal}
                onChange={(e) => setCanal(e.target.value as CanalNotification)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="both">Email + SMS</option>
              </select>
            </div>
          </div>
        </section>

        <MatchBanner
          linked={usagerId !== null}
          matches={benef.matches}
          total={benef.total}
          onChoose={choose}
          onUnlink={() => { setUsagerId(null); setForm({ ...EMPTY_USAGER }); }}
        />

        <UsagerFields
          form={form}
          onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
          variant="dossier"
          hideAdresse={mineur}
        />

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.consentement_rgpd || false}
            onChange={(e) => setForm((prev) => ({ ...prev, consentement_rgpd: e.target.checked }))}
            className="rounded w-4 h-4"
          />
          <span className="text-sm">L'usager a consenti au traitement de ses données personnelles (RGPD)</span>
        </label>

        {mineur && (
          <>
            <Responsable
              titre="Parent 1"
              value={parent1}
              linked={parent1Id !== null}
              onChange={(patch) => setParent1((prev) => ({ ...prev, ...patch }))}
              onChoose={chooseParent1}
              onUnlink={() => { setParent1Id(null); setParent1({ ...EMPTY_USAGER }); }}
            />
            <Responsable
              titre="Parent 2"
              value={parent2}
              linked={parent2Id !== null}
              onChange={(patch) => setParent2((prev) => ({ ...prev, ...patch }))}
              onChoose={chooseParent2}
              onUnlink={() => { setParent2Id(null); setParent2({ ...EMPTY_USAGER }); }}
            />

            <section className="space-y-4 border-t border-gray-100 pt-6">
              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" checked={adresseDifferente} onChange={(e) => setAdresseDifferente(e.target.checked)} className="rounded" />
                Cocher si les adresses des parents sont différentes
              </label>
              <AdresseSection
                titre={adresseDifferente ? "Adresse de l'enfant et du parent 1" : "Adresse de la famille"}
                form={adresse as Partial<Usager>}
                onChange={(patch) => setAdresse((prev) => ({ ...prev, ...patch }))}
              />
              {adresseDifferente && (
                <AdresseSection
                  titre="Adresse du parent 2"
                  form={adresse2 as Partial<Usager>}
                  onChange={(patch) => setAdresse2((prev) => ({ ...prev, ...patch }))}
                />
              )}
            </section>
          </>
        )}

        {avecTuteur && (
          <Responsable
            titre="Tuteur"
            value={tuteur}
            linked={tuteurId !== null}
            onChange={(patch) => setTuteur((prev) => ({ ...prev, ...patch }))}
            onChoose={chooseTuteur}
            onUnlink={() => { setTuteurId(null); setTuteur({ ...EMPTY_USAGER }); }}
          />
        )}

        {retrait.length > 0 && (
          <p className="text-sm text-gray-600 border-t border-gray-100 pt-4">
            Retrait des pièces par : <span className="font-semibold">{retrait.join(" ou ")}</span>
          </p>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate(isEdit ? `/dossiers/${editId}` : "/dossiers")}
            className="px-6 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
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
