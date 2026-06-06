"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { admin, type Stats } from "@/lib/adminApi";

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function formatRub(v: number): string {
  return new Intl.NumberFormat("ru-RU").format(Math.round(v)) + " ₽";
}

const PRESETS: { label: string; days: number }[] = [
  { label: "7 дней", days: 7 },
  { label: "30 дней", days: 30 },
  { label: "90 дней", days: 90 },
];

export default function StatsPage() {
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - (days - 1));
    return { from: toISODate(from), to: toISODate(to) };
  }, [days]);

  const load = useCallback(() => {
    setLoading(true);
    admin
      .stats(range.from, range.to)
      .then(setStats)
      .finally(() => setLoading(false));
  }, [range.from, range.to]);
  useEffect(load, [load]);

  const maxRevenue = useMemo(
    () => Math.max(1, ...(stats?.revenue_series.map((p) => p.amount) ?? [])),
    [stats],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-3xl text-espresso">Статистика</h1>
        <div className="flex gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.days}
              onClick={() => setDays(p.days)}
              className={`rounded-full px-4 py-1.5 text-sm ${
                days === p.days ? "bg-accent text-cream" : "border border-sand text-espresso/70"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading || !stats ? (
        <p className="text-espresso/50">Загрузка…</p>
      ) : (
        <>
          {/* KPI: выручка крупным цветным блоком + два показателя (бенто) */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative overflow-hidden rounded-2xl bg-plum p-6 text-cream sm:col-span-2">
              <div className="section-blob -right-8 -top-10 h-44 w-44 bg-accent/30" />
              <div className="relative">
                <div className="text-xs font-medium uppercase tracking-widest2 text-cream/70">
                  Выручка за период
                </div>
                <div className="mt-3 font-serif text-4xl font-medium md:text-5xl">
                  {formatRub(stats.revenue_total)}
                </div>
              </div>
            </div>
            <Kpi label="Записей создано" value={String(stats.funnel.booked)} tone="accent" />
            <Kpi
              label="Конверсия бота"
              tone="plum"
              value={
                stats.funnel.started > 0
                  ? `${Math.round((stats.funnel.completed / stats.funnel.started) * 100)}%`
                  : "—"
              }
            />
          </div>

          {/* Revenue chart */}
          <Panel title="Выручка по дням">
            {stats.revenue_series.length === 0 ? (
              <Empty />
            ) : (
              <div className="flex h-48 items-end gap-1 overflow-x-auto">
                {stats.revenue_series.map((p) => (
                  <div key={p.date} className="flex min-w-[8px] flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-accent/50 to-accent transition-all hover:to-accent-dark"
                      style={{ height: `${(p.amount / maxRevenue) * 100}%` }}
                      title={`${p.date}: ${formatRub(p.amount)}`}
                    />
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Funnel */}
            <Panel title="Воронка бота">
              <FunnelRow label="Запустили консультанта" value={stats.funnel.started} max={stats.funnel.started} />
              <FunnelRow
                label="Получили рекомендацию"
                value={stats.funnel.completed}
                max={stats.funnel.started}
              />
              <FunnelRow label="Записались" value={stats.funnel.booked} max={stats.funnel.started} />
            </Panel>

            {/* Top services */}
            <Panel title="Топ-5 услуг">
              {stats.top_services.length === 0 ? (
                <Empty />
              ) : (
                <div className="space-y-2.5">
                  {stats.top_services.map((s, i) => (
                    <div key={s.name} className="flex items-center gap-3 text-sm">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                          i === 0 ? "bg-accent text-cream" : "bg-accent/12 text-accent"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span className="flex-1 truncate text-espresso/80">{s.name}</span>
                      <span className="shrink-0 text-espresso/55">
                        {s.count} · {formatRub(s.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          {/* Utilization */}
          <Panel title="Загрузка мастеров">
            {stats.masters_utilization.length === 0 ? (
              <Empty />
            ) : (
              <div className="space-y-3">
                {stats.masters_utilization.map((m, i) => (
                  <div key={m.master}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-espresso/80">{m.master}</span>
                      <span className="text-espresso/55">{Math.round(m.percent)}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-sand/50">
                      <div
                        className={`h-full rounded-full ${i % 2 === 0 ? "bg-accent" : "bg-plum"}`}
                        style={{ width: `${Math.min(100, m.percent)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "accent" | "plum";
}) {
  const text = tone === "accent" ? "text-accent" : "text-plum";
  const bar = tone === "accent" ? "bg-accent" : "bg-plum";
  return (
    <div className="surface relative overflow-hidden rounded-2xl border border-sand p-5">
      <span className={`absolute inset-y-0 left-0 w-1 ${bar}`} />
      <div className="text-sm text-espresso/55">{label}</div>
      <div className={`mt-1 font-serif text-3xl ${text}`}>{value}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-sand surface p-5">
      <div className="mb-4 text-sm font-medium text-espresso">{title}</div>
      {children}
    </div>
  );
}

function FunnelRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-espresso/80">{label}</span>
        <span className="text-espresso/55">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-sand/50">
        <div className="h-full rounded-full bg-plum" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Empty() {
  return <p className="text-sm text-espresso/40">Нет данных за период.</p>;
}
