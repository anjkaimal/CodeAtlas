import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

export type AuthUser = {
  id: number;
  email: string;
  name: string;
  picture: string;
  auth_provider: string;
};

type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: () => {},
  logout: () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const validateToken = useCallback(async (t: string) => {
    try {
      const res = await fetch("/auth/me", {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setToken(t);
      } else {
        localStorage.removeItem("auth_token");
        setUser(null);
        setToken(null);
      }
    } catch {
      localStorage.removeItem("auth_token");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    if (urlToken) {
      localStorage.setItem("auth_token", urlToken);
      window.history.replaceState({}, document.title, window.location.pathname);
      validateToken(urlToken);
      return;
    }
    const stored = localStorage.getItem("auth_token");
    if (stored) {
      validateToken(stored);
    } else {
      setLoading(false);
    }
  }, [validateToken]);

  function login(t: string, u: AuthUser) {
    localStorage.setItem("auth_token", t);
    setToken(t);
    setUser(u);
  }

  function logout() {
    localStorage.removeItem("auth_token");
    setUser(null);
    setToken(null);
    fetch("/auth/logout", { method: "POST" }).catch(() => {});
  }

  async function refreshUser() {
    const t = token || localStorage.getItem("auth_token");
    if (t) await validateToken(t);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
