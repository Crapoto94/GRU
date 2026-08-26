import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import Sidebar from "./components/Sidebar";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import UsagersList from "./pages/UsagersList";
import UsagerForm from "./pages/UsagerForm";
import UsagerDetail from "./pages/UsagerDetail";
import AttestationsList from "./pages/AttestationsList";
import AttestationGenerate from "./pages/AttestationGenerate";
import ParametrageAttestations from "./pages/ParametrageAttestations";
import ParametrageDatabase from "./pages/ParametrageDatabase";
import ParametrageApiVille from "./pages/ParametrageApiVille";
import UsersPage from "./pages/UsersPage";
import LogsPage from "./pages/LogsPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
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
                  <Route path="/usagers/:id" element={<UsagerDetail />} />
                  <Route path="/usagers/:id/modifier" element={<UsagerForm />} />
                  <Route path="/attestations" element={<AttestationsList />} />
                  <Route path="/attestations/nouvelle" element={<AttestationGenerate />} />
                  <Route path="/parametrage/attestations" element={<ParametrageAttestations />} />
                  <Route path="/parametrage/base-de-donnees" element={<ParametrageDatabase />} />
                  <Route path="/parametrage/api-ville" element={<ParametrageApiVille />} />
                  <Route path="/parametrage/utilisateurs" element={<UsersPage />} />
                  <Route path="/parametrage/logs" element={<LogsPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </div>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
