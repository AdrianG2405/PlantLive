import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE = "https://www.plantlive.es";
const DEFAULT = {
  title: "PlantLive · Cuida tus plantas con ayuda inteligente",
  description: "Identifica plantas, organiza sus riegos, detecta posibles problemas y recibe consejos personalizados para mantenerlas sanas.",
};

const pages = {
  "/": DEFAULT,
  "/diagnostico": { title: "Diagnostica problemas y plagas en tus plantas · PlantLive", description: "Añade fotografías y síntomas para obtener orientación sobre posibles plagas, enfermedades y cuidados para tu planta." },
  "/chatbot": { title: "Chatbot para el cuidado de plantas · PlantLive", description: "Pregunta sobre riego, luz, abono, plagas o cualquier duda relacionada con tus plantas." },
  "/blog": { title: "Blog sobre cuidado de plantas · PlantLive", description: "Guías y consejos prácticos para cuidar mejor tus plantas durante todo el año." },
  "/blog/cuidar-plantas-vacaciones": { title: "Cómo cuidar tus plantas durante las vacaciones · PlantLive", description: "Consejos para mantener tus plantas hidratadas y sanas cuando te vas de vacaciones." },
  "/sobre-nosotros": { title: "Sobre PlantLive", description: "Conoce PlantLive y nuestra forma de ayudarte a cuidar tus plantas con información y seguimiento personalizados." },
  "/privacidad": { title: "Política de privacidad · PlantLive", description: "Información sobre privacidad y tratamiento de datos en PlantLive." },
  "/condiciones": { title: "Condiciones de uso · PlantLive", description: "Condiciones aplicables al uso de PlantLive." },
};

const privatePaths = new Set(["/panel", "/plantas", "/calendario", "/ajustes", "/acceso", "/restablecer", "/verificar-email"]);

function setMeta(name, content, property = false) {
  const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(property ? "property" : "name", name);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

export function SeoManager() {
  const { pathname } = useLocation();
  useEffect(() => {
    const page = pages[pathname] || DEFAULT;
    const canonicalUrl = `${SITE}${pathname === "/" ? "" : pathname}`;
    document.title = page.title;
    setMeta("description", page.description);
    setMeta("robots", privatePaths.has(pathname) ? "noindex, nofollow" : "index, follow");
    setMeta("og:title", page.title, true);
    setMeta("og:description", page.description, true);
    setMeta("og:url", canonicalUrl, true);
    setMeta("twitter:title", page.title);
    setMeta("twitter:description", page.description);
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement("link"); canonical.rel = "canonical"; document.head.appendChild(canonical); }
    canonical.href = canonicalUrl;
  }, [pathname]);
  return null;
}
