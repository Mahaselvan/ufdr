import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/dashboard", label: "Dashboard", tag: "MONITOR" },
  { to: "/upload", label: "Upload UFDR", tag: "INGEST" },
  { to: "/query", label: "Query Evidence", tag: "SEARCH" },
  { to: "/links", label: "Link Analysis", tag: "GRAPH" },
  { to: "/reports", label: "Reports", tag: "EXPORT" }
];

function Sidebar({ officer, onLogout, onClose }) {
  return (
    <aside className="sidebar">
      <div>
        <div className="brand">
          <div className="brand-badge">U</div>
          <div>
            <h1>UFDR Assistant</h1>
            <p>Forensic Analysis</p>
          </div>
        </div>
        <nav className="nav-list">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `nav-item ${isActive ? "nav-item-active" : ""}`
              }
            >
              <span>{item.label}</span>
              <small>{item.tag}</small>
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="sidebar-footer">
        <p>Logged in as</p>
        <div className="officer-pill">{officer.slice(0, 1).toUpperCase()}</div>
        <h3>{officer}</h3>
        <button type="button" className="logout-btn" onClick={onLogout}>
          Logout
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
