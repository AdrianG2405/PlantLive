import { useEffect, useState } from "react";
import { Bell, Brain, Clock, Save, ShieldCheck } from "lucide-react";
import { userDataApi } from "../services/plantliveApi";

export function SettingsPage({ notify }) {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { userDataApi.settings().then(setSettings).catch((error) => notify(error.message)); }, [notify]);
  if (!settings) return <div className="route-loading">Cargando ajustes…</div>;
  const save = async () => {
    setSaving(true);
    try { setSettings(await userDataApi.updateSettings(settings)); notify("Preferencias guardadas."); }
    catch (error) { notify(error.message); }
    finally { setSaving(false); }
  };
  return <><section className="page-banner"><span className="kicker">TU CUENTA</span><h1>Ajustes y privacidad</h1><p>Decide cómo y cuándo quieres que PlantLive te ayude.</p></section>
    <section className="section settings-page"><div className="settings-card"><h2><Bell size={21} /> Recordatorios</h2>
      <label>Zona horaria<select value={settings.timezone} onChange={(event) => setSettings({ ...settings, timezone: event.target.value })}><option>Europe/Madrid</option><option>Europe/London</option><option>America/New_York</option><option>America/Mexico_City</option><option>America/Argentina/Buenos_Aires</option></select></label>
      <label>Hora preferida<div className="setting-inline"><Clock size={17} /><input type="number" min="0" max="23" value={settings.reminderHour} onChange={(event) => setSettings({ ...settings, reminderHour: Number(event.target.value) })} />:00</div></label>
      <Toggle label="Notificaciones push" checked={settings.pushNotifications} onChange={(value) => setSettings({ ...settings, pushNotifications: value })} />
      <Toggle label="Notificaciones por email" checked={settings.emailNotifications} onChange={(value) => setSettings({ ...settings, emailNotifications: value })} />
    </div>
    <div className="settings-card"><h2><Brain size={21} /> Inteligencia artificial</h2><div className="consent-copy"><ShieldCheck size={24} /><p>El modo avanzado envía la fotografía a Plant.id y Gemini. Actívalo solo si aceptas el procesamiento por estos proveedores.</p></div>
      <Toggle label="Acepto el análisis mediante servicios externos" checked={settings.aiConsent} onChange={(value) => setSettings({ ...settings, aiConsent: value })} />
    </div>
    <button className="primary settings-save" onClick={save} disabled={saving}><Save size={18} /> {saving ? "Guardando…" : "Guardar preferencias"}</button></section>
  </>;
}

function Toggle({ label, checked, onChange }) {
  return <label className="toggle-row"><span>{label}</span><button type="button" role="switch" aria-checked={checked} className={checked ? "toggle active" : "toggle"} onClick={() => onChange(!checked)}><span /></button></label>;
}
