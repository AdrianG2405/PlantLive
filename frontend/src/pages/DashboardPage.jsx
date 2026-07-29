import { useEffect, useState } from "react";
import { Activity, CalendarDays, Camera, Leaf, Stethoscope } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/authStore";
import { userDataApi } from "../services/plantliveApi";

export function DashboardPage({ notify }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  useEffect(() => { userDataApi.dashboard().then(setData).catch((error) => notify(error.message)); }, [notify]);
  if (!data) return <div className="route-loading">Preparando tu resumen…</div>;
  return <><section className="dashboard-hero"><span className="kicker">TU JARDÍN HOY</span><h1>Hola, {user.name.split(" ")[0]}.</h1><p>{data.due.length ? `Tienes ${data.due.length} cuidados pendientes.` : "Todo está al día. Buen trabajo."}</p><div className="dashboard-actions"><Link className="primary" to="/diagnostico"><Camera size={18} /> Analizar una planta</Link><Link to="/plantas">Ver mi colección</Link></div></section>
    <section className="section dashboard-page"><div className="stat-grid"><Stat icon={<Leaf />} value={data.plantCount} label="Plantas" /><Stat icon={<Stethoscope />} value={data.diagnosisCount} label="Diagnósticos" /><Stat icon={<Activity />} value={data.careCount} label="Cuidados realizados" /></div>
      <div className="dashboard-block"><div><span className="kicker">PRIORIDAD</span><h2>Cuidados pendientes</h2></div>{data.due.length ? <div className="due-grid">{data.due.map((item, index) => <article key={`${item.plantId}-${index}`}><CalendarDays size={20} /><div><b>{item.type}: {item.plant}</b><small>Previsto para {item.date}</small></div></article>)}</div> : <div className="empty small">No tienes tareas vencidas.</div>}</div>
    </section></>;
}
function Stat({ icon, value, label }) { return <article className="stat-card"><span>{icon}</span><b>{value}</b><small>{label}</small></article>; }
