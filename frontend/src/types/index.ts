export interface Usager {
  id: string;
  civilite: string;
  nom: string;
  prenom: string;
  nom_usage: string | null;
  mention_nom_usage: string | null;
  taille: number | null;
  couleur_yeux: string | null;
  piece_identite_type: string | null;
  piece_identite_numero: string | null;
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
  cni_count: number;
  certificat_count: number;
  has_logement_principal: boolean;
  has_logement_secondaire: boolean;
  created_at: string;
  updated_at: string;
}

export interface UsagerPiece {
  id: string;
  dossier_id: string;
  type_piece: "CNI" | "Passeport";
  statut: "demande" | "ajourne" | "arrive" | "recupere" | "refuse" | "erreur_piece";
  date_demande: string;
  date_arrivee: string | null;
  date_recuperation: string | null;
  destinataire_nom: string | null;
  destinataire_prenom: string | null;
}

export interface Demarche {
  type: "cni" | "attestation" | "certificat";
  id: string;
  libelle: string;
  statut: string;
  date_demarche: string | null;
  ref: string;
}

export type StatutOccupation = "proprietaire" | "locataire" | "autre";
export type TypeLogement = "principal" | "secondaire";

export interface Logement {
  id: string;
  usager_id: string;
  type_logement: TypeLogement;
  adresse: string | null;
  complement_adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  pays: string | null;
  numero_batiment_escalier: string | null;
  surface_logement: number | null;
  nombre_pieces: number | null;
  etat_sanitaire: string | null;
  occupants_habituels_details: string | null;
  occupants_permanents: number | null;
  occupants_temporaires: number | null;
  statut_occupation: StatutOccupation | null;
  statut_occupation_precision: string | null;
  created_at: string;
  updated_at: string;
}

export interface Template {
  id: string;
  nom: string;
  description: string | null;
  fichier_original: string;
  variables: Array<{description: string; allowedValues?: string[]; listeCle?: string; listeNom?: string}>;
  nb_usagers: number;
  usager_labels: Record<string, string> | null;
  usage_logement_principal: boolean;
  usage_logement_secondaire: boolean;
  actif: boolean;
  created_at: string;
}

export interface ListeValeur {
  id: string;
  code: string;
  label: string;
  ordre: number;
}

export interface ListeReference {
  id: string;
  cle: string;
  nom: string;
  valeurs: ListeValeur[];
  created_at: string;
  updated_at: string;
}

export type StatutSuivi = "en_cours" | "ajourne" | "arrive" | "recupere" | "archive";

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
  no_cerfa: string | null;
  date_demande: string | null;
  date_debut_validite: string | null;
  date_fin_validite: string | null;
  statut_suivi: StatutSuivi;
  commentaire_suivi: string | null;
  date_statut: string | null;
  usager_date_naissance: string | null;
  usager_contact: string | null;
  usager2_date_naissance: string | null;
  agent_nom: string | null;
  agent_prenom: string | null;
  fichier_pdf: string | null;
  statut: string;
  date_generation: string | null;
  genere_par: string | null;
  created_at: string;
}

export interface AdaLegacy {
  legacy_id_demande: number;
  no_cerfa: string | null;
  no_piece: string | null;
  date_deb_valid: string | null;
  date_fin_valid: string | null;
  date_deliv_piece: string | null;
  lieu_deliv_piece: string | null;
  date_fin_validite_piece: string | null;
  hebergeant_legacy_id: number | null;
  heberge_legacy_id: number | null;
  hebergeant_usager_id: string | null;
  heberge_usager_id: string | null;
  hebergeant_assure: boolean | null;
  lien_parente_code: number | null;
  lien_parente_label: string | null;
  ressource_montant: number | null;
  ressource_observations: string | null;
  hebergeant_nom: string | null;
  hebergeant_prenom: string | null;
  hebergeant_civilite?: string | null;
  heberge_nom: string | null;
  heberge_prenom: string | null;
  heberge_civilite?: string | null;
  attestation_id: string | null;
  attestation_titre: string | null;
  data?: Record<string, string | null> | null;
  created_at: string;
}

export interface PaginatedResponse<T> {
  rows: T[];
  total: number;
}

export type TypePiece = "CNI" | "Passeport";
export type StatutPiece = "demande" | "ajourne" | "arrive" | "recupere" | "refuse" | "erreur_piece";
export type CanalNotification = "sms" | "email" | "both";

export type Personne = "parent1" | "parent2" | "tuteur";

export interface PersonneDossier {
  id: string;
  civilite: string;
  nom: string;
  prenom: string;
}

export interface EtapeCatalogueItem {
  code: string;
  libelle: string;
  statut: StatutPiece;
  menu: boolean;
  commentaire: boolean;
  personne: Personne | null;
}

export interface EtapeMenu {
  code: string;
  statut: StatutPiece;
  libelle: string;
  commentaire: boolean;
  personne: Personne | null;
  actif: boolean;
  ordre: number;
}

export interface DossierPieceEtape {
  id: string;
  dossier_piece_id: string;
  ordre: number;
  date_etape: string;
  libelle: string;
  statut_equivalent: StatutPiece | null;
  code_legacy: string | null;
  commentaire: string | null;
  created_at: string;
}

export interface DossierPiece {
  id: string;
  dossier_id: string;
  usager_id: string;
  usager_nom: string;
  usager_prenom: string;
  type_piece: TypePiece;
  motif: string | null;
  date_demande: string;
  statut: StatutPiece;
  destinataire_usager_id: string | null;
  destinataire_nom: string | null;
  destinataire_prenom: string | null;
  destinataire_email: string | null;
  destinataire_mobile: string | null;
  destinataire_telephone: string | null;
  canal_notification: CanalNotification;
  date_arrivee: string | null;
  date_recuperation: string | null;
  notifie: boolean;
  date_notification: string | null;
  created_at: string;
  updated_at: string;
  etapes: DossierPieceEtape[];
}

export interface DossierSuivi {
  id: string;
  dossier_id: string;
  agent: string;
  commentaire: string;
  automatique: boolean;
  created_at: string;
}

export interface DossierNotificationLog {
  id: string;
  dossier_piece_id: string;
  canal: "sms" | "email";
  destinataire: string;
  statut: "envoye" | "echec";
  erreur: string | null;
  envoye_par: string;
  created_at: string;
}

export interface Dossier {
  id: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  categorie: "majeur" | "mineur";
  tutelle: boolean;
  parent1_usager_id: string | null;
  parent2_usager_id: string | null;
  tuteur_usager_id: string | null;
  parent1: PersonneDossier | null;
  parent2: PersonneDossier | null;
  tuteur: PersonneDossier | null;
  pieces: DossierPiece[];
  suivi: DossierSuivi[];
}

export interface PieceListItem {
  piece_id: string;
  dossier_id: string;
  type_piece: TypePiece;
  statut: StatutPiece;
  motif: string | null;
  date_demande: string;
  usager_id: string;
  usager_nom: string;
  usager_prenom: string;
  date_naissance: string;
  contact: string | null;
  destinataire_nom: string | null;
  destinataire_prenom: string | null;
  agent_nom: string | null;
  agent_prenom: string | null;
  depuis_date: string | null;
}

export interface DossierListItem {
  dossier_id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  nb_usagers: number;
  nb_pieces: number;
  usagers: Array<{ id: string; nom: string; prenom: string }>;
  nb_demande: number;
  nb_ajourne: number;
  nb_arrive: number;
  nb_recupere: number;
  nb_refuse: number;
  date_demande: string | null;
  date_demande_attente: string | null;
}

export type ConservationCategorie = "attestations" | "dossiers" | "usagers";

export interface ConservationRegle {
  cle: string;
  libelle: string;
  categorie: ConservationCategorie;
  conservation_mois: number;
  description: string | null;
  actif: boolean;
  updated_at: string | null;
}

export interface RgpdAlerteUsager {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  mobile: string | null;
  ville: string | null;
  dernier_evenement: string;
  jours_ecoules: number;
  duree_conservation_mois: number;
}
