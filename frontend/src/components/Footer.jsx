import { Sprout } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  return <footer>
    <b><Sprout size={20} /> PlantLive</b>
    <a className="instagram-link" href="https://www.instagram.com/plantlivex/" target="_blank" rel="noreferrer" aria-label="Seguir a PlantLive en Instagram"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg><span><strong>Síguenos en Instagram</strong><small>@plantlivex · Todas las novedades</small></span></a>
    <span>Fotografías: iNaturalist y Wikimedia Commons · <Link to="/blog">Blog</Link> · <Link to="/privacidad">Privacidad</Link> · <Link to="/condiciones">Condiciones</Link></span>
  </footer>;
}
