import { useEffect, useState } from "react";
import { Bot, Camera, ImagePlus, Leaf, Send, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { askPlantLive } from "../services/plantliveApi";
import { trackEvent } from "../utils/analytics";
import { capturePhoto } from "../utils/nativeCamera";

const welcome = {
  role: "assistant",
  content: "Hola, soy el asistente botánico de PlantLive. Pregúntame sobre riego, trasplantes, sustratos, luz o cualquier cuidado.",
};

export function PlantChatbot({ plants, authenticated, notify }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([welcome]);
  const [question, setQuestion] = useState("");
  const [plantId, setPlantId] = useState("");
  const [image, setImage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const openForPlant = (event) => {
      setOpen(true);
      setPlantId(event.detail?.plantId || "");
      setQuestion(event.detail?.question || "");
    };
    window.addEventListener("plantlive:open-chat", openForPlant);
    return () => window.removeEventListener("plantlive:open-chat", openForPlant);
  }, []);

  const loadImage = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) return notify("La imagen no puede superar 8 MB.");
    const preview = new Image();
    const url = URL.createObjectURL(file);
    preview.onload = () => {
      const scale = Math.min(1, 1100 / Math.max(preview.width, preview.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(preview.width * scale);
      canvas.height = Math.round(preview.height * scale);
      canvas.getContext("2d").drawImage(preview, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      setImage(canvas.toDataURL("image/jpeg", .8));
    };
    preview.onerror = () => { URL.revokeObjectURL(url); notify("No se pudo leer la imagen."); };
    preview.src = url;
  };

  const send = async (event) => {
    event?.preventDefault();
    const text = question.trim() || (image ? "¿Qué observas en esta planta?" : "");
    if (!text || loading) return;
    if (!authenticated) {
      notify("Inicia sesión para preguntar al asistente botánico.");
      navigate("/acceso", { state: { from: "/" } });
      return;
    }
    const plant = plants.find((item) => item.instanceId === plantId);
    const userMessage = { role: "user", content: text, image };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setQuestion("");
    setLoading(true);
    try {
      const data = await askPlantLive({
        pregunta: text,
        planta: plant?.nombreCientifico,
        contexto: plant ? JSON.stringify({
          ubicacion: plant.homeLocation || plant.ubicacion,
          sustrato: plant.currentSubstrate || plant.sustrato,
          maceta: plant.potSize,
          luz: plant.exposure || plant.luz,
          fotoPlantaGuardada: plant.plantPhoto || undefined,
          fotoSustratoGuardada: plant.substratePhoto || undefined,
          proximoRiego: plant.nextWater,
          proximoAbono: plant.nextFeed,
        }) : undefined,
        historial: nextMessages.slice(1, -1),
        imagen: image || undefined,
      });
      setMessages((current) => [...current, { role: "assistant", content: data.respuesta }]);
      trackEvent("chatbot_question_answered", { has_plant_context: Boolean(plant), has_image: Boolean(image) });
    } catch (error) {
      notify(error.message);
      setMessages((current) => [...current, {
        role: "assistant",
        content: "No he podido responder en este momento. Inténtalo de nuevo dentro de unos segundos.",
      }]);
    } finally {
      setLoading(false);
    }
  };

  return <>
    <button className={`chat-launcher ${open ? "is-open" : ""}`} onClick={() => setOpen(!open)} aria-label={open ? "Cerrar asistente" : "Abrir asistente botánico"}>
      {open ? <X size={23} /> : <Bot size={25} />}
      {!open && <span>Pregunta a PlantLive</span>}
    </button>
    {open && <section className="plant-chat" aria-label="Asistente botánico">
      <header><span><Leaf size={19} /></span><div><b>Asistente PlantLive</b><small>Consejos botánicos con IA</small></div><button onClick={() => setOpen(false)} aria-label="Cerrar"><X size={18} /></button></header>
      {!!plants.length && <select value={plantId} onChange={(event) => setPlantId(event.target.value)}>
        <option value="">Pregunta general</option>
        {plants.map((plant) => <option key={plant.instanceId} value={plant.instanceId}>{plant.nickname || plant.nombreComun}</option>)}
      </select>}
      <div className="chat-messages">
        {messages.map((message, index) => <div key={index} className={`chat-message ${message.role}`}>{message.image && <img className="chat-message-image" src={message.image} alt="Imagen enviada al asistente" />}{message.content}</div>)}
        {loading && <div className="chat-message assistant chat-typing"><i /><i /><i /></div>}
      </div>
      {messages.length === 1 && <button className="chat-suggestion" onClick={() => setQuestion("¿Puedo pasar mi lucky bamboo de agua a tierra?")}>¿Puedo pasar mi lucky bamboo a tierra?</button>}
      {image && <div className="chat-image-context"><img src={image} alt="Foto adjunta" /><span><b>Foto añadida al contexto</b><small>Puedes seguir preguntando sobre ella</small></span><button onClick={() => setImage("")} aria-label="Quitar fotografía"><Trash2 size={16} /></button></div>}
      <form className="chat-composer" onSubmit={send}><div className="chat-photo-actions"><button type="button" className="chat-attach" title="Hacer una foto" onClick={() => capturePhoto(loadImage, notify)}><Camera size={19} /></button><label className="chat-attach" title="Elegir de la galería"><ImagePlus size={19} /><input type="file" accept="image/jpeg,image/png,image/webp" onChange={loadImage} /></label></div><textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={image ? "Pregunta algo sobre la foto…" : "Escribe tu pregunta…"} maxLength={800} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }} /><button disabled={(!question.trim() && !image) || loading} aria-label="Enviar"><Send size={18} /></button></form>
      <small className="chat-disclaimer">Orientación general. Ante intoxicaciones o riesgos graves, consulta a un profesional.</small>
    </section>}
  </>;
}
