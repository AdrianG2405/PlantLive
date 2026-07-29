import { useEffect, useState } from "react";
import { authApi } from "../services/plantliveApi";
import { AuthContext } from "./authStore";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem("plantlive-token")));

  useEffect(() => {
    if (!localStorage.getItem("plantlive-token")) return;
    authApi.me().then(setUser).catch(() => localStorage.removeItem("plantlive-token")).finally(() => setLoading(false));
  }, []);

  const authenticate = async (mode, values) => {
    const data = await authApi[mode](values);
    localStorage.setItem("plantlive-token", data.token);
    setUser(data.user);
  };
  const logout = async () => {
    try { await authApi.logout(); } finally {
      localStorage.removeItem("plantlive-token");
      setUser(null);
    }
  };
  return <AuthContext.Provider value={{ user, loading, authenticate, logout }}>{children}</AuthContext.Provider>;
}
