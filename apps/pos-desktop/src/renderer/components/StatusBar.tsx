import { Button } from "@pos/ui";
import type { Location } from "@pos/shared";
import type { ConnStatus } from "../../shared/ipc";

interface Props {
  status: ConnStatus;
  location: Location | null;
  onUnpair: () => void;
}

export function StatusBar({ status, location, onUnpair }: Props) {
  return (
    <header className="pos-statusbar">
      <div className="pos-statusbar__left">
        <strong>🍔 Sample POS</strong>
        {location && <span className="pos-statusbar__loc">{location.name}</span>}
      </div>
      <div className="pos-statusbar__right">
        {status.pendingCount > 0 && (
          <span className="pos-pending">{status.pendingCount} queued</span>
        )}
        <span className={`pos-conn ${status.online ? "is-online" : "is-offline"}`}>
          {status.online ? "● Online" : "○ Offline"}
        </span>
        {location && (
          <Button variant="ghost" onClick={onUnpair}>
            Unpair
          </Button>
        )}
      </div>
    </header>
  );
}
