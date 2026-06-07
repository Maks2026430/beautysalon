"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError, type MasterItem, type ServiceItem } from "@/lib/api";
import { formatPrice } from "@/lib/data";
import { formatShortDate, formatTime, formatWeekday } from "@/lib/format";

function BookingInner() {
  const router = useRouter();
  const params = useSearchParams();

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [masters, setMasters] = useState<MasterItem[]>([]);
  const [serviceId, setServiceId] = useState(params.get("service") ?? "");
  const [masterId, setMasterId] = useState(params.get("master") ?? "");
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [booking, setBooking] = useState(false);
  const [firstVisit, setFirstVisit] = useState(false);

  useEffect(() => {
    Promise.all([api.services(), api.masters()]).then(([s, m]) => {
      setServices(s);
      setMasters(m);
      // Бот передаёт услугу как slug — превращаем его в реальный id для выбора.
      const param = params.get("service");
      if (param && !s.some((x) => x.id === param)) {
        const bySlug = s.find((x) => x.slug === param);
        if (bySlug) setServiceId(bySlug.id);
      }
    });
    // Первое посещение → скидка 20%. Узнаём по отсутствию прошлых записей.
    api.my().then((a) => setFirstVisit(a.length === 0)).catch(() => {});
  }, []);

  // Load availability whenever both selections are present.
  useEffect(() => {
    setSelectedSlot(null);
    if (!serviceId || !masterId) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    api
      .availability(masterId, serviceId)
      .then((r) => setSlots(r.slots))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [serviceId, masterId]);

  const service = services.find((s) => s.id === serviceId);

  // Показываем только мастеров, чья специализация совпадает с категорией услуги.
  const availableMasters = useMemo(
    () =>
      service
        ? masters.filter((m) => m.specializations?.includes(service.category ?? ""))
        : masters,
    [masters, service],
  );

  // Если выбранный мастер не подходит под новую услугу — сбрасываем выбор.
  useEffect(() => {
    if (masterId && !availableMasters.some((m) => m.id === masterId)) setMasterId("");
  }, [availableMasters, masterId]);

  // Цена со скидкой первого посещения (−20%).
  const DISCOUNT = 20;
  const discountedPrice = (p: number) => Math.round((p * (100 - DISCOUNT)) / 100);

  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; slots: string[] }>();
    for (const s of slots) {
      const key = formatShortDate(s);
      if (!map.has(key)) map.set(key, { label: `${formatWeekday(s)}, ${key}`, slots: [] });
      map.get(key)!.slots.push(s);
    }
    return [...map.values()];
  }, [slots]);

  async function confirm() {
    if (!selectedSlot || !service) return;
    setBooking(true);
    setError("");
    try {
      await api.createAppointment({
        master_id: masterId,
        service_id: serviceId,
        starts_at: selectedSlot,
      });
      router.push("/dashboard/appointments");
    } catch (err) {
      setError(
        err instanceof ApiError && err.detail === "slot_taken"
          ? "Этот слот только что заняли. Выберите другое время."
          : "Не удалось создать запись.",
      );
      setBooking(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="font-serif text-3xl text-espresso">Запись на приём</h1>

      {/* Service */}
      <section>
        <div className="eyebrow mb-3">1. Выберите услугу</div>
        <select
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          className="w-full rounded-xl border border-sand bg-white/50 px-4 py-3 text-espresso outline-none focus:border-accent"
        >
          <option value="">— услуга —</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {formatPrice(s.price)} · {s.duration_minutes} мин
            </option>
          ))}
        </select>
      </section>

      {/* Master */}
      <section>
        <div className="eyebrow mb-3">2. Выберите мастера</div>
        {!serviceId ? (
          <p className="text-sm text-espresso/55">Сначала выберите услугу выше.</p>
        ) : availableMasters.length === 0 ? (
          <p className="text-sm text-espresso/55">
            Для этой услуги пока нет доступного мастера.
          </p>
        ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {availableMasters.map((m) => (
            <button
              key={m.id}
              onClick={() => setMasterId(m.id)}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                masterId === m.id ? "border-accent bg-accent/5" : "border-sand hover:border-accent/50"
              }`}
            >
              <div className="h-12 w-12 overflow-hidden rounded-full bg-sand">
                {m.photo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.photo_url} alt={m.name} className="h-full w-full object-cover" />
                )}
              </div>
              <div>
                <div className="text-sm font-medium text-espresso">{m.name}</div>
                <div className="text-xs text-espresso/55">
                  {m.specializations?.join(", ")}
                  {m.rating != null && ` · ★ ${m.rating}`}
                </div>
              </div>
            </button>
          ))}
        </div>
        )}
      </section>

      {/* Slots */}
      {serviceId && masterId && (
        <section>
          <div className="eyebrow mb-3">3. Выберите время</div>
          {loadingSlots ? (
            <p className="text-sm text-espresso/50">Загружаем свободные слоты…</p>
          ) : grouped.length === 0 ? (
            <p className="text-sm text-espresso/55">
              Свободных слотов на ближайшие 2 недели нет.
            </p>
          ) : (
            <div className="space-y-4">
              {grouped.map((g) => (
                <div key={g.label}>
                  <div className="mb-2 text-sm capitalize text-espresso/60">{g.label}</div>
                  <div className="flex flex-wrap gap-2">
                    {g.slots.map((s) => (
                      <button
                        key={s}
                        onClick={() => setSelectedSlot(s)}
                        className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                          selectedSlot === s
                            ? "border-accent bg-accent text-cream"
                            : "border-sand text-espresso hover:border-accent"
                        }`}
                      >
                        {formatTime(s)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Confirm bar */}
      {selectedSlot && service && (
        <div className="sticky bottom-4 flex flex-col items-start justify-between gap-3 rounded-2xl border border-accent/30 bg-cream/95 p-5 shadow-lg backdrop-blur sm:flex-row sm:items-center">
          <div className="text-sm text-espresso/70">
            <span>{service.name} · </span>
            {firstVisit ? (
              <span>
                <span className="text-espresso/40 line-through">{formatPrice(service.price)}</span>{" "}
                <span className="font-medium text-accent-dark">
                  {formatPrice(discountedPrice(service.price))}
                </span>{" "}
                <span className="rounded-full bg-accent/12 px-2 py-0.5 text-xs text-accent">
                  −20% первое посещение
                </span>
              </span>
            ) : (
              <span>{formatPrice(service.price)}</span>
            )}
            <br />
            <span className="text-espresso">
              {formatWeekday(selectedSlot)}, {formatShortDate(selectedSlot)} в{" "}
              {formatTime(selectedSlot)}
            </span>
          </div>
          <button onClick={confirm} disabled={booking} className="btn-primary">
            {booking ? "Записываем…" : "Подтвердить запись"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<p className="text-espresso/50">Загрузка…</p>}>
      <BookingInner />
    </Suspense>
  );
}
