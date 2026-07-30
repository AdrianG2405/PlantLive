import { useState } from "react";
import { Bot, Leaf, Send, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { askPlantLive } from "../services/plantliveApi";

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
  const [loading, setLoading] = useState(false);

  const send = async (event) => {
    event?.preventDefault();
    const text = question.trim();
    if (!text || loading) return;
    if (!authenticated) {
      notify("Inicia sesión para preguntar al asistente botánico.");
      navigate("/acceso", { state: { from: "/" } });
      return;
    }
    const plant = plants.find((item) => item.instanceId === plantId);
    const userMessage = { role: "user", content: text };
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
        }) : undefined,
        historial: nextMessages.slice(1, -1),
      });
      setMessages((current) => [...current, { role: "assistant", content: data.respuesta }]);
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
        {messages.map((message, index) => <div key={index} className={`chat-message ${message.role}`}>{message.content}</div>)}
        {loading && <div className="chat-message assistant chat-typing"><i /><i /><i /></div>}
      </div>
      {messages.length === 1 && <button className="chat-suggestion" onClick={() => setQuestion("¿Puedo pasar mi lucky bamboo de agua a tierra?")}>¿Puedo pasar mi lucky bamboo a tierra?</button>}
      <form onSubmit={send}><textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Escribe tu pregunta…" maxLength={800} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }} /><button disabled={!question.trim() || loading} aria-label="Enviar"><Send size={18} /></button></form>
      <small className="chat-disclaimer">Orientación general. Ante intoxicaciones o riesgos graves, consulta a un profesional.</small>
    </section>}
  </>;
}
