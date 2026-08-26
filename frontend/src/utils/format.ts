export function formatNom(nom: string): string {
  return (nom || "").toUpperCase();
}

export function formatPrenom(prenom: string): string {
  return (prenom || "")
    .split(/[\s-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("-");
}
