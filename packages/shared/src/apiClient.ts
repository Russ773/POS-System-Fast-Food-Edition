import type { Employee, InventoryItem, Location, MenuCategory, MenuItem, Order, Shift } from "./entities";
import type { ReportSummary } from "./reports";
import type {
  CapturePaymentRequest,
  CreateEmployeeRequest,
  CreateInventoryItemRequest,
  CreateMenuCategoryRequest,
  CreateMenuItemRequest,
  CreateOrderRequest,
  DevicePairRequest,
  DevicePairResponse,
  EmployeePinLoginRequest,
  EmployeePinLoginResponse,
  LoginRequest,
  LoginResponse,
  UpdateEmployeeRequest,
  UpdateInventoryItemRequest,
  UpdateMenuCategoryRequest,
  UpdateMenuItemRequest,
  UpdateOrderStatusRequest,
} from "./requests";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  getToken?: () => string | null | undefined;
}

function withLocation(path: string, locationId?: string): string {
  return locationId ? `${path}?locationId=${encodeURIComponent(locationId)}` : path;
}

export function createApiClient({ baseUrl, getToken }: ApiClientOptions) {
  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const token = getToken?.();
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({ message: res.statusText }))) as {
        message?: string;
      };
      throw new ApiError(res.status, body.message ?? "Request failed");
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  return {
    auth: {
      login: (body: LoginRequest) =>
        request<LoginResponse>("/auth/login", { method: "POST", body: JSON.stringify(body) }),
      pairDevice: (body: DevicePairRequest) =>
        request<DevicePairResponse>("/auth/device-pair", {
          method: "POST",
          body: JSON.stringify(body),
        }),
      employeePinLogin: (body: EmployeePinLoginRequest) =>
        request<EmployeePinLoginResponse>("/auth/employee-pin-login", {
          method: "POST",
          body: JSON.stringify(body),
        }),
    },
    locations: {
      list: () => request<Location[]>("/locations"),
      create: (body: { name: string; address?: string; timezone?: string }) =>
        request<Location>("/locations", { method: "POST", body: JSON.stringify(body) }),
    },
    menu: {
      listCategories: () => request<MenuCategory[]>("/menu/categories"),
      createCategory: (body: CreateMenuCategoryRequest) =>
        request<MenuCategory>("/menu/categories", { method: "POST", body: JSON.stringify(body) }),
      updateCategory: (id: string, body: UpdateMenuCategoryRequest) =>
        request<MenuCategory>(`/menu/categories/${id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        }),
      deleteCategory: (id: string) =>
        request<void>(`/menu/categories/${id}`, { method: "DELETE" }),
      listItems: () => request<MenuItem[]>("/menu/items"),
      createItem: (body: CreateMenuItemRequest) =>
        request<MenuItem>("/menu/items", { method: "POST", body: JSON.stringify(body) }),
      updateItem: (id: string, body: UpdateMenuItemRequest) =>
        request<MenuItem>(`/menu/items/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
      deleteItem: (id: string) => request<void>(`/menu/items/${id}`, { method: "DELETE" }),
    },
    inventory: {
      list: (locationId?: string) => request<InventoryItem[]>(withLocation("/inventory", locationId)),
      create: (body: CreateInventoryItemRequest, locationId?: string) =>
        request<InventoryItem>(withLocation("/inventory", locationId), {
          method: "POST",
          body: JSON.stringify(body),
        }),
      update: (id: string, body: UpdateInventoryItemRequest) =>
        request<InventoryItem>(`/inventory/${id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        }),
      remove: (id: string) => request<void>(`/inventory/${id}`, { method: "DELETE" }),
    },
    employees: {
      list: (locationId?: string) => request<Employee[]>(withLocation("/employees", locationId)),
      create: (body: CreateEmployeeRequest, locationId?: string) =>
        request<Employee>(withLocation("/employees", locationId), {
          method: "POST",
          body: JSON.stringify(body),
        }),
      update: (id: string, body: UpdateEmployeeRequest) =>
        request<Employee>(`/employees/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
      clockIn: (id: string) =>
        request<Shift>(`/employees/${id}/clock-in`, { method: "POST" }),
      clockOut: (id: string) =>
        request<Shift>(`/employees/${id}/clock-out`, { method: "POST" }),
      listShifts: (locationId?: string) => request<Shift[]>(withLocation("/shifts", locationId)),
    },
    reports: {
      summary: (params: { locationId: string; from?: string; to?: string }) => {
        const query = new URLSearchParams({ locationId: params.locationId });
        if (params.from) query.set("from", params.from);
        if (params.to) query.set("to", params.to);
        return request<ReportSummary>(`/reports/summary?${query.toString()}`);
      },
    },
    orders: {
      list: (params?: { status?: string; locationId?: string }) => {
        const query = new URLSearchParams();
        if (params?.status) query.set("status", params.status);
        if (params?.locationId) query.set("locationId", params.locationId);
        const qs = query.toString();
        return request<Order[]>(`/orders${qs ? `?${qs}` : ""}`);
      },
      create: (body: CreateOrderRequest) =>
        request<Order>("/orders", { method: "POST", body: JSON.stringify(body) }),
      updateStatus: (id: string, body: UpdateOrderStatusRequest) =>
        request<Order>(`/orders/${id}/status`, { method: "PATCH", body: JSON.stringify(body) }),
      capturePayment: (id: string, body: CapturePaymentRequest) =>
        request<Order>(`/orders/${id}/payment`, { method: "POST", body: JSON.stringify(body) }),
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
