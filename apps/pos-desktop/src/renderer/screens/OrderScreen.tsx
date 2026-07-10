import { useMemo, useState } from "react";
import { Button } from "@pos/ui";
import type {
  AppliedCustomization,
  Employee,
  Location,
  MenuItem,
  PaymentMethod,
  SelectedModifier,
} from "@pos/shared";
import { api } from "../posClient";
import { useMenu } from "./useMenu";
import {
  CartLine,
  CartMealSelection,
  cartTotalCents,
  customizationSummary,
  lineTotalCents,
} from "./cart";
import { CustomizeDialog } from "./CustomizeDialog";
import { MealDialog } from "./MealDialog";
import { CheckoutDialog } from "./CheckoutDialog";

interface Props {
  location: Location;
  employee: Employee;
  onClockOut: () => void;
}

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// Sentinel tab id for the dedicated "Meals" section.
const MEALS_TAB = "__meals__";

export function OrderScreen({ employee, onClockOut }: Props) {
  const { categories, items, loading } = useMenu();
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [customizeItem, setCustomizeItem] = useState<MenuItem | null>(null);
  const [mealItem, setMealItem] = useState<MenuItem | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const hasMeals = useMemo(() => items.some((i) => i.isMeal), [items]);
  const currentCategory =
    activeCategoryId ?? (hasMeals ? MEALS_TAB : categories[0]?.id ?? null);
  const visibleItems = useMemo(
    () =>
      currentCategory === MEALS_TAB
        ? items.filter((i) => i.isActive && i.isMeal)
        : items.filter((i) => i.isActive && !i.isMeal && i.categoryId === currentCategory),
    [items, currentCategory],
  );

  function addItem(
    item: MenuItem,
    mods: SelectedModifier[],
    customizations: AppliedCustomization[],
    mealSelections: CartMealSelection[] = [],
  ) {
    setLines((prev) => [
      ...prev,
      {
        lineId: crypto.randomUUID(),
        menuItem: item,
        quantity: 1,
        selectedModifiers: mods,
        customizations,
        mealSelections,
      },
    ]);
  }

  // Which components of a meal can be customised (have size options / build).
  function customisableComponents(meal: MenuItem): MenuItem[] {
    return meal.mealComponents
      .map((c) => items.find((i) => i.id === c.componentItemId))
      .filter(
        (i): i is MenuItem => !!i && (i.modifierGroups.length > 0 || i.ingredients.length > 0),
      );
  }

  function onItemTap(item: MenuItem) {
    if (item.isMeal) {
      // If any component can be customised, open the meal dialog; else add directly.
      if (customisableComponents(item).length > 0) setMealItem(item);
      else addItem(item, [], [], []);
    } else if (item.modifierGroups.length > 0 || item.ingredients.length > 0) {
      setCustomizeItem(item);
    } else {
      addItem(item, [], []);
    }
  }

  function changeQty(lineId: string, delta: number) {
    setLines((prev) =>
      prev
        .map((l) => (l.lineId === lineId ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0),
    );
  }

  const total = cartTotalCents(lines);

  async function submitOrder(method: PaymentMethod) {
    const clientRefId = crypto.randomUUID();
    const orderTotal = total;
    const result = await window.pos.enqueueOrder({
      clientRefId,
      orderType: "TAKEOUT",
      employeeId: employee.id,
      items: lines.map((l) => ({
        menuItemId: l.menuItem.id,
        quantity: l.quantity,
        selectedModifierIds: l.selectedModifiers.map((m) => m.modifierId),
        customizations: l.customizations.map((c) => ({
          ingredientId: c.ingredientId,
          action: c.action,
        })),
        mealSelections: l.mealSelections.map((s) => s.request),
        notes: l.notes,
      })),
    });
    // Mock payment capture only for orders that reached the server immediately.
    // Offline orders capture payment implicitly at sync time (deferred to a
    // later milestone); the order itself is never lost.
    if (result.synced && result.order) {
      try {
        await api.orders.capturePayment(result.order.id, { method, amountCents: orderTotal });
      } catch {
        /* non-fatal for the mock flow */
      }
    }
    setLines([]);
    setCheckoutOpen(false);
    return { result, method };
  }

  return (
    <div className="pos-order">
      <div className="pos-menu">
        <div className="pos-cat-tabs">
          {hasMeals && (
            <button
              key={MEALS_TAB}
              className={`pos-cat-tab pos-cat-tab--meals ${currentCategory === MEALS_TAB ? "is-active" : ""}`}
              onClick={() => setActiveCategoryId(MEALS_TAB)}
            >
              🍔 Meals
            </button>
          )}
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`pos-cat-tab ${cat.id === currentCategory ? "is-active" : ""}`}
              onClick={() => setActiveCategoryId(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>
        {loading && <p className="pos-muted">Loading menu…</p>}
        <div className="pos-item-grid">
          {visibleItems.map((item) => (
            <button key={item.id} className="pos-item-card" onClick={() => onItemTap(item)}>
              <span className="pos-item-card__name">
                {item.name}
                {item.isMeal && <span className="pos-combo-badge">MEAL</span>}
              </span>
              {item.isMeal && item.mealComponents.length > 0 && (
                <span className="pos-item-card__combo">
                  {item.mealComponents.map((c) => c.name).join(" + ")}
                </span>
              )}
              <span className="pos-item-card__price">{money(item.priceCents)}</span>
            </button>
          ))}
          {!loading && visibleItems.length === 0 && (
            <p className="pos-muted">No items in this category.</p>
          )}
        </div>
      </div>

      <aside className="pos-cart">
        <div className="pos-cart__header">
          <span>{employee.name}</span>
          <Button variant="ghost" onClick={onClockOut}>
            Clock out
          </Button>
        </div>
        <div className="pos-cart__lines">
          {lines.map((line) => (
            <div key={line.lineId} className="pos-cart-line">
              <div className="pos-cart-line__main">
                <span>{line.menuItem.name}</span>
                <span>{money(lineTotalCents(line))}</span>
              </div>
              {line.selectedModifiers.length > 0 && (
                <div className="pos-cart-line__mods">
                  {line.selectedModifiers.map((m) => m.name).join(", ")}
                </div>
              )}
              {line.customizations.length > 0 && (
                <div className="pos-cart-line__mods">{customizationSummary(line.customizations)}</div>
              )}
              {line.mealSelections.map((s, i) => (
                <div key={i} className="pos-cart-line__mods">
                  {s.quantity}× {s.name}
                  {s.summary ? ` — ${s.summary}` : ""}
                </div>
              ))}
              <div className="pos-cart-line__qty">
                <button onClick={() => changeQty(line.lineId, -1)}>−</button>
                <span>{line.quantity}</span>
                <button onClick={() => changeQty(line.lineId, 1)}>+</button>
              </div>
            </div>
          ))}
          {lines.length === 0 && <p className="pos-muted">Cart is empty.</p>}
        </div>
        <div className="pos-cart__footer">
          <div className="pos-cart__total">
            <span>Total</span>
            <strong>{money(total)}</strong>
          </div>
          <Button size="lg" disabled={lines.length === 0} onClick={() => setCheckoutOpen(true)}>
            Checkout
          </Button>
        </div>
      </aside>

      {customizeItem && (
        <CustomizeDialog
          item={customizeItem}
          onCancel={() => setCustomizeItem(null)}
          onConfirm={({ mods, customizations }) => {
            addItem(customizeItem, mods, customizations);
            setCustomizeItem(null);
          }}
        />
      )}

      {mealItem && (
        <MealDialog
          meal={mealItem}
          items={items}
          onCancel={() => setMealItem(null)}
          onConfirm={(selections) => {
            addItem(mealItem, [], [], selections);
            setMealItem(null);
          }}
        />
      )}

      {checkoutOpen && (
        <CheckoutDialog
          totalCents={total}
          onCancel={() => setCheckoutOpen(false)}
          onConfirm={submitOrder}
        />
      )}
    </div>
  );
}
