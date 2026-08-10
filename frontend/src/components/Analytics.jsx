import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

const STORAGE_KEY = "plantlive-analytics-consent";
const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();

function loadGoogleAnalytics() {
  if (!measurementId || window.gtag) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", measurementId, { send_page_view: false, anonymize_ip: true });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);
}

export function Analytics() {
  const location = useLocation();
  const [consent, setConsent] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  });

  useEffect(() => { if (consent === "accepted") loadGoogleAnalytics(); }, [consent]);
  useEffect(() => {
    if (consent !== "accepted" || !measurementId) return;
    loadGoogleAnalytics();
    window.gtag?.("event", "page_view", {
      page_title: document.title,
      page_location: window.location.href,
      page_path: `${location.pathname}${location.search}`,
    });
  }, [consent, location.pathname, location.search]);

  const choose = (value) => {
    try { localStorage.setItem(STORAGE_KEY, value); } catch { /* The preference remains active for this visit. */ }
    setConsent(value);
  };

  if (consent || !measurementId) return null;
  return <aside className="cookie-consent" aria-label="Preferencias de medición"><div><b>Tu privacidad importa</b><p>PlantLive utiliza medición anónima para saber qué secciones resultan útiles y mejorar la web. Puedes aceptar o continuar sin Analytics. <Link to="/privacidad">Consulta la política de privacidad de PlantLive</Link>.</p></div><div><button type="button" className="cookie-reject" onClick={() => choose("rejected")}>Solo necesarias</button><button type="button" className="cookie-accept" onClick={() => choose("accepted")}>Aceptar estadísticas</button></div></aside>;
}
