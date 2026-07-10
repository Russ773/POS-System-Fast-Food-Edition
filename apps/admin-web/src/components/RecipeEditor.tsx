import { Button } from "@pos/ui";
import type {
  InventoryItem,
  MealComponentRequest,
  MenuItem,
  RecipeComponent,
  RecipeComponentRequest,
} from "@pos/shared";

// ---- Recipe (stock usage) ----

export interface RecipeDraft {
  inventoryItemId: string;
  quantity: string;
}

export function recipeToDrafts(recipe: RecipeComponent[]): RecipeDraft[] {
  return recipe.map((r) => ({ inventoryItemId: r.inventoryItemId, quantity: String(r.quantity) }));
}

export function recipeDraftsToRequests(drafts: RecipeDraft[]): RecipeComponentRequest[] {
  return drafts
    .filter((d) => d.inventoryItemId && parseFloat(d.quantity) > 0)
    .map((d) => ({ inventoryItemId: d.inventoryItemId, quantity: parseFloat(d.quantity) }));
}

export function RecipeEditor({
  value,
  onChange,
  inventoryItems,
}: {
  value: RecipeDraft[];
  onChange: (next: RecipeDraft[]) => void;
  inventoryItems: InventoryItem[];
}) {
  function update(idx: number, patch: Partial<RecipeDraft>) {
    onChange(value.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  }
  return (
    <div className="ing-editor">
      <div className="ing-editor__head">
        <span>Stock usage (recipe)</span>
        <Button
          type="button"
          variant="ghost"
          onClick={() => onChange([...value, { inventoryItemId: inventoryItems[0]?.id ?? "", quantity: "" }])}
          disabled={inventoryItems.length === 0}
        >
          + Add stock item
        </Button>
      </div>
      {inventoryItems.length === 0 && (
        <p className="muted">Add inventory items first to define stock usage.</p>
      )}
      {value.map((row, idx) => {
        const inv = inventoryItems.find((i) => i.id === row.inventoryItemId);
        return (
          <div key={idx} className="ing-row">
            <select
              className="pos-input ing-row__name"
              value={row.inventoryItemId}
              onChange={(e) => update(idx, { inventoryItemId: e.target.value })}
            >
              {inventoryItems.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
            <input
              className="pos-input ing-row__price"
              type="number"
              step="0.01"
              placeholder="qty"
              value={row.quantity}
              onChange={(e) => update(idx, { quantity: e.target.value })}
            />
            <span className="muted">{inv?.unit}</span>
            <Button type="button" variant="ghost" onClick={() => onChange(value.filter((_, i) => i !== idx))}>
              ✕
            </Button>
          </div>
        );
      })}
    </div>
  );
}

// ---- Meal components ----

export interface MealDraft {
  componentItemId: string;
  quantity: string;
}

export function mealToDrafts(components: { componentItemId: string; quantity: number }[]): MealDraft[] {
  return components.map((c) => ({ componentItemId: c.componentItemId, quantity: String(c.quantity) }));
}

export function mealDraftsToRequests(drafts: MealDraft[]): MealComponentRequest[] {
  return drafts
    .filter((d) => d.componentItemId && parseInt(d.quantity) > 0)
    .map((d) => ({ componentItemId: d.componentItemId, quantity: parseInt(d.quantity) }));
}

export function MealComponentsEditor({
  value,
  onChange,
  options,
}: {
  value: MealDraft[];
  onChange: (next: MealDraft[]) => void;
  options: MenuItem[]; // selectable component items (non-meal)
}) {
  function update(idx: number, patch: Partial<MealDraft>) {
    onChange(value.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  }
  return (
    <div className="ing-editor">
      <div className="ing-editor__head">
        <span>Meal includes</span>
        <Button
          type="button"
          variant="ghost"
          onClick={() => onChange([...value, { componentItemId: options[0]?.id ?? "", quantity: "1" }])}
          disabled={options.length === 0}
        >
          + Add item
        </Button>
      </div>
      {value.length === 0 && <p className="muted">Add the items included in this meal.</p>}
      {value.map((row, idx) => (
        <div key={idx} className="ing-row">
          <select
            className="pos-input ing-row__name"
            value={row.componentItemId}
            onChange={(e) => update(idx, { componentItemId: e.target.value })}
          >
            {options.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
          <input
            className="pos-input ing-row__price"
            type="number"
            min="1"
            placeholder="qty"
            value={row.quantity}
            onChange={(e) => update(idx, { quantity: e.target.value })}
          />
          <Button type="button" variant="ghost" onClick={() => onChange(value.filter((_, i) => i !== idx))}>
            ✕
          </Button>
        </div>
      ))}
    </div>
  );
}
