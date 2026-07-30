import { useEffect, useState } from "react";
import { Camera, Check, Droplets, FlaskConical, History, RefreshCw, Scissors, Sprout, X } from "lucide-react";
import { seasonalCareDays, userDataApi } from "../services/plantliveApi";

const careTypes = [
  ["water", "Riego", Droplets], ["fertilize", "Abono", FlaskConical],
  ["prune", "Poda", Scissors], ["repot", "Trasplante", Sprout],
  ["inspection", "Revisión", Check],
];
const labels = Object.fromEntries(careTypes.map(([value, label]) => [value, label]));

export function PlantModal({ plant, onClose, onUpdate, onRefreshCare, onRemove }) {
  const [draft, setDraft] = useState(plant);
  const [history, setHistory] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [refreshingCare, setRefreshingCare] = useState(false);
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
    <div className="care-grid"><div><b>☀️ Luz</b><p>{draft.luz}</p></div><div><b>📍 Ubicación ideal</b><p>{draft.ubicacion}</p></div><div><b>🪴 Sustrato recomendado</b><p>{draft.sustrato}</p></div><div><b>💧 Riego actual</b><p>Revisar aproximadamente cada {seasonalCareDays(draft, "riego")} días. {draft.riegoIndicador || "Comprueba antes la humedad."}</p><small>Verano: {draft.riegoVeranoDias || draft.riegoDias} días · Invierno: {draft.riegoInviernoDias || draft.riegoDias} días</small></div><div><b>🧪 Fertilizante</b><p>{draft.fertilizante}, revisar cada {seasonalCareDays(draft, "abono")} días en la estación actual.</p></div><div><b>🌡️ Ambiente</b><p>{draft.temperatura} · Humedad {draft.humedad}</p></div></div>
    <div className="warning">🐾 {draft.toxicidad}</div>
    <section className="care-history"><h3><History size={18} /> Registrar cuidado</h3><div className="care-buttons">{careTypes.map(([type, label, Icon]) => <button key={type} onClick={() => addCare(type)}><Icon size={16} /> {label}</button>)}</div>
      {!!history.length && <div className="care-timeline">{history.slice(0, 8).map((item) => <p key={item.id}><b>{labels[item.type] || item.type}</b><span>{new Date(item.completedAt).toLocaleDateString("es-ES")}</span></p>)}</div>}
    </section>
    <label className="notes">Notas<textarea value={draft.notes || ""} onChange={(event) => change({ notes: event.target.value })} placeholder="Cambios observados, tratamientos, preferencias…" /></label>
    <button className="danger" onClick={() => { onRemove(draft.instanceId); onClose(); }}>Eliminar de Mis plantas</button>
  </section></div>;
}
