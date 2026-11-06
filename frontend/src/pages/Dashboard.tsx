import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, FileText, IdCard, Timer } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { statsApi, type DashboardStats } from "../services/api";

type Tone = "blue" | "red" | "green" | "amber";

const TONES: Record<Tone, { box: string; icon: string }> = {
  blue: { box: "bg-blue-100", icon: "text-ville-primary" },
  red: { box: "bg-red-100", icon: "text-red-600" },
  green: { box: "bg-green-100", icon: "text-green-600" },
  amber: { box: "bg-amber-100", icon: "text-amber-600" },
};

function Tile({ label, value, icon: Icon, tone, to }: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone: Tone;
  to?: string;
}) {
  const navigate = useNavigate();
  const t = TONES[tone];
  const clickable = !!to;
  return (
    <div
      onClick={to ? () => navigate(to) : undefined}
      className={`bg-white rounded-xl shadow-sm p-5 flex items-center gap-4 ${
        clickable ? "cursor-pointer hover:shadow-md hover:ring-1 hover:ring-ville-primary transition" : ""
      }`}
    >
      <div className={`p-3 rounded-lg ${t.box}`}>
        <Icon className={t.icon} size={22} />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-ville-dark">{value}</p>
      </div>
    </div>
  );
}

const fmtJours = (v: number | null | undefined) => (v == null ? "—" : `${v} j`);

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    statsApi.dashboard().then((res) => setStats(res.data));
  }, []);

  const u = stats?.usagers;
  const p = stats?.pieces;
  const a = stats?.attestations;
  const d = stats?.delais;
  const n = (v?: number) => (v ?? "…");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ville-dark">Tableau de bord</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Tile label="Usagers actifs" value={n(u?.actifs)} icon={Users} tone="blue" to="/usagers" />
        <Tile label="Ivry" value={n(u?.ivry)} icon={Users} tone="blue" to="/usagers?ville=Ivry" />
        <Tile label="Hors Ivry" value={n(u?.hors_ivry)} icon={Users} tone="blue" />
        <Tile label="Majeur" value={n(u?.majeurs)} icon={Users} tone="blue" />
        <Tile label="Mineur" value={n(u?.mineurs)} icon={Users} tone="blue" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Tile label="CNI / Passeport" value={n(p?.total)} icon={IdCard} tone="red" to="/dossiers?statut=demande,ajourne,arrive,recupere,refuse" />
        <Tile label="En cours" value={n(p?.en_cours)} icon={IdCard} tone="red" to="/dossiers?statut=demande" />
        <Tile label="Ajourné" value={n(p?.ajourne)} icon={IdCard} tone="red" to="/dossiers?statut=ajourne" />
        <Tile label="Arrivé" value={n(p?.arrive)} icon={IdCard} tone="red" to="/dossiers?statut=arrive" />
        <Tile label="Archivé" value={n(p?.archive)} icon={IdCard} tone="red" to="/dossiers?statut=recupere,refuse" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Tile label="Attestations d'accueil" value={n(a?.total)} icon={FileText} tone="green" to="/attestations?statut=en_cours,ajourne,arrive,recupere,archive" />
        <Tile label="En cours" value={n(a?.en_cours)} icon={FileText} tone="green" to="/attestations?statut=en_cours" />
        <Tile label="Ajourné" value={n(a?.ajourne)} icon={FileText} tone="green" to="/attestations?statut=ajourne" />
        <Tile label="Arrivé" value={n(a?.arrive)} icon={FileText} tone="green" to="/attestations?statut=arrive" />
        <Tile label="Archivé" value={n(a?.archive)} icon={FileText} tone="green" to="/attestations?statut=recupere,archive" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Tile label="Délai moyen d'arrivée (7 derniers jours)" value={fmtJours(d?.semaine)} icon={Timer} tone="amber" />
        <Tile label="Délai moyen d'arrivée (30 derniers jours)" value={fmtJours(d?.mois)} icon={Timer} tone="amber" />
      </div>
    </div>
  );
}
