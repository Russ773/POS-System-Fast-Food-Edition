import { createApiClient } from "@pos/shared";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? API_URL;

let token: string | null = localStorage.getItem("pos_kds_token");

export function setToken(value: string | null) {
  token = value;
  if (value) localStorage.setItem("pos_kds_token", value);
  else localStorage.removeItem("pos_kds_token");
}

export function getToken() {
  return token;
}

export const api = createApiClient({ baseUrl: API_URL, getToken });
