import { Button } from "@pos/ui";
import type { CreateIngredientRequest } from "@pos/shared";
import { dollarsToCents } from "../format";

export interface DraftIngredient {
  name: string;
  includedByDefault: boolean;
  removable: boolean;
  addable: boolean;
  extraPrice: string; // dollars, as typed
}

export function emptyIngredient(): DraftIngredient {
  return { name: "", includedByDefault: true, removable: true, addable: false, extraPrice: "" };
}

export function draftsToRequests(drafts: DraftIngredient[]): CreateIngredientRequest[] {
  return drafts
    .filter((d) => d.name.trim())
    .map((d, idx) => ({
      name: d.name.trim(),
      includedByDefault: d.includedByDefault,
      removable: d.removable,
      addable: d.addable,
      extraPriceCents: d.addable ? dollarsToCents(d.extraPrice) : 0,
      sortOrder: idx + 1,
    }));
}

interface Props {
  value: DraftIngredient[];
  onChange: (next: DraftIngredient[]) => void;
}

export function IngredientsEditor({ value, onChange }: Props) {
  function update(idx: number, patch: Partial<DraftIngredient>) {
    onChange(value.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  }
  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  return (
    <div className="ing-editor">
      <div className="ing-editor__head">
        <span>Build ingredients</span>
        <Button
          type="button"
          variant="ghost"
          onClick={() => onChange([...value, emptyIngredient()])}
        >
          + Add ingredient
        </Button>
      </div>
      {value.length === 0 && (
        <p className="muted">
          No ingredients. Add ones the customer can hold (lettuce, onion) or add (bacon, ketchup).
        </p>
      )}
      {value.map((row, idx) => (
        <div key={idx} className="ing-row">
          <input
            className="pos-input ing-row__name"
            placeholder="e.g. Onion"
            value={row.name}
            onChange={(e) => update(idx, { name: e.target.value })}
          />
          <label className="ing-check">
            <input
              type="checkbox"
              checked={row.includedByDefault}
              onChange={(e) => update(idx, { includedByDefault: e.target.checked })}
            />
            Default on
          </label>
          <label className="ing-check">
            <input
              type="checkbox"
              checked={row.removable}
              onChange={(e) => update(idx, { removable: e.target.checked })}
            />
            Removable
          </label>
          <label className="ing-check">
            <input
              type="checkbox"
              checked={row.addable}
              onChange={(e) => update(idx, { addable: e.target.checked })}
            />
            Addable
          </label>
          <input
            className="pos-input ing-row__price"
            type="number"
            step="0.01"
            placeholder="extra $"
            disabled={!row.addable}
            value={row.extraPrice}
            onChange={(e) => update(idx, { extraPrice: e.target.value })}
          />
          <Button type="button" variant="ghost" onClick={() => remove(idx)}>
            ✕
          </Button>
        </div>
      ))}
    </div>
  );
}
