"use client";

import { useEffect, useState } from "react";
import { admin, type ClientRow, type ClientDetail } from "@/lib/adminApi";
import { formatDateTime, formatShortDate } from "@/lib/format";
import { SlideOver } from "@/components/admin/SlideOver";

const STATUS_LABELS: Record<string, string> = {
  pending: "Ожидает",
  confirmed: "Подтверждена",
  completed: "Завершена",
  cancelled: "Отменена",
  no_show: "Неявка",
};

export default function ClientsPage() {
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => {
      setLoading(true);
      admin
        .clients(q.trim() || undefined)
        .then(setRows)
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [q]);

  return (
    <div className="space-y-5">
      <h1 className="font-serif text-3xl text-espresso">Клиенты</h1>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Поиск по имени или телефону…"
        className="w-full max-w-md rounded-xl border border-sand bg-white/60 px-4 py-2.5 text-sm text-espresso outline-none focus:border-accent"
      />

      {loading ? (
        <p className="text-espresso/50">Загрузка…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-espresso/50">Ничего не найдено.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-sand">
          <table className="w-full text-sm">
            <thead className="bg-sand/30 text-left text-xs uppercase text-espresso/55">
              <tr>
                <th className="px-4 py-3 font-medium">Имя</th>
                <th className="px-4 py-3 font-medium">Телефон</th>
                <th className="px-4 py-3 font-medium">Визитов</th>
                <th className="px-4 py-3 font-medium">Регистрация</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSelected(c.id)}
                  className="cursor-pointer border-t border-sand/60 transition-colors hover:bg-sand/20"
                >
                  <td className="px-4 py-3 text-espresso">
                    <span className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/12 text-xs font-medium text-accent">
                        {(c.name || "?").charAt(0).toUpperCase()}
                      </span>
                      {c.name || "Без имени"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-espresso/80">{c.phone}</td>
                  <td className="px-4 py-3 text-espresso/80">{c.visits_count}</td>
                  <td className="px-4 py-3 text-espresso/55">
                    {c.created_at ? formatShortDate(c.created_at) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && <ClientDrawer id={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function ClientDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const [data, setData] = useState<ClientDetail | null>(null);

  useEffect(() => {
    setData(null);
    admin.client(id).then(setData);
  }, [id]);

  return (
    <SlideOver title={data ? data.name || "Без имени" : "Загрузка…"} onClose={onClose}>
        {data && (
          <div className="space-y-6">
            <div className="space-y-1 text-sm text-espresso/75">
              <div>Телефон: {data.phone}</div>
              {data.birth_date && <div>Дата рождения: {formatShortDate(data.birth_date)}</div>}
              <div>Визитов: {data.visits_count}</div>
              <div className="text-espresso/55">
                Уведомления: {data.notify_24h ? "24ч " : ""}
                {data.notify_2h ? "2ч" : ""}
                {!data.notify_24h && !data.notify_2h && "выключены"}
              </div>
            </div>

            {data.offer && (
              <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 text-sm">
                <div className="font-medium text-accent-dark">Активный оффер</div>
                <div className="mt-1 text-espresso/75">
                  {data.offer.service_name || data.offer.service_id}
                </div>
                <div className="text-xs text-espresso/50">
                  до {formatDateTime(data.offer.expires_at)}
                </div>
              </div>
            )}

            <div>
              <div className="mb-2 text-sm font-medium text-espresso">История записей</div>
              {data.appointments.length === 0 ? (
                <p className="text-sm text-espresso/50">Записей нет.</p>
              ) : (
                <div className="space-y-2">
                  {data.appointments.map((a) => (
                    <div key={a.id} className="surface rounded-xl border border-sand p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-espresso">{formatDateTime(a.starts_at)}</span>
                        <span className="text-xs text-espresso/55">
                          {STATUS_LABELS[a.status] ?? a.status}
                        </span>
                      </div>
                      <div className="mt-1 text-espresso/75">
                        {a.master.name} · {a.service.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
    </SlideOver>
  );
}
