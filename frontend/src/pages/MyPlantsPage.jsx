import { useMemo, useState } from "react";
import { Bell, BellRing, CalendarDays, Check, Droplets, Leaf, Plus, Search, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { PlantModal } from "../components/PlantModal";

export function MyPlantsPage({
  plants, upcoming, updatePlant, refreshPlantCare, removePlant, markDone,
  notifications, notify, loadingPlants, authenticated,
}) {
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("");
  const navigate = useNavigate();
  const visiblePlants = useMemo(() => {
    const term = filter.toLowerCase().trim();
    return term ? plants.filter((plant) =>
      `${plant.nickname} ${plant.nombreComun} ${plant.nombreCientifico}`.toLowerCase().includes(term)
    ) : plants;
  }, [plants, filter]);
  const dueNow = upcoming.filter((item) => item.date <= new Date().toISOString().slice(0, 10)).length;

  const activateNotifications = async () => {
    if (!authenticated) {
      notify("Inicia sesión para guardar plantas y activar recordatorios.");
      navigate("/acceso", { state: { from: "/plantas" } });
      return;
    }
    const result = await notifications.requestPermission();
    notify(result === "granted" ? "Notificaciones activadas." : "El navegador no permitió las notificaciones.");
  };

  return <div className="garden-page">
    <section className="garden-hero">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <span className="eyebrow"><Sparkles size={14} /> TU JARDÍN PERSONAL</span>
        <h1>Un hogar para cada <em>planta.</em></h1>
        <p>Reúne tu colección, registra sus cuidados y descubre qué necesita cada ejemplar en el momento adecuado.</p>
        <div className="garden-hero-actions">
          <Link className="primary" to={authenticated ? "/#buscar" : "/acceso"} state={authenticated ? undefined : { from: "/" }}><Plus size={18} /> Añadir una planta</Link>
          <Link to="/calendario"><CalendarDays size={17} /> Ver calendario</Link>
        </div>
      </motion.div>
      <div className="garden-hero-art" aria-hidden="true"><div className="garden-leaf-main"><Leaf size={76} /></div><span className="garden-bubble one">💧 <b>Riego</b></span><span className="garden-bubble two">🌱 <b>Creciendo</b></span><span className="garden-bubble three">☀️ <b>Buena luz</b></span></div>
    </section>

    <section className="garden-overview">
      <article><span><Leaf size={20} /></span><div><b>{plants.length}</b><small>Plantas guardadas</small></div></article>
      <article><span><Droplets size={20} /></span><div><b>{dueNow}</b><small>Cuidados pendientes</small></div></article>
      <article><span><CalendarDays size={20} /></span><div><b>{upcoming.length}</b><small>Próximos eventos</small></div></article>
    </section>

    <section className="section garden-collection">
      <div className="garden-toolbar"><div><span className="kicker">MI COLECCIÓN</span><h2>Todas mis plantas <sup>{plants.length}</sup></h2></div><div className="garden-tools">
        {!!plants.length && <label className="garden-search"><Search size={17} /><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Buscar en mi jardín" /></label>}
        {authenticated && notifications.permission === "granted" ? <span className="notifications-on"><BellRing size={16} /> Avisos activos</span> : <button className="notification-button" onClick={activateNotifications}><Bell size={17} /> Activar avisos</button>}
      </div></div>

      {loadingPlants ? <div className="route-loading"><span className="spinner dark-spinner" /> Cargando tu jardín…</div> :
        visiblePlants.length ? <div className="modern-garden-grid">{visiblePlants.map((plant, index) => <motion.button className="modern-plant-card" key={plant.instanceId} onClick={() => setSelected(plant)} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .04 }}>
          <div className="modern-plant-photo">{plant.imagen ? <img src={plant.imagen} alt={plant.nickname || plant.nombreComun} /> : <span><Leaf size={40} /> Sin fotografía</span>}<span className="plant-status"><i /> En seguimiento</span></div>
          <div className="modern-plant-info"><small>{plant.categoria || "MI PLANTA"}</small><h3>{plant.nickname || plant.nombreComun}</h3><i>{plant.nombreCientifico}</i><div><span><Droplets size={15} /> Próximo riego</span><b>{plant.nextWater ? new Date(`${plant.nextWater}T12:00`).toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : "Por definir"}</b></div></div>
        </motion.button>)}</div> :
        plants.length ? <div className="empty small">No hay plantas que coincidan con “{filter}”.</div> :
        <div className="garden-empty"><div className="empty-plant-visual"><Leaf size={56} /><span>+</span></div><span className="kicker">EMPIEZA TU COLECCIÓN</span><h3>{authenticated ? "Tu primer rincón verde te espera" : "Crea un jardín que recuerde por ti"}</h3><p>{authenticated ? "Busca una especie, añádela y PlantLive preparará su ficha y calendario de cuidados." : "Explora esta sección libremente. Inicia sesión cuando quieras guardar plantas y recibir recordatorios personalizados."}</p><Link className="primary big" to={authenticated ? "/#buscar" : "/acceso"} state={authenticated ? undefined : { from: "/" }}><Plus size={18} /> {authenticated ? "Buscar mi primera planta" : "Iniciar sesión para empezar"}</Link></div>}
    </section>

    <section className="garden-agenda-section"><div className="garden-agenda-copy"><span className="kicker light">PRÓXIMOS CUIDADOS</span><h2>Tu jardín,<br />al día.</h2><p>Las fechas son orientativas. Comprueba siempre el sustrato y observa la respuesta de la planta.</p><Link to="/calendario">Abrir calendario completo →</Link></div>
      <div className="modern-agenda">{upcoming.length ? upcoming.slice(0, 6).map((item) => <article key={item.id}><time><b>{new Date(`${item.date}T12:00`).toLocaleDateString("es-ES", { day: "2-digit" })}</b><small>{new Date(`${item.date}T12:00`).toLocaleDateString("es-ES", { month: "short" })}</small></time><span className="agenda-care-icon">{item.icon}</span><div><b>{item.action}</b><small>{item.plant}</small></div><button onClick={() => markDone(item)} title="Marcar como realizado"><Check size={17} /></button></article>) : <div className="agenda-empty"><CalendarDays size={30} /><p>Añade una planta para crear automáticamente sus próximos cuidados.</p></div>}</div>
    </section>

    {selected && <PlantModal plant={plants.find((plant) => plant.instanceId === selected.instanceId) || selected} onClose={() => setSelected(null)} onUpdate={updatePlant} onRefreshCare={refreshPlantCare} onRemove={removePlant} />}
  </div>;
}
