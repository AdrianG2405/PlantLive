import { useState } from "react";
import { Eye, EyeOff, Leaf, LogIn, UserPlus } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/authStore";
import { authApi } from "../services/plantliveApi";
import { trackEvent } from "../utils/analytics";

export function AuthPage({ notify }) {
  const { user, authenticate } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", acceptLegal: false });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const location = useLocation();
  if (user) return <Navigate to="/plantas" replace />;
  const validate = () => {
    const next = {};
    if (mode === "register" && form.name.trim().length < 2) next.name = "Escribe al menos 2 caracteres.";
    const emailPattern = mode === "register" ? /^[^\s@]+@[^\s@]+\.com$/i : /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
    if (!emailPattern.test(form.email.trim())) next.email = mode === "register" ? "Usa un correo válido terminado en .com, por ejemplo nombre@gmail.com." : "Escribe un correo válido.";
    if (mode !== "forgot" && form.password.length < 8) next.password = "Usa al menos 8 caracteres. No exigimos mayúsculas, números ni símbolos.";
    if (mode === "register" && !form.acceptLegal) next.acceptLegal = "Debes aceptar la privacidad y las condiciones para crear la cuenta.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };
  const submit = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (mode === "forgot") {
        await authApi.forgotPassword(form.email);
        setRecoverySent(true);
        notify("Si la cuenta existe, recibirás instrucciones de recuperación.");
        return;
      }
      const result = await authenticate(mode, form);
      if (mode === "register" && result?.verificationRequired) {
        trackEvent("sign_up", { method: "email" });
        setVerificationEmail(result.email);
        notify(result.emailSent ? "Te hemos enviado un enlace de verificación." : "Cuenta creada. Configura el envío de correo para recibir el enlace.");
        return;
      }
      if (mode === "login") trackEvent("login", { method: "email" });
      notify(mode === "login" ? "Bienvenido de nuevo." : "Tu cuenta está lista.");
      navigate(location.state?.from || "/plantas", { replace: true });
    } catch (error) { notify(error.message); }
    finally { setLoading(false); }
  };
  if (verificationEmail) return <section className="verification-page section"><Leaf size={48} /><h1>Revisa tu correo</h1><p>Hemos enviado un enlace a <b>{verificationEmail}</b>. Ábrelo para activar tu cuenta antes de iniciar sesión.</p><button className="primary" onClick={async () => { await authApi.resendVerification(verificationEmail); notify("Si la cuenta sigue pendiente, recibirás un nuevo enlace."); }}>Reenviar correo</button></section>;
  return <section className="auth-page"><div className="auth-art"><span><Leaf size={30} /></span><h1>Tu jardín,<br />siempre contigo.</h1><p>Guarda plantas, diagnósticos y recordatorios en una cuenta personal.</p></div>
    <div className="auth-panel"><div className="auth-card"><span className="kicker">{mode === "login" ? "BIENVENIDO" : mode === "forgot" ? "RECUPERAR ACCESO" : "EMPIEZA TU JARDÍN"}</span><h2>{mode === "login" ? "Iniciar sesión" : mode === "forgot" ? "¿Olvidaste la contraseña?" : "Crear una cuenta"}</h2>
      <p>{mode === "login" ? "Accede a tus plantas y cuidados." : mode === "forgot" ? "Escribe tu email y te enviaremos los pasos para volver a entrar." : "Tus plantas quedarán guardadas en tu perfil."}</p>
      <form onSubmit={submit} noValidate>{mode === "register" && <label className={errors.name ? "field-invalid" : ""}>Nombre<input required minLength="2" value={form.name} onChange={(event) => { setForm({ ...form, name: event.target.value }); setErrors({ ...errors, name: "" }); }} placeholder="Tu nombre" aria-invalid={Boolean(errors.name)} />{errors.name && <small className="field-error">{errors.name}</small>}</label>}
        <label className={errors.email ? "field-invalid" : ""}>Email<input required type="email" value={form.email} onChange={(event) => { setForm({ ...form, email: event.target.value }); setErrors({ ...errors, email: "" }); }} placeholder="nombre@gmail.com" aria-invalid={Boolean(errors.email)} />{mode === "register" && !errors.email && <small className="field-help">Debe terminar en .com para reducir errores antes de enviar la verificación.</small>}{errors.email && <small className="field-error">{errors.email}</small>}</label>
        {mode !== "forgot" && <label className={errors.password ? "field-invalid" : ""}>Contraseña<div className="password-field"><input required minLength="8" type={showPassword ? "text" : "password"} value={form.password} onChange={(event) => { setForm({ ...form, password: event.target.value }); setErrors({ ...errors, password: "" }); }} placeholder={mode === "register" ? "Elige tu contraseña" : "Tu contraseña"} aria-invalid={Boolean(errors.password)} /><button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{mode === "register" && !errors.password && <small className="field-help">Como mínimo 8 caracteres; el contenido lo eliges tú.</small>}{errors.password && <small className="field-error">{errors.password}</small>}</label>}
        {mode === "register" && <><label className={`legal-check ${errors.acceptLegal ? "field-invalid" : ""}`}><input required type="checkbox" checked={form.acceptLegal} onChange={(event) => { setForm({ ...form, acceptLegal: event.target.checked }); setErrors({ ...errors, acceptLegal: "" }); }} /><span>Acepto la <a href="/privacidad" target="_blank">política de privacidad</a> y las <a href="/condiciones" target="_blank">condiciones de uso</a>.</span></label>{errors.acceptLegal && <small className="field-error legal-field-error">{errors.acceptLegal}</small>}</>}
        <button className="primary auth-submit" disabled={loading || recoverySent}>{loading ? <span className="spinner" /> : mode === "login" ? <LogIn size={18} /> : <UserPlus size={18} />}{loading ? "Procesando…" : recoverySent ? "Solicitud enviada" : mode === "login" ? "Entrar" : mode === "forgot" ? "Recuperar acceso" : "Crear cuenta"}</button>
      </form>
      {mode === "login" && <button className="auth-switch" onClick={() => { setMode("forgot"); setRecoverySent(false); }}>He olvidado mi contraseña</button>}
      <button className="auth-switch" onClick={() => { setMode(mode === "login" ? "register" : "login"); setRecoverySent(false); setErrors({}); }}>{mode === "login" ? "¿No tienes cuenta? Crear una" : "Volver a iniciar sesión"}</button>
    </div></div>
  </section>;
}
