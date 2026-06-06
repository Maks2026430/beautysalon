"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { admin, type AdminAppointment, type AdminMaster } from "@/lib/adminApi";
import { useIsAdmin } from "@/components/admin/AdminProvider";
import { formatShortDate, formatTime, formatWeekday } from "@/lib/format";

const STATUSES = ["pending", "confirmed", "completed", "cancelled", "no_show"] as const;
const LABELS: Record<string, string> = {
  pending: "Ожидает",
  confirmed: "Подтверждена",
  completed: "Завершена",
  cancelled: "Отменена",
  no_show: "Неявка",
};
// Статусы в фирменной палитре: нейтральный → роза → слива; красный (отмена) и
// приглушённый тёмный (неявка) остаются как «негативные» состояния.
const COLORS: Record<string, string> = {
  pending: "bg-sand text-espresso/70",
  confirmed: "bg-accent/15 text-accent-dark",
  completed: "bg-plum/15 text-plum",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-espresso/10 text-espresso/55",
};

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function StatusControl({
  appt,
  onChange,
}: {
  appt: AdminAppointment;
  onChange: (status: string) => void;
}) {
  const isAdmin = useIsAdmin();
  if (!isAdmin) {
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs ${COLORS[appt.status] ?? ""}`}>
        {LABELS[appt.status] ?? appt.status}
      </span>
    );
  }
  return (
    <select
      value={appt.status}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-full border-none px-2 py-1 text-xs outline-none ${COLORS[appt.status] ?? ""}`}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {LABELS[s]}
        </option>
      ))}
    </select>
  );
}

export default function SchedulePage() {
  const [view, setView] = useState<"day" | "week">("day");
  const [anchor, setAnchor] = useState(() => new Date());
  const [masters, setMasters] = useState<AdminMaster[]>([]);
  const [appts, setAppts] = useState<AdminAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => {
    const from = new Date(anchor);
    const to = new Date(anchor);
    if (view === "week") to.setDate(to.getDate() + 6);
    return { from: toISODate(from), to: toISODate(to) };
  }, [anchor, view]);

  const load = useCallback(() => {
    setLoading(true);
    admin
      .appointments(range.from, range.to)
      .then(setAppts)
      .finally(() => setLoading(false));
  }, [range.from, range.to]);

  useEffect(() => {
    admin.masters().then((m) => setMasters(m.filter((x) => x.is_active)));
  }, []);
  useEffect(load, [load]);

  function shift(days: number) {
    const d = new Date(anchor);
    d.setDate(d.getDate() + days);
    setAnchor(d);
  }

  async function changeStatus(id: string, status: string) {
    setAppts((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    try {
      await admin.setStatus(id, status);
    } catch {
      load(); // revert on failure
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-3xl text-espresso">Расписание</h1>
        <div className="flex gap-2">
          {(["day", "week"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-full px-4 py-1.5 text-sm ${
                view === v ? "bg-accent text-cream" : "border border-sand text-espresso/70"
              }`}
            >
              {v === "day" ? "День" : "Неделя"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={() => shift(view === "week" ? -7 : -1)} className="btn-outline px-4 py-2">
          ←
        </button>
        <div className="text-sm text-espresso/70">
          {formatWeekday(anchor.toISOString())}, {formatShortDate(anchor.toISOString())}
          {view === "week" && " — неделя"}
        </div>
        <button onClick={() => shift(view === "week" ? 7 : 1)} className="btn-outline px-4 py-2">
          →
        </button>
      </div>

      {loading ? (
        <p className="text-espresso/50">Загрузка…</p>
      ) : view === "day" ? (
        <DayColumns masters={masters} appts={appts} onStatus={changeStatus} />
      ) : (
        <WeekList appts={appts} onStatus={changeStatus} />
      )}
    </div>
  );
}

function Card({
  a,
  onStatus,
}: {
  a: AdminAppointment;
  onStatus: (id: string, s: string) => void;
}) {
  return (
    <div className="rounded-xl border border-sand surface p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium text-espresso">{formatTime(a.starts_at)}</span>
        <StatusControl appt={a} onChange={(s) => onStatus(a.id, s)} />
      </div>
      <div className="mt-1 text-espresso/80">{a.service.name}</div>
      <div className="mt-0.5 text-xs text-espresso/55">
        {a.user.name || "Без имени"} · {a.user.phone}
      </div>
    </div>
  );
}

function DayColumns({
  masters,
  appts,
  onStatus,
}: {
  masters: AdminMaster[];
  appts: AdminAppointment[];
  onStatus: (id: string, s: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {masters.map((m, i) => {
        const list = appts.filter((a) => a.master.id === m.id);
        return (
          <div key={m.id} className="rounded-2xl border border-sand bg-sand/20 p-3">
            <div className="mb-3 flex items-center gap-2 font-medium text-espresso">
              <span className={`h-2 w-2 rounded-full ${i % 2 === 0 ? "bg-accent" : "bg-plum"}`} />
              {m.name}
            </div>
            <div className="space-y-2">
              {list.length === 0 ? (
                <p className="text-xs text-espresso/40">Нет записей</p>
              ) : (
                list.map((a) => <Card key={a.id} a={a} onStatus={onStatus} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WeekList({
  appts,
  onStatus,
}: {
  appts: AdminAppointment[];
  onStatus: (id: string, s: string) => void;
}) {
  const byDay = new Map<string, AdminAppointment[]>();
  for (const a of appts) {
    const key = formatShortDate(a.starts_at);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(a);
  }
  if (appts.length === 0) return <p className="text-sm text-espresso/50">Записей нет.</p>;
  return (
    <div className="space-y-5">
      {[...byDay.entries()].map(([day, list]) => (
        <div key={day}>
          <div className="mb-2 text-sm capitalize text-espresso/60">
            {formatWeekday(list[0].starts_at)}, {day}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((a) => (
              <div key={a.id} className="rounded-xl border border-sand surface p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-espresso">{formatTime(a.starts_at)}</span>
                  <StatusControl appt={a} onChange={(s) => onStatus(a.id, s)} />
                </div>
                <div className="mt-1 text-espresso/80">
                  {a.master.name} · {a.service.name}
                </div>
                <div className="mt-0.5 text-xs text-espresso/55">
                  {a.user.name || "Без имени"} · {a.user.phone}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
