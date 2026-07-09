import { useState } from "react";
import { Button, Card, NumericKeypad } from "@pos/ui";
import { ApiError, type Employee, type Location } from "@pos/shared";
import { deviceApi, setEmployeeToken } from "../posClient";

interface Props {
  location: Location;
  onClockedIn: (employee: Employee) => void;
}

export function ClockInScreen({ location, onClockedIn }: Props) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (pin.length < 4) return;
    setError(null);
    setBusy(true);
    try {
      const res = await deviceApi.auth.employeePinLogin({ locationId: location.id, pin });
      setEmployeeToken(res.employeeToken);
      // Best-effort clock-in; ignore "already clocked in" conflicts.
      try {
        await deviceApi.employees.clockIn(res.employee.id);
      } catch {
        /* already on shift */
      }
      onClockedIn(res.employee);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
      setPin("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pos-center">
      <Card className="pos-auth-card">
        <h1>Enter your PIN</h1>
        <div className="pos-pin-display">
          {"••••••••".slice(0, pin.length) || <span className="pos-muted">— — — —</span>}
        </div>
        {error && <p className="pos-error">{error}</p>}
        <NumericKeypad value={pin} onChange={setPin} maxLength={8} />
        <Button size="lg" onClick={submit} disabled={busy || pin.length < 4}>
          {busy ? "Checking…" : "Clock in"}
        </Button>
      </Card>
    </div>
  );
}
