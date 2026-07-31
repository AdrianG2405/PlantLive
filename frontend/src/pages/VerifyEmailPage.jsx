import { useEffect, useState } from "react";
import { CheckCircle2, MailCheck } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { authApi } from "../services/plantliveApi";
import { useAuth } from "../contexts/authStore";

export function VerifyEmailPage() {
  const { refreshUser } = useAuth();
  const [params] = useSearchParams();
  const [state, setState] = useState({ loading: true, error: "" });
  useEffect(() => {
    const token = params.get("token");
    if (!token) { setState({ loading: false, error: "Falta el código de verificación." }); return; }
    authApi.verifyEmail(token)
      .then(() => refreshUser().catch(() => null))
      .then(() => setState({ loading: false, error: "" }))
      .catch((error) => setState({ loading: false, error: error.message }));
  }, [params, refreshUser]);
  return <section className="section verification-page">
    {state.loading ? <><span className="spinner dark-spinner" /><h1>Verificando tu correo…</h1></> : state.error ? <><MailCheck size={42} /><h1>No pudimos verificarlo</h1><p>{state.error}</p><Link className="primary" to="/ajustes">Solicitar otro enlace</Link></> : <><CheckCircle2 size={48} /><h1>Correo verificado</h1><p>Tu cuenta está protegida y ya puedes utilizar todas las funciones de PlantLive.</p><Link className="primary" to="/plantas">Ir a Mis plantas</Link></>}
  </section>;
}
