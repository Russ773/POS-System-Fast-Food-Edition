import { Button, StatusBadge } from "@pos/ui";
import type { Order, OrderStatus } from "@pos/shared";
import { api } from "./api";
import { useOrderFeed } from "./useOrderFeed";

const COLUMNS: { status: OrderStatus; title: string; next?: OrderStatus; nextLabel?: string }[] = [
  { status: "OPEN", title: "New", next: "IN_PROGRESS", nextLabel: "Start" },
  { status: "IN_PROGRESS", title: "Cooking", next: "READY", nextLabel: "Ready" },
  { status: "READY", title: "Ready", next: "COMPLETED", nextLabel: "Complete" },
];

function minutesAgo(date: string | Date): string {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 1) return "just now";
  return `${mins}m ago`;
}

export function KitchenBoard({ locationId }: { locationId: string }) {
  const { orders, connected } = useOrderFeed(locationId);

  async function advance(order: Order, next: OrderStatus) {
    await api.orders.updateStatus(order.id, { status: next });
  }

  return (
    <>
      <div className={`kds-conn ${connected ? "is-online" : "is-offline"}`}>
        {connected ? "● Live" : "○ Reconnecting…"}
      </div>
      <div className="kds-board">
        {COLUMNS.map((col) => {
          const columnOrders = orders.filter((o) => o.status === col.status);
          return (
            <section key={col.status} className="kds-column">
              <header className="kds-column__header">
                {col.title} <span className="kds-count">{columnOrders.length}</span>
              </header>
              <div className="kds-column__body">
                {columnOrders.map((order) => (
                  <article key={order.id} className="kds-ticket">
                    <div className="kds-ticket__top">
                      <StatusBadge label={`#${order.id.slice(0, 6)}`} tone="info" />
                      <span className="kds-ticket__time">{minutesAgo(order.createdAt)}</span>
                    </div>
                    <ul className="kds-ticket__items">
                      {order.items.map((item) => (
                        <li key={item.id}>
                          <strong>{item.quantity}×</strong> {item.menuItemName}
                          {item.selectedModifiers.length > 0 && (
                            <div className="kds-ticket__mods">
                              {item.selectedModifiers.map((m) => m.name).join(", ")}
                            </div>
                          )}
                          {item.notes && <div className="kds-ticket__note">“{item.notes}”</div>}
                        </li>
                      ))}
                    </ul>
                    {col.next && (
                      <Button size="md" onClick={() => advance(order, col.next!)}>
                        {col.nextLabel}
                      </Button>
                    )}
                  </article>
                ))}
                {columnOrders.length === 0 && <p className="kds-empty">No orders</p>}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
