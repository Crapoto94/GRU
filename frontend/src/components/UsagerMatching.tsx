import { useState, useEffect } from "react";
import { Link2, UserCheck } from "lucide-react";
import { formatNom, formatPrenom } from "../utils/format";
import { usagersApi } from "../services/api";
import { toFrDate } from "../utils/usagerForm";
import type { Usager } from "../types";

/**
 * Recherche, pendant la saisie d'un formulaire, les usagers existants qui
 * correspondent (nom, prenom, date de naissance) pour proposer de les lier.
 */
export function useUsagerMatches(form: Partial<Usager>, linked: boolean) {
  const [matches, setMatches] = useState<Usager[]>([]);
  const [total, setTotal] = useState(0);
  const { nom, prenom, date_naissance } = form;

  useEffect(() => {
    const frDate = date_naissance ? toFrDate(date_naissance) : "";
    if (linked || ((nom || "").trim().length < 2 && !frDate)) {
      setMatches([]);
      setTotal(0);
      return;
    }
    const timer = setTimeout(() => {
      usagersApi
        .list({ nom: nom?.trim() || undefined, prenom: prenom?.trim() || undefined, date_naissance: frDate || undefined, limit: 10 })
        .then((res) => {
          setMatches(res.data.rows);
          setTotal(res.data.total);
        })
        .catch(() => {
          setMatches([]);
          setTotal(0);
        });
    }, 400);
    return () => clearTimeout(timer);
  }, [linked, nom, prenom, date_naissance]);

  return { matches, total };
}

export function MatchBanner({
  linked,
  matches,
  total,
  onChoose,
  onUnlink,
}: {
  linked: boolean;
  matches: Usager[];
  total: number;
  onChoose: (u: Usager) => void;
  onUnlink: () => void;
}) {
  if (linked) {
    return (
      <div className="flex items-center justify-between gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800">
        <span className="flex items-center gap-2">
          <UserCheck size={16} />
          Fiche usager existante liée : les modifications ci-dessous mettront à jour cette fiche à l'enregistrement.
        </span>
        <button type="button" onClick={onUnlink} className="shrink-0 underline hover:no-underline">
          Délier
        </button>
      </div>
    );
  }
  if (total === 0) return null;
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-900 space-y-2">
      <p className="font-medium">
        {total} usager(s) correspondant(s){total > matches.length ? " (10 premiers affichés)" : ""}. Choisissez-en un, ou continuez la saisie pour créer une nouvelle fiche.
      </p>
      <ul className="divide-y divide-amber-100 bg-white rounded-lg border border-amber-100">
        {matches.map((u) => (
          <li key={u.id}>
            <button
              type="button"
              onClick={() => onChoose(u)}
              className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-amber-50"
            >
              <span>
                <span className="font-medium">{formatNom(u.nom)} {formatPrenom(u.prenom)}</span>
                <span className="text-gray-500 ml-2">né(e) le {new Date(u.date_naissance).toLocaleDateString("fr-FR")}</span>
                {u.ville && <span className="text-gray-400 ml-2">- {u.ville}</span>}
              </span>
              <span className="flex items-center gap-1 text-xs text-ville-primary">
                <Link2 size={12} /> Choisir
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
