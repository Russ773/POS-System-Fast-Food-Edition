import { useEffect, useState, type FormEvent } from "react";
import { Button, Card, Input } from "@pos/ui";
import type { InventoryItem } from "@pos/shared";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";

export function InventoryPage() {
  const { selectedLocationId } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [quantity, setQuantity] = useState("");
  const [threshold, setThreshold] = useState("");

  async function load() {
    if (!selectedLocationId) return;
    setItems(await api.inventory.list(selectedLocationId));
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
      await api.inventory.create(
        {
          name: name.trim(),
          unit: unit.trim(),
          quantityOnHand: parseFloat(quantity || "0"),
          reorderThreshold: parseFloat(threshold || "0"),
        },
        selectedLocationId,
      );
      setName("");
      setUnit("");
      setQuantity("");
      setThreshold("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this inventory item?")) return;
    await api.inventory.remove(id);
    await load();
  }

  return (
    <div className="page">
      <h1>Inventory Management</h1>
      {error && <p className="login-error">{error}</p>}

      <Card>
        <h2>Add Inventory Item</h2>
        <form onSubmit={add} className="inline-form">
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Unit (e.g. lb)" value={unit} onChange={(e) => setUnit(e.target.value)} />
          <Input
            placeholder="Qty on hand"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <Input
            placeholder="Reorder at"
            type="number"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
          />
          <Button type="submit" disabled={!name || !unit}>
            Add
          </Button>
        </form>
      </Card>

      <Card>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Unit</th>
              <th>On Hand</th>
              <th>Reorder At</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className={item.quantityOnHand <= item.reorderThreshold ? "row-low" : ""}>
                <td>{item.name}</td>
                <td>{item.unit}</td>
                <td>{item.quantityOnHand}</td>
                <td>{item.reorderThreshold}</td>
                <td>
                  <Button variant="ghost" onClick={() => remove(item.id)}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  No inventory items yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
