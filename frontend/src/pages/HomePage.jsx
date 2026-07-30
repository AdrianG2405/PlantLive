import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Bot, Search, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { PlantResult } from "../components/PlantResult";
import { starterPlants } from "../data/plants";
import { createCareProfile, findPlantPhoto, searchPlants } from "../services/plantliveApi";

export function HomePage({ addPlant, notify, authenticated }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState("");
  const [heroPhoto, setHeroPhoto] = useState("");

  useEffect(() => {
    findPlantPhoto("Monstera deliciosa").then(setHeroPhoto).catch(() => {});
  }, []);

  const search = async (event) => {
    event.preventDefault();
    if (query.trim().length < 2) return;
    setLoading(true); setResults([]);
    try { setResults(await searchPlants(query)); }
    catch (error) { notify(error.message || "No se pudo completar la búsqueda. Inténtalo de nuevo."); }
    finally { setLoading(false); }
  };
  const add = async (plant) => {
    if (!authenticated) {
      notify("Inicia sesión para guardar plantas en tu jardín.");
      navigate("/acceso", { state: { from: "/" } });
      return;
    }
    setAddingId(plant.id);
    try {
      const completePlant = plant.luz ? plant : await createCareProfile(plant);
      await addPlant(completePlant);
      notify(completePlant.careProfilePending
        ? `${completePlant.nombreComun} se ha añadido con una ficha inicial.`
        : `${completePlant.nombreComun} se ha añadido a tu jardín.`);
      navigate("/plantas");
    } catch (error) { notify(error.message); }
    finally { setAddingId(""); }
  };
  const selectStarter = async (plant) => {
    setLoading(true);
    const imagen = await findPlantPhoto(plant.nombreCientifico).catch(() => null);
    setResults([{ ...plant, imagen }]);
    setLoading(false);
  };

  return <><section className="hero"><motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}><span className="eyebrow"><Sparkles size={14} /> TU JARDÍN, MEJOR CUIDADO QUE NUNCA</span><h1>Conoce lo que tu planta <em>necesita.</em></h1><p>Encuentra cualquier especie, crea su calendario de cuidados y detecta problemas con ayuda de la IA.</p><a href="#buscar" className="primary big">Buscar una planta <ArrowRight size={18} /></a></motion.div><motion.div className={`hero-art ${heroPhoto ? "" : "photo-loading"}`} initial={{ opacity: 0, scale: .92, rotate: 2 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ delay: .15 }}>{heroPhoto ? <img src={heroPhoto} alt="Monstera deliciosa" /> : <span>Cargando fotografía verificada…</span>}<div className="float-card"><span className="float-icon"><Bot size={18} /></span><div><b>Próximo riego</b><small>Monstera · mañana</small></div></div></motion.div></section>
    <section id="buscar" className="section search-section"><div className="section-head"><span className="kicker">EXPLORAR</span><h2>Una enciclopedia sin límites</h2><p>Escribe un nombre común o científico y la IA prepara su ficha de cuidados.</p></div>
      <form className={`ai-search ${loading ? "is-loading" : ""}`} onSubmit={search}><span><Search size={23} /></span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ej. calatea orbifolia, olivo, planta del dinero…" /><button className="primary" disabled={loading}>{loading ? <><span className="spinner" /> Buscando especies</> : <><Sparkles size={17} /> Buscar con IA</>}</button></form>
      {!results.length && <div className="quick-plants">{starterPlants.map((plant) => <button key={plant.id} onClick={() => selectStarter(plant)}>🌿 {plant.nombreComun}</button>)}</div>}
      {!!results.length && <><div className="results-summary"><b>{results.length} especies encontradas</b><span>Resultados taxonómicos directos; la IA solo prepara la ficha que elijas.</span></div><div className="plant-results-grid">{results.map((plant) => <PlantResult key={plant.id} plant={plant} onAdd={add} adding={addingId === plant.id} />)}</div></>}
    </section></>;
}
