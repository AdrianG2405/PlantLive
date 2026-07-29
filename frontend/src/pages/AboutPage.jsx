import { ArrowRight, BrainCircuit, Camera, CheckCircle2, Globe2, Heart, Leaf, ScanSearch, ShieldCheck, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const principles = [
  { icon: Leaf, title: "Cuidado comprensible", text: "Traducimos información botánica compleja en decisiones sencillas para el día a día." },
  { icon: BrainCircuit, title: "IA responsable", text: "Mostramos posibilidades y nivel de incertidumbre. Una fotografía orienta, pero no siempre confirma." },
  { icon: Globe2, title: "Diversidad real", text: "Trabajamos con catálogos botánicos abiertos y fotografías reales de especies de todo el mundo." },
];

export function AboutPage() {
  return <div className="about-page modern-about">
    <section className="about-story-hero">
      <motion.div className="about-story-copy" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
        <span className="eyebrow"><Sparkles size={14} /> SOBRE PLANTLIVE</span>
        <h1>Entender tus plantas debería sentirse <em>natural.</em></h1>
        <p>PlantLive une conocimiento botánico, observación e inteligencia artificial para ayudarte a cuidar mejor cada planta, sin convertirlo en algo complicado.</p>
        <div className="about-hero-actions"><Link className="primary" to="/diagnostico">Probar diagnóstico <ArrowRight size={18} /></Link><Link to="/">Explorar especies</Link></div>
      </motion.div>
      <motion.div className="about-visual" initial={{ opacity: 0, scale: .92 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: .12 }}>
        <div className="about-orbit"><Leaf size={62} /><span className="orbit-one"><Camera size={18} /></span><span className="orbit-two"><BrainCircuit size={18} /></span><span className="orbit-three"><Heart size={18} /></span></div>
        <article><ShieldCheck size={19} /><div><b>Orientación responsable</b><small>Observa, compara y actúa con prudencia</small></div></article>
      </motion.div>
    </section>

    <section className="about-metrics">
      <div><b>1–4</b><span>fotografías por análisis</span></div>
      <div><b>Global</b><span>catálogo botánico abierto</span></div>
      <div><b>24/7</b><span>tu jardín organizado</span></div>
      <div><b>Privado</b><span>historial en tu cuenta</span></div>
    </section>

    <section className="section about-purpose">
      <div className="about-purpose-heading"><span className="kicker">POR QUÉ EXISTIMOS</span><h2>Menos dudas.<br />Más plantas sanas.</h2></div>
      <div className="about-purpose-copy"><p>Una hoja amarilla puede significar demasiada agua, falta de luz, estrés o simplemente envejecimiento natural. Las respuestas genéricas suelen confundir más de lo que ayudan.</p><p>PlantLive reúne la especie, su entorno, los síntomas y el historial de cuidados para ofrecer una orientación más útil y personal.</p></div>
    </section>

    <section className="section about-principles"><div className="section-head"><span className="kicker">NUESTROS PRINCIPIOS</span><h2>Tecnología al servicio de lo vivo</h2></div><div className="principle-grid">{principles.map(({ icon: Icon, title, text }, index) => <motion.article key={title} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * .08 }}><span><Icon size={23} /></span><h3>{title}</h3><p>{text}</p></motion.article>)}</div></section>

    <section className="about-how"><div className="about-how-title"><span className="kicker light">CÓMO FUNCIONA</span><h2>De una duda a un plan claro.</h2><p>La IA no sustituye tu observación: la hace más útil.</p></div><div className="about-steps">
      <article><b>01</b><Camera /><h3>Observa</h3><p>Fotografía la planta completa y las zonas afectadas.</p></article>
      <article><b>02</b><ScanSearch /><h3>Comprende</h3><p>Identificamos la especie y valoramos causas probables.</p></article>
      <article><b>03</b><CheckCircle2 /><h3>Actúa</h3><p>Recibe pasos concretos y programa una revisión.</p></article>
    </div></section>

    <section className="about-cta"><span><Leaf size={25} /></span><h2>Tu próxima planta sana empieza con una buena observación.</h2><p>Explora especies libremente. Crea una cuenta solo cuando quieras guardar tu jardín o realizar un diagnóstico.</p><Link className="primary big" to="/diagnostico">Analizar una planta <ArrowRight size={18} /></Link></section>
  </div>;
}
