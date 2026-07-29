import { useState } from "react";
import { Eye, EyeOff, Leaf, LogIn, UserPlus } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/authStore";
import { authApi } from "../services/plantliveApi";

export function AuthPage({ notify }) {
  const { user, authenticate } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  if (user) return <Navigate to="/plantas" replace />;
  const submit = async (event) => {
    event.preventDefault(); setLoading(true);
    try {
      if (mode === "forgot") {
        await authApi.forgotPassword(form.email);
        setRecoverySent(true);
        notify("Si la cuenta existe, recibirás instrucciones de recuperación.");
        return;
      }
      await authenticate(mode, form);
      notify(mode === "login" ? "Bienvenido de nuevo." : "Tu cuenta está lista.");
      navigate(location.state?.from || "/plantas", { replace: true });
    } catch (error) { notify(error.message); }
    finally { setLoading(false); }
  };
  return <section className="auth-page"><div className="auth-art"><span><Leaf size={30} /></span><h1>Tu jardín,<br />siempre contigo.</h1><p>Guarda plantas, diagnósticos y recordatorios en una cuenta personal.</p></div>
    <div className="auth-panel"><div className="auth-card"><span className="kicker">{mode === "login" ? "BIENVENIDO" : mode === "forgot" ? "RECUPERAR ACCESO" : "EMPIEZA TU JARDÍN"}</span><h2>{mode === "login" ? "Iniciar sesión" : mode === "forgot" ? "¿Olvidaste la contraseña?" : "Crear una cuenta"}</h2>
      <p>{mode === "login" ? "Accede a tus plantas y cuidados." : mode === "forgot" ? "Escribe tu email y te enviaremos los pasos para volver a entrar." : "Tus plantas quedarán guardadas en tu perfil."}</p>
      <form onSubmit={submit}>{mode === "register" && <label>Nombre<input required minLength="2" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Tu nombre" /></label>}
        <label>Email<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="nombre@email.com" /></label>
        {mode !== "forgot" && <label>Contraseña<div className="password-field"><input required minLength="8" type={showPassword ? "text" : "password"} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Mínimo 8 caracteres" /><button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>}
        <button className="primary auth-submit" disabled={loading || recoverySent}>{loading ? <span className="spinner" /> : mode === "login" ? <LogIn size={18} /> : <UserPlus size={18} />}{loading ? "Procesando…" : recoverySent ? "Solicitud enviada" : mode === "login" ? "Entrar" : mode === "forgot" ? "Recuperar acceso" : "Crear cuenta"}</button>
      </form>
      {mode === "login" && <button className="auth-switch" onClick={() => { setMode("forgot"); setRecoverySent(false); }}>He olvidado mi contraseña</button>}
      <button className="auth-switch" onClick={() => { setMode(mode === "login" ? "register" : "login"); setRecoverySent(false); }}>{mode === "login" ? "¿No tienes cuenta? Crear una" : "Volver a iniciar sesión"}</button>
    </div></div>
  </section>;
}
