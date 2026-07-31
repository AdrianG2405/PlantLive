import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authApi } from "../services/plantliveApi";

export function ResetPasswordPage({ notify }) {
  const [params] = useSearchParams();
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const submit = async (event) => {
    event.preventDefault();
    if (password !== repeat) return notify("Las contraseñas no coinciden.");
    setLoading(true);
    try {
      const result = await authApi.resetPassword(params.get("token") || "", password);
      notify(result.message);
      navigate("/acceso", { replace: true });
    } catch (error) { notify(error.message); }
    finally { setLoading(false); }
  };
  return <section className="auth-page"><div className="auth-art"><span><KeyRound size={30} /></span><h1>Vuelve a<br />tu jardín.</h1><p>Crea una contraseña nueva y recupera tus plantas, diagnósticos y recordatorios.</p></div><div className="auth-panel"><div className="auth-card"><span className="kicker">RECUPERAR ACCESO</span><h2>Nueva contraseña</h2><p>Utiliza al menos diez caracteres, mayúscula, minúscula y número.</p><form onSubmit={submit}><label>Nueva contraseña<input required minLength="10" type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label><label>Repetir contraseña<input required minLength="10" type="password" value={repeat} onChange={(event) => setRepeat(event.target.value)} /></label><button className="primary auth-submit" disabled={loading}>{loading ? <span className="spinner" /> : <KeyRound size={18} />} {loading ? "Actualizando…" : "Guardar contraseña"}</button></form><Link className="auth-switch" to="/acceso">Volver al inicio de sesión</Link></div></div></section>;
}
