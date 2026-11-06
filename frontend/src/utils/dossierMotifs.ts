export const MOTIFS: Array<{ value: string; label: string }> = [
  { value: "premiere_demande", label: "1ère demande" },
  { value: "renouvellement", label: "Renouvellement" },
  { value: "identite_numerique", label: "Identité numérique" },
  { value: "perte", label: "Perte" },
  { value: "vol", label: "Vol" },
  { value: "deterioration", label: "Détérioration" },
  { value: "changement_etat_civil", label: "Changement d'état civil" },
  { value: "erreur_administration", label: "Erreur imputable à l'administration" },
  { value: "pages_visa_completes", label: "Pages visa passeport complètes" },
];

export const motifLabel = (code: string | null) => MOTIFS.find((m) => m.value === code)?.label || "-";
