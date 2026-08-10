import { useEffect, useState } from "react";
import { ArrowRight, Bot, CalendarDays, Camera, CheckCircle2, Leaf, Search, Sparkles, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { trackEvent } from "../utils/analytics";

const steps = [
  { icon: Sparkles, kicker: "BIENVENIDO A PLANTLIVE", title: "Vamos a crear tu jardín", text: "En menos de dos minutos puedes añadir tu primera planta y preparar un seguimiento adaptado a tu casa." },
  { icon: Search, kicker: "PASO 1 · ENCUENTRA LA PLANTA", title: "Busca su nombre o haz una foto", text: "Si sabes cómo se llama, búscala por su nombre común o científico. Si no lo sabes, PlantLive puede orientarte a partir de fotografías." },
  { icon: Camera, kicker: "PASO 2 · PERSONALIZA", title: "Añade la planta y su sustrato", text: "Las fotos, el tamaño de la maceta, el sustrato y la luz real ayudan a adaptar mejor las revisiones de riego y los consejos." },
  { icon: CalendarDays, kicker: "PASO 3 · HAZ SEGUIMIENTO", title: "Consulta, registra y pregunta", text: "Revisa el calendario, registra cuidados y pregunta al chatbot. También puedes diagnosticar síntomas y posibles plagas con nuevas fotos." },
];

export function FirstUseGuide({ user, plantCount, loadingPlants }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const storageKey = user ? `plantlive-onboarding-${user.id}` : "";
  useEffect(() => {
    if (!user || loadingPlants || plantCount > 0) return;
    try { if (!localStorage.getItem(storageKey)) { setOpen(true); trackEvent("onboarding_started"); } } catch { setOpen(true); }
  }, [loadingPlants, plantCount, storageKey, user]);
  useEffect(() => {
    const reopen = () => { setStep(0); setOpen(true); };
    window.addEventListener("plantlive:open-onboarding", reopen);
    return () => window.removeEventListener("plantlive:open-onboarding", reopen);
  }, []);
  if (!user || !open) return null;
  const current = steps[step], Icon = current.icon;
  const complete = (path) => {
    try { localStorage.setItem(storageKey, "completed"); } catch { /* The guide can appear again if storage is blocked. */ }
    setOpen(false); setStep(0); trackEvent("onboarding_completed", { destination: path }); navigate(path);
  };
  const skip = () => { try { localStorage.setItem(storageKey, "skipped"); } catch { /* Ignore. */ } setOpen(false); };
  return <div className="onboarding-backdrop"><section className="first-use-guide" aria-modal="true" role="dialog"><button className="onboarding-close" onClick={skip} aria-label="Cerrar guía"><X size={19} /></button><div className="onboarding-progress">{steps.map((_, index) => <i className={index <= step ? "active" : ""} key={index} />)}</div><div className="onboarding-icon"><Icon size={34} /></div><span className="kicker">{current.kicker}</span><h2>{current.title}</h2><p>{current.text}</p>{step < steps.length - 1 ? <div className="onboarding-actions"><button className="onboarding-skip" onClick={skip}>Ahora no</button><button className="primary" onClick={() => setStep(step + 1)}>Continuar <ArrowRight size={17} /></button></div> : <><div className="onboarding-feature-row"><span><Leaf size={17} /> Colección</span><span><CalendarDays size={17} /> Calendario</span><span><Bot size={17} /> Chatbot</span></div><div className="onboarding-final-actions"><button onClick={() => complete("/diagnostico")}><Camera size={18} /> No sé cuál es</button><button className="primary" onClick={() => complete("/#buscar")}><CheckCircle2 size={18} /> Buscar mi primera planta</button></div></>}</section></div>;
}
