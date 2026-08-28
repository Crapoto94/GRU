import { X } from "lucide-react";
import type { AdaLegacy } from "../types";

function formatDate(v: string | null | undefined): string {
  return v ? new Date(v).toLocaleDateString("fr-FR") : "-";
}

function formatCiviliteNomPrenom(ada: AdaLegacy, prefix: "hebergeant" | "heberge"): string {
  const nom = ada[`${prefix}_nom`];
  const prenom = ada[`${prefix}_prenom`];
  if (!nom && !prenom) return "Non relie";
  return `${ada[`${prefix}_civilite`] ?? ""} ${prenom ?? ""} ${nom ?? ""}`.replace(/\s+/g, " ").trim();
}

interface Props {
  ada: AdaLegacy | null;
  loading?: boolean;
  onClose: () => void;
}

export default function AdaLegacyPreviewModal({ ada, loading, onClose }: Props) {
  if (!ada && !loading) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-lg font-bold text-ville-dark">
            Demande d'attestation d'accueil — n° {ada?.legacy_id_demande ?? "..."}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded" title="Fermer">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center text-gray-500">Chargement...</div>
        ) : ada ? (
          <div className="p-6 space-y-5">
            {ada.attestation_id && (
              <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-lg px-4 py-3 text-sm">
                Attestation générée depuis cet ADA : <b>{ada.attestation_titre || "voir liste des attestations"}</b>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Période de validité</h3>
              <div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 rounded-lg p-4">
                <div><span className="text-gray-500">Du :</span> {formatDate(ada.date_deb_valid)}</div>
                <div><span className="text-gray-500">Au :</span> {formatDate(ada.date_fin_valid)}</div>
                <div><span className="text-gray-500">CERFA :</span> {ada.no_cerfa || "-"}</div>
                <div><span className="text-gray-500">Pièce n° :</span> {ada.no_piece || "-"}</div>
                <div><span className="text-gray-500">Pièce délivrée le :</span> {formatDate(ada.date_deliv_piece)}</div>
                <div><span className="text-gray-500">Lieu de délivrance :</span> {ada.lieu_deliv_piece || "-"}</div>
                <div><span className="text-gray-500">Valable jusqu'au :</span> {formatDate(ada.date_fin_validite_piece)}</div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Personnes concernées</h3>
              <div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 rounded-lg p-4">
                <div>
                  <span className="text-gray-500">Hébergeant (Demandeur) :</span>
                  <div className="font-medium">{formatCiviliteNomPrenom(ada, "hebergeant")}</div>
                  <div className="text-xs text-gray-500">Legacy #{ada.hebergeant_legacy_id ?? "-"}</div>
                  <div className="text-xs text-gray-500">
                    {ada.hebergeant_assure ? "Assureur" : ada.hebergeant_assure === false ? "Non assureur" : ""}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Hébergé (Bénéficiaire) :</span>
                  <div className="font-medium">{formatCiviliteNomPrenom(ada, "heberge")}</div>
                  <div className="text-xs text-gray-500">Legacy #{ada.heberge_legacy_id ?? "-"}</div>
                </div>
                <div><span className="text-gray-500">Lien de parenté (code) :</span> {ada.lien_parente_code ?? "-"}</div>
                <div><span className="text-gray-500">Ressources (€/mois) :</span> {ada.ressource_montant ?? "-"}</div>
              </div>
            </div>

            {ada.data && Object.keys(ada.data).length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Donnees brutes ALTO</h3>
                <div className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs font-mono overflow-x-auto">
                  <pre className="whitespace-pre-wrap break-words">{JSON.stringify(ada.data, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="px-6 py-12 text-center text-gray-500">Demande introuvable</div>
        )}
      </div>
    </div>
  );
}