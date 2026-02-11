import { NavLink } from "react-router-dom";
import "./Navbar.css";

export function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="navbar-logo">🏥</span>
        <span className="navbar-title">Turnos Médicos</span>
      </div>
      <ul className="navbar-links">
        <li>
          <NavLink to="/" className={({ isActive }) => isActive ? "active" : ""}>
            📅 Turnos
          </NavLink>
        </li>
        <li>
          <NavLink to="/doctors" className={({ isActive }) => isActive ? "active" : ""}>
            👨‍⚕️ Médicos
          </NavLink>
        </li>
        <li>
          <NavLink to="/studies" className={({ isActive }) => isActive ? "active" : ""}>
            🔬 Estudios
          </NavLink>
        </li>
        <li>
          <NavLink to="/obras-sociales" className={({ isActive }) => isActive ? "active" : ""}>
            🏛️ Obras Sociales
          </NavLink>
        </li>
        <li>
          <NavLink to="/tarifas" className={({ isActive }) => isActive ? "active" : ""}>
            💲 Tarifas
          </NavLink>
        </li>
        <li>
          <NavLink to="/facturacion" className={({ isActive }) => isActive ? "active" : ""}>
            📄 Facturación
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}
