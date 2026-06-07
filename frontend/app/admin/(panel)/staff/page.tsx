"use client";

import { useEffect, useState } from "react";
import { admin, type Staff } from "@/lib/adminApi";
import { useIsAdmin } from "@/components/admin/AdminProvider";
import { SlideOver } from "@/components/admin/SlideOver";

const ROLE_LABEL: Record<string, string> = { admin: "Администратор", staff: "Сотрудник" };

export default function StaffPage() {
  const isAdmin = useIsAdmin();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [creating, setCreating] = useState(false);

  function load() {
    setLoading(true);
    admin
      .staff()
      .then(setStaff)
      .finally(() => setLoading(false));
  }
  useEffect(() => {
    if (isAdmin) load();
    else setLoading(false);
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="space-y-3">
        <h1 className="font-serif text-3xl text-espresso">Сотрудники</h1>
        <p className="text-espresso/55">Управление сотрудниками доступно только администратору.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-espresso">Сотрудники</h1>
        <button onClick={() => setCreating(true)} className="btn-primary px-4 py-2 text-sm">
          + Добавить
        </button>
      </div>

      {loading ? (
        <p className="text-espresso/50">Загрузка…</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-sand">
          <table className="w-full text-sm">
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="border-t border-sand/60 first:border-t-0">
                  <td className="px-4 py-3 text-espresso">
                    <span className="flex items-center gap-2.5">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                          s.role === "admin" ? "bg-accent/12 text-accent" : "bg-plum/12 text-plum"
                        }`}
                      >
                        {(s.name || s.email).charAt(0).toUpperCase()}
                      </span>
                      {s.name || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-espresso/60">{s.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        s.role === "admin"
                          ? "bg-accent/15 text-accent-dark"
                          : "bg-sand/50 text-espresso/60"
                      }`}
                    >
                      {ROLE_LABEL[s.role] ?? s.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setEditing(s)}
                      className="text-sm text-accent hover:underline"
                    >
                      Изменить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(editing || creating) && (
        <StaffEditor
          staff={editing}
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

function StaffEditor({
  staff,
  onClose,
  onSaved,
}: {
  staff: Staff | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [email, setEmail] = useState(staff?.email ?? "");
  const [name, setName] = useState(staff?.name ?? "");
  const [role, setRole] = useState<string>(staff?.role ?? "staff");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  function mapError(msg: string): string {
    if (msg === "email_taken") return "Сотрудник с таким email уже существует.";
    if (msg === "cannot_delete_self") return "Нельзя удалить собственную учётную запись.";
    if (/email/i.test(msg))
      return "Email должен быть в формате почты, например salon@lumieresalon.ru";
    return msg;
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      if (staff) {
        await admin.updateStaff(staff.id, {
          name: name.trim() || undefined,
          role,
          password: password ? password : undefined,
        });
      } else {
        await admin.createStaff({
          email: email.trim(),
          password,
          name: name.trim() || undefined,
          role,
        });
      }
      onSaved();
    } catch (e) {
      setError(mapError(e instanceof Error ? e.message : "Ошибка сохранения"));
      setSaving(false);
    }
  }

  async function remove() {
    if (!staff) return;
    if (!confirm(`Удалить сотрудника «${staff.name || staff.email}»?`)) return;
    setDeleting(true);
    setError("");
    try {
      await admin.deleteStaff(staff.id);
      onSaved();
    } catch (e) {
      setError(mapError(e instanceof Error ? e.message : "Ошибка удаления"));
      setDeleting(false);
    }
  }

  const canSave = staff ? true : email.trim() && password.length >= 6;

  return (
    <SlideOver title={staff ? "Редактировать сотрудника" : "Новый сотрудник"} onClose={onClose}>
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm text-espresso/70">Email (логин для входа)</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!!staff}
              placeholder="salon@lumieresalon.ru"
              className="input disabled:opacity-60"
            />
            {!staff && (
              <span className="mt-1 block text-xs text-espresso/45">
                Адрес в формате почты — его работники будут вводить как логин.
              </span>
            )}
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-espresso/70">Имя</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-espresso/70">Роль</span>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="input">
              <option value="staff">Сотрудник</option>
              <option value="admin">Администратор</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-espresso/70">
              {staff ? "Новый пароль (если меняется)" : "Пароль"}
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={staff ? "Оставьте пустым, чтобы не менять" : "Минимум 6 символов"}
              className="input"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              onClick={save}
              disabled={saving || !canSave}
              className="btn-primary flex-1 py-2.5"
            >
              {saving ? "Сохраняем…" : "Сохранить"}
            </button>
            <button onClick={onClose} className="btn-outline px-5 py-2.5">
              Отмена
            </button>
          </div>
          {staff && (
            <button
              onClick={remove}
              disabled={deleting}
              className="w-full pt-1 text-center text-sm text-red-500 hover:underline disabled:opacity-50"
            >
              {deleting ? "Удаляем…" : "Удалить сотрудника"}
            </button>
          )}
        </div>
    </SlideOver>
  );
}
