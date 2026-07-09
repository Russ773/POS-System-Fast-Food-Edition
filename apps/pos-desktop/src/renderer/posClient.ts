import { createApiClient } from "@pos/shared";

// The device token lives in the main process; the renderer receives it after
// pairing and holds it in memory for authenticated API calls (menu, PIN login).
let deviceToken: string | null = null;
let employeeToken: string | null = null;

export function setDeviceToken(token: string | null) {
  deviceToken = token;
}

export function setEmployeeToken(token: string | null) {
  employeeToken = token;
}

// Employee-scoped client (used once clocked in) prefers the employee token so
// orders are attributed to the employee; falls back to the device token.
export const api = createApiClient({
  baseUrl: window.pos.apiUrl,
  getToken: () => employeeToken ?? deviceToken,
});

// A separate client that always uses the device token, for pairing-time calls
// like employee PIN login (which requires a device token specifically).
export const deviceApi = createApiClient({
  baseUrl: window.pos.apiUrl,
  getToken: () => deviceToken,
});
