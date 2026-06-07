"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, ApiError, claimPendingOffer } from "@/lib/api";
import { salon } from "@/lib/data";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("+7");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (phone.replace(/\D/g, "").length < 10) {
      setError("Введите корректный номер телефона");
      return;
    }
    setLoading(true);
    try {
      const res = await auth.requestOtp(phone);
      setDebugCode(res.debug_code); // shown only in dev (no SMSC creds)
      setStep("code");
    } catch {
      setError("Не удалось отправить код. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await auth.verifyOtp(phone, code, name || undefined);
      // If the user saved a bot offer while anonymous, persist it now.
      await claimPendingOffer();
      // Вернуть пользователя туда, откуда он шёл (?next=…), но только на наш сайт.
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next && next.startsWith("/") ? next : "/dashboard");
    } catch (err) {
      setError(err instanceof ApiError && err.status === 400 ? "Неверный код" : "Ошибка входа");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-cream px-5">
      <div className="section-blob -left-16 top-16 h-72 w-72 bg-accent/15" />
      <div className="section-blob -right-12 bottom-16 h-72 w-72 bg-plum/15" />
      <div className="relative w-full max-w-sm">
        <a href="/" className="block text-center font-serif text-3xl font-semibold text-espresso">
          {salon.name}
        </a>
        <p className="mt-2 text-center text-sm text-espresso/55">Личный кабинет</p>

        <div className="surface mt-8 rounded-2xl border border-sand p-7">
          {step === "phone" ? (
            <form onSubmit={requestCode}>
              <h1 className="font-serif text-2xl text-espresso">Вход по телефону</h1>
              <p className="mt-1 text-sm text-espresso/55">Пришлём код подтверждения по SMS</p>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                placeholder="+7 999 123-45-67"
                className="mt-5 w-full rounded-xl border border-sand bg-cream px-4 py-3 text-espresso outline-none focus:border-accent"
              />
              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary mt-5 w-full">
                {loading ? "Отправляем…" : "Получить код"}
              </button>
            </form>
          ) : (
            <form onSubmit={verify}>
              <h1 className="font-serif text-2xl text-espresso">Введите код</h1>
              <p className="mt-1 text-sm text-espresso/55">
                Отправлен на {phone}.{" "}
                <button
                  type="button"
                  onClick={() => setStep("phone")}
                  className="text-accent hover:underline"
                >
                  Изменить
                </button>
              </p>
              {debugCode && (
                <p className="mt-3 rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent-dark">
                  Тестовый режим: код <b>{debugCode}</b>
                </p>
              )}
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                maxLength={6}
                placeholder="••••"
                className="mt-5 w-full rounded-xl border border-sand bg-cream px-4 py-3 text-center text-2xl tracking-[0.5em] text-espresso outline-none focus:border-accent"
              />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Как вас зовут? (необязательно)"
                className="mt-3 w-full rounded-xl border border-sand bg-cream px-4 py-3 text-base text-espresso outline-none focus:border-accent"
              />
              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary mt-5 w-full">
                {loading ? "Проверяем…" : "Войти"}
              </button>
            </form>
          )}
        </div>

        <a href="/" className="mt-6 block text-center text-sm text-espresso/45 hover:text-accent">
          ← На главную
        </a>
      </div>
    </main>
  );
}
