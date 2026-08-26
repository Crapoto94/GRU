export const VERSION = "0.2.1";

export interface ChangelogEntry {
  version: string;
  date: string;
  features: string[];
}

export const CHANGELOG = [
  {
    version: "0.2.1",
    date: "2026-08-26",
    features: [
      "Admin-only delete usagers/attestations/templates",
      "Neutral title Mx (sexe=non-binaire, ne=empty)",
      "Fix date_naissance timezone (no UTC shift)",
      "Search users by phone/mobile added",
      "Attestation count badge with modal and download",
      "Template .docx download from parametrage",
      "Fix address: avoid double number from API",
      "Dynamic custom variables N (variable1, variable2...)",
      "Multi-usagers 1-3 with UI labels only, fixed prefixes usager1/2/3",
      "Sexe variable (M/F/non-binary) from civilite",
      "Nom usage in parentheses if filled",
      "Ne/nee/vide according to civilite",
      "Template soft delete (actif=false) + file cleanup",
      "Template edit: name, desc, variables, nb_usagers, labels, file",
      "Address autocomplete (api-adresse.data.gouv.fr) + country (restcountries.com)",
      "Long birth date format (15 mars 1985)",
      "Attestation generation: template first, then user selection"
    ]
  },
  {
    version: "0.2.0",
    date: "2026-08-25",
    features: [
      "Multi-usagers: templates 1 or 2 users with usager1_/usager2_ prefixes",
      "System variables date_du_jour / date_du_jour_long always available",
      "Fix adresse_complete: street only, no CP/ville/complement",
      "Fix adresse_complete for PostgreSQL (Adresse -> adresse)"
    ]
  },
  {
    version: "0.1.0",
    date: "2026-08-20",
    features: [
      "User management: create, edit, archive, restore, delete",
      "Search users by name, email",
      "Duplicate check (name+dob, phone)",
      "Birthplace and country autocomplete",
      "Attestation templates: .docx upload, variables, PDF generation",
      "User variables: civilite, nom, prenom, dob, address, etc.",
      "Attestations list with filters, download, delete",
      "JWT authentication + Active Directory",
      "User/role management (user/admin)",
      "Responsive Tailwind CSS interface"
    ]
  }
];

export const getVersion = () => VERSION;
export const getChangelog = () => CHANGELOG;
export const getCurrentVersion = () => CHANGELOG[0];
export const formatVersion = (v: string) => `v${v}`;