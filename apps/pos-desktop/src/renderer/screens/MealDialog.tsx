import { useState } from "react";
import { Button } from "@pos/ui";
import type { MenuItem } from "@pos/shared";
import type { CartMealSelection } from "./cart";
import { CustomizeDialog } from "./CustomizeDialog";

interface Props {
  meal: MenuItem;
  items: MenuItem[]; // full menu, to resolve each component's options
  onCancel: () => void;
  onConfirm: (selections: CartMealSelection[]) => void;
}

// Build one default (un-customised) selection per meal component.
function defaultSelections(meal: MenuItem): Record<string, CartMealSelection> {
  const out: Record<string, CartMealSelection> = {};
  for (const c of meal.mealComponents) {
    out[c.componentItemId] = {
      request: { componentItemId: c.componentItemId, selectedModifierIds: [], customizations: [] },
      name: c.name,
      quantity: c.quantity,
      summary: "",
      extraCents: 0,
    };
  }
  return out;
}

export function MealDialog({ meal, items, onCancel, onConfirm }: Props) {
  const [selections, setSelections] = useState<Record<string, CartMealSelection>>(() =>
    defaultSelections(meal),
  );
  // The component currently being customised (full menu item), if any.
  const [editing, setEditing] = useState<{ item: MenuItem; quantity: number } | null>(null);

  function componentItem(id: string): MenuItem | undefined {
    return items.find((i) => i.id === id);
  }
  function isCustomisable(item: MenuItem | undefined): boolean {
    return !!item && (item.modifierGroups.length > 0 || item.ingredients.length > 0);
  }

  return (
    <div className="pos-modal-backdrop" onClick={onCancel}>
      <div className="pos-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{meal.name}</h2>
        <p className="pos-muted">Customise the items in this meal.</p>

        <div className="pos-meal-list">
          {meal.mealComponents.map((c) => {
            const full = componentItem(c.componentItemId);
            const sel = selections[c.componentItemId];
            const customisable = isCustomisable(full);
            return (
              <div key={c.componentItemId} className="pos-meal-row">
                <div className="pos-meal-row__info">
                  <span className="pos-meal-row__name">
                    {c.quantity}× {c.name}
                  </span>
                  {sel.summary && <span className="pos-muted">{sel.summary}</span>}
                </div>
                {customisable && full && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setEditing({ item: full, quantity: c.quantity })}
                  >
                    {sel.summary ? "Edit" : "Customise"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <div className="pos-modal__actions">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(Object.values(selections))}>Add to order</Button>
        </div>
      </div>

      {editing && (
        <CustomizeDialog
          item={editing.item}
          onCancel={() => setEditing(null)}
          onConfirm={({ mods, customizations }) => {
            const rawExtra =
              mods.reduce((s, m) => s + m.priceDeltaCents, 0) +
              customizations.reduce((s, z) => s + z.priceDeltaCents, 0);
            const summary = [
              ...mods.map((m) => m.name),
              ...customizations.map((z) => `${z.action} ${z.name}`),
            ].join(", ");
            setSelections((prev) => ({
              ...prev,
              [editing.item.id]: {
                request: {
                  componentItemId: editing.item.id,
                  selectedModifierIds: mods.map((m) => m.modifierId),
                  customizations: customizations.map((z) => ({ ingredientId: z.ingredientId, action: z.action })),
                },
                name: editing.item.name,
                quantity: editing.quantity,
                summary,
                extraCents: rawExtra * editing.quantity,
              },
            }));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
