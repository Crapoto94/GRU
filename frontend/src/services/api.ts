import axios from "axios";
import type { Usager, Template, Attestation, PaginatedResponse, Dossier, DossierPiece, DossierSuivi, DossierNotificationLog, DossierListItem, Logement, TypeLogement, ConservationRegle, AdaLegacy, ListeReference, ListeValeur, RgpdAlerteUsager } from "../types";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("gru_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const usagersApi = {
  list: (params?: { search?: string; archived?: boolean; limit?: number; offset?: number }) =>
    api.get<PaginatedResponse<Usager>>("/api/v1/usagers", { params }),
  getById: (id: string) => api.get<Usager>(`/api/v1/usagers/${id}`),
  create: (data: Partial<Usager>) => api.post<Usager>("/api/v1/usagers", data),
  update: (id: string, data: Partial<Usager>) => api.put<Usager>(`/api/v1/usagers/${id}`, data),
  archive: (id: string, motif?: string) =>
    api.post<Usager>(`/api/v1/usagers/${id}/archive`, { motif }),
  restore: (id: string) => api.post<Usager>(`/api/v1/usagers/${id}/restore`),
  remove: (id: string) => api.delete(`/api/v1/usagers/${id}`),
  validateAdresse: (q: string) =>
    api.get<{ valid: boolean; suggestions: Array<{ label: string; score: number }> }>("/api/v1/usagers/validate/adresse", { params: { q } }),
  checkDoublon: (params: { nom?: string; date_naissance?: string; telephone?: string; exclude_id?: string }) =>
    api.get<{ nom_date: Usager[]; telephone: Usager[] }>("/api/v1/usagers/check-doublon", { params }),
  getLogement: (id: string, type: TypeLogement = "principal") =>
    api.get<Logement | null>(`/api/v1/usagers/${id}/logement`, { params: { type } }),
  saveLogement: (id: string, type: TypeLogement, data: Partial<Logement>) =>
    api.put<Logement>(`/api/v1/usagers/${id}/logement`, data, { params: { type } }),
  removeLogement: (id: string, type: TypeLogement) =>
    api.delete(`/api/v1/usagers/${id}/logement`, { params: { type } }),
  importSynbird: (contact: string) =>
    api.get<{
      exists: boolean;
      usager?: { id: string; nom: string; prenom: string; archived: boolean };
      found?: boolean;
      candidates?: Array<Partial<Usager> & { accompagnant?: boolean }>;
      tooMany?: boolean;
      count?: number;
    }>("/api/v1/usagers/import-synbird", { params: { contact } }),
};

export const attestationsApi = {
  listTemplates: () => api.get<PaginatedResponse<Template>>("/api/v1/attestations/templates"),
  getTemplate: (id: string) => api.get<Template>(`/api/v1/attestations/templates/${id}`),
  createTemplate: (data: Partial<Template>) => api.post<Template>("/api/v1/attestations/templates", data),
  uploadTemplate: (formData: FormData) =>
    api.post<Template>("/api/v1/attestations/templates/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  updateTemplate: (id: string, formData: FormData) =>
    api.put<Template>(`/api/v1/attestations/templates/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  deleteTemplate: (id: string) => api.delete(`/api/v1/attestations/templates/${id}`),
  downloadTemplate: (id: string) =>
    api.get(`/api/v1/attestations/templates/${id}/download`, { responseType: "blob" }),
  list: (params?: { statut?: string; usager_id?: string; search?: string; limit?: number; offset?: number }) =>
    api.get<PaginatedResponse<Attestation>>("/api/v1/attestations", { params }),
  getById: (id: string) => api.get<Attestation>(`/api/v1/attestations/${id}`),
  listAda: (params?: { search?: string; limite?: number; offset?: number }) =>
    api.get<PaginatedResponse<AdaLegacy>>("/api/v1/attestations/ada", { params }),
  getAda: (legacyId: number | string) =>
    api.get<AdaLegacy>(`/api/v1/attestations/ada/${legacyId}`),
  generate: (data: { usager_id: string; usager2_id?: string; usager3_id?: string; template_id: string; custom_data?: Record<string, string>; logement_concerne?: "principal" | "secondaire" }) =>
    api.post<Attestation>("/api/v1/attestations/generate", data),
  download: (id: string) =>
    api.get(`/api/v1/attestations/${id}/download`, { responseType: "blob" }),
  remove: (id: string) => api.delete(`/api/v1/attestations/${id}`),
};

export const adApi = {
  search: (q: string) => api.get("/api/v1/ad/search", { params: { q } }),
  getUser: (identifier: string) => api.get("/api/v1/ad/user", { params: { identifier } }),
  authenticate: (username: string, password: string) =>
    api.post("/api/v1/ad/authenticate", { username, password }),
};

export const usersApi = {
  list: (params?: { search?: string; limit?: number; offset?: number }) =>
    api.get("/api/v1/users", { params }),
  getById: (id: string) => api.get(`/api/v1/users/${id}`),
  create: (data: Record<string, string>) => api.post("/api/v1/users", data),
  createFromAD: (data: Record<string, string>) => api.post("/api/v1/users/create-from-ad", data),
  update: (id: string, data: Record<string, string>) => api.put(`/api/v1/users/${id}`, data),
  remove: (id: string) => api.delete(`/api/v1/users/${id}`),
  resetPassword: (id: string, password: string) =>
    api.post(`/api/v1/users/${id}/reset-password`, { password }),
};

export const dossiersApi = {
  list: (params?: {
    statut?: string;
    type_piece?: string;
    search?: string;
    nom?: string;
    prenom?: string;
    telephone?: string;
    adresse?: string;
    code_postal?: string;
    ville?: string;
    only_pending?: boolean;
    sort?: string;
    order?: "asc" | "desc";
    limit?: number;
    offset?: number;
  }) => api.get<PaginatedResponse<DossierListItem>>("/api/v1/dossiers", { params }),
  getById: (id: string) => api.get<Dossier>(`/api/v1/dossiers/${id}`),
  create: (data: {
    lignes: Array<{
      usager_id: string;
      types: string[];
      date_demande: string;
      destinataire_usager_id?: string;
      canal_notification?: string;
    }>;
  }) => api.post<Dossier>("/api/v1/dossiers", data),
  remove: (id: string) => api.delete(`/api/v1/dossiers/${id}`),
  addSuivi: (dossierId: string, commentaire: string) =>
    api.post<DossierSuivi>(`/api/v1/dossiers/${dossierId}/suivi`, { commentaire }),
  updateStatut: (pieceId: string, statut: string, commentaire?: string) =>
    api.patch<{ piece: DossierPiece; suggestNotification: boolean }>(
      `/api/v1/dossiers/pieces/${pieceId}/statut`,
      { statut, commentaire }
    ),
  updatePiece: (pieceId: string, data: Partial<DossierPiece>) =>
    api.put<DossierPiece>(`/api/v1/dossiers/pieces/${pieceId}`, data),
  removePiece: (pieceId: string) => api.delete(`/api/v1/dossiers/pieces/${pieceId}`),
  notify: (pieceId: string, canal: "sms" | "email") =>
    api.post<DossierPiece>(`/api/v1/dossiers/pieces/${pieceId}/notify`, { canal }),
  getNotifications: (pieceId: string) =>
    api.get<DossierNotificationLog[]>(`/api/v1/dossiers/pieces/${pieceId}/notifications`),
};

export const authApi = {
  login: (login: string, password: string) => api.post("/api/v1/auth/login", { login, password }),
  loginAD: (login: string, password: string) => api.post("/api/v1/auth/login-ad", { login, password }),
  changePassword: (current_password: string, new_password: string) =>
    api.post("/api/v1/auth/change-password", { current_password, new_password }),
};

export const rgpdApi = {
  listConservation: () => api.get<ConservationRegle[]>("/api/v1/rgpd/conservation"),
  updateConservation: (cle: string, data: { conservation_mois: number; description?: string }) =>
    api.put<ConservationRegle>(`/api/v1/rgpd/conservation/${encodeURIComponent(cle)}`, data),
  listAlertes: () => api.get<RgpdAlerteUsager[]>("/api/v1/rgpd/alertes"),
  archiver: (usagerIds: string[], motif?: string) =>
    api.post<{ count: number }>("/api/v1/rgpd/archiver", { usager_ids: usagerIds, motif }),
};

export const listesApi = {
  list: () => api.get<ListeReference[]>("/api/v1/listes-correspondance"),
  getByCle: (cle: string) => api.get<ListeReference>(`/api/v1/listes-correspondance/${encodeURIComponent(cle)}`),
  create: (data: { cle: string; nom: string }) => api.post<ListeReference>("/api/v1/listes-correspondance", data),
  update: (id: string, data: { nom: string }) => api.put<ListeReference>(`/api/v1/listes-correspondance/${id}`, data),
  remove: (id: string) => api.delete(`/api/v1/listes-correspondance/${id}`),
  addValue: (id: string, data: { code: string; label: string }) =>
    api.post<ListeValeur>(`/api/v1/listes-correspondance/${id}/valeurs`, data),
  updateValue: (id: string, valueId: string, data: { code: string; label: string; ordre?: number }) =>
    api.put<ListeValeur>(`/api/v1/listes-correspondance/${id}/valeurs/${valueId}`, data),
  removeValue: (id: string, valueId: string) =>
    api.delete(`/api/v1/listes-correspondance/${id}/valeurs/${valueId}`),
};

export default api;
