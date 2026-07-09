import { useState, type FormEvent } from "react";
import { Button, Card, Input, Select } from "@pos/ui";
import { ApiError, type Location } from "@pos/shared";
import { api, setToken, getToken } from "./api";
import { KitchenBoard } from "./KitchenBoard";

export function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [locations, setLocations] = useState<Location[]>(() => {
    const stored = localStorage.getItem("pos_kds_locations");
    return stored ? JSON.parse(stored) : [];
  });
  const [locationId, setLocationId] = useState<string | null>(
    () => localStorage.getItem("pos_kds_location") ?? null,
  );

  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await api.auth.login({ email, password });
      setToken(res.token);
      localStorage.setItem("pos_kds_locations", JSON.stringify(res.locations));
      setLocations(res.locations);
      if (res.locations[0]) selectLocation(res.locations[0].id);
      setAuthed(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    }
  }

  function selectLocation(id: string) {
    localStorage.setItem("pos_kds_location", id);
    setLocationId(id);
  }

  function logout() {
    setToken(null);
    localStorage.removeItem("pos_kds_location");
    localStorage.removeItem("pos_kds_locations");
    setAuthed(false);
    setLocationId(null);
  }

  if (!authed) {
    return (
      <div className="kds-login">
        <Card className="kds-login__card">
          <h1>Kitchen Display</h1>
          <form onSubmit={onLogin} className="stack">
            <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p className="kds-error">{error}</p>}
            <Button type="submit">Sign in</Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="kds-app">
      <header className="kds-header">
        <h1>🍳 Kitchen Display</h1>
        <div className="kds-header__controls">
          <Select value={locationId ?? ""} onChange={(e) => selectLocation(e.target.value)}>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </Select>
          <Button variant="ghost" onClick={logout}>
            Sign out
          </Button>
        </div>
      </header>
      {locationId && <KitchenBoard locationId={locationId} />}
    </div>
  );
}
