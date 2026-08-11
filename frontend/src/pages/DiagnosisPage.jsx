import { useEffect, useState } from "react";
import { AlertTriangle, CalendarPlus, Camera, CheckCircle2, Eye, ImagePlus, Leaf, Plus, ScanSearch, ShieldCheck, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createCareProfile, diagnosePlant, findPlantPhoto, userDataApi } from "../services/plantliveApi";
import { trackEvent } from "../utils/analytics";
import { capturePhoto } from "../utils/nativeCamera";

export function DiagnosisPage({ plants, addPlant, notify, authenticated }) {
  const navigate = useNavigate();
  const [photos, setPhotos] = useState([]);
  const [symptoms, setSymptoms] = useState("");
  const [plantId, setPlantId] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [identifiedPlant, setIdentifiedPlant] = useState(null);
  const [addingPlant, setAddingPlant] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiConsent, setAiConsent] = useState(false);
  const loadHistory = () => userDataApi.diagnoses().then(setHistory).catch(() => {});
  useEffect(() => {
    if (authenticated) {
      userDataApi.diagnoses().then(setHistory).catch(() => {});
      userDataApi.settings().then((settings) => setAiConsent(settings.aiConsent)).catch(() => {});
    }
  }, [authenticated]);
  const optimizePhoto = (file) => new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      const maxSize = 1280;
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.84));
    };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo leer la imagen.")); };
    image.src = url;
  });
  const loadPhoto = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) return notify("La imagen no puede superar 8 MB.");
    try {
      const optimized = await optimizePhoto(file);
      setPhotos((current) => [...current, optimized].slice(0, 4));
    }
    catch (error) { notify(error.message); }
    finally { event.target.value = ""; }
  };
  const diagnose = async () => {
    if (!authenticated) {
      notify("Inicia sesión para analizar la planta y guardar el diagnóstico.");
      navigate("/acceso", { state: { from: "/diagnostico" } });
      return;
    }
    if (!aiConsent) return notify("Acepta el análisis externo debajo de las fotografías para continuar.");
    if (!photos.length) return notify("Selecciona al menos una fotografía.");
    setLoading(true); setDiagnosis(""); setIdentifiedPlant(null); setFeedbackSent(false);
    try {
      const plant = plants.find((item) => item.instanceId === plantId);
      const data = await diagnosePlant({ imagenes: photos, sintomas: symptoms, planta: plant?.nombreCientifico });
      trackEvent("diagnosis_completed", { has_known_plant: Boolean(plant), photo_count: photos.length });
      setDiagnosis(data.respuesta);
      if (data.identifiedPlant?.nombreCientifico) setIdentifiedPlant(data.identifiedPlant);
      loadHistory();
    } catch (error) { notify(error.message); }
    finally { setLoading(false); }
  };
  const changeConsent = async (accepted) => {
    try {
      await userDataApi.updateSettings({ aiConsent: accepted });
      setAiConsent(accepted);
      notify(accepted ? "Análisis externo activado para tu cuenta." : "Análisis externo desactivado.");
    } catch (error) { notify(error.message); }
  };
  const scheduleReview = async () => {
    const plant = plants.find((item) => item.instanceId === plantId);
    const date = new Date();
    date.setDate(date.getDate() + 7);
    try {
      await userDataApi.addTask({
        title: `Revisar evolución${plant ? ` de ${plant.nickname}` : ""}`,
        dueDate: date.toISOString().slice(0, 10),
        plantId: plant?.serverId || null,
        type: "follow-up",
      });
      notify("Revisión añadida al calendario dentro de 7 días.");
    } catch (error) { notify(error.message); }
  };
  const addIdentifiedPlant = async () => {
    if (!identifiedPlant?.nombreCientifico || addingPlant) return;
    setAddingPlant(true);
    try {
      const imagen = await findPlantPhoto(identifiedPlant.nombreCientifico).catch(() => null);
      const profile = await createCareProfile({
        id: `diagnosis-${Date.now()}`,
        nombreComun: identifiedPlant.nombreComun || identifiedPlant.nombreCientifico,
        nombreCientifico: identifiedPlant.nombreCientifico,
        categoria: "planta identificada",
        descripcion: "Planta identificada mediante análisis fotográfico.",
        imagen,
      });
      await addPlant(profile);
      notify(`${profile.nombreComun} se ha añadido a Mis plantas.`);
      setIdentifiedPlant(null);
    } catch (error) {
      notify(error.message);
    } finally {
      setAddingPlant(false);
    }
  };
  const rateDiagnosis = async (rating) => {
    try {
      await userDataApi.feedback({ type: "diagnosis", rating, reference: identifiedPlant?.nombreCientifico || plantId });
      setFeedbackSent(true);
      notify("Gracias. Tu valoración ayudará a revisar la calidad botánica.");
    } catch (error) { notify(error.message); }
  };
  const sections = diagnosis ? parseDiagnosis(diagnosis) : [];
  return <><section className="diagnosis-hero"><div><span className="kicker light">IDENTIFICA · PLAGAS · CUIDADOS</span><h1>Conoce tu planta<br /><em>a partir de una foto.</em></h1><p>Identifica la especie, revisa manchas o daños y busca señales compatibles con plagas para saber qué hacer a continuación.</p><div className="diagnosis-trust"><span><ShieldCheck size={16} /> Tú decides qué fotos analizar</span><span><Sparkles size={16} /> Orientación sobre plagas y cuidados</span></div></div><div className="diagnosis-hero-steps"><article><b>01</b><span>Sube una foto</span></article><article><b>02</b><span>Identifica plagas o daños</span></article><article><b>03</b><span>Recibe los siguientes pasos</span></article></div></section>
    <section className="section doctor diagnosis-doctor"><div className="doctor-copy"><span className="kicker light">ANÁLISIS VISUAL Y PLAGAS</span><h2>Una buena foto ayuda a acertar</h2><p>Puedes identificar una planta, revisar su estado y buscar indicios de cochinilla, araña roja, trips, pulgón, hongos u otros problemas.</p><ul><li>Fotografía la planta completa con buena luz</li><li>Añade primeros planos del haz y envés de las hojas</li><li>Si sospechas una plaga, muestra insectos, tallos, uniones y sustrato</li></ul></div><div className="diagnosis-panel"><div className="diagnosis-panel-head"><span>1</span><div><b>Añade imágenes de tu planta o de la plaga</b><small>Puedes subir hasta 4 vistas diferentes</small></div></div>
      <div className="diagnosis-photo-source">
        <label className="dropzone"><span className="upload-icon"><ImagePlus size={28} /></span><b>Elegir de la galería</b><small>Añade entre 1 y 4 fotografías</small><input type="file" accept="image/jpeg,image/png,image/webp" onChange={loadPhoto} /></label>
        <button type="button" className="camera-capture" onClick={() => capturePhoto(loadPhoto, notify)}><Camera size={20} /><span><b>Hacer foto ahora</b><small>Abre directamente la cámara trasera</small></span></button>
      </div>
      {!!photos.length && <div className="diagnosis-photos">{photos.map((item, index) => <button key={index} onClick={() => setPhotos(photos.filter((_, photoIndex) => photoIndex !== index))}><img src={item} alt={`Vista ${index + 1}`} /><span>×</span></button>)}</div>}
      <div className="diagnosis-field-group"><div className="diagnosis-panel-head compact"><span>2</span><div><b>Cuéntanos lo que sabes</b><small>Es opcional, pero mejora el análisis</small></div></div><label><span>¿Ya está en tu jardín?</span><select value={plantId} onChange={(event) => setPlantId(event.target.value)}><option value="">No sé qué planta es — identificar con la foto</option>{plants.map((plant) => <option key={plant.instanceId} value={plant.instanceId}>{plant.nickname}</option>)}</select></label><label><span>¿Qué has observado?</span><textarea value={symptoms} onChange={(event) => setSymptoms(event.target.value)} placeholder="Ej. Tiene manchas amarillas desde hace una semana y la riego cada 4 días…" /></label></div>
      <label className="diagnosis-consent"><input type="checkbox" checked={aiConsent} disabled={!authenticated} onChange={(event) => changeConsent(event.target.checked)} /><span><b>Acepto el análisis externo de estas fotografías</b><small>Proveedores tecnológicos especializados las procesarán para identificar la especie y orientar el diagnóstico. La fotografía no se guarda en el historial.</small></span></label>
      <button className="primary diagnosis-button" onClick={diagnose} disabled={loading}>{loading ? <><span className="spinner" /> Identificando y analizando…</> : <><ScanSearch size={19} /> Identificar y analizar mi planta</>}</button>
      {loading && <div className="analysis-progress"><Sparkles size={18} /><div><b>PlantLive está observando la imagen</b><small>Identificando especie, síntomas y posibles cuidados…</small></div></div>}
      {diagnosis && <div className="diagnosis-result structured-result"><div className="diagnosis-result-head"><span className="result-icon"><Sparkles size={19} /></span><div><b>Orientación de PlantLive</b><small>Análisis visual avanzado</small></div></div><div className="diagnosis-sections">{sections.map((section) => <article key={section.title} className={section.tone}><span>{section.icon}</span><div><h3>{section.title}</h3><p>{section.text}</p></div></article>)}</div>{identifiedPlant?.nombreCientifico && <button className="primary identified-add-button" onClick={addIdentifiedPlant} disabled={addingPlant}><Plus size={17} /> {addingPlant ? "Preparando ficha…" : `Añadir ${identifiedPlant.nombreComun || "esta planta"} a Mis plantas`}</button>}<button className="followup-button" onClick={scheduleReview}><CalendarPlus size={16} /> Revisar evolución en 7 días</button>{feedbackSent ? <div className="feedback-thanks">Valoración enviada</div> : <div className="diagnosis-feedback"><span>¿Te ha resultado útil?</span><button onClick={() => rateDiagnosis(1)} aria-label="Sí, fue útil"><ThumbsUp size={15} /></button><button onClick={() => rateDiagnosis(-1)} aria-label="No fue útil"><ThumbsDown size={15} /></button></div>}<small className="diagnosis-disclaimer">Orientación basada en fotografías; no sustituye una inspección profesional.</small></div>}
    </div></section>
    <section className="section diagnosis-history"><div className="section-head"><span className="kicker">TU HISTORIAL</span><h2>Consultas anteriores</h2><p>Tus diagnósticos quedan guardados de forma privada en tu cuenta.</p></div>
      {history.length ? <details className="history-archive"><summary><span><b>Ver consultas guardadas</b><small>{history.length} {history.length === 1 ? "consulta" : "consultas"} en tu historial</small></span><span className="history-archive-action">Desplegar</span></summary><div className="history-list">{history.map((item) => <details key={item.id}><summary><span><b>{item.plantName || "Planta sin identificar"}</b><small>{new Date(item.createdAt).toLocaleDateString("es-ES")} · Análisis avanzado</small></span><span>Ver diagnóstico</span></summary><p>{item.response}</p></details>)}</div></details> : <div className="empty small">Todavía no tienes consultas guardadas.</div>}
    </section></>;
}

function parseDiagnosis(text) {
  const icons = {
    "IDENTIFICACIÓN": <Leaf size={18} />, "LO QUE VEO": <Eye size={18} />,
    "CAUSA MÁS PROBABLE": <AlertTriangle size={18} />, "QUÉ HACER AHORA": <CheckCircle2 size={18} />,
    "QUÉ VIGILAR": <ScanSearch size={18} />,
  };
  const clean = text.replaceAll("**", "").trim();
  const pattern = /(IDENTIFICACIÓN|LO QUE VEO|CAUSA MÁS PROBABLE|QUÉ HACER AHORA|QUÉ VIGILAR)\s*:?\s*/gi;
  const matches = [...clean.matchAll(pattern)];
  if (!matches.length) return [{ title: "Resultado del análisis", text: clean, icon: <Sparkles size={18} />, tone: "neutral" }];
  return matches.map((match, index) => {
    const title = match[1].toUpperCase();
    return {
      title, icon: icons[title] || <Sparkles size={18} />,
      text: clean.slice(match.index + match[0].length, matches[index + 1]?.index ?? clean.length).trim(),
      tone: title.includes("CAUSA") ? "warning-tone" : title.includes("HACER") ? "action-tone" : "neutral",
    };
  }).filter((item) => item.text);
}
