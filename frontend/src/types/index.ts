export interface Usager {
  id: string;
  civilite: string;
  nom: string;
  prenom: string;
  nom_usage: string | null;
  date_naissance: string;
  lieu_naissance: string | null;
  pays_naissance: string;
  nationalite: string;
  situation_familiale: string | null;
  email: string | null;
  telephone: string | null;
  mobile: string | null;
  Adresse: string | null;
  complement_adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  pays: string;
  mail_actif: boolean;
  consentement_rgpd: boolean;
  archived: boolean;
  date_archivage: string | null;
  motif_archivage: string | null;
  created_by: string | null;
  attestation_count: number;
  created_at: string;
  updated_at: string;
}

export interface Template {
  id: string;
  nom: string;
  description: string | null;
  fichier_original: string;
  variables: Array<{description: string; allowedValues?: string[]}>;
  nb_usagers: number;
  usager_labels: Record<string, string> | null;
  actif: boolean;
  created_at: string;
}

export interface Attestation {
  id: string;
  usager_id: string;
  usager2_id: string | null;
  usager3_id: string | null;
  template_id: string;
  usager_nom: string;
  usager_prenom: string;
  usager2_nom: string | null;
  usager2_prenom: string | null;
  usager3_nom: string | null;
  usager3_prenom: string | null;
  template_nom: string;
  titre: string;
  contenu_genere: Record<string, string>;
  fichier_pdf: string | null;
  statut: string;
  date_generation: string | null;
  genere_par: string | null;
  created_at: string;
}

export interface PaginatedResponse<T> {
  rows: T[];
  total: number;
}
