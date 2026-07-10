import { useEffect, useState } from "react";
import { Card, Input } from "@pos/ui";
import type { ReportSummary } from "@pos/shared";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import { centsToDollars } from "../format";

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function ReportingPage() {
  const { selectedLocationId } = useAuth();
  const [from, setFrom] = useState(isoDaysAgo(6));
  const [to, setTo] = useState(isoDaysAgo(0));
  const [data, setData] = useState<ReportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedLocationId) return;
    setLoading(true);
    setError(null);
    api.reports
      .summary({ locationId: selectedLocationId, from, to })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedLocationId, from, to]);

  const maxDay = data ? Math.max(1, ...data.byDay.map((d) => d.totalCents)) : 1;

  return (
    <div className="page">
      <div className="reporting-head">
        <h1>Reporting</h1>
        <div className="reporting-range">
          <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      {error && <p className="login-error">{error}</p>}
      {loading && <p className="muted">Loading…</p>}

      {data && (
        <>
          <div className="kpi-row">
            <Card className="kpi">
              <span className="kpi__label">Total Sales</span>
              <span className="kpi__value">{centsToDollars(data.totalCents)}</span>
            </Card>
            <Card className="kpi">
              <span className="kpi__label">Orders</span>
              <span className="kpi__value">{data.orderCount}</span>
            </Card>
            <Card className="kpi">
              <span className="kpi__label">Avg Order</span>
              <span className="kpi__value">{centsToDollars(data.avgOrderCents)}</span>
            </Card>
          </div>

          <Card>
            <h2>Sales by day</h2>
            <div className="bar-chart">
              {data.byDay.map((d) => (
                <div key={d.date} className="bar-col" title={`${d.date}: ${centsToDollars(d.totalCents)}`}>
                  <div className="bar-col__track">
                    <div
                      className="bar-col__fill"
                      style={{ height: `${(d.totalCents / maxDay) * 100}%` }}
                    />
                  </div>
                  <span className="bar-col__label">{d.date.slice(5)}</span>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid-2">
            <Card>
              <h2>Top sellers</h2>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Sales</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topItems.map((t) => (
                    <tr key={t.menuItemId}>
                      <td>{t.name}</td>
                      <td>{t.quantity}</td>
                      <td>{centsToDollars(t.totalCents)}</td>
                    </tr>
                  ))}
                  {data.topItems.length === 0 && (
                    <tr>
                      <td colSpan={3} className="muted">
                        No sales in this range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>

            <Card>
              <h2>Payments</h2>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Method</th>
                    <th>Count</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byPaymentMethod.map((p) => (
                    <tr key={p.method}>
                      <td>{p.method === "CARD_MOCK" ? "Card" : "Cash"}</td>
                      <td>{p.count}</td>
                      <td>{centsToDollars(p.totalCents)}</td>
                    </tr>
                  ))}
                  {data.byPaymentMethod.length === 0 && (
                    <tr>
                      <td colSpan={3} className="muted">
                        No captured payments in this range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
