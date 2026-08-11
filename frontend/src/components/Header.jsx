import { useState } from "react";
import { NavLink } from "react-router-dom";
import { BookOpen, Bot, CalendarDays, HeartPulse, LayoutDashboard, Leaf, LogIn, LogOut, MoreHorizontal, Search, Settings, Sprout, Users, X } from "lucide-react";
import { useAuth } from "../contexts/authStore";

export function Header() {
  const { user, logout } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const active = ({ isActive }) => isActive ? "active" : "";
  return <><header className="topbar">
    <NavLink className="brand" to="/"><span><Sprout size={21} /></span> PlantLive</NavLink>
    <nav className="desktop-nav">
      <NavLink className={active} end to="/"><Search size={16} /> <span>Explorar</span></NavLink>
      {user && <NavLink className={active} to="/panel"><LayoutDashboard size={16} /> <span>Panel</span></NavLink>}
      <NavLink className={active} to="/plantas"><Leaf size={16} /> <span>Mis plantas</span></NavLink>
      {user && <NavLink className={active} to="/calendario"><CalendarDays size={16} /> <span>Calendario</span></NavLink>}
      <NavLink className="secondary-nav" to="/sobre-nosotros"><Users size={16} /> <span>Nosotros</span></NavLink>
      <NavLink className="secondary-nav" to="/blog"><BookOpen size={16} /> <span>Blog</span></NavLink>
      <NavLink className={active} to="/chatbot"><Bot size={16} /> <span>Chatbot</span></NavLink>
      <NavLink className={({ isActive }) => `nav-cta ${isActive ? "active" : ""}`} to="/diagnostico"><HeartPulse size={17} /> <span>Diagnosticar</span></NavLink>
      {user ? <><NavLink className={active} to="/ajustes" title="Ajustes"><Settings size={17} /></NavLink><button className="user-menu" onClick={logout} title="Cerrar sesión"><span>{user.name.split(" ")[0]}</span><LogOut size={16} /></button></> : <NavLink className={active} to="/acceso"><LogIn size={16} /> <span>Entrar</span></NavLink>}
    </nav>
    {user ? <div className="mobile-account-wrap"><button className={`mobile-account ${accountOpen ? "active" : ""}`} onClick={() => { setAccountOpen(!accountOpen); setMoreOpen(false); }} aria-expanded={accountOpen}><span>{user.name.charAt(0).toUpperCase()}</span><Settings size={17} /></button>{accountOpen && <nav className="mobile-account-menu" aria-label="Menú de cuenta"><NavLink to="/panel" onClick={() => setAccountOpen(false)}><LayoutDashboard size={17} /> Mi panel</NavLink><NavLink to="/ajustes" onClick={() => setAccountOpen(false)}><Settings size={17} /> Ajustes</NavLink><button onClick={() => { setAccountOpen(false); logout(); }}><LogOut size={17} /> Cerrar sesión</button></nav>}</div> : <NavLink className="mobile-account" to="/acceso"><LogIn size={18} /> Entrar</NavLink>}
  </header>
  <nav className="mobile-nav" aria-label="Navegación principal">
    <NavLink className={active} end to="/"><Search size={20} /><span>Explorar</span></NavLink>
    <NavLink className={active} to="/plantas"><Leaf size={20} /><span>Mis plantas</span></NavLink>
    {user && <NavLink className={active} to="/calendario"><CalendarDays size={20} /><span>Calendario</span></NavLink>}
    <NavLink className={active} to="/diagnostico"><HeartPulse size={21} /><span>Diagnóstico</span></NavLink>
    {moreOpen && <div className="mobile-more-menu"><NavLink to="/chatbot" onClick={() => setMoreOpen(false)}><Bot size={19} /><span><b>Chatbot</b><small>Consejos para tus plantas</small></span></NavLink><NavLink to="/plantas-guia" onClick={() => setMoreOpen(false)}><Leaf size={19} /><span><b>Guías de plantas</b><small>Fichas de cuidados</small></span></NavLink><NavLink to="/blog" onClick={() => setMoreOpen(false)}><BookOpen size={19} /><span><b>Blog</b><small>Guías y novedades</small></span></NavLink><NavLink to="/sobre-nosotros" onClick={() => setMoreOpen(false)}><Users size={19} /><span><b>Sobre nosotros</b><small>Conoce PlantLive</small></span></NavLink></div>}
    <button className={moreOpen ? "active" : ""} onClick={() => { setMoreOpen(!moreOpen); setAccountOpen(false); }} aria-expanded={moreOpen}>{moreOpen ? <X size={20} /> : <MoreHorizontal size={20} />}<span>Más</span></button>
  </nav></>;
}
