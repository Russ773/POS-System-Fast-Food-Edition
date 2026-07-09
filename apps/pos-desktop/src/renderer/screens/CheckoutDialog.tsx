import { useState } from "react";
import { Button } from "@pos/ui";
import type { EnqueueResult } from "../../shared/ipc";
import type { PaymentMethod } from "@pos/shared";

interface Props {
  totalCents: number;
  onCancel: () => void;
  onConfirm: (method: PaymentMethod) => Promise<{ result: EnqueueResult; method: PaymentMethod }>;
}

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function CheckoutDialog({ totalCents, onCancel, onConfirm }: Props) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ synced: boolean } | null>(null);

  async function pay(method: PaymentMethod) {
    setBusy(true);
    const { result } = await onConfirm(method);
    setDone({ synced: result.synced });
    setBusy(false);
  }

  return (
    <div className="pos-modal-backdrop" onClick={busy ? undefined : onCancel}>
      <div className="pos-modal" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <div className="pos-checkout-done">
            <h2>{done.synced ? "✅ Order sent" : "📥 Order queued"}</h2>
            <p className="pos-muted">
              {done.synced
                ? "The order was sent to the kitchen."
                : "You're offline — the order is saved and will sync automatically when the connection returns."}
            </p>
            <Button size="lg" onClick={onCancel}>
              New order
            </Button>
          </div>
        ) : (
          <>
            <h2>Checkout</h2>
            <div className="pos-checkout-total">
              <span>Amount due</span>
              <strong>{money(totalCents)}</strong>
            </div>
            <p className="pos-muted">Payment is simulated in this build (no real processor).</p>
            <div className="pos-checkout-methods">
              <Button size="lg" disabled={busy} onClick={() => pay("CASH")}>
                💵 Cash
              </Button>
              <Button size="lg" disabled={busy} onClick={() => pay("CARD_MOCK")}>
                💳 Card
              </Button>
            </div>
            <Button variant="ghost" disabled={busy} onClick={onCancel}>
              Cancel
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
