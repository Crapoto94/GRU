// Saisie d'une date sans taper les "/" : 25121986 -> 25/12/1986 (recherches par date de naissance).
export const maskDate = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
};
