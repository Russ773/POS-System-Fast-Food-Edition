import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button, Select } from "@pos/ui";
import { useAuth } from "../auth/AuthContext";

const NAV = [
  { to: "/menu", label: "Menu" },
  { to: "/inventory", label: "Inventory" },
  { to: "/employees", label: "Employees" },
  { to: "/shifts", label: "Shifts" },
  { to: "/reporting", label: "Reporting" },
  { to: "/settings", label: "Settings" },
];

export function AppLayout() {
  const { user, locations, selectedLocationId, setSelectedLocationId, logout } = useAuth();
  const navigate = useNavigate();

  function onLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-brand">🍔 POS Admin</div>
        <nav className="app-nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `app-nav__link ${isActive ? "is-active" : ""}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="app-sidebar__footer">
          <span className="app-user">{user?.name}</span>
          <Button variant="ghost" onClick={onLogout}>
            Sign out
          </Button>
        </div>
      </aside>
      <main className="app-main">
        <header className="app-topbar">
          <Select
            label="Location"
            value={selectedLocationId ?? ""}
            onChange={(e) => setSelectedLocationId(e.target.value)}
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </Select>
        </header>
        <div className="app-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
