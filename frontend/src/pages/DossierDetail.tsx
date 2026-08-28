import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Trash2, Mail, MessageSquare, Send, IdCard, History, ListTree } from "lucide-react";
import toast from "react-hot-toast";
import { formatNom, formatPrenom } from "../utils/format";
import { dossiersApi } from "../services/api";
import type { Dossier, DossierPiece, StatutPiece, DossierNotificationLog, EtapeCatalogueItem } from "../types";

const STATUT_LABELS: Record<StatutPiece, string> = {
  demande: "Demandé",
  ajourne: "Ajourné",
  arrive: "Arrivé",
  recupere: "Récupéré",
  refuse: "Refusé",
};

const STATUT_COLORS: Record<StatutPiece, string> = {
  demande: "bg-gray-100 text-gray-700",
  ajourne: "bg-amber-100 text-amber-700",
  arrive: "bg-green-100 text-green-700",
  recupere: "bg-blue-100 text-blue-700",
  refuse: "bg-rose-100 text-rose-700",
};

export default function DossierDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentaire, setCommentaire] = useState("");
  const [posting, setPosting] = useState(false);
  const [sendingKey, setSendingKey] = useState<string | null>(null);
  const [historyPieceId, setHistoryPieceId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<DossierNotificationLog[]>([]);
  const [timelinePieceId, setTimelinePieceId] = useState<string | null>(null);
  const [etapeCatalogue, setEtapeCatalogue] = useState<EtapeCatalogueItem[]>([]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await dossiersApi.getById(id);
      setDossier(res.data);
    } catch {
      toast.error("Dossier introuvable");
      navigate("/dossiers");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    dossiersApi.etapesCatalogue().then((res) => setEtapeCatalogue(res.data)).catch(() => {});
  }, []);

  const errorMessage = (err: unknown, fallback: string) => {
    if (err && typeof err === "object" && "response" in err) {
      const axErr = err as { response?: { data?: { error?: string } } };
      return axErr.response?.data?.error || fallback;
    }
    return fallback;
  };

  const handleEtapeChange = async (piece: DossierPiece, code: string) => {
    if (!code) return;
    try {
      await dossiersApi.updateStatut(piece.id, code);
      toast.success("Etape ajoutee a la frise");
      load();
    } catch (err) {
      toast.error(errorMessage(err, "Erreur lors du changement d'etat"));
    }
  };

  const handleNotify = async (piece: DossierPiece, canal: "sms" | "email") => {
    const key = `${piece.id}-${canal}`;
    setSendingKey(key);
    try {
      await dossiersApi.notify(piece.id, canal);
      toast.success(canal === "sms" ? "SMS envoye" : "Email envoye");
      load();
    } catch (err) {
      toast.error(errorMessage(err, "Erreur lors de l'envoi"));
    } finally {
      setSendingKey(null);
    }
  };

  const handleAddSuivi = async () => {
    if (!id || !commentaire.trim()) return;
    setPosting(true);
    try {
      await dossiersApi.addSuivi(id, commentaire.trim());
      setCommentaire("");
      load();
    } catch (err) {
      toast.error(errorMessage(err, "Erreur lors de l'ajout du commentaire"));
    } finally {
      setPosting(false);
    }
  };

  const handleRemovePiece = async (piece: DossierPiece) => {
    if (!window.confirm(`Retirer ${piece.type_piece} de ${piece.usager_prenom} ${piece.usager_nom} du dossier ?`)) return;
    try {
      await dossiersApi.removePiece(piece.id);
      toast.success("Piece retiree");
      load();
    } catch (err) {
      toast.error(errorMessage(err, "Erreur lors de la suppression"));
    }
  };

  const handleDeleteDossier = async () => {
    if (!id || !window.confirm("Supprimer definitivement ce dossier et toutes ses pieces ?")) return;
    try {
      await dossiersApi.remove(id);
      toast.success("Dossier supprime");
      navigate("/dossiers");
    } catch (err) {
      toast.error(errorMessage(err, "Erreur lors de la suppression"));
    }
  };

  const toggleHistory = async (pieceId: string) => {
    if (historyPieceId === pieceId) {
      setHistoryPieceId(null);
      return;
    }
    try {
      const res = await dossiersApi.getNotifications(pieceId);
      setNotifications(res.data);
      setHistoryPieceId(pieceId);
    } catch {
      toast.error("Erreur chargement historique");
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Chargement...</div>;
  if (!dossier) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/dossiers")} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-ville-dark">Dossier CNI / Passeport</h1>
            <p className="text-sm text-gray-500">
              Cree le {new Date(dossier.created_at).toLocaleDateString("fr-FR")} par {dossier.created_by || "-"}
            </p>
          </div>
        </div>
        <button
          onClick={handleDeleteDossier}
          className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg text-sm"
        >
          <Trash2 size={16} />
          Supprimer le dossier
        </button>
      </div>

      <section className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-ville-primary">Pieces demandees</h2>
        <div className="space-y-3">
          {dossier.pieces.map((piece) => {
            const highlighted = piece.statut === "arrive" && !piece.notifie;
            const canSms = piece.canal_notification !== "email";
            const canEmail = piece.canal_notification !== "sms";
            return (
              <div
                key={piece.id}
                className={`border rounded-lg p-4 space-y-3 ${highlighted ? "border-green-300 bg-green-50" : "border-gray-200"}`}
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <IdCard size={16} className="text-ville-primary" />
                    <span className="font-medium">{piece.type_piece}</span>
                    <span className="text-gray-500">-</span>
                    <span>{formatPrenom(piece.usager_prenom)} {formatNom(piece.usager_nom)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium rounded-full px-2 py-1 ${STATUT_COLORS[piece.statut]}`}>
                      {STATUT_LABELS[piece.statut]}
                    </span>
                    <select
                      value=""
                      onChange={(e) => handleEtapeChange(piece, e.target.value)}
                      className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 text-gray-600"
                    >
                      <option value="">Changer d&apos;état...</option>
                      {(Object.keys(STATUT_LABELS) as StatutPiece[]).map((s) => {
                        const items = etapeCatalogue.filter((e) => e.statut === s);
                        if (items.length === 0) return null;
                        return (
                          <optgroup key={s} label={STATUT_LABELS[s]}>
                            {items.map((e) => (
                              <option key={e.code} value={e.code}>{e.libelle}</option>
                            ))}
                          </optgroup>
                        );
                      })}
                    </select>
                    <button
                      onClick={() => handleRemovePiece(piece)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      title="Retirer cette piece"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                  <span>Demandee le {new Date(piece.date_demande).toLocaleDateString("fr-FR")}</span>
                  <span>
                    A notifier : {formatPrenom(piece.destinataire_prenom || "")} {formatNom(piece.destinataire_nom || "")}
                    {" "}({piece.canal_notification === "both" ? "email + SMS" : piece.canal_notification})
                  </span>
                  {piece.notifie && piece.date_notification && (
                    <span className="text-green-600">Notifie le {new Date(piece.date_notification).toLocaleDateString("fr-FR")}</span>
                  )}
                </div>

                {piece.etapes.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setTimelinePieceId(timelinePieceId === piece.id ? null : piece.id)}
                      className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded-lg text-xs"
                    >
                      <ListTree size={14} />
                      Frise chronologique ({piece.etapes.length})
                    </button>
                  </div>
                )}

                {timelinePieceId === piece.id && (
                  <div className="mt-2 border-t border-gray-100 pt-3 pl-1">
                    <ol className="space-y-3">
                      {piece.etapes.map((e) => (
                        <li key={e.id} className="flex items-start gap-3">
                          <span
                            className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${
                              e.statut_equivalent ? STATUT_COLORS[e.statut_equivalent].split(" ")[0] : "bg-gray-300"
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800">{e.libelle}</p>
                            <p className="text-xs text-gray-400">{new Date(e.date_etape).toLocaleString("fr-FR")}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {piece.statut === "arrive" && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {canSms && (
                      <button
                        onClick={() => handleNotify(piece, "sms")}
                        disabled={sendingKey === `${piece.id}-sms` || (!piece.destinataire_mobile && !piece.destinataire_telephone)}
                        className="flex items-center gap-1.5 bg-white border border-ville-primary text-ville-primary px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        title={!piece.destinataire_mobile && !piece.destinataire_telephone ? "Aucun numero pour le destinataire" : ""}
                      >
                        <MessageSquare size={14} />
                        {sendingKey === `${piece.id}-sms` ? "Envoi..." : "Envoyer SMS"}
                      </button>
                    )}
                    {canEmail && (
                      <button
                        onClick={() => handleNotify(piece, "email")}
                        disabled={sendingKey === `${piece.id}-email` || !piece.destinataire_email}
                        className="flex items-center gap-1.5 bg-white border border-ville-primary text-ville-primary px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        title={!piece.destinataire_email ? "Aucun email pour le destinataire" : ""}
                      >
                        <Mail size={14} />
                        {sendingKey === `${piece.id}-email` ? "Envoi..." : "Envoyer Email"}
                      </button>
                    )}
                    <button
                      onClick={() => toggleHistory(piece.id)}
                      className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded-lg text-xs"
                    >
                      <History size={14} />
                      Historique
                    </button>
                  </div>
                )}

                {historyPieceId === piece.id && (
                  <div className="mt-2 border-t border-gray-100 pt-2 space-y-1">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-gray-400">Aucune notification envoyee</p>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className="text-xs text-gray-500 flex items-center gap-2">
                          <span className={n.statut === "envoye" ? "text-green-600" : "text-red-600"}>
                            {n.statut === "envoye" ? "OK" : "Echec"}
                          </span>
                          <span>{n.canal} vers {n.destinataire}</span>
                          <span>- {new Date(n.created_at).toLocaleString("fr-FR")}</span>
                          {n.erreur && <span className="text-red-500">({n.erreur})</span>}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-ville-primary">Suivi du dossier</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAddSuivi(); }}
            placeholder="Ajouter un commentaire de suivi..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <button
            onClick={handleAddSuivi}
            disabled={posting || !commentaire.trim()}
            className="flex items-center gap-2 bg-ville-primary text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            <Send size={14} />
            Ajouter
          </button>
        </div>
        <div className="space-y-3">
          {dossier.suivi.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun suivi pour l'instant</p>
          ) : (
            dossier.suivi.map((s) => (
              <div key={s.id} className="flex gap-3 text-sm border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                <div className="w-32 shrink-0 text-xs text-gray-400">
                  {new Date(s.created_at).toLocaleString("fr-FR")}
                </div>
                <div className="flex-1">
                  <p className={s.automatique ? "text-gray-500 italic" : "text-gray-800"}>{s.commentaire}</p>
                  <p className="text-xs text-gray-400">{s.agent}{s.automatique ? " - automatique" : ""}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
