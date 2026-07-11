import { useEffect, useState } from "react";
import type { Employee, Location } from "@pos/shared";
import type { ConnStatus } from "../shared/ipc";
import { deviceApi, setDeviceToken, setPosCurrency } from "./posClient";
import { PairingScreen } from "./screens/PairingScreen";
import { ClockInScreen } from "./screens/ClockInScreen";
import { OrderScreen } from "./screens/OrderScreen";
import { StatusBar } from "./components/StatusBar";

type Phase = "loading" | "pairing" | "clock-in" | "ordering";

export function App() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [location, setLocation] = useState<Location | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [status, setStatus] = useState<ConnStatus>({ online: false, pendingCount: 0 });

  useEffect(() => {
    window.pos.getPairing().then((pairing) => {
      if (pairing) {
        setDeviceToken(pairing.deviceToken);
        setLocation(pairing.location);
        setPhase("clock-in");
        // Load org currency so prices format correctly (best-effort/online).
        deviceApi.settings.get().then((s) => setPosCurrency(s.currency)).catch(() => {});
      } else {
        setPhase("pairing");
      }
    });
    window.pos.getStatus().then(setStatus);
    const off = window.pos.onStatusChanged(setStatus);
    return off;
  }, []);

  function onPaired(loc: Location) {
    setLocation(loc);
    setPhase("clock-in");
    deviceApi.settings.get().then((s) => setPosCurrency(s.currency)).catch(() => {});
  }

  function onClockedIn(emp: Employee) {
    setEmployee(emp);
    setPhase("ordering");
  }

  async function onUnpair() {
    await window.pos.clearPairing();
    setDeviceToken(null);
    setLocation(null);
    setEmployee(null);
    setPhase("pairing");
  }

  function onClockOut() {
    setEmployee(null);
    setPhase("clock-in");
  }

  return (
    <div className="pos-root">
      <StatusBar status={status} location={location} onUnpair={onUnpair} />
      <div className="pos-body">
        {phase === "loading" && <div className="pos-center">Loading…</div>}
        {phase === "pairing" && <PairingScreen onPaired={onPaired} />}
        {phase === "clock-in" && location && (
          <ClockInScreen location={location} onClockedIn={onClockedIn} />
        )}
        {phase === "ordering" && location && employee && (
          <OrderScreen location={location} employee={employee} onClockOut={onClockOut} />
        )}
      </div>
    </div>
  );
}
