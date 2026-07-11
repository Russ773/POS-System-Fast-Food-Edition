import { useState, type FormEvent } from "react";
import { Button, Card, Input, Select } from "@pos/ui";
import { SUPPORTED_CURRENCIES, formatMoney } from "@pos/shared";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";

export function SettingsPage() {
  const { settings, applySettings } = useAuth();
  const [orgName, setOrgName] = useState(settings?.orgName ?? "");
  const [currency, setCurrency] = useState(settings?.currency ?? "USD");
  const [taxPercent, setTaxPercent] = useState(((settings?.taxRateBps ?? 0) / 100).toString());
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const updated = await api.settings.update({
        orgName: orgName.trim(),
        currency,
        taxRateBps: Math.round(parseFloat(taxPercent || "0") * 100),
      });
      applySettings(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <h1>Settings</h1>
      <Card style={{ maxWidth: 520 }}>
        <form onSubmit={save} className="stack-form">
          <Input label="Business name" value={orgName} onChange={(e) => setOrgName(e.target.value)} />

          <Select label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </Select>

          <Input
            label="Sales tax rate (%)"
            type="number"
            step="0.01"
            value={taxPercent}
            onChange={(e) => setTaxPercent(e.target.value)}
          />

          <p className="muted">
            Example price in this currency: <strong>{formatMoney(599, currency)}</strong>
          </p>

          {error && <p className="login-error">{error}</p>}
          {saved && <p style={{ color: "var(--pos-color-success)", margin: 0 }}>Saved.</p>}

          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save settings"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
