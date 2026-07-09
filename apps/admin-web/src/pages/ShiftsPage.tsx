import { useEffect, useState } from "react";
import { Card } from "@pos/ui";
import type { Shift } from "@pos/shared";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";

export function ShiftsPage() {
  const { selectedLocationId } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedLocationId) return;
    api.employees
      .listShifts(selectedLocationId)
      .then(setShifts)
      .catch((e) => setError(e.message));
  }, [selectedLocationId]);

  return (
    <div className="page">
      <h1>Shift History</h1>
      {error && <p className="login-error">{error}</p>}
      <Card>
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Clock In</th>
              <th>Clock Out</th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((s) => (
              <tr key={s.id}>
                <td>{s.employeeId.slice(0, 8)}…</td>
                <td>{new Date(s.clockIn).toLocaleString()}</td>
                <td>{s.clockOut ? new Date(s.clockOut).toLocaleString() : "— on shift —"}</td>
              </tr>
            ))}
            {shifts.length === 0 && (
              <tr>
                <td colSpan={3} className="muted">
                  No shifts recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
