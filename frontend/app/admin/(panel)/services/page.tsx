"use client";

import { useEffect, useMemo, useState } from "react";
import { admin, type AdminService } from "@/lib/adminApi";
import { useIsAdmin } from "@/components/admin/AdminProvider";
import { SlideOver } from "@/components/admin/SlideOver";

function formatPrice(v: number): string {
  return new Intl.NumberFormat("ru-RU").format(v) + " ₽";
}

export default function ServicesPage() {
  const isAdmin = useIsAdmin();
  const [services, setServices] = useState<AdminService[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminService | null>(null);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);

  function load() {
    setLoading(true);
    admin
      .services()
      .then(setServices)
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  const grouped = useMemo(() => {
    const map = new Map<string, AdminService[]>();
    for (const s of services) {
      const key = s.category || "Без категории";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return [...map.entries()];
  }, [services]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-espresso">Услуги и прайс-лист</h1>
        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={() => setImporting(true)}
              className="btn-outline px-4 py-2 text-sm"
            >
              Импорт
            </button>
            <button onClick={() => setCreating(true)} className="btn-primary px-4 py-2 text-sm">
              + Услуга
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-espresso/50">Загрузка…</p>
      ) : (
        <div className="space-y-6">
          {grouped.map(([cat, list], gi) => (
            <div key={cat}>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-espresso/55">
                <span
                  className={`h-2 w-2 rounded-full ${gi % 2 === 0 ? "bg-accent" : "bg-plum"}`}
                />
                {cat}
              </div>
              <div className="overflow-hidden rounded-2xl border border-sand">
                <table className="w-full text-sm">
                  <tbody>
                    {list.map((s) => (
                      <tr key={s.id} className="border-t border-sand/60 first:border-t-0">
                        <td className="px-4 py-3">
                          <div className="text-espresso">
                            {s.name}
                            {!s.is_active && (
                              <span className="badge-muted ml-2">скрыта</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-espresso/60">{s.duration_minutes} мин</td>
                        <td className="px-4 py-3 text-right font-medium text-espresso">
                          {formatPrice(s.price)}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setEditing(s)}
                              className="text-sm text-accent hover:underline"
                            >
                              Изменить
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {(editing || creating) && (
        <ServiceEditor
          service={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={() => {
            setEditing(null);
            setCreating(false);
            load();
          }}
        />
      )}
      {importing && (
        <ImportModal
          onClose={() => setImporting(false)}
          onDone={() => {
            setImporting(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function ServiceEditor({
  service,
  onClose,
  onSaved,
}: {
  service: AdminService | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(service?.name ?? "");
  const [category, setCategory] = useState(service?.category ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [price, setPrice] = useState(service?.price?.toString() ?? "");
  const [duration, setDuration] = useState(service?.duration_minutes?.toString() ?? "60");
  const [isActive, setIsActive] = useState(service?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    if (!service) return;
    if (!confirm(`Удалить услугу «${service.name}»?`)) return;
    setDeleting(true);
    setError("");
    try {
      await admin.deleteService(service.id);
      onSaved();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ошибка удаления";
      setError(
        msg === "service_in_use"
          ? "Услуга используется в записях — снимите галочку «Активна» вместо удаления."
          : msg,
      );
      setDeleting(false);
    }
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const body = {
        name: name.trim(),
        category: category.trim() || null,
        description: description.trim() || null,
        price: Number(price),
        duration_minutes: Number(duration),
        is_active: isActive,
      };
      if (service) await admin.updateService(service.id, body);
      else await admin.createService(body);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
      setSaving(false);
    }
  }

  return (
    <Drawer title={service ? "Редактировать услугу" : "Новая услуга"} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Название">
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
        </Field>
        <Field label="Категория">
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input"
          />
        </Field>
        <div className="flex gap-3">
          <Field label="Цена (₽)">
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Длительность (мин)">
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="input"
            />
          </Field>
        </div>
        <Field label="Описание">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="input resize-none"
          />
        </Field>
        <label className="flex items-center gap-2 text-sm text-espresso/80">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Активна (видна на сайте)
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            onClick={save}
            disabled={saving || !name.trim() || !price}
            className="btn-primary flex-1 py-2.5"
          >
            {saving ? "Сохраняем…" : "Сохранить"}
          </button>
          <button onClick={onClose} className="btn-outline px-5 py-2.5">
            Отмена
          </button>
        </div>
        {service && (
          <button
            onClick={remove}
            disabled={deleting}
            className="w-full pt-1 text-center text-sm text-red-500 hover:underline disabled:opacity-50"
          >
            {deleting ? "Удаляем…" : "Удалить услугу"}
          </button>
        )}
      </div>
    </Drawer>
  );
}

function ImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState("");

  async function run() {
    setBusy(true);
    setError("");
    setResult("");
    try {
      const trimmed = text.trim();
      const payload = trimmed.startsWith("[")
        ? { items: JSON.parse(trimmed) }
        : { csv: trimmed };
      const res = await admin.importServices(payload);
      setResult(`Создано: ${res.created}, обновлено: ${res.updated}`);
      setTimeout(onDone, 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка импорта");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer title="Импорт прайс-листа" onClose={onClose}>
      <p className="text-sm text-espresso/60">
        Вставьте CSV (с заголовком <code>name,category,price,duration_minutes</code>) или JSON-массив
        объектов. Совпадение по slug/названию обновляет существующую услугу.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        placeholder={"name,category,price,duration_minutes\nЧистка лица,Лицо,2500,60"}
        className="input mt-4 font-mono text-xs"
      />
      {result && <p className="mt-3 text-sm text-plum">{result}</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-4 flex gap-3">
        <button onClick={run} disabled={busy || !text.trim()} className="btn-primary flex-1 py-2.5">
          {busy ? "Импортируем…" : "Импортировать"}
        </button>
        <button onClick={onClose} className="btn-outline px-5 py-2.5">
          Отмена
        </button>
      </div>
    </Drawer>
  );
}

function Drawer({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <SlideOver title={title} onClose={onClose}>
      {children}
    </SlideOver>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block flex-1">
      <span className="mb-1 block text-sm text-espresso/70">{label}</span>
      {children}
    </label>
  );
}
