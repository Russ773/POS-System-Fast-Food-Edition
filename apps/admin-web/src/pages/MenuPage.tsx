import { useEffect, useState, type FormEvent } from "react";
import { Button, Card, Input, Select } from "@pos/ui";
import type { InventoryItem, MenuCategory, MenuItem } from "@pos/shared";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import { centsToDollars, dollarsToCents } from "../format";
import {
  DraftIngredient,
  IngredientsEditor,
  draftsToRequests,
} from "../components/IngredientsEditor";
import {
  ComboComponentsEditor,
  ComboDraft,
  comboDraftsToRequests,
} from "../components/RecipeEditor";
import { EditItemDialog } from "../components/EditItemDialog";

export function MenuPage() {
  const { selectedLocationId } = useAuth();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemCategoryId, setItemCategoryId] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemIngredients, setItemIngredients] = useState<DraftIngredient[]>([]);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const [comboName, setComboName] = useState("");
  const [comboPrice, setComboPrice] = useState("");
  const [comboItems, setComboItems] = useState<ComboDraft[]>([]);

  async function load() {
    const [cats, its] = await Promise.all([api.menu.listCategories(), api.menu.listItems()]);
    setCategories(cats);
    setItems(its);
    if (!itemCategoryId && cats.length > 0) setItemCategoryId(cats[0].id);
    if (selectedLocationId) {
      setInventory(await api.inventory.list(selectedLocationId));
    }
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocationId]);

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
        isCombo: false,
        modifierGroups: [],
        ingredients: draftsToRequests(itemIngredients),
        recipe: [],
        comboComponents: [],
      });
      setItemName("");
      setItemPrice("");
      setItemDescription("");
      setItemIngredients([]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add item");
    }
  }

  async function addCombo(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.menu.createItem({
        categoryId: itemCategoryId,
        name: comboName.trim(),
        priceCents: dollarsToCents(comboPrice),
        isCombo: true,
        modifierGroups: [],
        ingredients: [],
        recipe: [],
        comboComponents: comboDraftsToRequests(comboItems),
      });
      setComboName("");
      setComboPrice("");
      setComboItems([]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add combo");
    }
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this menu item?")) return;
    setError(null);
    try {
      await api.menu.deleteItem(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete item");
    }
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
            <IngredientsEditor value={itemIngredients} onChange={setItemIngredients} />
            <Button type="submit" disabled={!itemCategoryId || !itemName || !itemPrice}>
              Add Item
            </Button>
          </form>
        </Card>
      </div>

      <Card>
        <h2>Create Combo</h2>
        <form onSubmit={addCombo} className="stack-form">
          <Input label="Combo name" value={comboName} onChange={(e) => setComboName(e.target.value)} />
          <Input
            label="Combo price (USD)"
            type="number"
            step="0.01"
            value={comboPrice}
            onChange={(e) => setComboPrice(e.target.value)}
          />
          <ComboComponentsEditor
            value={comboItems}
            onChange={setComboItems}
            options={items.filter((i) => !i.isCombo)}
          />
          <Button
            type="submit"
            disabled={!comboName || !comboPrice || comboDraftsToRequests(comboItems).length === 0}
          >
            Create Combo
          </Button>
        </form>
      </Card>

      <Card>
        <h2>Menu Items</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Modifiers</th>
              <th>Ingredients</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  {item.name}
                  {item.isCombo && <span className="combo-badge">COMBO</span>}
                </td>
                <td>{categories.find((c) => c.id === item.categoryId)?.name ?? "—"}</td>
                <td>{centsToDollars(item.priceCents)}</td>
                <td>{item.modifierGroups.map((g) => g.name).join(", ") || "—"}</td>
                <td>
                  {item.isCombo
                    ? item.comboComponents.map((c) => `${c.quantity}× ${c.name}`).join(", ")
                    : item.ingredients.map((i) => i.name).join(", ") || "—"}
                </td>
                <td className="row-actions">
                  <Button variant="ghost" onClick={() => setEditingItem(item)}>
                    Edit
                  </Button>
                  <Button variant="ghost" onClick={() => deleteItem(item.id)}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  No menu items yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {editingItem && (
        <EditItemDialog
          item={editingItem}
          categories={categories}
          inventoryItems={inventory}
          allItems={items}
          onClose={() => setEditingItem(null)}
          onSaved={async () => {
            setEditingItem(null);
            await load();
          }}
        />
      )}
    </div>
  );
}
