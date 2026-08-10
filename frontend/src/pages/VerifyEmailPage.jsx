import { useEffect, useState } from "react";
import { CheckCircle2, Leaf } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/authStore";
import { authApi } from "../services/plantliveApi";

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const { acceptAuthentication } = useAuth();
  const [state, setState] = useState("loading");
  useEffect(() => {
    const token = params.get("token");
    if (!token) { setState("error"); return; }
    authApi.verifyEmail(token).then((data) => { acceptAuthentication(data); setState("done"); }).catch(() => setState("error"));
  }, [params, acceptAuthentication]);
  return <section className="verification-page section">{state === "done" ? <CheckCircle2 size={52} /> : <Leaf size={52} />}<h1>{state === "loading" ? "Verificando tu correo…" : state === "done" ? "Correo verificado" : "Enlace no válido"}</h1><p>{state === "done" ? "Tu cuenta ya está activa y tu jardín te espera." : state === "error" ? "El enlace puede haber caducado. Inicia sesión para solicitar uno nuevo." : "Solo tardaremos un momento."}</p>{state !== "loading" && <Link className="primary" to={state === "done" ? "/plantas" : "/acceso"}>{state === "done" ? "Ir a Mis plantas" : "Volver al acceso"}</Link>}</section>;
}
