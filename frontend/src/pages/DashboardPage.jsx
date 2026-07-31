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
  const upcoming = data.upcoming || [];
  const schedule = [...data.due, ...upcoming].slice(0, 8);
  const summary = data.due.length
    ? `Tienes ${data.due.length} cuidados para revisar ahora.`
    : upcoming.length ? `Tu próximo cuidado es el ${formatDate(upcoming[0].date)}.` : "Todo está al día. Buen trabajo.";
  return <><section className="dashboard-hero"><span className="kicker">TU JARDÍN HOY</span><h1>Hola, {user.name.split(" ")[0]}.</h1><p>{summary}</p><div className="dashboard-actions"><Link className="primary" to="/diagnostico"><Camera size={18} /> Analizar una planta</Link><Link to="/plantas">Ver mi colección</Link></div></section>
    <section className="section dashboard-page"><div className="stat-grid"><Stat icon={<Leaf />} value={data.plantCount} label="Plantas" /><Stat icon={<Stethoscope />} value={data.diagnosisCount} label="Diagnósticos" /><Stat icon={<Activity />} value={data.careCount} label="Cuidados realizados" /></div>
      <div className="dashboard-block"><div><span className="kicker">TU AGENDA</span><h2>Cuidados pendientes y próximos</h2></div>{schedule.length ? <div className="due-grid">{schedule.map((item, index) => <article key={`${item.plantId}-${item.date}-${index}`}><CalendarDays size={20} /><div><b>{item.type}: {item.plant}</b><small>{dateStatus(item.date)}</small></div></article>)}</div> : <div className="empty small">No tienes cuidados programados todavía.</div>}</div>
    </section></>;
}
function Stat({ icon, value, label }) { return <article className="stat-card"><span>{icon}</span><b>{value}</b><small>{label}</small></article>; }

function formatDate(value) {
  return new Date(`${value}T12:00`).toLocaleDateString("es-ES", { day: "numeric", month: "long" });
}

function dateStatus(value) {
  const today = new Date().toISOString().slice(0, 10);
  if (value < today) return `Atrasado desde el ${formatDate(value)}`;
  if (value === today) return "Para hoy";
  return `Próximo: ${formatDate(value)}`;
}
