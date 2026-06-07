"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { services as staticServices, formatPrice, formatDuration, type Service } from "@/lib/data";
import { api } from "@/lib/api";
import { useBot } from "@/components/bot/BotProvider";
import { Reveal } from "@/components/landing/Reveal";
import { SectionHeading } from "@/components/landing/SectionHeading";

// Метаданные категорий: фото-обложка, цвет (терракота/слива), иконка и размер
// плитки в бенто-сетке. Терракота и слива чередуются для разнообразия.
type Tone = "accent" | "plum";
type Meta = { tone: Tone; photo: string; span: string; icon: JSX.Element };

const U = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=80`;

const CATEGORY_META: Record<string, Meta> = {
  "Уход за лицом": {
    tone: "accent",
    photo: U("1570172619644-dfd03ed5d881"),
    span: "col-span-2 lg:col-start-1 lg:row-start-1 lg:col-span-2 lg:row-span-2",
    icon: (
      <path d="M12 3a6 6 0 0 0-6 6c0 4 2.7 7.5 6 9 3.3-1.5 6-5 6-9a6 6 0 0 0-6-6Zm0 5.5L13 11l2.5 1L13 13l-1 2.5L11 13l-2.5-1L11 11l1-2.5Z" />
    ),
  },
  "Аппаратная косметология": {
    tone: "plum",
    photo: U("1512290923902-8a9f81dc236c"),
    span: "lg:col-start-3 lg:row-start-1 lg:col-span-2",
    icon: (
      <path d="M4 20 14.5 9.5m0 0 1.8-4.3a1 1 0 0 1 1.3-.5l1.7.7a1 1 0 0 1 .5 1.3L15.5 8.5m4-3.5 1 1" />
    ),
  },
  Массаж: {
    tone: "accent",
    photo: U("1544161515-4ab6ce6db874"),
    span: "lg:col-start-3 lg:row-start-2",
    icon: <path d="M12 21c-4-2.5-7-6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4-3 7.5-7 10Z" />,
  },
  "Ногтевой сервис": {
    tone: "plum",
    photo: U("1604654894610-df63bc536371"),
    span: "lg:col-start-4 lg:row-start-2",
    icon: <path d="M9 3c-1.5 1.5-2 4-2 7v9a2 2 0 0 0 2 2 2 2 0 0 0 2-2v-7m4 9V8c0-3-.5-5.5-2-7M7 12h8" />,
  },
  "Волосы и причёски": {
    tone: "accent",
    photo: U("1562322140-8baeececf3df"),
    span: "lg:col-start-1 lg:row-start-3 lg:col-span-2",
    icon: (
      <path d="M6 6a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Zm0 7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Zm2-3.2L20 18M8 14.2 20 6" />
    ),
  },
  "Брови и ресницы": {
    tone: "plum",
    photo: U("1531746020798-e6953c6e8e04"),
    span: "lg:col-start-3 lg:row-start-3",
    icon: (
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Zm10-2.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z" />
    ),
  },
  Депиляция: {
    tone: "accent",
    photo: U("1620916566398-39f1143ab7be"),
    span: "lg:col-start-4 lg:row-start-3",
    icon: <path d="M11 20A7 7 0 0 1 4 13C4 7 9 4 20 4c0 11-3 16-9 16Zm0 0c0-5 2-9 7-12" />,
  },
};

const DEFAULT_META: Meta = CATEGORY_META["Уход за лицом"];
const meta = (c: string): Meta => CATEGORY_META[c] ?? DEFAULT_META;

const TONE = {
  accent: { overlay: "bg-accent/55", chip: "text-accent", price: "text-accent-dark", badge: "bg-accent/12 text-accent" },
  plum: { overlay: "bg-plum/55", chip: "text-plum", price: "text-plum", badge: "bg-plum/12 text-plum" },
} as const;

function plural(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "процедура";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "процедуры";
  return "процедур";
}

export function Services() {
  const { openBot } = useBot();
  const [services, setServices] = useState<Service[]>(staticServices);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    api
      .services()
      .then((data) => {
        if (data.length)
          setServices(
            data.map((s) => ({
              id: s.id,
              name: s.name,
              category: s.category ?? "Прочее",
              description: s.description ?? "",
              price: s.price,
              durationMinutes: s.duration_minutes,
            })),
          );
      })
      .catch(() => {
        /* keep static fallback */
      });
  }, []);

  // Preserve first-seen order of categories.
  const categories = Array.from(new Set(services.map((s) => s.category)));
  const itemsOf = (c: string) => services.filter((s) => s.category === c);

  // Lock body scroll + close on Escape while the modal is open.
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setActive(null);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [active]);

  return (
    <section id="services" className="relative overflow-hidden bg-white py-20 md:py-28">
      {/* Декоративные размытые пятна на фоне */}
      <div className="section-blob -left-32 top-20 h-80 w-80 bg-rose/50" />
      <div className="section-blob -right-24 bottom-10 h-72 w-72 bg-accent/10" />

      <div className="container-content relative">
        <SectionHeading
          eyebrow="Наши услуги"
          title="Процедуры для вашей красоты"
          subtitle="Выберите направление — внутри откроются процедуры с описанием и ценами."
        />

        {/* Бенто-сетка: разные размеры плиток, явно замощённые в прямоугольник
            4×3 на десктопе (lg). На мобильном — крупная плитка сверху + ряды по 2. */}
        <div className="mt-14 grid grid-cols-2 gap-4 auto-rows-[9rem] sm:auto-rows-[11rem] lg:grid-cols-4 lg:auto-rows-[13rem]">
          {categories.map((category, i) => {
            const m = meta(category);
            const count = itemsOf(category).length;
            return (
              <Reveal key={category} delay={(i % 4) * 0.05} className={m.span}>
                <button
                  onClick={() => setActive(category)}
                  className="group relative h-full w-full overflow-hidden rounded-2xl text-left shadow-[0_10px_40px_-24px_rgba(46,42,38,0.5)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.photo}
                    alt={category}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  {/* Тёмный градиент снизу — для читаемости текста */}
                  <div className="absolute inset-0 bg-gradient-to-t from-espresso/80 via-espresso/20 to-transparent" />

                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-4 md:p-5">
                    <div>
                      <h3 className="font-serif text-lg leading-tight text-cream md:text-xl xl:text-2xl">
                        {category}
                      </h3>
                      <span className="text-xs text-cream/80">
                        {count} {plural(count)}
                      </span>
                    </div>
                    <span className="shrink-0 rounded-full bg-cream/90 px-3 py-1 text-xs font-medium text-espresso opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      Смотреть →
                    </span>
                  </div>
                </button>
              </Reveal>
            );
          })}
        </div>
      </div>

      {/* Модальное окно категории */}
      <AnimatePresence>
        {active && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-espresso/60 backdrop-blur-sm"
              onClick={() => setActive(null)}
            />
            <motion.div
              className="relative z-10 max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-cream p-6 shadow-2xl md:rounded-3xl md:p-8"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
            >
              <header className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${TONE[meta(active).tone].badge}`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-6 w-6"
                      aria-hidden
                    >
                      {meta(active).icon}
                    </svg>
                  </span>
                  <div>
                    <h3 className="font-serif text-2xl text-espresso md:text-3xl">{active}</h3>
                    <span className="text-xs text-espresso/50">
                      {itemsOf(active).length} {plural(itemsOf(active).length)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setActive(null)}
                  aria-label="Закрыть"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-sand text-espresso/60 transition-colors hover:bg-espresso/5"
                >
                  ✕
                </button>
              </header>

              <div className="mt-6 space-y-3">
                {itemsOf(active).map((s) => (
                  <article
                    key={s.id}
                    className="flex items-start justify-between gap-4 rounded-2xl border border-sand bg-white/70 p-4 md:p-5"
                  >
                    <div className="min-w-0">
                      <h4 className="font-serif text-lg text-espresso">{s.name}</h4>
                      <p className="mt-1 text-sm leading-relaxed text-espresso/60">{s.description}</p>
                      <div className="mt-1.5 text-xs text-espresso/45">
                        {formatDuration(s.durationMinutes)}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className={`text-lg font-medium ${TONE[meta(active).tone].price}`}>
                        {formatPrice(s.price)}
                      </div>
                      <button
                        onClick={() => {
                          openBot(`Хочу записаться на «${s.name}»`);
                          setActive(null);
                        }}
                        className={`mt-2 text-sm font-medium ${TONE[meta(active).tone].chip} transition-opacity hover:opacity-70`}
                      >
                        Записаться →
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
