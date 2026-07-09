import { useState, type FormEvent } from "react";
import { Button, Card, Input, Select } from "@pos/ui";
import { ApiError, createApiClient, type Location } from "@pos/shared";
import { setDeviceToken } from "../posClient";

export function PairingScreen({ onPaired }: { onPaired: (location: Location) => void }) {
  const [step, setStep] = useState<"login" | "location">("login");
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("password123");
  const [userToken, setUserToken] = useState<string | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState("");
  const [deviceName, setDeviceName] = useState("Register 1");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const client = createApiClient({ baseUrl: window.pos.apiUrl });
      const res = await client.auth.login({ email, password });
      setUserToken(res.token);
      setLocations(res.locations);
      if (res.locations[0]) setLocationId(res.locations[0].id);
      setStep("location");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function onPair(e: FormEvent) {
    e.preventDefault();
    if (!userToken) return;
    setError(null);
    setBusy(true);
    try {
      const client = createApiClient({ baseUrl: window.pos.apiUrl, getToken: () => userToken });
      const res = await client.auth.pairDevice({ locationId, deviceName });
      await window.pos.setPairing({ deviceToken: res.deviceToken, location: res.location });
      setDeviceToken(res.deviceToken);
      onPaired(res.location);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Pairing failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pos-center">
      <Card className="pos-auth-card">
        <h1>Pair this terminal</h1>
        {step === "login" ? (
          <form onSubmit={onLogin} className="pos-stack">
            <p className="pos-muted">Sign in with a manager account to pair this register.</p>
            <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p className="pos-error">{error}</p>}
            <Button type="submit" size="lg" disabled={busy}>
              {busy ? "Signing in…" : "Continue"}
            </Button>
          </form>
        ) : (
          <form onSubmit={onPair} className="pos-stack">
            <Select
              label="Location"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </Select>
            <Input
              label="Terminal name"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
            />
            {error && <p className="pos-error">{error}</p>}
            <Button type="submit" size="lg" disabled={busy || !locationId}>
              {busy ? "Pairing…" : "Pair terminal"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
