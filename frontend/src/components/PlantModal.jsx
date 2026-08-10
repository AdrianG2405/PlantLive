import { useEffect, useState } from "react";
import { Bug, CalendarDays, Camera, Check, Droplets, FlaskConical, GitBranch, History, MessageCircle, RefreshCw, Scissors, Sprout, X } from "lucide-react";
import { seasonalCareDays, userDataApi } from "../services/plantliveApi";

const careTypes = [
  ["water", "Riego", Droplets], ["fertilize", "Abono", FlaskConical],
  ["prune", "Poda", Scissors], ["repot", "Trasplante", Sprout],
  ["inspection", "Revisión", Check],
];
const labels = Object.fromEntries(careTypes.map(([value, label]) => [value, label]));
const feedingInterval = (days) => Number(days) > 0 ? `cada ${days} días` : "no abonar";
const nextDateFrom = (date, days) => {
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + Math.max(1, Number(days) || 1));
  return next.toISOString().slice(0, 10);
};

export function PlantModal({ plant, onClose, onUpdate, onRefreshCare, onRemove }) {
  const [draft, setDraft] = useState(plant);
  const [history, setHistory] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [refreshingCare, setRefreshingCare] = useState(false);
  const [treatment, setTreatment] = useState({ problem: "", product: "", dose: "", date: new Date().toISOString().slice(0, 10) });
  const [propagation, setPropagation] = useState({ name: "", medium: "agua", startedAt: new Date().toISOString().slice(0, 10), status: "iniciado" });
  useEffect(() => {
    setDraft(plant);
    if (plant?.serverId) userDataApi.careHistory(plant.serverId).then(setHistory).catch(() => {});
  }, [plant]);
  if (!draft) return null;
  const change = (values) => {
    setDraft((current) => ({ ...current, ...values }));
    onUpdate(draft.instanceId, values);
  };
  const addCare = async (type) => {
    const item = await userDataApi.addCare(draft.serverId, { type });
    setHistory((current) => [item, ...current]);
    if (type === "water") {
      const today = new Date().toISOString().slice(0, 10);
      change({ nextWater: nextDateFrom(today, seasonalCareDays(draft, "riego", new Date())) });
    }
  };
  const addPhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file || (draft.gallery || []).length >= 4) return;
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(1, 900 / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        setUploading(true);
        try {
          const { url: storedUrl } = await userDataApi.uploadPhoto(new File([blob], "plant.jpg", { type: "image/jpeg" }));
          change({ gallery: [...(draft.gallery || []), storedUrl] });
        } finally { setUploading(false); }
      }, "image/jpeg", .78);
    };
    image.src = url;
  };
  const removePhoto = async (index) => {
    const url = (draft.gallery || [])[index];
    change({ gallery: (draft.gallery || []).filter((_, itemIndex) => itemIndex !== index) });
    if (url && !url.startsWith("data:")) await userDataApi.removePhoto(url).catch(() => {});
  };
  const refreshCare = async () => {
    setRefreshingCare(true);
    try {
      const refreshed = await onRefreshCare(draft.instanceId, {
        homeLocation: draft.homeLocation,
        potSize: draft.potSize,
        currentSubstrate: draft.currentSubstrate,
        exposure: draft.exposure,
        lastRepot: draft.lastRepot,
      });
      setDraft(refreshed);
    } finally {
      setRefreshingCare(false);
    }
  };
  const askAboutPlant = () => {
    window.dispatchEvent(new CustomEvent("plantlive:open-chat", {
      detail: {
        plantId: draft.instanceId,
        question: `Tengo una duda sobre ${draft.nickname || draft.nombreComun}: `,
      },
    }));
    onClose();
  };
  const addTreatment = (event) => {
    event.preventDefault();
    if (!treatment.problem.trim()) return;
    change({ treatments: [{ ...treatment, id: globalThis.crypto?.randomUUID?.() || Date.now() }, ...(draft.treatments || [])] });
    setTreatment({ problem: "", product: "", dose: "", date: new Date().toISOString().slice(0, 10) });
  };
  const addPropagation = (event) => {
    event.preventDefault();
    if (!propagation.name.trim()) return;
    change({ propagations: [{ ...propagation, id: globalThis.crypto?.randomUUID?.() || Date.now() }, ...(draft.propagations || [])] });
    setPropagation({ name: "", medium: "agua", startedAt: new Date().toISOString().slice(0, 10), status: "iniciado" });
  };
  return <div className="modal-backdrop" onClick={onClose}><section className="modal plant-profile" onClick={(event) => event.stopPropagation()}>
    <button className="close" onClick={onClose} aria-label="Cerrar">×</button><span className="kicker">FICHA DE CUIDADOS</span>
    <input className="nickname" value={draft.nickname} onChange={(event) => change({ nickname: event.target.value })} /><i>{draft.nombreCientifico}</i>
    <section className="plant-gallery"><div className="plant-gallery-head"><div><h3>Galería y evolución</h3><small>Guarda hasta 4 fotografías para comparar su estado.</small></div><label><Camera size={16} /> Añadir foto<input type="file" accept="image/jpeg,image/png,image/webp" onChange={addPhoto} /></label></div>
      {uploading && <div className="route-loading gallery-loading"><span className="spinner dark-spinner" /> Guardando fotografía…</div>}
      {(draft.gallery || []).length ? <div className="plant-gallery-grid">{draft.gallery.map((photo, index) => <figure key={photo}><img src={photo} alt={`Evolución ${index + 1}`} /><button onClick={() => removePhoto(index)} aria-label="Eliminar foto"><X size={14} /></button><figcaption>Foto {index + 1}</figcaption></figure>)}</div> : !uploading && <div className="plant-gallery-empty"><Camera size={25} /><span>Añade una primera fotografía para seguir su evolución.</span></div>}
    </section>
    <div className="profile-fields">
      <label>Ubicación en casa<input value={draft.homeLocation || ""} onChange={(event) => change({ homeLocation: event.target.value })} placeholder="Salón, ventana este…" /></label>
      <label>Tamaño de maceta<input value={draft.potSize || ""} onChange={(event) => change({ potSize: event.target.value })} placeholder="18 cm" /></label>
      <label>Sustrato actual<input value={draft.currentSubstrate || ""} onChange={(event) => change({ currentSubstrate: event.target.value })} placeholder="Universal, perlita, fibra de coco…" /></label>
      <label>Luz real que recibe<input value={draft.exposure || ""} onChange={(event) => change({ exposure: event.target.value })} placeholder="Ventana sur, sombra, 3 h de sol…" /></label>
      <label>Fecha de adquisición<input type="date" value={draft.acquiredAt || ""} onChange={(event) => change({ acquiredAt: event.target.value })} /></label>
      <label>Último trasplante<input type="date" value={draft.lastRepot || ""} onChange={(event) => change({ lastRepot: event.target.value })} /></label>
    </div>
    <button className="followup-button" onClick={refreshCare} disabled={refreshingCare}><RefreshCw size={16} /> {refreshingCare ? "Analizando condiciones…" : "Actualizar cuidados según mi casa"}</button>
    <section className="watering-planner"><div className="watering-planner-head"><span><Droplets size={21} /></span><div><h3>Planificar el próximo riego</h3><p>Si el sustrato aún está húmedo, cambia la fecha. El calendario recalculará los siguientes riegos desde el día que elijas.</p></div></div><div className="watering-planner-controls"><label><CalendarDays size={17} /><span>Próxima fecha</span><input type="date" min={new Date().toISOString().slice(0, 10)} value={draft.nextWater || ""} onChange={(event) => change({ nextWater: event.target.value })} /></label><button type="button" onClick={() => addCare("water")}><Droplets size={17} /> La he regado hoy</button></div>{draft.nextWater && <small>Próximo riego planificado: <b>{new Date(`${draft.nextWater}T12:00`).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}</b></small>}</section>
    <aside className="plant-chat-invite"><span><MessageCircle size={22} /></span><div><b>¿Tienes alguna duda sobre esta planta?</b><p>Pregunta al asistente de PlantLive sobre sus hojas, riego, luz o cuidados. También puedes enviarle una foto y continuar la conversación.</p></div><button type="button" onClick={askAboutPlant}>Preguntar al chatbot</button></aside>
    <div className="care-grid"><div><b>☀️ Luz</b><p>{draft.luz}</p></div><div><b>📍 Ubicación ideal</b><p>{draft.ubicacion}</p></div><div><b>🪴 Sustrato recomendado</b><p>{draft.sustrato}</p></div><div><b>💧 Riego actual</b><p>Revisar aproximadamente cada {seasonalCareDays(draft, "riego")} días. {draft.riegoIndicador || "Comprueba antes la humedad."}</p><small>Verano: {draft.riegoVeranoDias || draft.riegoDias} días · Invierno: {draft.riegoInviernoDias || draft.riegoDias} días</small></div><div><b>🧪 Abono y fertilización</b><p>{draft.fertilizante}.</p><small>Primavera: {feedingInterval(draft.abonoPrimaveraDias ?? draft.abonoDias)} · Verano: {feedingInterval(draft.abonoVeranoDias ?? draft.abonoDias)} · Otoño: {feedingInterval(draft.abonoOtonoDias ?? draft.abonoDias)} · Invierno: {feedingInterval(draft.abonoInviernoDias ?? draft.abonoDias)}.</small>{draft.abonoIndicador && <p>{draft.abonoIndicador}</p>}</div><div><b>🌡️ Ambiente</b><p>{draft.temperatura} · Humedad {draft.humedad}</p></div></div>
    <div className="warning">🐾 {draft.toxicidad}</div>
    {(draft.advertencias || draft.confianzaCuidados) && <div className={`care-confidence ${draft.confianzaCuidados || "media"}`}><b>Confianza de la ficha: {draft.confianzaCuidados || "media"}</b><span>{draft.advertencias || "Contrasta los cuidados con la respuesta real de tu ejemplar."}</span></div>}
    <section className="care-history"><h3><History size={18} /> Registrar cuidado</h3><div className="care-buttons">{careTypes.map(([type, label, Icon]) => <button key={type} onClick={() => addCare(type)}><Icon size={16} /> {label}</button>)}</div>
      {!!history.length && <div className="care-timeline">{history.slice(0, 8).map((item) => <p key={item.id}><b>{labels[item.type] || item.type}</b><span>{new Date(item.completedAt).toLocaleDateString("es-ES")}</span></p>)}</div>}
    </section>
    <section className="plant-log-section"><h3><Bug size={18} /> Problemas y tratamientos</h3><form className="plant-log-form" onSubmit={addTreatment}><input required value={treatment.problem} onChange={(event) => setTreatment({ ...treatment, problem: event.target.value })} placeholder="Plaga, hongo o síntoma" /><input value={treatment.product} onChange={(event) => setTreatment({ ...treatment, product: event.target.value })} placeholder="Producto o actuación" /><input value={treatment.dose} onChange={(event) => setTreatment({ ...treatment, dose: event.target.value })} placeholder="Dosis aplicada" /><input type="date" value={treatment.date} onChange={(event) => setTreatment({ ...treatment, date: event.target.value })} /><button>Añadir</button></form>{(draft.treatments || []).map((item) => <article key={item.id}><div><b>{item.problem}</b><small>{item.date} · {item.product || "Sin producto"}{item.dose ? ` · ${item.dose}` : ""}</small></div><button onClick={() => change({ treatments: draft.treatments.filter((entry) => entry.id !== item.id) })}>Eliminar</button></article>)}</section>
    <section className="plant-log-section"><h3><GitBranch size={18} /> Esquejes y propagación</h3><form className="plant-log-form propagation-form" onSubmit={addPropagation}><input required value={propagation.name} onChange={(event) => setPropagation({ ...propagation, name: event.target.value })} placeholder="Nombre del esqueje" /><select value={propagation.medium} onChange={(event) => setPropagation({ ...propagation, medium: event.target.value })}><option value="agua">En agua</option><option value="sustrato">En sustrato</option><option value="semihidro">Semihidroponía</option></select><input type="date" value={propagation.startedAt} onChange={(event) => setPropagation({ ...propagation, startedAt: event.target.value })} /><button>Añadir</button></form>{(draft.propagations || []).map((item) => <article key={item.id}><div><b>{item.name}</b><small>Desde {item.startedAt} · {item.medium}</small></div><select value={item.status} onChange={(event) => change({ propagations: draft.propagations.map((entry) => entry.id === item.id ? { ...entry, status: event.target.value } : entry) })}><option value="iniciado">Iniciado</option><option value="con-raices">Con raíces</option><option value="plantado">Plantado</option></select></article>)}</section>
    <label className="notes">Notas<textarea value={draft.notes || ""} onChange={(event) => change({ notes: event.target.value })} placeholder="Cambios observados, tratamientos, preferencias…" /></label>
    <button className="danger" onClick={() => { if (window.confirm(`¿Eliminar ${draft.nickname || draft.nombreComun} de Mis plantas?`)) { onRemove(draft.instanceId); onClose(); } }}>Eliminar de Mis plantas</button>
  </section></div>;
}
