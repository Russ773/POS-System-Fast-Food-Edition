import { useEffect, useState, type FormEvent } from "react";
import { Button, Card, Input, Select } from "@pos/ui";
import type { MenuCategory, MenuItem } from "@pos/shared";
import { api } from "../api";
import { centsToDollars, dollarsToCents } from "../format";

export function MenuPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemCategoryId, setItemCategoryId] = useState("");
  const [itemDescription, setItemDescription] = useState("");

  async function load() {
    const [cats, its] = await Promise.all([api.menu.listCategories(), api.menu.listItems()]);
    setCategories(cats);
    setItems(its);
    if (!itemCategoryId && cats.length > 0) setItemCategoryId(cats[0].id);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addCategory(e: FormEvent) {
    e.preventDefault();
    if (!newCategory.trim()) return;
    await api.menu.createCategory({ name: newCategory.trim(), sortOrder: categories.length + 1 });
    setNewCategory("");
    await load();
  }

  async function deleteCategory(id: string) {
    if (!confirm("Delete this category and its items?")) return;
    await api.menu.deleteCategory(id);
    await load();
  }

  async function addItem(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.menu.createItem({
        categoryId: itemCategoryId,
        name: itemName.trim(),
        description: itemDescription.trim() || undefined,
        priceCents: dollarsToCents(itemPrice),
        modifierGroups: [],
      });
      setItemName("");
      setItemPrice("");
      setItemDescription("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add item");
    }
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this menu item?")) return;
    await api.menu.deleteItem(id);
    await load();
  }

  return (
    <div className="page">
      <h1>Menu Management</h1>
      {error && <p className="login-error">{error}</p>}

      <div className="grid-2">
        <Card>
          <h2>Categories</h2>
          <form onSubmit={addCategory} className="inline-form">
            <Input
              placeholder="New category name"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            />
            <Button type="submit">Add</Button>
          </form>
          <ul className="list">
            {categories.map((c) => (
              <li key={c.id} className="list__row">
                <span>{c.name}</span>
                <Button variant="ghost" onClick={() => deleteCategory(c.id)}>
                  Delete
                </Button>
              </li>
            ))}
            {categories.length === 0 && <li className="muted">No categories yet.</li>}
          </ul>
        </Card>

        <Card>
          <h2>Add Menu Item</h2>
          <form onSubmit={addItem} className="stack-form">
            <Select
              label="Category"
              value={itemCategoryId}
              onChange={(e) => setItemCategoryId(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Input label="Name" value={itemName} onChange={(e) => setItemName(e.target.value)} />
            <Input
              label="Price (USD)"
              type="number"
              step="0.01"
              value={itemPrice}
              onChange={(e) => setItemPrice(e.target.value)}
            />
            <Input
              label="Description"
              value={itemDescription}
              onChange={(e) => setItemDescription(e.target.value)}
            />
            <Button type="submit" disabled={!itemCategoryId || !itemName || !itemPrice}>
              Add Item
            </Button>
          </form>
        </Card>
      </div>

      <Card>
        <h2>Menu Items</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Modifiers</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{categories.find((c) => c.id === item.categoryId)?.name ?? "—"}</td>
                <td>{centsToDollars(item.priceCents)}</td>
                <td>{item.modifierGroups.map((g) => g.name).join(", ") || "—"}</td>
                <td>
                  <Button variant="ghost" onClick={() => deleteItem(item.id)}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  No menu items yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
