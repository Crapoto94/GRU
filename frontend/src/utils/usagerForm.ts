import type { Usager } from "../types";

export const EMPTY_USAGER: Partial<Usager> = {
  civilite: "M.",
  nom: "",
  prenom: "",
  date_naissance: "",
  lieu_naissance: "",
  pays_naissance: "France",
  nationalite: "",
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
};

// Le champ date du formulaire (type="date") attend AAAA-MM-JJ.
export const toInputDate = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// La recherche usager attend JJ/MM/AAAA.
export const toFrDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return y && m && d && y.length === 4 ? `${d}/${m}/${y}` : "";
};
