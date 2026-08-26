import axios from "axios";
import type { Usager, Template, Attestation, PaginatedResponse } from "../types";

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
  list: (params?: { statut?: string; usager_id?: string }) =>
    api.get<PaginatedResponse<Attestation>>("/api/v1/attestations", { params }),
  getById: (id: string) => api.get<Attestation>(`/api/v1/attestations/${id}`),
  generate: (data: { usager_id: string; usager2_id?: string; usager3_id?: string; template_id: string; custom_data?: Record<string, string> }) =>
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

export const authApi = {
  login: (login: string, password: string) => api.post("/api/v1/auth/login", { login, password }),
  loginAD: (login: string, password: string) => api.post("/api/v1/auth/login-ad", { login, password }),
  changePassword: (current_password: string, new_password: string) =>
    api.post("/api/v1/auth/change-password", { current_password, new_password }),
};

export default api;
