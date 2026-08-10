import { useState } from "react";
import { MessageSquare, Send, X } from "lucide-react";
import { userDataApi } from "../services/plantliveApi";
import { trackEvent } from "../utils/analytics";

export function FeedbackButton({ user, notify }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("idea");
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  if (!user) return null;
  const submit = async (event) => {
    event.preventDefault();
    if (comment.trim().length < 5) return notify("Cuéntanos un poco más para poder ayudarte.");
    setSending(true);
    try {
      await userDataApi.feedback({ type, rating: 0, comment: comment.trim(), reference: window.location.pathname });
      trackEvent("feedback_submitted", { feedback_type: type });
      setComment(""); setOpen(false); notify("Gracias. Hemos recibido tu comentario.");
    } catch (error) { notify(error.message); }
    finally { setSending(false); }
  };
  return <><button className="feedback-launcher" onClick={() => setOpen(true)}><MessageSquare size={17} /> <span>Comentarios</span></button>{open && <div className="feedback-backdrop" onClick={() => setOpen(false)}><section className="feedback-modal" onClick={(event) => event.stopPropagation()}><button className="feedback-close" onClick={() => setOpen(false)} aria-label="Cerrar"><X size={19} /></button><span className="kicker">AYÚDANOS A MEJORAR</span><h2>Cuéntanos qué piensas</h2><p>¿Has encontrado un error, echas algo en falta o quieres proponernos una mejora?</p><form onSubmit={submit}><label>Tipo de comentario<select value={type} onChange={(event) => setType(event.target.value)}><option value="idea">Idea o sugerencia</option><option value="bug">Algo no funciona</option><option value="general">Comentario general</option></select></label><label>Tu comentario<textarea required minLength="5" maxLength="1000" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Describe lo que has visto o lo que te gustaría encontrar…" /></label><button className="primary" disabled={sending}><Send size={17} /> {sending ? "Enviando…" : "Enviar comentario"}</button></form></section></div>}</>;
}
