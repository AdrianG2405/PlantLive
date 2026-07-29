import { Droplets, MapPin, Plus, Sun } from "lucide-react";
import { motion } from "framer-motion";

export function PlantResult({ plant, onAdd, adding }) {
  return <motion.article className="result-card plant-choice" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -6 }}>
    <div className={`plant-visual ${plant.imagen ? "" : "no-photo"}`}>
      {plant.imagen ? <img src={plant.imagen} alt={plant.nombreComun} loading="lazy" /> : <span>Esta especie todavía no tiene una fotografía verificable en las fuentes abiertas</span>}
    </div>
    <div className="result-main"><span className="pill">{plant.categoria}</span>
      <h3>{plant.nombreComun}</h3><i>{plant.nombreCientifico}</i><p>{plant.descripcion}</p>
      {plant.luz ? <div className="care-preview"><span><Sun size={15} /> {plant.luz}</span><span><Droplets size={15} /> Cada ~{plant.riegoDias} días</span><span><MapPin size={15} /> {plant.ubicacion}</span></div> : <div className="care-preview pending-care"><span>La ficha de cuidados se prepara al añadirla</span></div>}
      <button className="primary" disabled={adding} onClick={() => onAdd(plant)}>{adding ? <><span className="spinner" /> Preparando ficha…</> : <><Plus size={17} /> Añadir a Mis plantas</>}</button>
    </div>
  </motion.article>;
}
