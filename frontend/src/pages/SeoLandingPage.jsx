import { ArrowRight, CheckCircle2, Leaf } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";
import { seoLandingPageBySlug } from "../data/seoLandingPages";

export function SeoLandingPage() {
  const { slug } = useParams();
  const page = seoLandingPageBySlug[slug];
  if (!page) return <Navigate to="/" replace />;

  return <article className="section blog-article seo-landing-page">
    <span className="kicker">{page.kicker}</span>
    <h1>{page.title}</h1>
    <p className="blog-lead">{page.intro}</p>
    <Leaf size={40} />
    {page.sections.map(([title, content], index) => <section className="blog-content-section" key={title}>
      <span>{String(index + 1).padStart(2, "0")}</span>
      <div><h2>{title}</h2><p>{content}</p></div>
    </section>)}
    <section className="guide-faq"><h2>Preguntas frecuentes</h2>{page.faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</section>
    <aside className="blog-cta"><h2>Empieza con PlantLive</h2><p>Organiza tus plantas y adapta los cuidados a las condiciones reales de tu casa.</p><Link className="primary" to={page.ctaTo}>{page.cta} <ArrowRight size={17} /></Link></aside>
    <section className="related-articles"><h2>También puede ayudarte</h2><div>
      <Link to="/blog/que-le-pasa-a-mi-planta"><small>DIAGNÓSTICO</small><b>¿Qué le pasa a mi planta?</b><CheckCircle2 size={16} /></Link>
      <Link to="/blog/hojas-amarillas-plantas"><small>PROBLEMAS</small><b>Hojas amarillas en plantas</b><CheckCircle2 size={16} /></Link>
      <Link to="/blog/cuando-regar-plantas-interior"><small>RIEGO</small><b>Cuándo regar plantas de interior</b><CheckCircle2 size={16} /></Link>
    </div></section>
  </article>;
}
