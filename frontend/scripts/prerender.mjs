import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { blogArticles } from "../src/data/blogArticles.js";
import { plantGuides } from "../src/data/plantGuides.js";
import { seoLandingPages } from "../src/data/seoLandingPages.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const template = await readFile(join(dist, "index.html"), "utf8");
const site = "https://www.plantlive.es";

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const link = (href, label) => `<a href="${href}">${escapeHtml(label)}</a>`;
const shell = (content) => `<div class="app prerendered-app">
  <header class="topbar"><a class="brand" href="/">PlantLive</a><nav>${link("/plantas-guia", "Guías de plantas")} ${link("/blog", "Consejos")} ${link("/diagnostico", "Diagnosticar")}</nav></header>
  <main>${content}</main>
  <footer><b>PlantLive</b> · Identifica, cuida y comprende tus plantas.</footer>
</div>`;

const articleMarkup = (article) => shell(`<article class="section blog-article">
  ${link("/blog", "← Todas las guías")}
  <p class="kicker">${escapeHtml(article.category)}</p>
  <h1>${escapeHtml(article.title)}</h1>
  <p class="blog-lead">${escapeHtml(article.intro)}</p>
  ${article.sections.map(([heading, body]) => `<section class="blog-content-section"><div><h2>${escapeHtml(heading)}</h2><p>${escapeHtml(body)}</p></div></section>`).join("")}
  <aside class="blog-tip-box"><h2>Resumen práctico</h2>${article.tips.map((tip) => `<p>${escapeHtml(tip)}</p>`).join("")}</aside>
  <p>${link(article.ctaTo, article.cta)}</p>
</article>`);

const guideMarkup = (plant) => shell(`<article class="section plant-guide-detail">
  ${link("/plantas-guia", "← Todas las fichas")}
  <p class="kicker">GUÍA DE CUIDADOS</p>
  <h1>${escapeHtml(plant.title)}</h1>
  <p><i>${escapeHtml(plant.scientificName)}</i></p>
  <p class="guide-lead">${escapeHtml(plant.summary)}</p>
  <section class="guide-care-grid">${Object.entries(plant.care).map(([heading, body]) => `<article><h2>${escapeHtml(heading)}</h2><p>${escapeHtml(body)}</p></article>`).join("")}</section>
  <section class="guide-problems"><div><h2>Problemas frecuentes</h2>${plant.problems.map((problem) => `<p>${escapeHtml(problem)}</p>`).join("")}</div></section>
  <section class="guide-faq"><h2>Preguntas frecuentes sobre ${escapeHtml(plant.commonName)}</h2>${plant.faqs.map(([question, answer]) => `<details><summary>${escapeHtml(question)}</summary><p>${escapeHtml(answer)}</p></details>`).join("")}</section>
</article>`);

const landingMarkup = (page) => shell(`<article class="section blog-article seo-landing-page">
  <p class="kicker">${escapeHtml(page.kicker)}</p>
  <h1>${escapeHtml(page.title)}</h1>
  <p class="blog-lead">${escapeHtml(page.intro)}</p>
  ${page.sections.map(([heading, body]) => `<section class="blog-content-section"><div><h2>${escapeHtml(heading)}</h2><p>${escapeHtml(body)}</p></div></section>`).join("")}
  <section class="guide-faq"><h2>Preguntas frecuentes</h2>${page.faqs.map(([question, answer]) => `<details><summary>${escapeHtml(question)}</summary><p>${escapeHtml(answer)}</p></details>`).join("")}</section>
  <p>${link(page.ctaTo, page.cta)}</p>
</article>`);

const routes = [
  {
    path: "/",
    title: "PlantLive: identificar plantas y aprender a cuidarlas",
    description: "Identifica plantas, descubre qué les pasa y consulta guías sobre hojas amarillas, riego, luz, plagas y cuidados de plantas de interior.",
    body: shell(`<section class="hero"><div><p class="eyebrow">IDENTIFICAR Y CUIDAR PLANTAS</p><h1>Conoce lo que tu planta necesita</h1><p>Busca plantas, organiza sus cuidados y encuentra posibles causas de hojas amarillas, manchas, plagas y otros problemas frecuentes.</p>${link("/diagnostico", "Identificar o diagnosticar una planta")}</div></section><section class="section seo-discovery"><h2>Guías para cuidar tus plantas</h2><p>${link("/blog/que-le-pasa-a-mi-planta", "¿Qué le pasa a mi planta?")} · ${link("/blog/hojas-amarillas-plantas", "Hojas amarillas en plantas")} · ${link("/blog/cuidado-plantas-interior", "Cuidado de plantas de interior")} · ${link("/plantas-guia", "Guías por especie")}</p></section>`),
    schema: { "@context": "https://schema.org", "@graph": [{ "@type": "WebSite", name: "PlantLive", alternateName: "Plant Live", url: `${site}/`, inLanguage: "es" }, { "@type": "Organization", name: "PlantLive", alternateName: "Plant Live", url: `${site}/`, logo: `${site}/brand/plantlive-logo-horizontal.png` }] },
  },
  {
    path: "/blog",
    title: "Consejos y guías para cuidar plantas · PlantLive",
    description: "Respuestas sobre plantas de interior, hojas amarillas, riego, luz, plagas, sustrato, abono, trasplantes y propagación.",
    body: shell(`<section class="section blog-index"><p class="kicker">BLOG PLANTLIVE</p><h1>Guías prácticas para cuidar plantas</h1><p class="blog-index-lead">Respuestas claras para identificar problemas y cuidar mejor tus plantas.</p><div class="blog-grid">${blogArticles.map((article) => `<article class="blog-card"><div><p>${escapeHtml(article.category)}</p><h2>${link(`/blog/${article.slug}`, article.title)}</h2><p>${escapeHtml(article.description)}</p></div></article>`).join("")}</div></section>`),
  },
  {
    path: "/plantas-guia",
    title: "Plantas: fichas, nombres y cuidados por especie · PlantLive",
    description: "Busca fichas de plantas con información sobre nombres, riego, luz, sustrato, abono y problemas frecuentes.",
    body: shell(`<section class="section plant-guide-index"><p class="kicker">GUÍAS DE PLANTAS</p><h1>Cuidados de plantas por especie</h1><p>Fichas para reconocer plantas y adaptar su riego, luz y sustrato.</p><div class="plant-guide-grid">${plantGuides.map((plant) => `<article><h2>${link(`/plantas-guia/${plant.slug}`, plant.commonName)}</h2><p><i>${escapeHtml(plant.scientificName)}</i></p><p>${escapeHtml(plant.summary)}</p></article>`).join("")}</div></section>`),
  },
  {
    path: "/diagnostico",
    title: "¿Qué le pasa a mi planta? Identificación y diagnóstico · PlantLive",
    description: "Sube fotos para identificar una planta y obtener orientación sobre hojas amarillas, manchas, plagas, riego y otros problemas frecuentes.",
    body: shell(`<section class="section"><p class="kicker">DIAGNÓSTICO DE PLANTAS</p><h1>Descubre qué le pasa a tu planta</h1><p>Utiliza fotografías y síntomas para identificar la planta y revisar posibles problemas de riego, luz, raíces o plagas.</p>${link("/blog/que-le-pasa-a-mi-planta", "Cómo revisar una planta paso a paso")}</section>`),
  },
  {
    path: "/chatbot",
    title: "Preguntas sobre plantas: asistente de cuidados · PlantLive",
    description: "Pregunta cómo cuidar una planta: riego, luz, hojas amarillas, abono, sustrato, plagas, trasplante y propagación.",
    body: shell(`<section class="section"><p class="kicker">ASISTENTE DE PLANTAS</p><h1>Resuelve tus dudas sobre plantas</h1><p>Consulta preguntas sobre cuidados, riego, luz, abono, plagas, sustrato y trasplantes.</p>${link("/blog", "Consultar las guías de plantas")}</section>`),
  },
];

for (const page of seoLandingPages) {
  routes.push({
    path: `/${page.slug}`,
    title: `${page.title} · PlantLive`,
    description: page.description,
    body: landingMarkup(page),
    schema: { "@context": "https://schema.org", "@graph": [
      { "@type": "Article", headline: page.title, description: page.description, mainEntityOfPage: `${site}/${page.slug}`, author: { "@type": "Organization", name: "PlantLive", alternateName: "Plant Live" }, inLanguage: "es" },
      { "@type": "FAQPage", mainEntity: page.faqs.map(([question, answer]) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) },
    ] },
  });
}

for (const article of blogArticles) {
  routes.push({
    path: `/blog/${article.slug}`,
    title: `${article.title} · PlantLive`,
    description: article.description,
    body: articleMarkup(article),
    schema: { "@context": "https://schema.org", "@type": "Article", headline: article.title, description: article.description, mainEntityOfPage: `${site}/blog/${article.slug}`, author: { "@type": "Organization", name: "PlantLive" }, inLanguage: "es" },
  });
}

for (const plant of plantGuides) {
  routes.push({
    path: `/plantas-guia/${plant.slug}`,
    title: `${plant.title} · PlantLive`,
    description: plant.description,
    body: guideMarkup(plant),
    schema: { "@context": "https://schema.org", "@graph": [
      { "@type": "Article", headline: plant.title, description: plant.description, mainEntityOfPage: `${site}/plantas-guia/${plant.slug}`, author: { "@type": "Organization", name: "PlantLive" }, about: { "@type": "Thing", name: plant.commonName, alternateName: [plant.scientificName, ...plant.aliases] }, inLanguage: "es" },
      { "@type": "FAQPage", mainEntity: plant.faqs.map(([question, answer]) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) },
    ] },
  });
}

for (const route of routes) {
  const canonical = `${site}${route.path === "/" ? "/" : route.path}`;
  const schema = route.schema ? `<script id="plantlive-static-structured-data" type="application/ld+json">${JSON.stringify(route.schema).replaceAll("<", "\\u003c")}</script>` : "";
  let html = template
    .replace(/<title>.*?<\/title>/s, `<title>${escapeHtml(route.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${escapeHtml(route.description)}" />`)
    .replace(/<link rel="canonical" href="[^"]*"\s*\/>/, `<link rel="canonical" href="${canonical}" />`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/>/, `<meta property="og:title" content="${escapeHtml(route.title)}" />`)
    .replace(/<meta property="og:description" content="[^"]*"\s*\/>/, `<meta property="og:description" content="${escapeHtml(route.description)}" />`)
    .replace(/<meta property="og:url" content="[^"]*"\s*\/>/, `<meta property="og:url" content="${canonical}" />`)
    .replace("</head>", `${schema}</head>`)
    .replace('<div id="root"></div>', `<div id="root">${route.body}</div>`);
  const output = route.path === "/" ? join(dist, "index.html") : join(dist, route.path.slice(1), "index.html");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, html, "utf8");
}

console.log(`Prerendered ${routes.length} public routes for search engines.`);
