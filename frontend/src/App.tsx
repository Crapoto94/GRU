import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import WhatsNewModal from "./components/WhatsNewModal";
import HelpModal from "./components/HelpModal";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import UsagersList from "./pages/UsagersList";
import UsagerForm from "./pages/UsagerForm";
import AttestationsList from "./pages/AttestationsList";
import AttestationGenerate from "./pages/AttestationGenerate";
import AdasList from "./pages/AdasList";
import ParametrageAttestations from "./pages/ParametrageAttestations";
import ParametrageDatabase from "./pages/ParametrageDatabase";
import ParametrageApiVille from "./pages/ParametrageApiVille";
import ParametrageSynbird from "./pages/ParametrageSynbird";
import ParametrageMessages from "./pages/ParametrageMessages";
import DossiersList from "./pages/DossiersList";
import DossierForm from "./pages/DossierForm";
import DossierDetail from "./pages/DossierDetail";
import UsersPage from "./pages/UsersPage";
import LogsPage from "./pages/LogsPage";
import RgpdPage from "./pages/RgpdPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RgpdRoute({ children }: { children: React.ReactNode }) {
  const { token, canAccessRgpd } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (!canAccessRgpd) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const handlerWhatsNew = () => setShowWhatsNew(true);
    const handlerHelp = () => setShowHelp(true);
    window.addEventListener("open-whats-new", handlerWhatsNew);
    window.addEventListener("open-help", handlerHelp);
    return () => {
      window.removeEventListener("open-whats-new", handlerWhatsNew);
      window.removeEventListener("open-help", handlerHelp);
    };
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <div className="flex min-h-screen">
              <Sidebar />
              <main className="flex-1 p-8">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/usagers" element={<UsagersList />} />
                  <Route path="/usagers/nouveau" element={<UsagerForm />} />
                  <Route path="/usagers/:id" element={<UsagerForm />} />
                  <Route path="/attestations" element={<AttestationsList />} />
                  <Route path="/attestations/ada" element={<AdasList />} />
                  <Route path="/attestations/nouvelle" element={<AttestationGenerate />} />
                  <Route path="/dossiers" element={<DossiersList />} />
                  <Route path="/dossiers/nouveau" element={<DossierForm />} />
                  <Route path="/dossiers/:id" element={<DossierDetail />} />
                  <Route path="/rgpd" element={<RgpdRoute><RgpdPage /></RgpdRoute>} />
                  <Route path="/parametrage/attestations" element={<ParametrageAttestations />} />
                  <Route path="/parametrage/base-de-donnees" element={<ParametrageDatabase />} />
                  <Route path="/parametrage/api-ville" element={<ParametrageApiVille />} />
                  <Route path="/parametrage/synbird" element={<ParametrageSynbird />} />
                  <Route path="/parametrage/messages" element={<ParametrageMessages />} />
                  <Route path="/parametrage/utilisateurs" element={<UsersPage />} />
                  <Route path="/parametrage/logs" element={<LogsPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </div>
            <WhatsNewModal isOpen={showWhatsNew} onClose={() => setShowWhatsNew(false)} />
            <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
