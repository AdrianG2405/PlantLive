import { AlertTriangle, LogIn, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/authStore";
import { userDataApi } from "../services/plantliveApi";

const contact = import.meta.env.VITE_CONTACT_EMAIL || "plantlivesupport@gmail.com";

export function DeleteAccountPage({ notify }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ password: "", confirmation: "" });
  const [deleting, setDeleting] = useState(false);

  const removeAccount = async (event) => {
    event.preventDefault();
    if (form.confirmation !== "ELIMINAR") return notify("Escribe ELIMINAR para confirmar.");
    setDeleting(true);
    try {
      await userDataApi.deleteAccount(form.password, form.confirmation);
      localStorage.removeItem("plantlive-token");
      window.location.assign("/?cuenta-eliminada=1");
    } catch (error) {
      notify(error.message);
      setDeleting(false);
    }
  };

  return <section className="section deletion-page"><span className="deletion-icon"><Trash2 size={32} /></span><span className="kicker">CONTROL DE TUS DATOS</span><h1>Eliminar una cuenta de PlantLive</h1><p className="deletion-lead">Desde esta página puedes solicitar y completar la eliminación definitiva de tu cuenta aunque ya no tengas instalada la aplicación.</p><div className="deletion-information"><ShieldCheck size={24} /><div><h2>Datos que se eliminarán</h2><p>La cuenta, sesiones, plantas guardadas, fotografías, diagnósticos, tareas, historial de cuidados, preferencias y suscripciones de notificaciones asociadas.</p></div></div>{!user ? <div className="deletion-login"><h2>Confirma que la cuenta es tuya</h2><p>Inicia sesión con la cuenta que deseas eliminar. Al terminar volverás directamente a esta página.</p><Link className="primary" to="/acceso" state={{ from: "/eliminar-cuenta" }}><LogIn size={17} /> Iniciar sesión para continuar</Link><p className="deletion-help">Si no recuerdas la contraseña, utiliza «He olvidado mi contraseña» en la pantalla de acceso. También puedes solicitar ayuda escribiendo a <a href={`mailto:${contact}?subject=Solicitud%20de%20eliminación%20de%20cuenta%20PlantLive`}>{contact}</a>.</p></div> : <div className="deletion-confirm"><div className="deletion-warning"><AlertTriangle size={22} /><p>Vas a eliminar la cuenta de <b>{user.email}</b>. Esta acción es definitiva y no se puede deshacer.</p></div><form onSubmit={removeAccount}><label>Contraseña actual<input required type="password" name="password" autoComplete="current-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label><label>Escribe ELIMINAR para confirmar<input required autoComplete="off" value={form.confirmation} onChange={(event) => setForm({ ...form, confirmation: event.target.value })} /></label><button className="danger" disabled={deleting || form.confirmation !== "ELIMINAR"}><Trash2 size={17} /> {deleting ? "Eliminando cuenta…" : "Eliminar mi cuenta definitivamente"}</button></form></div>}<p className="deletion-policy">Consulta cómo tratamos las solicitudes de supresión en nuestra <Link to="/privacidad">política de privacidad</Link>.</p></section>;
}
