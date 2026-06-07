// Backend API client for the client dashboard.
// Access token lives in localStorage; the refresh token is an httpOnly cookie
// set by the backend, so refresh works via `credentials: "include"`.

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";
const TOKEN_KEY = "access_token";

export class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

let accessToken: string | null = null;

function getToken(): string | null {
  if (accessToken) return accessToken;
  if (typeof window !== "undefined") accessToken = localStorage.getItem(TOKEN_KEY);
  return accessToken;
}

function setToken(token: string) {
  accessToken = token;
  if (typeof window !== "undefined") localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  accessToken = null;
  if (typeof window !== "undefined") localStorage.removeItem(TOKEN_KEY);
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return false;
    const data = await res.json();
    setToken(data.access_token);
    return true;
  } catch {
    return false;
  }
}

async function apiFetch<T>(path: string, opts: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(opts.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (opts.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const res = await fetch(`${BASE}${path}`, { ...opts, headers, credentials: "include" });

  if (res.status === 401 && retry) {
    if (await tryRefresh()) return apiFetch<T>(path, opts, false);
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
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Types ───────────────────────────────────────────────────────────
export type MiniMaster = { id: string; name: string; photo_url?: string | null };
export type MiniService = {
  id: string;
  name: string;
  category?: string | null;
  duration_minutes: number;
};
export type Appointment = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  price: number | null;
  discount_applied: boolean;
  master: MiniMaster;
  service: MiniService;
};
export type DashboardData = {
  upcoming: Appointment | null;
  last_appointment: Appointment | null;
  offer: { service_id: string; service_name: string | null; expires_at: string } | null;
};
export type Profile = {
  id: string;
  phone: string;
  name: string | null;
  notify_24h: boolean;
  notify_2h: boolean;
};
export type ServiceItem = {
  id: string;
  slug: string | null;
  name: string;
  category: string | null;
  description: string | null;
  price: number;
  duration_minutes: number;
};
export type MasterItem = {
  id: string;
  slug: string | null;
  name: string;
  bio: string | null;
  photo_url: string | null;
  specializations: string[] | null;
  rating: number | null;
};
export type DiscountState = {
  active: boolean;
  service_id: string | null;
  service_name: string | null;
  discount_percent: number;
  expires_at: string | null;
};

// ─── Auth ────────────────────────────────────────────────────────────
export const auth = {
  requestOtp: (phone: string) =>
    apiFetch<{ sent: boolean; debug_code: string | null }>("/auth/request-otp", {
      method: "POST",
      body: JSON.stringify({ phone }),
    }),
  verifyOtp: async (phone: string, code: string, name?: string) => {
    const data = await apiFetch<{ access_token: string }>("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ phone, code, name }),
    });
    setToken(data.access_token);
    return data;
  },
  me: () => apiFetch<Profile>("/auth/me"),
  logout: async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } finally {
      clearToken();
    }
  },
  hasToken: () => !!getToken(),
};

// ─── Data ────────────────────────────────────────────────────────────
export const api = {
  dashboard: () => apiFetch<DashboardData>("/dashboard"),
  upcoming: () => apiFetch<Appointment[]>("/appointments/upcoming"),
  history: () => apiFetch<Appointment[]>("/appointments/history"),
  my: () => apiFetch<Appointment[]>("/appointments/my"),
  cancel: (id: string) => apiFetch<Appointment>(`/appointments/${id}`, { method: "DELETE" }),
  profile: () => apiFetch<Profile>("/profile"),
  updateProfile: (patch: Partial<Pick<Profile, "name" | "notify_24h" | "notify_2h">> & { birth_date?: string }) =>
    apiFetch<Profile>("/profile", { method: "PATCH", body: JSON.stringify(patch) }),
  services: () => apiFetch<ServiceItem[]>("/services"),
  masters: () => apiFetch<MasterItem[]>("/masters"),
  availability: (masterId: string, serviceId: string) =>
    apiFetch<{ service_id: string; duration_minutes: number; slots: string[] }>(
      `/appointments/availability?master_id=${masterId}&service_id=${serviceId}`,
    ),
  createAppointment: (body: { master_id: string; service_id: string; starts_at: string }) =>
    apiFetch<Appointment>("/appointments", { method: "POST", body: JSON.stringify(body) }),
  claimOffer: (sessionId: string, procedureId?: string) =>
    apiFetch<DiscountState>("/bot/discount/claim", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId, procedure_id: procedureId }),
    }),
};

// ─── Pending offer claim (bot → DB after login) ──────────────────────
const PENDING_CLAIM_KEY = "lumiere_pending_claim";

// Called from the bot when an anonymous user taps "Сохранить предложение":
// remember the session so we can persist the offer once they log in.
export function markPendingClaim(sessionId: string) {
  if (typeof window !== "undefined") localStorage.setItem(PENDING_CLAIM_KEY, sessionId);
}

// Best-effort: run right after login. Persists a pending bot offer into the
// user's discount_offers, then clears the marker. Never throws.
export async function claimPendingOffer(): Promise<void> {
  if (typeof window === "undefined") return;
  const sessionId = localStorage.getItem(PENDING_CLAIM_KEY);
  if (!sessionId) return;
  try {
    await api.claimOffer(sessionId);
  } catch {
    /* ignore — the offer can still be claimed later from the dashboard */
  } finally {
    localStorage.removeItem(PENDING_CLAIM_KEY);
  }
}
