"use client";

import { useEffect, useState } from "react";
import { api, ApiError, type Appointment } from "@/lib/api";
import { formatPrice } from "@/lib/data";
import { formatDateTime, parseApiDate } from "@/lib/format";

const STATUS_LABEL: Record<string, string> = {
  pending: "Ожидает",
  confirmed: "Подтверждена",
  cancelled: "Отменена",
  completed: "Завершена",
};

// Цветная полоса слева на карточке — по статусу записи.
const STATUS_BAR: Record<string, string> = {
  pending: "bg-accent/60",
  confirmed: "bg-accent",
  completed: "bg-plum",
  cancelled: "bg-red-400",
};

function canCancel(a: Appointment): boolean {
  if (a.status !== "confirmed" && a.status !== "pending") return false;
  return parseApiDate(a.starts_at).getTime() - Date.now() > 2 * 3600 * 1000;
}

export default function AppointmentsPage() {
  const [tab, setTab] = useState<"upcoming" | "history">("upcoming");
  const [upcoming, setUpcoming] = useState<Appointment[]>([]);
  const [history, setHistory] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function reload() {
    setLoading(true);
    Promise.all([api.upcoming(), api.history()])
      .then(([u, h]) => {
        setUpcoming(u);
        setHistory(h);
      })
      .finally(() => setLoading(false));
  }

  useEffect(reload, []);

  async function cancel(id: string) {
    setError("");
    try {
      await api.cancel(id);
      reload();
    } catch (err) {
      setError(
        err instanceof ApiError && err.detail === "cancel_too_late"
          ? "Отменить можно не позднее, чем за 2 часа до визита."
          : "Не удалось отменить запись.",
      );
    }
  }

  const list = tab === "upcoming" ? upcoming : history;

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl text-espresso">Мои записи</h1>

      <div className="flex gap-2">
        {(["upcoming", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-5 py-2 text-sm transition-colors ${
              tab === t
                ? "bg-accent text-cream"
                : "border border-sand text-espresso/70 hover:border-accent"
            }`}
          >
            {t === "upcoming" ? "Предстоящие" : "История"}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-espresso/50">Загрузка…</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-espresso/55">
          {tab === "upcoming" ? "Предстоящих записей нет." : "История пуста."}
        </p>
      ) : (
        <div className="space-y-3">
          {list.map((a) => (
            <article
              key={a.id}
              className="surface relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-sand p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <span
                className={`absolute inset-y-0 left-0 w-1 ${STATUS_BAR[a.status] ?? "bg-sand"}`}
              />
              <div>
                <div className="font-serif text-lg text-espresso">{a.service.name}</div>
                <div className="mt-1 text-sm text-espresso/60">
                  {a.master.name} · {formatDateTime(a.starts_at)}
                </div>
                <div className="mt-1 text-xs text-espresso/45">
                  {STATUS_LABEL[a.status] ?? a.status}
                  {a.price != null && ` · ${formatPrice(a.price)}`}
                </div>
              </div>
              {tab === "upcoming" && canCancel(a) && (
                <button
                  onClick={() => cancel(a.id)}
                  className="self-start rounded-full border border-red-300 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 sm:self-center"
                >
                  Отменить
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
