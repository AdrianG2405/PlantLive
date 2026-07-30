import { useEffect, useState } from "react";
import { AlertTriangle, CalendarPlus, Camera, CheckCircle2, Eye, ImagePlus, Leaf, ScanSearch, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { diagnosePlant, userDataApi } from "../services/plantliveApi";

export function DiagnosisPage({ plants, notify, authenticated }) {
  const navigate = useNavigate();
  const [photos, setPhotos] = useState([]);
  const [symptoms, setSymptoms] = useState("");
  const [plantId, setPlantId] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [provider, setProvider] = useState("");
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
    setLoading(true); setDiagnosis(""); setProvider("");
    try {
      const plant = plants.find((item) => item.instanceId === plantId);
      const data = await diagnosePlant({ imagenes: photos, sintomas: symptoms, planta: plant?.nombreCientifico });
      setDiagnosis(data.respuesta); setProvider(data.provider || ""); loadHistory();
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
  const sections = diagnosis ? parseDiagnosis(diagnosis) : [];
  return <><section className="page-banner dark diagnosis-banner"><span className="kicker light">IDENTIFICACIÓN Y SALUD VEGETAL</span><h1>Identificación y diagnóstico</h1><p>Descubre qué planta es, qué puede estar ocurriendo y cómo actuar.</p></section>
    <section className="section doctor diagnosis-doctor"><div className="doctor-copy"><span className="kicker light">ANÁLISIS VISUAL</span><h2>¿Qué planta es y cómo está?</h2><p>Sube una foto nítida. La IA intentará identificar la especie antes de analizar su estado.</p><ul><li>Fotografía la planta completa</li><li>Incluye hojas sanas y afectadas</li><li>Si puedes, muestra también tallos y sustrato</li></ul></div><div className="diagnosis-panel">
      <div className="diagnosis-photo-source">
        <label className="dropzone"><span className="upload-icon"><ImagePlus size={28} /></span><b>Elegir de la galería</b><small>Añade entre 1 y 4 fotografías</small><input type="file" accept="image/jpeg,image/png,image/webp" onChange={loadPhoto} /></label>
        <label className="camera-capture"><Camera size={20} /><span><b>Hacer foto ahora</b><small>Abre directamente la cámara trasera</small></span><input type="file" accept="image/*" capture="environment" onChange={loadPhoto} /></label>
      </div>
      {!!photos.length && <div className="diagnosis-photos">{photos.map((item, index) => <button key={index} onClick={() => setPhotos(photos.filter((_, photoIndex) => photoIndex !== index))}><img src={item} alt={`Vista ${index + 1}`} /><span>×</span></button>)}</div>}
      <select value={plantId} onChange={(event) => setPlantId(event.target.value)}><option value="">No sé qué planta es — identificar con la foto</option>{plants.map((plant) => <option key={plant.instanceId} value={plant.instanceId}>{plant.nickname}</option>)}</select>
      <textarea value={symptoms} onChange={(event) => setSymptoms(event.target.value)} placeholder="¿Qué has observado? ¿Desde cuándo? ¿Cada cuánto riegas?" />
      <label className="diagnosis-consent"><input type="checkbox" checked={aiConsent} disabled={!authenticated} onChange={(event) => changeConsent(event.target.checked)} /><span><b>Acepto el análisis externo de estas fotografías</b><small>Plant.id y Gemini las procesarán para identificar la especie y orientar el diagnóstico. No se guardan en el historial.</small></span></label>
      <button className="primary diagnosis-button" onClick={diagnose} disabled={loading}>{loading ? <><span className="spinner" /> Identificando y analizando…</> : <><ScanSearch size={19} /> Analizar con IA</>}</button>
      {loading && <div className="analysis-progress"><Sparkles size={18} /><div><b>PlantLive está observando la imagen</b><small>Identificando especie, síntomas y posibles cuidados…</small></div></div>}
      {diagnosis && <div className="diagnosis-result structured-result"><div className="diagnosis-result-head"><span className="result-icon"><Sparkles size={19} /></span><div><b>Orientación de PlantLive</b><small>Análisis visual · {provider}</small></div></div><div className="diagnosis-sections">{sections.map((section) => <article key={section.title} className={section.tone}><span>{section.icon}</span><div><h3>{section.title}</h3><p>{section.text}</p></div></article>)}</div><button className="followup-button" onClick={scheduleReview}><CalendarPlus size={16} /> Revisar evolución en 7 días</button><small className="diagnosis-disclaimer">Orientación basada en fotografías; no sustituye una inspección profesional.</small></div>}
    </div></section>
    <section className="section diagnosis-history"><div className="section-head"><span className="kicker">TU HISTORIAL</span><h2>Consultas anteriores</h2><p>Tus diagnósticos quedan guardados de forma privada en tu cuenta.</p></div>
      {history.length ? <div className="history-list">{history.map((item) => <details key={item.id}><summary><span><b>{item.plantName || "Planta sin identificar"}</b><small>{new Date(item.createdAt).toLocaleDateString("es-ES")} · {item.provider}</small></span><span>Ver diagnóstico</span></summary><p>{item.response}</p></details>)}</div> : <div className="empty small">Todavía no tienes consultas guardadas.</div>}
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
