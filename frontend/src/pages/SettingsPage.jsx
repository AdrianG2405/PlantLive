import { useEffect, useState } from "react";
import { Bell, Brain, Clock, Download, KeyRound, LogOut, Save, ShieldCheck, Trash2 } from "lucide-react";
import { authApi, userDataApi } from "../services/plantliveApi";
import { useAuth } from "../contexts/authStore";

export function SettingsPage({ notify }) {
  const { logout } = useAuth();
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [passwords, setPasswords] = useState({ current: "", next: "" });
  const [deletion, setDeletion] = useState({ password: "", confirmation: "" });
  useEffect(() => { userDataApi.settings().then(setSettings).catch((error) => notify(error.message)); }, [notify]);
  if (!settings) return <div className="route-loading">Cargando ajustes…</div>;
  const save = async () => {
    setSaving(true);
    try { setSettings(await userDataApi.updateSettings(settings)); notify("Preferencias guardadas."); }
    catch (error) { notify(error.message); }
    finally { setSaving(false); }
  };
  const changePassword = async (event) => {
    event.preventDefault();
    try {
      await authApi.changePassword(passwords.current, passwords.next);
      notify("Contraseña actualizada. Inicia sesión de nuevo.");
      await logout();
    } catch (error) { notify(error.message); }
  };
  const exportData = async () => {
    try {
      const data = await userDataApi.exportData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url; link.download = `plantlive-datos-${new Date().toISOString().slice(0, 10)}.json`; link.click();
      URL.revokeObjectURL(url);
      notify("Copia de tus datos descargada.");
    } catch (error) { notify(error.message); }
  };
  const logoutEverywhere = async () => {
    try { await authApi.logoutAll(); } finally { await logout(); }
  };
  const deleteAccount = async (event) => {
    event.preventDefault();
    if (deletion.confirmation !== "ELIMINAR") return notify("Escribe ELIMINAR para confirmar.");
    try {
      await userDataApi.deleteAccount(deletion.password, deletion.confirmation);
      localStorage.removeItem("plantlive-token");
      window.location.assign("/");
    } catch (error) { notify(error.message); }
  };
  return <><section className="page-banner"><span className="kicker">TU CUENTA</span><h1>Ajustes y privacidad</h1><p>Decide cómo y cuándo quieres que PlantLive te ayude.</p></section>
    <section className="section settings-page"><div className="settings-card"><h2><Bell size={21} /> Recordatorios</h2>
      <label>Zona horaria<select value={settings.timezone} onChange={(event) => setSettings({ ...settings, timezone: event.target.value })}><option>Europe/Madrid</option><option>Europe/London</option><option>America/New_York</option><option>America/Mexico_City</option><option>America/Argentina/Buenos_Aires</option></select></label>
      <label>Hora preferida<div className="setting-inline"><Clock size={17} /><input type="number" min="0" max="23" value={settings.reminderHour} onChange={(event) => setSettings({ ...settings, reminderHour: Number(event.target.value) })} />:00</div></label>
      <Toggle label="Notificaciones emergentes" checked={settings.pushNotifications} onChange={(value) => setSettings({ ...settings, pushNotifications: value })} />
      <Toggle label="Notificaciones por correo electrónico" checked={settings.emailNotifications} onChange={(value) => setSettings({ ...settings, emailNotifications: value })} />
    </div>
    <div className="settings-card"><h2><Brain size={21} /> Inteligencia artificial</h2><div className="consent-copy"><ShieldCheck size={24} /><p>El modo avanzado envía la fotografía a proveedores tecnológicos especializados. Actívalo solo si aceptas este procesamiento externo; encontrarás el detalle en la política de privacidad.</p></div>
      <Toggle label="Acepto el análisis mediante servicios externos" checked={settings.aiConsent} onChange={(value) => setSettings({ ...settings, aiConsent: value })} />
    </div>
    <button className="primary settings-save" onClick={save} disabled={saving}><Save size={18} /> {saving ? "Guardando…" : "Guardar preferencias"}</button>
    <div className="settings-card account-security"><h2><KeyRound size={21} /> Seguridad de la cuenta</h2>
      <form onSubmit={changePassword}><label>Contraseña actual<input type="password" required value={passwords.current} onChange={(event) => setPasswords({ ...passwords, current: event.target.value })} /></label><label>Nueva contraseña<input type="password" required minLength="10" value={passwords.next} onChange={(event) => setPasswords({ ...passwords, next: event.target.value })} placeholder="10 caracteres, mayúscula, minúscula y número" /></label><button className="primary">Cambiar contraseña</button></form>
      <button className="secondary-action" onClick={logoutEverywhere}><LogOut size={17} /> Cerrar todas las sesiones</button>
    </div>
    <div className="settings-card"><h2><Download size={21} /> Tus datos</h2><p>Descarga una copia en formato JSON con tus plantas, cuidados, tareas y diagnósticos.</p><button className="secondary-action" onClick={exportData}><Download size={17} /> Descargar mis datos</button></div>
    <div className="settings-card danger-zone"><h2><Trash2 size={21} /> Eliminar cuenta</h2><p>Esta acción elimina definitivamente tu cuenta, plantas, fotografías, diagnósticos, tareas y sesiones.</p><form onSubmit={deleteAccount}><label>Contraseña<input type="password" required value={deletion.password} onChange={(event) => setDeletion({ ...deletion, password: event.target.value })} /></label><label>Escribe ELIMINAR<input required value={deletion.confirmation} onChange={(event) => setDeletion({ ...deletion, confirmation: event.target.value })} /></label><button className="danger" disabled={deletion.confirmation !== "ELIMINAR"}>Eliminar mi cuenta definitivamente</button></form></div>
    </section>
  </>;
}

function Toggle({ label, checked, onChange }) {
  return <label className="toggle-row"><span>{label}</span><button type="button" role="switch" aria-checked={checked} className={checked ? "toggle active" : "toggle"} onClick={() => onChange(!checked)}><span /></button></label>;
}
