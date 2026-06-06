"use client";

import { useEffect, useState } from "react";
import { api, type Profile } from "@/lib/api";

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between py-3">
      <span className="text-sm text-espresso/80">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${
          checked ? "bg-accent" : "bg-sand"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-cream transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [notify24, setNotify24] = useState(true);
  const [notify2, setNotify2] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.profile().then((p) => {
      setProfile(p);
      setName(p.name ?? "");
      setNotify24(p.notify_24h);
      setNotify2(p.notify_2h);
    });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const updated = await api.updateProfile({
        name: name || null,
        notify_24h: notify24,
        notify_2h: notify2,
      });
      setProfile(updated);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  if (!profile) return <p className="text-espresso/50">Загрузка…</p>;

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="font-serif text-3xl text-espresso">Профиль</h1>

      <form onSubmit={save} className="rounded-2xl border border-sand surface p-6">
        <label className="block text-xs uppercase tracking-widest2 text-espresso/45">Имя</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ваше имя"
          className="mt-2 w-full rounded-xl border border-sand bg-cream px-4 py-3 text-espresso outline-none focus:border-accent"
        />

        <label className="mt-5 block text-xs uppercase tracking-widest2 text-espresso/45">
          Телефон
        </label>
        <input
          value={profile.phone}
          disabled
          className="mt-2 w-full cursor-not-allowed rounded-xl border border-sand bg-sand/30 px-4 py-3 text-espresso/60"
        />

        <div className="mt-6 border-t border-sand pt-4">
          <div className="text-xs uppercase tracking-widest2 text-espresso/45">
            SMS-уведомления
          </div>
          <Toggle checked={notify24} onChange={setNotify24} label="Напоминание за 24 часа" />
          <Toggle checked={notify2} onChange={setNotify2} label="Напоминание за 2 часа" />
        </div>

        <div className="mt-6 flex items-center gap-4">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Сохраняем…" : "Сохранить"}
          </button>
          {saved && <span className="text-sm text-accent-dark">Сохранено ✓</span>}
        </div>
      </form>
    </div>
  );
}
