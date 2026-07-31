import { Sprout } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  return <footer><b><Sprout size={20} /> PlantLive <small className="beta-badge">BETA GRATUITA</small></b><span>Fotografías: iNaturalist y Wikimedia Commons · <Link to="/privacidad">Privacidad</Link> · <Link to="/condiciones">Condiciones</Link></span></footer>;
}
