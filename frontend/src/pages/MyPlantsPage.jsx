import { useMemo, useState } from "react";
import { Bell, BellRing, CalendarDays, Camera, Check, Droplets, GitBranch, Heart, ImagePlus, Leaf, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { PlantModal } from "../components/PlantModal";
import { askPlantLive, searchPlants, userDataApi } from "../services/plantliveApi";

const preparePropagationPhoto = (file) => new Promise((resolve, reject) => {
  const image = new Image(), source = URL.createObjectURL(file);
  image.onload = () => {
    const scale = Math.min(1, 1100 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(source);
    canvas.toBlob((blob) => blob ? resolve({ blob, dataUrl: canvas.toDataURL("image/jpeg", .78) }) : reject(new Error("No se pudo preparar la foto.")), "image/jpeg", .78);
  };
  image.onerror = () => { URL.revokeObjectURL(source); reject(new Error("No se pudo leer la foto.")); };
  image.src = source;
});

export function MyPlantsPage({
  plants, upcoming, addPlant, updatePlant, refreshPlantCare, removePlant, markDone,
  notifications, notify, loadingPlants, authenticated, weatherSummary,
}) {
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("");
  const [collectionView, setCollectionView] = useState("active");
  const [wishQuery, setWishQuery] = useState("");
  const [wishResults, setWishResults] = useState([]);
  const [wishSearching, setWishSearching] = useState(false);
  const [savingWish, setSavingWish] = useState("");
  const [propagationForm, setPropagationForm] = useState({ name: "", species: "", startedAt: new Date().toISOString().slice(0, 10) });
  const [analyzingPropagation, setAnalyzingPropagation] = useState("");
  const navigate = useNavigate();
  const visiblePlants = useMemo(() => {
    const term = filter.toLowerCase().trim();
    const collection = plants.filter((plant) => collectionView === "wishlist" ? plant.collectionStatus === "wishlist" : collectionView === "propagation" ? plant.collectionStatus === "propagation" : !plant.collectionStatus || plant.collectionStatus === "active");
    return term ? collection.filter((plant) =>
      `${plant.nickname} ${plant.nombreComun} ${plant.nombreCientifico}`.toLowerCase().includes(term)
    ) : collection;
  }, [plants, filter, collectionView]);
  const activeCount = plants.filter((plant) => !plant.collectionStatus || plant.collectionStatus === "active").length;
  const wishCount = plants.filter((plant) => plant.collectionStatus === "wishlist").length;
  const propagationCount = plants.filter((plant) => plant.collectionStatus === "propagation").length;
  const dueNow = upcoming.filter((item) => item.date <= new Date().toISOString().slice(0, 10)).length;

  const activateNotifications = async () => {
    if (!authenticated) {
      notify("Inicia sesión para guardar plantas y activar recordatorios.");
      navigate("/acceso", { state: { from: "/plantas" } });
      return;
    }
    try {
      const result = await notifications.requestPermission();
      notify(result === "granted" ? "Notificaciones activadas y conectadas." : "No se pudo obtener permiso para las notificaciones.");
    } catch (error) {
      notify(error.message || "No se pudieron activar las notificaciones.");
    }
  };
  const searchWishlist = async (event) => {
    event.preventDefault();
    if (wishQuery.trim().length < 2) return;
    setWishSearching(true); setWishResults([]);
    try { setWishResults((await searchPlants(wishQuery)).slice(0, 12)); }
    catch (error) { notify(error.message); }
    finally { setWishSearching(false); }
  };
  const saveWish = async (plant) => {
    if (plants.some((item) => item.nombreCientifico === plant.nombreCientifico && item.collectionStatus === "wishlist")) return notify("Esta planta ya está en tu lista de deseos.");
    setSavingWish(plant.id);
    try { await addPlant({ ...plant, collectionStatus: "wishlist" }); notify(`${plant.nombreComun} se ha añadido a tu lista de deseos.`); }
    catch (error) { notify(error.message); }
    finally { setSavingWish(""); }
  };
  const createPropagation = async (event) => {
    event.preventDefault();
    try {
      await addPlant({ nombreComun: propagationForm.name, nombreCientifico: propagationForm.species || propagationForm.name, categoria: "Esqueje en agua", collectionStatus: "propagation", propagationStartedAt: propagationForm.startedAt, propagationStatus: "enraizando", propagationEvolution: [] });
      setPropagationForm({ name: "", species: "", startedAt: new Date().toISOString().slice(0, 10) });
      notify("Esqueje añadido a Propagación.");
    } catch (error) { notify(error.message); }
  };
  const addPropagationPhoto = async (plant, event) => {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    setAnalyzingPropagation(plant.instanceId);
    try {
      const { blob, dataUrl } = await preparePropagationPhoto(file);
      const { url } = await userDataApi.uploadPhoto(new File([blob], "esqueje.jpg", { type: "image/jpeg" }));
      const result = await askPlantLive({ pregunta: `Analiza este esqueje en agua de ${plant.nombreCientifico}. Se inició el ${plant.propagationStartedAt}. Indica claramente si aún le falta tiempo para pasar a tierra, si parece listo, qué longitud y cantidad de raíces conviene esperar y cómo hacer la transición. No inventes detalles no visibles.`, planta: plant.nombreCientifico, imagen: dataUrl });
      const propagationEvolution = [...(plant.propagationEvolution || []), { id: globalThis.crypto?.randomUUID?.() || Date.now(), date: new Date().toISOString().slice(0, 10), url, analysis: result.respuesta }];
      updatePlant(plant.instanceId, { propagationEvolution, plantPhoto: url });
      notify("Progreso analizado y guardado.");
    } catch (error) { notify(error.message); }
    finally { setAnalyzingPropagation(""); }
  };

  return <div className="garden-page">
    <section className="garden-hero">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <span className="eyebrow"><Sparkles size={14} /> TU JARDÍN PERSONAL</span>
        <h1>Un hogar para cada <em>planta.</em></h1>
        <p>Reúne tu colección, registra sus cuidados y descubre qué necesita cada ejemplar en el momento adecuado.</p>
        <div className="garden-hero-actions">
          <Link className="primary" to={authenticated ? "/#buscar" : "/acceso"} state={authenticated ? undefined : { from: "/" }}><Search size={18} /> Buscar por nombre</Link>
          <Link className="garden-photo-action" to={authenticated ? "/diagnostico" : "/acceso"} state={authenticated ? undefined : { from: "/diagnostico" }}><Camera size={18} /> Identificar con una foto</Link>
          <Link to="/calendario"><CalendarDays size={17} /> Ver calendario</Link>
        </div>
      </motion.div>
      <div className="garden-hero-art" aria-hidden="true"><div className="garden-leaf-main"><Leaf size={76} /></div><span className="garden-bubble one">💧 <b>Riego</b></span><span className="garden-bubble two">🌱 <b>Creciendo</b></span><span className="garden-bubble three">☀️ <b>Buena luz</b></span></div>
    </section>

    <section className="garden-overview">
      <article><span><Leaf size={20} /></span><div><b>{activeCount}</b><small>Plantas en seguimiento</small></div></article>
      <article><span><Droplets size={20} /></span><div><b>{dueNow}</b><small>Cuidados pendientes</small></div></article>
      <article><span><CalendarDays size={20} /></span><div><b>{upcoming.length}</b><small>Próximos eventos</small></div></article>
    </section>

    {weatherSummary && <aside className="garden-weather"><span>☁️</span><div><b>Cuidados adaptados al clima</b><small>{weatherSummary.temperature} °C · {weatherSummary.precipitation} mm de lluvia. {weatherSummary.adjustment < 0 ? "Revisaremos antes por el calor." : weatherSummary.adjustment > 0 ? "Espaciaremos la revisión por frío o lluvia." : "No hace falta modificar el ritmo actual."}</small></div></aside>}
    <section className="section garden-collection">
      <div className="garden-view-tabs"><button className={collectionView === "active" ? "active" : ""} onClick={() => setCollectionView("active")}><Leaf size={16} /> Mi colección <b>{activeCount}</b></button><button className={collectionView === "propagation" ? "active" : ""} onClick={() => setCollectionView("propagation")}><GitBranch size={16} /> Propagación <b>{propagationCount}</b></button><button className={collectionView === "wishlist" ? "active" : ""} onClick={() => setCollectionView("wishlist")}><Heart size={16} /> Lista de deseos <b>{wishCount}</b></button></div>
      <div className="garden-toolbar"><div><span className="kicker">{collectionView === "active" ? "MI COLECCIÓN" : collectionView === "propagation" ? "ESQUEJES EN AGUA" : "PRÓXIMAS PLANTAS"}</span><h2>{collectionView === "active" ? "Todas mis plantas" : collectionView === "propagation" ? "Propagación" : "Lista de deseos"} <sup>{visiblePlants.length}</sup></h2></div><div className="garden-tools">
        {!!plants.length && <label className="garden-search"><Search size={17} /><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Buscar en mi jardín" /></label>}
        {authenticated && notifications.subscriptionStatus === "active" ? <span className="notifications-on"><BellRing size={16} /> Avisos activos</span> : <button className="notification-button" onClick={activateNotifications} disabled={notifications.subscriptionStatus === "syncing"}><Bell size={17} /> {notifications.subscriptionStatus === "syncing" ? "Conectando avisos…" : notifications.permission === "granted" ? "Reintentar avisos" : "Activar avisos"}</button>}
      </div></div>
      {collectionView === "wishlist" && <section className="wishlist-search-panel"><div><span className="kicker">AÑADIR UN DESEO</span><h3>¿Qué planta te gustaría tener?</h3><p>Busca por nombre común o científico y guárdala para más adelante.</p></div><form onSubmit={searchWishlist}><Search size={19} /><input value={wishQuery} onChange={(event) => setWishQuery(event.target.value)} placeholder="Ej. Pachira aquatica, monstera, calatea…" /><button disabled={wishSearching}>{wishSearching ? "Buscando…" : "Buscar"}</button></form>{wishSearching && <div className="route-loading wishlist-loading"><span className="spinner dark-spinner" /> Buscando plantas…</div>}{!!wishResults.length && <div className="wishlist-search-results">{wishResults.map((plant) => <article key={plant.id}><div className="wishlist-result-photo">{plant.imagen ? <img src={plant.imagen} alt={plant.nombreComun} /> : <Leaf size={30} />}</div><div><b>{plant.nombreComun}</b><i>{plant.nombreCientifico}</i></div><button onClick={() => saveWish(plant)} disabled={savingWish === plant.id}><Heart size={16} /> {savingWish === plant.id ? "Guardando…" : "Añadir"}</button></article>)}</div>}</section>}
      {collectionView === "propagation" && <section className="propagation-hub"><div className="propagation-intro"><span><GitBranch size={25} /></span><div><span className="kicker">PROPAGACIÓN</span><h3>Añade tus esquejes en agua para enraizar</h3><p>Haz o añade fotos para seguir sus raíces. PlantLive analizará el progreso y te orientará sobre cuándo pasarlos a tierra y cómo reducir el estrés del cambio.</p></div></div><form className="propagation-create" onSubmit={createPropagation}><input required value={propagationForm.name} onChange={(event) => setPropagationForm({ ...propagationForm, name: event.target.value })} placeholder="Nombre del esqueje" /><input value={propagationForm.species} onChange={(event) => setPropagationForm({ ...propagationForm, species: event.target.value })} placeholder="Especie, si la sabes" /><label>En agua desde<input type="date" value={propagationForm.startedAt} onChange={(event) => setPropagationForm({ ...propagationForm, startedAt: event.target.value })} /></label><button className="primary"><Plus size={17} /> Añadir esqueje</button></form></section>}

      {loadingPlants ? <div className="route-loading"><span className="spinner dark-spinner" /> Cargando tu jardín…</div> :
        visiblePlants.length ? collectionView === "propagation" ? <div className="propagation-grid">{visiblePlants.map((plant) => <article className="propagation-card" key={plant.instanceId}><header><div><b>{plant.nickname || plant.nombreComun}</b><i>{plant.nombreCientifico}</i><small>En agua desde {plant.propagationStartedAt}</small></div><button onClick={() => removePlant(plant.instanceId)} title="Eliminar esqueje"><Trash2 size={16} /></button></header>{plant.plantPhoto ? <img className="propagation-cover" src={plant.plantPhoto} alt={plant.nickname} /> : <div className="propagation-cover empty-cover"><GitBranch size={36} /><span>Añade una foto de las raíces</span></div>}<div className="propagation-controls"><select value={plant.propagationStatus || "enraizando"} onChange={(event) => updatePlant(plant.instanceId, { propagationStatus: event.target.value })}><option value="enraizando">Enraizando en agua</option><option value="casi-listo">Casi listo para tierra</option><option value="plantado">Pasado a tierra</option></select><div><label><Camera size={16} /> Hacer foto<input type="file" accept="image/*" capture="environment" onChange={(event) => addPropagationPhoto(plant, event)} /></label><label><ImagePlus size={16} /> Galería<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => addPropagationPhoto(plant, event)} /></label></div></div>{analyzingPropagation === plant.instanceId && <div className="log-analysis-loading"><span className="spinner dark-spinner" /> Analizando raíces y progreso…</div>}<div className="propagation-evolution">{(plant.propagationEvolution || []).slice().reverse().map((entry) => <figure key={entry.id}><img src={entry.url} alt="Evolución del esqueje" /><figcaption><b>{entry.date}</b><p>{entry.analysis}</p></figcaption></figure>)}</div></article>)}</div> : <div className="modern-garden-grid">{visiblePlants.map((plant, index) => <motion.button className="modern-plant-card" key={plant.instanceId} onClick={() => setSelected(plant)} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .04 }}>
          <div className="modern-plant-photo">{(plant.plantPhoto || plant.gallery?.[0] || plant.imagen) ? <img style={{ objectPosition: `${plant.profilePhotoPosition?.x ?? 50}% ${plant.profilePhotoPosition?.y ?? 50}%`, transform: `scale(${plant.profilePhotoZoom || 1})`, transformOrigin: `${plant.profilePhotoPosition?.x ?? 50}% ${plant.profilePhotoPosition?.y ?? 50}%` }} src={plant.plantPhoto || plant.gallery?.[0] || plant.imagen} alt={plant.nickname || plant.nombreComun} /> : <span><Leaf size={40} /> Sin fotografía</span>}<span className="plant-status"><i /> {plant.collectionStatus === "wishlist" ? "En deseos" : "En seguimiento"}</span></div>
          <div className="modern-plant-info"><small>{plant.categoria || "MI PLANTA"}</small><h3>{plant.nickname || plant.nombreComun}</h3><i>{plant.nombreCientifico}</i><div><span><Droplets size={15} /> Próximo riego</span><b>{plant.nextWater ? new Date(`${plant.nextWater}T12:00`).toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : "Por definir"}</b></div></div>
        </motion.button>)}</div> :
        plants.length ? <div className="empty small">{collectionView === "propagation" ? "Todavía no tienes esquejes en propagación." : collectionView === "wishlist" ? "Todavía no has guardado plantas en tu lista de deseos." : `No hay plantas que coincidan con “${filter}”.`}</div> :
        <div className="garden-empty"><div className="empty-plant-visual"><Leaf size={56} /><span>+</span></div><span className="kicker">EMPIEZA TU COLECCIÓN</span><h3>{authenticated ? "Tu primer rincón verde te espera" : "Crea un jardín que recuerde por ti"}</h3><p>{authenticated ? "Busca una especie por su nombre o hazle una foto si no sabes cuál es. PlantLive preparará su ficha y calendario de cuidados." : "Explora esta sección libremente. Inicia sesión cuando quieras guardar plantas y recibir recordatorios personalizados."}</p>{authenticated ? <div className="garden-empty-actions"><Link className="primary big" to="/#buscar"><Search size={18} /> Buscar por nombre</Link><Link className="photo-identify-button" to="/diagnostico"><Camera size={18} /> Identificar con foto</Link></div> : <Link className="primary big" to="/acceso" state={{ from: "/" }}><Plus size={18} /> Iniciar sesión para empezar</Link>}</div>}
    </section>

    <section className="garden-agenda-section"><div className="garden-agenda-copy"><span className="kicker light">PRÓXIMOS CUIDADOS</span><h2>Tu jardín,<br />al día.</h2><p>Las fechas son orientativas. Comprueba siempre el sustrato y observa la respuesta de la planta.</p><Link to="/calendario">Abrir calendario completo →</Link></div>
      <div className="modern-agenda">{upcoming.length ? upcoming.slice(0, 6).map((item) => <article key={item.id}><time><b>{new Date(`${item.date}T12:00`).toLocaleDateString("es-ES", { day: "2-digit" })}</b><small>{new Date(`${item.date}T12:00`).toLocaleDateString("es-ES", { month: "short" })}</small></time><span className="agenda-care-icon">{item.icon}</span><div><b>{item.action}</b><small>{item.plant}</small></div><button onClick={() => markDone(item)} title="Marcar como realizado"><Check size={17} /></button></article>) : <div className="agenda-empty"><CalendarDays size={30} /><p>Añade una planta para crear automáticamente sus próximos cuidados.</p></div>}</div>
    </section>

    {selected && <PlantModal plant={plants.find((plant) => plant.instanceId === selected.instanceId) || selected} onClose={() => setSelected(null)} onUpdate={updatePlant} onRefreshCare={refreshPlantCare} onRemove={removePlant} notify={notify} />}
  </div>;
}
