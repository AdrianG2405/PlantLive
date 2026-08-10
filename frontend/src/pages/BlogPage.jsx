import { ArrowRight, BookOpen, CheckCircle2, Leaf } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";
import { articleBySlug, blogArticles } from "../data/blogArticles";

export function BlogPage() {
  return <section className="section blog-index"><span className="kicker">BLOG PLANTLIVE</span><h1>Guías prácticas para cuidar mejor tus plantas</h1><p className="blog-index-lead">Respuestas claras sobre riego, luz, macetas, sustratos, plagas y propagación. Empieza por la guía general o busca el problema que quieres resolver.</p><div className="blog-grid">{blogArticles.map((article, index) => <Link className={`blog-card ${index === 0 ? "featured" : ""}`} to={`/blog/${article.slug}`} key={article.slug}><span><Leaf size={28} /></span><div><small>{article.category}</small><h2>{article.title}</h2><p>{article.description}</p><b>Leer la guía <ArrowRight size={16} /></b></div></Link>)}</div></section>;
}

export function BlogArticlePage() {
  const { slug } = useParams();
  const article = articleBySlug[slug];
  if (!article) return <Navigate to="/blog" replace />;
  const related = blogArticles.filter((item) => item.slug !== slug).slice(0, 3);
  return <article className="section blog-article"><Link className="blog-back" to="/blog">← Todas las guías</Link><span className="kicker">{article.category}</span><h1>{article.title}</h1><p className="blog-lead">{article.intro}</p><BookOpen size={40} />{article.sections.map(([title, content], index) => <section className="blog-content-section" key={title}><span>{String(index + 1).padStart(2, "0")}</span><div><h2>{title}</h2><p>{content}</p></div></section>)}<aside className="blog-tip-box"><h2>Resumen práctico</h2>{article.tips.map((tip) => <p key={tip}><CheckCircle2 size={17} /> {tip}</p>)}</aside><div className="blog-cta"><h2>Adapta estos consejos a tu planta</h2><p>Guarda sus condiciones reales y utiliza PlantLive para llevar un seguimiento en lugar de aplicar una rutina genérica.</p><Link className="primary" to={article.ctaTo}>{article.cta} <ArrowRight size={17} /></Link></div><section className="related-articles"><h2>También puede ayudarte</h2><div>{related.map((item) => <Link to={`/blog/${item.slug}`} key={item.slug}><small>{item.category}</small><b>{item.title}</b><ArrowRight size={16} /></Link>)}</div></section></article>;
}

export const VacationBlogPage = BlogArticlePage;
