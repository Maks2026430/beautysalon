"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type DashboardData } from "@/lib/api";
import { formatPrice } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { Countdown } from "@/components/dashboard/Countdown";

export default function DashboardHome() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .dashboard()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-espresso/50">Загрузка…</p>;

  const last = data?.last_appointment;
  const rebookHref = last
    ? `/dashboard/book?service=${last.service.id}&master=${last.master.id}`
    : "/dashboard/book";

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl text-espresso">Главная</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming appointment */}
        <section className="surface relative overflow-hidden rounded-2xl border border-sand p-6">
          <span className="absolute inset-x-0 top-0 h-1 bg-accent" />
          <div className="eyebrow">Ближайшая запись</div>
          {data?.upcoming ? (
            <div className="mt-3">
              <div className="font-serif text-2xl text-espresso">
                {data.upcoming.service.name}
              </div>
              <div className="mt-1 text-sm text-espresso/60">
                {data.upcoming.master.name} · {formatDateTime(data.upcoming.starts_at)}
              </div>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-2 text-accent-dark">
                <span className="text-sm">До визита:</span>
                <Countdown target={data.upcoming.starts_at} />
              </div>
            </div>
          ) : (
            <div className="mt-3 text-sm text-espresso/55">
              Нет предстоящих записей.
              <Link href="/dashboard/book" className="ml-1 text-accent hover:underline">
                Записаться →
              </Link>
            </div>
          )}
        </section>

        {/* Active discount offer */}
        <section className="surface relative overflow-hidden rounded-2xl border border-sand p-6">
          <span className="absolute inset-x-0 top-0 h-1 bg-plum" />
          <div className="eyebrow">Предложение скидки</div>
          {data?.offer ? (
            <div className="mt-3">
              <div className="font-serif text-2xl text-espresso">
                Скидка 20% на «{data.offer.service_name}»
              </div>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-plum/10 px-4 py-2 text-plum">
                <span className="text-sm">Действует ещё:</span>
                <Countdown target={data.offer.expires_at} />
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-espresso/55">
              Активных предложений нет. Пройдите подбор процедуры на главной странице сайта.
            </p>
          )}
        </section>
      </div>

      {/* Quick rebook */}
      <section className="rounded-2xl border border-sand bg-sand/30 p-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="font-serif text-xl text-espresso">
              {last ? `Записаться снова: ${last.service.name}` : "Готовы записаться?"}
            </div>
            {last && (
              <div className="mt-1 text-sm text-espresso/55">
                {last.master.name}
                {last.price != null && ` · ${formatPrice(last.price)}`}
              </div>
            )}
          </div>
          <Link href={rebookHref} className="btn-primary">
            {last ? "Записаться снова →" : "Записаться →"}
          </Link>
        </div>
      </section>
    </div>
  );
}
