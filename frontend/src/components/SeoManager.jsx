import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { articleBySlug } from "../data/blogArticles";
import { plantGuideBySlug } from "../data/plantGuides";

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
  "/plantas-guia": { title: "Cuidados de plantas de interior: fichas y guías · PlantLive", description: "Consulta fichas de plantas de interior con consejos de riego, luz, sustrato, abono y problemas frecuentes." },
  "/sobre-nosotros": { title: "Sobre PlantLive", description: "Conoce PlantLive y nuestra forma de ayudarte a cuidar tus plantas con información y seguimiento personalizados." },
  "/privacidad": { title: "Política de privacidad · PlantLive", description: "Información sobre privacidad y tratamiento de datos en PlantLive." },
  "/condiciones": { title: "Condiciones de uso · PlantLive", description: "Condiciones aplicables al uso de PlantLive." },
  "/eliminar-cuenta": { title: "Eliminar una cuenta de PlantLive", description: "Solicita y completa la eliminación definitiva de tu cuenta y los datos asociados en PlantLive." },
};

const privatePaths = new Set(["/panel", "/plantas", "/calendario", "/ajustes", "/acceso", "/restablecer", "/verificar-email", "/eliminar-cuenta"]);

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
    const blogSlug = pathname.startsWith("/blog/") ? pathname.slice(6) : "";
    const article = articleBySlug[blogSlug];
    const plantSlug = pathname.startsWith("/plantas-guia/") ? pathname.slice("/plantas-guia/".length) : "";
    const plant = plantGuideBySlug[plantSlug];
    const page = plant ? { title: `${plant.title} · PlantLive`, description: plant.description } : article ? { title: `${article.title} · PlantLive`, description: article.description } : (pages[pathname] || DEFAULT);
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
    document.getElementById("plantlive-structured-data")?.remove();
    if (plant) {
      const structured = document.createElement("script");
      structured.id = "plantlive-structured-data";
      structured.type = "application/ld+json";
      structured.text = JSON.stringify({ "@context": "https://schema.org", "@type": "Article", headline: plant.title, description: plant.description, mainEntityOfPage: canonicalUrl, author: { "@type": "Organization", name: "PlantLive", url: SITE }, about: { "@type": "Thing", name: plant.commonName, alternateName: [plant.scientificName, ...plant.aliases] } });
      document.head.appendChild(structured);
    }
  }, [pathname]);
  return null;
}
