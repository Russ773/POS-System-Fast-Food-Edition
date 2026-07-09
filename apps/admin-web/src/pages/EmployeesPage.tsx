import { useEffect, useState, type FormEvent } from "react";
import { Button, Card, Input } from "@pos/ui";
import type { Employee } from "@pos/shared";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import { centsToDollars, dollarsToCents } from "../format";

export function EmployeesPage() {
  const { selectedLocationId } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [rate, setRate] = useState("");

  async function load() {
    if (!selectedLocationId) return;
    setEmployees(await api.employees.list(selectedLocationId));
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocationId]);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!selectedLocationId) return;
    setError(null);
    try {
      await api.employees.create(
        { name: name.trim(), pin: pin.trim(), hourlyRateCents: dollarsToCents(rate) },
        selectedLocationId,
      );
      setName("");
      setPin("");
      setRate("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add");
    }
  }

  async function toggleActive(emp: Employee) {
    await api.employees.update(emp.id, { isActive: !emp.isActive });
    await load();
  }

  return (
    <div className="page">
      <h1>Employee Management</h1>
      {error && <p className="login-error">{error}</p>}

      <Card>
        <h2>Add Employee</h2>
        <form onSubmit={add} className="inline-form">
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            placeholder="PIN (4-8 digits)"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            maxLength={8}
          />
          <Input
            placeholder="Hourly rate (USD)"
            type="number"
            step="0.01"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
          <Button type="submit" disabled={!name || pin.length < 4}>
            Add
          </Button>
        </form>
      </Card>

      <Card>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Hourly Rate</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id}>
                <td>{emp.name}</td>
                <td>{centsToDollars(emp.hourlyRateCents)}/hr</td>
                <td>{emp.isActive ? "Active" : "Inactive"}</td>
                <td>
                  <Button variant="ghost" onClick={() => toggleActive(emp)}>
                    {emp.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr>
                <td colSpan={4} className="muted">
                  No employees yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
