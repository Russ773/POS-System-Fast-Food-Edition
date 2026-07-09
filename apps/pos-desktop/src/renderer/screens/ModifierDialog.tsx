import { useState } from "react";
import { Button } from "@pos/ui";
import type { MenuItem, SelectedModifier } from "@pos/shared";

interface Props {
  item: MenuItem;
  onCancel: () => void;
  onConfirm: (mods: SelectedModifier[]) => void;
}

export function ModifierDialog({ item, onCancel, onConfirm }: Props) {
  // Track selected modifier ids per group.
  const [selected, setSelected] = useState<Record<string, string[]>>({});

  function toggle(groupId: string, modifierId: string, maxSelect: number) {
    setSelected((prev) => {
      const current = prev[groupId] ?? [];
      if (current.includes(modifierId)) {
        return { ...prev, [groupId]: current.filter((id) => id !== modifierId) };
      }
      if (maxSelect === 1) return { ...prev, [groupId]: [modifierId] };
      if (current.length >= maxSelect) return prev;
      return { ...prev, [groupId]: [...current, modifierId] };
    });
  }

  function confirm() {
    const mods: SelectedModifier[] = [];
    for (const group of item.modifierGroups) {
      for (const id of selected[group.id] ?? []) {
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
    onConfirm(mods);
  }

  const unmetRequired = item.modifierGroups.some(
    (g) => (selected[g.id]?.length ?? 0) < g.minSelect,
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
                {group.minSelect > 0 ? ` (choose ${group.minSelect}–${group.maxSelect})` : " (optional)"}
              </span>
            </div>
            <div className="pos-modgroup__options">
              {group.modifiers.map((mod) => {
                const isSelected = (selected[group.id] ?? []).includes(mod.id);
                return (
                  <button
                    key={mod.id}
                    className={`pos-mod-option ${isSelected ? "is-selected" : ""}`}
                    onClick={() => toggle(group.id, mod.id, group.maxSelect)}
                  >
                    <span>{mod.name}</span>
                    {mod.priceDeltaCents !== 0 && (
                      <span className="pos-muted">
                        {mod.priceDeltaCents > 0 ? "+" : "-"}${Math.abs(mod.priceDeltaCents / 100).toFixed(2)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
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
