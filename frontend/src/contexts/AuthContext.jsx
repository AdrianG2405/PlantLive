import { useCallback, useEffect, useState } from "react";
import { authApi } from "../services/plantliveApi";
import { AuthContext } from "./authStore";

const readToken = () => {
  try { return localStorage.getItem("plantlive-token"); } catch { return null; }
};
const saveToken = (token) => {
  try { localStorage.setItem("plantlive-token", token); } catch { /* Storage may be unavailable in private mode. */ }
};
const clearToken = () => {
  try { localStorage.removeItem("plantlive-token"); } catch { /* Nothing else to clear. */ }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(readToken()));

  useEffect(() => {
    if (!readToken()) return;
    authApi.me().then(setUser).catch(clearToken).finally(() => setLoading(false));
  }, []);

  const authenticate = async (mode, values) => {
    const data = await authApi[mode](values);
    saveToken(data.token);
    setUser(data.user);
  };
  const logout = async () => {
    try { await authApi.logout(); } catch { /* La sesión puede haber sido revocada en otro dispositivo. */ } finally {
      clearToken();
      setUser(null);
    }
  };
  const refreshUser = useCallback(async () => {
    const current = await authApi.me();
    setUser(current);
    return current;
  }, []);
  return <AuthContext.Provider value={{ user, loading, authenticate, logout, refreshUser }}>{children}</AuthContext.Provider>;
}
