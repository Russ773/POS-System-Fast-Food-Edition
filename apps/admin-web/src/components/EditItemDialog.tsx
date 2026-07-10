import { useState, type FormEvent } from "react";
import { Button, Card, Input, Select } from "@pos/ui";
import type { InventoryItem, MenuCategory, MenuItem } from "@pos/shared";
import { api } from "../api";
import { centsToDollars, dollarsToCents } from "../format";
import {
  DraftIngredient,
  IngredientsEditor,
  draftsToRequests,
  ingredientsToDrafts,
} from "./IngredientsEditor";
import {
  MealComponentsEditor,
  MealDraft,
  RecipeDraft,
  RecipeEditor,
  mealDraftsToRequests,
  mealToDrafts,
  recipeDraftsToRequests,
  recipeToDrafts,
} from "./RecipeEditor";

interface Props {
  item: MenuItem;
  categories: MenuCategory[];
  inventoryItems: InventoryItem[];
  allItems: MenuItem[];
  onClose: () => void;
  onSaved: () => void;
}

export function EditItemDialog({
  item,
  categories,
  inventoryItems,
  allItems,
  onClose,
  onSaved,
}: Props) {
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(centsToDollars(item.priceCents).replace("$", ""));
  const [categoryId, setCategoryId] = useState(item.categoryId);
  const [description, setDescription] = useState(item.description ?? "");
  const [isActive, setIsActive] = useState(item.isActive);
  const [ingredients, setIngredients] = useState<DraftIngredient[]>(
    ingredientsToDrafts(item.ingredients),
  );
  const [recipe, setRecipe] = useState<RecipeDraft[]>(recipeToDrafts(item.recipe));
  const [mealComponents, setMealComponents] = useState<MealDraft[]>(
    mealToDrafts(item.mealComponents),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Meal components can be any non-meal item other than this one.
  const componentOptions = allItems.filter((i) => !i.isMeal && i.id !== item.id);

  async function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.menu.updateItem(item.id, {
        name: name.trim(),
        priceCents: dollarsToCents(price),
        categoryId,
        description: description.trim(),
        isActive,
        ingredients: draftsToRequests(ingredients),
        recipe: recipeDraftsToRequests(recipe),
        ...(item.isMeal ? { mealComponents: mealDraftsToRequests(mealComponents) } : {}),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={saving ? undefined : onClose}>
      <Card className="edit-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Edit {item.name}</h2>
        <form onSubmit={save} className="stack-form">
          <Select label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            label="Price (USD)"
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <label className="ing-check">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Active (shown on POS)
          </label>
          {item.isMeal ? (
            <MealComponentsEditor
              value={mealComponents}
              onChange={setMealComponents}
              options={componentOptions}
            />
          ) : (
            <IngredientsEditor value={ingredients} onChange={setIngredients} />
          )}
          <RecipeEditor value={recipe} onChange={setRecipe} inventoryItems={inventoryItems} />
          {error && <p className="login-error">{error}</p>}
          <div className="edit-modal__actions">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !name || !price}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
