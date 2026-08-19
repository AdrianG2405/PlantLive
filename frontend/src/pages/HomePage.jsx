import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Bot, Camera, Search, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { PlantResult } from "../components/PlantResult";
import { AddPlantSetup } from "../components/AddPlantSetup";
import { starterPlants } from "../data/plants";
import { createCareProfile, findPlantPhoto, searchPlants, userDataApi } from "../services/plantliveApi";

const photoForAnalysis = (file) => new Promise((resolve, reject) => {
  const image = new Image();
  const url = URL.createObjectURL(file);
  image.onload = () => {
    const scale = Math.min(1, 1000 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    resolve(canvas.toDataURL("image/jpeg", .72));
  };
  image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo analizar una de las fotografías.")); };
  image.src = url;
});

export function HomePage({ addPlant, notify, authenticated }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState("");
  const [heroPhoto, setHeroPhoto] = useState("");
  const [pendingPlant, setPendingPlant] = useState(null);

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
    setPendingPlant(plant);
  };
  const confirmAdd = async (setup) => {
    const plant = pendingPlant;
    setAddingId(plant.id);
    try {
      const [plantUpload, substrateUpload] = await Promise.all([
        userDataApi.uploadPhoto(setup.plantPhoto.file), userDataApi.uploadPhoto(setup.substratePhoto.file),
      ]);
      const analysisPhotos = await Promise.all([photoForAnalysis(setup.plantPhoto.file), photoForAnalysis(setup.substratePhoto.file)]);
      const context = { tamanoMaceta: setup.potSize, sustratoActual: setup.currentSubstrate, observacion: "La primera foto muestra la planta completa y su maceta; la segunda, la superficie del sustrato. Estimar con prudencia proporción de maceta, retención visible y drenaje sin afirmar lo que no sea observable.", analysisPhotos };
      const completePlant = await createCareProfile(plant, context);
      await addPlant({ ...completePlant, potSize: setup.potSize, currentSubstrate: setup.currentSubstrate, plantPhoto: plantUpload.url, substratePhoto: substrateUpload.url, gallery: [plantUpload.url] });
      notify(completePlant.careProfilePending
        ? `${completePlant.nombreComun} se ha añadido con una ficha inicial.`
        : `${completePlant.nombreComun} se ha añadido a tu jardín.`);
      navigate("/plantas");
    } catch (error) { notify(error.message); }
    finally { setAddingId(""); setPendingPlant(null); }
  };
  const selectStarter = async (plant) => {
    setLoading(true);
    const imagen = await findPlantPhoto(plant.nombreCientifico).catch(() => null);
    setResults([{ ...plant, imagen }]);
    setLoading(false);
  };
  const addWish = async (plant) => {
    if (!authenticated) { notify("Inicia sesión para guardar tu lista de deseos."); navigate("/acceso", { state: { from: "/" } }); return; }
    setAddingId(plant.id);
    try { await addPlant({ ...plant, collectionStatus: "wishlist" }); notify(`${plant.nombreComun} se ha guardado en tu lista de deseos.`); navigate("/plantas"); }
    catch (error) { notify(error.message); }
    finally { setAddingId(""); }
  };

  return <><section className="hero"><motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}><span className="eyebrow"><Sparkles size={14} /> TU JARDÍN, MEJOR CUIDADO QUE NUNCA</span><h1>Conoce lo que tu planta <em>necesita.</em></h1><p>Encuentra cualquier especie, crea su calendario de cuidados y detecta problemas con ayuda de la IA.</p><a href="#buscar" className="primary big">Buscar una planta <ArrowRight size={18} /></a></motion.div><motion.div className={`hero-art ${heroPhoto ? "" : "photo-loading"}`} initial={{ opacity: 0, scale: .92, rotate: 2 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ delay: .15 }}>{heroPhoto ? <img src={heroPhoto} alt="Monstera deliciosa" width="500" height="500" fetchPriority="high" decoding="async" /> : <span>Cargando fotografía verificada…</span>}<div className="float-card"><span className="float-icon"><Bot size={18} /></span><div><b>Próximo riego</b><small>Monstera · mañana</small></div></div></motion.div></section>
    <section id="buscar" className="section search-section"><div className="section-head"><span className="kicker">AÑADE TU PLANTA</span><h2>Busca por nombre o usa una foto</h2><p>Elige la forma más fácil para ti. Después podrás crear su ficha y añadirla a Mis plantas.</p></div>
      <div className="plant-discovery-options">
        <div className="discovery-option active"><span><Search size={21} /></span><div><b>Sé cómo se llama</b><small>Busca por su nombre común o científico</small></div></div>
        <Link className="discovery-option photo-option" to="/diagnostico"><span><Camera size={21} /></span><div><b>No sé qué planta es</b><small>Haz o sube una foto para identificarla y añadirla</small></div><ArrowRight size={18} /></Link>
      </div>
      <form className={`ai-search ${loading ? "is-loading" : ""}`} onSubmit={search}><span><Search size={23} /></span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ej. calatea orbifolia, olivo, planta del dinero…" /><button className="primary" disabled={loading}>{loading ? <><span className="spinner" /> Buscando especies</> : <><Sparkles size={17} /> Buscar con IA</>}</button></form>
      {!results.length && <div className="quick-plants">{starterPlants.map((plant) => <button key={plant.id} onClick={() => selectStarter(plant)}>🌿 {plant.nombreComun}</button>)}</div>}
      {!!results.length && <><div className="results-summary"><b>{results.length} especies encontradas</b><span>Resultados taxonómicos directos; la IA solo prepara la ficha que elijas.</span></div><div className="plant-results-grid">{results.map((plant) => <PlantResult key={plant.id} plant={plant} onAdd={add} onWish={addWish} adding={addingId === plant.id} />)}</div></>}
    </section>
    <section className="section seo-discovery" aria-labelledby="plant-help-title">
      <span className="kicker">AYUDA PARA TUS PLANTAS</span>
      <h2 id="plant-help-title">Respuestas para cuidar e identificar plantas</h2>
      <p>Consulta guías claras sobre hojas amarillas, riego, luz, plagas y otros problemas frecuentes de las plantas de interior.</p>
      <div>
        <Link to="/aplicacion-cuidar-plantas"><b>Aplicación para cuidar plantas</b><span>Organiza tu colección y todos sus cuidados.</span><ArrowRight size={17} /></Link>
        <Link to="/identificar-plantas-por-foto"><b>Identificar plantas por foto</b><span>Descubre una especie usando imágenes claras.</span><ArrowRight size={17} /></Link>
        <Link to="/recordatorio-riego-plantas"><b>Recordatorios de riego</b><span>Organiza revisiones y registra cuándo has regado.</span><ArrowRight size={17} /></Link>
        <Link to="/blog/que-le-pasa-a-mi-planta"><b>¿Qué le pasa a mi planta?</b><span>Revisa síntomas y encuentra posibles causas.</span><ArrowRight size={17} /></Link>
        <Link to="/blog/hojas-amarillas-plantas"><b>Hojas amarillas en plantas</b><span>Distingue exceso de riego, falta de luz y otros problemas.</span><ArrowRight size={17} /></Link>
        <Link to="/blog/cuidado-plantas-interior"><b>Cómo cuidar plantas de interior</b><span>Guía completa de riego, luz, sustrato y abono.</span><ArrowRight size={17} /></Link>
        <Link to="/plantas-guia"><b>Guías por especie</b><span>Busca cuidados para monstera, poto, calatea y más plantas.</span><ArrowRight size={17} /></Link>
      </div>
    </section>
    <AddPlantSetup plant={pendingPlant} onCancel={() => setPendingPlant(null)} onConfirm={confirmAdd} loading={Boolean(addingId)} /></>;
}
