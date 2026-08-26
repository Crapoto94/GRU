import { useState, useEffect } from "react";
import { Users, FileText, AlertTriangle } from "lucide-react";
import { usagersApi, attestationsApi } from "../services/api";

export default function Dashboard() {
  const [usagerCount, setUsagerCount] = useState(0);
  const [attestationCount, setAttestationCount] = useState(0);

  useEffect(() => {
    usagersApi.list({ limit: 1 }).then((res) => setUsagerCount(res.data.total));
    attestationsApi.list().then((res) => setAttestationCount(res.data.total));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ville-dark">Tableau de bord</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="text-ville-primary" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Usagers actifs</p>
              <p className="text-2xl font-bold text-ville-dark">{usagerCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <FileText className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Attestations generees</p>
              <p className="text-2xl font-bold text-ville-dark">{attestationCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 rounded-lg">
              <AlertTriangle className="text-amber-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Alertes RGPD</p>
              <p className="text-2xl font-bold text-ville-dark">0</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-ville-primary mb-4">A propos</h2>
        <p className="text-sm text-gray-600">
          JULTO - Gestion des Relations Usager est un outil de gestion des relations usager
          pour les collectivites territoriales. Il permet la gestion du referentiel usager
          et la generation d'attestations a partir de templates Word.
        </p>
        <div className="mt-4 text-xs text-gray-400">
          Conforme RGPD - Donnees stockees en local - Serveur Ville d'Ivry-sur-Seine
        </div>
      </div>
    </div>
  );
}
