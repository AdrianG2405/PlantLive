import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { articleBySlug } from "../data/blogArticles";
import { plantGuideBySlug } from "../data/plantGuides";
import { seoLandingPageBySlug } from "../data/seoLandingPages";

const SITE = "https://www.plantlive.es";
const DEFAULT = {
  title: "PlantLive: identificar plantas y aprender a cuidarlas",
  description: "Identifica plantas, descubre qué les pasa y consulta guías sobre hojas amarillas, riego, luz, plagas y cuidados de plantas de interior.",
};

const pages = {
  "/": DEFAULT,
  "/diagnostico": { title: "¿Qué le pasa a mi planta? Identificación y diagnóstico · PlantLive", description: "Sube fotos para identificar una planta y obtener orientación sobre hojas amarillas, manchas, plagas, riego y otros problemas frecuentes." },
  "/chatbot": { title: "Preguntas sobre plantas: asistente de cuidados · PlantLive", description: "Pregunta cómo cuidar una planta: riego, luz, hojas amarillas, abono, sustrato, plagas, trasplante y propagación." },
  "/blog": { title: "Consejos y guías para cuidar plantas · PlantLive", description: "Respuestas sobre plantas de interior, hojas amarillas, riego, luz, plagas, sustrato, abono, trasplantes y propagación." },
  "/plantas-guia": { title: "Plantas: fichas, nombres y cuidados por especie · PlantLive", description: "Busca fichas de plantas con información sobre nombres, riego, luz, sustrato, abono y problemas frecuentes." },
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
    const landing = seoLandingPageBySlug[pathname.slice(1)];
    const page = landing ? { title: `${landing.title} · PlantLive`, description: landing.description } : plant ? { title: `${plant.title} · PlantLive`, description: plant.description } : article ? { title: `${article.title} · PlantLive`, description: article.description } : (pages[pathname] || DEFAULT);
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
    if (plant || article || landing) {
      const structured = document.createElement("script");
      structured.id = "plantlive-structured-data";
      structured.type = "application/ld+json";
      const subject = landing || plant || article;
      structured.text = JSON.stringify({ "@context": "https://schema.org", "@graph": [
        { "@type": "Article", headline: subject.title, description: subject.description, mainEntityOfPage: canonicalUrl, author: { "@type": "Organization", name: "PlantLive", alternateName: "Plant Live", url: SITE }, ...(plant ? { about: { "@type": "Thing", name: plant.commonName, alternateName: [plant.scientificName, ...plant.aliases] } } : {}), inLanguage: "es" },
        ...((landing?.faqs || plant?.faqs) ? [{ "@type": "FAQPage", mainEntity: (landing?.faqs || plant.faqs).map(([question, answer]) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) }] : []),
      ] });
      document.head.appendChild(structured);
    }
  }, [pathname]);
  return null;
}
