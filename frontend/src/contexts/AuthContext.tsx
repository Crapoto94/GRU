import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

interface User {
  id: string;
  login: string;
  nom: string;
  prenom: string;
  email: string;
  role: "utilisateur" | "administrateur";
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  isAdmin: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("gru_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("gru_token"));

  const loginFn = (newToken: string, newUser: User) => {
    localStorage.setItem("gru_token", newToken);
    localStorage.setItem("gru_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem("gru_token");
    localStorage.removeItem("gru_user");
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    if (token) {
      localStorage.setItem("gru_token", token);
    }
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, login: loginFn, logout, isAdmin: user?.role === "administrateur" }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
