"use client";

import { useEffect, useState } from "react";
import { admin, type AdminMaster, type Interval } from "@/lib/adminApi";
import { useIsAdmin } from "@/components/admin/AdminProvider";
import { SlideOver } from "@/components/admin/SlideOver";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export default function MastersPage() {
  const isAdmin = useIsAdmin();
  const [masters, setMasters] = useState<AdminMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminMaster | null>(null);
  const [creating, setCreating] = useState(false);

  function load() {
    setLoading(true);
    admin
      .masters()
      .then(setMasters)
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-espresso">Мастера</h1>
        {isAdmin && (
          <button onClick={() => setCreating(true)} className="btn-primary px-4 py-2 text-sm">
            + Добавить
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-espresso/50">Загрузка…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {masters.map((m, idx) => {
            const tone = idx % 2 === 0 ? "accent" : "plum";
            return (
            <div key={m.id} className="surface relative overflow-hidden rounded-2xl border border-sand p-4">
              <span
                className={`absolute inset-x-0 top-0 h-1 ${tone === "accent" ? "bg-accent" : "bg-plum"}`}
              />
              <div className="flex items-start gap-3">
                {m.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.photo_url}
                    alt={m.name}
                    className="h-14 w-14 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl font-serif text-xl ${
                      tone === "accent" ? "bg-accent/15 text-accent" : "bg-plum/15 text-plum"
                    }`}
                  >
                    {m.name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium text-espresso">{m.name}</div>
                    {!m.is_active && <span className="badge-muted shrink-0">скрыт</span>}
                  </div>
                  {m.specializations && m.specializations.length > 0 && (
                    <div className="mt-0.5 text-xs text-espresso/55">
                      {m.specializations.join(", ")}
                    </div>
                  )}
                </div>
              </div>
              {m.bio && <p className="mt-2 line-clamp-2 text-sm text-espresso/65">{m.bio}</p>}
              <div className="mt-3 flex flex-wrap gap-1">
                {WEEKDAYS.map((w, i) => {
                  const has = m.schedules.some((s) => s.day_of_week === i);
                  return (
                    <span
                      key={i}
                      className={`rounded px-1.5 py-0.5 text-xs ${
                        has ? "bg-accent/15 text-accent-dark" : "bg-sand/40 text-espresso/30"
                      }`}
                    >
                      {w}
                    </span>
                  );
                })}
              </div>
              {isAdmin && (
                <button
                  onClick={() => setEditing(m)}
                  className="mt-4 text-sm text-accent hover:underline"
                >
                  Редактировать
                </button>
              )}
            </div>
            );
          })}
        </div>
      )}

      {(editing || creating) && (
        <MasterEditor
          master={editing}
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
    </div>
  );
}

function MasterEditor({
  master,
  onClose,
  onSaved,
}: {
  master: AdminMaster | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(master?.name ?? "");
  const [bio, setBio] = useState(master?.bio ?? "");
  const [specs, setSpecs] = useState((master?.specializations ?? []).join(", "));
  const [photoUrl, setPhotoUrl] = useState(master?.photo_url ?? "");
  const [isActive, setIsActive] = useState(master?.is_active ?? true);
  const [schedules, setSchedules] = useState<Interval[]>(master?.schedules ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  function addInterval(day: number) {
    setSchedules((prev) => [...prev, { day_of_week: day, start_time: "10:00", end_time: "20:00" }]);
  }
  function updateInterval(idx: number, patch: Partial<Interval>) {
    setSchedules((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }
  function removeInterval(idx: number) {
    setSchedules((prev) => prev.filter((_, i) => i !== idx));
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const body = {
        name: name.trim(),
        bio: bio.trim() || null,
        photo_url: photoUrl.trim() || null,
        specializations: specs
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        is_active: isActive,
      };
      const saved = master
        ? await admin.updateMaster(master.id, body)
        : await admin.createMaster(body);
      await admin.replaceSchedule(saved.id, schedules);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
      setSaving(false);
    }
  }

  async function remove() {
    if (!master) return;
    if (!confirm(`Удалить мастера «${master.name}»?`)) return;
    setDeleting(true);
    setError("");
    try {
      await admin.deleteMaster(master.id);
      onSaved();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ошибка удаления";
      setError(
        msg === "master_has_appointments"
          ? "У мастера есть записи — снимите галочку «Активен» вместо удаления."
          : msg,
      );
      setDeleting(false);
    }
  }

  return (
    <SlideOver title={master ? "Редактировать мастера" : "Новый мастер"} onClose={onClose}>
        <div className="space-y-4">
          <Field label="Имя">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Специализации (через запятую)">
            <input value={specs} onChange={(e) => setSpecs(e.target.value)} className="input" />
          </Field>
          <Field label="Фото (URL)">
            <input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} className="input" />
          </Field>
          <Field label="Описание">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
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
            Активен (виден на сайте)
          </label>

          <div>
            <div className="mb-2 text-sm font-medium text-espresso">Расписание</div>
            <div className="space-y-3">
              {WEEKDAYS.map((w, day) => {
                const rows = schedules
                  .map((s, idx) => ({ s, idx }))
                  .filter(({ s }) => s.day_of_week === day);
                return (
                  <div key={day} className="rounded-xl border border-sand surface p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-espresso">{w}</span>
                      <button
                        onClick={() => addInterval(day)}
                        className="text-xs text-accent hover:underline"
                      >
                        + интервал
                      </button>
                    </div>
                    {rows.length === 0 ? (
                      <p className="mt-1 text-xs text-espresso/40">Выходной</p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {rows.map(({ s, idx }) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="time"
                              value={s.start_time}
                              onChange={(e) => updateInterval(idx, { start_time: e.target.value })}
                              className="rounded-lg border border-sand bg-white px-2 py-1 text-sm"
                            />
                            <span className="text-espresso/40">—</span>
                            <input
                              type="time"
                              value={s.end_time}
                              onChange={(e) => updateInterval(idx, { end_time: e.target.value })}
                              className="rounded-lg border border-sand bg-white px-2 py-1 text-sm"
                            />
                            <button
                              onClick={() => removeInterval(idx)}
                              className="ml-auto text-xs text-red-500 hover:underline"
                            >
                              удалить
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              onClick={save}
              disabled={saving || !name.trim()}
              className="btn-primary flex-1 py-2.5"
            >
              {saving ? "Сохраняем…" : "Сохранить"}
            </button>
            <button onClick={onClose} className="btn-outline px-5 py-2.5">
              Отмена
            </button>
          </div>
          {master && (
            <button
              onClick={remove}
              disabled={deleting}
              className="w-full pt-1 text-center text-sm text-red-500 hover:underline disabled:opacity-50"
            >
              {deleting ? "Удаляем…" : "Удалить мастера"}
            </button>
          )}
        </div>
    </SlideOver>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-espresso/70">{label}</span>
      {children}
    </label>
  );
}
