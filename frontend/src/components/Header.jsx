import { NavLink } from "react-router-dom";
import { CalendarDays, HeartPulse, LayoutDashboard, Leaf, LogIn, LogOut, Search, Settings, Sprout, Users } from "lucide-react";
import { useAuth } from "../contexts/authStore";

export function Header() {
  const { user, logout } = useAuth();
  const active = ({ isActive }) => isActive ? "active" : "";
  return <><header className="topbar">
    <NavLink className="brand" to="/"><span><Sprout size={21} /></span> PlantLive <small className="beta-badge">BETA</small></NavLink>
    <nav className="desktop-nav">
      <NavLink className={active} end to="/"><Search size={16} /> <span>Explorar</span></NavLink>
      {user && <NavLink className={active} to="/panel"><LayoutDashboard size={16} /> <span>Panel</span></NavLink>}
      <NavLink className={active} to="/plantas"><Leaf size={16} /> <span>Mis plantas</span></NavLink>
      {user && <NavLink className={active} to="/calendario"><CalendarDays size={16} /> <span>Calendario</span></NavLink>}
      <NavLink className="secondary-nav" to="/sobre-nosotros"><Users size={16} /> <span>Nosotros</span></NavLink>
      <NavLink className={({ isActive }) => `nav-cta ${isActive ? "active" : ""}`} to="/diagnostico"><HeartPulse size={17} /> <span>Diagnosticar</span></NavLink>
      {user ? <><NavLink className={active} to="/ajustes" title="Ajustes"><Settings size={17} /></NavLink><button className="user-menu" onClick={logout} title="Cerrar sesión"><span>{user.name.split(" ")[0]}</span><LogOut size={16} /></button></> : <NavLink className={active} to="/acceso"><LogIn size={16} /> <span>Entrar</span></NavLink>}
    </nav>
    <NavLink className="mobile-account" to={user ? "/ajustes" : "/acceso"}>{user ? <><span>{user.name.charAt(0).toUpperCase()}</span><Settings size={17} /></> : <><LogIn size={18} /> Entrar</>}</NavLink>
  </header>
  <nav className="mobile-nav" aria-label="Navegación principal">
    <NavLink className={active} end to="/"><Search size={20} /><span>Explorar</span></NavLink>
    <NavLink className={active} to="/plantas"><Leaf size={20} /><span>Mis plantas</span></NavLink>
    <NavLink className={active} to="/diagnostico"><HeartPulse size={21} /><span>Diagnóstico</span></NavLink>
    <NavLink className={active} to={user ? "/panel" : "/sobre-nosotros"}>{user ? <LayoutDashboard size={20} /> : <Users size={20} />}<span>{user ? "Mi panel" : "Nosotros"}</span></NavLink>
  </nav></>;
}
