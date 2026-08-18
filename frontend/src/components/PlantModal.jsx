import { useEffect, useRef, useState } from "react";
import { Bug, CalendarDays, Camera, Check, Droplets, FlaskConical, History, ImagePlus, Leaf, MessageCircle, RefreshCw, Scissors, Sprout, X } from "lucide-react";
import { askPlantLive, seasonalCareDays, userDataApi } from "../services/plantliveApi";
import { capturePhoto } from "../utils/nativeCamera";

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

const prepareEvolutionPhoto = (file) => new Promise((resolve, reject) => {
  const image = new Image(), source = URL.createObjectURL(file);
  image.onload = () => {
    const scale = Math.min(1, 1100 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(source);
    canvas.toBlob((blob) => blob ? resolve({ blob, dataUrl: canvas.toDataURL("image/jpeg", .78) }) : reject(new Error("No se pudo preparar la fotografía.")), "image/jpeg", .78);
  };
  image.onerror = () => { URL.revokeObjectURL(source); reject(new Error("No se pudo leer la fotografía.")); };
  image.src = source;
});

const EvolutionPhotoActions = ({ onPhoto, notify }) => <div className="evolution-photo-actions"><button type="button" onClick={() => capturePhoto(onPhoto, notify)}><Camera size={15} /> Hacer foto</button><label><ImagePlus size={15} /> Galería<input type="file" accept="image/jpeg,image/png,image/webp" onChange={onPhoto} /></label></div>;

export function PlantModal({ plant, onClose, onUpdate, onRefreshCare, onRemove, onCompleteWatering, notify }) {
  const [draft, setDraft] = useState(plant);
  const [history, setHistory] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [refreshingCare, setRefreshingCare] = useState(false);
  const [wateringFeedbackOpen, setWateringFeedbackOpen] = useState(false);
  const [savingWatering, setSavingWatering] = useState(false);
  const [treatment, setTreatment] = useState({ problem: "", product: "", dose: "", date: new Date().toISOString().slice(0, 10) });
  const [analyzingLog, setAnalyzingLog] = useState("");
  const cropDrag = useRef(null);
  const [profileCrop, setProfileCrop] = useState(null);
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
  const completeTodayWatering = async (moisture) => {
    const today = new Date().toISOString().slice(0, 10);
    setSavingWatering(true);
    try {
      await onCompleteWatering({ id: `${draft.instanceId}-water-${today}`, date: today, plant: draft.nickname || draft.nombreComun, plantInstanceId: draft.instanceId }, moisture);
      setWateringFeedbackOpen(false);
      notify?.(moisture === "wet" ? "Ampliaremos poco a poco el intervalo." : moisture === "dry" ? "Adelantaremos la próxima revisión." : `${draft.nickname || draft.nombreComun} marcada como regada.`);
    } finally {
      setSavingWatering(false);
    }
  };
  const addPhoto = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || uploading || (draft.gallery || []).length >= 4) return;
    setUploading(true);
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(1, 900 / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(async (blob) => {
        if (!blob) { setUploading(false); notify?.("No se pudo preparar la fotografía. Prueba con una imagen JPG, PNG o WEBP."); return; }
        const previewUrl = canvas.toDataURL("image/jpeg", .72);
        const previousGallery = draft.gallery || [];
        change({ gallery: [...previousGallery, previewUrl], plantPhoto: draft.plantPhoto || previewUrl });
        try {
          const { url: storedUrl } = await userDataApi.uploadPhoto(new File([blob], "plant.jpg", { type: "image/jpeg" }));
          change({ gallery: [...previousGallery, storedUrl], plantPhoto: draft.plantPhoto || storedUrl });
          notify?.("Fotografía añadida a la galería.");
        } catch (error) { notify?.(`${error.message || "No se pudo conectar con el almacenamiento."}. La foto se ha añadido y se guardará con la planta.`); }
        finally { setUploading(false); }
      }, "image/jpeg", .78);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      setUploading(false);
      notify?.("El móvil no pudo abrir ese formato. Prueba con una imagen JPG, PNG o WEBP.");
    };
    image.src = url;
  };
  const removePhoto = async (index) => {
    const url = (draft.gallery || [])[index];
    const gallery = (draft.gallery || []).filter((_, itemIndex) => itemIndex !== index);
    change({ gallery, ...(url === draft.plantPhoto ? { plantPhoto: gallery[0] || null, profilePhotoPosition: { x: 50, y: 50 }, profilePhotoZoom: 1 } : {}) });
    if (url && !url.startsWith("data:")) await userDataApi.removePhoto(url).catch(() => {});
  };
  const chooseProfilePhoto = (photo) => {
    const current = photo === draft.plantPhoto ? (draft.profilePhotoPosition || { x: 50, y: 50 }) : { x: 50, y: 50 };
    setProfileCrop({ photo, ...current, zoom: photo === draft.plantPhoto ? (draft.profilePhotoZoom || 1) : 1 });
  };
  const profilePosition = draft.profilePhotoPosition || { x: 50, y: 50 };
  const startCropDrag = (event) => {
    if (!profileCrop) return;
    cropDrag.current = { clientX: event.clientX, clientY: event.clientY, x: profileCrop.x, y: profileCrop.y };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const moveCropPhoto = (event) => {
    if (!cropDrag.current) return;
    const x = Math.max(0, Math.min(100, cropDrag.current.x - (event.clientX - cropDrag.current.clientX) * .35));
    const y = Math.max(0, Math.min(100, cropDrag.current.y - (event.clientY - cropDrag.current.clientY) * .35));
    setProfileCrop((current) => ({ ...current, x, y }));
  };
  const finishCropDrag = () => { cropDrag.current = null; };
  const saveProfileCrop = () => {
    if (!profileCrop) return;
    change({ plantPhoto: profileCrop.photo, profilePhotoPosition: { x: profileCrop.x, y: profileCrop.y }, profilePhotoZoom: profileCrop.zoom });
    setProfileCrop(null);
    notify?.("Foto de perfil y encuadre guardados.");
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
  const addEvolutionPhoto = async (kind, item, event) => {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    const key = `${kind}-${item.id}`;
    setAnalyzingLog(key);
    try {
      const { blob, dataUrl } = await prepareEvolutionPhoto(file);
      const { url } = await userDataApi.uploadPhoto(new File([blob], `${kind}.jpg`, { type: "image/jpeg" }));
      const question = kind === "treatment"
        ? `Analiza esta evolución de ${item.problem}. Indica si observas señales compatibles con alguna plaga o enfermedad, qué debo hacer ahora y qué vigilar. Ten en cuenta el tratamiento: ${item.product || "ninguno indicado"}, dosis: ${item.dose || "no indicada"}. No afirmes un diagnóstico si la foto no basta.`
        : `Analiza la evolución de este esqueje de ${draft.nombreCientifico}, iniciado en ${item.medium} el ${item.startedAt}. Di claramente si parece listo para pasar a tierra, si aún le falta tiempo y qué señales concretas debo esperar. No inventes raíces que no sean visibles.`;
      const result = await askPlantLive({ pregunta: question, planta: draft.nombreCientifico, contexto: JSON.stringify({ maceta: draft.potSize, sustrato: draft.currentSubstrate }), imagen: dataUrl });
      const evolution = [...(item.evolution || []), { id: globalThis.crypto?.randomUUID?.() || Date.now(), date: new Date().toISOString().slice(0, 10), url, analysis: result.respuesta }];
      const field = kind === "treatment" ? "treatments" : "propagations";
      change({ [field]: (draft[field] || []).map((entry) => entry.id === item.id ? { ...entry, evolution } : entry) });
      notify?.(kind === "treatment" ? "Evolución analizada y guardada." : "Esqueje analizado y guardado.");
    } catch (error) { notify?.(error.message); }
    finally { setAnalyzingLog(""); }
  };
  return <div className="modal-backdrop" onClick={onClose}><section className="modal plant-profile" onClick={(event) => event.stopPropagation()}>
    {wateringFeedbackOpen && <div className="calendar-detail-backdrop" onClick={() => !savingWatering && setWateringFeedbackOpen(false)}><section className="watering-feedback" onClick={(event) => event.stopPropagation()}><Droplets size={32} /><h2>¿Cómo estaba el sustrato?</h2><p>Tu respuesta permite que PlantLive aprenda el ritmo real de este ejemplar.</p><div><button disabled={savingWatering} onClick={() => completeTodayWatering("wet")}>Aún húmedo</button><button disabled={savingWatering} onClick={() => completeTodayWatering("right")}>En su punto</button><button disabled={savingWatering} onClick={() => completeTodayWatering("dry")}>Demasiado seco</button></div></section></div>}
    <button className="close" onClick={onClose} aria-label="Cerrar">×</button><span className="kicker">FICHA DE CUIDADOS</span>
    <input className="nickname" value={draft.nickname} onChange={(event) => change({ nickname: event.target.value })} /><i>{draft.nombreCientifico}</i>
    <section className="plant-gallery profile-photo-editor"><div className="profile-photo-summary"><div className="profile-photo-ring">{(draft.plantPhoto || draft.gallery?.[0] || draft.imagen) ? <img draggable="false" style={{ objectPosition: `${profilePosition.x}% ${profilePosition.y}%`, transform: `scale(${draft.profilePhotoZoom || 1})`, transformOrigin: `${profilePosition.x}% ${profilePosition.y}%` }} src={draft.plantPhoto || draft.gallery?.[0] || draft.imagen} alt={`Foto de perfil de ${draft.nickname}`} /> : <Leaf size={38} />}</div><div><span className="kicker">FOTO DE PERFIL</span><h3>Editar foto de perfil de la planta</h3><p>Pulsa «Usar de perfil» en una imagen para abrir el editor grande, moverla y ampliar su encuadre.</p></div></div><div className="plant-gallery-head"><div><h3>Galería y evolución</h3><small>Añade hasta 4 fotos, elige la portada o elimina las que no quieras.</small></div><div className="plant-gallery-actions"><button type="button" disabled={(draft.gallery || []).length >= 4} className={(draft.gallery || []).length >= 4 ? "disabled" : ""} onClick={() => capturePhoto(addPhoto, notify)}><Camera size={16} /> Hacer foto</button><label className={(draft.gallery || []).length >= 4 ? "disabled" : ""}><ImagePlus size={16} /> Elegir de galería<input disabled={(draft.gallery || []).length >= 4} type="file" accept="image/jpeg,image/png,image/webp" onChange={addPhoto} /></label></div></div>
      {uploading && <div className="route-loading gallery-loading"><span className="spinner dark-spinner" /> Guardando fotografía…</div>}
      {(draft.gallery || []).length ? <div className="plant-gallery-grid profile-gallery-grid">{draft.gallery.map((photo, index) => <figure className={photo === draft.plantPhoto ? "selected-profile" : ""} key={photo}><img src={photo} alt={`Evolución ${index + 1}`} />{photo === draft.plantPhoto && <span className="profile-photo-badge">Perfil</span>}<div className="profile-gallery-actions"><button type="button" className="choose-profile" onClick={() => chooseProfilePhoto(photo)}>Usar de perfil</button><button type="button" className="remove-gallery-photo" onClick={() => removePhoto(index)} aria-label="Eliminar foto"><X size={14} /></button></div><figcaption>Foto {index + 1}</figcaption></figure>)}</div> : !uploading && <div className="plant-gallery-empty"><Camera size={25} /><span>Añade una primera fotografía: se usará automáticamente como perfil.</span></div>}
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
    <section className="watering-planner"><div className="watering-planner-head"><span><Droplets size={21} /></span><div><h3>Planificar el próximo riego</h3><p>Si el sustrato aún está húmedo, cambia la fecha. El calendario recalculará los siguientes riegos desde el día que elijas.</p></div></div><div className="watering-planner-controls"><label><CalendarDays size={17} /><span>Próxima fecha</span><input type="date" min={new Date().toISOString().slice(0, 10)} value={draft.nextWater || ""} onChange={(event) => change({ nextWater: event.target.value })} /></label><button type="button" onClick={() => setWateringFeedbackOpen(true)}><Droplets size={17} /> La he regado hoy</button></div>{draft.nextWater && <small>Próximo riego planificado: <b>{new Date(`${draft.nextWater}T12:00`).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}</b></small>}</section>
    <aside className="plant-chat-invite"><span><MessageCircle size={22} /></span><div><b>¿Tienes alguna duda sobre esta planta?</b><p>Pregunta al asistente de PlantLive sobre sus hojas, riego, luz o cuidados. También puedes enviarle una foto y continuar la conversación.</p></div><button type="button" onClick={askAboutPlant}>Preguntar al chatbot</button></aside>
    <div className="care-grid"><div><b>☀️ Luz</b><p>{draft.luz}</p></div><div><b>📍 Ubicación ideal</b><p>{draft.ubicacion}</p></div><div><b>🪴 Sustrato recomendado</b><p>{draft.sustrato}</p></div><div><b>💧 Riego actual</b><p>Revisar aproximadamente cada {seasonalCareDays(draft, "riego")} días. {draft.riegoIndicador || "Comprueba antes la humedad."}</p><small>Verano: {draft.riegoVeranoDias || draft.riegoDias} días · Invierno: {draft.riegoInviernoDias || draft.riegoDias} días</small></div><div><b>🧪 Abono y fertilización</b><p>{draft.fertilizante}.</p><small>Primavera: {feedingInterval(draft.abonoPrimaveraDias ?? draft.abonoDias)} · Verano: {feedingInterval(draft.abonoVeranoDias ?? draft.abonoDias)} · Otoño: {feedingInterval(draft.abonoOtonoDias ?? draft.abonoDias)} · Invierno: {feedingInterval(draft.abonoInviernoDias ?? draft.abonoDias)}.</small>{draft.abonoIndicador && <p>{draft.abonoIndicador}</p>}</div><div><b>🌡️ Ambiente</b><p>{draft.temperatura} · Humedad {draft.humedad}</p></div></div>
    <div className="warning">🐾 {draft.toxicidad}</div>
    {(draft.advertencias || draft.confianzaCuidados) && <div className={`care-confidence ${draft.confianzaCuidados || "media"}`}><b>Confianza de la ficha: {draft.confianzaCuidados || "media"}</b><span>{draft.advertencias || "Contrasta los cuidados con la respuesta real de tu ejemplar."}</span></div>}
    <section className="care-history"><h3><History size={18} /> Registrar cuidado</h3><div className="care-buttons">{careTypes.map(([type, label, Icon]) => <button key={type} onClick={() => addCare(type)}><Icon size={16} /> {label}</button>)}</div>
      {!!history.length && <div className="care-timeline">{history.slice(0, 8).map((item) => <p key={item.id}><b>{labels[item.type] || item.type}</b><span>{new Date(item.completedAt).toLocaleDateString("es-ES")}</span></p>)}</div>}
    </section>
    <section className="plant-log-section"><h3><Bug size={18} /> Problemas, plagas y tratamientos</h3><p className="plant-log-help">Añade fotos con el paso de los días para comparar la evolución y recibir orientación sobre los siguientes pasos.</p><form className="plant-log-form" onSubmit={addTreatment}><input required value={treatment.problem} onChange={(event) => setTreatment({ ...treatment, problem: event.target.value })} placeholder="Plaga, hongo o síntoma" /><input value={treatment.product} onChange={(event) => setTreatment({ ...treatment, product: event.target.value })} placeholder="Producto o actuación" /><input value={treatment.dose} onChange={(event) => setTreatment({ ...treatment, dose: event.target.value })} placeholder="Dosis aplicada" /><input type="date" value={treatment.date} onChange={(event) => setTreatment({ ...treatment, date: event.target.value })} /><button>Añadir</button></form>{(draft.treatments || []).map((item) => <article className="plant-log-entry" key={item.id}><header><div><b>{item.problem}</b><small>{item.date} · {item.product || "Sin producto"}{item.dose ? ` · ${item.dose}` : ""}</small></div><button onClick={() => change({ treatments: draft.treatments.filter((entry) => entry.id !== item.id) })}>Eliminar</button></header><EvolutionPhotoActions onPhoto={(event) => addEvolutionPhoto("treatment", item, event)} />{analyzingLog === `treatment-${item.id}` && <div className="log-analysis-loading"><span className="spinner dark-spinner" /> Analizando posibles plagas y evolución…</div>}<div className="evolution-timeline">{(item.evolution || []).map((entry) => <figure key={entry.id}><img src={entry.url} alt={`Evolución de ${item.problem}`} /><figcaption><b>{entry.date}</b><p>{entry.analysis}</p></figcaption></figure>)}</div></article>)}</section>
    <label className="notes">Notas<textarea value={draft.notes || ""} onChange={(event) => change({ notes: event.target.value })} placeholder="Cambios observados, tratamientos, preferencias…" /></label>
    <button className="danger" onClick={() => { if (window.confirm(`¿Eliminar ${draft.nickname || draft.nombreComun} de Mis plantas?`)) { onRemove(draft.instanceId); onClose(); } }}>Eliminar de Mis plantas</button>
    {profileCrop && <div className="profile-crop-backdrop" onClick={() => setProfileCrop(null)}><section className="profile-crop-modal" onClick={(event) => event.stopPropagation()}><header><div><span className="kicker">AJUSTAR FOTO DE PERFIL</span><h3>Mueve y amplía la fotografía</h3><p>La zona marcada es exactamente la que se mostrará en el perfil.</p></div><button type="button" onClick={() => setProfileCrop(null)} aria-label="Cerrar"><X size={20} /></button></header><div className="profile-crop-stage" onPointerDown={startCropDrag} onPointerMove={moveCropPhoto} onPointerUp={finishCropDrag} onPointerCancel={finishCropDrag}><img draggable="false" src={profileCrop.photo} alt="Ajustar encuadre" style={{ objectPosition: `${profileCrop.x}% ${profileCrop.y}%`, transform: `scale(${profileCrop.zoom})`, transformOrigin: `${profileCrop.x}% ${profileCrop.y}%` }} /><div className="crop-grid" aria-hidden="true"><i /><i /><i /><i /></div></div><div className="crop-zoom-control"><span>−</span><label>Ampliar foto<input type="range" min="1" max="3" step="0.05" value={profileCrop.zoom} onChange={(event) => setProfileCrop((current) => ({ ...current, zoom: Number(event.target.value) }))} /></label><span>+</span></div><small>Arrastra la imagen y usa el control para ampliarla. La cuadrícula permanece fija.</small><footer><button type="button" className="crop-cancel" onClick={() => setProfileCrop(null)}>Cancelar</button><button type="button" className="primary" onClick={saveProfileCrop}><Check size={17} /> Fijar como foto de perfil</button></footer></section></div>}
  </section></div>;
}
