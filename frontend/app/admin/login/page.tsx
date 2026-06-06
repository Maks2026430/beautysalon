"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminAuth } from "@/lib/adminApi";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await adminAuth.login(email, password);
      router.push("/admin/schedule");
    } catch {
      setError("Неверный email или пароль");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-espresso px-5">
      {/* Тёплое «свечение» в фирменных цветах */}
      <div className="section-blob -left-20 top-10 h-72 w-72 bg-accent/20" />
      <div className="section-blob -right-16 bottom-10 h-80 w-80 bg-plum/25" />
      <form onSubmit={submit} className="relative w-full max-w-sm rounded-2xl bg-cream p-8">
        <h1 className="font-serif text-2xl text-espresso">Админ-панель</h1>
        <p className="mt-1 text-sm text-espresso/55">Вход для сотрудников</p>

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="Email"
          className="mt-6 w-full rounded-xl border border-sand bg-white/60 px-4 py-3 text-espresso outline-none focus:border-accent"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="Пароль"
          className="mt-3 w-full rounded-xl border border-sand bg-white/60 px-4 py-3 text-espresso outline-none focus:border-accent"
        />
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary mt-5 w-full">
          {loading ? "Входим…" : "Войти"}
        </button>
      </form>
    </main>
  );
}
