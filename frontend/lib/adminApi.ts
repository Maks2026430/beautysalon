// Admin/CRM API client. Uses its own access-token slot ("admin_token");
// the refresh token rides in the shared httpOnly cookie.

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";
const TOKEN_KEY = "admin_token";

export class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

let token: string | null = null;
function getToken() {
  if (token) return token;
  if (typeof window !== "undefined") token = localStorage.getItem(TOKEN_KEY);
  return token;
}
function setToken(t: string) {
  token = t;
  if (typeof window !== "undefined") localStorage.setItem(TOKEN_KEY, t);
}
function clearToken() {
  token = null;
  if (typeof window !== "undefined") localStorage.removeItem(TOKEN_KEY);
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/auth/refresh`, { method: "POST", credentials: "include" });
    if (!res.ok) return false;
    setToken((await res.json()).access_token);
    return true;
  } catch {
    return false;
  }
}

async function req<T>(path: string, opts: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(opts.headers);
  const t = getToken();
  if (t) headers.set("Authorization", `Bearer ${t}`);
  if (opts.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const res = await fetch(`${BASE}${path}`, { ...opts, headers, credentials: "include" });
  if (res.status === 401 && retry) {
    if (await tryRefresh()) return req<T>(path, opts, false);
    clearToken();
    throw new ApiError(401, "unauthorized");
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const d = (await res.json()).detail;
      if (typeof d === "string") detail = d;
      // FastAPI-ошибки валидации приходят массивом {loc, msg, type} — склеиваем msg.
      else if (Array.isArray(d)) detail = d.map((e) => e?.msg ?? String(e)).join("; ");
      else if (d) detail = typeof d === "object" ? JSON.stringify(d) : String(d);
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, detail);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

// ─── Types ───────────────────────────────────────────────────────────
export type Staff = { id: string; email: string; name: string | null; role: "admin" | "staff" };
export type AdminAppointment = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  price: number | null;
  user: { id: string; name: string | null; phone: string };
  master: { id: string; name: string; photo_url?: string | null };
  service: { id: string; name: string; duration_minutes: number };
};
export type ClientRow = {
  id: string;
  name: string | null;
  phone: string;
  visits_count: number;
  created_at: string | null;
};
export type ClientDetail = ClientRow & {
  birth_date: string | null;
  notify_24h: boolean;
  notify_2h: boolean;
  appointments: AdminAppointment[];
  offer: { service_id: string; service_name: string | null; expires_at: string } | null;
};
export type Interval = { day_of_week: number; start_time: string; end_time: string };
export type AdminMaster = {
  id: string;
  slug: string | null;
  name: string;
  bio: string | null;
  photo_url: string | null;
  specializations: string[] | null;
  rating: number | null;
  is_active: boolean;
  schedules: Interval[];
};
export type AdminService = {
  id: string;
  slug: string | null;
  name: string;
  category: string | null;
  description: string | null;
  price: number;
  duration_minutes: number;
  is_active: boolean;
};
export type Stats = {
  date_from: string;
  date_to: string;
  revenue_total: number;
  revenue_series: { date: string; amount: number }[];
  top_services: { name: string; count: number; revenue: number }[];
  masters_utilization: { master: string; percent: number }[];
  funnel: { started: number; completed: number; booked: number };
};

export const adminAuth = {
  login: async (email: string, password: string) => {
    const data = await req<{ access_token: string }>("/auth/staff/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(data.access_token);
  },
  me: () => req<Staff>("/auth/staff/me"),
  logout: async () => {
    try {
      await req("/auth/logout", { method: "POST" });
    } finally {
      clearToken();
    }
  },
};

export const admin = {
  appointments: (from: string, to: string, masterId?: string) =>
    req<AdminAppointment[]>(
      `/admin/appointments?date_from=${from}&date_to=${to}${masterId ? `&master_id=${masterId}` : ""}`,
    ),
  setStatus: (id: string, status: string) =>
    req<AdminAppointment>(`/admin/appointments/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  clients: (q?: string) => req<ClientRow[]>(`/admin/clients${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  client: (id: string) => req<ClientDetail>(`/admin/clients/${id}`),
  masters: () => req<AdminMaster[]>("/admin/masters"),
  createMaster: (body: Partial<AdminMaster>) =>
    req<AdminMaster>("/admin/masters", { method: "POST", body: JSON.stringify(body) }),
  updateMaster: (id: string, body: Partial<AdminMaster>) =>
    req<AdminMaster>(`/admin/masters/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteMaster: (id: string) => req<void>(`/admin/masters/${id}`, { method: "DELETE" }),
  replaceSchedule: (id: string, intervals: Interval[]) =>
    req<AdminMaster>(`/admin/masters/${id}/schedule`, {
      method: "PUT",
      body: JSON.stringify({ intervals }),
    }),
  services: () => req<AdminService[]>("/admin/services"),
  createService: (body: Partial<AdminService>) =>
    req<AdminService>("/admin/services", { method: "POST", body: JSON.stringify(body) }),
  updateService: (id: string, body: Partial<AdminService>) =>
    req<AdminService>(`/admin/services/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteService: (id: string) => req<void>(`/admin/services/${id}`, { method: "DELETE" }),
  importServices: (payload: { csv?: string; items?: unknown[] }) =>
    req<{ created: number; updated: number }>("/admin/services/import", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Staff (admin only)
  staff: () => req<Staff[]>("/admin/staff"),
  createStaff: (body: { email: string; password: string; name?: string; role: string }) =>
    req<Staff>("/admin/staff", { method: "POST", body: JSON.stringify(body) }),
  updateStaff: (id: string, body: { name?: string; role?: string; password?: string }) =>
    req<Staff>(`/admin/staff/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteStaff: (id: string) => req<void>(`/admin/staff/${id}`, { method: "DELETE" }),

  // Stats are exposed as three focused endpoints (spec 7); merge for the dashboard.
  stats: async (from: string, to: string): Promise<Stats> => {
    const qs = `date_from=${from}&date_to=${to}`;
    const [rev, funnel, load] = await Promise.all([
      req<{
        date_from: string;
        date_to: string;
        revenue_total: number;
        revenue_series: { date: string; amount: number }[];
        top_services: { name: string; count: number; revenue: number }[];
      }>(`/admin/stats/revenue?${qs}`),
      req<{ started: number; completed: number; booked: number }>(`/admin/stats/funnel?${qs}`),
      req<{ masters: { master: string; percent: number }[] }>(`/admin/stats/masters-load?${qs}`),
    ]);
    return {
      date_from: rev.date_from,
      date_to: rev.date_to,
      revenue_total: rev.revenue_total,
      revenue_series: rev.revenue_series,
      top_services: rev.top_services,
      masters_utilization: load.masters,
      funnel,
    };
  },
};
