"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { salon } from "@/lib/data";
import { auth, api, markPendingClaim } from "@/lib/api";
import { useBot } from "@/components/bot/BotProvider";
import {
  QUESTIONS,
  activeQuestions,
  getRecommendation,
  streamChat,
  formatPrice,
  type Answers,
  type ConsultResult,
} from "@/lib/consultant";

type Stage = "intro" | "questions" | "loading" | "result" | "chat";

type ChatMessage = { role: "user" | "assistant"; text: string };

const RESULT_KEY = "lumiere_offer";

function loadStoredResult(): ConsultResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(RESULT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsultResult;
    if (new Date(parsed.expires_at).getTime() <= Date.now()) return null; // expired
    return parsed;
  } catch {
    return null;
  }
}

export function ChatWidget() {
  const { isOpen, openBot, closeBot } = useBot();
  const [stage, setStage] = useState<Stage>("intro");
  const [answers, setAnswers] = useState<Answers>({});
  const [qIndex, setQIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ConsultResult | null>(null);

  // Free-text chat state.
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the conversation scrolled to the latest message.
  useEffect(() => {
    if (stage === "chat") scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, stage]);

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || chatBusy) return;
    setInput("");
    setStage("chat");
    // Append the user turn + an empty assistant turn that fills in as chunks arrive.
    setMessages((m) => [...m, { role: "user", text }, { role: "assistant", text: "" }]);
    setChatBusy(true);
    try {
      await streamChat(text, (chunk) => {
        setMessages((m) => {
          const copy = m.slice();
          const last = copy[copy.length - 1];
          copy[copy.length - 1] = { ...last, text: last.text + chunk };
          return copy;
        });
      });
    } catch {
      setMessages((m) => {
        const copy = m.slice();
        copy[copy.length - 1] = {
          role: "assistant",
          text: "Извините, не получилось ответить. Попробуйте ещё раз или начните подбор процедуры.",
        };
        return copy;
      });
    } finally {
      setChatBusy(false);
    }
  }

  // Resume an existing offer on first open so the timer keeps running.
  useEffect(() => {
    if (!isOpen) return;
    if (stage === "intro" && !result) {
      const stored = loadStoredResult();
      if (stored) {
        setResult(stored);
        setStage("result");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  function restart() {
    setAnswers({});
    setQIndex(0);
    setProgress(0);
    setResult(null);
    setStage("questions");
  }

  function selectOption(value: string) {
    const current = activeQuestions(answers)[qIndex];
    const next: Answers = { ...answers, [current.key]: value };
    setAnswers(next);

    const list = activeQuestions(next);
    if (qIndex + 1 >= list.length) {
      runRecommendation(next);
    } else {
      setQIndex(qIndex + 1);
    }
  }

  function runRecommendation(finalAnswers: Answers) {
    setStage("loading");
    setProgress(0);

    // Animate the circular progress 0→100 over ~2.4s (spec 5.3).
    const start = Date.now();
    const duration = 2400;
    const timer = setInterval(() => {
      const pct = Math.min(100, Math.round(((Date.now() - start) / duration) * 100));
      setProgress(pct);
      if (pct >= 100) clearInterval(timer);
    }, 50);

    const apiCall = getRecommendation(finalAnswers);

    Promise.all([
      apiCall,
      new Promise((r) => setTimeout(r, duration)),
    ]).then(([res]) => {
      clearInterval(timer);
      const consult = res as ConsultResult;
      setResult(consult);
      try {
        localStorage.setItem(RESULT_KEY, JSON.stringify(consult));
      } catch {
        /* ignore quota errors */
      }
      setStage("result");
    });
  }

  return (
    <>
      <button
        onClick={() => (isOpen ? closeBot() : openBot())}
        aria-label="Открыть консультанта"
        className={`fixed bottom-5 right-5 z-50 h-14 w-14 items-center justify-center rounded-full bg-accent text-cream shadow-lg transition-transform hover:scale-105 hover:bg-accent-dark ${
          isOpen ? "hidden md:flex" : "flex"
        }`}
      >
        <span className="text-xl">{isOpen ? "✕" : "💬"}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-cream shadow-2xl md:inset-auto md:bottom-24 md:right-5 md:h-[min(74vh,600px)] md:w-[min(92vw,400px)] md:rounded-2xl md:border md:border-sand"
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-sand px-5 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-accent">
                ✨
              </div>
              <div className="flex-1">
                <div className="font-serif text-lg leading-none text-espresso">
                  Консультант {salon.name}
                </div>
                <div className="mt-1 text-xs text-espresso/45">
                  {stage === "questions"
                    ? `Вопрос ${qIndex + 1} из ${activeQuestions(answers).length}`
                    : stage === "chat"
                      ? "Спросите о процедурах, ценах, уходе"
                      : "Подберём процедуру за минуту"}
                </div>
              </div>
              <button onClick={closeBot} aria-label="Закрыть" className="text-espresso/40 hover:text-espresso">
                ✕
              </button>
            </div>

            {/* Progress bar for questionnaire */}
            {stage === "questions" && (
              <div className="h-1 w-full bg-sand">
                <div
                  className="h-full bg-accent transition-all duration-300"
                  style={{
                    width: `${((qIndex + 1) / activeQuestions(answers).length) * 100}%`,
                  }}
                />
              </div>
            )}

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5">
              {stage === "intro" && <Intro onStart={restart} />}
              {stage === "questions" && (
                <QuestionView
                  key={activeQuestions(answers)[qIndex].key}
                  question={activeQuestions(answers)[qIndex]}
                  onSelect={selectOption}
                />
              )}
              {stage === "loading" && <LoadingView progress={progress} />}
              {stage === "result" && result && (
                <ResultView result={result} onRestart={restart} />
              )}
              {stage === "chat" && (
                <ChatView messages={messages} busy={chatBusy} onStartQuiz={restart} />
              )}
            </div>

            {/* Поле ввода свободного вопроса — доступно всегда, кроме шагов
                квиза и экрана загрузки (там оно мешало бы кнопкам/прогрессу) */}
            {stage !== "questions" && stage !== "loading" && (
              <form
                onSubmit={sendMessage}
                className="flex items-center gap-2 border-t border-sand px-4 py-3"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Напишите вопрос…"
                  aria-label="Сообщение консультанту"
                  className="flex-1 rounded-full border border-sand bg-white/70 px-4 py-2.5 text-sm text-espresso outline-none placeholder:text-espresso/35 focus:border-accent"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || chatBusy}
                  aria-label="Отправить"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-cream transition-colors hover:bg-accent-dark disabled:opacity-40"
                >
                  ↑
                </button>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="text-4xl">🌸</div>
      <h3 className="mt-4 font-serif text-2xl text-espresso">Подберём идеальную процедуру</h3>
      <p className="mt-2 text-sm text-espresso/60">
        Ответьте на 6 вопросов — и я подберу процедуру специально для вас.
        Бонус: персональная скидка 20% на первое посещение.
      </p>
      <button onClick={onStart} className="btn-primary mt-6">
        Начать подбор →
      </button>
      <p className="mt-4 text-xs text-espresso/45">
        …или просто напишите вопрос ниже — расскажу о процедурах, ценах и уходе.
      </p>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-espresso/40" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-espresso/40 [animation-delay:0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-espresso/40 [animation-delay:0.3s]" />
    </span>
  );
}

function ChatView({
  messages,
  busy,
  onStartQuiz,
}: {
  messages: ChatMessage[];
  busy: boolean;
  onStartQuiz: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {messages.map((m, i) => (
        <div
          key={i}
          className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
            m.role === "user"
              ? "self-end bg-accent text-cream"
              : "self-start border border-sand bg-white/70 text-espresso"
          }`}
        >
          {m.text || (m.role === "assistant" ? <TypingDots /> : "")}
        </div>
      ))}
      {!busy && (
        <button
          onClick={onStartQuiz}
          className="mt-1 self-start text-xs text-accent hover:underline"
        >
          ✨ Подобрать процедуру по шагам
        </button>
      )}
    </div>
  );
}

function QuestionView({
  question,
  onSelect,
}: {
  question: (typeof QUESTIONS)[number];
  onSelect: (value: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
    >
      <h3 className="font-serif text-xl text-espresso">{question.title}</h3>
      <div className="mt-5 grid gap-2.5">
        {question.options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className="rounded-xl border border-sand bg-white/50 px-4 py-3 text-left text-sm text-espresso transition-all hover:border-accent hover:bg-accent/5"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function LoadingView({ progress }: { progress: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="relative h-32 w-32">
        <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={r} fill="none" stroke="#E5DACE" strokeWidth="8" />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke="#A85D6E"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ - (progress / 100) * circ}
            style={{ transition: "stroke-dashoffset 0.1s linear" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-serif text-2xl text-espresso">
          {progress}%
        </div>
      </div>
      <p className="mt-5 text-sm text-espresso/60">Подбираем идеальную процедуру…</p>
    </div>
  );
}

function ResultView({
  result,
  onRestart,
}: {
  result: ConsultResult;
  onRestart: () => void;
}) {
  const { recommendation: rec, discount_percent } = result;
  const router = useRouter();
  const { closeBot } = useBot();
  const [saved, setSaved] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [needLogin, setNeedLogin] = useState(false);
  const [error, setError] = useState("");

  // Записаться на рекомендованную процедуру: закрываем бота и ведём в форму
  // записи (с предвыбранной услугой). Анонимных — на вход, скидка сохранится.
  function bookNow() {
    closeBot();
    const target = `/dashboard/book?service=${encodeURIComponent(rec.procedure_id)}`;
    if (auth.hasToken()) {
      router.push(target);
    } else {
      markPendingClaim(result.session_id);
      router.push(`/login?next=${encodeURIComponent(target)}`);
    }
  }

  async function saveOffer() {
    setError("");
    // Logged-in clients persist straight to discount_offers; anonymous users
    // are sent to /login and the offer is claimed automatically after sign-in.
    if (auth.hasToken()) {
      setClaiming(true);
      try {
        await api.claimOffer(result.session_id);
        setSaved(true);
      } catch {
        setError("Не удалось сохранить предложение. Попробуйте позже.");
      } finally {
        setClaiming(false);
      }
    } else {
      markPendingClaim(result.session_id);
      setNeedLogin(true);
      router.push("/login");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="eyebrow">Ваша процедура</div>
      <h3 className="mt-2 font-serif text-2xl leading-tight text-espresso">
        {rec.procedure_name}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-espresso/70">{rec.description}</p>

      <div className="mt-5 flex items-end gap-3">
        <span className="text-base text-espresso/40 line-through">
          {formatPrice(rec.original_price)}
        </span>
        <span className="text-3xl font-medium text-accent-dark">
          {formatPrice(rec.discounted_price)}
        </span>
      </div>

      <div className="mt-5 rounded-xl border border-accent/30 bg-accent/5 p-4">
        <div className="text-sm font-medium text-accent-dark">
          🎁 Ваша персональная скидка {discount_percent}% действует 48 часов
        </div>
        <Countdown expiresAt={result.expires_at} />
      </div>

      <div className="mt-5 flex flex-col gap-2.5">
        <button onClick={bookNow} className="btn-primary">
          Записаться сейчас →
        </button>
        <button
          onClick={saveOffer}
          className="btn-outline"
          disabled={saved || claiming}
        >
          {saved
            ? "Предложение сохранено ✓"
            : claiming
              ? "Сохраняем…"
              : needLogin
                ? "Перейти ко входу →"
                : "Сохранить предложение"}
        </button>
        {saved && (
          <p className="text-center text-xs text-espresso/50">
            Скидка закреплена за вами — она ждёт в личном кабинете.
          </p>
        )}
        {needLogin && !saved && (
          <p className="text-center text-xs text-espresso/50">
            Войдите, чтобы закрепить скидку — после входа она сохранится автоматически.
          </p>
        )}
        {error && <p className="text-center text-xs text-red-600">{error}</p>}
        <button
          onClick={onRestart}
          className="text-center text-xs text-espresso/45 hover:text-accent"
        >
          Подобрать заново
        </button>
      </div>
    </motion.div>
  );
}

function Countdown({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, new Date(expiresAt).getTime() - Date.now()),
  );

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(Math.max(0, new Date(expiresAt).getTime() - Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const total = Math.floor(remaining / 1000);
  const hh = String(Math.floor(total / 3600)).padStart(2, "0");
  const mm = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");

  if (remaining <= 0) {
    return <div className="mt-2 text-sm text-espresso/50">Срок предложения истёк</div>;
  }

  return (
    <div className="mt-2 font-mono text-2xl tracking-wider text-espresso">
      {hh}:{mm}:{ss}
    </div>
  );
}
