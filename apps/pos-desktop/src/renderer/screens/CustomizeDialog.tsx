import { useState } from "react";
import { Button } from "@pos/ui";
import type {
  AppliedCustomization,
  IngredientAction,
  MenuItem,
  MenuItemIngredient,
  SelectedModifier,
} from "@pos/shared";
import { money } from "../posClient";

interface Props {
  item: MenuItem;
  onCancel: () => void;
  onConfirm: (result: { mods: SelectedModifier[]; customizations: AppliedCustomization[] }) => void;
}

function priceLabel(cents: number): string {
  return `${cents > 0 ? "+" : "-"}${money(Math.abs(cents))}`;
}

export function CustomizeDialog({ item, onCancel, onConfirm }: Props) {
  // Selected modifier ids per group (e.g. Size -> Double).
  const [selectedMods, setSelectedMods] = useState<Record<string, string[]>>({});
  // Chosen action per ingredient id (undefined = leave as default).
  const [ingActions, setIngActions] = useState<Record<string, IngredientAction | undefined>>({});

  function toggleMod(groupId: string, modifierId: string, maxSelect: number) {
    setSelectedMods((prev) => {
      const current = prev[groupId] ?? [];
      if (current.includes(modifierId)) {
        return { ...prev, [groupId]: current.filter((id) => id !== modifierId) };
      }
      if (maxSelect === 1) return { ...prev, [groupId]: [modifierId] };
      if (current.length >= maxSelect) return prev;
      return { ...prev, [groupId]: [...current, modifierId] };
    });
  }

  // Toggle an ingredient action; tapping the active one clears it (back to default).
  function setAction(ingredientId: string, action: IngredientAction) {
    setIngActions((prev) => ({
      ...prev,
      [ingredientId]: prev[ingredientId] === action ? undefined : action,
    }));
  }

  function confirm() {
    const mods: SelectedModifier[] = [];
    for (const group of item.modifierGroups) {
      for (const id of selectedMods[group.id] ?? []) {
        const modifier = group.modifiers.find((m) => m.id === id);
        if (modifier) {
          mods.push({
            modifierId: modifier.id,
            name: modifier.name,
            priceDeltaCents: modifier.priceDeltaCents,
          });
        }
      }
    }

    const customizations: AppliedCustomization[] = [];
    for (const ing of item.ingredients) {
      const action = ingActions[ing.id];
      if (!action) continue;
      customizations.push({
        ingredientId: ing.id,
        name: ing.name,
        action,
        priceDeltaCents: action === "NO" ? 0 : ing.extraPriceCents,
      });
    }

    onConfirm({ mods, customizations });
  }

  const unmetRequired = item.modifierGroups.some(
    (g) => (selectedMods[g.id]?.length ?? 0) < g.minSelect,
  );

  return (
    <div className="pos-modal-backdrop" onClick={onCancel}>
      <div className="pos-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{item.name}</h2>

        {item.modifierGroups.map((group) => (
          <div key={group.id} className="pos-modgroup">
            <div className="pos-modgroup__title">
              {group.name}
              <span className="pos-muted">
                {group.minSelect > 0
                  ? ` (choose ${group.minSelect}-${group.maxSelect})`
                  : " (optional)"}
              </span>
            </div>
            <div className="pos-modgroup__options">
              {group.modifiers.map((mod) => {
                const isSelected = (selectedMods[group.id] ?? []).includes(mod.id);
                return (
                  <button
                    key={mod.id}
                    className={`pos-mod-option ${isSelected ? "is-selected" : ""}`}
                    onClick={() => toggleMod(group.id, mod.id, group.maxSelect)}
                  >
                    <span>{mod.name}</span>
                    {mod.priceDeltaCents !== 0 && (
                      <span className="pos-muted">{priceLabel(mod.priceDeltaCents)}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {item.ingredients.length > 0 && (
          <div className="pos-modgroup">
            <div className="pos-modgroup__title">Customize</div>
            <div className="pos-ing-list">
              {item.ingredients.map((ing) => (
                <IngredientRow
                  key={ing.id}
                  ingredient={ing}
                  action={ingActions[ing.id]}
                  onSet={(a) => setAction(ing.id, a)}
                />
              ))}
            </div>
          </div>
        )}

        <div className="pos-modal__actions">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={unmetRequired}>
            Add to order
          </Button>
        </div>
      </div>
    </div>
  );
}

function IngredientRow({
  ingredient,
  action,
  onSet,
}: {
  ingredient: MenuItemIngredient;
  action: IngredientAction | undefined;
  onSet: (a: IngredientAction) => void;
}) {
  const canRemove = ingredient.includedByDefault && ingredient.removable;
  const canAdd = ingredient.addable && !ingredient.includedByDefault;
  const canExtra = ingredient.addable && ingredient.includedByDefault;
  const extra = ingredient.extraPriceCents;

  return (
    <div className="pos-ing-row">
      <span className="pos-ing-row__name">
        {ingredient.name}
        {ingredient.includedByDefault && <span className="pos-muted"> · standard</span>}
      </span>
      <div className="pos-ing-row__actions">
        {canRemove && (
          <button
            className={`pos-ing-btn ${action === "NO" ? "is-no" : ""}`}
            onClick={() => onSet("NO")}
          >
            No
          </button>
        )}
        {canAdd && (
          <button
            className={`pos-ing-btn ${action === "ADD" ? "is-yes" : ""}`}
            onClick={() => onSet("ADD")}
          >
            Add{extra > 0 ? ` +${money(extra)}` : ""}
          </button>
        )}
        {canExtra && (
          <button
            className={`pos-ing-btn ${action === "EXTRA" ? "is-yes" : ""}`}
            onClick={() => onSet("EXTRA")}
          >
            Extra{extra > 0 ? ` +${money(extra)}` : ""}
          </button>
        )}
      </div>
    </div>
  );
}
