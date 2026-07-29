import { Sprout } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  return <footer><b><Sprout size={20} /> PlantLive</b><span>Fotografías: iNaturalist y Wikimedia Commons · <Link to="/privacidad">Privacidad y condiciones</Link></span></footer>;
}
