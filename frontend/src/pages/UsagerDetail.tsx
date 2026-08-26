import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Edit, FileText, Archive, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import { formatNom, formatPrenom } from "../utils/format";
import { usagersApi, attestationsApi } from "../services/api";
import type { Usager, Attestation } from "../types";

export default function UsagerDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [usager, setUsager] = useState<Usager | null>(null);
  const [attestations, setAttestations] = useState<Attestation[]>([]);

  useEffect(() => {
    if (!id) return;
    usagersApi.getById(id).then((res) => setUsager(res.data)).catch(() => toast.error("Usager non trouve"));
    attestationsApi.list({ usager_id: id }).then((res) => setAttestations(res.data.rows));
  }, [id]);

  const handleArchive = async () => {
    if (!id) return;
    if (!window.confirm("Archiver cet usager ?")) return;
    await usagersApi.archive(id);
    toast.success("Usager archive");
    navigate("/usagers");
  };

  const handleRestore = async () => {
    if (!id) return;
    await usagersApi.restore(id);
    toast.success("Usager restaure");
    const res = await usagersApi.getById(id);
    setUsager(res.data);
  };

  const handleDownload = async (attestationId: string) => {
    try {
      const res = await attestationsApi.download(attestationId);
      const blob = new Blob([res.data], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Erreur lors du telechargement");
    }
  };

  if (!usager) return <div className="text-center py-12 text-gray-500">Chargement...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/usagers")} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-ville-dark">
              {usager.civilite} {formatPrenom(usager.prenom)} {formatNom(usager.nom)}
            </h1>
            {usager.archived && (
              <span className="text-sm text-orange-600 font-medium">Archive</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/usagers/${id}/modifier`)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
          >
            <Edit size={16} />
            Modifier
          </button>
          {usager.archived ? (
            <button
              onClick={handleRestore}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              <RotateCcw size={16} />
              Restaurer
            </button>
          ) : (
            <button
              onClick={handleArchive}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm"
            >
              <Archive size={16} />
              Archiver
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-ville-primary mb-3">Etat civil</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-gray-500">Nom</span><p className="font-medium">{formatNom(usager.nom)}</p></div>
            <div><span className="text-gray-500">Prenom</span><p className="font-medium">{formatPrenom(usager.prenom)}</p></div>
            {usager.nom_usage && <div><span className="text-gray-500">Nom d'usage</span><p className="font-medium">{usager.nom_usage}</p></div>}
            <div><span className="text-gray-500">Date de naissance</span><p className="font-medium">{usager.date_naissance ? new Date(usager.date_naissance).toLocaleDateString("fr-FR") : "-"}</p></div>
            <div><span className="text-gray-500">Lieu de naissance</span><p className="font-medium">{usager.lieu_naissance || "-"}</p></div>
            <div><span className="text-gray-500">Pays de naissance</span><p className="font-medium">{usager.pays_naissance || "-"}</p></div>
            <div><span className="text-gray-500">Nationalite</span><p className="font-medium">{usager.nationalite || "-"}</p></div>
            <div><span className="text-gray-500">Situation</span><p className="font-medium">{usager.situation_familiale || "-"}</p></div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ville-primary mb-3">Contact</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div><span className="text-gray-500">Email</span><p className="font-medium">{usager.email || "-"}</p></div>
            <div><span className="text-gray-500">Telephone</span><p className="font-medium">{usager.telephone || "-"}</p></div>
            <div><span className="text-gray-500">Mobile</span><p className="font-medium">{usager.mobile || "-"}</p></div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ville-primary mb-3">Adresse</h2>
          <p className="text-sm">
            {usager.Adresse || ""}
            {usager.complement_adresse && <>, {usager.complement_adresse}</>}
          </p>
          <p className="text-sm">{usager.code_postal} {usager.ville}</p>
          <p className="text-sm">{usager.pays}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ville-primary mb-3">RGPD</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Consentement RGPD</span>
              <p>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  usager.consentement_rgpd ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}>
                  {usager.consentement_rgpd ? "Consenti" : "Non consenti"}
                </span>
              </p>
            </div>
            <div><span className="text-gray-500">Reception email</span><p className="font-medium">{usager.mail_actif ? "Oui" : "Non"}</p></div>
          </div>
        </section>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-ville-primary">Attestations</h2>
          <button
            onClick={() => navigate(`/attestations/nouvelle?usager=${id}`)}
            className="flex items-center gap-2 text-sm text-ville-primary hover:underline"
          >
            <FileText size={16} />
            Generer une attestation
          </button>
        </div>
        {attestations.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune attestation pour cet usager.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 text-gray-500 font-medium">Titre</th>
                <th className="text-left py-2 text-gray-500 font-medium">Statut</th>
                <th className="text-left py-2 text-gray-500 font-medium">Date</th>
                <th className="text-right py-2 text-gray-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {attestations.map((a) => (
                <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 font-medium">{a.titre}</td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      a.statut === "genere" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                    }`}>{a.statut}</span>
                  </td>
                  <td className="py-2 text-gray-600">{a.date_generation ? new Date(a.date_generation).toLocaleDateString("fr-FR") : "-"}</td>
                  <td className="py-2 text-right">
                    {a.fichier_pdf && (
                      <button
                        onClick={() => handleDownload(a.id)}
                        className="text-ville-primary hover:underline"
                      >
                        Telecharger
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
