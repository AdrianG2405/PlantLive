import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/authStore";

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="route-loading"><span className="spinner dark-spinner" /> Cargando tu jardín…</div>;
  return user ? children : <Navigate to="/acceso" state={{ from: location.pathname }} replace />;
}
