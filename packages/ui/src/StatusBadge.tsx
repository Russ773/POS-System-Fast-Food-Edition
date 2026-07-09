export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

export interface StatusBadgeProps {
  label: string;
  tone?: StatusTone;
}

export function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  return <span className={`pos-status-badge pos-status-badge--${tone}`}>{label}</span>;
}

const ORDER_STATUS_TONES: Record<string, StatusTone> = {
  OPEN: "info",
  IN_PROGRESS: "warning",
  READY: "success",
  COMPLETED: "neutral",
  CANCELLED: "danger",
};

export function orderStatusTone(status: string): StatusTone {
  return ORDER_STATUS_TONES[status] ?? "neutral";
}
