import { createApiClient } from "@pos/shared";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export function getStoredToken(): string | null {
  return localStorage.getItem("pos_admin_token");
}

export const api = createApiClient({
  baseUrl: API_URL,
  getToken: getStoredToken,
});
