import { ArrowRight, CheckCircle2, Leaf, Search, ShieldAlert, Sprout } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { plantGuideBySlug, plantGuides } from "../data/plantGuides";

const normalized = (value) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function PlantGuidesPage() {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => plantGuides.filter((plant) => normalized([plant.commonName, plant.scientificName, ...plant.aliases].join(" ")).includes(normalized(query))), [query]);
  return <section className="section plant-guide-index"><span className="kicker">GUÍAS DE PLANTAS</span><h1>Cuidados de plantas de interior</h1><p>Consulta fichas públicas con recomendaciones de luz, riego, sustrato, abono y problemas frecuentes.</p><label className="guide-search"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Busca jade, lengua de suegra, guzmania…" /></label><div className="plant-guide-grid">{visible.map((plant) => <Link to={`/plantas-guia/${plant.slug}`} key={plant.slug}><span><Leaf size={27} /></span><small>FICHA DE CUIDADOS</small><h2>{plant.commonName}</h2><i>{plant.scientificName}</i><p>{plant.summary}</p><b>Consultar ficha <ArrowRight size={16} /></b></Link>)}</div>{!visible.length && <div className="guide-empty">Todavía no tenemos una ficha que coincida con esa búsqueda.</div>}</section>;
}

export function PlantGuidePage() {
  const { slug } = useParams();
  const plant = plantGuideBySlug[slug];
  if (!plant) return <Navigate to="/plantas-guia" replace />;
  const related = plantGuides.filter((item) => item.slug !== slug).slice(0, 3);
  return <article className="section plant-guide-detail"><Link className="blog-back" to="/plantas-guia">← Todas las fichas</Link><span className="kicker">GUÍA DE CUIDADOS</span><h1>{plant.title}</h1><i>{plant.scientificName}</i><p className="guide-lead">{plant.summary}</p><section className="guide-care-grid">{Object.entries(plant.care).map(([name, value]) => <article key={name}><Sprout size={20} /><h2>{name}</h2><p>{value}</p></article>)}</section><section className="guide-problems"><ShieldAlert size={30} /><div><h2>Problemas frecuentes</h2>{plant.problems.map((problem) => <p key={problem}><CheckCircle2 size={16} /> {problem}</p>)}</div></section><section className="guide-faq"><h2>Preguntas frecuentes sobre {plant.commonName}</h2>{plant.faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</section><aside className="blog-cta"><h2>Adapta los cuidados a tu casa</h2><p>La frecuencia real cambia según la maceta, el sustrato, la luz y la estación. Añade tu planta a PlantLive para hacer un seguimiento personalizado.</p><Link className="primary" to="/#buscar">Buscar y añadir esta planta <ArrowRight size={17} /></Link></aside><section className="related-articles"><h2>Otras plantas de interior</h2><div>{related.map((item) => <Link to={`/plantas-guia/${item.slug}`} key={item.slug}><small>FICHA</small><b>{item.commonName}</b><ArrowRight size={16} /></Link>)}</div></section></article>;
}
