import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Location, OrgSettings, User } from "@pos/shared";
import { api } from "../api";
import { setCurrency } from "../format";

interface AuthState {
  user: User | null;
  locations: Location[];
  token: string | null;
  selectedLocationId: string | null;
  settings: OrgSettings | null;
  setSelectedLocationId: (id: string) => void;
  applySettings: (settings: OrgSettings) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("pos_admin_token"));
  const [selectedLocationId, setSelectedLocationIdState] = useState<string | null>(() =>
    localStorage.getItem("pos_admin_selected_location"),
  );
  const [settings, setSettings] = useState<OrgSettings | null>(null);

  function applySettings(next: OrgSettings) {
    setSettings(next);
    setCurrency(next.currency);
    localStorage.setItem("pos_admin_settings", JSON.stringify(next));
  }

  useEffect(() => {
    const storedUser = localStorage.getItem("pos_admin_user");
    const storedLocations = localStorage.getItem("pos_admin_locations");
    const storedSettings = localStorage.getItem("pos_admin_settings");
    if (storedUser) setUser(JSON.parse(storedUser));
    if (storedSettings) applySettings(JSON.parse(storedSettings));
    if (storedLocations) {
      const parsed: Location[] = JSON.parse(storedLocations);
      setLocations(parsed);
      if (!selectedLocationId && parsed.length > 0) {
        setSelectedLocationIdState(parsed[0].id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setSelectedLocationId(id: string) {
    localStorage.setItem("pos_admin_selected_location", id);
    setSelectedLocationIdState(id);
  }

  async function login(email: string, password: string) {
    const res = await api.auth.login({ email, password });
    localStorage.setItem("pos_admin_token", res.token);
    localStorage.setItem("pos_admin_user", JSON.stringify(res.user));
    localStorage.setItem("pos_admin_locations", JSON.stringify(res.locations));
    setToken(res.token);
    setUser(res.user);
    setLocations(res.locations);
    applySettings(res.settings);
    if (res.locations.length > 0) setSelectedLocationId(res.locations[0].id);
  }

  function logout() {
    localStorage.removeItem("pos_admin_token");
    localStorage.removeItem("pos_admin_user");
    localStorage.removeItem("pos_admin_locations");
    localStorage.removeItem("pos_admin_selected_location");
    localStorage.removeItem("pos_admin_settings");
    setToken(null);
    setUser(null);
    setLocations([]);
    setSelectedLocationIdState(null);
    setSettings(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        locations,
        token,
        selectedLocationId,
        settings,
        setSelectedLocationId,
        applySettings,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
